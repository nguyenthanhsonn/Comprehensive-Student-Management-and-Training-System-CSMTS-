-- Remove Major catalog and connect Class directly to Faculty.
-- Tables were intentionally cleared before this migration, so adding the
-- required faculty_id column is safe for the current database state.

ALTER TABLE "classes" DROP CONSTRAINT IF EXISTS "classes_major_id_fkey";
DROP INDEX IF EXISTS "classes_major_id_idx";

ALTER TABLE "classes"
  DROP COLUMN IF EXISTS "major_id",
  ADD COLUMN "faculty_id" UUID NOT NULL;

CREATE INDEX "classes_faculty_id_idx" ON "classes"("faculty_id");

ALTER TABLE "classes"
  ADD CONSTRAINT "classes_faculty_id_fkey"
  FOREIGN KEY ("faculty_id") REFERENCES "faculties"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE IF EXISTS "majors" CASCADE;
