import { prisma } from "../src/lib/prisma";
import fs from "fs";
import path from "path";

const DIR = path.join(__dirname, "..", "data-export");

function load<T>(name: string): T[] {
  const file = path.join(DIR, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

async function main() {
  // Ordine che rispetta le dipendenze (foreign key): prima le tabelle senza
  // riferimenti, poi quelle che dipendono da esse.
  const product = load<Record<string, unknown>>("product");
  if (product.length) await prisma.product.createMany({ data: product as never });
  console.log("product:", product.length);

  const supplierLink = load<Record<string, unknown>>("supplierLink");
  if (supplierLink.length) await prisma.supplierLink.createMany({ data: supplierLink as never });
  console.log("supplierLink:", supplierLink.length);

  const productChangeLog = load<Record<string, unknown>>("productChangeLog");
  if (productChangeLog.length) await prisma.productChangeLog.createMany({ data: productChangeLog as never });
  console.log("productChangeLog:", productChangeLog.length);

  const syncLog = load<Record<string, unknown>>("syncLog");
  if (syncLog.length) await prisma.syncLog.createMany({ data: syncLog as never });
  console.log("syncLog:", syncLog.length);

  const syncError = load<Record<string, unknown>>("syncError");
  if (syncError.length) await prisma.syncError.createMany({ data: syncError as never });
  console.log("syncError:", syncError.length);

  const contactMessage = load<Record<string, unknown>>("contactMessage");
  if (contactMessage.length) await prisma.contactMessage.createMany({ data: contactMessage as never });
  console.log("contactMessage:", contactMessage.length);

  const pricingSettings = load<Record<string, unknown>>("pricingSettings");
  if (pricingSettings.length) await prisma.pricingSettings.createMany({ data: pricingSettings as never });
  console.log("pricingSettings:", pricingSettings.length);

  const user = load<Record<string, unknown>>("user");
  if (user.length) await prisma.user.createMany({ data: user as never });
  console.log("user:", user.length);

  const passwordResetToken = load<Record<string, unknown>>("passwordResetToken");
  if (passwordResetToken.length) await prisma.passwordResetToken.createMany({ data: passwordResetToken as never });
  console.log("passwordResetToken:", passwordResetToken.length);

  const address = load<Record<string, unknown>>("address");
  if (address.length) await prisma.address.createMany({ data: address as never });
  console.log("address:", address.length);

  const order = load<Record<string, unknown>>("order");
  if (order.length) await prisma.order.createMany({ data: order as never });
  console.log("order:", order.length);

  const orderItem = load<Record<string, unknown>>("orderItem");
  if (orderItem.length) await prisma.orderItem.createMany({ data: orderItem as never });
  console.log("orderItem:", orderItem.length);

  const orderStatusHistory = load<Record<string, unknown>>("orderStatusHistory");
  if (orderStatusHistory.length) await prisma.orderStatusHistory.createMany({ data: orderStatusHistory as never });
  console.log("orderStatusHistory:", orderStatusHistory.length);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
