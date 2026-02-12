import Link from "next/link";
import { listStories } from "@/lib/store";
import { getCurrentUser } from "@/lib/authStore";
import { db } from "@/lib/db";
import { MyNewsBiasWidget } from "@/components/MyNewsBiasWidget";
import { GuestReadingHistory } from "@/components/GuestReadingHistory";
import { MyFeedClient } from "@/components/MyFeedClient";

export const dynamic = "force-dynamic";

export default async function MyFeedPage() {
  const user = await getCurrentUser();
  const stories = await listStories({ view: "all", limit: 240 });

  const recentReads = user
    ? await db.readingEvent.findMany({
        where: { userId: user.id },
        include: { story: true },
        orderBy: { readAt: "desc" },
        take: 12,
      })
    : [];

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="my-dashboard">
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
                      Read{" "}
                      {new Date(ev.readAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
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
          <GuestReadingHistory />
        )}
      </section>

      {!user ? (
        <section className="panel">
          <p className="note" style={{ margin: 0 }}>
            Sign in to sync your followed topics and outlets across devices. <Link href="/login?next=/my">Sign in</Link>.
          </p>
        </section>
      ) : null}

      <MyFeedClient initialStories={stories} />
    </div>
  );
}

