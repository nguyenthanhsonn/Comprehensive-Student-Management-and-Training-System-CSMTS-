CREATE TABLE IF NOT EXISTS "class_leader_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "class_id" UUID NOT NULL,
  "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "class_leader_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "class_leader_assignments_user_id_key"
  ON "class_leader_assignments"("user_id");

CREATE INDEX IF NOT EXISTS "class_leader_assignments_class_id_idx"
  ON "class_leader_assignments"("class_id");

ALTER TABLE "class_leader_assignments"
  ADD CONSTRAINT "class_leader_assignments_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "class_leader_assignments"
  ADD CONSTRAINT "class_leader_assignments_class_id_fkey"
  FOREIGN KEY ("class_id") REFERENCES "classes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
