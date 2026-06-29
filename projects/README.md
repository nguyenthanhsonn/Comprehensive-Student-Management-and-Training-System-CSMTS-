# SMASTE Backend

Backend API cho hệ thống quản lý sinh viên và đánh giá rèn luyện, xây bằng NestJS, Prisma và PostgreSQL.

## Cấu trúc thư mục

```text
.
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   ├── config/
│   ├── database/
│   └── modules/
├── prisma/
│   ├── schema/
│   ├── migrations/
│   └── seeds/
├── test/
├── nest-cli.json
├── package.json
├── prisma.config.ts
├── tsconfig.json
└── tsconfig.build.json
```

## Chạy dự án

```bash
pnpm install
pnpm db:generate
pnpm dev
```

Health check:

```text
GET http://127.0.0.1:5050/api/health
```

## Database

Tạo migration:

```bash
pnpm db:migrate --name init
```

Deploy migration:

```bash
pnpm db:deploy
```

Mở Prisma Studio:

```bash
pnpm db:studio
```

## Scripts

- `pnpm dev`: chạy backend ở môi trường dev.
- `pnpm build`: build NestJS app.
- `pnpm start:prod`: chạy bản build trong `dist`.
- `pnpm lint`: kiểm tra lint.
- `pnpm typecheck`: kiểm tra TypeScript.
- `pnpm test`: chạy unit test.
