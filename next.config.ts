import type { NextConfig } from "next";

// Niente cacheComponents/PPR: il sito è intrinsecamente dinamico (prezzi, scorte e
// carrello dipendono dal database ad ogni richiesta), quindi il prerendering statico
// sperimentale di Next non si applica qui.
const nextConfig: NextConfig = {
  // Permette di aprire il sito in dev da telefono tramite l'IP di rete locale
  // (es. per testare senza dover fare ogni volta una build di produzione).
  allowedDevOrigins: ["192.168.1.111"],
};

export default nextConfig;
