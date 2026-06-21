# SMASTE

## Khởi chạy dự án

```bash
cp .env.example .env
pnpm install
pnpm build
pnpm dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001/api`
- Health check: `GET http://localhost:3001/api/health`

Generate Prisma Client và chạy migration sau khi PostgreSQL đã sẵn sàng:

```bash
pnpm db:generate
pnpm db:migrate -- --name init
```

Monorepo tuân theo ba ranh giới:

- `apps/frontend`: UI, route, hook, state và lời gọi API.
- `apps/backend`: controller, service, module, entity, migration, auth và nghiệp vụ server.
- `packages/shared`: type, interface, enum, constant và schema không phụ thuộc browser, NestJS hay database.

**SMASTE** là hệ thống quản lý sinh viên và đánh giá rèn luyện dành cho môi trường đại học/cao đẳng. Dự án tập trung số hóa các nghiệp vụ cốt lõi: quản lý hồ sơ sinh viên, theo dõi kết quả học tập, đánh giá rèn luyện, ghi nhận khen thưởng - kỷ luật, quản lý hoạt động sinh viên và tổng hợp báo cáo.

## Mục tiêu

- Chuẩn hóa quy trình quản lý sinh viên trên một hệ thống tập trung.
- Giảm thao tác thủ công khi nhập liệu, tính điểm, xếp loại và tổng hợp dữ liệu.
- Hỗ trợ sinh viên, cố vấn học tập, giáo vụ và cán bộ quản lý tra cứu thông tin nhanh chóng.
- Tạo nền tảng có thể mở rộng cho các nghiệp vụ đào tạo, công tác sinh viên và báo cáo quản trị.

## Đối tượng sử dụng

- **Sinh viên:** xem thông tin cá nhân, kết quả học tập, điểm rèn luyện, hoạt động đã tham gia, thông báo và biểu mẫu.
- **Cố vấn học tập:** theo dõi tình hình lớp/sinh viên, hỗ trợ đánh giá và cảnh báo học tập.
- **Giáo vụ/cán bộ khoa:** quản lý hồ sơ, điểm học tập, hoạt động, khen thưởng - kỷ luật và dữ liệu theo đơn vị.
- **Quản trị viên:** quản lý tài khoản, phân quyền, cấu hình hệ thống và dữ liệu dùng chung.

## Luồng tổng quát

Hệ thống vận hành theo luồng chính:

1. Người dùng truy cập hệ thống.
2. Người dùng đăng nhập và được xác thực.
3. Hệ thống phân quyền theo vai trò.
4. Client hiển thị giao diện tương ứng.
5. Người dùng thao tác trên các module nghiệp vụ.
6. Client gửi yêu cầu đến Server/API.
7. Server kiểm tra quyền, xử lý nghiệp vụ và truy xuất/lưu dữ liệu.
8. Client nhận kết quả và hiển thị dữ liệu, thông báo hoặc trạng thái xử lý.

Sơ đồ chi tiết được lưu tại [docs/generalflow.mmd](docs/generalflow.mmd).

## Module nghiệp vụ

### 1. Xác thực và phân quyền

- Đăng nhập bằng tài khoản/mật khẩu.
- Kiểm tra dữ liệu đầu vào ở phía client.
- Server xác thực thông tin đăng nhập.
- Cấp token/session sau khi đăng nhập thành công.
- Điều hướng người dùng đến giao diện phù hợp với vai trò.
- Hiển thị lỗi khi thông tin đăng nhập không hợp lệ.

### 2. Quản lý hồ sơ sinh viên

- Xem danh sách sinh viên.
- Tìm kiếm, lọc và phân trang theo lớp, khoa, ngành hoặc khóa.
- Xem chi tiết hồ sơ sinh viên.
- Thêm mới, chỉnh sửa, cập nhật hoặc xóa thông tin sinh viên.
- Import/export danh sách sinh viên khi cần tổng hợp dữ liệu.

### 3. Quản lý kết quả học tập

- Xem điểm theo học kỳ hoặc năm học.
- Chọn lớp, sinh viên hoặc môn học để nhập và cập nhật điểm.
- Tính điểm trung bình.
- Xếp loại học lực.
- Thống kê kết quả học tập.
- Cảnh báo các trường hợp có kết quả học tập yếu.

### 4. Quản lý rèn luyện

- Tạo và hiển thị phiếu đánh giá rèn luyện theo học kỳ hoặc đợt đánh giá.
- Nhập điểm theo từng tiêu chí.
- Tự động tính điểm tổng.
- Phân loại kết quả rèn luyện.
- Lưu lịch sử đánh giá.
- Xuất phiếu đánh giá khi cần đối chiếu hoặc lưu trữ.

### 5. Khen thưởng - kỷ luật

- Ghi nhận hồ sơ khen thưởng.
- Ghi nhận hồ sơ kỷ luật.
- Đính kèm minh chứng hoặc quyết định liên quan.
- Theo dõi lịch sử xử lý.
- Thống kê theo học kỳ, năm học hoặc đơn vị quản lý.

### 6. Hoạt động sinh viên

- Quản lý hoạt động ngoại khóa, nghiên cứu khoa học và phong trào.
- Ghi nhận trạng thái tham gia của sinh viên.
- Cập nhật minh chứng tham gia.
- Tính điểm hoặc trạng thái đóng góp theo quy định.
- Tổng hợp danh sách hoạt động theo sinh viên, lớp hoặc khoa.

### 7. Tra cứu, báo cáo và thống kê

- Tra cứu dữ liệu theo điều kiện tìm kiếm.
- Hiển thị kết quả dưới dạng bảng, biểu đồ hoặc báo cáo.
- Thống kê theo lớp, khoa, ngành, học lực, điểm rèn luyện, khen thưởng và kỷ luật.
- Xuất báo cáo Excel/PDF hoặc phục vụ in ấn.

Luồng nghiệp vụ chi tiết được mô tả trong [docs/user-story-client.mmd](docs/user-story-client.mmd).

## Kiến trúc đề xuất

```text
[Next.js Frontend]
        |
        v
[NestJS REST API]
        |
        v
[Prisma ORM]
        |
        v
[PostgreSQL Database]
```

### Thành phần chính

- **Frontend:** giao diện người dùng, xử lý form, điều hướng, hiển thị dữ liệu và trạng thái.
- **Backend/API:** xác thực, phân quyền, xử lý nghiệp vụ, kiểm tra dữ liệu và cung cấp API.
- **Database:** lưu trữ hồ sơ sinh viên, tài khoản, điểm học tập, điểm rèn luyện, hoạt động, khen thưởng - kỷ luật và báo cáo.
- **Tài liệu nghiệp vụ:** các sơ đồ Mermaid trong thư mục `docs/`.

## Tech stack dự kiến

- **Language:** TypeScript
- **Frontend:** Next.js
- **Backend:** NestJS
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT + Refresh Token hoặc Session-based Auth
- **UI:** Tailwind CSS, shadcn/ui
- **Validation:** class-validator, Zod
- **Deployment:** Docker, VPS hoặc Cloud

## Cấu trúc tài liệu hiện tại

```text
.
├── README.md
└── docs
    ├── generalflow.mmd
    ├── user-story-admin.mmd
    └── user-story-client.mmd
```

## Trạng thái dự án

Dự án hiện đang ở giai đoạn mô tả nghiệp vụ và thiết kế luồng cốt lõi. Các tài liệu hiện có đóng vai trò nền tảng để tiếp tục triển khai UI, API, database schema và phân quyền chi tiết.

## Gợi ý triển khai tiếp theo

1. Hoàn thiện user story cho từng vai trò: sinh viên, cố vấn học tập, giáo vụ, quản trị viên.
2. Thiết kế database schema cho các module chính.
3. Xác định ma trận phân quyền theo vai trò.
4. Xây dựng API contract cho từng module.
5. Tạo giao diện quản trị và giao diện sinh viên.
6. Viết test cho các nghiệp vụ tính điểm, xếp loại và phân quyền.

## Tài liệu liên quan

- [Luồng tổng quát](docs/generalflow.mmd)
- [User story client](docs/user-story-client.mmd)
- [User story admin](docs/user-story-admin.mmd)
