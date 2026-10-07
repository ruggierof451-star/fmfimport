import Image from "next/image";
import { ProductArt } from "@/components/product-art";
import type { ArtInput } from "@/lib/product-art";

export function ProductImage({
  product,
  alt,
  sizes,
  priority,
}: {
  product: ArtInput & { imageUrl: string | null };
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  if (product.imageUrl) {
    return (
      <Image
        src={product.imageUrl}
        alt={alt}
        fill
        sizes={sizes}
        style={{ objectFit: "contain" }}
        priority={priority}
      />
    );
  }
  return <ProductArt product={product} />;
}
