-- CreateEnum
CREATE TYPE "OutletBiasRating" AS ENUM ('far_left', 'left', 'lean_left', 'center', 'lean_right', 'right', 'far_right', 'unknown');

-- AlterTable
ALTER TABLE "Outlet" ADD COLUMN     "biasRating" "OutletBiasRating" NOT NULL DEFAULT 'unknown';

-- CreateIndex
CREATE INDEX "Outlet_biasRating_idx" ON "Outlet"("biasRating");
