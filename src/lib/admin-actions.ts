"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { releaseOrderStock, reserveOrderStock, isStockReleasingStatus } from "@/lib/order-stock";
import { sendOrderStatusEmail } from "@/lib/email";
import { recordDiscountCodeUsage } from "@/lib/discounts";

// Varianti acquistabili (es. "Busta singola"): nome + prezzo pubblico IVA inclusa.
// id presente = variante già esistente da aggiornare; assente = nuova.
const variantInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Ogni variante deve avere un nome.").max(80, "Nome variante troppo lungo (max 80 caratteri)."),
  priceCents: z.number().int().min(0, "Il prezzo della variante non può essere negativo."),
});
const variantsSchema = z.array(variantInputSchema).max(20, "Massimo 20 varianti per prodotto.");

// Scaglioni rivenditore: da minQty pezzi in su, prezzo unitario priceCents (uguale per tutti i rivenditori).
const resellerTiersSchema = z
  .array(
    z.object({
      minQty: z.number().int().min(1, "La quantità minima di uno scaglione deve essere almeno 1."),
      priceCents: z.number().int().min(0, "Il prezzo di uno scaglione non può essere negativo."),
    })
  )
  .max(10, "Massimo 10 scaglioni per prodotto.")
  .refine((tiers) => new Set(tiers.map((t) => t.minQty)).size === tiers.length, "Due scaglioni hanno la stessa quantità minima.");

function tiersSummary(tiers: { minQty: number; priceCents: number }[]): string | null {
  if (!tiers.length) return null;
  return [...tiers]
    .sort((a, b) => a.minQty - b.minQty)
    .map((t) => `da ${t.minQty} pz ${(t.priceCents / 100).toFixed(2).replace(".", ",")} €`)
    .join(", ");
}

function variantsSummary(variants: { name: string; priceCents: number }[]): string | null {
  if (!variants.length) return null;
  return variants.map((v) => `${v.name} (${(v.priceCents / 100).toFixed(2).replace(".", ",")} €)`).join(", ");
}

// Categorie di prodotto (bucket di catalogo). Le carte singole hanno gioco e lingua liberi.
const PRODUCT_CATEGORIES = [
  "pokemon-it",
  "pokemon-jp",
  "pokemon-cn",
  "pokemon-kr",
  "one-piece-jp",
  "one-piece-cn",
  "yugioh",
  "dragon-ball",
  "carte-singole-gradate",
  "carte-singole-raw",
] as const;

/** Massimo di prodotti nella vetrina a ruota della home. */
const HERO_MAX = 3;

async function heroSlotsFull(exceptId?: string): Promise<boolean> {
  const count = await prisma.product.count({
    where: { heroFeatured: true, deletedAt: null, ...(exceptId ? { id: { not: exceptId } } : {}) },
  });
  return count >= HERO_MAX;
}
const HERO_FULL_ERROR = `Nella vetrina della home ci sono già ${HERO_MAX} prodotti: togline uno prima di aggiungerne un altro.`;

const productUpdateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  category: z
    .enum(PRODUCT_CATEGORIES)
    .optional(),
  game: z.enum(["POKEMON", "ONE_PIECE", "YUGIOH", "DRAGON_BALL"]).optional(),
  language: z.enum(["IT", "JP", "CN", "KR", "EN"]).optional(),
  setName: z.string().optional(),
  type: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  isNew: z.boolean().optional(),
  isPreorder: z.boolean().optional(),
  preorderReleaseInfo: z.string().nullable().optional(),
  heroFeatured: z.boolean().optional(),
  onOrder: z.boolean().optional(),
  priceCents: z.number().int().min(0).nullable(),
  resellerPriceCents: z.number().int().min(0).nullable(),
  supplierCostCents: z.number().int().min(0).nullable(),
  stockQty: z.number().int().min(0).nullable(),
  published: z.boolean(),
  noWrapPriceCents: z.number().int().min(0).nullable().optional(),
  damagedPriceCents: z.number().int().min(0).nullable().optional(),
  variants: variantsSchema.optional(),
  resellerTiers: resellerTiersSchema.optional(),
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
  heroFeatured: "Vetrina in home",
  onOrder: "Su ordinazione",
  priceCents: "Prezzo di vendita (centesimi)",
  resellerPriceCents: "Prezzo rivenditore (centesimi)",
  supplierCostCents: "Costo di acquisto (centesimi)",
  stockQty: "Quantità in stock",
  published: "Pubblicato",
  noWrapPriceCents: "Prezzo senza pellicola (centesimi)",
  damagedPriceCents: "Prezzo danneggiato (centesimi)",
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
  category: z.enum(PRODUCT_CATEGORIES),
  language: z.enum(["IT", "JP", "CN", "KR", "EN"]).optional(), // override: solo per categorie senza lingua fissa (Yu-Gi-Oh!, Dragon Ball, carte singole)
  game: z.enum(["POKEMON", "ONE_PIECE", "YUGIOH", "DRAGON_BALL"]).optional(), // override: solo per le carte singole
  heroFeatured: z.boolean().optional(),
  onOrder: z.boolean().optional(),
  setName: z.string().min(1, "Il nome del set è obbligatorio."),
  type: z.string().min(1, "Il tipo è obbligatorio."),
  imageUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  priceCents: z.number().int().min(0).nullable(),
  resellerPriceCents: z.number().int().min(0).nullable(),
  supplierCostCents: z.number().int().min(0).nullable(),
  stockQty: z.number().int().min(0).nullable(),
  published: z.boolean(),
  isNew: z.boolean(),
  isPreorder: z.boolean().optional(),
  preorderReleaseInfo: z.string().nullable().optional(),
  noWrapPriceCents: z.number().int().min(0).nullable().optional(),
  damagedPriceCents: z.number().int().min(0).nullable().optional(),
  variants: variantsSchema.optional(),
  resellerTiers: resellerTiersSchema.optional(),
});

const CATEGORY_TO_GAME_LANG: Record<string, { game: "POKEMON" | "ONE_PIECE" | "YUGIOH" | "DRAGON_BALL"; language: "IT" | "JP" | "CN" | "KR" | "EN" }> = {
  "pokemon-it": { game: "POKEMON", language: "IT" },
  "pokemon-jp": { game: "POKEMON", language: "JP" },
  "pokemon-cn": { game: "POKEMON", language: "CN" },
  "pokemon-kr": { game: "POKEMON", language: "KR" },
  "one-piece-jp": { game: "ONE_PIECE", language: "JP" },
  "one-piece-cn": { game: "ONE_PIECE", language: "CN" },
  yugioh: { game: "YUGIOH", language: "JP" },
  "dragon-ball": { game: "DRAGON_BALL", language: "JP" },
  "carte-singole-gradate": { game: "POKEMON", language: "IT" },
  "carte-singole-raw": { game: "POKEMON", language: "IT" },
};

export async function createProductAction(input: z.infer<typeof productCreateSchema>): Promise<{ ok: boolean; error?: string; id?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const parsed = productCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  const data = parsed.data;
  const { game: defaultGame, language: defaultLanguage } = CATEGORY_TO_GAME_LANG[data.category];
  const game = data.category.startsWith("carte-singole") ? data.game ?? defaultGame : defaultGame;
  const language = data.language ?? defaultLanguage;
  if (data.heroFeatured && (await heroSlotsFull())) return { ok: false, error: HERO_FULL_ERROR };

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
      priceCents: data.priceCents,
      resellerPriceCents: data.resellerPriceCents,
      noWrapPriceCents: data.noWrapPriceCents,
      damagedPriceCents: data.damagedPriceCents,
      supplierCostCents: data.supplierCostCents,
      costIsEstimated: data.supplierCostCents == null,
      stockQty: data.stockQty,
      stockLastCheckedAt: data.stockQty != null ? new Date() : null,
      published: data.published,
      isNew: data.isNew,
      isPreorder: data.isPreorder ?? false,
      preorderReleaseInfo: data.preorderReleaseInfo ?? null,
      heroFeatured: data.heroFeatured ?? false,
      onOrder: data.onOrder ?? false,
      matchStatus: "MANUAL",
      variants: data.variants?.length
        ? { create: data.variants.map((v, i) => ({ name: v.name, priceCents: v.priceCents, position: i })) }
        : undefined,
      resellerTiers: data.resellerTiers?.length
        ? { create: data.resellerTiers.map((t) => ({ minQty: t.minQty, priceCents: t.priceCents })) }
        : undefined,
    },
  });

  await prisma.productChangeLog.create({
    data: { productId: product.id, field: "Prodotto", oldValue: null, newValue: "Creato manualmente dall'admin", changedBy: admin.email },
  });

  revalidatePath("/admin/prodotti");
  revalidatePath("/", "layout");
  return { ok: true, id: product.id };
}

/**
 * Eliminazione "soft": il prodotto resta nel database (serve per non rompere lo
 * storico ordini che lo referenziano) ma sparisce dal catalogo pubblico e dalla
 * lista prodotti attivi. Recuperabile dalla sezione "Eliminati".
 */
export async function deleteProductAction(input: { id: string }): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const existing = await prisma.product.findUnique({ where: { id: input.id } });
  if (!existing) return { ok: false, error: "Prodotto non trovato." };

  await prisma.$transaction([
    prisma.product.update({ where: { id: input.id }, data: { deletedAt: new Date(), published: false } }),
    prisma.productChangeLog.create({
      data: { productId: input.id, field: "Prodotto", oldValue: null, newValue: "Eliminato (soft)", changedBy: admin.email },
    }),
  ]);

  revalidatePath("/admin/prodotti");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Eliminazione "soft" di TUTTI i prodotti non ancora eliminati (anche archiviati ed
 * esauriti), per svuotare il catalogo prima di caricare i prodotti reali. Stessa
 * logica dell'eliminazione singola: i prodotti restano nel database (lo storico
 * ordini continua a funzionare) e si possono ripristinare dalla sezione "Eliminati".
 * Richiede di digitare la frase di conferma, controllata anche lato server.
 */
// Nota: in un file "use server" si possono esportare solo funzioni async, quindi la
// frase è ripetuta anche nel componente AdminDeleteAllProducts.
const DELETE_ALL_PRODUCTS_CONFIRM = "ELIMINA TUTTO";

export async function deleteAllProductsAction(input: { confirm: string }): Promise<{ ok: boolean; error?: string; count?: number }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };
  if (input.confirm.trim() !== DELETE_ALL_PRODUCTS_CONFIRM) {
    return { ok: false, error: `Per confermare scrivi esattamente "${DELETE_ALL_PRODUCTS_CONFIRM}".` };
  }

  const targets = await prisma.product.findMany({ where: { deletedAt: null }, select: { id: true } });
  if (targets.length === 0) return { ok: true, count: 0 };
  const ids = targets.map((t) => t.id);
  const now = new Date();

  await prisma.$transaction([
    prisma.product.updateMany({ where: { id: { in: ids } }, data: { deletedAt: now, published: false } }),
    prisma.productChangeLog.createMany({
      data: ids.map((productId) => ({
        productId,
        field: "Prodotto",
        oldValue: null,
        newValue: "Eliminato (soft) · svuotamento catalogo",
        changedBy: admin.email,
      })),
    }),
  ]);

  revalidatePath("/admin/prodotti");
  revalidatePath("/", "layout");
  return { ok: true, count: ids.length };
}

export async function restoreProductAction(input: { id: string }): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  await prisma.$transaction([
    prisma.product.update({ where: { id: input.id }, data: { deletedAt: null } }),
    prisma.productChangeLog.create({
      data: { productId: input.id, field: "Prodotto", oldValue: "Eliminato (soft)", newValue: "Ripristinato", changedBy: admin.email },
    }),
  ]);

  revalidatePath("/admin/prodotti");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function archiveProductAction(input: { id: string }): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  await prisma.$transaction([
    prisma.product.update({ where: { id: input.id }, data: { archived: true, published: false } }),
    prisma.productChangeLog.create({
      data: { productId: input.id, field: "Prodotto", oldValue: null, newValue: "Archiviato", changedBy: admin.email },
    }),
  ]);

  revalidatePath("/admin/prodotti");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function unarchiveProductAction(input: { id: string }): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  await prisma.$transaction([
    prisma.product.update({ where: { id: input.id }, data: { archived: false, published: true } }),
    prisma.productChangeLog.create({
      data: { productId: input.id, field: "Prodotto", oldValue: "Archiviato", newValue: "Riattivato", changedBy: admin.email },
    }),
  ]);

  revalidatePath("/admin/prodotti");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateProductAction(input: ProductUpdateInput): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const parsed = productUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  const data = parsed.data;

  const existing = await prisma.product.findUnique({
    where: { id: data.id },
    include: { variants: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] }, resellerTiers: true },
  });
  if (!existing) return { ok: false, error: "Prodotto non trovato." };
  if (data.heroFeatured && !existing.heroFeatured && (await heroSlotsFull(data.id))) {
    return { ok: false, error: HERO_FULL_ERROR };
  }

  // Scaglioni rivenditore: la lista inviata sostituisce quella esistente (nessun ordine li referenzia).
  const tierOps = [];
  if (data.resellerTiers !== undefined) {
    tierOps.push(prisma.resellerPriceTier.deleteMany({ where: { productId: data.id } }));
    if (data.resellerTiers.length) {
      tierOps.push(
        prisma.resellerPriceTier.createMany({
          data: data.resellerTiers.map((t) => ({ productId: data.id, minQty: t.minQty, priceCents: t.priceCents })),
        })
      );
    }
  }

  // Varianti: la lista inviata dal form è quella definitiva. Quelle non più presenti si
  // eliminano (gli ordini passati conservano nome e prezzo nello storico), quelle con id
  // si aggiornano, le altre si creano. Gli id devono appartenere a questo prodotto.
  const variantOps = [];
  if (data.variants !== undefined) {
    const existingIds = new Set(existing.variants.map((v) => v.id));
    const keptIds = new Set(data.variants.flatMap((v) => (v.id && existingIds.has(v.id) ? [v.id] : [])));
    const toDelete = existing.variants.filter((v) => !keptIds.has(v.id)).map((v) => v.id);
    if (toDelete.length) variantOps.push(prisma.productVariant.deleteMany({ where: { id: { in: toDelete }, productId: data.id } }));
    data.variants.forEach((v, i) => {
      if (v.id && keptIds.has(v.id)) {
        variantOps.push(prisma.productVariant.update({ where: { id: v.id }, data: { name: v.name, priceCents: v.priceCents, position: i } }));
      } else {
        variantOps.push(prisma.productVariant.create({ data: { productId: data.id, name: v.name, priceCents: v.priceCents, position: i } }));
      }
    });
  }

  const changeRows: { field: string; oldValue: string | null; newValue: string | null }[] = [];
  for (const key of Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[]) {
    const newV = (data as unknown as Record<string, unknown>)[key];
    if (newV === undefined) continue; // campo non incluso in questo salvataggio
    const oldV = (existing as unknown as Record<string, unknown>)[key];
    if (String(oldV) !== String(newV)) {
      changeRows.push({ field: FIELD_LABELS[key], oldValue: oldV == null ? null : String(oldV), newValue: newV == null ? null : String(newV) });
    }
  }
  if (data.variants !== undefined) {
    const before = variantsSummary(existing.variants);
    const after = variantsSummary(data.variants);
    if (before !== after) changeRows.push({ field: "Varianti", oldValue: before, newValue: after });
  }
  if (data.resellerTiers !== undefined) {
    const before = tiersSummary(existing.resellerTiers);
    const after = tiersSummary(data.resellerTiers);
    if (before !== after) changeRows.push({ field: "Scaglioni rivenditore", oldValue: before, newValue: after });
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
        preorderReleaseInfo: data.preorderReleaseInfo === undefined ? undefined : data.preorderReleaseInfo || null,
        heroFeatured: data.heroFeatured,
        onOrder: data.onOrder,
        priceCents: data.priceCents,
        resellerPriceCents: data.resellerPriceCents,
        noWrapPriceCents: data.noWrapPriceCents,
        damagedPriceCents: data.damagedPriceCents,
        supplierCostCents: data.supplierCostCents,
        stockQty: data.stockQty,
        stockLastCheckedAt: new Date(),
        published: data.published,
      },
    }),
    ...variantOps,
    ...tierOps,
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
  invoiceVatRateBps: z.number().int().min(0).max(10000),
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

  const before = await prisma.order.findUnique({ where: { id: input.orderId }, select: { status: true, paymentStatus: true, couponCode: true } });

  const [updated] = await prisma.$transaction([
    prisma.order.update({
      where: { id: input.orderId },
      data: {
        status: input.status,
        trackingCarrier: input.trackingCarrier || undefined,
        trackingNumber: input.trackingNumber || undefined,
        paymentStatus: input.status === "PAYMENT_CONFIRMED" || ["PREPARING", "SHIPPED", "DELIVERED"].includes(input.status) ? "PAID" : undefined,
      },
      include: { user: { select: { email: true } } },
    }),
    prisma.orderStatusHistory.create({
      data: { orderId: input.orderId, status: input.status, note: input.note, changedBy: admin.email },
    }),
  ]);

  if (before && before.paymentStatus !== "PAID" && updated.paymentStatus === "PAID" && before.couponCode) {
    recordDiscountCodeUsage(before.couponCode).catch((err) => console.error("[admin] conteggio utilizzi codice sconto fallito:", err));
  }

  // Scorte: se l'ordine passa ad annullato/rimborsato le restituisce; se da annullato
  // torna attivo le re-impegna. Entrambe sono idempotenti (flag stockReleased).
  if (before) {
    const wasReleasing = isStockReleasingStatus(before.status);
    const nowReleasing = isStockReleasingStatus(updated.status);
    if (!wasReleasing && nowReleasing) await releaseOrderStock(updated.id);
    else if (wasReleasing && !nowReleasing) await reserveOrderStock(updated.id);
  }

  const customerEmail = updated.user?.email ?? updated.guestEmail;
  if (customerEmail) {
    await sendOrderStatusEmail({
      to: customerEmail,
      orderNumber: updated.orderNumber,
      status: updated.status,
      trackingCarrier: updated.trackingCarrier,
      trackingNumber: updated.trackingNumber,
      orderId: updated.id,
    }).catch((err) => console.error("[admin] invio email stato ordine fallito:", err));
  }

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

const setResellerSchema = z.object({ email: z.string().email("Inserisci un'email valida.") });

/** Promuove un cliente esistente a rivenditore (ruolo RESELLER): vede i prezzi dedicati impostati sui prodotti. */
export async function setResellerRoleAction(input: { email: string }): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const parsed = setResellerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dati non validi." };
  const email = parsed.data.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: false, error: "Nessun account con questa email: il cliente deve prima registrarsi." };
  if (user.role === "ADMIN") return { ok: false, error: "Questo account è già admin." };

  await prisma.user.update({ where: { id: user.id }, data: { role: "RESELLER" } });
  revalidatePath("/admin/utenti");
  revalidatePath("/admin/rivenditori");
  return { ok: true };
}

export async function revokeResellerRoleAction(input: { userId: string }): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

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


/**
 * Elimina definitivamente un ordine (e la sua cronologia e righe). Prima restituisce le
 * scorte eventualmente ancora impegnate, così eliminare un ordine non "perde" pezzi di
 * magazzino. Pensata per ripulire gli ordini di prova: l'operazione è irreversibile.
 */
export async function deleteOrderAction(input: { orderId: string }) {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const order = await prisma.order.findUnique({ where: { id: input.orderId }, select: { id: true } });
  if (!order) return { ok: false, error: "Ordine non trovato." };

  // Se le scorte erano ancora impegnate, restituiscile prima di cancellare l'ordine.
  await releaseOrderStock(order.id);

  await prisma.$transaction([
    prisma.orderStatusHistory.deleteMany({ where: { orderId: order.id } }),
    prisma.orderItem.deleteMany({ where: { orderId: order.id } }),
    prisma.order.delete({ where: { id: order.id } }),
  ]);

  revalidatePath("/admin/ordini");
  return { ok: true };
}

/**
 * Elimina TUTTI gli ordini (cronologia e righe comprese). Pensata per ripulire in un colpo
 * gli ordini di prova. Operazione irreversibile: prima restituisce le scorte di eventuali
 * ordini ancora "impegnati", così non si perde magazzino.
 */
export async function deleteAllOrdersAction() {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Non autorizzato." };

  const held = await prisma.order.findMany({ where: { stockReleased: false }, select: { id: true } });
  for (const o of held) await releaseOrderStock(o.id);

  const result = await prisma.$transaction([
    prisma.orderStatusHistory.deleteMany({}),
    prisma.orderItem.deleteMany({}),
    prisma.order.deleteMany({}),
  ]);

  revalidatePath("/admin/ordini");
  return { ok: true, deleted: result[2].count };
}
