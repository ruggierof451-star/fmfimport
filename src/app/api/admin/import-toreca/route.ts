import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  compareKey,
  guessSetName,
  guessType,
  isPreorderName,
  salePriceCents,
} from "@/lib/toreca-import";

/**
 * Importazione prodotti dal fornitore Toreca (solo admin).
 *
 * I dati (nome, link, foto, costo) li legge chi importa dall'area rivenditori di Toreca;
 * qui il server:
 *  - scarta i doppioni: stesso link Toreca già importato, oppure un prodotto del sito (non
 *    eliminato) con lo stesso nome di confronto (vedi compareKey);
 *  - scarta i preordini;
 *  - scarica la foto da Toreca e la salva nel database (/immagini/…);
 *  - crea il prodotto con prezzo = costo + ricarico arrotondato al ,90, "su ordinazione",
 *    e la riga SupplierLink con il costo e il link del fornitore.
 * Con dryRun: true non scrive niente e restituisce solo cosa farebbe.
 */
const itemSchema = z.object({
  name: z.string().min(1),
  sourceUrl: z.string().url(),
  imageUrl: z.string().url().nullable().optional(),
  costCents: z.number().int().positive(),
  supplierCode: z.string().nullable().optional(),
});
const bodySchema = z.object({
  items: z.array(itemSchema).min(1).max(100),
  category: z.enum([
    "pokemon-jp",
    "pokemon-cn",
    "pokemon-kr",
    "one-piece-jp",
    "one-piece-cn",
  ]),
  markupPct: z.number().min(0).max(300).default(25),
  publish: z.boolean().default(true),
  dryRun: z.boolean().default(true),
});

const CATEGORY = {
  "pokemon-jp": { game: "POKEMON", language: "JP" },
  "pokemon-cn": { game: "POKEMON", language: "CN" },
  "pokemon-kr": { game: "POKEMON", language: "KR" },
  "one-piece-jp": { game: "ONE_PIECE", language: "JP" },
  "one-piece-cn": { game: "ONE_PIECE", language: "CN" },
} as const;
const IMAGE_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function saveImage(
  url: string,
  createdBy: string,
): Promise<string | null> {
  if (!/^https:\/\/torecaimport\.com\//.test(url)) return null;
  const res = await fetch(url, {
    headers: { "User-Agent": "FMF Cards import" },
  }).catch(() => null);
  if (!res?.ok) return null;
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!IMAGE_TYPES.has(type)) return null;
  const data = Buffer.from(await res.arrayBuffer());
  if (!data.byteLength || data.byteLength > MAX_IMAGE_BYTES) return null;
  const saved = await prisma.uploadedImage.create({
    data: { mimeType: type, data, byteSize: data.byteLength, createdBy },
    select: { id: true },
  });
  return `/immagini/${saved.id}`;
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi." },
      { status: 400 },
    );
  const { items, category, markupPct, publish, dryRun } = parsed.data;
  const { game, language } = CATEGORY[category];

  const existing = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      supplierLink: { select: { sourceUrl: true } },
    },
  });
  const byKey = new Map(existing.map((p) => [compareKey(p.name), p]));
  // Gli indirizzi (slug) devono essere unici anche rispetto ai prodotti eliminati, che restano nel DB.
  const takenSlugs = new Set(
    (await prisma.product.findMany({ select: { slug: true } })).map(
      (p) => p.slug,
    ),
  );
  const bySource = new Map(
    existing
      .filter((p) => p.supplierLink?.sourceUrl)
      .map((p) => [p.supplierLink!.sourceUrl!, p]),
  );

  const created: {
    name: string;
    slug: string;
    priceCents: number;
    costCents: number;
    image: boolean;
  }[] = [];
  const skipped: { name: string; reason: string }[] = [];
  const seenKeys = new Set<string>();

  for (const item of items) {
    const key = compareKey(item.name);
    if (isPreorderName(item.name)) {
      skipped.push({ name: item.name, reason: "preordine" });
      continue;
    }
    const dup = bySource.get(item.sourceUrl) ?? byKey.get(key);
    if (dup) {
      skipped.push({ name: item.name, reason: `già presente: "${dup.name}"` });
      continue;
    }
    if (seenKeys.has(key)) {
      skipped.push({
        name: item.name,
        reason: "doppione nella stessa importazione",
      });
      continue;
    }
    seenKeys.add(key);

    const priceCents = salePriceCents(item.costCents, markupPct);
    let slug = slugify(item.name) || `prodotto-${Date.now()}`;
    if (takenSlugs.has(slug)) slug = `${slug}-${Date.now().toString(36)}`;
    takenSlugs.add(slug);

    if (dryRun) {
      created.push({
        name: item.name,
        slug,
        priceCents,
        costCents: item.costCents,
        image: Boolean(item.imageUrl),
      });
      continue;
    }

    try {
      const imageUrl = item.imageUrl
        ? await saveImage(item.imageUrl, admin.email).catch(() => null)
        : null;
      await prisma.product.create({
        data: {
          name: item.name,
          slug,
          game,
          language,
          category,
          setName: guessSetName(item.name),
          type: guessType(item.name),
          condition: "NEW",
          imageUrl,
          priceCents,
          supplierCostCents: item.costCents,
          costIsEstimated: false,
          stockQty: null,
          published: publish && Boolean(imageUrl),
          onOrder: true,
          matchStatus: "MATCHED",
          supplierCode: item.supplierCode ?? null,
          supplierLink: {
            create: {
              supplierName: "Toreca",
              supplierCode: item.supplierCode ?? null,
              costCents: item.costCents,
              sourceUrl: item.sourceUrl,
              matchConfidence: "import",
            },
          },
          changeLogs: {
            create: {
              field: "Importazione",
              oldValue: null,
              newValue: `Toreca · costo ${(item.costCents / 100).toFixed(2)} € · +${markupPct}%`,
              changedBy: admin.email,
            },
          },
        },
      });
      created.push({
        name: item.name,
        slug,
        priceCents,
        costCents: item.costCents,
        image: Boolean(imageUrl),
      });
    } catch (err) {
      console.error("[import-toreca] prodotto non creato:", item.name, err);
      skipped.push({ name: item.name, reason: "errore durante la creazione" });
    }
  }

  if (!dryRun && created.length) {
    revalidatePath("/admin/prodotti");
    revalidatePath("/", "layout");
  }
  return NextResponse.json({ ok: true, dryRun, created, skipped });
}
