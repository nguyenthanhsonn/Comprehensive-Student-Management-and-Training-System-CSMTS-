# Project Structure

Tai lieu nay mo ta skeleton thu muc duoc tao tu `README.md` va cac so do trong `docs/`.
Muc tieu la tach ro frontend, backend, database va cac thanh phan dung chung de sau nay co the trien khai dung theo kien truc da de xuat.

## Cay thu muc

```text
.
|-- README.md
|-- docs
|   |-- generalflow.mmd
|   |-- project-structure.md
|   |-- user-story-admin.mmd
|   `-- user-story-client.mmd
|-- apps
|   |-- api
|   |   `-- src
|   |       |-- common
|   |       |-- config
|   |       |-- database
|   |       `-- modules
|   `-- web
|       |-- public
|       `-- src
|           |-- app
|           |-- components
|           |-- hooks
|           |-- lib
|           |-- styles
|           `-- types
|-- infra
|   |-- docker
|   |-- nginx
|   `-- postgres
|-- packages
|   `-- shared
`-- prisma
    |-- migrations
    |-- schema
    `-- seeds
```

## Quy uoc chinh

- `apps/web`: Next.js frontend cho dang nhap, dashboard va cac man hinh nghiep vu.
- `apps/api`: NestJS backend, to chuc theo module nghiep vu dung voi docs.
- `prisma`: schema, migration va seed cho PostgreSQL.
- `packages/shared`: types, constants, utils dung chung giua frontend va backend.
- `infra`: file ha tang cho Docker, nginx va khoi tao PostgreSQL.

## Mapping voi docs nghiep vu

- `auth`: xac thuc va phan quyen.
- `students`: quan ly ho so sinh vien.
- `academic-results`: quan ly ket qua hoc tap.
- `conduct`: quan ly diem ren luyen.
- `rewards-discipline`: khen thuong va ky luat.
- `activities`: hoat dong sinh vien.
- `reports`: tra cuu, bao cao va thong ke.

## Ghi chu

Skeleton nay moi dung o muc cau truc thu muc. Chua khoi tao dependency, framework files hay source code nghiep vu.
