import {
  deleteAllCollections,
  getCollection,
  removeItemFromCollection,
  setCollection,
  upsertItemInCollection,
} from '../db/repositories/collectionRepository';
import { badRequest, notFound } from '../utils/httpError';

const COLLECTION_NAME_RE = /^[A-Za-z0-9_-]{1,64}$/;

function requireValidName(name: string): void {
  if (!COLLECTION_NAME_RE.test(name)) {
    throw badRequest(`Invalid collection name: "${name}"`);
  }
}

export function getCollectionData(name: string): unknown {
  requireValidName(name);
  return getCollection(name);
}

export function replaceCollection(name: string, value: unknown): void {
  requireValidName(name);
  setCollection(name, value);
}

export function upsertCollectionItem(name: string, item: unknown): { ok: boolean; upserted: boolean } {
  requireValidName(name);
  if (!item || typeof item !== 'object') {
    throw badRequest('Collection item must be a JSON object');
  }
  const id = (item as { id?: unknown }).id;
  if (typeof id !== 'string' || id.length === 0) {
    throw badRequest('Collection item must have a non-empty string "id"');
  }
  const upserted = upsertItemInCollection(name, item);
  return { ok: true, upserted };
}

export function deleteCollectionItem(name: string, id: string): { ok: true; removed: boolean } {
  requireValidName(name);
  const removed = removeItemFromCollection(name, id);
  return { ok: true, removed };
}

export function collectionWithId(name: string, id: string): unknown {
  requireValidName(name);
  const data = getCollection<unknown[]>(name);
  if (!Array.isArray(data)) {
    throw notFound(`Collection "${name}" is not a list`);
  }
  const item = data.find((x) => x && typeof x === 'object' && (x as { id?: unknown }).id === id);
  if (!item) {
    throw notFound(`No item with id "${id}" in collection "${name}"`);
  }
  return item;
}

export function wipeCollections(): void {
  deleteAllCollections();
}