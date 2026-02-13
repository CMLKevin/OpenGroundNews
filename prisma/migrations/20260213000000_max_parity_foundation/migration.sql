-- Max parity foundation migration
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DigestStatus') THEN
    CREATE TYPE "DigestStatus" AS ENUM ('queued', 'sent', 'skipped', 'failed');
  END IF;
END $$;

ALTER TABLE "Story"
  ADD COLUMN IF NOT EXISTS "lastRefreshedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "staleAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "readTimeMinutes" INTEGER,
  ADD COLUMN IF NOT EXISTS "imageAssetKey" TEXT,
  ADD COLUMN IF NOT EXISTS "brokeTheNewsSourceId" TEXT;

ALTER TABLE "SourceArticle"
  ADD COLUMN IF NOT EXISTS "headline" TEXT,
  ADD COLUMN IF NOT EXISTS "byline" TEXT,
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "language" TEXT,
  ADD COLUMN IF NOT EXISTS "canonicalHash" TEXT;

CREATE TABLE IF NOT EXISTS "StorySnapshot" (
  "id" TEXT PRIMARY KEY,
  "storyId" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "title" TEXT,
  "body" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StorySnapshot_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "StoryTimelineEvent" (
  "id" TEXT PRIMARY KEY,
  "storyId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "detail" TEXT,
  "eventAt" TIMESTAMP(3),
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoryTimelineEvent_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "StoryPodcastReference" (
  "id" TEXT PRIMARY KEY,
  "storyId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "url" TEXT,
  "provider" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoryPodcastReference_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "StoryReaderLink" (
  "id" TEXT PRIMARY KEY,
  "storyId" TEXT NOT NULL,
  "label" TEXT,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoryReaderLink_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "StoryRelatedStory" (
  "id" TEXT PRIMARY KEY,
  "storyId" TEXT NOT NULL,
  "relatedStoryId" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoryRelatedStory_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE,
  CONSTRAINT "StoryRelatedStory_relatedStoryId_fkey" FOREIGN KEY ("relatedStoryId") REFERENCES "Story"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "StoryGeo" (
  "id" TEXT PRIMARY KEY,
  "storyId" TEXT NOT NULL UNIQUE,
  "lat" DOUBLE PRECISION NOT NULL,
  "lon" DOUBLE PRECISION NOT NULL,
  "locality" TEXT,
  "country" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoryGeo_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "OutletOwnershipEntity" (
  "id" TEXT PRIMARY KEY,
  "outletId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "entityType" TEXT,
  "country" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutletOwnershipEntity_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "OutletOwnershipEdge" (
  "id" TEXT PRIMARY KEY,
  "outletId" TEXT NOT NULL,
  "fromEntityId" TEXT NOT NULL,
  "toEntityId" TEXT NOT NULL,
  "sharePct" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutletOwnershipEdge_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE,
  CONSTRAINT "OutletOwnershipEdge_fromEntityId_fkey" FOREIGN KEY ("fromEntityId") REFERENCES "OutletOwnershipEntity"("id") ON DELETE CASCADE,
  CONSTRAINT "OutletOwnershipEdge_toEntityId_fkey" FOREIGN KEY ("toEntityId") REFERENCES "OutletOwnershipEntity"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "DigestJob" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "list" TEXT NOT NULL,
  "frequency" TEXT NOT NULL,
  "payload" JSONB,
  "status" "DigestStatus" NOT NULL DEFAULT 'queued',
  "error" TEXT,
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  CONSTRAINT "DigestJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "DigestDelivery" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "digestJobId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerId" TEXT,
  "status" "DigestStatus" NOT NULL DEFAULT 'queued',
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DigestDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL,
  CONSTRAINT "DigestDelivery_digestJobId_fkey" FOREIGN KEY ("digestJobId") REFERENCES "DigestJob"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "ApiRateLimitCounter" (
  "id" TEXT PRIMARY KEY,
  "namespace" TEXT NOT NULL,
  "identifier" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "windowKey" TEXT NOT NULL,
  "resetAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "OAuthAccount" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "email" TEXT,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Story_staleAt_idx" ON "Story"("staleAt");
CREATE INDEX IF NOT EXISTS "Story_brokeTheNewsSourceId_idx" ON "Story"("brokeTheNewsSourceId");
CREATE INDEX IF NOT EXISTS "SourceArticle_canonicalHash_idx" ON "SourceArticle"("canonicalHash");
CREATE INDEX IF NOT EXISTS "StorySnapshot_storyId_createdAt_idx" ON "StorySnapshot"("storyId", "createdAt");
CREATE INDEX IF NOT EXISTS "StoryTimelineEvent_storyId_order_idx" ON "StoryTimelineEvent"("storyId", "order");
CREATE INDEX IF NOT EXISTS "StoryReaderLink_storyId_idx" ON "StoryReaderLink"("storyId");
CREATE INDEX IF NOT EXISTS "StoryRelatedStory_relatedStoryId_idx" ON "StoryRelatedStory"("relatedStoryId");
CREATE UNIQUE INDEX IF NOT EXISTS "StoryRelatedStory_storyId_relatedStoryId_key" ON "StoryRelatedStory"("storyId", "relatedStoryId");
CREATE INDEX IF NOT EXISTS "OutletOwnershipEntity_outletId_idx" ON "OutletOwnershipEntity"("outletId");
CREATE INDEX IF NOT EXISTS "OutletOwnershipEdge_outletId_idx" ON "OutletOwnershipEdge"("outletId");
CREATE INDEX IF NOT EXISTS "DigestJob_status_queuedAt_idx" ON "DigestJob"("status", "queuedAt");
CREATE INDEX IF NOT EXISTS "DigestDelivery_userId_createdAt_idx" ON "DigestDelivery"("userId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "ApiRateLimitCounter_namespace_identifier_windowKey_key" ON "ApiRateLimitCounter"("namespace", "identifier", "windowKey");
CREATE UNIQUE INDEX IF NOT EXISTS "OAuthAccount_provider_providerAccountId_key" ON "OAuthAccount"("provider", "providerAccountId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Story_brokeTheNewsSourceId_fkey'
  ) THEN
    ALTER TABLE "Story"
      ADD CONSTRAINT "Story_brokeTheNewsSourceId_fkey"
      FOREIGN KEY ("brokeTheNewsSourceId") REFERENCES "SourceArticle"("id") ON DELETE SET NULL;
  END IF;
END $$;
