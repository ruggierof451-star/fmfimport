import Link from "next/link";
import type { Product } from "@/generated/prisma";
import { ProductImage } from "@/components/product-image";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { cleanProductName } from "@/lib/product-art";
import { standardPriceCents, bulkPriceCents, formatEuro, type PricingRules } from "@/lib/pricing";
import { stockLabel, stockTone } from "@/lib/stock";
import { LANG_LABEL, GAME_LABEL } from "@/lib/catalog";

export function ProductCard({ product, rules }: { product: Product; rules: PricingRules }) {
  const pricingInput = {
    costCents: product.supplierCostCents ?? 0,
    costVatTreatment: product.costVatTreatment,
    vatRateBps: product.vatRateBps,
  };
  const price = standardPriceCents(pricingInput, rules);
  const bulk = bulkPriceCents(pricingInput, rules);
  const tone = stockTone(product.stockQty, product.isPreorder);

  return (
    <article className="card">
      <Link className="img" href={`/prodotto/${product.slug}`} tabIndex={-1} aria-hidden="true">
        <ProductImage product={product} alt={cleanProductName(product.name)} sizes="(max-width: 640px) 45vw, 220px" />
        <span className="tags">
          {product.isNew ? <span className="tag gold">Nuovo</span> : null}
          {product.isPreorder ? <span className="tag">Preordine</span> : null}
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
          <span className="price">{formatEuro(price)}</span>{" "}
          {product.costIsEstimated ? <span className="ind">· indicativo</span> : null}
        </div>
        <div className="bulk">
          Oltre {rules.bulkThresholdQty} pz: <b>{formatEuro(bulk)}</b> cad.
        </div>
        <div className={`stock ${tone}`}>{stockLabel(product.stockQty, product.isPreorder)}</div>
        <div className="act">
          <AddToCartButton productId={product.id} />
        </div>
      </div>
    </article>
  );
}

export { LANG_LABEL };
