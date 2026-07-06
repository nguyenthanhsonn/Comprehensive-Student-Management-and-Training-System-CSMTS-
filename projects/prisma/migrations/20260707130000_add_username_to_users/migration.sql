-- Bước 1: Thêm cột username dạng nullable trước để không phá dữ liệu hiện có.
ALTER TABLE "users" ADD COLUMN "username" VARCHAR(50);

-- Bước 2: Backfill username từ phần trước @ của email, chuẩn hóa và xử lý trùng bằng hậu tố số.
WITH normalized AS (
  SELECT
    id,
    NULLIF(
      regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9._-]', '', 'g'),
      ''
    ) AS base_username
  FROM "users"
  WHERE username IS NULL
),
fallback AS (
  SELECT
    id,
    COALESCE(base_username, 'user-' || substr(id::text, 1, 8)) AS base_username
  FROM normalized
),
ranked AS (
  SELECT
    id,
    base_username,
    row_number() OVER (PARTITION BY base_username ORDER BY id) AS rn
  FROM fallback
)
UPDATE "users" u
SET username = CASE
    WHEN r.rn = 1 THEN left(r.base_username, 50)
    ELSE left(r.base_username, 50 - length(r.rn::text)) || r.rn::text
  END
FROM ranked r
WHERE u.id = r.id;

-- Bước 3: Bắt buộc NOT NULL sau khi đã backfill đầy đủ cho toàn bộ user hiện có.
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

-- Bước 4: Tạo unique index cho username - dùng để tra cứu khi đăng nhập.
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
