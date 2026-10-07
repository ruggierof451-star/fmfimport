import { prisma } from "../src/lib/prisma";
import fs from "fs";
import path from "path";

const DIR = path.join(__dirname, "toreca-harvest", "desc-batches-it");

async function main() {
  const files = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  let updated = 0;
  let missing = 0;

  for (const file of files) {
    const rows: { id: string; description: string }[] = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf-8"));
    for (const row of rows) {
      const result = await prisma.product.updateMany({
        where: { id: row.id },
        data: { description: row.description },
      });
      if (result.count === 0) {
        missing++;
        console.log(`Non trovato (probabilmente eliminato): ${row.id}`);
      } else {
        updated++;
      }
    }
  }

  console.log(`Descrizioni aggiornate: ${updated} · Non trovate: ${missing}`);
  await prisma.$disconnect();
}

main();
