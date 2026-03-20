# File Manager API

Multi-project file manager API built with **Bun + Express + TypeScript**.

Each project can use a different storage backend:
- `local`
- `s3`
- `minio`
- `ftp`

This project intentionally **does not store file metadata in a database**.
All file listing, stat, and content reads are resolved directly from the storage provider.

---

## Features

- Project-based storage configuration in **SQLite**
- One active storage driver per project
- Drivers:
  - local filesystem
  - AWS S3
  - MinIO (S3-compatible)
  - FTP
- File APIs:
  - upload
  - list
  - stat / metadata
  - stream / download
  - delete
  - mkdir
  - move
  - copy
- API token auth
- Bun-compatible runtime
- End-to-end CRUD test script for local / MinIO / FTP
- Swagger UI at `/docs`
- Secret masking in project API responses

---

## Architecture

### Core idea
This API is **project-first**.

Instead of sending `driver=s3` on every request, the client works with:
- `projectId`
- `path`

The server will:
1. load project config from SQLite
2. resolve the correct storage driver
3. execute the file operation on that provider

### What is stored in SQLite
SQLite stores only:
- project info
- selected driver
- storage config JSON

SQLite does **not** store:
- file rows
- file metadata
- file indexes
- upload history

---

## Tech stack

- **Runtime:** Bun
- **HTTP:** Express
- **Language:** TypeScript
- **Validation:** Zod
- **Upload parsing:** Multer
- **Database:** SQLite
- **SQLite adapter:**
  - `bun:sqlite` when running on Bun
  - `better-sqlite3` fallback for Node tooling
- **S3/MinIO:** AWS SDK v3
- **FTP:** `basic-ftp`

---

## Quick start

### 1) Install

```bash
cp .env.example .env
bun install
```

### 2) Seed demo local project

```bash
bun run db:seed
```

### 3) Start server

```bash
bun run start
```

Default server:
- `http://127.0.0.1:3000`

Swagger UI:
- `http://127.0.0.1:3000/docs`

Dashboard UI:
- `http://127.0.0.1:3000/dashboard/`

---

## Environment variables

`.env.example`

```env
PORT=3000
HOST=0.0.0.0
DATABASE_PATH=./data/app.db
API_TOKEN=change-me
UPLOAD_TMP_DIR=./tmp
```

---

## Auth

Pass one of these headers:

- `x-api-token: <token>`
- `Authorization: Bearer <token>`

Default local example:

```bash
-H 'x-api-token: change-me'
```

---

## API Overview

## Health

### `GET /api/health`

```bash
curl http://127.0.0.1:3000/api/health \
  -H 'x-api-token: change-me'
```

## Projects

### `GET /api/projects`
List projects.

### `POST /api/projects`
Create project.

### `GET /api/projects/:projectId`
Get one project.

### `PUT /api/projects/:projectId`
Update project.

### `GET /api/projects/:projectId/storage/health`
Run healthcheck against that project's storage backend.

## Files

### `GET /api/projects/:projectId/files?path=`
List files/directories.

### `GET /api/projects/:projectId/files/meta?path=`
Read file metadata directly from provider.

### `GET /api/projects/:projectId/files/content?path=`
Stream/download file.

### `POST /api/projects/:projectId/files/upload`
Upload file.

### `DELETE /api/projects/:projectId/files?path=`
Delete file or directory.

### `POST /api/projects/:projectId/files/mkdir`
Create directory.

### `POST /api/projects/:projectId/files/move`
Move file.

### `POST /api/projects/:projectId/files/copy`
Copy file.

---

## Project examples

## Create local project

```bash
curl -X POST http://127.0.0.1:3000/api/projects \
  -H 'Content-Type: application/json' \
  -H 'x-api-token: change-me' \
  -d '{
    "code": "my-local",
    "name": "My Local Project",
    "driver": "local",
    "storageConfig": {
      "rootDir": "/absolute/path/to/storage-root"
    }
  }'
```

## Create MinIO project

```bash
curl -X POST http://127.0.0.1:3000/api/projects \
  -H 'Content-Type: application/json' \
  -H 'x-api-token: change-me' \
  -d '{
    "code": "my-minio",
    "name": "My MinIO Project",
    "driver": "minio",
    "storageConfig": {
      "bucket": "my-bucket",
      "region": "us-east-1",
      "accessKeyId": "your-access-key",
      "secretAccessKey": "your-secret-key",
      "endpoint": "http://127.0.0.1:9000",
      "forcePathStyle": true,
      "prefix": "uploads"
    }
  }'
```

## Create FTP project

```bash
curl -X POST http://127.0.0.1:3000/api/projects \
  -H 'Content-Type: application/json' \
  -H 'x-api-token: change-me' \
  -d '{
    "code": "my-ftp",
    "name": "My FTP Project",
    "driver": "ftp",
    "storageConfig": {
      "host": "127.0.0.1",
      "port": 21,
      "user": "user",
      "password": "password",
      "secure": false,
      "baseDir": "/uploads/project-a"
    }
  }'
```

---

## File operation examples

## Upload file

```bash
curl -X POST http://127.0.0.1:3000/api/projects/<projectId>/files/upload \
  -H 'x-api-token: change-me' \
  -F path=docs/hello.txt \
  -F file=@README.md
```

## List files

```bash
curl 'http://127.0.0.1:3000/api/projects/<projectId>/files?path=docs' \
  -H 'x-api-token: change-me'
```

## Read metadata

```bash
curl 'http://127.0.0.1:3000/api/projects/<projectId>/files/meta?path=docs/hello.txt' \
  -H 'x-api-token: change-me'
```

## Stream file

```bash
curl 'http://127.0.0.1:3000/api/projects/<projectId>/files/content?path=docs/hello.txt' \
  -H 'x-api-token: change-me'
```

## Create directory

```bash
curl -X POST http://127.0.0.1:3000/api/projects/<projectId>/files/mkdir \
  -H 'Content-Type: application/json' \
  -H 'x-api-token: change-me' \
  -d '{"path":"docs/archive"}'
```

## Move file

```bash
curl -X POST http://127.0.0.1:3000/api/projects/<projectId>/files/move \
  -H 'Content-Type: application/json' \
  -H 'x-api-token: change-me' \
  -d '{
    "from":"docs/hello.txt",
    "to":"docs/archive/hello.txt"
  }'
```

## Copy file

```bash
curl -X POST http://127.0.0.1:3000/api/projects/<projectId>/files/copy \
  -H 'Content-Type: application/json' \
  -H 'x-api-token: change-me' \
  -d '{
    "from":"docs/archive/hello.txt",
    "to":"docs/hello-copy.txt"
  }'
```

## Delete file

```bash
curl -X DELETE 'http://127.0.0.1:3000/api/projects/<projectId>/files?path=docs/hello-copy.txt' \
  -H 'x-api-token: change-me'
```

---

## Storage config schemas

## local

```json
{
  "rootDir": "/absolute/path/to/storage-root",
  "publicBaseUrl": "https://files.example.com"
}
```

## s3

```json
{
  "bucket": "my-bucket",
  "region": "ap-southeast-1",
  "accessKeyId": "...",
  "secretAccessKey": "...",
  "prefix": "uploads",
  "publicBaseUrl": "https://cdn.example.com"
}
```

## minio

```json
{
  "bucket": "my-bucket",
  "region": "us-east-1",
  "accessKeyId": "...",
  "secretAccessKey": "...",
  "endpoint": "http://127.0.0.1:9000",
  "forcePathStyle": true,
  "prefix": "uploads"
}
```

## ftp

```json
{
  "host": "127.0.0.1",
  "port": 21,
  "user": "user",
  "password": "password",
  "secure": false,
  "baseDir": "/uploads/project-a"
}
```

---

## End-to-end tests

A full CRUD script is included:

```bash
PORT=3100 API_TOKEN=change-me bash scripts/e2e-full-crud.sh
```

What it tests:
- local project CRUD
- MinIO project CRUD
- FTP project CRUD
- mkdir
- upload
- stat
- content streaming
- move
- copy
- delete

---

## Notes

- FTP `move` uses a safer fallback flow for compatibility:
  - download temp
  - upload to new path
  - delete old file
- MinIO is handled via the S3-compatible driver
- Project API responses now mask common secret fields like `password`, `accessKeyId`, `secretAccessKey`, `token`
- Internal runtime still uses the real values from SQLite for driver execution

---

## Roadmap ideas

- Swagger / OpenAPI
- mask secrets in project responses
- presigned URL for S3/MinIO
- better auth / RBAC
- Docker compose dev stack
- pagination for file listing

---

## License

MIT
