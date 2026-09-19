import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve('alban-dairy.db');
const db = new Database(dbPath);

console.log('Connecting to database:', dbPath);

// Fetch existing users
const usersRow = db.prepare("SELECT data FROM collections WHERE name = 'users'").get() as { data: string } | undefined;
let adminUsers: any[] = [];

if (usersRow) {
  try {
    const allUsers = JSON.parse(usersRow.data);
    if (Array.isArray(allUsers)) {
      adminUsers = allUsers.filter((u: any) => u.role === 'admin' || u.username === 'admin');
    }
  } catch (e) {
    console.warn('Could not parse users data:', e);
  }
}

// If no admin user found in database, create the default admin account
if (adminUsers.length === 0) {
  adminUsers = [
    {
      id: 'user-admin',
      username: 'admin',
      fullName: 'مدير النظام',
      role: 'admin',
      passwordHash: '460b5786558ebdc9f80e14173c4ea330af74dbf0d9d17650b1536d4c56a3b9dd',
      salt: 'f7d2bb060d3dd645b1e34320b6ea6791',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];
}

// Preserve existing scanner & loyalty settings if available
const loyaltyRow = db.prepare("SELECT data FROM collections WHERE name = 'loyaltySettings'").get() as { data: string } | undefined;
const scannerRow = db.prepare("SELECT data FROM collections WHERE name = 'scannerSettings'").get() as { data: string } | undefined;

const loyaltySettings = loyaltyRow ? JSON.parse(loyaltyRow.data) : {
  pointsPerPound: 1,
  redemptionRate: 0.05,
  minPointsToRedeem: 100,
  isEnabled: true,
};

const scannerSettings = scannerRow ? JSON.parse(scannerRow.data) : {
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
};

const cleanState: Record<string, unknown> = {
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
  users: adminUsers,
  paymentLogs: [],
  damageGoods: [],
  cashAdvances: [],
  scannerSettings,
};

const deleteAll = db.prepare('DELETE FROM collections');
const insert = db.prepare('INSERT INTO collections (name, data, updatedAt) VALUES (?, ?, ?)');

const now = new Date().toISOString();

const tx = db.transaction(() => {
  deleteAll.run();
  for (const [name, value] of Object.entries(cleanState)) {
    insert.run(name, JSON.stringify(value), now);
  }
});

tx();

console.log('Database successfully cleared!');
console.log('Admin account(s) retained:');
console.dir(adminUsers, { depth: null });
