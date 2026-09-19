import { AccountRole, AppUser, AuthResult } from '../types';
import { AppStore } from './store';
import { uid } from './idGenerator';

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Deterministic fallback for non-secure contexts (e.g. LAN access over HTTP)
 * where `crypto.subtle` is unavailable. Not cryptographically strong, but the
 * credentials never leave the local store.
 */
function fallbackHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c + i, 2246822519) >>> 0;
  }
  return (
    h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')
  ).padStart(64, '0');
}

export function makeSalt(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return toHex(bytes.buffer);
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const input = `${salt}::${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input));
    return toHex(digest);
  }
  return fallbackHash(input);
}

export async function verifyPassword(user: AppUser, password: string): Promise<boolean> {
  const hash = await hashPassword(password, user.salt);
  return hash === user.passwordHash;
}

export interface CreateUserInput {
  username: string;
  fullName: string;
  password: string;
  role: AccountRole;
  employeeId?: string;
}

export async function createUser(store: AppStore, data: CreateUserInput): Promise<AuthResult> {
  const username = data.username.trim().toLowerCase();
  const fullName = data.fullName.trim();

  if (!username || !fullName) return { ok: false, error: 'missing_fields' };
  if (data.password.length < 4) return { ok: false, error: 'weak_password' };
  if (store.users.some((u) => u.username.toLowerCase() === username)) {
    return { ok: false, error: 'username_taken' };
  }

  const salt = makeSalt();
  const passwordHash = await hashPassword(data.password, salt);
  const user: AppUser = {
    id: uid('user'),
    username,
    fullName,
    role: data.role,
    passwordHash,
    salt,
    isActive: true,
    createdAt: new Date().toISOString(),
    employeeId: data.employeeId,
  };
  store.setUsers((prev) => [...prev, user]);
  return { ok: true, user };
}

export async function authenticate(
  users: AppUser[],
  username: string,
  password: string
): Promise<AuthResult> {
  const user = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user) return { ok: false, error: 'invalid_credentials' };
  if (!user.isActive) return { ok: false, error: 'account_disabled' };
  const valid = await verifyPassword(user, password);
  if (!valid) return { ok: false, error: 'invalid_credentials' };
  return { ok: true, user };
}

export async function changePassword(
  store: AppStore,
  userId: string,
  newPassword: string
): Promise<AuthResult> {
  if (newPassword.length < 4) return { ok: false, error: 'weak_password' };
  const salt = makeSalt();
  const passwordHash = await hashPassword(newPassword, salt);
  store.setUsers((prev) =>
    prev.map((u) => (u.id === userId ? { ...u, salt, passwordHash } : u))
  );
  return { ok: true };
}

export function touchLogin(store: AppStore, userId: string): void {
  const now = new Date().toISOString();
  store.setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, lastLoginAt: now } : u)));
}
