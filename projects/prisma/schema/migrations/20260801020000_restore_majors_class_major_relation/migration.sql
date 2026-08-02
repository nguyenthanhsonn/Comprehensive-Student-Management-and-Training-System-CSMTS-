-- Restore Major catalog and connect Class back to Major.
-- Current faculty/class data was cleared before the previous migration, so
-- replacing the required class foreign key is safe for this database state.

CREATE TABLE IF NOT EXISTS "majors" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(20) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "faculty_id" UUID NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ,

  CONSTRAINT "majors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "majors_code_key" ON "majors"("code");
CREATE INDEX IF NOT EXISTS "majors_faculty_id_idx" ON "majors"("faculty_id");

ALTER TABLE "majors" DROP CONSTRAINT IF EXISTS "majors_faculty_id_fkey";
ALTER TABLE "majors"
  ADD CONSTRAINT "majors_faculty_id_fkey"
  FOREIGN KEY ("faculty_id") REFERENCES "faculties"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "classes" DROP CONSTRAINT IF EXISTS "classes_faculty_id_fkey";
DROP INDEX IF EXISTS "classes_faculty_id_idx";

ALTER TABLE "classes"
  DROP COLUMN IF EXISTS "faculty_id",
  ADD COLUMN "major_id" UUID NOT NULL;

CREATE INDEX IF NOT EXISTS "classes_major_id_idx" ON "classes"("major_id");

ALTER TABLE "classes" DROP CONSTRAINT IF EXISTS "classes_major_id_fkey";
ALTER TABLE "classes"
  ADD CONSTRAINT "classes_major_id_fkey"
  FOREIGN KEY ("major_id") REFERENCES "majors"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
