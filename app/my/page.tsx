import { SavedFeed } from "@/components/SavedFeed";
import { listStories } from "@/lib/store";
import { getCurrentUser, getPrefsForUser } from "@/lib/authStore";
import Link from "next/link";
import { db } from "@/lib/db";
import { MyNewsBiasWidget } from "@/components/MyNewsBiasWidget";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const user = await getCurrentUser();
  const prefs = user ? await getPrefsForUser(user.id) : null;
  const stories = await listStories({ view: "all", limit: 120 });
  const recentReads = user
    ? await db.readingEvent.findMany({
        where: { userId: user.id },
        include: { story: true },
        orderBy: { readAt: "desc" },
        take: 12,
      })
    : [];

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

      <section className="topic-shell" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "grid", gap: "0.85rem" }}>
          <MyNewsBiasWidget />
          {user ? (
            <section className="panel" style={{ display: "grid", gap: "0.6rem" }}>
              <div className="section-title" style={{ paddingTop: 0 }}>
                <h2 style={{ margin: 0 }}>Reading History</h2>
                <span className="story-meta">{recentReads.length ? "Recent" : "No reads yet"}</span>
              </div>
              {recentReads.length > 0 ? (
                <ul className="rail-list" style={{ listStyle: "none", paddingLeft: 0 }}>
                  {recentReads.map((ev) => (
                    <li key={ev.id}>
                      <Link className="rail-link" href={`/story/${encodeURIComponent(ev.story.slug)}`}>
                        {ev.story.title}
                      </Link>
                      <div className="story-meta">
                        Read {new Date(ev.readAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="story-meta" style={{ margin: 0 }}>
                  Open a story to start building your bias dashboard.
                </p>
              )}
            </section>
          ) : (
            <section className="panel">
              <h2 style={{ marginTop: 0 }}>Reading History</h2>
              <p className="story-meta" style={{ margin: 0 }}>
                Guest reading history is stored locally and used to compute your bias distribution, but is not displayed yet.
              </p>
            </section>
          )}
        </div>
        <aside className="feed-rail">
          <section className="panel">
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2 style={{ margin: 0 }}>Your Topics</h2>
              <span className="story-meta">{prefs?.topics?.length || 0}</span>
            </div>
            <div className="chip-row">
              {(prefs?.topics || []).slice(0, 16).map((slug) => (
                <Link key={slug} className="pill" href={`/interest/${encodeURIComponent(slug)}`}>
                  #{slug}
                </Link>
              ))}
            </div>
          </section>
          <section className="panel">
            <div className="section-title" style={{ paddingTop: 0 }}>
              <h2 style={{ margin: 0 }}>Your Sources</h2>
              <span className="story-meta">{prefs?.outlets?.length || 0}</span>
            </div>
            <div className="chip-row">
              {(prefs?.outlets || []).slice(0, 16).map((slug) => (
                <Link key={slug} className="pill" href={`/source/${encodeURIComponent(slug)}`}>
                  {slug}
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </section>
      <SavedFeed initialStories={stories} />
    </main>
  );
}
