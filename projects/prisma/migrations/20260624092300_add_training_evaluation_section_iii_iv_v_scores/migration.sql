ALTER TABLE "evaluation_forms"
  ADD COLUMN "activity_score" SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN "activity_data" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "community_score" SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN "community_data" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "role_score" SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN "role_data" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "evaluation_forms"
  ADD CONSTRAINT "evaluation_forms_activity_score_check" CHECK ("activity_score" BETWEEN 0 AND 20),
  ADD CONSTRAINT "evaluation_forms_community_score_check" CHECK ("community_score" BETWEEN 0 AND 25),
  ADD CONSTRAINT "evaluation_forms_role_score_check" CHECK ("role_score" BETWEEN 0 AND 10);