import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="wrap page">
        <div className="empty">
          <b>Pagina non trovata</b>
          <p>Il prodotto o la pagina che cerchi potrebbero essere stati rimossi o spostati.</p>
          <Link className="btn btn-dark btn-sm" href="/">
            Torna alla home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
