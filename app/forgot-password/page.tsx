import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <main className="container" style={{ padding: "1rem 0 2rem" }}>
      <ForgotPasswordForm />
    </main>
  );
}

