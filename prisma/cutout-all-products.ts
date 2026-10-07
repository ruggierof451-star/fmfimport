import { prisma } from "../src/lib/prisma";
import { ensureCutoutImage } from "../src/lib/image-cutout";

async function main() {
  const products = await prisma.product.findMany({
    where: { imageUrl: { not: null }, deletedAt: null },
    select: { id: true, slug: true, imageUrl: true, name: true },
  });

  let ok = 0;
  let skipped = 0;
  for (const p of products) {
    const result = await ensureCutoutImage(p.imageUrl as string, p.slug);
    if (result) {
      ok++;
    } else {
      skipped++;
      console.log("Saltato (sorgente mancante?):", p.name);
    }
  }

  console.log(`Fatto. Ritagliati: ${ok} · Saltati: ${skipped} · Totale: ${products.length}`);
  await prisma.$disconnect();
}

main();
