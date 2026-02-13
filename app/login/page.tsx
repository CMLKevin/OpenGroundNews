import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="container u-page-pad">
      <div className="auth-page-grid">
        <AuthForm mode="login" />
        <aside className="panel auth-side">
          <div className="auth-side-art" aria-hidden="true" />
          <h2 className="u-m0">A clearer way to read the news</h2>
          <ul className="auth-benefits">
            <li>Bias ratings and 7-category outlet system</li>
            <li>Blindspot stories that one side barely sees</li>
            <li>Weather context for your city</li>
            <li>Saved stories, citations, and custom feeds</li>
          </ul>
          <p className="story-meta u-m0">
            New here? Create an account to sync your feed preferences.
          </p>
        </aside>
      </div>
    </main>
  );
}
