import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ExpenseCategory, Expense, SalaryRecord, FixedAsset, BusinessLoan } from '../../types';
import { 
  DollarSign, 
  Plus, 
  TrendingDown, 
  TrendingUp, 
  Briefcase, 
  Landmark, 
  Truck, 
  CreditCard, 
  CheckCircle2, 
  FileSpreadsheet,
  AlertCircle 
} from 'lucide-react';

export const FinanceModule: React.FC = () => {
  const {
    t,
    expenses,
    salaries,
    assets,
    loans,
    employees,
    branches,
    activeShift,
    addExpense,
    paySalary,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'expenses' | 'salaries' | 'assets' | 'overview'>('overview');

  const paymentMethodLabel = (method: string) =>
    ({ cash: 'نقدي', bank: 'بنك', card: 'بطاقة', Cash: 'نقدي', Bank: 'بنك', Card: 'بطاقة' } as Record<string, string>)[method] || method;

  // New Expense Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState<{
    category: ExpenseCategory;
    amount: number;
    paymentMethod: 'Cash' | 'Card' | 'Bank';
    branchId: string;
    description: string;
    paidFromShift: boolean;
  }>({
    category: 'كهرباء وتبريد',
    amount: 350,
    paymentMethod: 'Cash',
    branchId: branches[0]?.id || 'br-1',
    description: 'حصة فاتورة كهرباء الغرفة المبردة',
    paidFromShift: !!activeShift,
  });

  // Salary Payment Modal
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryForm, setSalaryForm] = useState<{
    employeeId: string;
    bonus: number;
    deductions: number;
    month: string;
  }>({
    employeeId: employees[0]?.id || '',
    bonus: 200,
    deductions: 0,
    month: '2026-09',
  });

  const categoriesList: ExpenseCategory[] = [
    'إيجار',
    'كهرباء وتبريد',
    'نقل مبرد ووقود',
    'تغليف وعبوات',
    'صيانة ونظافة',
    'تلف وإهدار ألبان',
    'رواتب',
    'تكاليف تشغيل أخرى',
  ];

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseForm.amount <= 0) return;

    addExpense({
      expenseType: (expenseForm.category as any) || 'Other',
      category: expenseForm.category,
      amount: expenseForm.amount,
      paymentMethod: (expenseForm.paymentMethod.toLowerCase() as any) || 'cash',
      branchId: expenseForm.branchId,
      description: expenseForm.description,
      notes: expenseForm.description,
      date: new Date().toISOString(),
      paidFromShift: expenseForm.paymentMethod === 'Cash' && expenseForm.paidFromShift,
      shiftId: expenseForm.paymentMethod === 'Cash' && expenseForm.paidFromShift ? activeShift?.id : undefined,
    });

    setShowExpenseModal(false);
  };

  const handleSalarySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === salaryForm.employeeId);
    if (!emp) return;

    paySalary(emp.id, emp.baseSalary || emp.salary, salaryForm.bonus, salaryForm.deductions, salaryForm.month);
    setShowSalaryModal(false);
  };

  // Finance aggregated summary calculations
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalAssetsValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalLoanDebt = loans.reduce((sum, l) => sum + l.remainingBalance, 0);
  const totalPayrollPaid = salaries.reduce((sum, s) => sum + s.netSalary, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.financeTitle}</h2>
          <p className="text-xs text-slate-500">
            {'المصروفات التشغيلية، رواتب عمال الألبان، الأصول ومعدات التبريد، والقروض'}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4 text-blue-600" />
            <span>{t.addExpense}</span>
          </button>
          <button
            onClick={() => setShowSalaryModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-98 transition-all"
          >
            <DollarSign className="h-4 w-4" />
            <span>{t.paySalary}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">{t.totalExpenses}</span>
          <div className="mt-1 font-mono text-xl font-extrabold text-rose-600">
            {totalExpenses.toFixed(2)} {t.currency}
          </div>
          <p className="text-[10px] text-slate-400">كل المصروفات التشغيلية المسجلة</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">رواتب الموظفين المدفوعة</span>
          <div className="mt-1 font-mono text-xl font-extrabold text-slate-900">
            {totalPayrollPaid.toFixed(2)} {t.currency}
          </div>
          <p className="text-[10px] text-slate-400">الرواتب والمكافآت المدفوعة</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">أصول مصنع الألبان</span>
          <div className="mt-1 font-mono text-xl font-extrabold text-blue-600">
            {totalAssetsValue.toLocaleString()} {t.currency}
          </div>
          <p className="text-[10px] text-slate-400">خزانات، مبردات وأسطول التوزيع</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">قروض بنكية نشطة</span>
          <div className="mt-1 font-mono text-xl font-extrabold text-amber-700">
            {totalLoanDebt.toLocaleString()} {t.currency}
          </div>
          <p className="text-[10px] text-slate-400">رصيد تمويل المعدات</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`border-b-2 pb-2 px-3 transition-all ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.financialHealth}
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`border-b-2 pb-2 px-3 transition-all ${
            activeTab === 'expenses'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.expensesTab} ({expenses.length})
        </button>
        <button
          onClick={() => setActiveTab('salaries')}
          className={`border-b-2 pb-2 px-3 transition-all ${
            activeTab === 'salaries'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.payrollTab} ({salaries.length})
        </button>
        <button
          onClick={() => setActiveTab('assets')}
          className={`border-b-2 pb-2 px-3 transition-all ${
            activeTab === 'assets'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.assetsLoansTab}
        </button>
      </div>

      {/* Tab 1: Financial Health Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Working Capital & Accounts Status */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">{t.balanceSheetSnapshot}</h3>
            <div className="mt-3 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-600">رصيد صندوق النقود (الوردية الحالية):</span>
                <span className="font-mono font-bold text-emerald-600">
                  {activeShift ? (activeShift.expectedCash ?? 0).toFixed(2) : '0.00'} {t.currency}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-600">الحساب البنكي الرئيسي (الراجحي):</span>
                <span className="font-mono font-bold text-slate-800">
                  84,500.00 {t.currency}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-600">معدات الألبان والأصول الثابتة:</span>
                <span className="font-mono font-bold text-slate-800">
                  {totalAssetsValue.toLocaleString()} {t.currency}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-600">مستحقات الموردين (فواتير غير مدفوعة):</span>
                <span className="font-mono font-bold text-rose-600">
                  -1,250.00 {t.currency}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-600">أصل قرض الآلات (منشآت):</span>
                <span className="font-mono font-bold text-amber-700">
                  -{totalLoanDebt.toLocaleString()} {t.currency}
                </span>
              </div>
            </div>
          </div>

          {/* Cost Categories Distribution */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">تحليل المصروفات</h3>
            <div className="mt-3 space-y-2 text-xs">
              {categoriesList.map(cat => {
                const catTotal = expenses
                  .filter(e => e.category === cat)
                  .reduce((sum, e) => sum + e.amount, 0);
                const percent = totalExpenses > 0 ? (catTotal / totalExpenses) * 100 : 0;
                if (catTotal === 0) return null;

                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-semibold text-slate-700">{cat}</span>
                      <span className="font-mono text-slate-500">
                        {catTotal.toFixed(2)} {t.currency} ({percent.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100">
                      <div
                        className="h-1.5 rounded-full bg-blue-600"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Expenses Log */}
      {activeTab === 'expenses' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs rtl:text-right">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
              <tr>
                <th className="py-3 px-4">{t.category}</th>
                <th className="py-3 px-3">{t.description}</th>
                <th className="py-3 px-3 text-right rtl:text-left">{t.amount}</th>
                <th className="py-3 px-3">{t.paymentMethod}</th>
                <th className="py-3 px-3">التاريخ</th>
                <th className="py-3 px-4">الدفع من</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map(e => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                      {e.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-700">{e.description}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 rtl:text-left">
                    -{e.amount.toFixed(2)} {t.currency}
                  </td>
                  <td className="py-3 px-3 capitalize text-slate-600">
                    {paymentMethodLabel(e.paymentMethod)}
                  </td>
                  <td className="py-3 px-3 text-slate-400">{e.date}</td>
                  <td className="py-3 px-4 text-slate-500">
                    {e.paidFromShift ? (
                      <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                        صندوق الوردية
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">الحساب الرئيسي</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Salaries Payroll */}
      {activeTab === 'salaries' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs rtl:text-right">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
              <tr>
                <th className="py-3 px-4">{t.employee}</th>
                <th className="py-3 px-3 text-right rtl:text-left">{t.baseSalary}</th>
                <th className="py-3 px-3 text-right rtl:text-left">{t.bonus}</th>
                <th className="py-3 px-3 text-right rtl:text-left">{t.deductions}</th>
                <th className="py-3 px-3 text-right rtl:text-left">{t.netSalary}</th>
                <th className="py-3 px-3">الشهر</th>
                <th className="py-3 px-4 text-center">{t.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salaries.map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">{s.employeeName}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-600 rtl:text-left">
                    {((s.baseSalary ?? s.basicSalary) || 0).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-600 rtl:text-left">
                    +{((s.bonuses ?? s.bonus ?? s.allowances) || 0).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-rose-600 rtl:text-left">
                    -{(s.deductions || 0).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900 rtl:text-left">
                    {(s.netSalary || 0).toFixed(2)} {t.currency}
                  </td>
                  <td className="py-3 px-3 text-slate-500 font-mono">{s.month || s.monthYear}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      <CheckCircle2 className="h-3 w-3" />
                      Paid
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Assets & Loans */}
      {activeTab === 'assets' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Dairy Plant Fixed Assets */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">{t.dairyAssets}</h3>
            <div className="mt-3 space-y-3">
              {assets.map(a => (
                <div key={a.id} className="rounded-xl border border-slate-200 p-3 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{a.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {a.serialNumber} • Purchased: {a.purchaseDate}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-extrabold text-blue-600">
                        {a.currentValue.toLocaleString()} {t.currency}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Deprec.: {a.depreciationRate}% / yr
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Business Equipment Loans */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">{t.bankLoans}</h3>
            <div className="mt-3 space-y-3">
              {loans.map(l => (
                <div key={l.id} className="rounded-xl border border-slate-200 p-3 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{l.name}</div>
                      <div className="text-[10px] text-slate-500">{l.lender} • Rate: {l.interestRate}%</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-extrabold text-amber-700">
                        {l.remainingBalance.toLocaleString()} {t.currency}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        شهرياً: {l.monthlyInstallment} {t.currency}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">{t.addExpense}</h3>
            <form onSubmit={handleExpenseSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">{t.category}</label>
                <select
                  value={expenseForm.category}
                  onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                >
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">{t.amount} ({t.currency}) *</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={expenseForm.amount}
                  onChange={e => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">{t.paymentMethod}</label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={e => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  >
                    <option value="Cash">{t.cash}</option>
                    <option value="Card">{t.card}</option>
                    <option value="Bank">{t.bankTransfer}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">الفرع</label>
                  <select
                    value={expenseForm.branchId}
                    onChange={e => setExpenseForm({ ...expenseForm, branchId: e.target.value })}
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

              <div>
                <label className="mb-1 block font-semibold text-slate-700">{t.description}</label>
                <input
                  type="text"
                  required
                  value={expenseForm.description}
                  onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="مثال: سير مروحة لثلاجة العرض"
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>

              {expenseForm.paymentMethod === 'Cash' && activeShift && (
                <label className="flex items-center gap-2 font-semibold text-emerald-800 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                  <input
                    type="checkbox"
                    checked={expenseForm.paidFromShift}
                    onChange={e => setExpenseForm({ ...expenseForm, paidFromShift: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>خصم فوري من رصيد درج الكاشير الحالي</span>
                </label>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-800 px-5 py-2 font-bold text-white hover:bg-slate-900"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Salary Modal */}
      {showSalaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">{t.paySalary}</h3>
            <form onSubmit={handleSalarySubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">{t.employee}</label>
                <select
                  value={salaryForm.employeeId}
                  onChange={e => setSalaryForm({ ...salaryForm, employeeId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} (Base: {emp.baseSalary} {t.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">{t.bonus}</label>
                  <input
                    type="number"
                    step="50"
                    value={salaryForm.bonus}
                    onChange={e => setSalaryForm({ ...salaryForm, bonus: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">{t.deductions}</label>
                  <input
                    type="number"
                    step="50"
                    value={salaryForm.deductions}
                    onChange={e => setSalaryForm({ ...salaryForm, deductions: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">فترة شهر الراتب</label>
                <input
                  type="month"
                  value={salaryForm.month}
                  onChange={e => setSalaryForm({ ...salaryForm, month: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowSalaryModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-98 transition-all"
                >
                  Disburse & Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
