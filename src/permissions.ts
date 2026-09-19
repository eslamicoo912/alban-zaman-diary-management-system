import type { AccountRole } from './types';

// Tabs a normal (non-admin) cashier user may access.
// Everything else (finance, employees/shifts, salaries, users/settings,
// branches, reports, orders/returns, loyalty, alerts) is admin-only.
export const CASHIER_ALLOWED_TABS = new Set<string>([
  'pos',
  'dashboard',
  'products',
  'inventory',
  'purchases',
]);

export const ALL_TABS: string[] = [
  'pos',
  'dashboard',
  'alerts',
  'products',
  'inventory',
  'returns',
  'loyalty',
  'purchases',
  'employees',
  'orders',
  'finance',
  'branches',
  'reports',
  'settings',
  'users',
];

export function canAccessTab(tab: string, role: AccountRole | null | undefined): boolean {
  if (role === 'admin') return ALL_TABS.includes(tab);
  return CASHIER_ALLOWED_TABS.has(tab);
}