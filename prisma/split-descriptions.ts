import fs from "node:fs/promises";
const prisma_dir = __dirname;
async function main() {
  const raw = await fs.readFile(prisma_dir + "/toreca-harvest/descriptions-en.json", "utf-8");
  const items = JSON.parse(raw) as { id: string; name: string; description: string }[];
  const batchSize = 20;
  const batchDir = prisma_dir + "/toreca-harvest/desc-batches";
  await fs.mkdir(batchDir, { recursive: true });
  let count = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const n = String(count).padStart(2, "0");
    await fs.writeFile(`${batchDir}/batch-${n}.json`, JSON.stringify(batch, null, 1));
    count++;
  }
  console.log(`${items.length} prodotti divisi in ${count} lotti da ${batchSize} in ${batchDir}`);
}
main();
