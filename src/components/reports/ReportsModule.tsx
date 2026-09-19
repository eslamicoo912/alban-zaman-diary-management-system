import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Download, 
  Printer, 
  DollarSign, 
  AlertTriangle, 
  Clock, 
  ShoppingBag,
  Layers,
  Percent,
  Smartphone,
  Zap,
  Banknote,
  ShieldAlert,
  Users,
  Truck,
  Building2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  PackageSearch,
  Sparkles,
  Scale,
  Search
} from 'lucide-react';
import { FiveQuestionsDashboard } from './FiveQuestionsDashboard';
import { DebtsAndReceivablesReport } from './DebtsAndReceivablesReport';
import { BranchComparisonReport } from './BranchComparisonReport';

export const ReportsModule: React.FC = () => {
  const {
    t,
    sales,
    products,
    employees,
    expenses,
    returns,
    shifts,
    purchases,
    vendors,
    branches,
    activeBranchId,
  } = useApp();

  const [activeReport, setActiveReport] = useState<
    '5questions' | 'sales' | 'products' | 'pnl' | 'inventory' | 'expiry' | 'shifts' | 'purchases' | 'employees' | 'debts' | 'branches'
  >('5questions');

  // Time filter
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'month' | 'all' | 'custom'>('30days');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [reportSearch, setReportSearch] = useState<string>('');
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  // Manual date-window check shared by sales / expenses / supplier reports
  const inDateWindow = (dateStr: string): boolean => {
    const now = new Date();
    const d = new Date(dateStr);
    if (dateRange === 'today') {
      return d.toDateString() === now.toDateString();
    }
    if (dateRange === '7days') {
      return now.getTime() - d.getTime() <= 7 * 86400000;
    }
    if (dateRange === '30days') {
      return now.getTime() - d.getTime() <= 30 * 86400000;
    }
    if (dateRange === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (dateRange === 'custom') {
      if (customFrom) {
        const from = new Date(`${customFrom}T00:00:00`);
        if (d.getTime() < from.getTime()) return false;
      }
      if (customTo) {
        const to = new Date(`${customTo}T23:59:59.999`);
        if (d.getTime() > to.getTime()) return false;
      }
      return true;
    }
    return true;
  };

  // Filtered sales based on date and branch
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      // Branch filter
      if (branchFilter !== 'all' && s.branchId && s.branchId !== branchFilter) {
        return false;
      }

      if (!inDateWindow(s.date)) {
        return false;
      }

      const q = reportSearch.trim().toLowerCase();
      if (q) {
        const itemMatch = s.items.some(
          i =>
            i.productName.toLowerCase().includes(q) ||
            (i.productNameAr || '').toLowerCase().includes(q)
        );
        const textMatch =
          s.receiptNumber.toLowerCase().includes(q) ||
          (s.customerName || '').toLowerCase().includes(q) ||
          (s.employeeName || '').toLowerCase().includes(q);
        if (!itemMatch && !textMatch) return false;
      }

      return true;
    });
  }, [sales, dateRange, customFrom, customTo, branchFilter, reportSearch, inDateWindow]);

  // Financial Aggregates
  const totalRevenue = useMemo(
    () => filteredSales.reduce((s, i) => s + i.total, 0),
    [filteredSales]
  );
  const totalCOGS = useMemo(
    () => filteredSales.reduce((s, i) => s + i.totalCost, 0),
    [filteredSales]
  );
  const grossProfit = totalRevenue - totalCOGS;
  const grossMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Expense report honors the same manual date window
  const filteredExpenses = expenses.filter(e => inDateWindow(e.date));
  const totalExpensesAmount = useMemo(
    () => filteredExpenses.reduce((s, e) => s + e.amount, 0),
    [filteredExpenses]
  );
  const netProfit = grossProfit - totalExpensesAmount;
  const netMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const averageTicket = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    const counts: Record<string, { total: number; count: number }> = {
      cash: { total: 0, count: 0 },
      vodafone_cash: { total: 0, count: 0 },
      instapay: { total: 0, count: 0 },
    };

    filteredSales.forEach(s => {
      const m = s.paymentMethod || 'cash';
      if (!counts[m]) counts[m] = { total: 0, count: 0 };
      counts[m].total += s.total;
      counts[m].count += 1;
    });

    return counts;
  }, [filteredSales]);

  // Daily Trend Data (Last 7 intervals or days)
  const dailyTrend = useMemo(() => {
    const daysMap: Record<string, { label: string; revenue: number; profit: number }> = {};
    const now = new Date();

    // Last 7 days keys
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('ar-SA', {
        weekday: 'short',
        month: 'numeric',
        day: 'numeric',
      });
      daysMap[key] = { label, revenue: 0, profit: 0 };
    }

    filteredSales.forEach(s => {
      const key = s.date.slice(0, 10);
      if (daysMap[key]) {
        daysMap[key].revenue += s.total;
        daysMap[key].profit += s.totalProfit;
      }
    });

    const entries = Object.values(daysMap);
    const maxRev = Math.max(...entries.map(e => e.revenue), 100);

    return entries.map(e => ({
      ...e,
      heightPercent: Math.min(100, Math.round((e.revenue / maxRev) * 100)),
    }));
  }, [filteredSales]);

  // Product sales breakdown
  const productPerformance = useMemo(() => {
    const map: Record<
      string,
      { id: string; name: string; quantity: number; revenue: number; profit: number }
    > = {};

    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (!map[item.productId]) {
          map[item.productId] = {
            id: item.productId,
            name: item.productName,
            quantity: 0,
            revenue: 0,
            profit: 0,
          };
        }
        const itemProfit = item.lineTotal - item.quantity * item.costPrice;
        map[item.productId].quantity += item.quantity;
        map[item.productId].revenue += item.lineTotal;
        map[item.productId].profit += itemProfit;
      });
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  // Inventory Valuation & Freshness Metrics
  const inventoryStats = useMemo(() => {
    let totalCostVal = 0;
    let totalRetailVal = 0;
    let totalUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach(p => {
      totalCostVal += p.currentStock * p.costPrice;
      totalRetailVal += p.currentStock * p.salePrice;
      totalUnits += p.currentStock;
      if (p.currentStock <= 0) outOfStockCount++;
      else if (p.currentStock <= p.minStock) lowStockCount++;
    });

    const potentialGrossProfit = totalRetailVal - totalCostVal;

    return {
      totalCostVal,
      totalRetailVal,
      potentialGrossProfit,
      totalUnits,
      lowStockCount,
      outOfStockCount,
    };
  }, [products]);

  // Expiry watch list & Capital at risk
  const expiringProducts = useMemo(() => {
    const now = new Date();
    return products
      .map(p => {
        const exp = new Date(p.expiryDate);
        const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const riskVal = p.currentStock * p.costPrice;
        return { ...p, daysLeft, riskVal };
      })
      .filter(p => p.daysLeft <= 14)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [products]);

  const totalAtRiskValue = useMemo(
    () => expiringProducts.reduce((sum, p) => sum + p.riskVal, 0),
    [expiringProducts]
  );

  // Employee sales performance
  const employeePerformance = useMemo(() => {
    const map: Record<string, { name: string; orders: number; revenue: number; profit: number }> = {};
    employees.forEach(e => {
      map[e.id] = { name: e.name, orders: 0, revenue: 0, profit: 0 };
    });

    filteredSales.forEach(s => {
      if (map[s.employeeId]) {
        map[s.employeeId].orders += 1;
        map[s.employeeId].revenue += s.total;
        map[s.employeeId].profit += s.totalProfit;
      }
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, employees]);

  // Actions
  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    const dateStr = new Date().toISOString().slice(0, 10);

    if (activeReport === 'products') {
      csvContent += `اسم المنتج,الكمية المباعة,الإيراد (${t.currency}),الربح (${t.currency})\n`;
      productPerformance.forEach(row => {
        csvContent += `"${row.name}",${row.quantity},${row.revenue.toFixed(2)},${row.profit.toFixed(2)}\n`;
      });
    } else if (activeReport === 'expiry') {
      csvContent += `اسم المنتج,الدفعة,المخزون الحالي,الوحدة,تاريخ الانتهاء,الأيام المتبقية,رأس المال المعرض للخطر (${t.currency})\n`;
      expiringProducts.forEach(row => {
        csvContent += `"${row.name}","${row.batchNumber}",${row.currentStock},"${row.unit}","${row.expiryDate}",${row.daysLeft},${row.riskVal.toFixed(2)}\n`;
      });
    } else if (activeReport === 'inventory') {
      csvContent += `المنتج,SKU,الباركود,المخزون,الوحدة,التكلفة (${t.currency}),البيع (${t.currency}),إجمالي التكلفة (${t.currency}),إجمالي البيع بالتجزئة (${t.currency})\n`;
      products.forEach(p => {
        csvContent += `"${p.name}","${p.sku}","${p.barcode}",${p.currentStock},"${p.unit}",${p.costPrice.toFixed(2)},${p.salePrice.toFixed(2)},${(p.currentStock * p.costPrice).toFixed(2)},${(p.currentStock * p.salePrice).toFixed(2)}\n`;
      });
    } else {
      csvContent += `رقم الفاتورة,التاريخ,عدد الأصناف,الكاشير,طريقة الدفع,الإجمالي (${t.currency}),تكلفة البضاعة (${t.currency}),الربح (${t.currency})\n`;
      filteredSales.forEach(row => {
        csvContent += `"${row.receiptNumber}","${row.date}",${row.items.length},"${row.employeeName}","${row.paymentMethod}",${row.total.toFixed(2)},${row.totalCost.toFixed(2)},${row.totalProfit.toFixed(2)}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dairy_report_${activeReport}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Header & Global Controls */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.reportsTitle}</h2>
          <p className="text-xs text-slate-500">
            {'لوحة التحليلات التنفيذية: المبيعات، الأرباح، تقييم المخزون، صلاحية الألبان، والورديات'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Text Search (receipt #, customer, product) */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <input
              value={reportSearch}
              onChange={e => setReportSearch(e.target.value)}
              placeholder={'بحث بالرقم/العميل/الصنف'}
              className="w-36 bg-transparent font-medium text-slate-700 focus:outline-hidden lg:w-48"
            />
            {reportSearch && (
              <button
                onClick={() => setReportSearch('')}
                className="text-slate-400 hover:text-slate-600"
                aria-label="مسح البحث"
              >
                ✕
              </button>
            )}
          </div>

          {/* Branch Filter */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-hidden"
            >
              <option value="all">{t.all} الأفرع</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Date range picker */}
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 text-xs">
            {(['today', '7days', '30days', 'month', 'all', 'custom'] as const).map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                  dateRange === range
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {range === 'today'
                  ? t.today
                  : range === '7days'
                  ? '7 أيام'
                  : range === '30days'
                  ? '30 يوماً'
                  : range === 'month'
                  ? t.thisMonth
                  : range === 'custom'
                  ? 'مخصص'
                  : t.all}
              </button>
            ))}

            {/* Manual from/to date inputs */}
            {dateRange === 'custom' && (
              <div className="flex flex-wrap items-center gap-1 border-t border-dashed border-slate-200 px-1 pt-1.5 sm:border-t-0 sm:pt-0">
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                  من
                  <input
                    type="date"
                    value={customFrom}
                    onChange={e => setCustomFrom(e.target.value)}
                    className="rounded-lg border border-slate-200 px-1.5 py-1 font-mono text-[10px] text-slate-700 focus:border-blue-500 focus:outline-hidden"
                  />
                </label>
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                  إلى
                  <input
                    type="date"
                    value={customTo}
                    onChange={e => setCustomTo(e.target.value)}
                    className="rounded-lg border border-slate-200 px-1.5 py-1 font-mono text-[10px] text-slate-700 focus:border-blue-500 focus:outline-hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Download className="h-4 w-4 text-blue-600" />
            <span>تصدير CSV</span>
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Printer className="h-4 w-4 text-slate-600" />
            <span>{t.print}</span>
          </button>
        </div>
      </div>

      {/* Top Executive KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Sales */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{t.totalSales}</span>
            <ShoppingBag className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-1 font-mono text-xl font-extrabold text-slate-900">
            {totalRevenue.toFixed(2)} {t.currency}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>{filteredSales.length} invoices</span>
            <span className="font-mono font-medium text-slate-600">
              Avg: {averageTicket.toFixed(1)} {t.currency}
            </span>
          </div>
        </div>

        {/* Cost of Goods Sold */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{t.cogs}</span>
            <Layers className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-1 font-mono text-xl font-extrabold text-slate-600">
            {totalCOGS.toFixed(2)} {t.currency}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {totalRevenue > 0 ? ((totalCOGS / totalRevenue) * 100).toFixed(1) : 0}% of revenue
          </div>
        </div>

        {/* Gross Profit Margin */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{t.grossProfit}</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-1 font-mono text-xl font-extrabold text-blue-600">
            +{grossProfit.toFixed(2)} {t.currency}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-600">
            <span>{grossMarginPercent.toFixed(1)}% gross margin</span>
          </div>
        </div>

        {/* Net Profit After OPEX */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{t.netProfit}</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div
            className={`mt-1 font-mono text-xl font-black ${
              netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {netProfit >= 0 ? `+${netProfit.toFixed(2)}` : netProfit.toFixed(2)} {t.currency}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Net margin: {netMarginPercent.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Visual Analytics Row: 7-Day Trend Chart & Payment Method Distribution */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Daily Sales Bar Trend */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                {t.dailyTrend || '7-Day Revenue & Profit Trajectory'}
              </h3>
              <p className="text-[11px] text-slate-400">تدفق الأداء اليومي</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="flex items-center gap-1 text-blue-600">
                <span className="h-2 w-2 rounded-full bg-blue-600" /> Revenue
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Profit
              </span>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="flex h-36 items-end justify-between gap-2 pt-4 px-2 border-b border-slate-100">
            {dailyTrend.map((day, idx) => (
              <div key={idx} className="flex flex-1 flex-col items-center gap-1 h-full justify-end group">
                <div className="w-full flex items-end justify-center gap-1 h-full">
                  {/* Revenue Bar */}
                  <div
                    style={{ height: `${Math.max(6, day.heightPercent)}%` }}
                    className="w-4 sm:w-6 rounded-t-md bg-blue-500 hover:bg-blue-600 transition-all relative group/bar"
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover/bar:block rounded-md bg-slate-900 text-white text-[9px] font-mono py-0.5 px-1.5 whitespace-nowrap z-20">
                      {day.revenue.toFixed(0)} {t.currency}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-slate-500 truncate max-w-[48px]">
                  {day.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Breakdown Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm mb-1">
              {t.paymentBreakdown || 'تفصيل طرق الدفع'}
            </h3>
            <p className="text-[11px] text-slate-400 mb-3">توزيع وسائل الدفع على النقاط</p>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Cash */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-0.5">
                <span className="flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{t.cash}</span>
                </span>
                <span className="font-mono font-bold">
                  {paymentBreakdown.cash.total.toFixed(2)} {t.currency}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${
                      totalRevenue > 0
                        ? (paymentBreakdown.cash.total / totalRevenue) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Vodafone Cash */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-0.5">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-rose-600" />
                  <span>{t.vodafoneCash}</span>
                </span>
                <span className="font-mono font-bold">
                  {paymentBreakdown.vodafone_cash.total.toFixed(2)} {t.currency}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{
                    width: `${
                      totalRevenue > 0
                        ? (paymentBreakdown.vodafone_cash.total / totalRevenue) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* InstaPay */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-0.5">
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{t.instapay}</span>
                </span>
                <span className="font-mono font-bold">
                  {paymentBreakdown.instapay.total.toFixed(2)} {t.currency}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${
                      totalRevenue > 0
                        ? (paymentBreakdown.instapay.total / totalRevenue) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Module Tabs Navigation */}
      <div className="flex gap-2 overflow-x-auto border-b border-slate-200 text-xs font-bold scrollbar-none">
        <button
          onClick={() => setActiveReport('5questions')}
          className={`border-b-2 pb-2.5 px-3 whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeReport === '5questions'
              ? 'border-blue-600 text-blue-600 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          <span>{t.fiveQuestionsTitle || 'الأسئلة الخمسة الأساسية'}</span>
        </button>

        <button
          onClick={() => setActiveReport('sales')}
          className={`border-b-2 pb-2.5 px-3 whitespace-nowrap transition-all ${
            activeReport === 'sales'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.salesReport}
        </button>

        <button
          onClick={() => setActiveReport('products')}
          className={`border-b-2 pb-2.5 px-3 whitespace-nowrap transition-all ${
            activeReport === 'products'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.productSales}
        </button>

        <button
          onClick={() => setActiveReport('pnl')}
          className={`border-b-2 pb-2.5 px-3 whitespace-nowrap transition-all ${
            activeReport === 'pnl'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.profitLoss}
        </button>

        <button
          onClick={() => setActiveReport('debts')}
          className={`border-b-2 pb-2.5 px-3 whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeReport === 'debts'
              ? 'border-blue-600 text-blue-600 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="h-3.5 w-3.5" />
          <span>{'الذمم والديون (كم لي وعليّ)'}</span>
        </button>

        <button
          onClick={() => setActiveReport('branches')}
          className={`border-b-2 pb-2.5 px-3 whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeReport === 'branches'
              ? 'border-blue-600 text-blue-600 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>{'مقارنة الفروع'}</span>
        </button>

        <button
          onClick={() => setActiveReport('inventory')}
          className={`border-b-2 pb-2.5 px-3 whitespace-nowrap transition-all ${
            activeReport === 'inventory'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.inventoryValuation || 'تقييم المخزون'}
        </button>

        <button
          onClick={() => setActiveReport('expiry')}
          className={`border-b-2 pb-2.5 px-3 whitespace-nowrap transition-all ${
            activeReport === 'expiry'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.expiryReport}
        </button>

        <button
          onClick={() => setActiveReport('shifts')}
          className={`border-b-2 pb-2.5 px-3 whitespace-nowrap transition-all ${
            activeReport === 'shifts'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.shiftsReport || 'الورديات ومراجعة الدرج'}
        </button>

        <button
          onClick={() => setActiveReport('purchases')}
          className={`border-b-2 pb-2.5 px-3 whitespace-nowrap transition-all ${
            activeReport === 'purchases'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.purchasesReport || 'المشتريات والموردون'}
        </button>

        <button
          onClick={() => setActiveReport('employees')}
          className={`border-b-2 pb-2.5 px-3 whitespace-nowrap transition-all ${
            activeReport === 'employees'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.employeePerformance}
        </button>
      </div>

      {/* TAB 0: THE 5 CORE BUSINESS QUESTIONS */}
      {activeReport === '5questions' && (
        <FiveQuestionsDashboard
          filteredSales={filteredSales}
          dateRange={dateRange}
          branchFilter={branchFilter}
          onNavigateTab={tab => setActiveReport(tab)}
        />
      )}

      {/* TAB: DEBTS & RECEIVABLES */}
      {activeReport === 'debts' && (
        <DebtsAndReceivablesReport />
      )}

      {/* TAB: BRANCH COMPARISON */}
      {activeReport === 'branches' && (
        <BranchComparisonReport onSelectBranchFilter={id => setBranchFilter(id)} />
      )}

      {/* TAB 1: SALES & INVOICES LIST (WITH EXPANDABLE DETAILS) */}
      {activeReport === 'sales' && (
        <div className="space-y-2">
          {filteredSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
              <PackageSearch className="h-10 w-10 text-slate-300 mb-2" />
              <h3 className="font-bold text-slate-800 text-sm">لا توجد فواتير</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                لم تُسجل أي فواتير مبيعات في الفترة المحددة. بدّل إلى «كل الفترات» أو قم بإصدار طلبات من شاشة نقطة البيع.
              </p>
              <button
                onClick={() => setDateRange('all')}
                className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                View All Time
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-xs rtl:text-right">
                <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
                  <tr>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-3">التاريخ والوقت</th>
                    <th className="py-3 px-3">العميل</th>
                    <th className="py-3 px-3">كاشير</th>
                    <th className="py-3 px-3">الطريقة</th>
                    <th className="py-3 px-3 text-right rtl:text-left">الإيراد</th>
                    <th className="py-3 px-3 text-right rtl:text-left">تكلفة البضاعة المباعة</th>
                    <th className="py-3 px-3 text-right rtl:text-left">الربح</th>
                    <th className="py-3 px-4 text-center">الأصناف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.map(s => {
                    const isExpanded = expandedSaleId === s.id;
                    return (
                      <React.Fragment key={s.id}>
                        <tr
                          onClick={() => setExpandedSaleId(isExpanded ? null : s.id)}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 flex items-center gap-1.5">
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5 text-blue-600" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                            )}
                            <span>{s.receiptNumber}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-500 text-[11px]">
                            {new Date(s.date).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-slate-800">
                            {s.customerName || t.walkInCustomer}
                          </td>
                          <td className="py-3 px-3 text-slate-600">{s.employeeName}</td>
                          <td className="py-3 px-3 capitalize">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                              {{ cash: t.cash, vodafone_cash: t.vodafoneCash, instapay: t.instapay }[s.paymentMethod] || s.paymentMethod}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 rtl:text-left">
                            {s.total.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-500 rtl:text-left">
                            {s.totalCost.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 rtl:text-left">
                            +{s.totalProfit.toFixed(2)} {t.currency}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-500 font-semibold">
                            {s.items.length} lines
                          </td>
                        </tr>

                        {/* Expanded Items Drawer */}
                        {isExpanded && (
                          <tr className="bg-slate-50/70">
                            <td colSpan={9} className="p-3">
                              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                                <span className="text-[11px] font-bold text-slate-700 block">
                                  Purchased Line Items ({s.items.length})
                                </span>
                                <table className="w-full text-left text-[11px] rtl:text-right">
                                  <thead className="border-b border-slate-100 text-slate-400 font-bold">
                                    <tr>
                                      <th className="py-1">الصنف</th>
                                      <th className="py-1 text-center">الكمية</th>
                                      <th className="py-1 text-right rtl:text-left">سعر الوحدة</th>
                                      <th className="py-1 text-right rtl:text-left">إجمالي السطر</th>
                                      <th className="py-1 text-right rtl:text-left text-emerald-600">{t.netProfit}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {s.items.map((it, i) => (
                                      <tr key={i}>
                                        <td className="py-1 font-semibold text-slate-800">
                                          {it.productName}
                                        </td>
                                        <td className="py-1 text-center font-mono font-bold">
                                          {it.quantity} {it.unit}
                                        </td>
                                        <td className="py-1 text-right font-mono rtl:text-left">
                                          {it.salePrice.toFixed(2)}
                                        </td>
                                        <td className="py-1 text-right font-mono font-bold text-slate-900 rtl:text-left">
                                          {it.lineTotal.toFixed(2)} {t.currency}
                                        </td>
                                        <td className="py-1 text-right font-mono font-bold text-emerald-600 rtl:text-left">
                                          {(it.profit !== undefined ? it.profit : it.lineTotal - it.costPrice * it.quantity).toFixed(2)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PRODUCT PERFORMANCE & CONTRIBUTION */}
      {activeReport === 'products' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs rtl:text-right">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
              <tr>
                <th className="py-3 px-4">الترتيب</th>
                <th className="py-3 px-4">اسم الصنف</th>
                <th className="py-3 px-3 text-center">الوحدات المباعة</th>
                <th className="py-3 px-3 text-right rtl:text-left">الإيراد الإجمالي</th>
                <th className="py-3 px-4 text-right rtl:text-left">مساهمة الربح الصافي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productPerformance.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono text-slate-400">#{idx + 1}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                    {p.quantity}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 rtl:text-left">
                    {p.revenue.toFixed(2)} {t.currency}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 rtl:text-left">
                    +{p.profit.toFixed(2)} {t.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: EXECUTIVE PROFIT & LOSS STATEMENT */}
      {activeReport === 'pnl' && (
        <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Executive Profit & Loss Statement (Income Statement)
            </h3>
            <p className="text-xs text-slate-500">
              Selected Window: {dateRange} • Branch: {branchFilter}
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between font-bold text-slate-800 text-sm border-b pb-2">
              <span>إجمالي إيرادات المبيعات</span>
              <span className="font-mono">{totalRevenue.toFixed(2)} {t.currency}</span>
            </div>

            <div className="flex justify-between text-slate-600 pl-4 rtl:pl-0 rtl:pr-4">
              <span>الخصم: التكلفة المباشرة للبضاعة المباعة</span>
              <span className="font-mono text-rose-600">-{totalCOGS.toFixed(2)} {t.currency}</span>
            </div>

            <div className="flex justify-between font-bold text-blue-800 bg-blue-50/80 p-3 rounded-xl">
              <span>إجمالي الربح (قبل المصروفات التشغيلية)</span>
              <span className="font-mono">
                +{grossProfit.toFixed(2)} {t.currency} ({grossMarginPercent.toFixed(1)}%)
              </span>
            </div>

            <div className="pt-2 font-bold text-slate-800">المصروفات التشغيلية:</div>
            {filteredExpenses.map(e => (
              <div key={e.id} className="flex justify-between text-slate-600 pl-4 rtl:pl-0 rtl:pr-4">
                <span>• {e.expenseType} {e.notes ? `(${e.notes})` : ''}</span>
                <span className="font-mono text-rose-600">-{e.amount.toFixed(2)} {t.currency}</span>
              </div>
            ))}

            <div className="flex justify-between font-bold text-slate-700 border-t pt-2 pl-4 rtl:pl-0 rtl:pr-4">
              <span>إجمالي المصروفات التشغيلية</span>
              <span className="font-mono text-rose-700">-{totalExpensesAmount.toFixed(2)} {t.currency}</span>
            </div>

            <div className="flex justify-between font-extrabold text-slate-900 border-t-2 border-slate-300 pt-3 text-base">
              <span>صافي الربح التشغيلي / (الخسارة)</span>
              <span className={`font-mono ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {netProfit >= 0 ? `+${netProfit.toFixed(2)}` : netProfit.toFixed(2)} {t.currency}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INVENTORY VALUATION REPORT */}
      {activeReport === 'inventory' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-semibold text-slate-500">إجمالي وحدات المخزون</span>
              <div className="mt-1 font-mono text-xl font-bold text-slate-900">
                {inventoryStats.totalUnits} items
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-semibold text-slate-500">{t.totalCostValue}</span>
              <div className="mt-1 font-mono text-xl font-bold text-slate-700">
                {inventoryStats.totalCostVal.toFixed(2)} {t.currency}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-semibold text-slate-500">{t.totalRetailValue}</span>
              <div className="mt-1 font-mono text-xl font-bold text-blue-600">
                {inventoryStats.totalRetailVal.toFixed(2)} {t.currency}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-semibold text-slate-500">{t.potentialProfit}</span>
              <div className="mt-1 font-mono text-xl font-bold text-emerald-600">
                +{inventoryStats.potentialGrossProfit.toFixed(2)} {t.currency}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs rtl:text-right">
              <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
                <tr>
                  <th className="py-3 px-4">{t.productName}</th>
                  <th className="py-3 px-3">{t.sku}</th>
                  <th className="py-3 px-3 text-center">{t.stock}</th>
                  <th className="py-3 px-3 text-right rtl:text-left">التكلفة / الوحدة</th>
                  <th className="py-3 px-3 text-right rtl:text-left">البيع بالتجزئة / الوحدة</th>
                  <th className="py-3 px-3 text-right rtl:text-left">إجمالي التكلفة</th>
                  <th className="py-3 px-4 text-right rtl:text-left">إجمالي قيمة البيع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                    <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">{p.sku}</td>
                    <td className="py-3 px-3 text-center font-bold">
                      {p.currentStock} {p.unit}
                    </td>
                    <td className="py-3 px-3 text-right font-mono rtl:text-left">
                      {p.costPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-blue-600 rtl:text-left">
                      {p.salePrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700 rtl:text-left">
                      {(p.currentStock * p.costPrice).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 rtl:text-left">
                      {(p.currentStock * p.salePrice).toFixed(2)} {t.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: FRESHNESS & EXPIRY WATCH REPORT */}
      {activeReport === 'expiry' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-6 w-6 text-amber-600" />
              <div>
                <h4 className="font-bold text-amber-950 text-xs sm:text-sm">
                  حد خطر نضارة الألبان
                </h4>
                <p className="text-[11px] text-amber-800">
                  {expiringProducts.length} صنف سريع التلف يحتاج تدويراً أو تخفيضاً فورياً
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold text-amber-700 block">إجمالي رأس المال المعرض للخطر</span>
              <span className="font-mono text-base font-black text-rose-700">
                {totalAtRiskValue.toFixed(2)} {t.currency}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs rtl:text-right">
              <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
                <tr>
                  <th className="py-3 px-4">اسم الصنف</th>
                  <th className="py-3 px-3">رقم التشغيلة</th>
                  <th className="py-3 px-3 text-center">المخزون المتوفر</th>
                  <th className="py-3 px-3">تاريخ الصلاحية</th>
                  <th className="py-3 px-3">درجة الاستعجال</th>
                  <th className="py-3 px-4 text-right rtl:text-left">رأس المال المعرض للخطر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expiringProducts.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{p.batchNumber}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">
                      {p.currentStock} {p.unit}
                    </td>
                    <td className="py-3 px-3 font-mono">{p.expiryDate}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          p.daysLeft < 0
                            ? 'bg-rose-600 text-white'
                            : p.daysLeft <= 3
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.daysLeft < 0 ? t.expired : `${p.daysLeft} يوماً متبقياً`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-700 rtl:text-left">
                      {p.riskVal.toFixed(2)} {t.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: SHIFTS & TILL AUDIT REPORT */}
      {activeReport === 'shifts' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs rtl:text-right">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
              <tr>
                <th className="py-3 px-4">رقم الوردية</th>
                <th className="py-3 px-3">كاشير</th>
                <th className="py-3 px-3">وقت البدء</th>
                <th className="py-3 px-3">رصيد الافتتاح</th>
                <th className="py-3 px-3">المبيعات النقدية</th>
                <th className="py-3 px-3">العد الفعلي</th>
                <th className="py-3 px-3 text-right rtl:text-left">الفرق (زيادة/نقص)</th>
                <th className="py-3 px-4 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shifts.map(sh => {
                const diff = (sh.actualCash || 0) - (sh.expectedCash || 0);
                return (
                  <tr key={sh.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{sh.id}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{sh.employeeName}</td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {new Date(sh.openedAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono">{sh.openingCash.toFixed(2)}</td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-600">
                      {sh.cashSales.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {sh.actualCash !== undefined ? sh.actualCash.toFixed(2) : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold rtl:text-left">
                      {sh.status === 'Closed' ? (
                        <span className={diff >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                          {diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} {t.currency}
                        </span>
                      ) : (
                        <span className="text-slate-400">نشط</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          sh.status === 'Open'
                            ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {sh.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 7: PURCHASES & VENDORS REPORT */}
      {activeReport === 'purchases' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs rtl:text-right">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
              <tr>
                <th className="py-3 px-4">رقم أمر الشراء</th>
                <th className="py-3 px-3">اسم المورد</th>
                <th className="py-3 px-3">تاريخ الإصدار</th>
                <th className="py-3 px-3">عدد الأصناف</th>
                <th className="py-3 px-3 text-right rtl:text-left">إجمالي أمر الشراء</th>
                <th className="py-3 px-3 text-right rtl:text-left">المبلغ المدفوع</th>
                <th className="py-3 px-4 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.filter(po => inDateWindow(po.createdDate)).map(po => {
                const paidAmt = po.paidAmount || (po.status === 'Paid' ? po.totalAmount : 0);
                return (
                  <tr key={po.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{po.poNumber}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{po.vendorName}</td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {new Date(po.createdDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 font-mono">{po.items.length} items</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 rtl:text-left">
                      {po.totalAmount.toFixed(2)} {t.currency}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-600 font-bold rtl:text-left">
                      {paidAmt.toFixed(2)} {t.currency}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        {po.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 8: EMPLOYEE CASHIER PERFORMANCE */}
      {activeReport === 'employees' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs rtl:text-right">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
              <tr>
                <th className="py-3 px-4">الموظف</th>
                <th className="py-3 px-3 text-center">العمليات المنفذة</th>
                <th className="py-3 px-3 text-right rtl:text-left">إجمالي المبيعات</th>
                <th className="py-3 px-3 text-right rtl:text-left">الربح المحقق</th>
                <th className="py-3 px-4 text-right rtl:text-left">متوسط الفاتورة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employeePerformance.map((emp, idx) => {
                const avgTicket = emp.orders > 0 ? emp.revenue / emp.orders : 0;
                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{emp.name}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                      {emp.orders}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900 rtl:text-left">
                      {emp.revenue.toFixed(2)} {t.currency}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 rtl:text-left">
                      +{emp.profit.toFixed(2)} {t.currency}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600 rtl:text-left">
                      {avgTicket.toFixed(2)} {t.currency}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
