-- Migrate UserRole enum from 3 roles to 6 official roles.
-- Existing class_council accounts are promoted to advisor so current approval
-- accounts keep their ability to review while admin can downgrade manually later.
-- Model/table ClassCouncilAssignment is intentionally kept unchanged in this task.

ALTER TYPE "UserRole" RENAME TO "UserRole_old";

CREATE TYPE "UserRole" AS ENUM (
  'student',
  'class_leader',
  'advisor',
  'faculty',
  'training_department',
  'admin'
);

ALTER TABLE users
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE "UserRole" USING (
    CASE role::text
      WHEN 'class_council' THEN 'advisor'
      WHEN 'faculty_council' THEN 'faculty'
      ELSE role::text
    END
  )::"UserRole",
  ALTER COLUMN role SET DEFAULT 'student';

DROP TYPE "UserRole_old";
