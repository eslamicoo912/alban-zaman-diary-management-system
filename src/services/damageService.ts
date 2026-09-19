import type { DamagedGoodsEntry, DamageType } from '../types';
import type { AppStore } from './store';
import { uid } from './idGenerator';

export interface DamageGoodsInput {
  productId: string;
  quantity: number;
  damageType: DamageType;
  notes?: string;
}

/**
 * Records damaged / expired / destroyed / lost goods: the quantity leaves the
 * warehouse (stock is reduced and an audit movement is logged) and a reportable
 * loss entry is appended so the owner can track spoilage across the dairy line.
 */
export function recordDamagedGoods(store: AppStore, input: DamageGoodsInput): boolean {
  const prod = store.products.find((p) => p.id === input.productId);
  if (!prod || input.quantity <= 0 || prod.currentStock < input.quantity) return false;

  const lossValue = Number((input.quantity * prod.costPrice).toFixed(2));
  const damageNumber = `DMG-${new Date().toISOString().slice(0, 10)}-${store.damagedGoods.length + 1}`;

  // 1. Remove the quantity from stock
  store.setProducts((prev) =>
    prev.map((p) => (p.id === prod.id ? { ...p, currentStock: Math.max(0, p.currentStock - input.quantity) } : p))
  );

  // 2. Audit movement
  const record = {
    id: uid('mov'),
    productId: prod.id,
    productName: prod.name,
    type: 'damage' as const,
    quantity: -input.quantity,
    unit: prod.unit,
    referenceId: damageNumber,
    batchNumber: prod.batchNumber,
    date: new Date().toISOString(),
    notes: `Damaged/lost goods (${input.damageType}): ${input.notes || ''}`,
    branchId: store.activeBranchId,
    employeeName: store.currentEmployee.name,
  };
  store.setInventoryMovements((prev) => [record, ...prev]);

  // 3. Append the loss entry for reporting
  const entry: DamagedGoodsEntry = {
    id: uid('dmg'),
    damageNumber,
    productId: prod.id,
    productName: prod.name,
    unit: prod.unit,
    quantity: input.quantity,
    damageType: input.damageType,
    unitCost: prod.costPrice,
    lossValue,
    date: new Date().toISOString(),
    branchId: store.activeBranchId,
    employeeName: store.currentEmployee.name,
    notes: input.notes,
  };
  store.setDamagedGoods((prev) => [entry, ...prev]);

  return true;
}