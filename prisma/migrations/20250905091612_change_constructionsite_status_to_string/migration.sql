/*
  Warnings:

  - Changed the type of `status` on the `ConstructionSite` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."ConstructionSite" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL;

-- DropEnum
DROP TYPE "public"."SiteStatus";

-- CreateIndex
CREATE INDEX "ConstructionSite_status_idx" ON "public"."ConstructionSite"("status");
