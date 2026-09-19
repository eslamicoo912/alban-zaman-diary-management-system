import type { InventoryMovement } from '../types';
import type { AppStore } from './store';
import { uid } from './idGenerator';

function movement(
  store: AppStore,
  input: {
    productId: string;
    productName: string;
    type: InventoryMovement['type'];
    quantity: number;
    unit: InventoryMovement['unit'];
    referenceId: string;
    batchNumber?: string;
    notes: string;
  }
): InventoryMovement {
  return {
    id: uid('mov'),
    ...input,
    date: new Date().toISOString(),
    branchId: store.activeBranchId,
    employeeName: store.currentEmployee.name,
  };
}

/** Manual stock adjustment (positive or negative delta). */
export function adjustStock(store: AppStore, productId: string, quantityDelta: number, reason: string): void {
  const prod = store.products.find((p) => p.id === productId);
  if (!prod) return;

  const newStock = Math.max(0, prod.currentStock + quantityDelta);
  store.setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, currentStock: newStock } : p)));

  const record = movement(store, {
    productId: prod.id,
    productName: prod.name,
    type: 'adjustment',
    quantity: quantityDelta,
    unit: prod.unit,
    referenceId: 'ADJUSTMENT',
    batchNumber: prod.batchNumber,
    notes: reason || 'Manual stock adjustment',
  });
  store.setInventoryMovements((prev) => [record, ...prev]);
}

/** Moves a quantity of a product out of the active branch toward another. */
export function transferStock(store: AppStore, productId: string, quantity: number, targetBranchId: string, notes?: string): void {
  const prod = store.products.find((p) => p.id === productId);
  if (!prod || prod.currentStock < quantity) return;

  store.setProducts((prev) =>
    prev.map((p) => (p.id === productId ? { ...p, currentStock: p.currentStock - quantity } : p))
  );

  const targetBranch = store.branches.find((b) => b.id === targetBranchId);
  const record = movement(store, {
    productId: prod.id,
    productName: prod.name,
    type: 'branch_transfer',
    quantity: -quantity,
    unit: prod.unit,
    referenceId: `TRF-TO-${targetBranch?.code || targetBranchId}`,
    batchNumber: prod.batchNumber,
    notes: `Transfer from ${store.branches.find((b) => b.id === store.activeBranchId)?.name || store.activeBranchId} to ${targetBranch?.name || targetBranchId}: ${notes || ''}`,
  });
  store.setInventoryMovements((prev) => [record, ...prev]);
}

/** Records the initial stock movement created on product addition. */
export function recordInitialStock(store: AppStore, productId: string, productName: string, quantity: number, unit: InventoryMovement['unit'], batchNumber: string): void {
  if (quantity <= 0) return;
  const record = movement(store, {
    productId,
    productName,
    type: 'adjustment',
    quantity,
    unit,
    referenceId: 'INITIAL-STOCK',
    batchNumber,
    notes: 'Initial product stock creation',
  });
  store.setInventoryMovements((prev) => [record, ...prev]);
}