import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShoppingBag, 
  DollarSign, 
  Layers, 
  Scale, 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Users, 
  Truck, 
  ArrowRight, 
  BarChart3, 
  Sparkles, 
  Calendar,
  Smartphone,
  Banknote,
  Zap,
  PackageCheck,
  Percent,
  Flame
} from 'lucide-react';

interface FiveQuestionsDashboardProps {
  filteredSales: any[];
  dateRange: string;
  branchFilter: string;
  onNavigateTab: (tab: any) => void;
}

export const FiveQuestionsDashboard: React.FC<FiveQuestionsDashboardProps> = ({
  filteredSales,
  dateRange,
  branchFilter,
  onNavigateTab,
}) => {
  const {
    t,
    products,
    expenses,
    salaries,
    loans,
    customers,
    vendors,
    purchases,
    branches,
    shifts,
  } = useApp();

  const [activeQuestion, setActiveQuestion] = useState<1 | 2 | 3 | 4 | 5>(1);

  // ==================== QUESTION 1: HOW MUCH DID I SELL? ====================
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const totalUnitsSold = filteredSales.reduce(
    (sum, s) => sum + s.items.reduce((acc: number, it: any) => acc + it.quantity, 0),
    0
  );
  const totalInvoices = filteredSales.length;
  const averageTicket = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

  // Sales by payment method
  const salesByPayment: Record<string, number> = { cash: 0, vodafone_cash: 0, instapay: 0 };
  filteredSales.forEach(s => {
    const m = s.paymentMethod || 'cash';
    if (salesByPayment[m] !== undefined) {
      salesByPayment[m] += s.total;
    } else {
      salesByPayment.cash += s.total;
    }
  });

  // Top selling products
  const productSalesMap: Record<string, { name: string; revenue: number; quantity: number; profit: number }> = {};
  filteredSales.forEach(s => {
    s.items.forEach((it: any) => {
      if (!productSalesMap[it.productId]) {
        productSalesMap[it.productId] = {
          name:it.productNameAr ? it.productNameAr : it.productName,
          revenue: 0,
          quantity: 0,
          profit: 0,
        };
      }
      productSalesMap[it.productId].revenue += it.lineTotal;
      productSalesMap[it.productId].quantity += it.quantity;
      productSalesMap[it.productId].profit += it.lineTotal - (it.costPrice * it.quantity);
    });
  });
  const topSellingProducts = Object.values(productSalesMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // ==================== QUESTION 2: HOW MUCH DID I MAKE? ====================
  const totalCOGS = filteredSales.reduce((sum, s) => sum + s.totalCost, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const grossMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const totalOpex = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPayrollPaid = salaries
    .filter(s => s.status === 'Paid')
    .reduce((sum, s) => sum + ((s.netSalary || s.baseSalary || 0)), 0);
  const totalBusinessExpenses = totalOpex + totalPayrollPaid;

  const netProfit = grossProfit - totalBusinessExpenses;
  const netMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // ==================== QUESTION 3: HOW MUCH STOCK DO I HAVE? ====================
  const totalStockCostVal = products.reduce((sum, p) => sum + (p.currentStock * p.costPrice), 0);
  const totalStockRetailVal = products.reduce((sum, p) => sum + (p.currentStock * p.salePrice), 0);
  const potentialGrossMargin = totalStockRetailVal - totalStockCostVal;
  const totalStockUnits = products.reduce((sum, p) => sum + p.currentStock, 0);

  const lowStockProducts = products.filter(p => p.currentStock <= (p.minStockAlert ?? p.minStock) && p.currentStock > 0);
  const outOfStockProducts = products.filter(p => p.currentStock <= 0);

  // Fresh dairy expiring within 7 days
  const now = new Date();
  const expiringProducts = products
    .map(p => {
      const expDate = new Date(p.expiryDate);
      const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...p,
        daysLeft: diffDays,
        riskVal: p.currentStock * p.costPrice,
      };
    })
    .filter(p => p.daysLeft <= 7 && p.currentStock > 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const totalAtRiskValue = expiringProducts.reduce((sum, p) => sum + p.riskVal, 0);

  // ==================== QUESTION 4: HOW MUCH MONEY DO PEOPLE OWE ME / DO I OWE THEM? ====================
  const customersOwing = customers.filter(c => (c.outstandingBalance || 0) > 0);
  const totalReceivables = customersOwing.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);

  const vendorsOwed = vendors.filter(v => (v.balance || 0) > 0);
  const totalVendorPayables = vendorsOwed.reduce((sum, v) => sum + (v.balance || 0), 0);
  const totalLoansRemaining = loans.reduce((sum, l) => sum + (l.remainingBalance || 0), 0);
  const pendingSalaries = salaries.filter(s => s.status === 'Pending');
  const totalPendingSalaries = pendingSalaries.reduce((sum, s) => sum + ((s.netSalary || s.baseSalary || 0)), 0);

  const totalPayables = totalVendorPayables + totalLoansRemaining + totalPendingSalaries;
  const netDebtPosition = totalReceivables - totalPayables;

  // ==================== QUESTION 5: WHAT IS HAPPENING IN EACH BRANCH? ====================
  const branchData = branches.map(b => {
    const bSales = filteredSales.filter(s => s.branchId === b.id || (!s.branchId && b.isDefault));
    const bRev = bSales.reduce((sum, s) => sum + s.total, 0);
    const bProfit = bSales.reduce((sum, s) => sum + s.totalProfit, 0);
    const bOpenShift = shifts.find(
      s => (s.branchId === b.id || (!s.branchId && b.isDefault)) && s.status === 'Open'
    );
    const bShare = totalRevenue > 0 ? (bRev / totalRevenue) * 100 : 0;
    return {
      ...b,
      revenue: bRev,
      profit: bProfit,
      ticketCount: bSales.length,
      openShift: bOpenShift,
      share: bShare,
    };
  });

  const leadingBranch = [...branchData].sort((a, b) => b.revenue - a.revenue)[0];
  const activeShiftsCount = branchData.filter(b => !!b.openShift).length;
  const totalDrawerCash = branchData.reduce((sum, b) => sum + (b.openShift ? b.openShift.expectedCash : 0), 0);

  return (
    <div className="space-y-6">
      {/* Title & Question Selector Cards */}
      <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/50 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200/70 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100/70 px-3 py-1 text-xs font-black text-blue-800">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>{t.fiveQuestionsTitle || 'الأسئلة الخمسة الأساسية لإدارة العمل'}</span>
            </div>
            <h2 className="mt-2 text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              {'الإجابات التنفيذية الخمس الفورية'}
            </h2>
            <p className="mt-1 text-xs text-slate-500 max-w-2xl">
              {t.fiveQuestionsSubtitle || 'إجابات تنفيذية فورية عن أداء مبيعاتك، أرباحك، مخزونك، مديونياتك، وفروعك.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-bold text-slate-700 shadow-xs">
              {filteredSales.length} Transactions Analyzed
            </span>
          </div>
        </div>

        {/* 5 Big Clickable Question Cards */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Question 1: How much did I sell? */}
          <button
            onClick={() => setActiveQuestion(1)}
            className={`rounded-2xl p-4 text-left rtl:text-right transition-all border ${
              activeQuestion === 1
                ? 'border-blue-600 bg-blue-50/60 shadow-md ring-2 ring-blue-500/20'
                : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white">
                Q1
              </span>
              <ShoppingBag className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-3 text-xs font-bold text-slate-600 truncate">
              {t.q1Title || 'كم بعت؟ (المبيعات)'}
            </div>
            <div className="mt-1 font-mono text-lg font-black text-slate-900">
              {totalRevenue.toFixed(2)} {t.currency}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {totalUnitsSold.toLocaleString()} units • {totalInvoices} bills
            </div>
          </button>

          {/* Question 2: How much did I make? */}
          <button
            onClick={() => setActiveQuestion(2)}
            className={`rounded-2xl p-4 text-left rtl:text-right transition-all border ${
              activeQuestion === 2
                ? 'border-emerald-600 bg-emerald-50/60 shadow-md ring-2 ring-emerald-500/20'
                : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-600 text-xs font-bold text-white">
                Q2
              </span>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-3 text-xs font-bold text-slate-600 truncate">
              {t.q2Title || 'كم ربحت؟ (الأرباح)'}
            </div>
            <div className="mt-1 font-mono text-lg font-black text-emerald-700">
              +{grossProfit.toFixed(2)} {t.currency}
            </div>
            <div className="mt-1 text-[11px] text-emerald-800 font-semibold">
              Net: {netProfit >= 0 ? `+${netProfit.toFixed(1)}` : netProfit.toFixed(1)} ({grossMarginPercent.toFixed(0)}% margin)
            </div>
          </button>

          {/* Question 3: How much stock do I have? */}
          <button
            onClick={() => setActiveQuestion(3)}
            className={`rounded-2xl p-4 text-left rtl:text-right transition-all border ${
              activeQuestion === 3
                ? 'border-purple-600 bg-purple-50/60 shadow-md ring-2 ring-purple-500/20'
                : 'border-slate-200 bg-white hover:border-purple-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-600 text-xs font-bold text-white">
                Q3
              </span>
              <Layers className="h-4 w-4 text-purple-600" />
            </div>
            <div className="mt-3 text-xs font-bold text-slate-600 truncate">
              {t.q3Title || 'كم بضاعتي؟ (المخزون)'}
            </div>
            <div className="mt-1 font-mono text-lg font-black text-slate-900">
              {totalStockCostVal.toFixed(2)} {t.currency}
            </div>
            <div className="mt-1 text-[11px] text-purple-700 font-semibold">
              Retail: {totalStockRetailVal.toFixed(0)} • {totalStockUnits.toLocaleString()} units
            </div>
          </button>

          {/* Question 4: How much money do people owe me / do I owe them? */}
          <button
            onClick={() => setActiveQuestion(4)}
            className={`rounded-2xl p-4 text-left rtl:text-right transition-all border ${
              activeQuestion === 4
                ? 'border-amber-600 bg-amber-50/60 shadow-md ring-2 ring-amber-500/20'
                : 'border-slate-200 bg-white hover:border-amber-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-600 text-xs font-bold text-white">
                Q4
              </span>
              <Scale className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-3 text-xs font-bold text-slate-600 truncate">
              {t.q4Title || 'كم لي وكم عليّ؟ (المديونيات)'}
            </div>
            <div className="mt-1 font-mono text-sm font-black text-slate-900">
              <span className="text-emerald-700">+{totalReceivables.toFixed(0)}</span> / <span className="text-rose-700">-{totalPayables.toFixed(0)}</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Net: <b className={netDebtPosition >= 0 ? 'text-emerald-700' : 'text-slate-800'}>{netDebtPosition.toFixed(0)} {t.currency}</b>
            </div>
          </button>

          {/* Question 5: What is happening in each branch? */}
          <button
            onClick={() => setActiveQuestion(5)}
            className={`rounded-2xl p-4 text-left rtl:text-right transition-all border ${
              activeQuestion === 5
                ? 'border-indigo-600 bg-indigo-50/60 shadow-md ring-2 ring-indigo-500/20'
                : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-xs font-bold text-white">
                Q5
              </span>
              <Building2 className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-3 text-xs font-bold text-slate-600 truncate">
              {t.q5Title || 'ماذا يحدث في كل فرع؟ (الفروع)'}
            </div>
            <div className="mt-1 font-mono text-lg font-black text-slate-900">
              {branches.length} Branches
            </div>
            <div className="mt-1 text-[11px] text-indigo-700 font-semibold">
              {activeShiftsCount} open shifts ({totalDrawerCash.toFixed(0)} {t.currency})
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DETAILED ANSWER SECTION CORRESPONDING TO ACTIVE QUESTION */}
      {/* ========================================================================= */}

      {/* ANSWER 1: HOW MUCH DID I SELL? */}
      {activeQuestion === 1 && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs text-white">السؤال الأول</span>
              <span>{'كم بعت؟ إجمالي المبيعات، الحجم، وسرعة العمليات'}</span>
            </h3>
            <button
              onClick={() => onNavigateTab('sales')}
              className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
            >
              <span>{t.viewDetails}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Key Metric Blocks */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-bold text-slate-500">إجمالي إيرادات المبيعات</span>
              <div className="mt-1 font-mono text-2xl font-black text-blue-600">
                {totalRevenue.toFixed(2)} {t.currency}
              </div>
              <span className="text-[11px] text-slate-400">إجمالي المبيعات المقفلة في الفترة</span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-bold text-slate-500">الكمية المباعة</span>
              <div className="mt-1 font-mono text-2xl font-black text-slate-900">
                {totalUnitsSold.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-400">زجاجات، كغ، قطع وكراتين</span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-bold text-slate-500">إجمالي فواتير العملاء</span>
              <div className="mt-1 font-mono text-2xl font-black text-slate-900">
                {totalInvoices}
              </div>
              <span className="text-[11px] text-slate-400">عدد فواتير نقاط البيع الفريدة</span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-bold text-slate-500">متوسط الفاتورة / السلة</span>
              <div className="mt-1 font-mono text-2xl font-black text-emerald-600">
                {averageTicket.toFixed(2)} {t.currency}
              </div>
              <span className="text-[11px] text-slate-400">متوسط الإنفاق لكل زيارة عميل</span>
            </div>
          </div>

          {/* Payment breakdown & Category split */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Sales by Payment Method */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h4 className="font-bold text-slate-900 text-sm mb-3">
                {'طرق تحصيل المبيعات'}
              </h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <Banknote className="h-4 w-4 text-emerald-600" />
                      النقد في الصندوق
                    </span>
                    <span className="font-mono text-slate-900 font-bold">
                      {salesByPayment.cash.toFixed(2)} {t.currency} ({totalRevenue > 0 ? ((salesByPayment.cash / totalRevenue) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalRevenue > 0 ? (salesByPayment.cash / totalRevenue) * 100 : 0}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <Smartphone className="h-4 w-4 text-rose-600" />
                      {t.vodafoneCash}
                    </span>
                    <span className="font-mono text-slate-900 font-bold">
                      {salesByPayment.vodafone_cash.toFixed(2)} {t.currency} ({totalRevenue > 0 ? ((salesByPayment.vodafone_cash / totalRevenue) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${totalRevenue > 0 ? (salesByPayment.vodafone_cash / totalRevenue) * 100 : 0}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      <Zap className="h-4 w-4 text-emerald-600" />
                      {t.instapay}
                    </span>
                    <span className="font-mono text-slate-900 font-bold">
                      {salesByPayment.instapay.toFixed(2)} {t.currency} ({totalRevenue > 0 ? ((salesByPayment.instapay / totalRevenue) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalRevenue > 0 ? (salesByPayment.instapay / totalRevenue) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Top 5 Best Sellers */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h4 className="font-bold text-slate-900 text-sm mb-3">
                {'أعلى منتجات الألبان مبيعاً'}
              </h4>
              <div className="divide-y divide-slate-100">
                {topSellingProducts.map((p, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 font-mono text-[10px] font-bold text-slate-600">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800">{p.name}</span>
                    </div>
                    <div className="text-right rtl:text-left font-mono">
                      <div className="font-extrabold text-slate-900">{p.revenue.toFixed(2)} {t.currency}</div>
                      <div className="text-[10px] text-slate-400">{p.quantity} وحدة مباعة</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ANSWER 2: HOW MUCH DID I MAKE? */}
      {activeQuestion === 2 && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs text-white">السؤال الثاني</span>
              <span>{'كم ربحت؟ مجمل الربح وقائمة الدخل وصافي الأرباح'}</span>
            </h3>
            <button
              onClick={() => onNavigateTab('pnl')}
              className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
            >
              <span>{t.viewDetails}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Waterfall P&L Breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h4 className="text-sm font-bold text-slate-900 mb-4">
              {'قائمة الدخل السريعة (Waterfall Income Statement)'}
            </h4>

            <div className="space-y-3 font-mono text-sm">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <span className="font-sans font-bold text-slate-800">(+) إجمالي إيرادات المبيعات</span>
                <span className="font-extrabold text-slate-900">+{totalRevenue.toFixed(2)} {t.currency}</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-rose-50/50 p-3 text-rose-700">
                <span className="font-sans font-semibold text-rose-800">(-) Cost of Goods Sold (تكلفة البضاعة المباعة - Milk & Raw Costs)</span>
                <span className="font-bold">-{totalCOGS.toFixed(2)} {t.currency}</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3 text-emerald-900 font-bold border border-emerald-200">
                <span className="font-sans font-black">(=) إجمالي الربح (مجمل الربح)</span>
                <span className="text-base font-black">+{grossProfit.toFixed(2)} {t.currency} ({grossMarginPercent.toFixed(1)}%)</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-rose-50/50 p-3 text-rose-700">
                <span className="font-sans font-semibold text-rose-800">(-) Operating OPEX (Rent, Chiller Power, Repairs)</span>
                <span className="font-bold">-{totalOpex.toFixed(2)} {t.currency}</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-rose-50/50 p-3 text-rose-700">
                <span className="font-sans font-semibold text-rose-800">(-) مسدد طاقم العمل Salaries & Wages</span>
                <span className="font-bold">-{totalPayrollPaid.toFixed(2)} {t.currency}</span>
              </div>

              <div className={`flex items-center justify-between rounded-xl p-4 font-black border-2 ${
                netProfit >= 0
                  ? 'border-emerald-500 bg-emerald-100/50 text-emerald-900'
                  : 'border-rose-500 bg-rose-100/50 text-rose-900'
              }`}>
                <span className="font-sans text-base">(=) Real Net Operating الربح (صافي الربح الفعلي)</span>
                <span className="text-xl">
                  {netProfit >= 0 ? `+${netProfit.toFixed(2)}` : netProfit.toFixed(2)} {t.currency}
                  <span className="text-xs font-normal ml-2">({netMarginPercent.toFixed(1)}% net margin)</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ANSWER 3: HOW MUCH STOCK DO I HAVE? */}
      {activeQuestion === 3 && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="rounded-lg bg-purple-600 px-2.5 py-1 text-xs text-white">السؤال الثالث</span>
              <span>{'كم بضاعتي ومخزوني؟ رأس المال والقيمة البيعية وصلاحية الألبان'}</span>
            </h3>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
            >
              <span>{t.viewDetails}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-bold text-slate-500">قيمة تكلفة المخزون</span>
              <div className="mt-1 font-mono text-2xl font-black text-slate-900">
                {totalStockCostVal.toFixed(2)} {t.currency}
              </div>
              <span className="text-[11px] text-slate-400">إجمالي رأس المال المستثمر</span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-bold text-slate-500">الإمكانات البيعية بالتجزئة</span>
              <div className="mt-1 font-mono text-2xl font-black text-purple-700">
                {totalStockRetailVal.toFixed(2)} {t.currency}
              </div>
              <span className="text-[11px] text-slate-400">الإيراد المتوقع إذا بيع بالكامل</span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-bold text-slate-500">الربح الإجمالي المحجوز</span>
              <div className="mt-1 font-mono text-2xl font-black text-emerald-600">
                +{potentialGrossMargin.toFixed(2)} {t.currency}
              </div>
              <span className="text-[11px] text-slate-400">الربح غير المتحقق في المخزون</span>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
              <span className="text-xs font-bold text-rose-800">Fresh رأس المال المعرض للخطر (≤7d)</span>
              <div className="mt-1 font-mono text-2xl font-black text-rose-700">
                {totalAtRiskValue.toFixed(2)} {t.currency}
              </div>
              <span className="text-[11px] text-rose-900/70">{expiringProducts.length} perishable batches expiring</span>
            </div>
          </div>

          {/* Expiring Products Alert Watchlist */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>{'ألبان سريعة التلف مهددة بانتهاء الصلاحية'}</span>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                {expiringProducts.length} Items Alert
              </span>
            </div>

            {expiringProducts.length === 0 ? (
              <p className="text-xs text-slate-500">كل دفعات الألبان بحالة جيدة (صلاحية تزيد عن 7 أيام).</p>
            ) : (
              <div className="divide-y divide-amber-200/60">
                {expiringProducts.map(p => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{p.nameAr ? p.nameAr : p.name}</span>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        الدفعة: {p.batchNumber} • المخزون: <b>{p.currentStock} {p.unit}</b>
                      </div>
                    </div>
                    <div className="text-right rtl:text-left font-mono">
                      <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        p.daysLeft <= 2 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {p.daysLeft <= 0 ? 'منتهي اليوم' : `${p.daysLeft} يوم متبقٍ`}
                      </span>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        الخطر: {p.riskVal.toFixed(2)} {t.currency}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ANSWER 4: HOW MUCH MONEY DO PEOPLE OWE ME / DO I OWE THEM? */}
      {activeQuestion === 4 && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="rounded-lg bg-amber-600 px-2.5 py-1 text-xs text-white">السؤال الرابع</span>
              <span>{'كم لي وكم عليّ؟ الذمم المدينة والالتزامات التجارية'}</span>
            </h3>
            <button
              onClick={() => onNavigateTab('debts')}
              className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
            >
              <span>{t.viewDetails}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Column 1: People Owe Me */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-emerald-800">المستحقات لي (الذمم المدينة)</span>
                <Users className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="font-mono text-2xl font-black text-emerald-700">
                +{totalReceivables.toFixed(2)} {t.currency}
              </div>
              <p className="text-xs text-emerald-900/70">
                {customersOwing.length} حساب نشط بآجال مفتوحة (مخابز تجارية، محلات حلويات، عملاء أوفياء).
              </p>
              <div className="pt-2 border-t border-emerald-200/60 divide-y divide-emerald-100 text-xs">
                {customersOwing.map(c => (
                  <div key={c.id} className="py-2 flex justify-between">
                    <div>
                      <div className="font-bold text-slate-800">{c.name}</div>
                      <div className="text-[10px] text-slate-500">{c.phone}</div>
                    </div>
                    <span className="font-mono font-extrabold text-emerald-700">
                      +{(c.outstandingBalance || 0).toFixed(2)} {t.currency}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: I Owe Them */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-rose-800">مستحقات عليّ (الذمم الدائنة والديون)</span>
                <Truck className="h-4 w-4 text-rose-600" />
              </div>
              <div className="font-mono text-2xl font-black text-rose-700">
                -{totalPayables.toFixed(2)} {t.currency}
              </div>
              <p className="text-xs text-rose-900/70">
                {vendorsOwed.length} dairy suppliers, {loans.length} bank machinery loans, and pending staff salaries.
              </p>
              <div className="pt-2 border-t border-rose-200/60 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>مستحقات الموردين:</span>
                  <span className="font-mono font-bold text-rose-700">-{totalVendorPayables.toFixed(2)} {t.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>قروض المعدات:</span>
                  <span className="font-mono font-bold text-amber-700">-{totalLoansRemaining.toFixed(2)} {t.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>رواتب الموظفين المستحقة:</span>
                  <span className="font-mono font-bold text-slate-700">-{totalPendingSalaries.toFixed(2)} {t.currency}</span>
                </div>
              </div>
            </div>

            {/* Column 3: Net Balance Position */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase text-slate-500">رأس المال العامل الصافي التجاري</span>
                <div className={`mt-2 font-mono text-2xl font-black ${
                  netDebtPosition >= 0 ? 'text-emerald-600' : 'text-slate-900'
                }`}>
                  {netDebtPosition >= 0 ? `+${netDebtPosition.toFixed(2)}` : netDebtPosition.toFixed(2)} {t.currency}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {netDebtPosition >= 0 
                    ? 'سيولة صحية: ذمم العملاء تفوق الالتزامات التشغيلية المستحقة فوراً.'
                    : 'رأس المال العامل مديون: شروط الموردين وأقساط المعدات تفوق أرصدة العملاء.'}
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('debts')}
                className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
              >
                فحص دفتر المدينين والدائنين
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANSWER 5: WHAT IS HAPPENING IN EACH BRANCH? */}
      {activeQuestion === 5 && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs text-white">السؤال الخامس</span>
              <span>{'ماذا يحدث في كل فرع؟ مقارنة أداء الفروع الحية والورديات'}</span>
            </h3>
            <button
              onClick={() => onNavigateTab('branches')}
              className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
            >
              <span>{t.viewDetails}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {branchData.map(b => (
              <div key={b.id} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-800">
                      {b.code}
                    </span>
                    <h4 className="font-bold text-slate-900">{b.nameAr}</h4>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-500">
                    {b.share.toFixed(0)}% sales
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">الإيراد</span>
                    <span className="font-extrabold text-slate-900">{b.revenue.toFixed(2)} {t.currency}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">الربح</span>
                    <span className="font-extrabold text-emerald-600">+{b.profit.toFixed(2)} {t.currency}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      Till Shift:
                    </span>
                    {b.openShift ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {(b.openShift.cashierName || b.openShift.employeeName).split(' ')[0]} (Open)
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">الوردية مقفلة</span>
                    )}
                  </div>
                  {b.openShift && (
                    <div className="mt-1 flex justify-between text-[11px] text-slate-600 font-mono">
                      <span>الرصيد المتوقع بالصندوق:</span>
                      <span className="font-bold text-emerald-700">{b.openShift.expectedCash.toFixed(2)} {t.currency}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* "AND MORE" EXECUTIVE INSIGHTS & ACTIONS BANNER */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/80 p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <h4 className="font-bold text-slate-900 text-sm">
            {'تحليلات ذكية وتوصيات تشغيلية إضافية (والمزيد)'}
          </h4>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="rounded-xl border border-blue-200/70 bg-white/90 p-3">
            <span className="font-bold text-blue-900 block mb-1">أعلى منتج مدرّ للإيراد</span>
            <p className="text-slate-600 leading-relaxed">
              {topSellingProducts[0]?.name || 'حليب طازج'} يساهم بنحو {topSellingProducts[0] && totalRevenue > 0 ? ((topSellingProducts[0].revenue / totalRevenue) * 100).toFixed(0) : '35'}% من فواتير مبيعاتك الحالية.
            </p>
          </div>

          <div className="rounded-xl border border-amber-200/70 bg-white/90 p-3">
            <span className="font-bold text-amber-900 block mb-1">مخاطر تلف الألبان</span>
            <p className="text-slate-600 leading-relaxed">
              {expiringProducts.length > 0 
                ? `${totalAtRiskValue.toFixed(0)} ${t.currency} من الألبان سريعة التلف تنتهي خلال 7 أيام. ضع خصم 15% أو عرضاً ترويجياً.` 
                : 'لا يوجد خطر تلف ألبان في الدفعات المبردة النشطة.'}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200/70 bg-white/90 p-3">
            <span className="font-bold text-emerald-900 block mb-1">الربحية وسلامة الهامش</span>
            <p className="text-slate-600 leading-relaxed">
              متوسط هامش الربح الإجمالي {grossMarginPercent.toFixed(1)}%. صافي الهامش {netMarginPercent.toFixed(1)}% بعد التكاليف التشغيلية والأجور.
            </p>
          </div>

          <div className="rounded-xl border border-purple-200/70 bg-white/90 p-3">
            <span className="font-bold text-purple-900 block mb-1">التوسع متعدد الفروع</span>
            <p className="text-slate-600 leading-relaxed">
              {leadingBranch ? `${leadingBranch.nameAr} يتصدر بنسبة ${leadingBranch.share.toFixed(0)}% من حجم مبيعات السلسلة.` : 'جميع الفروع تعمل بتوازن.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
