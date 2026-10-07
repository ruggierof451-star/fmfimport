import { NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { matchSupplierRow, type MatchCandidate } from "@/lib/supplier-match";

interface ParsedRow {
  supplierCode?: string;
  name: string;
  costNetEuro?: number;
  costGrossEuro?: number;
  stock?: number;
}

function num(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

/** Accetta diversi nomi di colonna comuni (italiano/inglese) per restare tollerante al file del fornitore. */
function rowsFromRecords(records: Record<string, unknown>[]): ParsedRow[] {
  return records
    .map((r) => {
      const get = (...keys: string[]) => {
        for (const k of keys) {
          const found = Object.keys(r).find((rk) => rk.trim().toLowerCase() === k);
          if (found && r[found] != null && r[found] !== "") return r[found];
        }
        return undefined;
      };
      const name = str(get("name", "nome", "product", "prodotto", "titolo"));
      if (!name) return null;
      return {
        supplierCode: str(get("code", "codice", "sku", "supplier_code", "codice prodotto")),
        name,
        costNetEuro: num(get("cost_net", "costo_netto", "net_cost", "costo netto")),
        costGrossEuro: num(get("cost_gross", "costo_lordo", "gross_cost", "costo lordo", "cost", "costo", "prezzo")),
        stock: num(get("stock", "scorta", "disponibilita", "qty", "quantita", "quantità")),
      } as ParsedRow;
    })
    .filter((r): r is ParsedRow => r !== null);
}

function parseFile(filename: string, buffer: ArrayBuffer): ParsedRow[] {
  const isCsv = filename.toLowerCase().endsWith(".csv");
  if (isCsv) {
    const text = new TextDecoder("utf-8").decode(buffer);
    const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
    return rowsFromRecords(result.data);
  }
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return rowsFromRecords(records);
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Nessun file ricevuto." }, { status: 400 });
  }
  if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
    return NextResponse.json({ error: "Formato non supportato. Carica un file .csv o .xlsx." }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File troppo grande (limite 10MB)." }, { status: 400 });
  }

  let rows: ParsedRow[];
  try {
    const buffer = await file.arrayBuffer();
    rows = parseFile(file.name, buffer);
  } catch {
    return NextResponse.json({ error: "Impossibile leggere il file. Verifica che sia un CSV o XLSX valido." }, { status: 400 });
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: "Il file non contiene righe valide (manca almeno la colonna 'name')." }, { status: 400 });
  }

  const allProducts = await prisma.product.findMany({ select: { id: true, supplierCode: true, name: true } });
  const candidates: MatchCandidate[] = allProducts;

  const syncLog = await prisma.syncLog.create({
    data: { trigger: "IMPORT_FILE", source: `upload:${file.name}`, status: "SUCCESS", triggeredBy: admin.email },
  });

  let created = 0; // qui "created" = SupplierLink creati per righe non abbinate (nessun Product viene creato da un import)
  let updated = 0;
  let errors = 0;
  const errorRows: { identifier: string; message: string }[] = [];

  for (const row of rows) {
    const outcome = matchSupplierRow(row, candidates);
    const costEuro = row.costNetEuro ?? row.costGrossEuro;
    const costVatTreatment = row.costNetEuro != null ? "NET_OF_VAT" : "GROSS_WITH_VAT";

    if (outcome.kind === "exact_code" || outcome.kind === "exact_name") {
      const data: { supplierCostCents?: number; costVatTreatment?: "NET_OF_VAT" | "GROSS_WITH_VAT"; costIsEstimated?: boolean; stockQty?: number; stockLastCheckedAt: Date; matchStatus: "MATCHED" } = {
        stockLastCheckedAt: new Date(),
        matchStatus: "MATCHED",
      };
      if (costEuro != null) {
        data.supplierCostCents = Math.round(costEuro * 100);
        data.costVatTreatment = costVatTreatment;
        data.costIsEstimated = false;
      }
      if (row.stock != null) data.stockQty = Math.round(row.stock);

      await prisma.product.update({ where: { id: outcome.productId }, data });
      await prisma.supplierLink.upsert({
        where: { productId: outcome.productId },
        create: {
          productId: outcome.productId,
          supplierCode: row.supplierCode,
          supplierName: row.name,
          costCents: costEuro != null ? Math.round(costEuro * 100) : undefined,
          costVatTreatment,
          stockQty: row.stock != null ? Math.round(row.stock) : undefined,
          matchConfidence: outcome.kind === "exact_code" ? "exact-code" : "normalized-name",
        },
        update: {
          supplierCode: row.supplierCode,
          supplierName: row.name,
          costCents: costEuro != null ? Math.round(costEuro * 100) : undefined,
          costVatTreatment,
          stockQty: row.stock != null ? Math.round(row.stock) : undefined,
          lastSeenAt: new Date(),
          matchConfidence: outcome.kind === "exact_code" ? "exact-code" : "normalized-name",
        },
      });
      updated++;
    } else {
      // Ambiguo o nessuna corrispondenza: non tocchiamo nessun prodotto. Registriamo la riga
      // come "da rivedere manualmente" e logghiamo l'errore per il report di sincronizzazione.
      await prisma.supplierLink.create({
        data: {
          supplierCode: row.supplierCode,
          supplierName: row.name,
          costCents: costEuro != null ? Math.round(costEuro * 100) : undefined,
          costVatTreatment,
          stockQty: row.stock != null ? Math.round(row.stock) : undefined,
          matchConfidence: null,
        },
      });
      created++;
      errors++;
      errorRows.push({
        identifier: row.supplierCode ? `${row.supplierCode} — ${row.name}` : row.name,
        message: outcome.kind === "ambiguous" ? "Più prodotti corrispondono: revisione manuale necessaria." : "Nessun prodotto corrispondente trovato nel catalogo.",
      });
    }
  }

  await prisma.syncLog.update({
    where: { id: syncLog.id },
    data: {
      finishedAt: new Date(),
      status: errors === 0 ? "SUCCESS" : updated > 0 ? "PARTIAL" : "ERROR",
      createdCount: created,
      updatedCount: updated,
      errorCount: errors,
      errors: { create: errorRows.map((e) => ({ identifier: e.identifier, message: e.message })) },
    },
  });

  return NextResponse.json({ syncLogId: syncLog.id, totalRows: rows.length, updated, needsReview: created, errors });
}
