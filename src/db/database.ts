import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { env } from '../config/env.js';

fs.mkdirSync(path.dirname(env.databasePath), { recursive: true });

type StatementLike = {
  all: (...params: any[]) => any[];
  get: (...params: any[]) => any;
  run: (...params: any[]) => any;
};

type DatabaseLike = {
  exec: (sql: string) => void;
  pragma?: (sql: string) => void;
  prepare: (sql: string) => StatementLike;
};

const require = createRequire(import.meta.url);

function createDb(): DatabaseLike {
  if ((globalThis as any).Bun) {
    const bunSqlite = require('bun:sqlite') as any;
    const sqlite = new bunSqlite.Database(env.databasePath);
    return {
      exec(sql: string) {
        sqlite.exec(sql);
      },
      prepare(sql: string): StatementLike {
        const stmt = sqlite.query(sql);
        return {
          all: (...params: any[]) => stmt.all(...params),
          get: (...params: any[]) => stmt.get(...params),
          run: (...params: any[]) => stmt.run(...params),
        };
      },
    };
  }

  const BetterSqlite3 = require('better-sqlite3') as any;
  const SqliteCtor = BetterSqlite3.default ?? BetterSqlite3;
  const sqlite = new SqliteCtor(env.databasePath);
  sqlite.pragma('journal_mode = WAL');
  return sqlite as DatabaseLike;
}

export const db = createDb();

db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  driver TEXT NOT NULL CHECK (driver IN ('local','s3','minio','ftp')),
  storage_config_json TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`);
