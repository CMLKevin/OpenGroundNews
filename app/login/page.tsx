import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="container" style={{ padding: "1rem 0 2rem" }}>
      <AuthForm mode="login" />
    </main>
  );
}

