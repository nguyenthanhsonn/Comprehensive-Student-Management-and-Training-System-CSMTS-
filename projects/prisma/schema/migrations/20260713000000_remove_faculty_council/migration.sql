-- Chuyển dữ liệu cũ trước khi rút gọn enum.
UPDATE "users"
SET "role" = 'class_council'
WHERE "role" = 'faculty_council';

UPDATE "evaluation_forms"
SET "status" = 'class_approved'
WHERE "status" = 'faculty_approved';

-- Bỏ phân công hội đồng khoa và các field duyệt cấp khoa.
DROP TABLE IF EXISTS "faculty_council_assignments";

ALTER TABLE "evaluation_forms"
  DROP CONSTRAINT IF EXISTS "evaluation_forms_faculty_reviewed_by_fkey";

ALTER TABLE "evaluation_forms"
  DROP COLUMN IF EXISTS "faculty_reviewed_by",
  DROP COLUMN IF EXISTS "faculty_reviewed_at";

-- PostgreSQL không hỗ trợ xóa enum value trực tiếp theo cách an toàn,
-- nên tạo enum mới rồi chuyển kiểu cột qua enum mới.
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('admin', 'student', 'class_council');

ALTER TABLE "users"
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" TYPE "UserRole" USING "role"::text::"UserRole",
  ALTER COLUMN "role" SET DEFAULT 'student';

DROP TYPE "UserRole_old";

ALTER TYPE "FormStatus" RENAME TO "FormStatus_old";
CREATE TYPE "FormStatus" AS ENUM (
  'draft',
  'submitted',
  'class_approved',
  'finalized',
  'rejected'
);

ALTER TABLE "evaluation_forms"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "FormStatus" USING "status"::text::"FormStatus",
  ALTER COLUMN "status" SET DEFAULT 'draft';

DROP TYPE "FormStatus_old";
