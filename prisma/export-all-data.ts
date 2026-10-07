import { prisma } from "../src/lib/prisma";
import fs from "fs";
import path from "path";

const OUT_DIR = path.join(__dirname, "..", "data-export");

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const tables: Record<string, () => Promise<unknown>> = {
    product: () => prisma.product.findMany(),
    supplierLink: () => prisma.supplierLink.findMany(),
    productChangeLog: () => prisma.productChangeLog.findMany(),
    syncLog: () => prisma.syncLog.findMany(),
    syncError: () => prisma.syncError.findMany(),
    contactMessage: () => prisma.contactMessage.findMany(),
    pricingSettings: () => prisma.pricingSettings.findMany(),
    user: () => prisma.user.findMany(),
    passwordResetToken: () => prisma.passwordResetToken.findMany(),
    address: () => prisma.address.findMany(),
    order: () => prisma.order.findMany(),
    orderItem: () => prisma.orderItem.findMany(),
    orderStatusHistory: () => prisma.orderStatusHistory.findMany(),
  };

  for (const [name, fn] of Object.entries(tables)) {
    const rows = await fn();
    fs.writeFileSync(path.join(OUT_DIR, `${name}.json`), JSON.stringify(rows, null, 1));
    console.log(`${name}: ${(rows as unknown[]).length} righe`);
  }

  await prisma.$disconnect();
}

main();
