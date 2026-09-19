import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Smartphone,
  ChevronRight, 
  ArrowUpRight, 
  Sparkles,
  Zap,
  Plus,
  X,
  Check
} from 'lucide-react';
import { ProfitVsSalesChart } from './ProfitVsSalesChart';

interface DashboardProps {
  onNavigate: (module: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { t, sales, products, activeShift, addExpense, activeBranchId, isAdmin } = useApp();

  // Today's metrics
  const today = new Date().toDateString();
  const todaySales = useMemo(() => {
    return sales.filter(s => new Date(s.date).toDateString() === today);
  }, [sales, today]);

  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
  const todayProfit = todaySales.reduce((sum, s) => sum + (s.totalProfit || 0), 0);
  const todayOrdersCount = todaySales.length;

  // Alerts
  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.currentStock <= p.minStock);
  }, [products]);

  const expiringSoonProducts = useMemo(() => {
    const now = new Date();
    return products
      .map(p => {
        const exp = new Date(p.expiryDate);
        const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return { ...p, daysLeft };
      })
      .filter(p => p.daysLeft <= 7)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [products]);

  // Quick Add Expense
  const [showQuickExpense, setShowQuickExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: 'إيجار',
    amount: 0,
    paymentMethod: 'cash' as 'cash' | 'bank',
    description: '',
  });
  const expenseCategories = [
    'إيجار',
    'كهرباء وتبريد',
    'نقل مبرد ووقود',
    'تغليف وعبوات',
    'صيانة ونظافة',
    'تلف وإهدار ألبان',
    'رواتب',
    'تكاليف تشغيل أخرى',
  ];

  const submitQuickExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseForm.amount <= 0) return;
    addExpense({
      expenseType: 'Other',
      category: expenseForm.category,
      amount: Number(expenseForm.amount.toFixed(2)),
      paymentMethod: expenseForm.paymentMethod,
      branchId: activeBranchId,
      description: expenseForm.description,
      notes: expenseForm.description,
      date: new Date().toISOString(),
      paidFromShift: expenseForm.paymentMethod === 'cash',
    });
    setExpenseForm({ category: 'Rent', amount: 0, paymentMethod: 'cash', description: '' });
    setShowQuickExpense(false);
  };

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    let cash = 0;
    let vodafoneCash = 0;
    let instapay = 0;

    sales.forEach(s => {
      if (s.paymentMethod === 'cash') cash += s.total;
      else if (s.paymentMethod === 'vodafone_cash') vodafoneCash += s.total;
      else if (s.paymentMethod === 'instapay') instapay += s.total;
    });

    const total = cash + vodafoneCash + instapay || 1;
    return {
      cash,
      vodafoneCash,
      instapay,
      cashPct: (cash / total) * 100,
      vodafoneCashPct: (vodafoneCash / total) * 100,
      instapayPct: (instapay / total) * 100,
    };
  }, [sales]);

  // Top products
  const topProducts = useMemo(() => {
    const map: Record<string, { product: any; unitsSold: number; totalRev: number }> = {};

    sales.forEach(s => {
      s.items.forEach(item => {
        if (!map[item.productId]) {
          const prod = products.find(p => p.id === item.productId);
          map[item.productId] = {
            product: prod || { name: item.productName, imageEmoji: '🥛' },
            unitsSold: 0,
            totalRev: 0,
          };
        }
        map[item.productId].unitsSold += item.quantity;
        map[item.productId].totalRev += item.lineTotal;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5);
  }, [sales, products]);

  return (
    <div className="space-y-4">
      {/* Top Banner with POS Quick Launcher */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl bg-slate-900 p-6 text-white sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-ping" />
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
              {activeShift ? t.shiftInProgress : 'الكاشير جاهز'}
            </span>
          </div>
          <h2 className="mt-1 text-2xl font-black">
            {'نظام مبيعات وإدارة الألبان الطازجة'}
          </h2>
          <p className="text-xs text-slate-400">
            {'مبيعات سريعة، مراقبة تواريخ الصلاحية، إدارة الورديات، وتتبع الأرباح بدقة'}
          </p>
        </div>

        <button
          onClick={() => onNavigate('pos')}
          className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 active:scale-98"
        >
          <Zap className="h-5 w-5 fill-current" />
          <span>{t.openPOS} (F2 / F4)</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Today's Sales */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{t.todaySales}</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-2xl font-extrabold text-slate-900">
            {todayRevenue.toFixed(2)}
            <span className="ml-1 text-xs font-bold text-slate-400 rtl:mr-1">{t.currency}</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-medium">From {todayOrdersCount} completed orders</div>
        </div>

        {/* Today's Orders */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{t.todayOrders}</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-2xl font-extrabold text-slate-900">
            {todayOrdersCount}
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-medium">عدد زيارات العملاء</div>
        </div>

        {/* Today's Profit */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{t.todayProfit}</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-2xl font-extrabold text-emerald-600">
            +{todayProfit.toFixed(2)}
            <span className="ml-1 text-xs font-bold text-emerald-700 rtl:mr-1">{t.currency}</span>
          </div>
          <div className="mt-1 text-[10px] text-emerald-600 font-medium">صافي هامش ربح المنتجات</div>
        </div>

        {/* Expiry Risk Count */}
        <div
          onClick={() => onNavigate('inventory')}
          className="cursor-pointer rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-xs transition-all hover:bg-amber-50"
        >
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-xs font-bold">{t.expiringSoon}</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-2xl font-extrabold text-amber-800">
            {expiringSoonProducts.length}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-700">
            <span>{t.view} in Perishable Watch</span>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Sparkles className="h-4 w-4 shrink-0 text-indigo-500" />
          <span className="hidden font-bold text-slate-800 sm:inline">
            {'إجراء سريع'}
          </span>
          <span className="text-slate-400">
            {'سجل مصروفًا دون مغادرة لوحة التحكم'}
          </span>
        </div>
        <button
          onClick={() => setShowQuickExpense(true)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-indigo-700 active:scale-98"
        >
          <Plus className="h-3.5 w-3.5" />
          {t.recordExpense}
        </button>
      </div>

      {/* Real-time Profit vs. Sales Performance Chart */}
      <ProfitVsSalesChart />

      {/* Center 2-Column Section: Alerts & Top Products */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Urgent Dairy Alerts (Low Stock + Expiring Soon) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">مركز إجراءات الألبان والمخزون</h3>
            </div>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              {t.viewAll}
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {/* Low stock items */}
            {lowStockProducts.slice(0, 3).map(p => (
              <div
                key={`low-${p.id}`}
                className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{p.imageEmoji || '🥛'}</span>
                  <div>
                    <div className="font-bold text-slate-800">{p.name}</div>
                    <div className="text-[10px] text-slate-400">
                      الدفعة: {p.batchNumber} • الحد الأدنى: {p.minStock} {p.unit}
                    </div>
                  </div>
                </div>
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  {p.currentStock} {p.unit} متبقٍ
                </span>
              </div>
            ))}

            {/* Expiring items */}
            {expiringSoonProducts.slice(0, 3).map(p => (
              <div
                key={`exp-${p.id}`}
                className="flex items-center justify-between rounded-xl bg-rose-50/60 p-2.5 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{p.imageEmoji || '🥛'}</span>
                  <div>
                    <div className="font-bold text-slate-800">{p.name}</div>
                    <div className="text-[10px] text-rose-600 font-medium">Expires: {p.expiryDate}</div>
                  </div>
                </div>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    p.daysLeft <= 0
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {p.daysLeft <= 0 ? t.expired : `${p.daysLeft} يوم`}
                </span>
              </div>
            ))}

            {lowStockProducts.length === 0 && expiringSoonProducts.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400">
                جميع مستويات المخزون وتواريخ الصلاحية مثالية!
              </div>
            )}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">{t.topSelling}</h3>
            {isAdmin && (
              <button
                onClick={() => onNavigate('reports')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                {t.viewAll}
              </button>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {topProducts.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-xl p-2 text-xs hover:bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 font-mono text-[10px] font-bold text-slate-600">
                    {idx + 1}
                  </span>
                  <span className="text-xl">{item.product.imageEmoji || '🥛'}</span>
                  <div>
                    <div className="font-bold text-slate-800">{item.product.name}</div>
                    <div className="text-[10px] text-slate-400">{item.unitsSold} units sold</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-slate-900">
                    {item.totalRev.toFixed(2)} {t.currency}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Payment Method Split & Recent Sales */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Payment Methods Breakdown */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">{t.paymentMethods}</h3>
          <p className="text-xs text-slate-500 mb-4">نقدي مقابل مدفوعات إلكترونية</p>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <DollarSign className="h-3.5 w-3.5" /> Cash
                </span>
                <span className="font-mono">{paymentBreakdown.cash.toFixed(2)} {t.currency} ({paymentBreakdown.cashPct.toFixed(0)}%)</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${paymentBreakdown.cashPct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold">
                <span className="flex items-center gap-1.5 text-rose-700">
                  <Smartphone className="h-3.5 w-3.5" /> {t.vodafoneCash}
                </span>
                <span className="font-mono">{paymentBreakdown.vodafoneCash.toFixed(2)} {t.currency} ({paymentBreakdown.vodafoneCashPct.toFixed(0)}%)</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-rose-500" style={{ width: `${paymentBreakdown.vodafoneCashPct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <Zap className="h-3.5 w-3.5" /> {t.instapay}
                </span>
                <span className="font-mono">{paymentBreakdown.instapay.toFixed(2)} {t.currency} ({paymentBreakdown.instapayPct.toFixed(0)}%)</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${paymentBreakdown.instapayPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">{t.recentSales}</h3>
            {isAdmin && (
              <button
                onClick={() => onNavigate('reports')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                {t.viewAll}
              </button>
            )}
          </div>

          <div className="mt-2 divide-y divide-slate-100">
            {sales.slice(0, 4).map(s => (
              <div key={s.id} className="flex items-center justify-between py-2.5 text-xs">
                <div>
                  <div className="font-mono font-bold text-slate-800">{s.receiptNumber}</div>
                  <div className="text-[10px] text-slate-400">
                    {s.items.length} items • {s.customerName || t.walkInCustomer} • {new Date(s.date).toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-extrabold text-slate-900">
                    {s.total.toFixed(2)} {t.currency}
                  </div>
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-slate-600">
                    {{ cash: t.cash, vodafone_cash: t.vodafoneCash, instapay: t.instapay }[s.paymentMethod as string] || s.paymentMethod}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Expense Modal */}
      {showQuickExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">{t.addExpense}</h3>
              <button
                onClick={() => setShowQuickExpense(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitQuickExpense} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">{t.expenseType}</label>
                <select
                  value={expenseForm.category}
                  onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-medium text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                >
                  {expenseCategories.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">
                  {t.amount} ({t.currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={expenseForm.amount || ''}
                  onChange={e => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-lg font-bold text-slate-900 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">{t.paymentMethod}</label>
                <div className="flex gap-2">
                  {(['cash', 'bank'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setExpenseForm({ ...expenseForm, paymentMethod: m })}
                      className={`flex-1 rounded-xl border p-2.5 text-xs font-bold capitalize transition-all ${
                        expenseForm.paymentMethod === m
                          ? 'border-indigo-600 bg-indigo-50/60 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {m === 'cash' ? t.cash : t.bank}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">{t.description}</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-medium text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickExpense(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white shadow-md shadow-indigo-500/25 hover:bg-indigo-700"
                >
                  <Check className="h-4 w-4" />
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
