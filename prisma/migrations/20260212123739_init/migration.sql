-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "FollowKind" AS ENUM ('topic', 'outlet');

-- CreateEnum
CREATE TYPE "BiasBucket" AS ENUM ('left', 'center', 'right', 'unknown');

-- CreateEnum
CREATE TYPE "FactualityBucket" AS ENUM ('very_high', 'high', 'mixed', 'low', 'very_low', 'unknown');

-- CreateEnum
CREATE TYPE "ArchiveStatus" AS ENUM ('success', 'blocked', 'not_found', 'fallback', 'error');

-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('ok', 'error');

-- CreateEnum
CREATE TYPE "ThemePreference" AS ENUM ('light', 'dark', 'auto');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "passwordSalt" TEXT,
    "passwordHash" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "UserPrefs" (
    "userId" TEXT NOT NULL,
    "edition" TEXT NOT NULL DEFAULT 'International',
    "localLabel" TEXT,
    "localLat" DOUBLE PRECISION,
    "localLon" DOUBLE PRECISION,
    "theme" "ThemePreference" NOT NULL DEFAULT 'dark',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPrefs_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "FollowKind" NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dwellMs" INTEGER,
    "sourceOutletSlug" TEXT,

    CONSTRAINT "ReadingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "canonicalUrl" TEXT,
    "title" TEXT NOT NULL,
    "dek" TEXT,
    "author" TEXT,
    "summary" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceCount" INTEGER NOT NULL,
    "biasLeft" INTEGER NOT NULL,
    "biasCenter" INTEGER NOT NULL,
    "biasRight" INTEGER NOT NULL,
    "isBlindspot" BOOLEAN NOT NULL DEFAULT false,
    "isLocal" BOOLEAN NOT NULL DEFAULT false,
    "isTrending" BOOLEAN NOT NULL DEFAULT false,
    "coverageTotal" INTEGER,
    "coverageLeft" INTEGER,
    "coverageCenter" INTEGER,
    "coverageRight" INTEGER,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryTag" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "StoryTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outlet" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "bias" "BiasBucket" NOT NULL DEFAULT 'unknown',
    "factuality" "FactualityBucket" NOT NULL DEFAULT 'unknown',
    "ownership" TEXT,
    "lastEnrichedAt" TIMESTAMP(3),

    CONSTRAINT "Outlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceArticle" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "paywall" TEXT,
    "locality" TEXT,

    CONSTRAINT "SourceArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchiveEntry" (
    "id" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "status" "ArchiveStatus" NOT NULL,
    "archiveUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "paragraphs" JSONB NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchiveEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "IngestionStatus" NOT NULL,
    "routeCount" INTEGER NOT NULL,
    "uniqueStoryLinks" INTEGER NOT NULL,
    "ingestedStories" INTEGER NOT NULL,
    "errors" JSONB,

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSignup" (
    "id" TEXT NOT NULL,
    "list" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSignup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Follow_userId_idx" ON "Follow"("userId");

-- CreateIndex
CREATE INDEX "Follow_kind_slug_idx" ON "Follow"("kind", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_userId_kind_slug_key" ON "Follow"("userId", "kind", "slug");

-- CreateIndex
CREATE INDEX "ReadingEvent_userId_readAt_idx" ON "ReadingEvent"("userId", "readAt");

-- CreateIndex
CREATE INDEX "ReadingEvent_storyId_readAt_idx" ON "ReadingEvent"("storyId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "Story_slug_key" ON "Story"("slug");

-- CreateIndex
CREATE INDEX "Story_updatedAt_idx" ON "Story"("updatedAt");

-- CreateIndex
CREATE INDEX "Story_topic_idx" ON "Story"("topic");

-- CreateIndex
CREATE INDEX "Story_location_idx" ON "Story"("location");

-- CreateIndex
CREATE INDEX "StoryTag_tag_idx" ON "StoryTag"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "StoryTag_storyId_tag_key" ON "StoryTag"("storyId", "tag");

-- CreateIndex
CREATE UNIQUE INDEX "Outlet_slug_key" ON "Outlet"("slug");

-- CreateIndex
CREATE INDEX "Outlet_bias_idx" ON "Outlet"("bias");

-- CreateIndex
CREATE INDEX "Outlet_factuality_idx" ON "Outlet"("factuality");

-- CreateIndex
CREATE INDEX "SourceArticle_storyId_idx" ON "SourceArticle"("storyId");

-- CreateIndex
CREATE INDEX "SourceArticle_outletId_idx" ON "SourceArticle"("outletId");

-- CreateIndex
CREATE INDEX "SourceArticle_url_idx" ON "SourceArticle"("url");

-- CreateIndex
CREATE UNIQUE INDEX "ArchiveEntry_originalUrl_key" ON "ArchiveEntry"("originalUrl");

-- CreateIndex
CREATE INDEX "NewsletterSignup_list_idx" ON "NewsletterSignup"("list");

-- CreateIndex
CREATE INDEX "NewsletterSignup_email_idx" ON "NewsletterSignup"("email");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPrefs" ADD CONSTRAINT "UserPrefs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingEvent" ADD CONSTRAINT "ReadingEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingEvent" ADD CONSTRAINT "ReadingEvent_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryTag" ADD CONSTRAINT "StoryTag_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceArticle" ADD CONSTRAINT "SourceArticle_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceArticle" ADD CONSTRAINT "SourceArticle_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
