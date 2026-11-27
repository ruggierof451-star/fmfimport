import Image from "next/image";
import { ProductArt } from "@/components/product-art";
import { ensureCutoutImage } from "@/lib/image-cutout";
import { displayImageUrl } from "@/lib/blob-image";
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
    const src = displayImageUrl(product.imageUrl);
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        style={{ objectFit: "contain" }}
        priority={priority}
        // Foto caricate su Vercel Blob o incollate da un altro sito: servite così come
        // sono, senza dover autorizzare ogni dominio in next.config.
        // /img/… (archivio privato) passa dall'ottimizzazione di Next: WebP e misura giusta
        unoptimized={/^https?:\/\//.test(src)}
      />
    );
  }
  return <ProductArt product={product} />;
}
