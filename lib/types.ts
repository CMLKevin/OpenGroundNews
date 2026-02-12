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
  logoUrl?: string;
  bias: BiasBucket;
  biasRating?: BiasRatingBucket;
  factuality: FactualityBucket;
  ownership: string;
  publishedAt?: string;
  paywall?: "none" | "soft" | "hard";
  locality?: "local" | "national" | "international";
};

export type CoverageTotals = {
  totalSources?: number;
  leaningLeft?: number;
  center?: number;
  leaningRight?: number;
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
  bias: {
    left: number;
    center: number;
    right: number;
  };
  blindspot: boolean;
  local: boolean;
  trending: boolean;
  sources: SourceArticle[];
  coverage?: CoverageTotals;
  readerLinks?: string[];
  timelineHeaders?: string[];
  podcastReferences?: string[];
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
