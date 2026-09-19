import fs from 'fs';
import path from 'path';
import { db } from '../db/connection';
import { env } from '../config/env';
import { internalError } from '../utils/httpError';

/**
 * Creates a physical backup of the active database file into the backup
 * directory using SQLite's online backup API. Returns the latest backup files.
 */
export function createBackup(): { file: string; location: string; keeps: number; files: string[] } {
  try {
    if (!fs.existsSync(env.backupDir)) {
      fs.mkdirSync(env.backupDir, { recursive: true });
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = `alban-dairy_${stamp}.db`;
    db.backup(path.join(env.backupDir, file));

    const files = fs
      .readdirSync(env.backupDir)
      .filter((f) => f.endsWith('.db'))
      .sort()
      .reverse();

    return { file, location: env.backupDir, keeps: files.length, files };
  } catch (err) {
    throw internalError(`Backup failed: ${(err as Error).message}`);
  }
}