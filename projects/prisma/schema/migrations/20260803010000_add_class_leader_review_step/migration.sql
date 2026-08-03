ALTER TYPE "FormStatus" ADD VALUE IF NOT EXISTS 'class_leader_approved';

ALTER TABLE "evaluation_forms"
  ADD COLUMN IF NOT EXISTS "class_leader_reviewed_by" UUID,
  ADD COLUMN IF NOT EXISTS "class_leader_reviewed_at" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "evaluation_forms_class_leader_reviewed_by_idx"
  ON "evaluation_forms"("class_leader_reviewed_by");

ALTER TABLE "evaluation_forms"
  ADD CONSTRAINT "evaluation_forms_class_leader_reviewed_by_fkey"
  FOREIGN KEY ("class_leader_reviewed_by")
  REFERENCES "users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
