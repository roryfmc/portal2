/*
  Warnings:

  - Made the column `clientId` on table `ConstructionSite` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."ConstructionSite" DROP CONSTRAINT "ConstructionSite_clientId_fkey";

-- AlterTable
ALTER TABLE "public"."ConstructionSite" ALTER COLUMN "clientId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."ConstructionSite" ADD CONSTRAINT "ConstructionSite_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
