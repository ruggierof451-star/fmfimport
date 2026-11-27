import Image from "next/image";
import { ProductArt } from "@/components/product-art";
import { cutoutUrlIfReady } from "@/lib/image-cutout";
import { isOptimizableImage } from "@/lib/image-host";
import type { ArtInput } from "@/lib/product-art";

/**
 * Foto di un prodotto. Se esiste il ritaglio senza sfondo lo usa, altrimenti la foto
 * originale; se non c'è nessuna foto mostra l'illustrazione generata.
 *
 * Le immagini vengono sempre ridimensionate da Next per lo schermo di chi guarda
 * (vedi isOptimizableImage): su telefono si scarica una miniatura, non la foto intera.
 */
export function ProductImage({
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
  if (!product.imageUrl) return <ProductArt product={product} />;

  const cutoutUrl = cutoutUrlIfReady(product.slug);
  const src = cutoutUrl ?? product.imageUrl;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      style={{ objectFit: "contain", ...(cutoutUrl ? { padding: "8%" } : {}) }}
      priority={priority}
      unoptimized={!isOptimizableImage(src)}
    />
  );
}
