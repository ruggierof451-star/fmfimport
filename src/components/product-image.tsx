import Image from "next/image";
import { ProductArt } from "@/components/product-art";
import { ensureCutoutImage } from "@/lib/image-cutout";
import type { ArtInput } from "@/lib/product-art";

export async function ProductImage({
  product,
  alt,
  sizes,
  priority,
}: {
  product: ArtInput & { imageUrl: string | null; slug: string };
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  if (product.imageUrl) {
    const cutout = await ensureCutoutImage(product.imageUrl, product.slug);
    if (cutout) {
      return (
        <Image
          src={cutout.url}
          alt={alt}
          fill
          sizes={sizes}
          style={{ objectFit: "contain", padding: "8%" }}
          priority={priority}
          unoptimized
        />
      );
    }
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
