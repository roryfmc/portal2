-- Add unified certificate fields
ALTER TABLE "public"."ComplianceCertificate"
  ADD COLUMN IF NOT EXISTS "trainingProvider" text,
  ADD COLUMN IF NOT EXISTS "contact" text,
  ADD COLUMN IF NOT EXISTS "certificateDetails" text,
  ADD COLUMN IF NOT EXISTS "verifiedWith" text,
  ADD COLUMN IF NOT EXISTS "verifiedBy" text,
  ADD COLUMN IF NOT EXISTS "dateVerified" timestamp;

-- Make legacy fields optional (issuer, issueDate, status)
ALTER TABLE "public"."ComplianceCertificate"
  ALTER COLUMN "issuer" DROP NOT NULL,
  ALTER COLUMN "issueDate" DROP NOT NULL,
  ALTER COLUMN "status" DROP NOT NULL;
