import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BiasBar } from "@/components/BiasBar";
import { BiasDistributionPanel } from "@/components/BiasDistributionPanel";
import { KeyPointsPanel } from "@/components/KeyPointsPanel";
import { PerspectiveTabs } from "@/components/PerspectiveTabs";
import { ReaderDrawer } from "@/components/ReaderDrawer";
import { ShareBar } from "@/components/ShareBar";
import { TimelinePanel } from "@/components/TimelinePanel";
import { SimilarTopicsPanel } from "@/components/SimilarTopicsPanel";
import { SourceCoveragePanel } from "@/components/SourceCoveragePanel";
import { StoryImage } from "@/components/StoryImage";
import { DailyBriefingList } from "@/components/DailyBriefingList";
import { PodcastCards } from "@/components/PodcastCards";
import { ReadingTracker } from "@/components/ReadingTracker";
import { BrokeTheNewsPanel } from "@/components/BrokeTheNewsPanel";
import { SummaryFeedbackLink } from "@/components/SummaryFeedbackLink";
import { SaveStoryToggle } from "@/components/SaveStoryToggle";
import { FactualityPanel } from "@/components/FactualityPanel";
import { OwnershipPanel } from "@/components/OwnershipPanel";
import { LinkedSummary } from "@/components/LinkedSummary";
import { prettyDate, prettyRelativeDate, slugify, sourceCountLabel } from "@/lib/format";
import { readArchiveForUrl } from "@/lib/archive";
import { getStoryBySlug, listStories } from "@/lib/store";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ source?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) return { title: "Story not found • OpenGroundNews" };

  const description = (story.dek || story.summary || "").slice(0, 240);
  const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000";
  const url = `${site.replace(/\/$/, "")}/story/${encodeURIComponent(story.slug)}`;

  return {
    title: `${story.title} • OpenGroundNews`,
    description,
    openGraph: {
      title: story.title,
      description,
      url,
      images: story.imageUrl ? [{ url: story.imageUrl }] : undefined,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: story.title,
      description,
      images: story.imageUrl ? [story.imageUrl] : undefined,
    },
  };
}

export default async function StoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { source } = await searchParams;

  const story = await getStoryBySlug(slug);
  if (!story) return notFound();

  const displayTotalSources = story.coverage?.totalSources ?? story.sourceCount;
  const hasCoverageCounts =
    typeof story.coverage?.leaningLeft === "number" &&
    typeof story.coverage?.center === "number" &&
    typeof story.coverage?.leaningRight === "number";
  const coverageLeft = hasCoverageCounts
    ? Math.max(0, Math.round(story.coverage?.leaningLeft || 0))
    : Math.max(0, Math.round((story.bias.left / 100) * Math.max(1, displayTotalSources)));
  const coverageCenter = hasCoverageCounts
    ? Math.max(0, Math.round(story.coverage?.center || 0))
    : Math.max(0, Math.round((story.bias.center / 100) * Math.max(1, displayTotalSources)));
  const coverageRight = hasCoverageCounts
    ? Math.max(0, Math.round(story.coverage?.leaningRight || 0))
    : Math.max(0, Math.round((story.bias.right / 100) * Math.max(1, displayTotalSources)));
  const dailyBriefing = (await listStories({ view: "all", limit: 8 })).filter((item) => item.slug !== story.slug).slice(0, 6);
  const reader = source ? await readArchiveForUrl(source) : null;
  const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000";
  const shareUrl = `${site.replace(/\/$/, "")}/story/${encodeURIComponent(story.slug)}`;
  const repostMax = story.sources.reduce((acc, s) => Math.max(acc, typeof s.repostedBy === "number" ? s.repostedBy : 0), 0);

  return (
    <main className="container">
      <section className="story-shell">
        <article className="panel u-grid u-grid-gap-085">
          <ReadingTracker storySlug={story.slug} bias={story.bias} />
          <div className="story-meta-row">
            <div className="story-meta">
              <Link href={`/interest/${slugify(story.topic)}`}>{story.topic}</Link>
              {" • "}
              <Link href={`/interest/${slugify(story.location)}`}>{story.location}</Link>
              {" • "}
              Published {prettyRelativeDate(story.publishedAt)}
              {" • "}
              Updated {prettyRelativeDate(story.updatedAt)}
            </div>
            <div className="u-flex u-flex-gap-055 u-items-center">
              <SaveStoryToggle storySlug={story.slug} />
              <ShareBar title={story.title} url={shareUrl} />
            </div>
          </div>
          <h1 className="story-headline">
            {story.title}
          </h1>
          {story.dek ? <p className="story-summary story-dek">{story.dek}</p> : null}
          {story.author ? <div className="story-meta">By {story.author}</div> : null}
          <StoryImage
            src={story.imageUrl}
            alt={story.title}
            width={1200}
            height={640}
            className="lead-image"
            unoptimized
          />
          <BiasBar story={story} showLabels={true} />
          <div className="story-stat-row">
            <span className="story-stat-pill">{sourceCountLabel(story)}</span>
            <span className="story-stat-pill">{story.bias.left}% left</span>
            <span className="story-stat-pill">{story.bias.center}% center</span>
            <span className="story-stat-pill">{story.bias.right}% right</span>
            {repostMax > 0 ? <span className="story-stat-pill">Reposted by {repostMax} other sources</span> : null}
            {story.blindspot ? <span className="story-stat-pill">Blindspot candidate</span> : null}
            {story.trending ? <span className="story-stat-pill">Trending</span> : null}
            {story.local ? <span className="story-stat-pill">Local perspective</span> : null}
          </div>
          <LinkedSummary summary={story.summary} tags={story.tags} />
          <SummaryFeedbackLink storySlug={story.slug} url={shareUrl} />

          <KeyPointsPanel story={story} />

          <PerspectiveTabs story={story} />

          <TimelinePanel story={story} />

          {story.podcasts?.length || story.podcastReferences?.length ? (
            <section className="panel u-grid u-grid-gap-05">
              <div className="section-title u-pt-0">
                <h2 className="u-m0">Podcasts & Opinions</h2>
              </div>
              <PodcastCards entries={story.podcasts && story.podcasts.length > 0 ? story.podcasts : story.podcastReferences || []} />
            </section>
          ) : null}

          <section className="panel">
            <div className="section-title u-pt-0">
              <h2 className="u-m0">Related Topics</h2>
            </div>
            <div className="chip-row">
              {story.tags.map((tag) => (
                <Link className="chip" key={tag} href={`/interest/${slugify(tag)}`}>
                  {tag}
                </Link>
              ))}
            </div>
          </section>

          <SourceCoveragePanel storySlug={story.slug} sources={story.sources} totalSourceCount={displayTotalSources} />

          {reader ? <ReaderDrawer entry={reader} /> : null}
        </article>

        <aside className="feed-rail">
          <section className="panel">
            <div className="section-title u-pt-0">
              <h2 className="u-m0">Coverage Details</h2>
            </div>
            <div className="kpi-strip">
              <div className="kpi">
                <span>Total News Sources</span>
                <strong>{displayTotalSources}</strong>
              </div>
              <div className="kpi">
                <span>Last Updated</span>
                <strong className="u-text-096">{prettyRelativeDate(story.updatedAt)}</strong>
              </div>
              <div className="kpi">
                <span>Leaning Left</span>
                <strong>{coverageLeft}</strong>
              </div>
              <div className="kpi">
                <span>Center</span>
                <strong>{coverageCenter}</strong>
              </div>
              <div className="kpi">
                <span>Leaning Right</span>
                <strong>{coverageRight}</strong>
              </div>
            </div>
          </section>

          <BiasDistributionPanel story={story} />
          <FactualityPanel sources={story.sources} />
          <OwnershipPanel sources={story.sources} />
          <BrokeTheNewsPanel sources={story.sources} />
          <DailyBriefingList stories={dailyBriefing} title="More Stories" />
          <SimilarTopicsPanel story={story} />
        </aside>
      </section>
    </main>
  );
}
