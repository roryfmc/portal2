/*
  Warnings:

  - You are about to drop the column `status` on the `Operative` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Operative_status_idx";

-- AlterTable
ALTER TABLE "public"."Operative" DROP COLUMN "status",
ALTER COLUMN "trade" DROP NOT NULL;

-- DropEnum
DROP TYPE "public"."OperativeStatus";

-- CreateTable
CREATE TABLE "public"."ClientJobType" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "payRate" DECIMAL(10,2) NOT NULL,
    "clientCost" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientJobType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientJobType_clientId_idx" ON "public"."ClientJobType"("clientId");

-- CreateIndex
CREATE INDEX "ClientJobType_name_idx" ON "public"."ClientJobType"("name");

-- AddForeignKey
ALTER TABLE "public"."ClientJobType" ADD CONSTRAINT "ClientJobType_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
