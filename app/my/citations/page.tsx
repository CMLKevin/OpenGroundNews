import Link from "next/link";
import { getCurrentUser } from "@/lib/authStore";
import { db } from "@/lib/db";
import { compactHost, prettyDate } from "@/lib/format";
import { GuestCitationsClient } from "@/components/GuestCitationsClient";

export const dynamic = "force-dynamic";

export default async function CitationsPage() {
  const user = await getCurrentUser();
  if (!user) return <GuestCitationsClient />;

  const reads = await db.readingEvent.findMany({
    where: { userId: user.id },
    orderBy: { readAt: "desc" },
    include: { story: { include: { sources: { include: { outlet: true } } } } },
    take: 20,
  });

  const byStory = new Map<string, { slug: string; title: string; readAt: Date; sources: Array<{ id: string; outlet: string; url: string; bias: string; factuality: string }> }>();
  for (const ev of reads) {
    if (!ev.story) continue;
    if (byStory.has(ev.story.slug)) continue;
    const sources = (ev.story.sources || []).map((s) => ({
      id: s.id,
      outlet: s.outlet?.name || "Unknown outlet",
      url: s.url,
      bias: s.outlet?.bias || "unknown",
      factuality: s.outlet?.factuality || "unknown",
    }));
    byStory.set(ev.story.slug, { slug: ev.story.slug, title: ev.story.title, readAt: ev.readAt, sources });
    if (byStory.size >= 10) break;
  }

  const stories = Array.from(byStory.values());

  return (
    <div className="u-grid u-grid-gap-085">
      <section className="panel">
        <div className="section-title u-pt-0">
          <h2 className="u-m0">Citations</h2>
          <span className="story-meta">Account</span>
        </div>
        <p className="story-meta u-m0">
          Citations list the source articles behind each story you read recently.
        </p>
      </section>

      {stories.length ? (
        stories.map((s) => (
          <section key={s.slug} className="panel u-grid u-grid-gap-06">
            <div className="section-title u-pt-0">
              <h3 className="u-m0">
                <Link href={`/story/${encodeURIComponent(s.slug)}`} className="u-no-underline">
                  {s.title}
                </Link>
              </h3>
              <span className="story-meta">Read {prettyDate(s.readAt.toISOString())} • {s.sources.length} sources</span>
            </div>
            <ul className="rail-list u-list-reset">
              {s.sources.slice(0, 10).map((src) => (
                <li key={src.id}>
                  <a className="rail-link" href={src.url} target="_blank" rel="noreferrer">
                    {src.outlet} ({compactHost(src.url)})
                  </a>
                  <div className="story-meta">
                    {src.bias === "unknown" ? "Unclassified" : src.bias} • {String(src.factuality).replace(/_/g, "-") === "unknown" ? "Not rated" : String(src.factuality).replace(/_/g, "-")}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <section className="panel">
          <p className="story-meta u-m0">
            No citations yet. Read a story to populate this page.
          </p>
        </section>
      )}
    </div>
  );
}

