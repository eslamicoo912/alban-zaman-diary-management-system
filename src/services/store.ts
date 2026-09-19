import type React from 'react';
import type {
  AppUser,
  Asset,
  Branch,
  CashAdvance,
  Customer,
  DamagedGoodsEntry,
  Employee,
  Expense,
  HeldOrder,
  InventoryMovement,
  Loan,
  LoyaltySettings,
  LoyaltyTransaction,
  PaymentLogEntry,
  Product,
  PurchaseOrder,
  Register,
  ReturnRecord,
  Salary,
  Sale,
  ScannerSettings,
  Shift,
  Vendor,
  VendorReturn,
} from '../types';

/**
 * The execution context handed to business services. It bundles the live
 * React state plus its setters so domain logic can live outside the provider
 * while still coordinating multi-collection updates atomically.
 */
export interface AppStore {
  // Selected context
  activeBranchId: string;
  activeRegisterId: string;
  currentEmployee: Employee;
  setCurrentEmployeeId: (id: string) => void;

  // Collections
  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  registers: Register[];
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;

  activeShift: Shift | null;
  setActiveShift: React.Dispatch<React.SetStateAction<Shift | null>>;
  shifts: Shift[];
  setShifts: React.Dispatch<React.SetStateAction<Shift[]>>;

  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  heldOrders: HeldOrder[];
  setHeldOrders: React.Dispatch<React.SetStateAction<HeldOrder[]>>;
  returns: ReturnRecord[];
  setReturns: React.Dispatch<React.SetStateAction<ReturnRecord[]>>;
  inventoryMovements: InventoryMovement[];
  setInventoryMovements: React.Dispatch<React.SetStateAction<InventoryMovement[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  loyaltySettings: LoyaltySettings;
  setLoyaltySettings: React.Dispatch<React.SetStateAction<LoyaltySettings>>;
  loyaltyTransactions: LoyaltyTransaction[];
  setLoyaltyTransactions: React.Dispatch<React.SetStateAction<LoyaltyTransaction[]>>;
  vendors: Vendor[];
  setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>;
  purchases: PurchaseOrder[];
  setPurchases: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  vendorReturns: VendorReturn[];
  setVendorReturns: React.Dispatch<React.SetStateAction<VendorReturn[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  salaries: Salary[];
  setSalaries: React.Dispatch<React.SetStateAction<Salary[]>>;
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  loans: Loan[];
  setLoans: React.Dispatch<React.SetStateAction<Loan[]>>;

  users: AppUser[];
  setUsers: React.Dispatch<React.SetStateAction<AppUser[]>>;

  paymentLogs: PaymentLogEntry[];
  setPaymentLogs: React.Dispatch<React.SetStateAction<PaymentLogEntry[]>>;

  damagedGoods: DamagedGoodsEntry[];
  setDamagedGoods: React.Dispatch<React.SetStateAction<DamagedGoodsEntry[]>>;

  cashAdvances: CashAdvance[];
  setCashAdvances: React.Dispatch<React.SetStateAction<CashAdvance[]>>;

  // Settings
  scannerSettings: ScannerSettings;
}