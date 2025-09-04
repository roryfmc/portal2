-- AlterTable
ALTER TABLE "public"."Operative" ALTER COLUMN "certifications" DROP NOT NULL,
ALTER COLUMN "certifications" SET DATA TYPE TEXT;
