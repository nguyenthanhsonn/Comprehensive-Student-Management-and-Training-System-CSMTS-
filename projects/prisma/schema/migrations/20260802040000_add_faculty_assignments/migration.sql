CREATE TABLE IF NOT EXISTS "faculty_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "faculty_id" UUID NOT NULL,
  "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "faculty_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "faculty_assignments_user_id_key"
  ON "faculty_assignments"("user_id");

CREATE INDEX IF NOT EXISTS "faculty_assignments_faculty_id_idx"
  ON "faculty_assignments"("faculty_id");

ALTER TABLE "faculty_assignments"
  ADD CONSTRAINT "faculty_assignments_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "faculty_assignments"
  ADD CONSTRAINT "faculty_assignments_faculty_id_fkey"
  FOREIGN KEY ("faculty_id") REFERENCES "faculties"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
