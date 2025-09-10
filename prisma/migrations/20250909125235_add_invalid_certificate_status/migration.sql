-- Add INVALID to CertificateStatus enum
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'CertificateStatus' AND e.enumlabel = 'INVALID'
  ) THEN
    ALTER TYPE "public"."CertificateStatus" ADD VALUE 'INVALID';
  END IF;
END $$;
