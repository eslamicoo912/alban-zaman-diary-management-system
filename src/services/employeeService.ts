import type { Asset, Branch, Employee, Loan } from '../types';
import type { AppStore } from './store';
import { nextLoanNumber, uid } from './idGenerator';

export function addBranch(store: AppStore, branchData: Omit<Branch, 'id'>): Branch {
  const newBranch: Branch = { ...branchData, id: uid('br') };
  store.setBranches((prev) => [...prev, newBranch]);
  return newBranch;
}

export function addEmployee(store: AppStore, empData: Omit<Employee, 'id'> & { id?: string }): Employee {
  const newEmp: Employee = { ...empData, id: empData.id || uid('emp') };
  store.setEmployees((prev) => [...prev, newEmp]);
  return newEmp;
}

export function updateEmployee(store: AppStore, emp: Employee): void {
  store.setEmployees((prev) => prev.map((e) => (e.id === emp.id ? emp : e)));
}

export function addAsset(store: AppStore, assetData: Omit<Asset, 'id' | 'branchId'>): Asset {
  const newAsset: Asset = { ...assetData, id: uid('ast'), branchId: store.activeBranchId };
  store.setAssets((prev) => [newAsset, ...prev]);
  return newAsset;
}

export function addLoan(store: AppStore, loanData: Omit<Loan, 'id' | 'loanNumber' | 'paidAmount' | 'remainingBalance' | 'status'>): Loan {
  const newLoan: Loan = {
    ...loanData,
    id: uid('loan'),
    loanNumber: nextLoanNumber(store.loans.length),
    paidAmount: 0,
    remainingBalance: loanData.principal,
    status: 'Active',
  };
  store.setLoans((prev) => [newLoan, ...prev]);
  return newLoan;
}

export function payLoanInstallment(store: AppStore, loanId: string, amount: number): void {
  store.setLoans((prev) =>
    prev.map((l) => {
      if (l.id === loanId) {
        const newPaid = l.paidAmount + amount;
        const newRemaining = Math.max(0, l.remainingBalance - amount);
        return {
          ...l,
          paidAmount: newPaid,
          remainingBalance: newRemaining,
          status: newRemaining === 0 ? ('Settled' as const) : ('Active' as const),
        };
      }
      return l;
    })
  );
}