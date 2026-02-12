import { SavedFeed } from "@/components/SavedFeed";
import { listStories } from "@/lib/store";
import { getCurrentUser, getPrefsForUser } from "@/lib/authStore";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const user = await getCurrentUser();
  const prefs = user ? await getPrefsForUser(user.id) : null;
  const stories = await listStories({ view: "all", limit: 120 });

  return (
    <main className="container" style={{ padding: "1rem 0 2rem" }}>
      <section className="panel" style={{ marginBottom: "1rem", display: "grid", gap: "0.55rem" }}>
        <div className="section-title" style={{ paddingTop: 0 }}>
          <h1 style={{ margin: 0, fontFamily: "var(--font-serif)" }}>For You</h1>
          <span className="story-meta">{user ? "Account" : "Guest"}</span>
        </div>
        {user ? (
          <>
            <div className="story-meta">
              Signed in as <strong>{user.email}</strong> • Role: {user.role}
            </div>
            <div className="story-meta">
              Subscription: <strong>{prefs?.subscription?.status || "none"}</strong>
              {prefs?.subscription?.plan ? ` • Plan: ${prefs.subscription.plan}` : ""}
            </div>
          </>
        ) : (
          <p className="note" style={{ margin: 0 }}>
            Sign in to sync your followed topics and outlets across devices.{" "}
            <Link href="/login?next=/my">
              Sign in
            </Link>
            .
          </p>
        )}
      </section>
      <SavedFeed initialStories={stories} />
    </main>
  );
}
