import Image from "next/image";

/**
 * Logo FMF Cards: solo la scritta, senza la cornice e senza l'oro dell'originale (che
 * non c'entra con la grafica del sito). Due varianti, generate da
 * scripts/make-logo-variants.mjs: nera per i fondi chiari, bianca per quelli scuri.
 * La larghezza la decide il CSS di chi lo usa (classe `logo-img` o `footer-logo`).
 */
export function Logo({
  priority,
  className,
  white,
}: {
  priority?: boolean;
  className?: string;
  /** Per fondi scuri: barra del pannello admin, intestazione delle email. */
  white?: boolean;
}) {
  return (
    <Image
      src={white ? "/fmf-cards-logo-white.png" : "/fmf-cards-logo-black.png"}
      width={697}
      height={330}
      alt="FMF Cards"
      priority={priority}
      className={className ?? "logo-img"}
      sizes="(max-width: 640px) 150px, 200px"
    />
  );
}
