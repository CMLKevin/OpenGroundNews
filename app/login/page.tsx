import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="container" style={{ padding: "1rem 0 2rem" }}>
      <div className="auth-page-grid">
        <AuthForm mode="login" />
        <aside className="panel auth-side">
          <div className="auth-side-art" aria-hidden="true" />
          <h2 style={{ margin: 0 }}>A clearer way to read the news</h2>
          <ul className="auth-benefits">
            <li>Bias ratings and 7-category outlet system</li>
            <li>Blindspot stories that one side barely sees</li>
            <li>Local + Weather context for your city</li>
            <li>Saved stories, citations, and custom feeds</li>
          </ul>
          <p className="story-meta" style={{ margin: 0 }}>
            New here? <a href="/get-started">Get started</a> to pick topics, sources, and location.
          </p>
        </aside>
      </div>
    </main>
  );
}
