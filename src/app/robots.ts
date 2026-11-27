import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * robots.txt sempre riferito al dominio ufficiale. Le anteprime *.vercel.app ricevono in
 * più X-Robots-Tag: noindex dal proxy (src/proxy.ts).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/account", "/checkout", "/ordine"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
