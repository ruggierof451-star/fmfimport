import type { NextConfig } from "next";

// Niente cacheComponents/PPR: il sito è intrinsecamente dinamico (prezzi, scorte e
// carrello dipendono dal database ad ogni richiesta), quindi il prerendering statico
// sperimentale di Next non si applica qui.
const nextConfig: NextConfig = {
  images: {
    // Le foto caricate dall'admin stanno nel database e sono servite dal sito stesso
    // (/immagini/<id>), quindi Next le ridimensiona per lo schermo di chi guarda:
    // fondamentale da telefono, dove altrimenti si scaricherebbe la foto intera.
    // Solo WebP: AVIF pesa un po' meno ma è molto più lento da generare, e la prima
    // apertura di una foto (non ancora in cache) su telefono si vedeva arrivare dopo
    // qualche secondo. WebP è supportato da tutti i browser attuali.
    formats: ["image/webp"],
    // Le foto prodotto non cambiano mai una volta caricate: cache lunga sulle versioni
    // ridimensionate, così dalla seconda visita sono immediate.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  // Permette di aprire il sito in dev da telefono tramite l'IP di rete locale
  // (es. per testare senza dover fare ogni volta una build di produzione).
  allowedDevOrigins: ["192.168.1.111"],

  // Intestazioni di sicurezza applicate a ogni risposta. Proteggono da clickjacking
  // (frame-ancestors / X-Frame-Options), sniffing del tipo di file (nosniff), perdita
  // dell'indirizzo visitato verso altri siti (Referrer-Policy) e forzano HTTPS sui
  // browser (HSTS). Non impongono una Content-Security-Policy restrittiva sugli script,
  // che richiederebbe i nonce di Next e va introdotta con cautela per non rompere il sito.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;
