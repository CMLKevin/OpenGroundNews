-- DropForeignKey
ALTER TABLE "DigestDelivery" DROP CONSTRAINT "DigestDelivery_digestJobId_fkey";

-- DropForeignKey
ALTER TABLE "DigestDelivery" DROP CONSTRAINT "DigestDelivery_userId_fkey";

-- DropForeignKey
ALTER TABLE "DigestJob" DROP CONSTRAINT "DigestJob_userId_fkey";

-- DropForeignKey
ALTER TABLE "OAuthAccount" DROP CONSTRAINT "OAuthAccount_userId_fkey";

-- DropForeignKey
ALTER TABLE "OutletOwnershipEdge" DROP CONSTRAINT "OutletOwnershipEdge_fromEntityId_fkey";

-- DropForeignKey
ALTER TABLE "OutletOwnershipEdge" DROP CONSTRAINT "OutletOwnershipEdge_outletId_fkey";

-- DropForeignKey
ALTER TABLE "OutletOwnershipEdge" DROP CONSTRAINT "OutletOwnershipEdge_toEntityId_fkey";

-- DropForeignKey
ALTER TABLE "OutletOwnershipEntity" DROP CONSTRAINT "OutletOwnershipEntity_outletId_fkey";

-- DropForeignKey
ALTER TABLE "Story" DROP CONSTRAINT "Story_brokeTheNewsSourceId_fkey";

-- DropForeignKey
ALTER TABLE "StoryGeo" DROP CONSTRAINT "StoryGeo_storyId_fkey";

-- DropForeignKey
ALTER TABLE "StoryPodcastReference" DROP CONSTRAINT "StoryPodcastReference_storyId_fkey";

-- DropForeignKey
ALTER TABLE "StoryReaderLink" DROP CONSTRAINT "StoryReaderLink_storyId_fkey";

-- DropForeignKey
ALTER TABLE "StoryRelatedStory" DROP CONSTRAINT "StoryRelatedStory_relatedStoryId_fkey";

-- DropForeignKey
ALTER TABLE "StoryRelatedStory" DROP CONSTRAINT "StoryRelatedStory_storyId_fkey";

-- DropForeignKey
ALTER TABLE "StorySnapshot" DROP CONSTRAINT "StorySnapshot_storyId_fkey";

-- DropForeignKey
ALTER TABLE "StoryTimelineEvent" DROP CONSTRAINT "StoryTimelineEvent_storyId_fkey";

-- AlterTable
ALTER TABLE "ApiRateLimitCounter" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OAuthAccount" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OutletOwnershipEntity" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "homepageFeaturedAt" TIMESTAMP(3),
ADD COLUMN     "homepageRank" INTEGER;

-- AlterTable
ALTER TABLE "StoryGeo" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "ApiRateLimitCounter_resetAt_idx" ON "ApiRateLimitCounter"("resetAt");

-- CreateIndex
CREATE INDEX "DigestDelivery_digestJobId_idx" ON "DigestDelivery"("digestJobId");

-- CreateIndex
CREATE INDEX "DigestJob_email_queuedAt_idx" ON "DigestJob"("email", "queuedAt");

-- CreateIndex
CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");

-- CreateIndex
CREATE INDEX "OutletOwnershipEdge_fromEntityId_idx" ON "OutletOwnershipEdge"("fromEntityId");

-- CreateIndex
CREATE INDEX "OutletOwnershipEdge_toEntityId_idx" ON "OutletOwnershipEdge"("toEntityId");

-- CreateIndex
CREATE INDEX "Story_homepageRank_idx" ON "Story"("homepageRank");

-- CreateIndex
CREATE INDEX "StoryPodcastReference_storyId_idx" ON "StoryPodcastReference"("storyId");

-- CreateIndex
CREATE INDEX "StoryReaderLink_url_idx" ON "StoryReaderLink"("url");

-- CreateIndex
CREATE INDEX "StoryTimelineEvent_eventAt_idx" ON "StoryTimelineEvent"("eventAt");

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_brokeTheNewsSourceId_fkey" FOREIGN KEY ("brokeTheNewsSourceId") REFERENCES "SourceArticle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorySnapshot" ADD CONSTRAINT "StorySnapshot_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryTimelineEvent" ADD CONSTRAINT "StoryTimelineEvent_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryPodcastReference" ADD CONSTRAINT "StoryPodcastReference_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryReaderLink" ADD CONSTRAINT "StoryReaderLink_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryRelatedStory" ADD CONSTRAINT "StoryRelatedStory_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryRelatedStory" ADD CONSTRAINT "StoryRelatedStory_relatedStoryId_fkey" FOREIGN KEY ("relatedStoryId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryGeo" ADD CONSTRAINT "StoryGeo_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletOwnershipEntity" ADD CONSTRAINT "OutletOwnershipEntity_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletOwnershipEdge" ADD CONSTRAINT "OutletOwnershipEdge_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletOwnershipEdge" ADD CONSTRAINT "OutletOwnershipEdge_fromEntityId_fkey" FOREIGN KEY ("fromEntityId") REFERENCES "OutletOwnershipEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletOwnershipEdge" ADD CONSTRAINT "OutletOwnershipEdge_toEntityId_fkey" FOREIGN KEY ("toEntityId") REFERENCES "OutletOwnershipEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestJob" ADD CONSTRAINT "DigestJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestDelivery" ADD CONSTRAINT "DigestDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestDelivery" ADD CONSTRAINT "DigestDelivery_digestJobId_fkey" FOREIGN KEY ("digestJobId") REFERENCES "DigestJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
