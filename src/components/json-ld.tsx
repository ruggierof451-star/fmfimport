/**
 * Dati strutturati schema.org (JSON-LD) per Google. "<" viene sostituito per evitare
 * che un testo (es. una descrizione prodotto) possa chiudere il tag script.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
