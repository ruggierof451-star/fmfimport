import { prisma } from "@/lib/prisma";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { GAME_LABEL, LANG_LABEL } from "@/lib/catalog";
import { cleanProductName } from "@/lib/product-art";
import { displayImageUrl } from "@/lib/blob-image";
import { productDescription } from "@/lib/seo";

/**
 * Feed prodotti per Google Merchant Center (Google Shopping), in formato RSS 2.0 con lo
 * spazio dei nomi g: https://www.fmfcards.com/feed/google
 *
 * Contiene SOLO i prodotti pubblicabili: in vendita, con prezzo pubblico IVA inclusa in
 * EUR e immagine raggiungibile. Prezzi e disponibilità sono quelli reali del database:
 * niente dati inventati, nessun GTIN finto (gli articoli non ne hanno, quindi si dichiara
 * identifier_exists = no). Rigenerato a ogni richiesta, così Merchant Center legge sempre
 * lo stato aggiornato.
 */
export const dynamic = "force-dynamic";

function xmlEscape(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

export async function GET() {
  const products = await prisma.product.findMany({
    where: {
      published: true,
      archived: false,
      deletedAt: null,
      priceCents: { not: null },
      imageUrl: { not: null },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Data stimata per i prodotti su ordinazione: ~16 giorni di calendario (10-12 lavorativi).
  const backorderDate = new Date(Date.now() + 16 * 86_400_000).toISOString().slice(0, 10) + "T00:00+01:00";
  const items = products
    .map((p) => {
      if (p.priceCents == null || !p.imageUrl) return "";
      const name = cleanProductName(p.name);
      const image = displayImageUrl(p.imageUrl);
      const imageAbs = image.startsWith("http") ? image : absoluteUrl(image);
      const link = absoluteUrl(`/prodotto/${encodeURIComponent(p.slug)}`);
      // Su ordinazione = "backorder": Google vuole anche la data stimata di disponibilità.
      const inStock = p.isPreorder ? "preorder" : p.onOrder ? "backorder" : p.stockQty === 0 ? "out_of_stock" : "in_stock";
      const availabilityDate = p.onOrder && !p.isPreorder ? `\n    <g:availability_date>${backorderDate}</g:availability_date>` : "";
      const productType = `${GAME_LABEL[p.game]} > ${LANG_LABEL[p.language]} > ${p.type}`;
      const desc = productDescription(
        { name: p.name, game: p.game, language: p.language, type: p.type, setName: p.setName, condition: p.condition },
        { priceCents: p.priceCents, soldOut: p.stockQty === 0, isPreorder: p.isPreorder }
      );
      return `  <item>
    <g:id>${xmlEscape(p.supplierCode ?? p.slug)}</g:id>
    <g:title>${xmlEscape(name.slice(0, 150))}</g:title>
    <g:description>${xmlEscape(desc.slice(0, 5000))}</g:description>
    <g:link>${xmlEscape(link)}</g:link>
    <g:image_link>${xmlEscape(imageAbs)}</g:image_link>
    <g:availability>${inStock}</g:availability>${availabilityDate}
    <g:price>${(p.priceCents / 100).toFixed(2)} EUR</g:price>
    <g:brand>${xmlEscape(GAME_LABEL[p.game])}</g:brand>
    <g:condition>new</g:condition>
    <g:identifier_exists>no</g:identifier_exists>
    <g:google_product_category>Toys &amp; Games &gt; Games &gt; Card Games</g:google_product_category>
    <g:product_type>${xmlEscape(productType)}</g:product_type>
  </item>`;
    })
    .filter(Boolean)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>${xmlEscape(SITE_NAME)}</title>
  <link>${absoluteUrl("/")}</link>
  <description>Prodotti TCG sigillati: Pokémon, One Piece, Yu-Gi-Oh! e Dragon Ball.</description>
${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=3600",
    },
  });
}
