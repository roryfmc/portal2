/*
  Warnings:

  - The primary key for the `ConstructionSite` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `status` column on the `ConstructionSite` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Operative` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `certifications` on the `Operative` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Operative` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Operative` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Operative` table. All the data in the column will be lost.
  - The `status` column on the `Operative` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `SiteAssignment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `dailyRate` on the `SiteAssignment` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - The `status` column on the `SiteAssignment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Manager` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[siteId,operativeId,startDate]` on the table `SiteOperative` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Operative` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."EmploymentType" AS ENUM ('SELF_EMPLOYED', 'CONTRACT', 'TEMPORARY');

-- CreateEnum
CREATE TYPE "public"."RightToWorkStatus" AS ENUM ('VERIFIED', 'PENDING', 'EXPIRED', 'NOT_PROVIDED');

-- CreateEnum
CREATE TYPE "public"."CertificateStatus" AS ENUM ('VALID', 'EXPIRING_SOON', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."TimeOffStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."OperativeStatus" AS ENUM ('AVAILABLE', 'DEPLOYED', 'ON_LEAVE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "public"."SiteStatus" AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "public"."AssignmentStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "public"."ConstructionSite" DROP CONSTRAINT "ConstructionSite_clientId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SiteOperative" DROP CONSTRAINT "SiteOperative_operativeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SiteOperative" DROP CONSTRAINT "SiteOperative_siteId_fkey";

-- DropIndex
DROP INDEX "public"."Operative_email_key";

-- DropIndex
DROP INDEX "public"."SiteOperative_siteId_operativeId_key";

-- AlterTable
ALTER TABLE "public"."ConstructionSite" DROP CONSTRAINT "ConstructionSite_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."SiteStatus" NOT NULL DEFAULT 'PLANNING',
ADD CONSTRAINT "ConstructionSite_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "ConstructionSite_id_seq";

-- AlterTable
ALTER TABLE "public"."Operative" DROP CONSTRAINT "Operative_pkey",
DROP COLUMN "certifications",
DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "phone",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."OperativeStatus" NOT NULL DEFAULT 'AVAILABLE',
ADD CONSTRAINT "Operative_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Operative_id_seq";

-- AlterTable
ALTER TABLE "public"."SiteAssignment" DROP CONSTRAINT "SiteAssignment_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "operativeId" SET DATA TYPE TEXT,
ALTER COLUMN "siteId" SET DATA TYPE TEXT,
ALTER COLUMN "dailyRate" SET DATA TYPE DECIMAL(10,2),
DROP COLUMN "status",
ADD COLUMN     "status" "public"."AssignmentStatus" NOT NULL DEFAULT 'SCHEDULED',
ADD CONSTRAINT "SiteAssignment_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "SiteAssignment_id_seq";

-- AlterTable
ALTER TABLE "public"."SiteOperative" ALTER COLUMN "siteId" SET DATA TYPE TEXT,
ALTER COLUMN "operativeId" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "public"."Manager";

-- CreateTable
CREATE TABLE "public"."PersonalDetails" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "nationalInsurance" TEXT NOT NULL,
    "employmentType" "public"."EmploymentType" NOT NULL,
    "payrollNumber" TEXT NOT NULL,
    "operativeId" TEXT NOT NULL,

    CONSTRAINT "PersonalDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NextOfKin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "operativeId" TEXT NOT NULL,

    CONSTRAINT "NextOfKin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RightToWork" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "status" "public"."RightToWorkStatus" NOT NULL,
    "documentUrl" TEXT,
    "expiryDate" TIMESTAMP(3),
    "operativeId" TEXT NOT NULL,

    CONSTRAINT "RightToWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkSite" (
    "id" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "role" TEXT NOT NULL,
    "contractor" TEXT NOT NULL,
    "operativeId" TEXT NOT NULL,

    CONSTRAINT "WorkSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ComplianceCertificate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" "public"."CertificateStatus" NOT NULL,
    "documentUrl" TEXT,
    "operativeId" TEXT NOT NULL,

    CONSTRAINT "ComplianceCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TimeOffRequest" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "public"."TimeOffStatus" NOT NULL DEFAULT 'PENDING',
    "operativeId" TEXT NOT NULL,

    CONSTRAINT "TimeOffRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Availability" (
    "id" TEXT NOT NULL,
    "mondayToFriday" BOOLEAN NOT NULL,
    "saturday" BOOLEAN NOT NULL,
    "sunday" BOOLEAN NOT NULL,
    "nightShifts" BOOLEAN NOT NULL,
    "unavailableDates" TIMESTAMP(3)[],
    "operativeId" TEXT NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonalDetails_email_key" ON "public"."PersonalDetails"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalDetails_operativeId_key" ON "public"."PersonalDetails"("operativeId");

-- CreateIndex
CREATE UNIQUE INDEX "NextOfKin_operativeId_key" ON "public"."NextOfKin"("operativeId");

-- CreateIndex
CREATE UNIQUE INDEX "RightToWork_operativeId_key" ON "public"."RightToWork"("operativeId");

-- CreateIndex
CREATE INDEX "WorkSite_operativeId_idx" ON "public"."WorkSite"("operativeId");

-- CreateIndex
CREATE INDEX "WorkSite_siteName_idx" ON "public"."WorkSite"("siteName");

-- CreateIndex
CREATE INDEX "ComplianceCertificate_operativeId_idx" ON "public"."ComplianceCertificate"("operativeId");

-- CreateIndex
CREATE INDEX "ComplianceCertificate_status_idx" ON "public"."ComplianceCertificate"("status");

-- CreateIndex
CREATE INDEX "ComplianceCertificate_expiryDate_idx" ON "public"."ComplianceCertificate"("expiryDate");

-- CreateIndex
CREATE INDEX "TimeOffRequest_operativeId_idx" ON "public"."TimeOffRequest"("operativeId");

-- CreateIndex
CREATE INDEX "TimeOffRequest_status_idx" ON "public"."TimeOffRequest"("status");

-- CreateIndex
CREATE INDEX "TimeOffRequest_startDate_endDate_idx" ON "public"."TimeOffRequest"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Availability_operativeId_key" ON "public"."Availability"("operativeId");

-- CreateIndex
CREATE INDEX "ConstructionSite_clientId_idx" ON "public"."ConstructionSite"("clientId");

-- CreateIndex
CREATE INDEX "ConstructionSite_status_idx" ON "public"."ConstructionSite"("status");

-- CreateIndex
CREATE INDEX "ConstructionSite_startDate_endDate_idx" ON "public"."ConstructionSite"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Operative_trade_idx" ON "public"."Operative"("trade");

-- CreateIndex
CREATE INDEX "Operative_status_idx" ON "public"."Operative"("status");

-- CreateIndex
CREATE INDEX "SiteAssignment_operativeId_idx" ON "public"."SiteAssignment"("operativeId");

-- CreateIndex
CREATE INDEX "SiteAssignment_siteId_idx" ON "public"."SiteAssignment"("siteId");

-- CreateIndex
CREATE INDEX "SiteAssignment_status_idx" ON "public"."SiteAssignment"("status");

-- CreateIndex
CREATE INDEX "SiteAssignment_startDate_endDate_idx" ON "public"."SiteAssignment"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "SiteOperative_siteId_idx" ON "public"."SiteOperative"("siteId");

-- CreateIndex
CREATE INDEX "SiteOperative_operativeId_idx" ON "public"."SiteOperative"("operativeId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteOperative_siteId_operativeId_startDate_key" ON "public"."SiteOperative"("siteId", "operativeId", "startDate");

-- AddForeignKey
ALTER TABLE "public"."PersonalDetails" ADD CONSTRAINT "PersonalDetails_operativeId_fkey" FOREIGN KEY ("operativeId") REFERENCES "public"."Operative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NextOfKin" ADD CONSTRAINT "NextOfKin_operativeId_fkey" FOREIGN KEY ("operativeId") REFERENCES "public"."Operative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RightToWork" ADD CONSTRAINT "RightToWork_operativeId_fkey" FOREIGN KEY ("operativeId") REFERENCES "public"."Operative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkSite" ADD CONSTRAINT "WorkSite_operativeId_fkey" FOREIGN KEY ("operativeId") REFERENCES "public"."Operative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ComplianceCertificate" ADD CONSTRAINT "ComplianceCertificate_operativeId_fkey" FOREIGN KEY ("operativeId") REFERENCES "public"."Operative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_operativeId_fkey" FOREIGN KEY ("operativeId") REFERENCES "public"."Operative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Availability" ADD CONSTRAINT "Availability_operativeId_fkey" FOREIGN KEY ("operativeId") REFERENCES "public"."Operative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConstructionSite" ADD CONSTRAINT "ConstructionSite_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SiteAssignment" ADD CONSTRAINT "SiteAssignment_operativeId_fkey" FOREIGN KEY ("operativeId") REFERENCES "public"."Operative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SiteAssignment" ADD CONSTRAINT "SiteAssignment_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "public"."ConstructionSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SiteOperative" ADD CONSTRAINT "SiteOperative_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "public"."ConstructionSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SiteOperative" ADD CONSTRAINT "SiteOperative_operativeId_fkey" FOREIGN KEY ("operativeId") REFERENCES "public"."Operative"("id") ON DELETE CASCADE ON UPDATE CASCADE;
