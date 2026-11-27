import type { NextConfig } from "next";

// Niente cacheComponents/PPR: il sito è intrinsecamente dinamico (prezzi, scorte e
// carrello dipendono dal database ad ogni richiesta), quindi il prerendering statico
// sperimentale di Next non si applica qui.
const nextConfig: NextConfig = {
  images: {
    // Le foto prodotto caricate dall'admin stanno su Vercel Blob: autorizzandole qui,
    // Next le ridimensiona per lo schermo di chi guarda (fondamentale da telefono:
    // prima veniva scaricata la foto a piena risoluzione per una miniatura da 160px).
    remotePatterns: [{ protocol: "https", hostname: "**.public.blob.vercel-storage.com" }],
    formats: ["image/avif", "image/webp"],
    // Le foto prodotto non cambiano mai una volta caricate: cache lunga sulle versioni
    // ridimensionate, così dalla seconda visita sono immediate.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  // Permette di aprire il sito in dev da telefono tramite l'IP di rete locale
  // (es. per testare senza dover fare ogni volta una build di produzione).
  allowedDevOrigins: ["192.168.1.111"],
};

export default nextConfig;
