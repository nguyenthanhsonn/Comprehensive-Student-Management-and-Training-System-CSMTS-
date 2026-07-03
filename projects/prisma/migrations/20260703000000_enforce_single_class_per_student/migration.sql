DROP INDEX IF EXISTS "class_students_student_id_idx";

CREATE UNIQUE INDEX "class_students_student_id_key" ON "class_students"("student_id");
