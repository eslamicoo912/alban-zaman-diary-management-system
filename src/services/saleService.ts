import type { HeldOrder, PaymentBreakdown, PaymentMethod, Sale, SaleItem, Shift } from '../types';
import type { AppStore } from './store';
import { nextHoldNumber, nextReceiptNumber, uid } from './idGenerator';

export interface CompleteSaleInput {
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  total: number;
  paymentMethod: PaymentMethod;
  payments: PaymentBreakdown[];
  customerId?: string;
  pointsRedeemed?: number;
  pointsDiscountAmount?: number;
  notes?: string;
}

/** Completes a POS sale, coordinating inventory, loyalty, shift and sales state in one action. */
export function completeSale(store: AppStore, saleData: CompleteSaleInput): Sale {
  const saleId = uid('sale');
  const receiptNumber = nextReceiptNumber(store.sales.length);
  const totalCost = saleData.items.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);
  const totalProfit = saleData.total - totalCost;

  let pointsEarned = 0;
  const pointsRedeemed = saleData.pointsRedeemed || 0;
  const pointsDiscountAmount = saleData.pointsDiscountAmount || 0;

  if (store.loyaltySettings.enabled && saleData.customerId) {
    pointsEarned = Math.floor(saleData.total / Math.max(1, store.loyaltySettings.pointsEarnedPerAmountSpent));
  }

  const customerObj = store.customers.find((c) => c.id === saleData.customerId);

  const newSale: Sale = {
    id: saleId,
    receiptNumber,
    branchId: store.activeBranchId,
    registerId: store.activeRegisterId,
    employeeId: store.currentEmployee.id,
    employeeName: store.currentEmployee.name,
    shiftId: store.activeShift?.id || 'shift-general',
    customerId: saleData.customerId,
    customerName: customerObj ? customerObj.name : undefined,
    items: saleData.items.map((item) => ({
      ...item,
      profit: item.lineTotal - item.costPrice * item.quantity,
    })),
    subtotal: saleData.subtotal,
    discountTotal: saleData.discountTotal,
    total: saleData.total,
    totalCost,
    totalProfit,
    paymentMethod: saleData.paymentMethod,
    payments: saleData.payments,
    pointsEarned,
    pointsRedeemed,
    pointsDiscountAmount,
    date: new Date().toISOString(),
    status: 'Completed',
    notes: saleData.notes,
  };

  const isCustomOrder = saleData.items.some((item) => item.isCustomOrder);
  const newSaleWithFlag: Sale = { ...newSale, isCustomOrder };

  // 1. Update product inventory (skip custom-order lines)
  store.setProducts((prev) => {
    const stockMap = new Map<string, number>();
    saleData.items.forEach((item) => {
      if (item.isCustomOrder) return;
      stockMap.set(item.productId, (stockMap.get(item.productId) || 0) + item.quantity);
    });
    return prev.map((prod) => {
      const qtyDeducted = stockMap.get(prod.id);
      if (qtyDeducted) {
        return { ...prod, currentStock: Math.max(0, prod.currentStock - qtyDeducted) };
      }
      return prod;
    });
  });

  // 2. Record inventory movements (exclude custom-order lines)
  const movements = saleData.items
    .filter((item) => !item.isCustomOrder)
    .map((item) => ({
      id: uid('mov'),
      productId: item.productId,
      productName: item.productName,
      type: 'sale' as const,
      quantity: -item.quantity,
      unit: item.unit,
      referenceId: receiptNumber,
      batchNumber: item.batchNumber,
      date: new Date().toISOString(),
      notes: `POS Sale Receipt #${receiptNumber}`,
      branchId: store.activeBranchId,
      employeeName: store.currentEmployee.name,
    }));
  store.setInventoryMovements((prev) => [...movements, ...prev]);

  // 3. Update customer loyalty balance & history
  if (customerObj && (pointsEarned > 0 || pointsRedeemed > 0)) {
    store.setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerObj.id) {
          return {
            ...c,
            loyaltyPointsBalance: c.loyaltyPointsBalance - pointsRedeemed + pointsEarned,
            totalPointsEarned: c.totalPointsEarned + pointsEarned,
            totalPointsRedeemed: c.totalPointsRedeemed + pointsRedeemed,
          };
        }
        return c;
      })
    );

    const txs = [];
    if (pointsRedeemed > 0) {
      txs.push({
        id: uid('ltx'),
        customerId: customerObj.id,
        customerName: customerObj.name,
        type: 'redeemed' as const,
        points: pointsRedeemed,
        amountEquivalent: pointsDiscountAmount,
        referenceSaleId: saleId,
        date: new Date().toISOString(),
        reason: `Points redeemed on Receipt #${receiptNumber}`,
      });
    }
    if (pointsEarned > 0) {
      txs.push({
        id: uid('ltx'),
        customerId: customerObj.id,
        customerName: customerObj.name,
        type: 'earned' as const,
        points: pointsEarned,
        amountEquivalent: pointsEarned * store.loyaltySettings.pointRedemptionValue,
        referenceSaleId: saleId,
        date: new Date().toISOString(),
        reason: `Points earned on Receipt #${receiptNumber}`,
      });
    }
    store.setLoyaltyTransactions((prev) => [...txs, ...prev]);
  }

  // 4. Update shift cash/tender balances (only the three supported methods)
  if (store.activeShift) {
    const cashAmount = saleData.payments.filter((p) => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0);
    const vodafoneAmount = saleData.payments.filter((p) => p.method === 'vodafone_cash').reduce((sum, p) => sum + p.amount, 0);
    const instapayAmount = saleData.payments.filter((p) => p.method === 'instapay').reduce((sum, p) => sum + p.amount, 0);

    const updatedShift: Shift = {
      ...store.activeShift,
      cashSales: store.activeShift.cashSales + cashAmount,
      vodafoneCashSales: store.activeShift.vodafoneCashSales + vodafoneAmount,
      instapaySales: store.activeShift.instapaySales + instapayAmount,
      expectedCash: store.activeShift.expectedCash + cashAmount,
      totalProfit: (store.activeShift.totalProfit || 0) + newSaleWithFlag.totalProfit,
      totalSalesCount: (store.activeShift.totalSalesCount || 0) + 1,
    };
    store.setActiveShift(updatedShift);
    store.setShifts((prev) => prev.map((s) => (s.id === updatedShift.id ? updatedShift : s)));
  }

  // 4b. Log every payment for traceability
  if (store.paymentLogs && store.setPaymentLogs) {
    const logs = saleData.payments.map((p) => ({
      id: uid('pay'),
      saleId,
      receiptNumber,
      method: p.method,
      amount: p.amount,
      reference: p.reference,
      branchId: store.activeBranchId,
      registerId: store.activeRegisterId,
      employeeId: store.currentEmployee.id,
      employeeName: store.currentEmployee.name,
      date: new Date().toISOString(),
    }));
    store.setPaymentLogs((prev) => [...logs, ...(prev || [])]);
  }

  // 5. Append sale
  store.setSales((prev) => [newSaleWithFlag, ...prev]);
  return newSaleWithFlag;
}

export function holdOrder(
  store: AppStore,
  items: SaleItem[],
  customerId?: string,
  customerName?: string,
  notes?: string
): HeldOrder | null {
  if (items.length === 0) return null;
  const newHold: HeldOrder = {
    id: uid('hold'),
    holdNumber: nextHoldNumber(store.heldOrders.length),
    branchId: store.activeBranchId,
    customerId,
    customerName,
    items,
    heldAt: new Date().toISOString(),
    notes,
  };
  store.setHeldOrders((prev) => [newHold, ...prev]);
  return newHold;
}

export function resumeOrder(store: AppStore, id: string): HeldOrder | undefined {
  const order = store.heldOrders.find((h) => h.id === id);
  if (order) {
    store.setHeldOrders((prev) => prev.filter((h) => h.id !== id));
  }
  return order;
}

export function removeHeldOrder(store: AppStore, id: string): void {
  store.setHeldOrders((prev) => prev.filter((h) => h.id !== id));
}