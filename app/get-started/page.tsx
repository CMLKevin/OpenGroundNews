import { GetStartedWizard } from "@/components/GetStartedWizard";
import { listStories } from "@/lib/store";
import { outletSlug } from "@/lib/lookup";

export const dynamic = "force-dynamic";

function uniqBy<T>(items: T[], key: (t: T) => string) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

export default async function GetStartedPage() {
  const stories = await listStories({ view: "all", limit: 200 });

  const suggestedTopics = uniqBy(
    stories
      .flatMap((s) => s.tags)
      .map((tag) => ({ slug: tag.toLowerCase().replace(/\s+/g, "-"), label: tag })),
    (t) => t.slug,
  ).slice(0, 24);

  const suggestedOutlets = uniqBy(
    stories
      .flatMap((s) => s.sources)
      .map((src) => ({ slug: outletSlug(src.outlet), label: src.outlet })),
    (o) => o.slug,
  ).slice(0, 24);

  return (
    <main className="container" style={{ padding: "1rem 0 2rem" }}>
      <section className="hero" style={{ paddingTop: "0.7rem" }}>
        <div className="hero-panel">
          <h1>Build your perspective-aware feed</h1>
          <p>
            Pick an edition, follow topics and sources, and start tracking your reading bias. You can change everything
            later.
          </p>
        </div>
        <div className="hero-panel">
          <p className="note" style={{ margin: 0 }}>
            This wizard stores preferences locally. If you sign in, it also syncs follows and prefs to your account.
          </p>
        </div>
      </section>

      <GetStartedWizard suggestedTopics={suggestedTopics} suggestedOutlets={suggestedOutlets} />
    </main>
  );
}

