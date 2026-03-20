import { randomUUID } from 'node:crypto';
import { db } from '../db/database.js';
import type { ProjectRecord, StorageDriverName, StorageConfig } from '../types/storage.js';

const insertStmt = db.prepare(`
INSERT INTO projects (id, code, name, driver, storage_config_json, is_active, created_at, updated_at)
VALUES (@id, @code, @name, @driver, @storage_config_json, @is_active, @created_at, @updated_at)
`);

const selectAllStmt = db.prepare(`SELECT * FROM projects ORDER BY created_at DESC`);
const selectOneStmt = db.prepare(`SELECT * FROM projects WHERE id = ?`);
const updateStmt = db.prepare(`
UPDATE projects
SET code=@code, name=@name, driver=@driver, storage_config_json=@storage_config_json, is_active=@is_active, updated_at=@updated_at
WHERE id=@id
`);

function mapRow(row: any): ProjectRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    driver: row.driver,
    storageConfig: JSON.parse(row.storage_config_json),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const projectService = {
  list(): ProjectRecord[] {
    return selectAllStmt.all().map(mapRow);
  },

  getById(id: string): ProjectRecord {
    const row = selectOneStmt.get(id);
    if (!row) throw new Error('Project not found');
    return mapRow(row);
  },

  create(input: { code: string; name: string; driver: StorageDriverName; storageConfig: StorageConfig; isActive?: boolean }): ProjectRecord {
    const now = new Date().toISOString();
    const payload = {
      id: randomUUID(),
      code: input.code,
      name: input.name,
      driver: input.driver,
      storage_config_json: JSON.stringify(input.storageConfig),
      is_active: input.isActive === false ? 0 : 1,
      created_at: now,
      updated_at: now,
    };
    insertStmt.run(payload);
    return this.getById(payload.id);
  },

  update(id: string, input: { code: string; name: string; driver: StorageDriverName; storageConfig: StorageConfig; isActive: boolean }): ProjectRecord {
    this.getById(id);
    updateStmt.run({
      id,
      code: input.code,
      name: input.name,
      driver: input.driver,
      storage_config_json: JSON.stringify(input.storageConfig),
      is_active: input.isActive ? 1 : 0,
      updated_at: new Date().toISOString(),
    });
    return this.getById(id);
  },
};
