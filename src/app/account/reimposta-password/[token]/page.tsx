import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata = { title: "Reimposta password" };

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <>
      <Header activeKey="account" />
      <main className="wrap page">
        <div className="box" style={{ maxWidth: 440, marginInline: "auto" }}>
          <h1 style={{ fontSize: 24, fontWeight: 500 }}>Reimposta la password</h1>
          <ResetPasswordForm token={token} />
        </div>
      </main>
      <Footer />
    </>
  );
}
