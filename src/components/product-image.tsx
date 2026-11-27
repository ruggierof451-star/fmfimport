import Image from "next/image";
import { ProductArt } from "@/components/product-art";
import { cutoutUrlIfReady } from "@/lib/image-cutout";
import { isOptimizableImage } from "@/lib/image-host";
import { displayImageUrl } from "@/lib/blob-image";
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
  main,
}: {
  product: ArtInput & { imageUrl: string | null; slug: string };
  alt: string;
  sizes: string;
  priority?: boolean;
  /**
   * Foto principale della scheda prodotto. Le foto caricate dall'admin sono già
   * ridotte e compresse al caricamento, della misura giusta per questa posizione:
   * servirle così come sono evita il passaggio dall'ottimizzatore di Next, che alla
   * prima apertura (non ancora in cache) ritardava la foto di quasi un secondo.
   */
  main?: boolean;
}) {
  if (!product.imageUrl) return <ProductArt product={product} />;

  const cutoutUrl = cutoutUrlIfReady(product.slug);
  // foto dell'archivio privato servite da /img/… (vedi src/lib/blob-image.ts)
  const src = cutoutUrl ?? displayImageUrl(product.imageUrl);

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      style={{ objectFit: "contain", ...(cutoutUrl ? { padding: "8%" } : {}) }}
      priority={priority}
      unoptimized={!isOptimizableImage(src) || (main === true && src.startsWith("/immagini/"))}
    />
  );
}
