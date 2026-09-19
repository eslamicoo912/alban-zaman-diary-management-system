import type { PurchaseOrder, PurchasePayment, Vendor } from '../types';
import type { AppStore } from './store';
import { nextPurchaseOrderNumber, uid } from './idGenerator';

export function addVendor(store: AppStore, vendorData: Omit<Vendor, 'id' | 'balance'>): Vendor {
  const newVendor: Vendor = { ...vendorData, id: uid('ven'), balance: 0 };
  store.setVendors((prev) => [newVendor, ...prev]);
  return newVendor;
}

export function createPurchaseOrder(store: AppStore, input: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdDate'>): PurchaseOrder {
  const newPO: PurchaseOrder = {
    ...input,
    id: uid('po'),
    poNumber: nextPurchaseOrderNumber(store.purchases.length),
    createdDate: new Date().toISOString().slice(0, 10),
  };
  store.setPurchases((prev) => [newPO, ...prev]);
  return newPO;
}

/**
 * Auto-creates a pending purchase order from the POS for an out-of-stock
 * product. Does not create a duplicate while a pending request already exists.
 */
export function createPendingPurchaseOrder(store: AppStore, product: { id: string; name: string; unit: PurchaseOrder['items'][number]['unit']; costPrice: number; minStock?: number }): { created: boolean; alreadyPending: boolean } {
  const alreadyPending = store.purchases.some(
    (p) => p.status === 'Pending' && p.items.some((it) => it.productId === product.id)
  );
  if (alreadyPending) return { created: false, alreadyPending: true };

  const vendor = store.vendors[0];
  const requestQty = Math.max(1, Math.ceil((product.minStock || 1) * 1.5));
  const newPO: PurchaseOrder = {
    id: uid('po'),
    poNumber: nextPurchaseOrderNumber(store.purchases.length),
    vendorId: vendor?.id || 'vendor-1',
    vendorName: vendor?.name || 'WholeSale Supplier',
    branchId: store.activeBranchId,
    items: [
      {
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        quantity: requestQty,
        unitCost: product.costPrice,
        totalCost: requestQty * product.costPrice,
      },
    ],
    totalAmount: requestQty * product.costPrice,
    status: 'Pending',
    createdDate: new Date().toISOString().slice(0, 10),
    notes: `${product.name}: auto-requested from POS (out of stock)`,
  };
  store.setPurchases((prev) => [newPO, ...prev]);
  return { created: true, alreadyPending: false };
}

export function receivePurchaseOrder(store: AppStore, poId: string): void {
  const po = store.purchases.find((p) => p.id === poId);
  if (!po || po.status !== 'Pending') return;

  // 1. Increase product stock & update cost/batch/expiry
  store.setProducts((prev) => {
    const itemsMap = new Map<string, { qty: number; cost: number; batch?: string; expiry?: string }>();
    po.items.forEach((item) => {
      itemsMap.set(item.productId, { qty: item.quantity, cost: item.unitCost, batch: item.batchNumber, expiry: item.expiryDate });
    });
    return prev.map((prod) => {
      const entry = itemsMap.get(prod.id);
      if (entry) {
        return {
          ...prod,
          currentStock: prod.currentStock + entry.qty,
          costPrice: entry.cost || prod.costPrice,
          batchNumber: entry.batch || prod.batchNumber,
          expiryDate: entry.expiry || prod.expiryDate,
        };
      }
      return prod;
    });
  });

  // 2. Log movements
  const movements = po.items.map((item) => ({
    id: uid('mov'),
    productId: item.productId,
    productName: item.productName,
    type: 'purchase' as const,
    quantity: item.quantity,
    unit: item.unit,
    referenceId: po.poNumber,
    batchNumber: item.batchNumber,
    date: new Date().toISOString(),
    notes: `Received Goods from Vendor: ${po.vendorName}`,
    branchId: store.activeBranchId,
    employeeName: store.currentEmployee.name,
  }));
  store.setInventoryMovements((prev) => [...movements, ...prev]);

  // 3. Increase vendor balance (accounts payable)
  store.setVendors((prev) => prev.map((v) => (v.id === po.vendorId ? { ...v, balance: v.balance + po.totalAmount } : v)));

  // 4. Update PO status
  store.setPurchases((prev) =>
    prev.map((p) =>
      p.id === poId ? { ...p, status: 'Received' as const, receivedDate: new Date().toISOString().slice(0, 10) } : p
    )
  );
}

export function payPurchaseOrder(
  store: AppStore,
  poId: string,
  paymentMethod: string = 'Bank Transfer',
  amount?: number
): void {
  const po = store.purchases.find((p) => p.id === poId);
  if (!po || po.status !== 'Received') return;

  const alreadyPaid = po.paidAmount || 0;
  const remaining = Math.max(0, po.totalAmount - alreadyPaid);
  const payment = Math.min(Number(amount) || remaining, remaining);
  if (payment <= 0) return;

  // 1. Reduce vendor balance (accounts payable) by the payment amount only
  store.setVendors((prev) =>
    prev.map((v) => (v.id === po.vendorId ? { ...v, balance: Math.max(0, v.balance - payment) } : v))
  );

  const newPaidAmount = Math.round((alreadyPaid + payment) * 100) / 100;
  const fullyPaid = newPaidAmount >= po.totalAmount - 0.001;
  const newStatus: PurchaseOrder['status'] = fullyPaid ? 'Paid' : 'Received';
  const newPayment: PurchasePayment = {
    id: uid('pay'),
    amount: payment,
    paymentMethod,
    date: new Date().toISOString(),
  };

  store.setPurchases((prev) =>
    prev.map((p) =>
      p.id === poId
        ? {
            ...p,
            paidAmount: newPaidAmount,
            payments: [...(p.payments || []), newPayment],
            status: newStatus,
            paidDate: new Date().toISOString().slice(0, 10),
            paymentMethod,
          }
        : p
    )
  );
}

export interface VendorReturnInput {
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
}

export function processVendorReturn(store: AppStore, returnData: VendorReturnInput): void {
  const vendor = store.vendors.find((v) => v.id === returnData.vendorId);
  const returnNumber = `VR-${Date.now()}`;
  const totalAmount = returnData.items.reduce((sum, item) => sum + item.total, 0);

  // Items returned withOUT replacement physically leave the warehouse -> reduce stock.
  // Items marked for replacement are credited to the vendor but keep their stock (new goods arrive later).
  const stockOutItems = returnData.items.filter((i) => !i.replacement);

  // 1. Decrease inventory stock (only non-replacement lines)
  if (stockOutItems.length > 0) {
    store.setProducts((prev) => {
      const deductMap = new Map<string, number>();
      stockOutItems.forEach((i) => deductMap.set(i.productId, (deductMap.get(i.productId) || 0) + i.quantity));
      return prev.map((p) => {
        const qty = deductMap.get(p.id);
        if (qty) {
          return { ...p, currentStock: Math.max(0, p.currentStock - qty) };
        }
        return p;
      });
    });
  }

  // 2. Log movements (only non-replacement lines)
  if (stockOutItems.length > 0) {
    const movements = stockOutItems.map((item) => ({
      id: uid('mov'),
      productId: item.productId,
      productName: item.productName,
      type: 'vendor_return' as const,
      quantity: -item.quantity,
      unit: store.products.find((p) => p.id === item.productId)?.unit || ('Piece' as const),
      referenceId: returnNumber,
      date: new Date().toISOString(),
      notes: `Returned to Vendor ${vendor?.name}: ${returnData.reason}`,
      branchId: store.activeBranchId,
      employeeName: store.currentEmployee.name,
    }));
    store.setInventoryMovements((prev) => [...movements, ...prev]);
  }

  // 3. Reduce vendor balance (payable) for the returned value (credit memo)
  if (vendor) {
    store.setVendors((prev) => prev.map((v) => (v.id === vendor.id ? { ...v, balance: Math.max(0, v.balance - totalAmount) } : v)));
  }

  // 3b. Deduct returned quantities from the source purchase order WITHOUT deleting the lines.
  //     The line keeps the record; its remaining quantity shrinks so it cannot be returned twice.
  if (returnData.sourcePoId) {
    store.setPurchases((prev) =>
      prev.map((po) => {
        if (po.id !== returnData.sourcePoId) return po;
        const items = po.items.map((poItem) => {
          const returned = returnData.items.find(
            (r) => r.productId === poItem.productId && r.quantity > 0
          );
          if (!returned) return poItem;
          const remaining = Math.max(0, poItem.quantity - returned.quantity);
          return {
            ...poItem,
            quantity: remaining,
            totalCost: Number((remaining * poItem.unitCost).toFixed(2)),
          };
        });
        return {
          ...po,
          items,
          totalAmount: Number(items.reduce((sum, it) => sum + it.totalCost, 0).toFixed(2)),
        };
      })
    );
  }

  // 4. Save vendor return memo (editable copy of the PO with replacement flags)
  store.setVendorReturns((prev) => [
    {
      id: uid('vr'),
      returnNumber,
      vendorId: returnData.vendorId,
      vendorName: vendor?.name || 'Vendor',
      branchId: store.activeBranchId,
      sourcePoId: returnData.sourcePoId,
      sourcePoNumber: returnData.sourcePoNumber,
      items: returnData.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        unit: store.products.find((p) => p.id === i.productId)?.unit || ('Piece' as const),
        quantity: i.quantity,
        unitCost: i.unitCost,
        totalCost: i.total,
        replacement: i.replacement || false,
      })),
      totalAmount,
      date: new Date().toISOString(),
      reason: returnData.reason,
    },
    ...prev,
  ]);
}