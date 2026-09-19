const STORAGE_PREFIX = 'dairy_pos_';

/**
 * localStorage snapshot helpers. Local copies act as an offline fallback and
 * as a low-latency cache until the SQLite backend confirms each write.
 */
export function loadLocal<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!item || item === 'null') return fallback;
    const parsed = JSON.parse(item);
    return parsed === null ? fallback : parsed;
  } catch (e) {
    console.error(`Error loading ${key} from storage:`, e);
    return fallback;
  }
}

export function saveLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
  }
}

export function clearLocalStorage(): void {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(STORAGE_PREFIX))
    .forEach((k) => localStorage.removeItem(k));
}