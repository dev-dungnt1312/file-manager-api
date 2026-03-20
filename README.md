# File Manager API

Multi-project file manager API using Express + TypeScript, designed to run on Bun later but currently scaffolded in a runtime-agnostic way because Bun is not installed on this host.

## What it does

- Project-based storage config in SQLite
- Drivers per project: `local`, `s3`, `minio`, `ftp`
- No file metadata table; file listing/stat reads directly from provider
- APIs for upload, list, stat, stream, delete, mkdir, move, copy

## Quick start

```bash
cp .env.example .env
npm install
npm run db:seed
npm run start
```

Or with Bun on another machine later:

```bash
bun install
bun run db:seed
bun run start
```

## Auth

Pass one of:

- `x-api-token: change-me`
- `Authorization: Bearer change-me`

## API

### Create project

```bash
curl -X POST http://127.0.0.1:3000/api/projects \
  -H 'Content-Type: application/json' \
  -H 'x-api-token: change-me' \
  -d '{
    "code":"my-local",
    "name":"My Local",
    "driver":"local",
    "storageConfig": {"rootDir":"/root/.openclaw/workspace/file-manager-api/storage/my-local"}
  }'
```

### Upload file

```bash
curl -X POST http://127.0.0.1:3000/api/projects/<projectId>/files/upload \
  -H 'x-api-token: change-me' \
  -F path=docs/hello.txt \
  -F file=@README.md
```

### List files

```bash
curl 'http://127.0.0.1:3000/api/projects/<projectId>/files?path=docs' \
  -H 'x-api-token: change-me'
```

## Storage config examples

### local
```json
{
  "rootDir": "/absolute/path/to/storage-root"
}
```

### s3
```json
{
  "bucket": "my-bucket",
  "region": "ap-southeast-1",
  "accessKeyId": "...",
  "secretAccessKey": "...",
  "prefix": "uploads"
}
```

### minio
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

### ftp
```json
{
  "host": "127.0.0.1",
  "port": 21,
  "user": "user",
  "password": "pass",
  "secure": false,
  "baseDir": "/uploads/project-a"
}
```
