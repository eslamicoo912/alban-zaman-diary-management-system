import type { Statement } from 'better-sqlite3';
import { db } from '../connection';

/**
 * Repository for the generic `collections` table.
 *
 * All SQL lives here. Service and controller layers must never write raw SQL.
 * Each collection stores the full JSON snapshot of one domain (products,
 * sales, shifts, …). Single-item upserts and deletes are optimized to avoid
 * shipping the entire collection over the wire for routine changes.
 *
 * Statements are prepared lazily so this module can be imported (and the
 * schema migrated) before the first query runs.
 */

let getStmt: Statement<[string]> | null = null;
let upsertStmt: Statement<[string, string]> | null = null;
let countStmt: Statement | null = null;
let deleteStmt: Statement | null = null;

function statements() {
  if (!getStmt) {
    getStmt = db.prepare('SELECT data FROM collections WHERE name = ?');
    upsertStmt = db.prepare(
      `INSERT INTO collections (name, data) VALUES (?, ?)
       ON CONFLICT(name) DO UPDATE SET data = excluded.data, updatedAt = datetime('now')`
    );
    countStmt = db.prepare('SELECT COUNT(*) AS c FROM collections');
    deleteStmt = db.prepare('DELETE FROM collections');
  }
  return { getStmt, upsertStmt, countStmt, deleteStmt };
}

export function getCollection<T = unknown>(name: string): T | null {
  const { getStmt } = statements();
  const row = getStmt.get(name) as { data: string } | undefined;
  return row ? (JSON.parse(row.data) as T) : null;
}

export function setCollection(name: string, value: unknown): void {
  const { upsertStmt } = statements();
  upsertStmt.run(name, JSON.stringify(value));
}

export function countCollections(): number {
  const { countStmt } = statements();
  const row = countStmt.get() as { c: number };
  return row.c;
}

export function deleteAllCollections(): void {
  const { deleteStmt } = statements();
  deleteStmt.run();
}

/**
 * Upserts a single item (identified by `item.id`) into a collection snapshot.
 * When the collection is not an array it is treated as an empty list.
 * Returns `true` when the item already existed (replaced) and `false` when it
 * was newly inserted at the front of the list.
 */
export function upsertItemInCollection(name: string, item: unknown): boolean {
  const current = getCollection<any[]>(name);
  const arr = Array.isArray(current) ? current : [];
  const itemId = (item as any)?.id;
  const idx = arr.findIndex((x) => x && x.id === itemId);
  const replaced = idx >= 0;
  if (replaced) {
    arr[idx] = item;
  } else {
    arr.unshift(item);
  }
  setCollection(name, arr);
  return replaced;
}

/**
 * Removes an item by id from a collection snapshot. Returns true when an item
 * was actually removed.
 */
export function removeItemFromCollection(name: string, id: string): boolean {
  const current = getCollection<any[]>(name);
  const arr = Array.isArray(current) ? current : [];
  const next = arr.filter((x) => x && x.id !== id);
  const removed = next.length !== arr.length;
  if (removed) {
    setCollection(name, next);
  }
  return removed;
}