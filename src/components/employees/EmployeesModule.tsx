import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { apiFetch } from '../../api/client';
import { UserRole, Employee, Shift } from '../../types';
import { 
  Users, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  Plus, 
  ShieldCheck,
  Eye,
  ListChecks,
  HandCoins,
  Wallet,
  CalendarDays,
  X,
  DatabaseBackup
} from 'lucide-react';

export const EmployeesModule: React.FC = () => {
  const {
    t,
    employees,
    activeShift,
    shifts,
    branches,
    sales,
    returns,
    salaries,
    cashAdvances,
    openShift,
    closeShift,
    addEmployee,
    updateEmployee,
    paySalary,
    generateMonthlyPayroll,
    recordCashAdvance,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'shift' | 'employees' | 'history' | 'payroll'>('shift');

  // Payroll + cash advances state
  const [payrollMonth, setPayrollMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceEmpId, setAdvanceEmpId] = useState(employees[0]?.id || '');
  const [advanceAmount, setAdvanceAmount] = useState<number>(500);
  const [advanceNotes, setAdvanceNotes] = useState('');

  const handleGeneratePayroll = () => {
    generateMonthlyPayroll(payrollMonth);
  };

  const handleRecordAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceEmpId || advanceAmount <= 0) return;
    recordCashAdvance({ employeeId: advanceEmpId, amount: advanceAmount, notes: advanceNotes });
    setShowAdvanceModal(false);
    setAdvanceNotes('');
  };

  // Open Shift Form
  const [openCashAmount, setOpenCashAmount] = useState<number>(500);
  const [selectedCashierId, setSelectedCashierId] = useState(employees[0]?.id || '');

  // Close Shift Form
  const [actualCashCount, setActualCashCount] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState('');
  const [shiftMsg, setShiftMsg] = useState<string | null>(null);

  // New Employee Modal
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [empForm, setEmpForm] = useState({
    name: '',
    nameAr: '',
    role: 'cashier' as UserRole,
    phone: '',
    branchId: branches[0]?.id || 'br-1',
    baseSalary: 4500,
  });
  const [createError, setCreateError] = useState<string | null>(null);

  // Per-employee transactions modal
  const [trackEmp, setTrackEmp] = useState<Employee | null>(null);

  // Shift detailed summary modal
  const [shiftDetail, setShiftDetail] = useState<Shift | null>(null);

  const handleStartShift = (e: React.FormEvent) => {
    e.preventDefault();
    openShift(openCashAmount, undefined, selectedCashierId);
  };

  const handleEndShift = async (e: React.FormEvent) => {
    e.preventDefault();
    // Create an auto-backup in the backup/ folder before closing the session
    setShiftMsg(null);
    try {
      const bkp: any = await apiFetch('/backup', { method: 'POST', body: '{}' });
      if (bkp && bkp.ok && bkp.file) {
        setShiftMsg(`تم إنشاء نسخة احتياطية: ${bkp.file} 📁`
        );
      } else {
        setShiftMsg(`تعذر إنشاء النسخة الاحتياطية: ${bkp?.error || ''}`);
      }
    } catch {
      setShiftMsg('تعذر إنشاء النسخة الاحتياطية (الخادم غير متاح)');
    }
    closeShift(actualCashCount, closingNotes);
  };

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!empForm.name.trim()) return;

    const employeeCode = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
    addEmployee({
      name: empForm.name.trim(),
      nameAr: empForm.nameAr.trim() || undefined,
      employeeCode,
      position: empForm.role,
      role: empForm.role,
      phone: empForm.phone.trim(),
      branchId: empForm.branchId,
      salary: empForm.baseSalary,
      baseSalary: empForm.baseSalary,
      status: 'Active',
    });

    setEmpForm({
      name: '',
      nameAr: '',
      role: 'cashier',
      phone: '',
      branchId: branches[0]?.id || 'br-1',
      baseSalary: 4500,
    });
    setShowAddEmpModal(false);
  };

  // Compute an employee's transaction summary (sales, returns, today, totals)
  const empTransactions = (emp: Employee) => {
    const empSales = sales.filter(s => s.employeeId === emp.id || s.employeeName === emp.name);
    const empReturns = returns.filter(r => r.employeeId === emp.id || r.employeeName === emp.name);
    const today = new Date().toISOString().slice(0, 10);
    const todaySales = empSales.filter(s => s.date.slice(0, 10) === today);
    const revenue = empSales.filter(s => s.status !== 'Cancelled').reduce((a, s) => a + s.total, 0);
    const profit = empSales.filter(s => s.status !== 'Cancelled').reduce((a, s) => a + s.totalProfit, 0);
    const refunds = empReturns.reduce((a, r) => a + r.totalRefundAmount, 0);
    return { empSales, empReturns, todaySales, revenue, profit, refunds };
  };

  // Detailed end-of-shift summary: per-product quantities, payments, profit
  const shiftSummary = (shift: Shift) => {
    const shiftSales = sales.filter(s => s.shiftId === shift.id);
    const productMap = new Map<string, { name: string; nameAr?: string; qty: number; total: number; cost: number }>();
    shiftSales.forEach(s => {
      s.items.forEach(it => {
        const key = it.productId || it.productName;
        const cur = productMap.get(key) || { name: it.productName, nameAr: it.productNameAr, qty: 0, total: 0, cost: 0 };
        cur.qty += it.quantity;
        cur.total += it.lineTotal;
        cur.cost += it.costPrice * it.quantity;
        productMap.set(key, cur);
      });
    });
    const sum = (method: 'cash' | 'vodafone_cash' | 'instapay') =>
      shiftSales.reduce((a, s) => a + s.payments.filter(p => p.method === method).reduce((x, p) => x + p.amount, 0), 0);
    const applicable = shiftSales.filter(s => s.status !== 'Cancelled');
    const revenue = applicable.reduce((a, s) => a + s.total, 0);
    const profit = applicable.reduce((a, s) => a + s.totalProfit, 0);
    const refunds = returns.filter(r => shiftSales.some(s => s.id === r.originalSaleId)).reduce((a, r) => a + r.totalRefundAmount, 0);
    return {
      shiftSales,
      products: Array.from(productMap.values()),
      cash: sum('cash'),
      vodafoneCash: sum('vodafone_cash'),
      instapay: sum('instapay'),
      revenue,
      profit,
      refunds,
    };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.employeesTitle}</h2>
          <p className="text-xs text-slate-500">
            {'إدارة ورديات الكاشير، عهدة الصندوق النقدية، وفرق الموازنة عند الإغلاق'}
          </p>
        </div>

        <button
          onClick={() => setShowAddEmpModal(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-98 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>{t.addEmployee}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('shift')}
          className={`border-b-2 pb-2 px-3 transition-all ${
            activeTab === 'shift'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.activeShiftTitle} {activeShift ? '🟢' : '⚪'}
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`border-b-2 pb-2 px-3 transition-all ${
            activeTab === 'employees'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.staffDirectory} ({employees.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`border-b-2 pb-2 px-3 transition-all ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.pastShiftsAudit}
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`border-b-2 pb-2 px-3 transition-all ${
            activeTab === 'payroll'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.payrollTab} ({salaries.length})
        </button>
      </div>

      {/* Tab 1: Active Shift Drawer Management */}
      {activeTab === 'shift' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {shiftMsg && (
            <div className="flex items-start justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 lg:col-span-3">
              <span className="flex items-center gap-2">
                <DatabaseBackup className="h-4 w-4 shrink-0" />
                {shiftMsg}
              </span>
              <button onClick={() => setShiftMsg(null)} className="shrink-0 text-emerald-500 hover:text-emerald-800">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {activeShift ? (
            <>
              {/* Shift Overview Metrics Card */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5 lg:col-span-2">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      {t.shiftInProgress}
                    </span>
                    <h3 className="mt-2 text-base font-black text-slate-900">
                      {activeShift.employeeName}
                    </h3>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>Opened: {new Date(activeShift.openedAt || activeShift.startTime || Date.now()).toLocaleTimeString()}</div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(activeShift.openedAt || activeShift.startTime || Date.now()).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Realtime Reconciliation Balance Grid */}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <span className="text-[11px] font-semibold text-slate-500">{t.openingCash}</span>
                    <div className="mt-1 font-mono text-base font-bold text-slate-800">
                      {(activeShift.openingCash || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <span className="text-[11px] font-semibold text-slate-500">{t.cashSales}</span>
                    <div className="mt-1 font-mono text-base font-bold text-emerald-600">
                      +{(activeShift.cashSales || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <span className="text-[11px] font-semibold text-slate-500">{t.cashExpenses}</span>
                    <div className="mt-1 font-mono text-base font-bold text-rose-600">
                      -{(activeShift.expensesCash || (activeShift as any).cashExpenses || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3">
                    <span className="text-[11px] font-bold text-emerald-800">{t.expectedCash}</span>
                    <div className="mt-1 font-mono text-lg font-black text-emerald-700">
                      {(activeShift.expectedCash || 0).toFixed(2)} {t.currency}
                    </div>
                  </div>
                </div>

                {/* Additional non-cash stats */}
                <div className="mt-4 flex flex-wrap items-center justify-between rounded-xl bg-slate-100 p-3 text-xs text-slate-600">
                  <span>{t.vodafoneCashSales}: <b>{(activeShift.vodafoneCashSales || 0).toFixed(2)} {t.currency}</b></span>
                  <span>{t.instapaySales}: <b>{(activeShift.instapaySales || 0).toFixed(2)} {t.currency}</b></span>
                  <span className="font-bold text-emerald-700">{t.netProfit}: <b>{(activeShift.totalProfit || 0).toFixed(2)} {t.currency}</b></span>
                  <span>Total Invoices: <b>{activeShift.totalSalesCount || 0} transactions</b></span>
                </div>
              </div>

              {/* Shift End Drawer Action Box */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900">{t.endShift}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  عدّ العملات الورقية والمعدنية الموجودة فعلياً في الدرج وأدخل المبلغ الدقيق:
                </p>

                <form onSubmit={handleEndShift} className="mt-4 space-y-3 text-xs">
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">{t.actualCash} ({t.currency}) *</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={actualCashCount || ''}
                      onChange={e => setActualCashCount(parseFloat(e.target.value) || 0)}
                      placeholder="مثال: 1420.50"
                      className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-base font-bold text-slate-900"
                    />
                  </div>

                  {/* Live Difference Indicator */}
                  {actualCashCount > 0 && (
                    <div
                      className={`rounded-xl p-3 text-xs font-bold ${
                        actualCashCount === activeShift.expectedCash
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : actualCashCount > activeShift.expectedCash
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      <div className="flex justify-between">
                        <span>{t.difference}:</span>
                        <span className="font-mono">
                          {(actualCashCount - activeShift.expectedCash).toFixed(2)} {t.currency}
                        </span>
                      </div>
                      <div className="text-[10px] font-normal mt-0.5">
                        {actualCashCount === activeShift.expectedCash
                          ? 'تطابق تام! لا يوجد فرق نقدي.'
                          : actualCashCount > activeShift.expectedCash
                          ? 'زيادة نقدية (فائض)'
                          : 'عجز نقدي'}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">ملاحظات الإغلاق / سبب الاختلاف</label>
                    <textarea
                      rows={2}
                      value={closingNotes}
                      onChange={e => setClosingNotes(e.target.value)}
                      placeholder="مثال: فرق تقريب بسيط في تغيير العملة"
                      className="w-full rounded-xl border border-slate-200 p-2 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 text-xs font-bold text-white hover:bg-slate-900"
                  >
                    <Lock className="h-4 w-4" />
                    <span>{t.closeShiftBtn}</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Open New Shift Form */
            <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Unlock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{t.openShift}</h3>
                  <p className="text-xs text-slate-500">لا توجد وردية مفتوحة حالياً. افتح وردية لتفعيل البيع.</p>
                </div>
              </div>

              <form onSubmit={handleStartShift} className="mt-5 space-y-4 text-xs">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">{t.selectCashier}</label>
                  <select
                    value={selectedCashierId}
                    onChange={e => setSelectedCashierId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-medium"
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700">{t.openingCash} ({t.currency}) *</label>
                  <input
                    type="number"
                    step="50"
                    required
                    value={openCashAmount}
                    onChange={e => setOpenCashAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-base font-bold"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">رصيد الصندوق المُودع في الدرج عند افتتاح الصباح.</p>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-98 transition-all"
                >
                  {t.startShiftBtn}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Employees Directory */}
      {activeTab === 'employees' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs rtl:text-right">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
              <tr>
                <th className="py-3 px-4">{t.employeeName}</th>
                <th className="py-3 px-3">{t.role}</th>
                <th className="py-3 px-3">{'الفرع'}</th>
                <th className="py-3 px-3">{'الجوال'}</th>
                <th className="py-3 px-3 text-right rtl:text-left">{t.baseSalary}</th>
                <th className="py-3 px-4 text-center">{t.status}</th>
                <th className="py-3 px-4 text-center">{'إجراءات'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map(emp => {
                const branch = branches.find(b => b.id === emp.branchId);
                const tx = empTransactions(emp);
                return (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {emp.nameAr || emp.name}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 capitalize">
                        <ShieldCheck className="h-3 w-3 text-blue-600" />
                        {emp.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{branch?.nameAr || branch?.name}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{emp.phone}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 rtl:text-left">
                      {((emp.baseSalary ?? emp.salary) || 0).toFixed(2)} {t.currency}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {'نشط'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1 rtl:justify-start">
                        <button
                          onClick={() => setTrackEmp(emp)}
                          title={'العمليات'}
                          className="rounded-lg bg-indigo-50 p-1.5 text-indigo-700 hover:bg-indigo-100"
                        >
                          <ListChecks className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Shift History */}
      {activeTab === 'history' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs rtl:text-right">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
              <tr>
                <th className="py-3 px-4">{'الكاشير'}</th>
                <th className="py-3 px-3">{'الفترة الزمنية'}</th>
                <th className="py-3 px-3 text-right rtl:text-left">{'العهدة'}</th>
                <th className="py-3 px-3 text-right rtl:text-left">{'المتوقع كاش'}</th>
                <th className="py-3 px-3 text-right rtl:text-left">{'التطابق الفعلي'}</th>
                <th className="py-3 px-3 text-right rtl:text-left">{'الفرق'}</th>
                <th className="py-3 px-4 text-center">{t.status}</th>
                <th className="py-3 px-4 text-center">{'موجز اليوم'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shifts.map(s => {
                const diff = s.difference || 0;
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{s.employeeName}</td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      <div>
                        {new Date(s.openedAt || s.startTime || Date.now()).toLocaleTimeString()} -{' '}
                        {s.closedAt || s.endTime ? new Date(s.closedAt || s.endTime!).toLocaleTimeString() : ('مفتوحة')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(s.openedAt || s.startTime || Date.now()).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600 rtl:text-left">
                      {(s.openingCash || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 rtl:text-left">
                      {(s.expectedCash || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800 rtl:text-left">
                      {s.actualCash !== undefined ? Number(s.actualCash).toFixed(2) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold rtl:text-left">
                      {s.actualCash !== undefined ? (
                        <span className={diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-blue-600' : 'text-rose-600'}>
                          {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          s.status === 'Open'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {s.status === 'Open' ? ('مفتوحة') : ('مغلقة')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setShiftDetail(s)}
                        title={'موجز اليوم'}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100"
                      >
                        <Eye className="h-3 w-3" />
                        {'الموجز'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Payroll & Cash Advances */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              <label className="text-xs font-bold text-slate-700">شهر المسير:</label>
              <input
                type="month"
                value={payrollMonth}
                onChange={e => setPayrollMonth(e.target.value)}
                className="rounded-xl border border-slate-200 px-2.5 py-1.5 font-mono text-xs font-bold focus:border-blue-500 focus:outline-hidden"
              />
              <button
                onClick={handleGeneratePayroll}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/25 hover:bg-emerald-700 transition-all active:scale-98"
              >
                <ListChecks className="h-4 w-4" />
                توليد مسير الشهر
              </button>
            </div>
            <button
              onClick={() => setShowAdvanceModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 transition-all active:scale-98"
            >
              <HandCoins className="h-4 w-4" />
              تسجيل سلفة نقدية
            </button>
          </div>

          {/* Payroll table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs rtl:text-right">
                <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
                  <tr>
                    <th className="py-3 px-4">الموظف</th>
                    <th className="py-3 px-3 text-right rtl:text-left">{t.baseSalary}</th>
                    <th className="py-3 px-3 text-right rtl:text-left">بدلات</th>
                    <th className="py-3 px-3 text-right rtl:text-left">خصومات</th>
                    <th className="py-3 px-3 text-right rtl:text-left">سلف مستحقة</th>
                    <th className="py-3 px-3 text-right rtl:text-left">صافي الراتب</th>
                    <th className="py-3 px-3">الشهر</th>
                    <th className="py-3 px-3 text-center">الحالة</th>
                    <th className="py-3 px-3 text-center">إجراء</th>
                    <th className="py-3 px-4">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salaries.filter(s => s.monthYear === payrollMonth).length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        لا يوجد مسير لهذا الشهر — اضغط «توليد مسير الشهر».
                      </td>
                    </tr>
                  ) : (
                    salaries
                      .filter(s => s.monthYear === payrollMonth)
                      .map(s => (
                        <tr key={s.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-bold text-slate-900">{s.employeeName}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 rtl:text-left">
                            {s.basicSalary.toFixed(2)} {t.currency}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600 rtl:text-left">
                            {(s.allowances + (s.bonuses || s.bonus || 0)).toFixed(2)} {t.currency}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-rose-600 rtl:text-left">
                            -{s.deductions.toFixed(2)} {t.currency}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold rtl:text-left">
                            {s.advances > 0 ? (
                              <span className="text-amber-700">-{s.advances.toFixed(2)}</span>
                            ) : (
                              <span className="text-slate-400">0.00</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-700 rtl:text-left">
                            {s.netSalary.toFixed(2)} {t.currency}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500">{s.monthYear}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              s.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {s.status === 'Paid' ? 'مصروف' : 'معلق'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {s.status === 'Pending' ? (
                              <button
                                onClick={() => paySalary(s.id, 'cash')}
                                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-700"
                              >
                                <Wallet className="h-3.5 w-3.5" />
                                {t.paySalary}
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-600">✓ مصروف</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Eye
                              onClick={() => setTrackEmp(employees.find(e => e.id === s.employeeId) || null)}
                              className="inline h-4 w-4 cursor-pointer text-slate-400 hover:text-blue-600"
                            />
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cash advances table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                <HandCoins className="h-4 w-4 text-blue-500" />
                سجل السلف النقدية
              </div>
              <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                إجمالي غير المخصوم: {cashAdvances.filter(a => a.status === 'pending_deduction').reduce((s, a) => s + a.amount, 0).toFixed(2)} {t.currency}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs rtl:text-right">
                <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
                  <tr>
                    <th className="py-2.5 px-4">الموظف</th>
                    <th className="py-2.5 px-3">المبلغ</th>
                    <th className="py-2.5 px-3">التاريخ</th>
                    <th className="py-2.5 px-3">شهر الخصم</th>
                    <th className="py-2.5 px-3 text-center">الحالة</th>
                    <th className="py-2.5 px-4">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cashAdvances.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        لا توجد سلف مسجلة — اضغط «تسجيل سلفة نقدية».
                      </td>
                    </tr>
                  ) : (
                    cashAdvances.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-bold text-slate-800">{a.employeeName}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-700">
                          {a.amount.toFixed(2)} {t.currency}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {new Date(a.date).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{a.monthYear}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            a.status === 'deducted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {a.status === 'deducted' ? 'تم الخصم من الراتب' : 'بانتظار الخصم'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 text-[11px]">{a.notes || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddEmpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">{t.addEmployee}</h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              أنشئ سجلاً للموظف ليظهر اسمه عند فتح الورديات.
            </p>
            <form onSubmit={handleCreateEmployee} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={empForm.name}
                  onChange={e => setEmpForm({ ...empForm, name: e.target.value })}
                  placeholder="مثال: ياسر العتيبي"
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">الاسم بالعربية</label>
                <input
                  type="text"
                  value={empForm.nameAr}
                  onChange={e => setEmpForm({ ...empForm, nameAr: e.target.value })}
                  placeholder="مثال: ياسر العتيبي"
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">{t.role}</label>
                  <select
                    value={empForm.role}
                    onChange={e => setEmpForm({ ...empForm, role: e.target.value as UserRole })}
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  >
                    <option value="cashier">كاشير</option>
                    <option value="manager">مدير</option>
                    <option value="admin">مدير النظام</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">الفرع</label>
                  <select
                    value={empForm.branchId}
                    onChange={e => setEmpForm({ ...empForm, branchId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">الهاتف</label>
                  <input
                    type="tel"
                    value={empForm.phone}
                    onChange={e => setEmpForm({ ...empForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">{t.baseSalary} ({t.currency})</label>
                  <input
                    type="number"
                    step="100"
                    value={empForm.baseSalary}
                    onChange={e => setEmpForm({ ...empForm, baseSalary: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold"
                  />
                </div>
              </div>

              {createError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddEmpModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
<button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-98 transition-all"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Transactions Modal */}
      {trackEmp && (() => {
        const tx = empTransactions(trackEmp);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs" onClick={() => setTrackEmp(null)}>
            <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-3">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-indigo-600" />
                  <div>
                    <div className="text-sm font-black text-slate-900">{`عمليات ${trackEmp.nameAr ? trackEmp.nameAr : trackEmp.name}`}</div>
                    <div className="text-[11px] text-slate-500">{`إجمالي ${tx.empSales.length} فاتورة • ${tx.empReturns.length} مرتجع`}</div>
                  </div>
                </div>
                <button onClick={() => setTrackEmp(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200" aria-label="إغلاق">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-emerald-50 p-3">
                    <div className="text-[10px] font-bold text-emerald-600">{'مبيعات اليوم'}</div>
                    <div className="mt-0.5 text-lg font-black text-slate-900">{tx.todaySales.length}</div>
                    <div className="text-[11px] font-bold text-emerald-700">{tx.todaySales.reduce((a, s) => a + s.total, 0).toFixed(2)} {t.currency}</div>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3">
                    <div className="text-[10px] font-bold text-blue-600">{'إجمالي الإيرادات'}</div>
                    <div className="mt-0.5 text-lg font-black text-slate-900">{tx.revenue.toFixed(2)} {t.currency}</div>
                    <div className="text-[11px] font-bold text-blue-700">{'فاتورة'}: {tx.empSales.length}</div>
                  </div>
                  <div className="rounded-xl bg-indigo-50 p-3">
                    <div className="text-[10px] font-bold text-indigo-600">{'صافي الربح'}</div>
                    <div className="mt-0.5 text-lg font-black text-slate-900">{tx.profit.toFixed(2)} {t.currency}</div>
                    <div className="text-[11px] font-bold text-indigo-700">{`مرتجعات: ${tx.refunds.toFixed(2)}`}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{'أحدث العمليات'}</div>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {tx.empSales.slice(0, 20).map(s => (
                      <div key={s.id} className="flex items-center justify-between px-3 py-2 text-xs">
                        <div>
                          <span className="font-mono font-bold text-blue-700">{s.receiptNumber}</span>
                          <span className="mx-1.5 text-slate-300">•</span>
                          <span className="text-[10px] text-slate-400">{new Date(s.date).toLocaleTimeString()}</span>
                          {s.isCustomOrder && (
                            <span className="mr-1 inline-block rounded bg-indigo-100 px-1 py-0.5 text-[9px] font-bold text-indigo-700">{'مخصص'}</span>
                          )}
                        </div>
                        <div className="font-mono font-bold text-slate-900">{s.total.toFixed(2)} {t.currency}</div>
                      </div>
                    ))}
                    {tx.empSales.length === 0 && (
                      <div className="px-3 py-6 text-center text-xs text-slate-400">{'لا توجد عمليات بعد'}</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end border-t border-slate-200 px-5 py-3">
                <button onClick={() => setTrackEmp(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  {t.close}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Shift Day Summary Modal */}
      {shiftDetail && (() => {
        const sum = shiftSummary(shiftDetail);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs" onClick={() => setShiftDetail(null)}>
            <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-600" />
                  <div>
                    <div className="text-sm font-black text-slate-900">{'موجز الوردية التفصيلي'}</div>
                    <div className="text-[11px] text-slate-500">
                      {shiftDetail.shiftNumber} • {shiftDetail.employeeName} •{' '}
                      {new Date(shiftDetail.openedAt || shiftDetail.startTime || Date.now()).toLocaleString()}
                    </div>
                  </div>
                </div>
                <button onClick={() => setShiftDetail(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200" aria-label="إغلاق">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl bg-emerald-50 p-3 text-center">
                    <div className="text-[10px] font-bold text-emerald-600">{'المبيعات'}</div>
                    <div className="text-sm font-black text-slate-900">{sum.revenue.toFixed(2)} {t.currency}</div>
                    <div className="text-[10px] text-slate-400">{sum.shiftSales.length} {'فاتورة'}</div>
                  </div>
                  <div className="rounded-xl bg-indigo-50 p-3 text-center">
                    <div className="text-[10px] font-bold text-indigo-600">{'صافي الربح'}</div>
                    <div className="text-sm font-black text-slate-900">{sum.profit.toFixed(2)} {t.currency}</div>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3 text-center">
                    <div className="text-[10px] font-bold text-amber-600">{'المرتجعات'}</div>
                    <div className="text-sm font-black text-slate-900">{sum.refunds.toFixed(2)} {t.currency}</div>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 text-center">
                    <div className="text-[10px] font-bold text-blue-600">{'المتوقع كاش'}</div>
                    <div className="text-sm font-black text-slate-900">{(shiftDetail.expectedCash || 0).toFixed(2)} {t.currency}</div>
                    <div className="text-[10px] text-slate-400">{'كاش'}: {sum.cash.toFixed(2)}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold">
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{'كاش'}: <b>{sum.cash.toFixed(2)}</b></span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{t.vodafoneCash}: <b>{sum.vodafoneCash.toFixed(2)}</b></span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{t.instapay}: <b>{sum.instapay.toFixed(2)}</b></span>
                </div>

                <div className="mt-4">
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{'المنتجات المباعة'}</div>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-500">
                      <span>{'المنتج'}</span>
                      <span className="flex gap-4">
                        <span className="w-12 text-center">{t.qty}</span>
                        <span className="w-16 text-center">{t.total}</span>
                        <span className="w-16 text-center">{'الربح'}</span>
                      </span>
                    </div>
                    {sum.products.map((p, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
                        <span className="truncate font-bold text-slate-800">{p.nameAr ? p.nameAr : p.name}</span>
                        <span className="flex gap-4 font-mono text-[11px] text-slate-600">
                          <span className="w-12 text-center">{p.qty}</span>
                          <span className="w-16 text-center">{p.total.toFixed(2)}</span>
                          <span className="w-16 text-center font-bold text-indigo-600">{(p.total - p.cost).toFixed(2)}</span>
                        </span>
                      </div>
                    ))}
                    {sum.products.length === 0 && (
                      <div className="px-3 py-6 text-center text-xs text-slate-400">{'لا توجد مبيعات في هذه الوردية'}</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end border-t border-slate-200 px-5 py-3">
                <button onClick={() => setShiftDetail(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  {t.close}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Record Cash Advance Modal */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">تسجيل سلفة نقدية للموظف</h3>
              <button
                type="button"
                onClick={() => setShowAdvanceModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">
              ستُخصم السلفة تلقائياً من صافي راتب الموظف عند توليد مسير الشهر الحالي
            </p>
            <form onSubmit={handleRecordAdvance} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">الموظف *</label>
                <select
                  value={advanceEmpId}
                  onChange={e => setAdvanceEmpId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.nameAr || e.name} (الراتب: {((e.baseSalary ?? e.salary) || 0).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">المبلغ ({t.currency}) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  step={1}
                  value={advanceAmount}
                  onChange={e => setAdvanceAmount(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-mono font-bold text-amber-700"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">ملاحظات</label>
                <input
                  type="text"
                  value={advanceNotes}
                  onChange={e => setAdvanceNotes(e.target.value)}
                  placeholder="مثال: سلفة استعجالية لتغطية مصاريف نقل"
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-98 transition-all"
                >
                  <HandCoins className="h-4 w-4" />
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
