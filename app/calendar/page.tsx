import Link from "next/link";
import { prettyDate } from "@/lib/format";
import { listStories } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ topic?: string; bias?: string; from?: string; to?: string }>;
};

export default async function CalendarPage({ searchParams }: Props) {
  const { topic, bias, from, to } = await searchParams;
  const stories = await listStories({ view: "all", topic: topic?.trim() || undefined, limit: 2000 });
  const filtered = stories.filter((story) => {
    const day = story.publishedAt.slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    if (bias === "left") return story.bias.left > story.bias.center && story.bias.left > story.bias.right;
    if (bias === "center") return story.bias.center >= story.bias.left && story.bias.center >= story.bias.right;
    if (bias === "right") return story.bias.right > story.bias.center && story.bias.right > story.bias.left;
    return true;
  });
  const byDate = new Map<string, Array<{ slug: string; title: string; topic: string; publishedAt: string }>>();
  for (const story of filtered) {
    const day = story.publishedAt.slice(0, 10);
    const bucket = byDate.get(day) || [];
    bucket.push({ slug: story.slug, title: story.title, topic: story.topic, publishedAt: story.publishedAt });
    byDate.set(day, bucket);
  }
  const calendar = Array.from(byDate.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, entries]) => ({ date, count: entries.length, stories: entries }));
  const totalStories = filtered.length;
  const activeFilters = [
    topic ? `Topic: ${topic}` : null,
    bias && bias !== "all" ? `Bias: ${bias}` : null,
    from ? `From: ${from}` : null,
    to ? `To: ${to}` : null,
  ].filter(Boolean);
  const maxDailyCount = calendar.reduce((max, day) => Math.max(max, day.count), 0);

  const quickRangeHref = (days: number) => {
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const start = new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10);
    const query = new URLSearchParams();
    if (topic) query.set("topic", topic);
    if (bias && bias !== "all") query.set("bias", bias);
    query.set("from", start);
    query.set("to", end);
    return `/calendar?${query.toString()}`;
  };

  return (
    <main className="container u-page-pad">
      <section className="panel u-grid u-grid-gap-06">
        <div className="section-title u-pt-0">
          <h1 className="u-m0">News Calendar</h1>
          <span className="story-meta">Date-indexed story timeline</span>
        </div>
        <form className="filters-grid" action="/calendar" method="get">
          <label className="story-meta u-grid u-grid-gap-02">
            Topic
            <input className="input-control" name="topic" defaultValue={topic || ""} placeholder="e.g. Ukraine" />
          </label>
          <label className="story-meta u-grid u-grid-gap-02">
            Bias
            <select className="select-control" name="bias" defaultValue={bias || "all"}>
              <option value="all">All</option>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
          <label className="story-meta u-grid u-grid-gap-02">
            From
            <input className="input-control" type="date" name="from" defaultValue={from || ""} />
          </label>
          <label className="story-meta u-grid u-grid-gap-02">
            To
            <input className="input-control" type="date" name="to" defaultValue={to || ""} />
          </label>
          <button className="btn btn-primary calendar-apply-btn" type="submit">Apply</button>
        </form>

        <div className="chip-row">
          <Link className="btn" href={quickRangeHref(7)}>Last 7 days</Link>
          <Link className="btn" href={quickRangeHref(30)}>Last 30 days</Link>
          <Link className="btn" href={quickRangeHref(90)}>Last 90 days</Link>
          <Link className="btn" href="/calendar">Reset</Link>
        </div>

        <div className="kpi-strip">
          <div className="kpi">
            <span>Matched stories</span>
            <strong>{totalStories}</strong>
          </div>
          <div className="kpi">
            <span>Active days</span>
            <strong>{calendar.length}</strong>
          </div>
          <div className="kpi">
            <span>Peak day volume</span>
            <strong>{maxDailyCount}</strong>
          </div>
        </div>

        {activeFilters.length ? (
          <div className="chip-row">
            {activeFilters.map((filter) => (
              <span key={filter} className="chip">{filter}</span>
            ))}
          </div>
        ) : (
          <p className="story-meta u-m0">No filters applied. Showing full recent feed.</p>
        )}
      </section>

      <section className="u-grid u-grid-gap-075 u-mt-1">
        {calendar.map((day) => (
          <article key={day.date} className="panel u-grid u-grid-gap-04">
            <div className="section-title u-pt-0">
              <h2 className="u-m0">{prettyDate(`${day.date}T00:00:00.000Z`)}</h2>
              <span className="story-meta">{day.count} stories</span>
            </div>
            <div className="bias-mini-bar">
              <span
                className="seg seg-center"
                style={{
                  width: `${maxDailyCount > 0 ? Math.max(3, Math.round((day.count / maxDailyCount) * 100)) : 0}%`,
                }}
              />
              <span
                className="seg"
                style={{
                  width: `${maxDailyCount > 0 ? Math.max(0, 100 - Math.round((day.count / maxDailyCount) * 100)) : 100}%`,
                  background: "var(--line-muted)",
                }}
              />
            </div>
            <ul className="rail-list u-list-reset">
              {day.stories.slice(0, 16).map((story) => (
                <li key={story.slug}>
                  <Link className="rail-link" href={`/story/${encodeURIComponent(story.slug)}`}>
                    {story.title}
                  </Link>
                  <div className="story-meta">{story.topic}</div>
                </li>
              ))}
            </ul>
          </article>
        ))}
        {!calendar.length ? <section className="panel"><p className="story-meta u-m0">No calendar entries for current filters.</p></section> : null}
      </section>
    </main>
  );
}
