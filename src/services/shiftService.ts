import type { Shift } from '../types';
import type { AppStore } from './store';
import { nextShiftNumber, uid } from './idGenerator';

export function openShift(store: AppStore, openingCash: number, notes?: string, empId?: string): Shift {
  let emp = store.currentEmployee;
  if (empId) {
    const found = store.employees.find((e) => e.id === empId);
    if (found) {
      emp = found;
      store.setCurrentEmployeeId(empId);
    }
  }
  const newShift: Shift = {
    id: uid('shift'),
    shiftNumber: nextShiftNumber(store.shifts.length),
    branchId: store.activeBranchId,
    registerId: store.activeRegisterId,
    employeeId: emp.id,
    employeeName: emp.name,
    openedAt: new Date().toISOString(),
    openingCash,
    cashSales: 0,
    vodafoneCashSales: 0,
    instapaySales: 0,
    cashRefunds: 0,
    expensesCash: 0,
    expectedCash: openingCash,
    totalProfit: 0,
    status: 'Open',
    notes,
  };
  store.setActiveShift(newShift);
  store.setShifts((prev) => [newShift, ...prev]);
  return newShift;
}

export function closeShift(store: AppStore, actualCash: number, notes?: string): Shift | null {
  if (!store.activeShift) return null;
  const difference = actualCash - store.activeShift.expectedCash;
  const closedShift: Shift = {
    ...store.activeShift,
    closedAt: new Date().toISOString(),
    actualCash,
    difference,
    status: 'Closed',
    notes: notes ? `${store.activeShift.notes || ''} | ${notes}` : store.activeShift.notes,
  };
  store.setActiveShift(null);
  store.setShifts((prev) => prev.map((s) => (s.id === closedShift.id ? closedShift : s)));
  return closedShift;
}