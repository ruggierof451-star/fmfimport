import { productArt, type ArtInput } from "@/lib/product-art";

export function ProductArt({ product, dark }: { product: ArtInput; dark?: boolean }) {
  return <span dangerouslySetInnerHTML={{ __html: productArt(product, { dark }) }} />;
}
