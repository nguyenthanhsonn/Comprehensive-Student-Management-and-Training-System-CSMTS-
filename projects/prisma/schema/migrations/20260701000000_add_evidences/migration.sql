-- CreateTable
CREATE TABLE "evidences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "evaluation_form_id" UUID NOT NULL,
    "criterion_id" UUID NOT NULL,
    "image_url" VARCHAR(1000) NOT NULL,
    "public_id" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "evidences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evidences_student_id_idx" ON "evidences"("student_id");

-- CreateIndex
CREATE INDEX "evidences_evaluation_form_id_idx" ON "evidences"("evaluation_form_id");

-- CreateIndex
CREATE INDEX "evidences_criterion_id_idx" ON "evidences"("criterion_id");

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_evaluation_form_id_fkey" FOREIGN KEY ("evaluation_form_id") REFERENCES "evaluation_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_criterion_id_fkey" FOREIGN KEY ("criterion_id") REFERENCES "evaluation_criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
