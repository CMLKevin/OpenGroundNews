import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <main className="container" style={{ padding: "1rem 0 2rem" }}>
      <div className="auth-page-grid">
        <AuthForm mode="signup" />
        <aside className="panel auth-side">
          <div className="auth-side-art" aria-hidden="true" />
          <h2 style={{ margin: 0 }}>Make your feed yours</h2>
          <ul className="auth-benefits">
            <li>Sync follows and reading history across devices</li>
            <li>Build custom feeds for topics and sources</li>
            <li>Track your My News Bias over time</li>
            <li>Get notifications when coverage spikes</li>
          </ul>
          <p className="story-meta" style={{ margin: 0 }}>
            Already have an account? <a href="/login">Sign in</a>.
          </p>
        </aside>
      </div>
    </main>
  );
}
