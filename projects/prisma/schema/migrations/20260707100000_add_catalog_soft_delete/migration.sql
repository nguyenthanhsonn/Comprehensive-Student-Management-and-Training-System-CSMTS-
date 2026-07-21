-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "deleted_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "faculties" ADD COLUMN     "deleted_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "majors" ADD COLUMN     "deleted_at" TIMESTAMPTZ;
