import type { NextConfig } from "next";

// Niente cacheComponents/PPR: il sito è intrinsecamente dinamico (prezzi, scorte e
// carrello dipendono dal database ad ogni richiesta), quindi il prerendering statico
// sperimentale di Next non si applica qui.
const nextConfig: NextConfig = {};

export default nextConfig;
