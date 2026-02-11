export type BiasBucket = "left" | "center" | "right";

export type FactualityBucket = "very-high" | "high" | "mixed" | "low" | "very-low";

export type SourceArticle = {
  id: string;
  outlet: string;
  url: string;
  excerpt: string;
  bias: BiasBucket;
  factuality: FactualityBucket;
  ownership: string;
  publishedAt?: string;
  paywall?: "none" | "soft" | "hard";
  locality?: "local" | "national" | "international";
};

export type Story = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  topic: string;
  location: string;
  tags: string[];
  imageUrl: string;
  publishedAt: string;
  updatedAt: string;
  sourceCount: number;
  bias: {
    left: number;
    center: number;
    right: number;
  };
  blindspot: boolean;
  local: boolean;
  trending: boolean;
  sources: SourceArticle[];
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
