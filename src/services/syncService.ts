import { apiFetch } from '../api/client';
import { loadLocal, saveLocal } from './persistence';

const PENDING_OUTBOX_KEY = 'pendingSync';

type Outbox = Record<string, unknown>;

/**
 * Single source of truth for the localStorage <-> SQLite sync.
 *
 * - While the app is bootstrapping, local snapshots are written but nothing is
 *   pushed to the server (the SQLite data is authoritative if reachable).
 * - After bootstrap, every state change is both persisted locally and enqueued
 *   for a debounced push to the backend.
 * - Any push that fails (offline, backend restarting) is moved into a persisted
 *   outbox and retried on the next flush or on the next app start — this
 *   eliminates the silent divergence between localStorage and SQLite.
 */
class SyncService {
  private enabled = false;
  private queue = new Map<string, unknown>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** Unlocks server writes after bootstrap completes and flushes anything queued. */
  setEnabled(on: boolean): void {
    this.enabled = on;
    if (on) void this.flush();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** Register a full collection snapshot to be pushed shortly. */
  enqueue(key: string, value: unknown): void {
    this.queue.set(key, value);
    if (this.timer !== null) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, 400);
  }

  /** Bypass the debounce (used before reload / during full wipe). */
  flushNow(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    void this.flush();
  }

  private async flush(): Promise<void> {
    if (!this.enabled) return;
    const entries = Array.from(this.queue.entries());
    this.queue.clear();
    if (entries.length === 0) return;
    await Promise.all(entries.map(([key, value]) => this.send(key, value)));
  }

  private async send(key: string, value: unknown): Promise<void> {
    try {
      await apiFetch(`/collection/${key}`, { method: 'PUT', body: JSON.stringify(value) });
      this.removeFromOutbox(key);
    } catch {
      this.addToOutbox(key, value);
    }
  }

  private addToOutbox(key: string, value: unknown): void {
    const outbox = loadLocal<Outbox>(PENDING_OUTBOX_KEY, {});
    outbox[key] = value;
    saveLocal(PENDING_OUTBOX_KEY, outbox);
  }

  private removeFromOutbox(key: string): void {
    const outbox = loadLocal<Outbox>(PENDING_OUTBOX_KEY, {});
    if (key in outbox) {
      delete outbox[key];
      saveLocal(PENDING_OUTBOX_KEY, outbox);
    }
  }

  /** Push any unsynced local changes before pulling authoritative data. */
  async flushPendingOutbox(): Promise<void> {
    const outbox = loadLocal<Outbox>(PENDING_OUTBOX_KEY, {});
    const keys = Object.keys(outbox);
    if (keys.length === 0) return;
    await Promise.all(keys.map((key) => this.send(key, outbox[key])));
  }

  /** Fetch the latest server state for every collection key. */
  async pullAll<T>(keys: readonly string[]): Promise<Map<string, T>> {
    const loaded = new Map<string, T>();
    await Promise.all(
      keys.map(async (key) => {
        try {
          const data = await apiFetch(`/collection/${key}`);
          loaded.set(key, data as T);
        } catch {
          // Backend unreachable — the caller falls back to the local snapshot.
        }
      })
    );
    return loaded;
  }
}

export const syncService = new SyncService();