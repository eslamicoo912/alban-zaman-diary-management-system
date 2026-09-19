import { db } from '../db/connection';
import {
  deleteAllCollections,
  getCollection,
  setCollection,
} from '../db/repositories/collectionRepository';

/**
 * Full system wipe. Removes every collection and restores a clean empty state,
 * preserving the operator's user accounts, loyalty and scanner preferences
 * across the reset so the system stays accessible.
 */
export function resetSystem(): { ok: true; wiped: string[] } {
  const loyaltySettings = getCollection('loyaltySettings') ?? null;
  const scannerSettings = getCollection('scannerSettings') ?? null;
  const rawUsers = getCollection('users');
  let users: any[] | null = null;
  if (Array.isArray(rawUsers)) {
    users = rawUsers.filter((u: any) => u?.role === 'admin' || u?.username === 'admin');
  }

  const empty: Record<string, unknown> = {
    branches: [],
    registers: [],
    categories: [],
    products: [],
    employees: [],
    activeBranchId: 'br-1',
    activeShift: null,
    shifts: [],
    sales: [],
    heldOrders: [],
    returns: [],
    movements: [],
    customers: [],
    loyaltySettings,
    loyaltyTx: [],
    vendors: [],
    purchases: [],
    vendorReturns: [],
    expenses: [],
    salaries: [],
    assets: [],
    loans: [],
    users,
    paymentLogs: [],
    damageGoods: [],
    cashAdvances: [],
    scannerSettings,
  };

  const tx = db.transaction(() => {
    deleteAllCollections();
    for (const [name, value] of Object.entries(empty)) {
      setCollection(name, value);
    }
  });
  tx();

  return { ok: true, wiped: Object.keys(empty) };
}