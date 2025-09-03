-- DropForeignKey
ALTER TABLE "public"."ConstructionSite" DROP CONSTRAINT "ConstructionSite_clientId_fkey";

-- AlterTable
ALTER TABLE "public"."ConstructionSite" ALTER COLUMN "clientId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."ConstructionSite" ADD CONSTRAINT "ConstructionSite_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
