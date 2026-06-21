-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'student', 'class_council', 'faculty_council');

-- CreateEnum
CREATE TYPE "FormStatus" AS ENUM ('draft', 'submitted', 'class_approved', 'faculty_approved', 'finalized', 'rejected');

-- CreateEnum
CREATE TYPE "EvalRank" AS ENUM ('excellent', 'good', 'fair', 'average', 'weak', 'poor');

-- CreateEnum
CREATE TYPE "SemesterNo" AS ENUM ('1', '2', 'summer');

-- CreateEnum
CREATE TYPE "CriteriaInputType" AS ENUM ('combobox', 'checkbox', 'textbox', 'deduction');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'student',
    "full_name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "date_of_birth" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "author_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faculties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "majors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "faculty_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "majors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "major_id" UUID NOT NULL,
    "enrollment_year" SMALLINT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_students" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "class_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "student_code" VARCHAR(20) NOT NULL,
    "enrolled_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_council_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_council_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculty_council_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "faculty_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faculty_council_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semesters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "year" SMALLINT NOT NULL,
    "semester" "SemesterNo" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "student_deadline" TIMESTAMPTZ,
    "class_deadline" TIMESTAMPTZ,
    "faculty_deadline" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "semesters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_criteria" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(20) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "max_score" SMALLINT NOT NULL,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "parent_id" UUID,
    "input_type" "CriteriaInputType" NOT NULL DEFAULT 'combobox',
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "evaluation_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_forms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "semester_id" UUID NOT NULL,
    "status" "FormStatus" NOT NULL DEFAULT 'draft',
    "student_score" SMALLINT,
    "class_score" SMALLINT,
    "final_score" SMALLINT,
    "rank" "EvalRank",
    "class_reviewed_by" UUID,
    "faculty_reviewed_by" UUID,
    "admin_finalized_by" UUID,
    "class_reviewed_at" TIMESTAMPTZ,
    "faculty_reviewed_at" TIMESTAMPTZ,
    "admin_finalized_at" TIMESTAMPTZ,
    "submitted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_criteria_scores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "form_id" UUID NOT NULL,
    "criteria_id" UUID NOT NULL,
    "student_score" SMALLINT,
    "class_score" SMALLINT,
    "note" TEXT,
    "attachments_meta" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_criteria_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "form_id" UUID NOT NULL,
    "criteria_id" UUID NOT NULL,
    "original_name" VARCHAR(500) NOT NULL,
    "storage_key" VARCHAR(1000) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "is_approved" BOOLEAN,
    "reject_reason" TEXT,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "posts_author_id_idx" ON "posts"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "faculties_code_key" ON "faculties"("code");

-- CreateIndex
CREATE UNIQUE INDEX "majors_code_key" ON "majors"("code");

-- CreateIndex
CREATE UNIQUE INDEX "classes_code_key" ON "classes"("code");

-- CreateIndex
CREATE INDEX "classes_major_id_idx" ON "classes"("major_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_students_student_code_key" ON "class_students"("student_code");

-- CreateIndex
CREATE INDEX "class_students_student_id_idx" ON "class_students"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_students_class_id_student_id_key" ON "class_students"("class_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_council_assignments_user_id_class_id_key" ON "class_council_assignments"("user_id", "class_id");

-- CreateIndex
CREATE UNIQUE INDEX "faculty_council_assignments_user_id_faculty_id_key" ON "faculty_council_assignments"("user_id", "faculty_id");

-- CreateIndex
CREATE UNIQUE INDEX "semesters_year_semester_key" ON "semesters"("year", "semester");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_criteria_code_key" ON "evaluation_criteria"("code");

-- CreateIndex
CREATE INDEX "evaluation_forms_class_id_idx" ON "evaluation_forms"("class_id");

-- CreateIndex
CREATE INDEX "evaluation_forms_semester_id_status_idx" ON "evaluation_forms"("semester_id", "status");

-- CreateIndex
CREATE INDEX "evaluation_forms_status_idx" ON "evaluation_forms"("status");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_forms_student_id_semester_id_key" ON "evaluation_forms"("student_id", "semester_id");

-- CreateIndex
CREATE INDEX "form_criteria_scores_criteria_id_idx" ON "form_criteria_scores"("criteria_id");

-- CreateIndex
CREATE UNIQUE INDEX "form_criteria_scores_form_id_criteria_id_key" ON "form_criteria_scores"("form_id", "criteria_id");

-- CreateIndex
CREATE INDEX "form_attachments_form_id_idx" ON "form_attachments"("form_id");

-- CreateIndex
CREATE INDEX "form_attachments_criteria_id_idx" ON "form_attachments"("criteria_id");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "majors" ADD CONSTRAINT "majors_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "majors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_students" ADD CONSTRAINT "class_students_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_students" ADD CONSTRAINT "class_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_council_assignments" ADD CONSTRAINT "class_council_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_council_assignments" ADD CONSTRAINT "class_council_assignments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_council_assignments" ADD CONSTRAINT "faculty_council_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_council_assignments" ADD CONSTRAINT "faculty_council_assignments_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_criteria" ADD CONSTRAINT "evaluation_criteria_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "evaluation_criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_forms" ADD CONSTRAINT "evaluation_forms_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_forms" ADD CONSTRAINT "evaluation_forms_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_forms" ADD CONSTRAINT "evaluation_forms_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_forms" ADD CONSTRAINT "evaluation_forms_class_reviewed_by_fkey" FOREIGN KEY ("class_reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_forms" ADD CONSTRAINT "evaluation_forms_faculty_reviewed_by_fkey" FOREIGN KEY ("faculty_reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_forms" ADD CONSTRAINT "evaluation_forms_admin_finalized_by_fkey" FOREIGN KEY ("admin_finalized_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_criteria_scores" ADD CONSTRAINT "form_criteria_scores_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "evaluation_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_criteria_scores" ADD CONSTRAINT "form_criteria_scores_criteria_id_fkey" FOREIGN KEY ("criteria_id") REFERENCES "evaluation_criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_attachments" ADD CONSTRAINT "form_attachments_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "evaluation_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_attachments" ADD CONSTRAINT "form_attachments_criteria_id_fkey" FOREIGN KEY ("criteria_id") REFERENCES "evaluation_criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
