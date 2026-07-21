ALTER TABLE "evaluation_forms"
  ADD COLUMN "note" TEXT,
  ADD COLUMN "study_score" SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN "study_data" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "discipline_base_score" SMALLINT NOT NULL DEFAULT 25,
  ADD COLUMN "discipline_score" SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN "discipline_data" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "evaluation_forms"
  ADD CONSTRAINT "evaluation_forms_study_score_check" CHECK ("study_score" BETWEEN 0 AND 20),
  ADD CONSTRAINT "evaluation_forms_discipline_base_score_check" CHECK ("discipline_base_score" BETWEEN 0 AND 25),
  ADD CONSTRAINT "evaluation_forms_discipline_score_check" CHECK ("discipline_score" BETWEEN 0 AND 25);