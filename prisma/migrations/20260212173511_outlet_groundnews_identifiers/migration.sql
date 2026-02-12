-- AlterTable
ALTER TABLE "Outlet" ADD COLUMN     "groundNewsSourceId" TEXT,
ADD COLUMN     "groundNewsSourceSlug" TEXT,
ADD COLUMN     "groundNewsUrl" TEXT;

-- CreateIndex
CREATE INDEX "Outlet_groundNewsSourceId_idx" ON "Outlet"("groundNewsSourceId");

-- CreateIndex
CREATE INDEX "Outlet_groundNewsSourceSlug_idx" ON "Outlet"("groundNewsSourceSlug");

-- CreateIndex
CREATE INDEX "Outlet_groundNewsUrl_idx" ON "Outlet"("groundNewsUrl");
