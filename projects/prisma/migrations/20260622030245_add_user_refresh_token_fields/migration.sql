-- AlterTable
ALTER TABLE "users" ADD COLUMN     "refresh_token_expires_at" TIMESTAMPTZ,
ADD COLUMN     "refresh_token_hash" VARCHAR(255);
