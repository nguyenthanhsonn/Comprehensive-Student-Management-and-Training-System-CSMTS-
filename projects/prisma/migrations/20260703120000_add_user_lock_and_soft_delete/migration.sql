-- AlterTable
ALTER TABLE "class_students" ADD COLUMN     "deleted_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "evaluation_forms" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "posts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted_at" TIMESTAMPTZ,
ADD COLUMN     "locked_at" TIMESTAMPTZ,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "refresh_token_hash" SET DATA TYPE VARCHAR(64);

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");
