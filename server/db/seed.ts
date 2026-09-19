import { db } from './connection';
import {
  countCollections,
  setCollection,
} from './repositories/collectionRepository';

/**
 * Seeds an empty database with the realistic demo dataset shipped with the
 * frontend (`src/data/mockData.ts`). Only runs when no collection rows exist,
 * so an explicit full wipe (which re-writes empty state for every collection)
 * never re-seeds demo data.
 */
export async function seedIfEmpty(): Promise<void> {
  if (countCollections() > 0) {
    console.log('[seed] Database already has data — skipping seed.');
    return;
  }

  let mock: any = {};
  try {
    mock = await import('../../src/data/mockData.ts');
  } catch (e) {
    console.warn('[seed] Could not import mock data for seeding:', e);
    return;
  }

  const defaults: Record<string, unknown> = {
    branches: mock.INITIAL_BRANCHES,
    registers: mock.INITIAL_REGISTERS,
    employees: mock.INITIAL_EMPLOYEES,
    activeBranchId: 'br-1',
    activeShift: mock.INITIAL_ACTIVE_SHIFT,
    shifts: [mock.INITIAL_ACTIVE_SHIFT],
    sales: mock.INITIAL_SALES,
    heldOrders: [],
    returns: [],
    movements: mock.INITIAL_MOVEMENTS,
    customers: mock.INITIAL_CUSTOMERS,
    loyaltySettings: mock.INITIAL_LOYALTY_SETTINGS,
    loyaltyTx: [],
    vendors: mock.INITIAL_VENDORS,
    purchases: mock.INITIAL_PURCHASES,
    vendorReturns: [],
    expenses: mock.INITIAL_EXPENSES,
    salaries: mock.INITIAL_SALARIES,
    assets: mock.INITIAL_ASSETS,
    loans: mock.INITIAL_LOANS,
    users: [],
    paymentLogs: [],
    scannerSettings: {
      customPrefixes: ['628', '20', '99', 'DRY-'],
      defaultPrefix: '628',
      stripPrefixOnMatch: true,
      autoPrependDefaultPrefix: true,
      parseWeightedBarcodes: true,
      weightedBarcodePrefix: '20',
      sensitivityPreset: 'fast',
      sensitivityMs: 45,
      minBarcodeLength: 4,
      instantMatchAutoAdd: true,
      enableGlobalKeystrokeListener: true,
      audioFeedback: true,
    },
    products: mock.INITIAL_PRODUCTS,
  };

  const insert = db.prepare('INSERT INTO collections (name, data) VALUES (?, ?)');
  const tx = db.transaction(() => {
    for (const [name, value] of Object.entries(defaults)) {
      insert.run(name, JSON.stringify(value));
    }
  });
  tx();
  console.log('[seed] Seeded database with demo dataset.');
}

export { setCollection };