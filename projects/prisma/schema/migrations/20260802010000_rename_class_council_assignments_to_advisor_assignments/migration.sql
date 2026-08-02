-- Rename advisor assignment table to match the current role vocabulary.
-- This preserves existing assignment rows while removing the old class-council naming.

ALTER TABLE IF EXISTS "class_council_assignments" RENAME TO "advisor_assignments";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_council_assignments_pkey'
  ) THEN
    ALTER TABLE "advisor_assignments"
      RENAME CONSTRAINT "class_council_assignments_pkey" TO "advisor_assignments_pkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_council_assignments_user_id_fkey'
  ) THEN
    ALTER TABLE "advisor_assignments"
      RENAME CONSTRAINT "class_council_assignments_user_id_fkey" TO "advisor_assignments_user_id_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_council_assignments_class_id_fkey'
  ) THEN
    ALTER TABLE "advisor_assignments"
      RENAME CONSTRAINT "class_council_assignments_class_id_fkey" TO "advisor_assignments_class_id_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_council_assignments_user_id_class_id_key'
  ) THEN
    ALTER TABLE "advisor_assignments"
      RENAME CONSTRAINT "class_council_assignments_user_id_class_id_key" TO "advisor_assignments_user_id_class_id_key";
  END IF;
END $$;
