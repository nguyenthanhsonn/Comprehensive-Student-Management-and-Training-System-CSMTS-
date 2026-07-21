# CSMTS - Comprehensive Student Management and Training System

CSMTS là hệ thống quản lý sinh viên và đánh giá kết quả rèn luyện. Dự án gồm backend NestJS/Prisma và frontend Next.js, phục vụ quy trình sinh viên tự đánh giá, ban cán sự/CVHT chấm duyệt cấp lớp, và admin phê duyệt kết quả cuối.

## Thành phần

```text
Comprehensive-Student-Management-and-Training-System-CSMTS-/
├── projects/                 # Backend NestJS
│   ├── src/
│   ├── prisma/
│   ├── test/
│   └── package.json
└── README.md

../CSMTSFE/                  # Frontend Next.js
├── src/
├── package.json
└── README.md
```

## Tech Stack

Backend:
- NestJS 11
- Prisma 7
- PostgreSQL / Supabase
- JWT authentication
- Socket.IO notifications
- Jest, TypeScript

Frontend:
- Next.js 16
- React 19
- Tailwind CSS
- Zustand
- Axios
- Socket.IO client

## Role Chính

Hệ thống hiện có 3 role:

| Role | Mô tả |
|---|---|
| `student` | Sinh viên tự tạo, lưu nháp, cập nhật và nộp phiếu đánh giá rèn luyện. |
| `class_council` | Ban cán sự lớp/CVHT xem lớp được phân công, chấm điểm lớp và gửi phiếu lên admin. |
| `admin` | Quản trị hệ thống, quản lý danh mục/sinh viên/lớp và phê duyệt kết quả cuối. |

## Quy Trình Đánh Giá Rèn Luyện

```text
draft
  -> submitted
  -> class_approved
  -> finalized
```

Ý nghĩa:
- `draft`: sinh viên đang điền hoặc lưu nháp.
- `submitted`: sinh viên đã nộp, chờ ban cán sự/CVHT duyệt.
- `class_approved`: lớp/CVHT đã chấm xong, gửi lên admin.
- `finalized`: admin đã phê duyệt kết quả cuối.
- `rejected`: phiếu bị trả về/chưa hợp lệ.

Điểm chính thức admin dùng để duyệt cuối là `classScore`. `studentScore` vẫn được lưu để sinh viên xem lại phần tự chấm, nhưng không dùng để tính "chênh lệch điểm" ở màn hình admin.

## Chạy Backend

```bash
cd projects
pnpm install
pnpm db:generate
pnpm dev
```

Backend mặc định chạy tại:

```text
http://localhost:5050/api/v1
```

Health check:

```http
GET /api/v1/health
```

## Cấu Hình Backend

Tạo file `.env` từ mẫu:

```bash
cd projects
cp .env.example .env
```

Các biến quan trọng:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

JWT_ACCESS_SECRET="..."
JWT_REFRESH_SECRET="..."
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

BACKEND_PORT=5050
BACKEND_HOST="127.0.0.1"
FRONTEND_URL="http://localhost:3000,http://10.36.120.48:3000,http://10.36.120.223:3000"
STUDENT_PORTAL_URL="http://localhost:3000/login"

PRISMA_CONNECT_ON_INIT=true
```

`FRONTEND_URL` là danh sách origin được phép CORS, phân tách bằng dấu phẩy. Sau khi đổi biến này cần restart backend.

## Chạy Frontend

Frontend nằm ở thư mục sibling:

```bash
cd ../CSMTSFE
npm install
npm run dev
```

Frontend mặc định chạy tại:

```text
http://localhost:3000
```

Các route chính:

```text
/login
/student
/class_council
/admin
```

## Cấu Hình Frontend

Tạo file `.env` từ mẫu:

```bash
cd ../CSMTSFE
cp .env.example .env
```

Các biến thường dùng:

```env
NEXT_PUBLIC_API_URL=http://localhost:5050/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:5050
BACKEND_API_URL=http://localhost:5050/api/v1
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=...
```

Nếu chạy qua ZeroTier/LAN, đổi host thành IP backend tương ứng, ví dụ:

```env
NEXT_PUBLIC_API_URL=http://10.36.120.48:5050/api/v1
NEXT_PUBLIC_SOCKET_URL=http://10.36.120.48:5050
```

## Scripts Backend

Chạy trong `projects/`:

| Lệnh | Mục đích |
|---|---|
| `pnpm dev` | Chạy backend dev watch. |
| `pnpm dev:once` | Chạy backend bằng ts-node, tiện đo/debug nhanh. |
| `pnpm build` | Build backend ra `dist`. |
| `pnpm start:prod` | Chạy bản build production. |
| `pnpm typecheck` | Kiểm tra TypeScript. |
| `pnpm test` | Chạy unit test. |
| `pnpm test:e2e` | Chạy e2e test. |
| `pnpm lint` | Kiểm tra lint. |
| `pnpm db:generate` | Generate Prisma client. |
| `pnpm db:migrate` | Tạo/chạy migration dev. |
| `pnpm db:deploy` | Deploy migration. |
| `pnpm db:seed` | Seed dữ liệu demo. |
| `pnpm db:studio` | Mở Prisma Studio. |

## Scripts Frontend

Chạy trong `../CSMTSFE/`:

| Lệnh | Mục đích |
|---|---|
| `npm run dev` | Chạy Next.js dev server. |
| `npm run build` | Build production. |
| `npm run start` | Chạy bản production build. |
| `npm run lint` | Kiểm tra lint. |

## API Chính

Base URL:

```text
http://localhost:5050/api/v1
```

Auth:

```http
GET  /auth/captcha
POST /auth/login
GET  /auth/me
POST /auth/refresh-token
POST /auth/logout
POST /auth/change-password
```

Sinh viên:

```http
GET   /students/me
PATCH /students/me
GET   /students/me/evaluations

POST  /training-evaluations
GET   /training-evaluations/me
GET   /training-evaluations/:id
PATCH /training-evaluations/:id
POST  /training-evaluations/:id/submit
```

Ban cán sự/CVHT:

```http
GET   /class-council/classes/:id
GET   /training-evaluations?classId=...
GET   /training-evaluations/:id
PATCH /training-evaluations/:id/review-scores
POST  /training-evaluations/:id/review
```

Admin:

```http
GET   /admin/evaluations
PATCH /admin/evaluations/:id/finalize
PATCH /admin/evaluations/bulk-finalize
POST  /admin/evaluations/finalize-by-filter

GET   /admin/classes
GET   /admin/students
GET   /admin/faculties
GET   /admin/majors
GET   /admin/users
GET   /admin/reports/overview
```

Route cũ `/admin/training-evaluations` vẫn là alias tương thích ngược cho `/admin/evaluations`.

## Response `GET /admin/evaluations`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Thao tác thành công",
  "data": {
    "items": [
      {
        "id": "d5052f8b-a47c-4c6f-81fa-c94c2f785276",
        "status": "SUBMITTED",
        "statusLabel": "Đã nộp",
        "submittedAt": "2026-07-14T14:19:58.783Z",
        "student": {
          "id": "051d6f7a-9cb4-4d35-8b74-325782c5a5fd",
          "fullName": "Hoàng Lâm Bảo Toàn",
          "email": "student@example.com"
        },
        "class": {
          "id": "10ff9521-24c9-4326-afb1-174f9355ef92",
          "code": "NNA-K18A",
          "name": "Ngôn ngữ Anh K18A"
        },
        "faculty": {
          "id": "7c1de684-7aa6-4ac0-b3db-bdfa38c70b8f",
          "code": "NNA",
          "name": "Khoa Ngôn ngữ Anh"
        },
        "semester": "HK2",
        "academicYear": "2026-2027",
        "classScore": 75,
        "rank": "good"
      }
    ],
    "page": 1,
    "limit": 20,
    "total": 1
  },
  "timestamp": "2026-07-21T12:00:00.000Z",
  "path": "/api/v1/admin/evaluations?limit=20"
}
```

Response này không có `stats`, `diff`, `studentScore`.

## Kiểm Tra Nhanh

Backend:

```bash
cd projects
pnpm typecheck
pnpm test
```

Frontend:

```bash
cd ../CSMTSFE
npm run lint
npm run build
```

## Lưu Ý Vận Hành

- Sau khi đổi `.env`, restart backend/frontend.
- Nếu FE gọi BE qua IP LAN/ZeroTier, thêm origin FE vào `FRONTEND_URL` của backend.
- Không commit `.env` thật chứa database URL, JWT secret, SMTP password hoặc Cloudinary credentials.
- Khi thêm relation Prisma lớn, đo `query` vs `join` trước khi áp dụng rộng.
- Với API mutation diện rộng như `finalize-by-filter`, giữ cơ chế xác nhận `confirmLargeAction` khi số phiếu vượt ngưỡng an toàn.
