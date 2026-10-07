import fs from "node:fs/promises";
import { PrismaClient } from "../src/generated/prisma";
const prisma = new PrismaClient();
async function main() {
  const products = await prisma.product.findMany({
    where: { description: { not: null } },
    select: { id: true, name: true, description: true },
    orderBy: { id: "asc" },
  });
  console.log(`Prodotti con descrizione: ${products.length}`);
  await fs.writeFile(
    __dirname + "/toreca-harvest/descriptions-en.json",
    JSON.stringify(products, null, 0)
  );
  console.log("Salvato in prisma/toreca-harvest/descriptions-en.json");
}
main().finally(() => prisma.$disconnect());
