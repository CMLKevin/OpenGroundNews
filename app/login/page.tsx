import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="container u-page-pad">
      <div className="auth-page-grid">
        <AuthForm mode="login" />
        <aside className="panel auth-side">
          <div className="auth-side-art" aria-hidden="true" />
          <h2 className="u-m0">See every side without doomscroll fatigue</h2>
          <ul className="auth-benefits">
            <li>7-category bias + factuality system for every source</li>
            <li>Blindspot stories the other side barely covers</li>
            <li>Custom feeds tuned to your follows and habits</li>
            <li>Reading history and citations synced across devices</li>
          </ul>
          <p className="story-meta u-m0">
            Start with Google in one click and instantly personalize For You.
          </p>
        </aside>
      </div>
    </main>
  );
}
