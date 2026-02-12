-- AlterTable
ALTER TABLE "UserPrefs" ADD COLUMN     "notifyBlindspot" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyDailyBriefing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyFollowed" BOOLEAN NOT NULL DEFAULT false;
