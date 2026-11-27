import Link from "next/link";
import type { Product } from "@/generated/prisma";
import { ProductImage } from "@/components/product-image";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { cleanProductName } from "@/lib/product-art";
import { productImageAlt } from "@/lib/seo";
import { unitPriceCentsFor, formatEuro } from "@/lib/pricing";
import { isOutOfStock } from "@/lib/stock";
import { LANG_LABEL, GAME_LABEL } from "@/lib/catalog";

export function ProductCard({ product, isReseller = false }: { product: Product; isReseller?: boolean }) {
  const price = unitPriceCentsFor(product, isReseller);
  const soldOut = isOutOfStock(product.stockQty);

  return (
    <article className="card">
      <Link className="img" href={`/prodotto/${product.slug}`} tabIndex={-1} aria-hidden="true">
        <ProductImage product={product} alt={productImageAlt(product)} sizes="(max-width: 640px) 45vw, 220px" />
        <span className="tags">
          {product.isNew && !soldOut ? <span className="tag gold">Nuovo</span> : null}
          {product.isPreorder ? <span className="tag">Preordine</span> : null}
          {soldOut ? <span className="tag soldout">Esaurito</span> : null}
          {product.condition === "B_GRADE" ? <span className="tag line">B-Grade</span> : null}
        </span>
        <span className="lang">{product.language}</span>
      </Link>
      <div className="body">
        <div className="meta">
          {GAME_LABEL[product.game]} · {product.type}
        </div>
        <Link className="name" href={`/prodotto/${product.slug}`}>
          {cleanProductName(product.name)}
        </Link>
        <div>
          <span className="price">{formatEuro(price)}</span>
          {isReseller && product.resellerPriceCents != null ? <span className="ind"> · prezzo rivenditore</span> : null}
        </div>
        <div className="act">
          <AddToCartButton productId={product.id} disabled={soldOut} />
        </div>
      </div>
    </article>
  );
}

export { LANG_LABEL };
