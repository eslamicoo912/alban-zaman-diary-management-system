import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');

export const env = {
  port: Number(process.env.PORT) || 4000,
  dbPath: process.env.DB_PATH || path.join(ROOT_DIR, 'alban-dairy.db'),
  backupDir: process.env.BACKUP_DIR || path.join(ROOT_DIR, 'backup'),
  distPath: path.join(ROOT_DIR, 'dist'),
  jsonBodyLimit: '10mb',
};