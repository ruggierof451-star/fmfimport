"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const productUpdateSchema = z.object({
  id: z.string(),
  supplierCode: z.string().optional(),
  supplierCostCents: z.number().int().min(0).nullable(),
  costVatTreatment: z.enum(["NET_OF_VAT", "GROSS_WITH_VAT"]),
  costIsEstimated: z.boolean(),
  vatRateBps: z.number().int().min(0).max(10000),
  stockQty: z.number().int().min(0).nullable(),
  published: z.boolean(),
  matchStatus: z.enum(["MATCHED", "NEEDS_REVIEW", "UNMATCHED", "MANUAL"]),
});

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

const FIELD_LABELS: Record<string, string> = {
  supplierCode: "Codice fornitore",
  supplierCostCents: "Costo fornitore (centesimi)",
  costVatTreatment: "Trattamento IVA costo",
  costIsEstimated: "Costo stimato",
  vatRateBps: "Aliquota IVA",
  stockQty: "Quantità in stock",
  published: "Pubblicato",
  matchStatus: "Stato abbinamento",
};

export async function updateProductAction(input: ProductUpdateInput): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const parsed = productUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dati non validi." };
  const data = parsed.data;

  const existing = await prisma.product.findUnique({ where: { id: data.id } });
  if (!existing) return { ok: false, error: "Prodotto non trovato." };

  const changeRows: { field: string; oldValue: string | null; newValue: string | null }[] = [];
  for (const key of Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[]) {
    const oldV = (existing as unknown as Record<string, unknown>)[key];
    const newV = (data as unknown as Record<string, unknown>)[key];
    if (String(oldV) !== String(newV)) {
      changeRows.push({ field: FIELD_LABELS[key], oldValue: oldV == null ? null : String(oldV), newValue: newV == null ? null : String(newV) });
    }
  }

  await prisma.$transaction([
    prisma.product.update({
      where: { id: data.id },
      data: {
        supplierCode: data.supplierCode || null,
        supplierCostCents: data.supplierCostCents,
        costVatTreatment: data.costVatTreatment,
        costIsEstimated: data.costIsEstimated,
        vatRateBps: data.vatRateBps,
        stockQty: data.stockQty,
        stockLastCheckedAt: new Date(),
        published: data.published,
        matchStatus: data.matchStatus,
      },
    }),
    ...changeRows.map((c) =>
      prisma.productChangeLog.create({
        data: { productId: data.id, field: c.field, oldValue: c.oldValue, newValue: c.newValue, changedBy: admin.email },
      })
    ),
  ]);

  revalidatePath("/admin/prodotti");
  revalidatePath(`/admin/prodotti/${data.id}`);
  return { ok: true };
}

const pricingSettingsSchema = z.object({
  marginBps: z.number().int().min(0).max(100000),
  marginBulkBps: z.number().int().min(0).max(100000),
  bulkThresholdQty: z.number().int().min(1),
  defaultVatRateBps: z.number().int().min(0).max(10000),
  roundTo90Cents: z.boolean(),
  freeShippingThresholdCents: z.number().int().min(0),
  standardShippingFeeCents: z.number().int().min(0),
});

export async function updatePricingSettingsAction(input: z.infer<typeof pricingSettingsSchema>) {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  const parsed = pricingSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dati non validi." };

  await prisma.pricingSettings.update({
    where: { id: 1 },
    data: { ...parsed.data, updatedBy: admin.email },
  });
  revalidatePath("/admin/impostazioni");
  revalidatePath("/", "layout");
  return { ok: true };
}

const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAYMENT_CONFIRMED",
  "AVAILABILITY_CHECK",
  "TO_PROCURE",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

export async function manualMatchSupplierLinkAction(input: { supplierLinkId: string; productId: string }) {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const link = await prisma.supplierLink.findUnique({ where: { id: input.supplierLinkId } });
  if (!link) return { ok: false, error: "Riga fornitore non trovata." };

  await prisma.$transaction([
    prisma.product.update({
      where: { id: input.productId },
      data: {
        ...(link.costCents != null ? { supplierCostCents: link.costCents, costVatTreatment: link.costVatTreatment, costIsEstimated: false } : {}),
        ...(link.stockQty != null ? { stockQty: link.stockQty } : {}),
        stockLastCheckedAt: new Date(),
        matchStatus: "MANUAL",
        supplierCode: link.supplierCode ?? undefined,
      },
    }),
    prisma.supplierLink.update({
      where: { id: link.id },
      data: { productId: input.productId, matchConfidence: "manual" },
    }),
    prisma.productChangeLog.create({
      data: {
        productId: input.productId,
        field: "Abbinamento fornitore",
        oldValue: null,
        newValue: `Abbinato manualmente a "${link.supplierName}"`,
        changedBy: admin.email,
      },
    }),
  ]);

  revalidatePath("/admin/import");
  revalidatePath("/admin/prodotti");
  return { ok: true };
}

export async function dismissSupplierLinkAction(input: { supplierLinkId: string }) {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  await prisma.supplierLink.delete({ where: { id: input.supplierLinkId } });
  revalidatePath("/admin/import");
  return { ok: true };
}

export async function updateOrderStatusAction(input: {
  orderId: string;
  status: (typeof ORDER_STATUSES)[number];
  note?: string;
  trackingCarrier?: string;
  trackingNumber?: string;
}) {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  if (!ORDER_STATUSES.includes(input.status)) return { ok: false, error: "Stato non valido." };

  await prisma.$transaction([
    prisma.order.update({
      where: { id: input.orderId },
      data: {
        status: input.status,
        trackingCarrier: input.trackingCarrier || undefined,
        trackingNumber: input.trackingNumber || undefined,
        paymentStatus: input.status === "PAYMENT_CONFIRMED" || ["PREPARING", "SHIPPED", "DELIVERED"].includes(input.status) ? "PAID" : undefined,
      },
    }),
    prisma.orderStatusHistory.create({
      data: { orderId: input.orderId, status: input.status, note: input.note, changedBy: admin.email },
    }),
  ]);

  revalidatePath("/admin/ordini");
  revalidatePath(`/admin/ordini/${input.orderId}`);
  return { ok: true };
}
