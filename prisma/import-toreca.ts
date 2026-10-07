/**
 * Importa nel catalogo i dati reali raccolti dall'account Toreca autenticato dell'utente
 * (vedi prisma/toreca-harvest/*.json — righe {id, name, sku, price, img, desc} lette dalla
 * Store API di Toreca mentre l'utente era loggato nel proprio browser).
 *
 * Abbina per codice esatto o nome normalizzato esatto (stessa regola dell'importazione
 * CSV/XLSX in produzione, vedi src/lib/supplier-match.ts). I casi ambigui o senza
 * corrispondenza NON vengono applicati: finiscono in SupplierLink per revisione manuale.
 *
 * I prezzi di Toreca sono già in centesimi (price: "4022" = 40,22 €). Il checkout di Toreca
 * non mostra una riga IVA separata (B2B intra-UE, reverse charge): trattiamo il costo come
 * NETTO IVA, coerente col default del motore prezzi.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma";
import { matchSupplierRow, type MatchCandidate } from "../src/lib/supplier-match";

const prisma = new PrismaClient();
const HARVEST_DIR = path.join(__dirname, "toreca-harvest");
const IMAGES_DIR = path.join(__dirname, "..", "public", "products");

/** La Store API di Toreca a volte restituisce il nome con entità HTML non decodificate
 * (es. "Lillie&#8217;s" invece di "Lillie's"), che altrimenti rompono il confronto nomi. */
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&quot;/g, '"');
}

interface HarvestRow {
  id: number;
  name: string;
  sku: string;
  price: string;
  img: string | null;
  desc: string;
}

async function downloadImage(url: string, destBasename: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ext = path.extname(new URL(url).pathname) || ".webp";
    const filename = `${destBasename}${ext}`;
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(path.join(IMAGES_DIR, filename), buf);
    return `/products/${filename}`;
  } catch {
    return null;
  }
}

async function main() {
  await fs.mkdir(IMAGES_DIR, { recursive: true });

  const files = await fs.readdir(HARVEST_DIR);
  const rows: HarvestRow[] = [];
  for (const file of files.filter((f) => f.endsWith(".json"))) {
    const content = await fs.readFile(path.join(HARVEST_DIR, file), "utf-8");
    rows.push(...(JSON.parse(content) as HarvestRow[]));
  }
  console.log(`Righe raccolte da Toreca: ${rows.length}`);

  const products = await prisma.product.findMany({ select: { id: true, supplierCode: true, name: true, slug: true, condition: true } });
  const candidates: MatchCandidate[] = products;

  // Rimuove le righe "da rivedere" lasciate da un run precedente di questo script, per non duplicarle.
  await prisma.supplierLink.deleteMany({ where: { productId: null } });

  const syncLog = await prisma.syncLog.create({
    data: { trigger: "MANUAL", source: "toreca-account-live-browse", status: "SUCCESS", triggeredBy: "ruggierof451@gmail.com" },
  });

  let updated = 0;
  let imagesDownloaded = 0;
  let needsReview = 0;
  const errorRows: { identifier: string; message: string }[] = [];

  for (const row of rows) {
    const decodedName = decodeHtmlEntities(row.name);
    const outcome = matchSupplierRow({ supplierCode: row.sku, name: decodedName }, candidates);

    if (outcome.kind === "exact_code" || outcome.kind === "exact_name") {
      const product = products.find((p) => p.id === outcome.productId)!;
      let imageUrl: string | null = null;
      if (row.img) {
        imageUrl = await downloadImage(row.img, product.slug);
        if (imageUrl) imagesDownloaded++;
      }

      await prisma.product.update({
        where: { id: product.id },
        data: {
          supplierCode: row.sku,
          supplierCostCents: parseInt(row.price, 10),
          costVatTreatment: "NET_OF_VAT",
          costIsEstimated: false,
          description: row.desc,
          ...(imageUrl ? { imageUrl } : {}),
          stockLastCheckedAt: new Date(),
          matchStatus: "MATCHED",
        },
      });
      updated++;
    } else {
      await prisma.supplierLink.create({
        data: {
          supplierCode: row.sku,
          supplierName: decodedName,
          costCents: parseInt(row.price, 10),
          costVatTreatment: "NET_OF_VAT",
          matchConfidence: null,
        },
      });
      needsReview++;
      errorRows.push({
        identifier: `${row.sku} — ${decodedName}`,
        message: outcome.kind === "ambiguous" ? "Più prodotti corrispondono: revisione manuale necessaria." : "Nessun prodotto corrispondente trovato nel catalogo.",
      });
    }
  }

  await prisma.syncLog.update({
    where: { id: syncLog.id },
    data: {
      finishedAt: new Date(),
      status: needsReview === 0 ? "SUCCESS" : updated > 0 ? "PARTIAL" : "ERROR",
      updatedCount: updated,
      errorCount: needsReview,
      notes: `${imagesDownloaded} immagini scaricate.`,
      errors: { create: errorRows.map((e) => ({ identifier: e.identifier, message: e.message })) },
    },
  });

  console.log(`Aggiornati: ${updated} · Immagini scaricate: ${imagesDownloaded} · Da rivedere: ${needsReview}`);
  if (errorRows.length) {
    console.log("Non abbinati:");
    errorRows.forEach((e) => console.log(`  - ${e.identifier}: ${e.message}`));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
