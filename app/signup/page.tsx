import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <main className="container" style={{ padding: "1rem 0 2rem" }}>
      <AuthForm mode="signup" />
    </main>
  );
}

