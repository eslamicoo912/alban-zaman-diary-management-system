import type { CashAdvance, Expense, Salary, Shift } from '../types';
import type { AppStore } from './store';
import { uid } from './idGenerator';

export function addExpense(store: AppStore, input: Omit<Expense, 'id' | 'branchId' | 'employeeId' | 'employeeName'>): Expense {
  const newExp: Expense = {
    ...input,
    id: uid('exp'),
    branchId: store.activeBranchId,
    employeeId: store.currentEmployee.id,
    employeeName: store.currentEmployee.name,
  };

  if (store.activeShift && input.paymentMethod === 'cash') {
    const updatedShift: Shift = {
      ...store.activeShift,
      expensesCash: store.activeShift.expensesCash + input.amount,
      expectedCash: store.activeShift.expectedCash - input.amount,
    };
    store.setActiveShift(updatedShift);
    store.setShifts((prev) => prev.map((s) => (s.id === updatedShift.id ? updatedShift : s)));
  }

  store.setExpenses((prev) => [newExp, ...prev]);
  return newExp;
}

export function paySalary(
  store: AppStore,
  salaryIdOrEmpId: string,
  methodOrBase?: any,
  bonus?: number,
  deductions?: number,
  month?: string
): void {
  if (typeof methodOrBase === 'number') {
    const emp = store.employees.find((e) => e.id === salaryIdOrEmpId);
    const newSalary: Salary = {
      id: uid('sal'),
      employeeId: salaryIdOrEmpId,
      employeeName: emp?.name || 'Staff Member',
      monthYear: month || new Date().toISOString().slice(0, 7),
      month: month || new Date().toISOString().slice(0, 7),
      basicSalary: methodOrBase,
      baseSalary: methodOrBase,
      allowances: bonus || 0,
      bonuses: bonus || 0,
      bonus: bonus || 0,
      deductions: deductions || 0,
      advances: 0,
      netSalary: methodOrBase + (bonus || 0) - (deductions || 0),
      status: 'Paid',
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMethod: 'bank',
    };
    store.setSalaries((prev) => [newSalary, ...prev]);
    return;
  }

  store.setSalaries((prev) =>
    prev.map((s) => {
      if (s.id === salaryIdOrEmpId) {
        return {
          ...s,
          status: 'Paid' as const,
          paymentDate: new Date().toISOString().slice(0, 10),
          paymentMethod: methodOrBase || 'bank',
        };
      }
      return s;
    })
  );
}

export function recordCashAdvance(
  store: AppStore,
  input: { employeeId: string; amount: number; notes?: string }
): boolean {
  const emp = store.employees.find((e) => e.id === input.employeeId);
  if (!emp || input.amount <= 0) return false;

  const monthYear = new Date().toISOString().slice(0, 7);
  const advance: CashAdvance = {
    id: uid('adv'),
    employeeId: input.employeeId,
    employeeName: emp.name,
    amount: Math.round(input.amount * 100) / 100,
    date: new Date().toISOString(),
    monthYear,
    branchId: store.activeBranchId,
    notes: input.notes,
    status: 'pending_deduction',
  };
  store.setCashAdvances((prev) => [advance, ...prev]);
  return true;
}

export function generateMonthlyPayroll(store: AppStore, monthYear: string): void {
  const newSalaries: Salary[] = store.employees.map((emp) => {
    const basicSalary = emp.baseSalary ?? emp.salary ?? 0;
    const allowances = 300;
    const deductions = 0;

    // Sum every cash advance still pending deduction (regardless of the month
    // it was granted), deduct them from the employee's base salary, then mark
    // them as settled against the generated salary.
    const pendingSum = store.cashAdvances
      .filter(
        (a) =>
          a.employeeId === emp.id &&
          a.status === 'pending_deduction'
      )
      .reduce((s, a) => s + a.amount, 0);

    const adv = Math.min(pendingSum, Math.max(0, basicSalary + allowances - deductions));
    const newSalary: Salary = {
      id: uid('sal'),
      employeeId: emp.id,
      employeeName: emp.name,
      monthYear,
      basicSalary,
      allowances,
      deductions,
      advances: Math.round(adv * 100) / 100,
      netSalary: basicSalary + allowances - deductions - adv,
      status: 'Pending',
    };

    if (adv > 0) {
      store.setCashAdvances((prev) =>
        prev.map((a) =>
          a.employeeId === emp.id && a.status === 'pending_deduction'
            ? { ...a, status: 'deducted' as const, salaryId: newSalary.id }
            : a
        )
      );
    }

    return newSalary;
  });
  store.setSalaries((prev) => [...newSalaries, ...prev]);
}