import { db } from './connection';

/**
 * Initializes the database schema.
 *
 * The system stores every business domain (products, sales, shifts, …) as a
 * JSON document in the generic `collections` table. This keeps the data model
 * flexible for a single-owner retail store while isolating all SQL behind the
 * repository layer.
 *
 * The legacy `users` table is dropped: authentication was removed in favor of
 * a single owner who has full access to every operation.
 */
export function initSchema(): void {
  db.exec(`
    DROP TABLE IF EXISTS users;

    CREATE TABLE IF NOT EXISTS collections (
      name TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Lightweight migration for databases created before the `updatedAt`
  // column existed. SQLite only accepts constant defaults in ADD COLUMN.
  const columns = db.prepare('PRAGMA table_info(collections)').all() as { name: string }[];
  if (!columns.some((c) => c.name === 'updatedAt')) {
    db.exec(
      `ALTER TABLE collections ADD COLUMN updatedAt TEXT NOT NULL DEFAULT '';`
    );
  }
}