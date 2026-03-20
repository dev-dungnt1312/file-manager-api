#!/usr/bin/env bash
set -euo pipefail
export PATH="/root/.bun/bin:$PATH"
cd /root/.openclaw/workspace/file-manager-api

TOKEN="${API_TOKEN:-change-me}"
PORT="${PORT:-3000}"
BASE="http://127.0.0.1:${PORT}/api"
MINIO_CODE="demo-minio"
FTP_CODE="demo-ftp"
LOCAL_CODE="demo-local"
TEST_PREFIX="e2e-$(date +%s)"
SERVER_STARTED=0
SERVER_PID=""

cleanup() {
  if [[ "$SERVER_STARTED" == "1" && -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if ! curl -sf "$BASE/health" -H "x-api-token: $TOKEN" >/dev/null 2>&1; then
  bun run src/server.ts > /tmp/file-manager-e2e.log 2>&1 &
  SERVER_PID=$!
  SERVER_STARTED=1
  sleep 2
fi

project_id_by_code() {
  local code="$1"
  local body
  body=$(curl -s "$BASE/projects" -H "x-api-token: $TOKEN")
  python3 -c 'import json,sys; code=sys.argv[1]; obj=json.loads(sys.stdin.read()); print(next((p["id"] for p in obj.get("data", []) if p.get("code")==code), ""))' "$code" <<<"$body"
}

assert_success() {
  local body="$1"
  python3 - <<'PY' "$body"
import json,sys
obj=json.loads(sys.argv[1])
assert obj.get('success') is True, obj
PY
}

create_file() {
  local file_path="$1"
  printf 'hello %s\n' "$file_path" > "$file_path"
}

upload_file() {
  local project_id="$1"
  local remote_path="$2"
  local local_file="$3"
  curl -s -X POST "$BASE/projects/$project_id/files/upload" \
    -H "x-api-token: $TOKEN" \
    -F "path=$remote_path" \
    -F "file=@$local_file"
}

mkdir_remote() {
  local project_id="$1"
  local remote_path="$2"
  curl -s -X POST "$BASE/projects/$project_id/files/mkdir" \
    -H "x-api-token: $TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"path\":\"$remote_path\"}"
}

move_remote() {
  local project_id="$1" from="$2" to="$3"
  curl -s -X POST "$BASE/projects/$project_id/files/move" \
    -H "x-api-token: $TOKEN" -H 'Content-Type: application/json' \
    -d "{\"from\":\"$from\",\"to\":\"$to\"}"
}

copy_remote() {
  local project_id="$1" from="$2" to="$3"
  curl -s -X POST "$BASE/projects/$project_id/files/copy" \
    -H "x-api-token: $TOKEN" -H 'Content-Type: application/json' \
    -d "{\"from\":\"$from\",\"to\":\"$to\"}"
}

delete_remote() {
  local project_id="$1" remote_path="$2"
  curl -s -X DELETE "$BASE/projects/$project_id/files?path=$remote_path" \
    -H "x-api-token: $TOKEN"
}

stat_remote() {
  local project_id="$1" remote_path="$2"
  curl -s "$BASE/projects/$project_id/files/meta?path=$remote_path" \
    -H "x-api-token: $TOKEN"
}

list_remote() {
  local project_id="$1" remote_path="$2"
  curl -s "$BASE/projects/$project_id/files?path=$remote_path" \
    -H "x-api-token: $TOKEN"
}

fetch_content() {
  local project_id="$1" remote_path="$2"
  curl -s "$BASE/projects/$project_id/files/content?path=$remote_path" \
    -H "x-api-token: $TOKEN"
}

run_suite() {
  local code="$1"
  local project_id="$2"
  local base="$TEST_PREFIX/$code"
  local original="$base/hello.txt"
  local moved="$base/moved/hello.txt"
  local copied="$base/copied/hello-copy.txt"
  local local_file="/tmp/${code}-hello.txt"

  echo "=== RUN $code ($project_id) ==="
  assert_success "$(mkdir_remote "$project_id" "$base")"
  create_file "$local_file"
  assert_success "$(upload_file "$project_id" "$original" "$local_file")"
  assert_success "$(stat_remote "$project_id" "$original")"
  local content
  content="$(fetch_content "$project_id" "$original")"
  [[ "$content" == *"hello $local_file"* ]]
  assert_success "$(move_remote "$project_id" "$original" "$moved")"
  assert_success "$(copy_remote "$project_id" "$moved" "$copied")"
  assert_success "$(stat_remote "$project_id" "$moved")"
  assert_success "$(stat_remote "$project_id" "$copied")"
  local list_body
  list_body="$(list_remote "$project_id" "$base")"
  assert_success "$list_body"
  python3 - <<'PY' "$list_body"
import json,sys
obj=json.loads(sys.argv[1])
items=obj['data']
assert len(items) >= 2, items
PY
  assert_success "$(delete_remote "$project_id" "$copied")"
  assert_success "$(delete_remote "$project_id" "$moved")"
  assert_success "$(delete_remote "$project_id" "$base")"
  echo "PASS $code"
}

LOCAL_ID="$(project_id_by_code "$LOCAL_CODE")"
MINIO_ID="$(project_id_by_code "$MINIO_CODE")"
FTP_ID="$(project_id_by_code "$FTP_CODE")"
[[ -n "$LOCAL_ID" && -n "$MINIO_ID" && -n "$FTP_ID" ]]

run_suite "$LOCAL_CODE" "$LOCAL_ID"
run_suite "$MINIO_CODE" "$MINIO_ID"
run_suite "$FTP_CODE" "$FTP_ID"

echo "ALL_PASS"
