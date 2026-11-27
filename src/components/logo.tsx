import Image from "next/image";

/** Logo ufficiale FMF Cards (oro, fondo trasparente). L'altezza la decide il CSS di chi lo usa. */
export function Logo({ priority, className }: { priority?: boolean; className?: string }) {
  return (
    <Image
      src="/brand/fmf-cards-logo.png"
      width={463}
      height={240}
      alt="FMF Cards"
      priority={priority}
      className={className ?? "logo-img"}
      sizes="160px"
    />
  );
}
