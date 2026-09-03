import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { OperationLog } from '@stuff-manager/shared';

const DB_DIR = path.join(os.homedir(), '.package-gui');
const DB_PATH = path.join(DB_DIR, 'data.db');

export class DatabaseService {
  private db: DatabaseSync;

  constructor() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    this.db = new DatabaseSync(DB_PATH);
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS operation_history (
        id TEXT PRIMARY KEY,
        manager TEXT NOT NULL,
        action TEXT NOT NULL,
        packageName TEXT NOT NULL,
        command TEXT NOT NULL,
        status TEXT NOT NULL,
        requiresPrivilege INTEGER NOT NULL DEFAULT 0,
        exitCode INTEGER,
        startTime TEXT NOT NULL,
        endTime TEXT,
        output TEXT NOT NULL DEFAULT '',
        error TEXT
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  public saveOperation(op: OperationLog): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO operation_history (
        id, manager, action, packageName, command, status, requiresPrivilege, exitCode, startTime, endTime, output, error
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    stmt.run(
      op.id,
      op.manager,
      op.action,
      op.packageName,
      op.command,
      op.status,
      op.requiresPrivilege ? 1 : 0,
      op.exitCode ?? null,
      op.startTime,
      op.endTime ?? null,
      op.output,
      op.error ?? null
    );
  }

  public getOperation(id: string): OperationLog | null {
    const stmt = this.db.prepare(`SELECT * FROM operation_history WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;
    return {
      ...row,
      requiresPrivilege: Boolean(row.requiresPrivilege),
    };
  }

  public getHistory(limit = 50): OperationLog[] {
    const stmt = this.db.prepare(`SELECT * FROM operation_history ORDER BY startTime DESC LIMIT ?`);
    const rows = stmt.all(limit) as any[];
    return rows.map((row) => ({
      ...row,
      requiresPrivilege: Boolean(row.requiresPrivilege),
    }));
  }

  public getSetting(key: string, defaultValue = ''): string {
    const stmt = this.db.prepare(`SELECT value FROM settings WHERE key = ?`);
    const row = stmt.get(key) as any;
    return row ? row.value : defaultValue;
  }

  public setSetting(key: string, value: string): void {
    const stmt = this.db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`);
    stmt.run(key, value);
  }
}

export const dbService = new DatabaseService();
