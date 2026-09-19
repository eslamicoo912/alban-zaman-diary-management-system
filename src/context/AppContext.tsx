import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Product,
  Branch,
  Register,
  Employee,
  Shift,
  Customer,
  LoyaltySettings,
  LoyaltyTransaction,
  Vendor,
  PurchaseOrder,
  VendorReturn,
  Expense,
  Salary,
  Asset,
  Loan,
  Sale,
  ReturnRecord,
  InventoryMovement,
  HeldOrder,
  SaleItem,
  ScannerSettings,
  AppUser,
  AccountRole,
  AuthResult,
  PaymentLogEntry,
  DamagedGoodsEntry,
  CashAdvance,
} from '../types';
import {
  INITIAL_BRANCHES,
  INITIAL_REGISTERS,
  INITIAL_PRODUCTS,
  INITIAL_EMPLOYEES,
  INITIAL_ACTIVE_SHIFT,
  INITIAL_CUSTOMERS,
  INITIAL_LOYALTY_SETTINGS,
  INITIAL_VENDORS,
  INITIAL_PURCHASES,
  INITIAL_EXPENSES,
  INITIAL_SALARIES,
  INITIAL_ASSETS,
  INITIAL_LOANS,
  INITIAL_SALES,
  INITIAL_MOVEMENTS,
} from '../data/mockData';
import { translations } from '../translations';
import { loadLocal, saveLocal, clearLocalStorage } from '../services/persistence';
import { syncService } from '../services/syncService';
import { AppStore } from '../services/store';
import { DEFAULT_SCANNER_SETTINGS, normalizeScannerSettings } from '../services/scannerSettings';
import {
  authenticate as authenticateService,
  createUser as createUserService,
  changePassword as changePasswordService,
  touchLogin as touchLoginService,
  hashPassword,
  makeSalt,
} from '../services/authService';
import { setAuthToken } from '../api/client';
import {
  completeSale as completeSaleService,
  holdOrder as holdOrderService,
  resumeOrder as resumeOrderService,
  removeHeldOrder as removeHeldOrderService,
  CompleteSaleInput,
} from '../services/saleService';
import { processReturn as processReturnService, ReturnData } from '../services/returnService';
import { openShift as openShiftService, closeShift as closeShiftService } from '../services/shiftService';
import { adjustStock as adjustStockService, transferStock as transferStockService } from '../services/inventoryService';
import { recordDamagedGoods as recordDamagedGoodsService } from '../services/damageService';
import {
  addProduct as addProductService,
  updateProduct as updateProductService,
  bulkUpdateProducts as bulkUpdateProductsService,
  deleteProduct as deleteProductService,
  bulkDeleteProducts as bulkDeleteProductsService,
} from '../services/productService';
import { updateLoyaltySettings as updateLoyaltySettingsService, addCustomer as addCustomerService } from '../services/loyaltyService';
import {
  addVendor as addVendorService,
  createPurchaseOrder as createPurchaseOrderService,
  createPendingPurchaseOrder as createPendingPurchaseOrderService,
  receivePurchaseOrder as receivePurchaseOrderService,
  payPurchaseOrder as payPurchaseOrderService,
  processVendorReturn as processVendorReturnService,
} from '../services/purchaseService';
import {
  addExpense as addExpenseService,
  paySalary as paySalaryService,
  generateMonthlyPayroll as generateMonthlyPayrollService,
  recordCashAdvance as recordCashAdvanceService,
} from '../services/payrollService';
import {
  addBranch as addBranchService,
  addEmployee as addEmployeeService,
  updateEmployee as updateEmployeeService,
  addAsset as addAssetService,
  addLoan as addLoanService,
  payLoanInstallment as payLoanInstallmentService,
} from '../services/employeeService';

interface AppContextType {
  t: typeof translations['ar'];
  isRtl: boolean;

  // Selected context
  activeBranchId: string;
  setActiveBranchId: (id: string) => void;
  activeBranch: Branch;
  addBranch: (b: Omit<Branch, 'id'>) => void;
  activeRegisterId: string;
  setActiveRegisterId: (id: string) => void;
  currentEmployee: Employee;
  setCurrentEmployeeId: (id: string) => void;

  // Core Data
  branches: Branch[];
  registers: Register[];
  products: Product[];
  employees: Employee[];
  activeShift: Shift | null;
  shifts: Shift[];
  sales: Sale[];
  heldOrders: HeldOrder[];
  returns: ReturnRecord[];
  inventoryMovements: InventoryMovement[];
  customers: Customer[];
  loyaltySettings: LoyaltySettings;
  loyaltyTransactions: LoyaltyTransaction[];
  vendors: Vendor[];
  purchases: PurchaseOrder[];
  vendorReturns: VendorReturn[];
  expenses: Expense[];
  salaries: Salary[];
  assets: Asset[];
  loans: Loan[];
  users: AppUser[];
  paymentLogs: PaymentLogEntry[];
  damagedGoods: DamagedGoodsEntry[];
  cashAdvances: CashAdvance[];

  // Authentication
  currentUser: AppUser | null;
  authReady: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<AuthResult>;
  logout: () => void;
  createUser: (data: {
    username: string;
    fullName: string;
    password: string;
    role: AccountRole;
    employeeId?: string;
  }) => Promise<AuthResult>;
  updateUser: (user: AppUser) => void;
  deleteUser: (id: string) => void;
  changePassword: (userId: string, newPassword: string) => Promise<AuthResult>;

  // Actions
  addProduct: (product: Omit<Product, 'id'>) => Product;
  updateProduct: (product: Product) => void;
  bulkUpdateProducts: (products: Product[]) => void;
  deleteProduct: (id: string) => void;
  bulkDeleteProducts: (ids: string[]) => void;
  adjustStock: (productId: string, quantityDelta: number, reason: string) => void;
  transferStock: (productId: string, quantity: number, targetBranchId: string, notes?: string) => void;
  recordDamagedGoods: (input: { productId: string; quantity: number; damageType: DamagedGoodsEntry['damageType']; notes?: string }) => boolean;

  // POS & Sales
  completeSale: (saleData: CompleteSaleInput) => Sale;
  holdOrder: (items: SaleItem[], customerId?: string, customerName?: string, notes?: string) => void;
  resumeOrder: (id: string) => HeldOrder | undefined;
  removeHeldOrder: (id: string) => void;

  // Returns & Refunds
  processReturn: (returnData: ReturnData) => ReturnRecord;

  // Loyalty
  updateLoyaltySettings: (settings: LoyaltySettings) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'loyaltyPointsBalance' | 'totalPointsEarned' | 'totalPointsRedeemed' | 'createdAt'>) => Customer;

  // Purchases & Vendors
  addVendor: (vendor: Omit<Vendor, 'id' | 'balance'>) => void;
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdDate'>) => void;
  receivePurchaseOrder: (poId: string) => void;
  payPurchaseOrder: (poId: string, paymentMethod?: string, amount?: number) => void;
  processVendorReturn: (returnData: {
    vendorId: string;
    sourcePoId?: string;
    sourcePoNumber?: string;
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitCost: number;
      total: number;
      replacement?: boolean;
    }>;
    reason: string;
  }) => void;

  // Shifts
  openShift: (openingCash: number, notes?: string, empId?: string) => void;
  closeShift: (actualCash: number, notes?: string) => Shift | null;

  // Employees
  addEmployee: (emp: Omit<Employee, 'id'> & { id?: string }) => void;
  updateEmployee: (emp: Employee) => void;

  // Expenses & Payroll
  addExpense: (expense: Omit<Expense, 'id' | 'employeeId' | 'employeeName'>) => void;
  paySalary: (salaryIdOrEmpId: string, methodOrBase?: any, bonus?: number, deductions?: number, month?: string) => void;
  generateMonthlyPayroll: (monthYear: string) => void;
  recordCashAdvance: (input: { employeeId: string; amount: number; notes?: string }) => boolean;

  // Assets & Loans
  addAsset: (asset: Omit<Asset, 'id' | 'branchId'>) => void;
  addLoan: (loan: Omit<Loan, 'id' | 'loanNumber' | 'paidAmount' | 'remainingBalance' | 'status'>) => void;
  payLoanInstallment: (loanId: string, amount: number) => void;

  // Scanner Settings
  scannerSettings: ScannerSettings;
  updateScannerSettings: (settings: Partial<ScannerSettings>) => void;
  resetScannerSettings: () => void;

  // Purchase Orders
  createPendingPurchaseOrder: (product: Product) => { created: boolean; alreadyPending: boolean };

  // Global reset
  resetAllDemoData: () => void;

  // Full wipe: empties all business data (products, sales, employees…) keeping only config
  wipeAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// The set of server-backed collections synced to SQLite (localStorage mirrors).
const COLLECTION_KEYS = [
  'branches',
  'registers',
  'products',
  'employees',
  'activeShift',
  'shifts',
  'sales',
  'heldOrders',
  'returns',
  'movements',
  'customers',
  'loyaltySettings',
  'loyaltyTx',
  'vendors',
  'purchases',
  'vendorReturns',
  'expenses',
  'salaries',
  'assets',
  'loans',
  'users',
  'paymentLogs',
  'damageGoods',
  'cashAdvances',
  'scannerSettings',
] as const;

function normalizeLoyaltySettings(v: unknown): LoyaltySettings {
  if (v && typeof v === 'object') {
    return { ...INITIAL_LOYALTY_SETTINGS, ...(v as Partial<LoyaltySettings>) };
  }
  return INITIAL_LOYALTY_SETTINGS;
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const t = translations.ar;
  const isRtl = true;

  useEffect(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
  }, []);

  // State collections with localStorage persistence as offline fallback
  const [branches, setBranches] = useState<Branch[]>(() => loadLocal('branches', INITIAL_BRANCHES));
  const [activeBranchId, setActiveBranchIdState] = useState<string>(() => loadLocal('activeBranchId', 'br-1'));
  const [registers, setRegisters] = useState<Register[]>(() => loadLocal('registers', INITIAL_REGISTERS));
  const [activeRegisterId, setActiveRegisterId] = useState<string>('reg-1');
  const [products, setProducts] = useState<Product[]>(() => loadLocal('products', INITIAL_PRODUCTS));
  const [employees, setEmployees] = useState<Employee[]>(() => loadLocal('employees', INITIAL_EMPLOYEES));
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>('emp-1');

  const [activeShift, setActiveShift] = useState<Shift | null>(() => loadLocal('activeShift', INITIAL_ACTIVE_SHIFT));
  const [shifts, setShifts] = useState<Shift[]>(() => loadLocal('shifts', [INITIAL_ACTIVE_SHIFT]));

  const [sales, setSales] = useState<Sale[]>(() => {
    const loaded = loadLocal<Sale[]>('sales', INITIAL_SALES);
    if (!loaded || loaded.length <= 4) {
      return INITIAL_SALES;
    }
    return loaded;
  });
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(() => loadLocal('heldOrders', []));
  const [returns, setReturns] = useState<ReturnRecord[]>(() => loadLocal('returns', []));
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>(() => loadLocal('movements', INITIAL_MOVEMENTS));
  const [customers, setCustomers] = useState<Customer[]>(() => loadLocal('customers', INITIAL_CUSTOMERS));
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>(() => loadLocal('loyaltySettings', INITIAL_LOYALTY_SETTINGS));
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<LoyaltyTransaction[]>(() => loadLocal('loyaltyTx', []));
  const [vendors, setVendors] = useState<Vendor[]>(() => loadLocal('vendors', INITIAL_VENDORS));
  const [purchases, setPurchases] = useState<PurchaseOrder[]>(() => loadLocal('purchases', INITIAL_PURCHASES));
  const [vendorReturns, setVendorReturns] = useState<VendorReturn[]>(() => loadLocal('vendorReturns', []));
  const [expenses, setExpenses] = useState<Expense[]>(() => loadLocal('expenses', INITIAL_EXPENSES));
  const [salaries, setSalaries] = useState<Salary[]>(() => loadLocal('salaries', INITIAL_SALARIES));
  const [assets, setAssets] = useState<Asset[]>(() => loadLocal('assets', INITIAL_ASSETS));
  const [loans, setLoans] = useState<Loan[]>(() => loadLocal('loans', INITIAL_LOANS));
  const [users, setUsers] = useState<AppUser[]>(() => loadLocal('users', []));
  const [paymentLogs, setPaymentLogs] = useState<PaymentLogEntry[]>(() => loadLocal('paymentLogs', []));
  const [damagedGoods, setDamagedGoods] = useState<DamagedGoodsEntry[]>(() => loadLocal('damageGoods', []));
  const [cashAdvances, setCashAdvances] = useState<CashAdvance[]>(() => loadLocal('cashAdvances', []));
  const [currentUserId, setCurrentUserId] = useState<string | null>(() =>
    loadLocal<string | null>('sessionUserId', null)
  );
  const [authReady, setAuthReady] = useState(false);
  const [scannerSettings, setScannerSettings] = useState<ScannerSettings>(() =>
    normalizeScannerSettings(loadLocal('scannerSettings', DEFAULT_SCANNER_SETTINGS))
  );

  // ------------------------------------------------------------------
  // SQLite bootstrap: push any unsynced local changes first, then pull the
  // authoritative state from the backend into React. Server sync is gated
  // until this completes so a stale local bootstrap never clobbers the DB.
  // ------------------------------------------------------------------
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await syncService.flushPendingOutbox();
      const loaded = await syncService.pullAll<unknown>(COLLECTION_KEYS);
      if (cancelled) return;

      if (loaded.has('branches') && Array.isArray(loaded.get('branches'))) setBranches(loaded.get('branches') as Branch[]);
      if (loaded.has('registers') && Array.isArray(loaded.get('registers'))) setRegisters(loaded.get('registers') as Register[]);
      if (loaded.has('products') && Array.isArray(loaded.get('products'))) setProducts(loaded.get('products') as Product[]);
      if (loaded.has('employees') && Array.isArray(loaded.get('employees'))) setEmployees(loaded.get('employees') as Employee[]);
      if (loaded.has('activeBranchId')) setActiveBranchIdState((loaded.get('activeBranchId') as string) || 'br-1');
      if (loaded.has('activeShift')) setActiveShift(((loaded.get('activeShift') as Shift | null) ?? null));
      if (loaded.has('shifts') && Array.isArray(loaded.get('shifts'))) setShifts(loaded.get('shifts') as Shift[]);
      if (loaded.has('sales') && Array.isArray(loaded.get('sales'))) setSales(loaded.get('sales') as Sale[]);
      if (loaded.has('heldOrders') && Array.isArray(loaded.get('heldOrders'))) setHeldOrders(loaded.get('heldOrders') as HeldOrder[]);
      if (loaded.has('returns') && Array.isArray(loaded.get('returns'))) setReturns(loaded.get('returns') as ReturnRecord[]);
      if (loaded.has('movements') && Array.isArray(loaded.get('movements'))) setInventoryMovements(loaded.get('movements') as InventoryMovement[]);
      if (loaded.has('customers') && Array.isArray(loaded.get('customers'))) setCustomers(loaded.get('customers') as Customer[]);
      if (loaded.has('loyaltySettings')) setLoyaltySettings(normalizeLoyaltySettings(loaded.get('loyaltySettings')));
      if (loaded.has('loyaltyTx') && Array.isArray(loaded.get('loyaltyTx'))) setLoyaltyTransactions(loaded.get('loyaltyTx') as LoyaltyTransaction[]);
      if (loaded.has('vendors') && Array.isArray(loaded.get('vendors'))) setVendors(loaded.get('vendors') as Vendor[]);
      if (loaded.has('purchases') && Array.isArray(loaded.get('purchases'))) setPurchases(loaded.get('purchases') as PurchaseOrder[]);
      if (loaded.has('vendorReturns') && Array.isArray(loaded.get('vendorReturns'))) setVendorReturns(loaded.get('vendorReturns') as VendorReturn[]);
      if (loaded.has('expenses') && Array.isArray(loaded.get('expenses'))) setExpenses(loaded.get('expenses') as Expense[]);
      if (loaded.has('salaries') && Array.isArray(loaded.get('salaries'))) setSalaries(loaded.get('salaries') as Salary[]);
      if (loaded.has('assets') && Array.isArray(loaded.get('assets'))) setAssets(loaded.get('assets') as Asset[]);
      if (loaded.has('loans') && Array.isArray(loaded.get('loans'))) setLoans(loaded.get('loans') as Loan[]);
      if (loaded.has('scannerSettings')) setScannerSettings(normalizeScannerSettings(loaded.get('scannerSettings')));
      if (loaded.has('paymentLogs') && Array.isArray(loaded.get('paymentLogs'))) setPaymentLogs(loaded.get('paymentLogs') as PaymentLogEntry[]);
      if (loaded.has('damageGoods') && Array.isArray(loaded.get('damageGoods'))) setDamagedGoods(loaded.get('damageGoods') as DamagedGoodsEntry[]);
      if (loaded.has('cashAdvances') && Array.isArray(loaded.get('cashAdvances'))) setCashAdvances(loaded.get('cashAdvances') as CashAdvance[]);

      // Resolve user accounts (server first, then local cache) and provision a
      // default administrator on a brand-new installation so the owner can log in.
      let finalUsers: AppUser[] = Array.isArray(loaded.get('users'))
        ? (loaded.get('users') as AppUser[])
        : loadLocal<AppUser[]>('users', []);
      if (finalUsers.length === 0) {
        const salt = makeSalt();
        const passwordHash = await hashPassword('admin123', salt);
        finalUsers = [
          {
            id: 'user-admin',
            username: 'admin',
            fullName: 'مدير النظام',
            role: 'admin',
            passwordHash,
            salt,
            isActive: true,
            createdAt: new Date().toISOString(),
          },
        ];
      }
      if (!cancelled) {
        setUsers(finalUsers);
        setBootstrapped(true);
        syncService.setEnabled(true);
        setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ------------------------------------------------------------------
  // Persistence effects: mirror every collection to localStorage and, once
  // bootstrapped, enqueue it for the debounced server push.
  // ------------------------------------------------------------------
  useEffect(() => { saveLocal('branches', branches); if (bootstrapped) syncService.enqueue('branches', branches); }, [branches, bootstrapped]);
  useEffect(() => { saveLocal('registers', registers); if (bootstrapped) syncService.enqueue('registers', registers); }, [registers, bootstrapped]);
  useEffect(() => { saveLocal('products', products); if (bootstrapped) syncService.enqueue('products', products); }, [products, bootstrapped]);
  useEffect(() => { saveLocal('employees', employees); if (bootstrapped) syncService.enqueue('employees', employees); }, [employees, bootstrapped]);
  useEffect(() => { saveLocal('activeShift', activeShift); if (bootstrapped) syncService.enqueue('activeShift', activeShift); }, [activeShift, bootstrapped]);
  useEffect(() => { saveLocal('shifts', shifts); if (bootstrapped) syncService.enqueue('shifts', shifts); }, [shifts, bootstrapped]);
  useEffect(() => { saveLocal('sales', sales); if (bootstrapped) syncService.enqueue('sales', sales); }, [sales, bootstrapped]);
  useEffect(() => { saveLocal('heldOrders', heldOrders); if (bootstrapped) syncService.enqueue('heldOrders', heldOrders); }, [heldOrders, bootstrapped]);
  useEffect(() => { saveLocal('returns', returns); if (bootstrapped) syncService.enqueue('returns', returns); }, [returns, bootstrapped]);
  useEffect(() => { saveLocal('movements', inventoryMovements); if (bootstrapped) syncService.enqueue('movements', inventoryMovements); }, [inventoryMovements, bootstrapped]);
  useEffect(() => { saveLocal('customers', customers); if (bootstrapped) syncService.enqueue('customers', customers); }, [customers, bootstrapped]);
  useEffect(() => { saveLocal('loyaltySettings', loyaltySettings); if (bootstrapped) syncService.enqueue('loyaltySettings', loyaltySettings); }, [loyaltySettings, bootstrapped]);
  useEffect(() => { saveLocal('loyaltyTx', loyaltyTransactions); if (bootstrapped) syncService.enqueue('loyaltyTx', loyaltyTransactions); }, [loyaltyTransactions, bootstrapped]);
  useEffect(() => { saveLocal('vendors', vendors); if (bootstrapped) syncService.enqueue('vendors', vendors); }, [vendors, bootstrapped]);
  useEffect(() => { saveLocal('purchases', purchases); if (bootstrapped) syncService.enqueue('purchases', purchases); }, [purchases, bootstrapped]);
  useEffect(() => { saveLocal('vendorReturns', vendorReturns); if (bootstrapped) syncService.enqueue('vendorReturns', vendorReturns); }, [vendorReturns, bootstrapped]);
  useEffect(() => { saveLocal('expenses', expenses); if (bootstrapped) syncService.enqueue('expenses', expenses); }, [expenses, bootstrapped]);
  useEffect(() => { saveLocal('salaries', salaries); if (bootstrapped) syncService.enqueue('salaries', salaries); }, [salaries, bootstrapped]);
  useEffect(() => { saveLocal('assets', assets); if (bootstrapped) syncService.enqueue('assets', assets); }, [assets, bootstrapped]);
  useEffect(() => { saveLocal('loans', loans); if (bootstrapped) syncService.enqueue('loans', loans); }, [loans, bootstrapped]);
  useEffect(() => { saveLocal('users', users); if (bootstrapped) syncService.enqueue('users', users); }, [users, bootstrapped]);
  useEffect(() => { saveLocal('paymentLogs', paymentLogs); if (bootstrapped) syncService.enqueue('paymentLogs', paymentLogs); }, [paymentLogs, bootstrapped]);
  useEffect(() => { saveLocal('damageGoods', damagedGoods); if (bootstrapped) syncService.enqueue('damageGoods', damagedGoods); }, [damagedGoods, bootstrapped]);
  useEffect(() => { saveLocal('cashAdvances', cashAdvances); if (bootstrapped) syncService.enqueue('cashAdvances', cashAdvances); }, [cashAdvances, bootstrapped]);
  useEffect(() => { saveLocal('scannerSettings', scannerSettings); if (bootstrapped) syncService.enqueue('scannerSettings', scannerSettings); }, [scannerSettings, bootstrapped]);

  // Persist the active session user id (device-local, never synced).
  useEffect(() => { saveLocal('sessionUserId', currentUserId); }, [currentUserId]);

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId && u.isActive) || null,
    [users, currentUserId]
  );
  const isAdmin = currentUser?.role === 'admin';

  const updateScannerSettings = (patch: Partial<ScannerSettings>) => {
    setScannerSettings((prev) => ({ ...prev, ...patch }));
  };

  const resetScannerSettings = () => {
    setScannerSettings(DEFAULT_SCANNER_SETTINGS);
  };

  const activeBranch = useMemo(() => {
    return (
      branches.find((b) => b.id === activeBranchId) ||
      branches[0] ||
      ({
        id: 'br-1',
        name: 'Main Branch',
        nameAr: 'الفرع الرئيسي',
        code: 'BR-1',
        address: '',
        phone: '',
      } satisfies Branch)
    );
  }, [branches, activeBranchId]);

  const currentEmployee = useMemo(() => {
    return (
      employees.find((e) => e.id === currentEmployeeId) ||
      employees[0] ||
      ({
        id: 'emp-admin-1',
        employeeCode: 'ADMIN',
        name: 'Administrator',
        nameAr: 'مدير النظام',
        position: 'System Administrator',
        role: 'Admin',
        branchId: activeBranchId,
        salary: 0,
        status: 'Active',
      } satisfies Employee)
    );
  }, [employees, currentEmployeeId, activeBranchId]);

  const setActiveBranchId = (id: string) => {
    setActiveBranchIdState(id);
    saveLocal('activeBranchId', id);
  };

  // The execution context handed to the domain services.
  const store: AppStore = {
    activeBranchId,
    activeRegisterId,
    currentEmployee,
    setCurrentEmployeeId,
    branches,
    setBranches,
    registers,
    products,
    setProducts,
    employees,
    setEmployees,
    activeShift,
    setActiveShift,
    shifts,
    setShifts,
    sales,
    setSales,
    heldOrders,
    setHeldOrders,
    returns,
    setReturns,
    inventoryMovements,
    setInventoryMovements,
    customers,
    setCustomers,
    loyaltySettings,
    setLoyaltySettings,
    loyaltyTransactions,
    setLoyaltyTransactions,
    vendors,
    setVendors,
    purchases,
    setPurchases,
    vendorReturns,
    setVendorReturns,
    expenses,
    setExpenses,
    salaries,
    setSalaries,
    assets,
    setAssets,
    loans,
    setLoans,
    scannerSettings,
    users,
    setUsers,
    paymentLogs,
    setPaymentLogs,
    damagedGoods,
    setDamagedGoods,
    cashAdvances,
    setCashAdvances,
  };

  // Authentication session actions (device-local session id, synced accounts).
  const login = async (username: string, password: string): Promise<AuthResult> => {
    const result = await authenticateService(users, username, password);
    if (result.ok && result.user) {
      setCurrentUserId(result.user.id);
      setAuthToken(result.user.id);
      if (bootstrapped) touchLoginService(store, result.user.id);
    }
    return result;
  };

  const logout = () => {
    setCurrentUserId(null);
    setAuthToken(null);
  };

  const createUser = async (data: {
    username: string;
    fullName: string;
    password: string;
    role: AccountRole;
    employeeId?: string;
  }): Promise<AuthResult> => {
    if (!isAdmin) return { ok: false, error: 'forbidden' };
    return createUserService(store, data);
  };

  const updateUser = (user: AppUser) => {
    if (!isAdmin) return;
    setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
  };

  const deleteUser = (id: string) => {
    if (!isAdmin) return;
    setUsers((prev) => prev.filter((u) => u.id !== id));
    if (currentUserId === id) setCurrentUserId(null);
  };

  const changePassword = async (userId: string, newPassword: string): Promise<AuthResult> => {
    if (!isAdmin && currentUserId !== userId) return { ok: false, error: 'forbidden' };
    return changePasswordService(store, userId, newPassword);
  };

  // All business logic lives in src/services/* and is coordinated here.
  const addProduct = (p: Omit<Product, 'id'>) => addProductService(store, p);
  const updateProduct = (p: Product) => updateProductService(store, p);
  const bulkUpdateProducts = (list: Product[]) => bulkUpdateProductsService(store, list);
  const deleteProduct = (id: string) => deleteProductService(store, id);
  const bulkDeleteProducts = (ids: string[]) => bulkDeleteProductsService(store, ids);
  const adjustStock = (productId: string, quantityDelta: number, reason: string) => adjustStockService(store, productId, quantityDelta, reason);
  const transferStock = (productId: string, quantity: number, targetBranchId: string, notes?: string) => transferStockService(store, productId, quantity, targetBranchId, notes);
  const recordDamagedGoods = (input: { productId: string; quantity: number; damageType: DamagedGoodsEntry['damageType']; notes?: string }) =>
    recordDamagedGoodsService(store, input);

  const completeSale = (saleData: CompleteSaleInput) => completeSaleService(store, saleData);
  const holdOrder = (items: SaleItem[], customerId?: string, customerName?: string, notes?: string) => holdOrderService(store, items, customerId, customerName, notes);
  const resumeOrder = (id: string) => resumeOrderService(store, id);
  const removeHeldOrder = (id: string) => removeHeldOrderService(store, id);

  const processReturn = (returnData: ReturnData) => processReturnService(store, returnData);

  const updateLoyaltySettings = (settings: LoyaltySettings) => updateLoyaltySettingsService(store, settings);
  const addCustomer = (data: Omit<Customer, 'id' | 'loyaltyPointsBalance' | 'totalPointsEarned' | 'totalPointsRedeemed' | 'createdAt'>) => addCustomerService(store, data);

  const addVendor = (data: Omit<Vendor, 'id' | 'balance'>) => addVendorService(store, data);
  const createPurchaseOrder = (data: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdDate'>) => createPurchaseOrderService(store, data);
  const createPendingPurchaseOrder = (product: Product) => createPendingPurchaseOrderService(store, product);
  const receivePurchaseOrder = (poId: string) => receivePurchaseOrderService(store, poId);
  const payPurchaseOrder = (poId: string, paymentMethod?: string, amount?: number) => payPurchaseOrderService(store, poId, paymentMethod, amount);
  const processVendorReturn = (data: Parameters<typeof processVendorReturnService>[1]) => processVendorReturnService(store, data);

  const openShift = (openingCash: number, notes?: string, empId?: string) => openShiftService(store, openingCash, notes, empId);
  const closeShift = (actualCash: number, notes?: string) => closeShiftService(store, actualCash, notes);

  const addBranch = (data: Omit<Branch, 'id'>) => addBranchService(store, data);
  const addEmployee = (data: Omit<Employee, 'id'> & { id?: string }) => addEmployeeService(store, data);
  const updateEmployee = (emp: Employee) => updateEmployeeService(store, emp);

  const addExpense = (data: Omit<Expense, 'id' | 'employeeId' | 'employeeName'>) => addExpenseService(store, data);
  const paySalary = (salaryIdOrEmpId: string, methodOrBase?: any, bonus?: number, deductions?: number, month?: string) => paySalaryService(store, salaryIdOrEmpId, methodOrBase, bonus, deductions, month);
  const generateMonthlyPayroll = (monthYear: string) => generateMonthlyPayrollService(store, monthYear);
  const recordCashAdvance = (input: { employeeId: string; amount: number; notes?: string }) => recordCashAdvanceService(store, input);

  const addAsset = (data: Omit<Asset, 'id' | 'branchId'>) => addAssetService(store, data);
  const addLoan = (data: Omit<Loan, 'id' | 'loanNumber' | 'paidAmount' | 'remainingBalance' | 'status'>) => addLoanService(store, data);
  const payLoanInstallment = (loanId: string, amount: number) => payLoanInstallmentService(store, loanId, amount);

  // Reset demo data: restore every collection to its initial demo state.
  const resetAllDemoData = () => {
    clearLocalStorage();
    setProducts(INITIAL_PRODUCTS);
    setActiveShift(INITIAL_ACTIVE_SHIFT);
    setShifts([INITIAL_ACTIVE_SHIFT]);
    setSales(INITIAL_SALES);
    setHeldOrders([]);
    setReturns([]);
    setInventoryMovements(INITIAL_MOVEMENTS);
    setCustomers(INITIAL_CUSTOMERS);
    setLoyaltySettings(INITIAL_LOYALTY_SETTINGS);
    setLoyaltyTransactions([]);
    setVendors(INITIAL_VENDORS);
    setPurchases(INITIAL_PURCHASES);
    setVendorReturns([]);
    setExpenses(INITIAL_EXPENSES);
    setSalaries(INITIAL_SALARIES);
    setAssets(INITIAL_ASSETS);
    setLoans(INITIAL_LOANS);
    setDamagedGoods([]);
    setCashAdvances([]);
    setScannerSettings(DEFAULT_SCANNER_SETTINGS);
  };

  // Full wipe: empty every business collection while keeping config defaults.
  const wipeAllData = () => {
    setBranches([]);
    setActiveBranchIdState('br-1');
    setRegisters([]);
    setProducts([]);
    setEmployees([]);
    setActiveShift(null);
    setShifts([]);
    setSales([]);
    setHeldOrders([]);
    setReturns([]);
    setInventoryMovements([]);
    setCustomers([]);
    setLoyaltySettings(INITIAL_LOYALTY_SETTINGS);
    setLoyaltyTransactions([]);
    setVendors([]);
    setPurchases([]);
    setVendorReturns([]);
    setExpenses([]);
    setSalaries([]);
    setAssets([]);
    setLoans([]);
    setDamagedGoods([]);
    setCashAdvances([]);
    setScannerSettings(DEFAULT_SCANNER_SETTINGS);
  };

  return (
    <AppContext.Provider
      value={{
        t,
        isRtl,
        activeBranchId,
        setActiveBranchId,
        activeBranch,
        activeRegisterId,
        setActiveRegisterId,
        currentEmployee,
        setCurrentEmployeeId,
        branches,
        registers,
        products,
        employees,
        activeShift,
        shifts,
        sales,
        heldOrders,
        returns,
        inventoryMovements,
        customers,
        loyaltySettings,
        loyaltyTransactions,
        vendors,
        purchases,
        vendorReturns,
        expenses,
        salaries,
        assets,
        loans,
        users,
        paymentLogs,
        damagedGoods,
        cashAdvances,
        currentUser,
        authReady,
        isAdmin,
        login,
        logout,
        createUser,
        updateUser,
        deleteUser,
        changePassword,
        scannerSettings,
        updateScannerSettings,
        resetScannerSettings,
        createPendingPurchaseOrder,
        addProduct,
        updateProduct,
        bulkUpdateProducts,
        deleteProduct,
        bulkDeleteProducts,
        adjustStock,
        transferStock,
        recordDamagedGoods,
        completeSale,
        holdOrder,
        resumeOrder,
        removeHeldOrder,
        processReturn,
        updateLoyaltySettings,
        addCustomer,
        addVendor,
        addBranch,
        createPurchaseOrder,
        receivePurchaseOrder,
        payPurchaseOrder,
        processVendorReturn,
        openShift,
        closeShift,
        addEmployee,
        updateEmployee,
        addExpense,
        paySalary,
        generateMonthlyPayroll,
        recordCashAdvance,
        addAsset,
        addLoan,
        payLoanInstallment,
        resetAllDemoData,
        wipeAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};