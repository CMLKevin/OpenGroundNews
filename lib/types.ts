export type BiasBucket = "left" | "center" | "right" | "unknown";

export type BiasRatingBucket =
  | "far-left"
  | "left"
  | "lean-left"
  | "center"
  | "lean-right"
  | "right"
  | "far-right"
  | "unknown";

export type FactualityBucket = "very-high" | "high" | "mixed" | "low" | "very-low" | "unknown";

export type SourceArticle = {
  id: string;
  outlet: string;
  url: string;
  excerpt: string;
  headline?: string;
  byline?: string;
  imageUrl?: string;
  language?: string;
  canonicalHash?: string;
  logoUrl?: string;
  bias: BiasBucket;
  biasRating?: BiasRatingBucket;
  factuality: FactualityBucket;
  ownership: string;
  websiteUrl?: string;
  country?: string;
  foundedYear?: number;
  description?: string;
  groundNewsSourceId?: string;
  groundNewsSourceSlug?: string;
  outletProfileUrl?: string;
  groundNewsUrl?: string;
  publishedAt?: string;
  repostedBy?: number;
  paywall?: "none" | "soft" | "hard";
  locality?: "local" | "national" | "international";
};

export type CoverageTotals = {
  totalSources?: number;
  leaningLeft?: number;
  center?: number;
  leaningRight?: number;
};

export type StoryTimelineEvent = {
  id: string;
  label: string;
  detail?: string;
  eventAt?: string;
  order: number;
};

export type StoryPodcastReference = {
  id: string;
  label: string;
  url?: string;
  provider?: string;
};

export type StoryReaderLink = {
  id: string;
  label?: string;
  url: string;
};

export type StoryRelatedStory = {
  id: string;
  slug: string;
  title: string;
  imageUrl?: string;
  publishedAt?: string;
  topic?: string;
  reason?: string;
};

export type StorySnapshot = {
  id: string;
  sourceUrl?: string;
  title?: string;
  body: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
};

export type StoryGeoPoint = {
  lat: number;
  lon: number;
  locality?: string;
  country?: string;
};

export type Story = {
  id: string;
  slug: string;
  canonicalUrl?: string;
  title: string;
  dek?: string;
  author?: string;
  summary: string;
  topic: string;
  location: string;
  tags: string[];
  imageUrl: string;
  publishedAt: string;
  updatedAt: string;
  sourceCount: number;
  originalReportingPct?: number;
  readTimeMinutes?: number;
  lastRefreshedAt?: string;
  staleAt?: string;
  imageAssetKey?: string;
  brokeTheNewsSourceId?: string;
  freshness?: {
    lastRefreshedAt: string;
    staleAt: string;
    isStale: boolean;
  };
  brokeTheNews?: {
    sourceId: string;
    outlet: string;
    publishedAt?: string;
  } | null;
  bias: {
    left: number;
    center: number;
    right: number;
  };
  blindspot: boolean;
  local: boolean;
  trending: boolean;
  homepageRank?: number;
  homepageFeaturedAt?: string;
  sources: SourceArticle[];
  coverage?: CoverageTotals;
  readerLinks?: string[];
  timelineHeaders?: string[];
  podcastReferences?: string[];
  timeline?: StoryTimelineEvent[];
  podcasts?: StoryPodcastReference[];
  readerLinkItems?: StoryReaderLink[];
  relatedStories?: StoryRelatedStory[];
  snapshots?: StorySnapshot[];
  geo?: StoryGeoPoint;
};

export type ArchiveEntry = {
  originalUrl: string;
  status: "success" | "blocked" | "not_found" | "fallback" | "error";
  archiveUrl: string;
  title: string;
  notes: string;
  paragraphs: string[];
  checkedAt: string;
};

export type StoreShape = {
  stories: Story[];
  archiveCache: Record<string, ArchiveEntry>;
  ingestion: {
    lastRunAt: string | null;
    lastMode: string | null;
    storyCount: number;
    routeCount: number;
    notes: string;
  };
};
