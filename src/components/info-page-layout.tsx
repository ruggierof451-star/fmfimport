import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { buildInfoPages } from "@/lib/info-content";
import { getPricingSettings } from "@/lib/settings";
import { formatEuro } from "@/lib/pricing";

export async function InfoPageLayout({ slug }: { slug: string }) {
  const settings = await getPricingSettings();
  const pages = buildInfoPages({
    freeShip: formatEuro(settings.freeShippingThresholdCents),
    shipFee: formatEuro(settings.standardShippingFeeCents),
    bulkThreshold: settings.bulkThresholdQty,
  });
  const page = pages.find((p) => p.slug === slug)!;

  return (
    <>
      <Header />
      <main className="wrap page" style={{ gap: 24 }}>
        <div className="lay">
          <nav className="side" aria-label="Informazioni">
            {pages.map((p) => (
              <Link key={p.slug} href={`/${p.slug}`} className={p.slug === slug ? "on" : ""}>
                {p.title}
              </Link>
            ))}
          </nav>
          <article className="content">
            <div className="box">
              <div className="prose">
                <h1 style={{ fontSize: "clamp(24px,2.8vw,32px)", fontWeight: 500 }}>{page.title}</h1>
                {page.body}
              </div>
            </div>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
