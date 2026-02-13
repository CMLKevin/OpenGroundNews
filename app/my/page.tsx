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
  const stories = await listStories({ view: "all", limit: 80 });

  const recentReads = user
    ? await db.readingEvent.findMany({
        where: { userId: user.id },
        include: { story: true },
        orderBy: { readAt: "desc" },
        take: 12,
      })
    : [];

  return (
    <div className="u-grid u-grid-gap-1">
      <section className="my-dashboard">
        <MyNewsBiasWidget />
        {user ? (
          <section className="panel u-grid u-grid-gap-06">
            <div className="section-title u-pt-0">
              <h2 className="u-m0">Reading History</h2>
              <span className="story-meta">{recentReads.length ? "Recent" : "No reads yet"}</span>
            </div>
            <Link className="btn btn-external u-w-fit" href="/my-news-bias">
              Open Full My News Bias Dashboard
            </Link>
            {recentReads.length > 0 ? (
              <ul className="rail-list u-list-reset">
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
              <p className="story-meta u-m0">
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
          <p className="note u-m0">
            Sign in to sync your followed topics and outlets across devices. <Link href="/login?next=/my">Sign in</Link>.
          </p>
        </section>
      ) : null}

      <MyFeedClient initialStories={stories} />
    </div>
  );
}
