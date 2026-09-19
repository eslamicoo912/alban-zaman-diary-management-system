import type { ReturnItem, ReturnRecord, Shift } from '../types';
import type { AppStore } from './store';
import { nextReturnNumber, uid } from './idGenerator';

export interface ReturnData {
  originalSaleId: string;
  originalReceiptNumber: string;
  items: ReturnItem[];
  refundMethod: 'cash' | 'vodafone_cash' | 'instapay' | 'original' | 'store_credit';
  reason: string;
}

/** Processes a customer return: restocks inventory, reverses loyalty, updates shift and the original sale. */
export function processReturn(store: AppStore, returnData: ReturnData): ReturnRecord {
  const originalSale = store.sales.find((s) => s.id === returnData.originalSaleId);
  const returnNumber = nextReturnNumber(store.returns.length);
  const totalRefundAmount = returnData.items.reduce((sum, item) => sum + item.refundAmount, 0);
  const reversedCost = returnData.items.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);

  let reversedPoints = 0;
  if (store.loyaltySettings.enabled && originalSale?.customerId) {
    reversedPoints = Math.floor(totalRefundAmount / Math.max(1, store.loyaltySettings.pointsEarnedPerAmountSpent));
  }

  const returnRecord: ReturnRecord = {
    id: uid('ret'),
    returnNumber,
    originalSaleId: returnData.originalSaleId,
    originalReceiptNumber: returnData.originalReceiptNumber,
    branchId: store.activeBranchId,
    employeeId: store.currentEmployee.id,
    employeeName: store.currentEmployee.name,
    customerId: originalSale?.customerId,
    customerName: originalSale?.customerName,
    items: returnData.items,
    totalRefundAmount,
    reversedCost,
    reversedPoints,
    refundMethod: returnData.refundMethod,
    reason: returnData.reason,
    date: new Date().toISOString(),
  };

  // 1. Increase inventory stock
  store.setProducts((prev) => {
    const returnQtyMap = new Map<string, number>();
    returnData.items.forEach((item) => {
      returnQtyMap.set(item.productId, (returnQtyMap.get(item.productId) || 0) + item.quantity);
    });
    return prev.map((prod) => {
      const qtyReturned = returnQtyMap.get(prod.id);
      if (qtyReturned) {
        return { ...prod, currentStock: prod.currentStock + qtyReturned };
      }
      return prod;
    });
  });

  // 2. Record stock movements (customer return)
  const movements = returnData.items.map((item) => ({
    id: uid('mov'),
    productId: item.productId,
    productName: item.productName,
    type: 'customer_return' as const,
    quantity: item.quantity,
    unit: store.products.find((p) => p.id === item.productId)?.unit || ('Piece' as const),
    referenceId: returnNumber,
    batchNumber: item.batchNumber,
    date: new Date().toISOString(),
    notes: `Customer return for Receipt #${returnData.originalReceiptNumber} (${returnData.reason})`,
    branchId: store.activeBranchId,
    employeeName: store.currentEmployee.name,
  }));
  store.setInventoryMovements((prev) => [...movements, ...prev]);

  // 3. Reverse loyalty points
  if (originalSale?.customerId && reversedPoints > 0) {
    store.setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === originalSale.customerId) {
          return {
            ...c,
            loyaltyPointsBalance: Math.max(0, c.loyaltyPointsBalance - reversedPoints),
            totalPointsEarned: Math.max(0, c.totalPointsEarned - reversedPoints),
          };
        }
        return c;
      })
    );
    store.setLoyaltyTransactions((prev) => [
      {
        id: uid('ltx'),
        customerId: originalSale.customerId,
        customerName: originalSale.customerName || 'Customer',
        type: 'reversed' as const,
        points: -reversedPoints,
        amountEquivalent: -(reversedPoints * store.loyaltySettings.pointRedemptionValue),
        referenceSaleId: originalSale.id,
        date: new Date().toISOString(),
        reason: `Reversed points from return #${returnNumber}`,
      },
      ...prev,
    ]);
  }

  // 4. Update shift (reduce running profit for refunded margin; cash refunds adjust the drawer)
  if (store.activeShift) {
    const updatedShift: Shift = {
      ...store.activeShift,
      totalProfit:
        (store.activeShift.totalProfit || 0) - (totalRefundAmount - reversedCost),
      ...(returnData.refundMethod === 'cash'
        ? {
            cashRefunds: store.activeShift.cashRefunds + totalRefundAmount,
            expectedCash: store.activeShift.expectedCash - totalRefundAmount,
          }
        : {}),
    };
    store.setActiveShift(updatedShift);
    store.setShifts((prev) => prev.map((s) => (s.id === updatedShift.id ? updatedShift : s)));
  }

  // 5. Update original sale status
  if (originalSale) {
    store.setSales((prev) =>
      prev.map((s) => {
        if (s.id === originalSale.id) {
          return {
            ...s,
            status: totalRefundAmount >= s.total ? 'Refunded' : 'Partially_Refunded',
          };
        }
        return s;
      })
    );
  }

  store.setReturns((prev) => [returnRecord, ...prev]);
  return returnRecord;
}