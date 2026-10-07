"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth";

const productUpdateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  category: z.enum(["pokemon-jp", "pokemon-cn", "pokemon-kr", "one-piece-jp", "one-piece-cn"]).optional(),
  game: z.enum(["POKEMON", "ONE_PIECE"]).optional(),
  language: z.enum(["JP", "CN", "KR"]).optional(),
  setName: z.string().optional(),
  type: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  isNew: z.boolean().optional(),
  isPreorder: z.boolean().optional(),
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
  name: "Nome prodotto",
  category: "Categoria",
  game: "Gioco",
  language: "Lingua",
  setName: "Nome set",
  type: "Tipo",
  imageUrl: "Immagine",
  description: "Descrizione",
  isNew: "In evidenza (novità)",
  isPreorder: "Preordine",
  supplierCode: "Codice fornitore",
  supplierCostCents: "Costo fornitore (centesimi)",
  costVatTreatment: "Trattamento IVA costo",
  costIsEstimated: "Costo stimato",
  vatRateBps: "Aliquota IVA",
  stockQty: "Quantità in stock",
  published: "Pubblicato",
  matchStatus: "Stato abbinamento",
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const productCreateSchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio."),
  category: z.enum(["pokemon-jp", "pokemon-cn", "pokemon-kr", "one-piece-jp", "one-piece-cn"]),
  setName: z.string().min(1, "Il nome del set è obbligatorio."),
  type: z.string().min(1, "Il tipo è obbligatorio."),
  imageUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  supplierCostCents: z.number().int().min(0).nullable(),
  vatRateBps: z.number().int().min(0).max(10000),
  stockQty: z.number().int().min(0).nullable(),
  published: z.boolean(),
  isNew: z.boolean(),
});

const CATEGORY_TO_GAME_LANG: Record<string, { game: "POKEMON" | "ONE_PIECE"; language: "JP" | "CN" | "KR" }> = {
  "pokemon-jp": { game: "POKEMON", language: "JP" },
  "pokemon-cn": { game: "POKEMON", language: "CN" },
  "pokemon-kr": { game: "POKEMON", language: "KR" },
  "one-piece-jp": { game: "ONE_PIECE", language: "JP" },
  "one-piece-cn": { game: "ONE_PIECE", language: "CN" },
};

export async function createProductAction(input: z.infer<typeof productCreateSchema>): Promise<{ ok: boolean; error?: string; id?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const parsed = productCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  const data = parsed.data;
  const { game, language } = CATEGORY_TO_GAME_LANG[data.category];

  let slug = slugify(data.name);
  if (!slug) slug = `prodotto-${Date.now()}`;
  const existingSlug = await prisma.product.findUnique({ where: { slug } });
  if (existingSlug) slug = `${slug}-${Date.now().toString(36)}`;

  const product = await prisma.product.create({
    data: {
      name: data.name,
      slug,
      game,
      language,
      category: data.category,
      setName: data.setName,
      type: data.type,
      condition: "NEW",
      imageUrl: data.imageUrl || null,
      description: data.description || null,
      supplierCostCents: data.supplierCostCents,
      costIsEstimated: data.supplierCostCents == null,
      vatRateBps: data.vatRateBps,
      stockQty: data.stockQty,
      stockLastCheckedAt: data.stockQty != null ? new Date() : null,
      published: data.published,
      isNew: data.isNew,
      matchStatus: "MANUAL",
    },
  });

  await prisma.productChangeLog.create({
    data: { productId: product.id, field: "Prodotto", oldValue: null, newValue: "Creato manualmente dall'admin", changedBy: admin.email },
  });

  revalidatePath("/admin/prodotti");
  revalidatePath("/", "layout");
  return { ok: true, id: product.id };
}

export async function deleteProductAction(input: { id: string }): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const existing = await prisma.product.findUnique({ where: { id: input.id } });
  if (!existing) return { ok: false, error: "Prodotto non trovato." };

  await prisma.$transaction([
    prisma.productChangeLog.deleteMany({ where: { productId: input.id } }),
    prisma.supplierLink.updateMany({ where: { productId: input.id }, data: { productId: null } }),
    prisma.orderItem.updateMany({ where: { productId: input.id }, data: { productId: null } }),
    prisma.product.delete({ where: { id: input.id } }),
  ]);

  revalidatePath("/admin/prodotti");
  revalidatePath("/", "layout");
  return { ok: true };
}

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
    const newV = (data as unknown as Record<string, unknown>)[key];
    if (newV === undefined) continue; // campo non incluso in questo salvataggio
    const oldV = (existing as unknown as Record<string, unknown>)[key];
    if (String(oldV) !== String(newV)) {
      changeRows.push({ field: FIELD_LABELS[key], oldValue: oldV == null ? null : String(oldV), newValue: newV == null ? null : String(newV) });
    }
  }

  await prisma.$transaction([
    prisma.product.update({
      where: { id: data.id },
      data: {
        name: data.name,
        category: data.category,
        game: data.game,
        language: data.language,
        setName: data.setName,
        type: data.type,
        imageUrl: data.imageUrl === undefined ? undefined : data.imageUrl || null,
        description: data.description === undefined ? undefined : data.description || null,
        isNew: data.isNew,
        isPreorder: data.isPreorder,
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
  revalidatePath("/", "layout"); // aggiorna subito catalogo, categorie e pagina prodotto pubblici
  return { ok: true };
}

const pricingSettingsSchema = z.object({
  marginBps: z.number().int().min(0).max(100000),
  marginBulkBps: z.number().int().min(0).max(100000),
  bulkThresholdQty: z.number().int().min(1),
  invoiceVatRateBps: z.number().int().min(0).max(10000),
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
  revalidatePath("/", "layout");
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

const createAdminSchema = z.object({
  name: z.string().min(1, "Inserisci il nome."),
  email: z.string().email("Inserisci un'email valida."),
  password: z.string().min(8, "La password deve avere almeno 8 caratteri."),
});

/** Crea un nuovo utente con ruolo ADMIN: accesso completo alla dashboard. Solo un admin può farlo. */
export async function createAdminUserAction(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const parsed = createAdminSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  const email = parsed.data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "Esiste già un account con questa email." };

  await prisma.user.create({
    data: {
      email,
      name: parsed.data.name.trim(),
      passwordHash: await hashPassword(parsed.data.password),
      role: "ADMIN",
    },
  });

  revalidatePath("/admin/utenti");
  return { ok: true };
}

export async function revokeAdminAction(input: { userId: string }): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  if (admin.id === input.userId) return { ok: false, error: "Non puoi rimuovere i tuoi stessi permessi admin." };

  await prisma.user.update({ where: { id: input.userId }, data: { role: "CUSTOMER" } });
  revalidatePath("/admin/utenti");
  return { ok: true };
}

export async function markContactMessageReadAction(input: { id: string; read: boolean }): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  await prisma.contactMessage.update({ where: { id: input.id }, data: { read: input.read } });
  revalidatePath("/admin/messaggi");
  return { ok: true };
}
