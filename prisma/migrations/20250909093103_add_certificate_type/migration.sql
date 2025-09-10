-- Add enum CertificateType and column certType to ComplianceCertificate
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CertificateType') THEN
    CREATE TYPE "public"."CertificateType" AS ENUM ('GENERAL','ASBESTOS');
  END IF;
END $$;

ALTER TABLE "public"."ComplianceCertificate"
  ADD COLUMN IF NOT EXISTS "certType" "public"."CertificateType" NOT NULL DEFAULT 'GENERAL';
