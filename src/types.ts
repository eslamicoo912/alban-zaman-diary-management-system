export type Role = 'Admin' | 'Manager' | 'Cashier' | 'Employee' | 'admin' | 'manager' | 'cashier' | 'employee';
export type UserRole = Role;

// -------------------------------------------------------------
// Authentication / User accounts
// -------------------------------------------------------------
export type AccountRole = 'admin' | 'user';

export interface AppUser {
  id: string;
  username: string;
  fullName: string;
  role: AccountRole;
  passwordHash: string;
  salt: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  /** Optional link to an employee record for shift attribution. */
  employeeId?: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  user?: AppUser;
}

// -------------------------------------------------------------
// Payment methods
// -------------------------------------------------------------
export type PaymentMethod = 'cash' | 'vodafone_cash' | 'instapay';

export interface PaymentLogEntry {
  id: string;
  saleId: string;
  receiptNumber: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
  branchId: string;
  registerId: string;
  employeeId: string;
  employeeName: string;
  date: string;
}

export interface Employee {
  id: string;
  name: string;
  nameAr?: string;
  employeeCode: string;
  position: string;
  role: Role;
  branchId: string;
  salary: number;
  baseSalary?: number;
  status: 'Active' | 'Inactive';
  phone?: string;
  hireDate?: string;
}

export interface Branch {
  id: string;
  name: string;
  nameAr: string;
  code: string;
  address: string;
  phone: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface Register {
  id: string;
  branchId: string;
  name: string;
  code: string;
}

export interface Shift {
  id: string;
  shiftNumber: string;
  branchId: string;
  registerId: string;
  employeeId: string;
  employeeName: string;
  cashierName?: string;
  openedAt: string;
  closedAt?: string;
  startTime?: string;
  endTime?: string;
  openingCash: number;
  cashSales: number;
  vodafoneCashSales: number;
  instapaySales: number;
  cashRefunds: number;
  expensesCash: number;
  cashExpenses?: number;
  expectedCash: number;
  actualCash?: number;
  difference?: number;
  totalSalesCount?: number;
  totalProfit?: number;
  status: 'Open' | 'Closed';
  notes?: string;
}

export type ProductUnit = 'Piece' | 'Kg' | 'Gram' | 'Liter' | 'Bottle' | 'Box' | 'Carton';

export interface PriceHistoryEntry {
  changedAt: string; // ISO datetime
  fromSalePrice: number;
  toSalePrice: number;
  fromCostPrice: number;
  toCostPrice: number;
}

export interface Product {
  id: string;
  name: string;
  nameAr: string;
  sku: string;
  barcode: string;
  unit: ProductUnit;
  imageEmoji?: string;
  costPrice: number;
  salePrice: number;
  minSalePrice: number;
  currentStock: number;
  minStock: number;
  minStockAlert?: number;
  expiryDate: string; // YYYY-MM-DD
  batchNumber: string;
  isActive: boolean;
  isPerishable: boolean;
  branchId?: string;
  description?: string;
  priceHistory?: PriceHistoryEntry[];
}

export type MovementType =
  | 'sale'
  | 'customer_return'
  | 'purchase'
  | 'vendor_return'
  | 'adjustment'
  | 'branch_transfer'
  | 'damage';

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number; // positive or negative delta
  unit: ProductUnit;
  referenceId: string;
  batchNumber?: string;
  date: string;
  notes?: string;
  branchId: string;
  employeeName: string;
}

export type DamageType = 'damaged' | 'expired' | 'destroyed' | 'lost';

export interface DamagedGoodsEntry {
  id: string;
  damageNumber: string; // DMG-YYYYMMDD-XXX
  productId: string;
  productName: string;
  unit: ProductUnit;
  quantity: number;
  damageType: DamageType;
  unitCost: number;
  lossValue: number; // quantity * unitCost
  date: string;
  branchId: string;
  employeeName: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  loyaltyPointsBalance: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  createdAt: string;
  outstandingBalance?: number; // Accounts Receivable (money customer owes store / credit tab)
}

export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  customerName: string;
  type: 'earned' | 'redeemed' | 'reversed';
  points: number;
  amountEquivalent: number;
  referenceSaleId?: string;
  date: string;
  reason: string;
}

export interface LoyaltySettings {
  enabled: boolean;
  pointsEarnedPerAmountSpent: number; // e.g. 10 means 1 point per 10 currency units
  pointRedemptionValue: number; // e.g. 0.10 means 100 points = 10 SAR (1 pt = 0.10)
  minPointsForRedemption: number; // e.g. 50 points
  maxPercentPayableWithPoints: number; // e.g. 50%
}

export interface SaleItem {
  productId: string;
  productName: string;
  productNameAr?: string;
  sku: string;
  barcode: string;
  unit: ProductUnit;
  quantity: number;
  costPrice: number;
  salePrice: number;
  discountAmount: number;
  lineTotal: number;
  profit?: number;
  batchNumber: string;
  expiryDate: string;
  isCustomOrder?: boolean;
}

export interface PaymentBreakdown {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

export interface Sale {
  id: string;
  receiptNumber: string;
  branchId: string;
  registerId: string;
  employeeId: string;
  employeeName: string;
  shiftId: string;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  total: number;
  totalCost: number;
  totalProfit: number;
  paymentMethod: PaymentMethod;
  payments: PaymentBreakdown[];
  pointsEarned: number;
  pointsRedeemed: number;
  pointsDiscountAmount: number;
  date: string;
  status: 'Completed' | 'Refunded' | 'Partially_Refunded' | 'Cancelled';
  notes?: string;
  isCustomOrder?: boolean;
}

export interface ReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  refundAmount: number;
  reason: string;
  batchNumber?: string;
}

export interface ReturnRecord {
  id: string;
  returnNumber: string;
  originalSaleId: string;
  originalReceiptNumber: string;
  branchId: string;
  employeeId: string;
  employeeName: string;
  customerId?: string;
  customerName?: string;
  items: ReturnItem[];
  totalRefundAmount: number;
  reversedCost: number;
  reversedPoints: number;
  refundMethod: 'cash' | 'vodafone_cash' | 'instapay' | 'original' | 'store_credit';
  reason: string;
  date: string;
}

export interface Vendor {
  id: string;
  name: string;
  nameAr?: string;
  phone: string;
  email: string;
  address: string;
  paymentTerms: string; // e.g. "Net 30", "Cash on Delivery", "Net 15"
  balance: number; // Accounts Payable
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  unit: ProductUnit;
  quantity: number;
  unitCost: number;
  totalCost: number;
  batchNumber?: string;
  expiryDate?: string;
  /** True when the vendor-returned quantity will be replaced by new stock (stock is NOT removed). */
  replacement?: boolean;
  barcode?: string
}

export interface PurchasePayment {
  id: string;
  amount: number;
  paymentMethod: string;
  date: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  branchId: string;
  items: PurchaseItem[];
  totalAmount: number;
  status: 'Pending' | 'Received' | 'Paid' | 'Cancelled';
  createdDate: string;
  receivedDate?: string;
  paidDate?: string;
  paymentMethod?: string;
  paidAmount?: number;
  payments?: PurchasePayment[];
  notes?: string;
}

export interface VendorReturn {
  id: string;
  returnNumber: string;
  vendorId: string;
  vendorName: string;
  branchId: string;
  sourcePoId?: string;
  sourcePoNumber?: string;
  items: PurchaseItem[];
  totalAmount: number;
  date: string;
  reason: string;
}

export type ExpenseType =
  | 'Rent'
  | 'Electricity & Chiller Power'
  | 'Cold Storage Maintenance'
  | 'Transportation & Fuel'
  | 'Cleaning & Sanitation'
  | 'Packaging & Supplies'
  | 'Marketing'
  | 'Government & Licenses'
  | 'Other';

export type ExpenseCategory = ExpenseType | string;
export type SalaryRecord = Salary;
export type FixedAsset = Asset;
export type BusinessLoan = Loan;

export interface Expense {
  id: string;
  expenseType: ExpenseType;
  category?: ExpenseCategory;
  amount: number;
  branchId: string;
  date: string;
  paymentMethod: 'cash' | 'bank' | 'card' | 'Cash' | 'Bank' | 'Card';
  employeeId: string;
  employeeName: string;
  notes?: string;
  description?: string;
  paidFromShift?: boolean;
  shiftId?: string;
}

export interface Salary {
  id: string;
  employeeId: string;
  employeeName: string;
  monthYear: string; // e.g. "2026-09"
  month?: string;
  basicSalary: number;
  baseSalary?: number;
  allowances: number;
  bonuses?: number;
  bonus?: number;
  deductions: number;
  advances: number;
  netSalary: number;
  status: 'Pending' | 'Paid';
  paymentDate?: string;
  paymentMethod?: 'bank' | 'cash';
}

export interface CashAdvance {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  date: string;
  monthYear: string; // month the advance was granted
  branchId: string;
  notes?: string;
  status: 'pending_deduction' | 'deducted';
  salaryId?: string;
}

export interface Asset {
  id: string;
  name: string;
  nameAr?: string;
  category: 'Refrigeration' | 'Vehicles' | 'Processing Machinery' | 'IT & POS' | 'Store Fixtures' | string;
  purchaseDate: string;
  cost: number;
  usefulLifeYears: number;
  salvageValue: number;
  branchId: string;
  serialNumber?: string;
  currentValue?: number;
  depreciationRate?: number;
}

export interface Loan {
  id: string;
  loanNumber: string;
  name?: string;
  lender?: string;
  lenderName?: string;
  type: 'loan_received' | 'loan_given' | string;
  counterpartyName: string;
  principal: number;
  interestRate: number; // percentage
  startDate: string;
  dueDate: string;
  installmentsCount: number;
  monthlyInstallment?: number;
  paidAmount: number;
  remainingBalance: number;
  status: 'Active' | 'Settled';
  notes?: string;
}

export interface HeldOrder {
  id: string;
  holdNumber: string;
  branchId: string;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  heldAt: string;
  notes?: string;
}

export type ScannerSensitivityPreset = 'ultra' | 'fast' | 'normal' | 'relaxed' | 'custom';

export interface ScannerSettings {
  customPrefixes: string[]; // e.g. ['628', '20', '99', 'DRY-']
  defaultPrefix: string; // e.g. '628'
  stripPrefixOnMatch: boolean; // allow matching when scanned without or with prefix
  autoPrependDefaultPrefix: boolean; // if scanning short code, attempt matching with default prefix
  parseWeightedBarcodes: boolean; // whether to parse variable weight electronic scale barcodes
  weightedBarcodePrefix: string; // e.g. '20' or '99'
  sensitivityPreset: ScannerSensitivityPreset;
  sensitivityMs: number; // inter-keystroke threshold in ms (e.g. 45ms)
  minBarcodeLength: number; // minimum barcode length (e.g. 4)
  instantMatchAutoAdd: boolean; // automatically add to cart as soon as exact barcode matches
  enableGlobalKeystrokeListener: boolean; // background scanning anywhere in POS
  audioFeedback: boolean; // beep on successful scan
}

// -------------------------------------------------------------
// Future Manufacturing Hook Interfaces (Designed for future V2)
// -------------------------------------------------------------
export interface RawMaterial {
  id: string;
  name: string;
  unit: ProductUnit;
  currentStock: number;
  costPerUnit: number;
}

export interface BillOfMaterialItem {
  rawMaterialId: string;
  quantityRequired: number;
  unit: ProductUnit;
}

export interface Recipe {
  id: string;
  targetProductId: string;
  bom: BillOfMaterialItem[];
  laborCostEstimate: number;
  overheadCostEstimate: number;
  expectedYieldQuantity: number;
}

export interface ProductionOrder {
  id: string;
  recipeId: string;
  plannedQuantity: number;
  actualQuantity?: number;
  wasteQuantity?: number;
  status: 'Draft' | 'In_Production' | 'Completed' | 'Cancelled';
  startDate?: string;
  completionDate?: string;
}
