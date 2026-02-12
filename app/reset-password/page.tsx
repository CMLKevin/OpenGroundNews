import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <main className="container" style={{ padding: "1rem 0 2rem" }}>
      <Suspense fallback={<section className="panel" />}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}

