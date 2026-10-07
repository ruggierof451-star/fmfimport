/**
 * Sincronizza disponibilità e quantità dal catalogo Toreca autenticato (vedi
 * prisma/toreca-harvest/stock/*.json, raccolti dal browser mentre l'utente era loggato).
 *
 * Abbina per CODICE FORNITORE ESATTO (supplierCode), già salvato su ogni prodotto durante
 * l'importazione prezzi/foto/descrizioni (prisma/import-toreca.ts) — non per nome, quindi
 * nessuna ambiguità possibile qui.
 *
 * Regole:
 *  - Prodotto trovato su Toreca ma esaurito (is_in_stock=false)      -> stockQty=0, spubblicato.
 *  - Prodotto trovato su Toreca disponibile con quantità nota        -> stockQty aggiornato, pubblicato.
 *  - Prodotto NON trovato più nel catalogo Toreca (SKU scomparso)    -> spubblicato (non più ordinabile dal fornitore).
 *  - Prodotto pubblicato di nuovo disponibile dopo essere stato esaurito -> ripubblicato.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();
const STOCK_DIR = path.join(__dirname, "toreca-harvest", "stock");

interface StockRow {
  sku: string;
  name: string;
  inStock: boolean;
  qty: number | null;
  txt: string; // es. "9 in stock", "Out of stock"
}

function parseQtyFromText(txt: string): number | null {
  const m = txt.match(/^(\d+)\s+in stock/i);
  return m ? parseInt(m[1], 10) : null;
}

async function main() {
  const files = await fs.readdir(STOCK_DIR);
  const rows: StockRow[] = [];
  for (const file of files.filter((f) => f.endsWith(".json"))) {
    const content = await fs.readFile(path.join(STOCK_DIR, file), "utf-8");
    rows.push(...(JSON.parse(content) as StockRow[]));
  }
  console.log(`Righe stock raccolte da Toreca: ${rows.length}`);

  const bySku = new Map(rows.map((r) => [r.sku, r]));

  const products = await prisma.product.findMany({ where: { supplierCode: { not: null } } });
  console.log(`Prodotti con codice fornitore noto: ${products.length}`);

  let madeUnavailable = 0;
  let restored = 0;
  let qtyUpdated = 0;
  let noLongerListed = 0;

  for (const product of products) {
    const row = product.supplierCode ? bySku.get(product.supplierCode) : undefined;

    if (!row) {
      // SKU non più presente nel catalogo Toreca: non ordinabile dal fornitore, spubblica.
      if (product.published) {
        await prisma.product.update({
          where: { id: product.id },
          data: { published: false, stockQty: 0, stockLastCheckedAt: new Date() },
        });
        noLongerListed++;
      }
      continue;
    }

    if (!row.inStock) {
      if (product.published || product.stockQty !== 0) {
        await prisma.product.update({
          where: { id: product.id },
          data: { published: false, stockQty: 0, stockLastCheckedAt: new Date() },
        });
        madeUnavailable++;
      }
      continue;
    }

    // Disponibile su Toreca.
    const qty = row.qty ?? parseQtyFromText(row.txt);
    const wasUnpublished = !product.published;
    await prisma.product.update({
      where: { id: product.id },
      data: {
        published: true,
        ...(qty != null ? { stockQty: qty } : {}),
        stockLastCheckedAt: new Date(),
      },
    });
    if (wasUnpublished) restored++;
    if (qty != null && qty !== product.stockQty) qtyUpdated++;
  }

  console.log(
    `Spubblicati (esauriti): ${madeUnavailable} · Spubblicati (non più su Toreca): ${noLongerListed} · ` +
      `Ripubblicati: ${restored} · Quantità aggiornate: ${qtyUpdated}`
  );

  const syncLog = await prisma.syncLog.create({
    data: {
      trigger: "MANUAL",
      source: "toreca-account-live-browse-stock",
      status: "SUCCESS",
      triggeredBy: "ruggierof451@gmail.com",
      startedAt: new Date(),
      finishedAt: new Date(),
      updatedCount: madeUnavailable + restored + qtyUpdated,
      errorCount: noLongerListed,
      notes: `${madeUnavailable} esauriti, ${noLongerListed} non più su Toreca (spubblicati), ${restored} ripubblicati, ${qtyUpdated} quantità aggiornate.`,
    },
  });
  console.log("SyncLog creato:", syncLog.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
