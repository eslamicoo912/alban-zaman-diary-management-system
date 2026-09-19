import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, Salary, Employee, PurchaseOrder, Vendor, Loan } from '../../types';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Clock,
  Calendar,
  DollarSign,
  Package,
  Users,
  Truck,
  TrendingDown,
  CheckCircle2,
  Filter,
  Search,
  Printer,
  Download,
  Percent,
  Trash2,
  CreditCard,
  Building2,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Eye,
  FileText,
  ShieldAlert,
  ArrowUpRight,
  Check,
  X,
  Plus
} from 'lucide-react';

interface AlertsModuleProps {
  onNavigate?: (tab: any) => void;
}

type AlertCategory = 'all' | 'expiry' | 'salaries' | 'vendors' | 'stock' | 'loans';
type UrgencyLevel = 'all' | 'critical' | 'warning' | 'upcoming';

export const AlertsModule: React.FC<AlertsModuleProps> = ({ onNavigate }) => {
  const {
    products,
    updateProduct,
    adjustStock,
    salaries,
    employees,
    paySalary,
    generateMonthlyPayroll,
    purchases,
    vendors,
    payPurchaseOrder,
    loans,
    payLoanInstallment,
    branches,
    activeBranchId,
    t,
    isRtl,
  } = useApp();

  // Active filters
  const [activeCategory, setActiveCategory] = useState<AlertCategory>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyLevel>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [snoozedAlertIds, setSnoozedAlertIds] = useState<Set<string>>(new Set());

  // Modals state
  const [discountModalProduct, setDiscountModalProduct] = useState<Product | null>(null);
  const [discountPercentage, setDiscountPercentage] = useState<number>(30);
  const [paySalaryModal, setPaySalaryModal] = useState<Salary | null>(null);
  const [salaryPayMethod, setSalaryPayMethod] = useState<'bank' | 'cash'>('bank');
  const [salaryVoucher, setSalaryVoucher] = useState<Salary | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Simulated Reference Date: September 3, 2026
  const REFERENCE_DATE_STR = '2026-09-03';
  const refDate = useMemo(() => new Date(`${REFERENCE_DATE_STR}T00:00:00`), []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. EXPIRY ALERTS CALCULATION
  const expiryAlerts = useMemo(() => {
    return products
      .filter(p => {
        if (p.currentStock <= 0) return false;
        if (selectedBranch !== 'all' && p.branchId !== selectedBranch) return false;
        return true;
      })
      .map(p => {
        const expDate = new Date(`${p.expiryDate}T00:00:00`);
        const diffMs = expDate.getTime() - refDate.getTime();
        const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));
        const capitalAtRisk = p.currentStock * p.costPrice;
        const retailValue = p.currentStock * p.salePrice;

        let urgency: 'critical' | 'warning' | 'upcoming' | 'normal' = 'normal';
        if (daysLeft <= 2) urgency = 'critical'; // Expired or expiring within 48h
        else if (daysLeft <= 7) urgency = 'warning'; // 3 to 7 days
        else if (daysLeft <= 14) urgency = 'upcoming'; // 8 to 14 days

        return {
          id: `exp-${p.id}`,
          type: 'expiry' as const,
          product: p,
          daysLeft,
          capitalAtRisk,
          retailValue,
          urgency,
          title:p.nameAr || p.name,
          subtitle: `${p.currentStock} ${p.unit} • دفعة ${p.batchNumber} • SKU: ${p.sku}`,
          date: p.expiryDate,
        };
      })
      .filter(item => item.daysLeft <= 14) // Only show items within 14 days
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [products, refDate, selectedBranch]);

  // 2. SALARY & PAYROLL ALERTS CALCULATION
  const salaryAlerts = useMemo(() => {
    // Current cycle is 2026-09
    const currentMonth = '2026-09';
    const alerts: Array<{
      id: string;
      type: 'salary';
      salary?: Salary;
      employee: Employee;
      status: 'pending_payment' | 'not_generated';
      netAmount: number;
      urgency: 'critical' | 'warning' | 'upcoming';
      title: string;
      subtitle: string;
      date: string;
      monthYear: string;
    }> = [];

    employees.forEach(emp => {
      if (selectedBranch !== 'all' && emp.branchId !== selectedBranch) return;

      const existingSalaries = salaries.filter(s => s.employeeId === emp.id && s.monthYear === currentMonth);
      const pendingSalary = existingSalaries.find(s => s.status === 'Pending');

      if (pendingSalary) {
        // Pending payment for this employee
        alerts.push({
          id: `sal-${pendingSalary.id}`,
          type: 'salary',
          salary: pendingSalary,
          employee: emp,
          status: 'pending_payment',
          netAmount: pendingSalary.netSalary,
          urgency: 'critical', // Unsettled payroll due for current cycle
          title:emp.nameAr || emp.name,
          subtitle: `${emp.position} • ${currentMonth} Payroll Due • Basic: ${pendingSalary.basicSalary.toLocaleString()} ${t.currency}`,
          date: `${currentMonth}-05`, // Due around beginning of month
          monthYear: currentMonth,
        });
      } else if (existingSalaries.length === 0) {
        // Not generated yet for September
        alerts.push({
          id: `sal-unissued-${emp.id}`,
          type: 'salary',
          employee: emp,
          status: 'not_generated',
          netAmount: emp.salary + 300, // estimated base + allowance
          urgency: 'warning',
          title:emp.nameAr || emp.name,
          subtitle: `${emp.position} • ${currentMonth} Payroll Unissued`,
          date: `${currentMonth}-05`,
          monthYear: currentMonth,
        });
      }
    });

    return alerts.sort((a, b) => (a.urgency === 'critical' ? -1 : 1));
  }, [employees, salaries, selectedBranch, t.currency]);

  // 3. VENDOR PAYABLES ALERTS
  const vendorAlerts = useMemo(() => {
    const alerts: Array<{
      id: string;
      type: 'vendor';
      vendor: Vendor;
      balance: number;
      urgency: 'critical' | 'warning' | 'upcoming';
      title: string;
      subtitle: string;
      pendingPO?: PurchaseOrder;
      date: string;
    }> = [];

    vendors.forEach(v => {
      if (v.balance > 0) {
        const pendingPO = purchases.find(p => p.vendorId === v.id && p.status === 'Received');
        alerts.push({
          id: `ven-${v.id}`,
          type: 'vendor',
          vendor: v,
          balance: v.balance,
          urgency: v.balance > 3000 ? 'critical' : 'warning',
          title:v.nameAr || v.name,
          subtitle: `${v.paymentTerms} • Phone: ${v.phone}`,
          pendingPO,
          date: pendingPO?.receivedDate || 'متأخر',
        });
      }
    });

    return alerts.sort((a, b) => b.balance - a.balance);
  }, [vendors, purchases]);

  // 4. LOW STOCK ALERTS
  const stockAlerts = useMemo(() => {
    return products
      .filter(p => {
        if (selectedBranch !== 'all' && p.branchId !== selectedBranch) return false;
        const threshold = p.minStockAlert ?? p.minStock;
        return p.currentStock <= threshold;
      })
      .map(p => {
        const threshold = p.minStockAlert ?? p.minStock;
        const isDepleted = p.currentStock <= 0;
        return {
          id: `stk-${p.id}`,
          type: 'stock' as const,
          product: p,
          currentStock: p.currentStock,
          threshold,
          urgency: isDepleted ? ('critical' as const) : ('warning' as const),
          title:p.nameAr || p.name,
          subtitle: isDepleted
            ? ('نفد تماماً من الرف والمخزن')
            : `${'المتبقي'}: ${p.currentStock} ${p.unit} (${'الحد الأدنى'}: ${threshold})`,
          date: 'فوري',
        };
      })
      .sort((a, b) => a.currentStock - b.currentStock);
  }, [products, selectedBranch]);

  // 5. LOAN & FINANCING INSTALLMENTS ALERTS
  const loanAlerts = useMemo(() => {
    return loans
      .filter(l => l.status === 'Active' && l.remainingBalance > 0)
      .map(l => {
        const installment = l.monthlyInstallment || Math.round(l.principal / l.installmentsCount);
        return {
          id: `loan-${l.id}`,
          type: 'loan' as const,
          loan: l,
          installment,
          remaining: l.remainingBalance,
          urgency: 'warning' as const,
          title: l.counterpartyName,
          subtitle: `${l.loanNumber} • ${l.notes || 'تمويل المعدات'} • المتبقي: ${l.remainingBalance.toLocaleString()} ${t.currency}`,
          date: l.dueDate,
        };
      });
  }, [loans, t.currency]);

  // COMBINED ALERTS FOR METRICS & FILTERING
  const allAlerts = useMemo(() => {
    const list: Array<{
      id: string;
      category: AlertCategory;
      urgency: 'critical' | 'warning' | 'upcoming';
      title: string;
      subtitle: string;
      date: string;
      data: any;
    }> = [];

    expiryAlerts.forEach(e => {
      list.push({
        id: e.id,
        category: 'expiry',
        urgency: e.urgency === 'normal' ? 'upcoming' : e.urgency,
        title: e.title,
        subtitle: e.subtitle,
        date: e.date,
        data: e,
      });
    });

    salaryAlerts.forEach(s => {
      list.push({
        id: s.id,
        category: 'salaries',
        urgency: s.urgency,
        title: s.title,
        subtitle: s.subtitle,
        date: s.date,
        data: s,
      });
    });

    vendorAlerts.forEach(v => {
      list.push({
        id: v.id,
        category: 'vendors',
        urgency: v.urgency,
        title: v.title,
        subtitle: v.subtitle,
        date: v.date,
        data: v,
      });
    });

    stockAlerts.forEach(st => {
      list.push({
        id: st.id,
        category: 'stock',
        urgency: st.urgency,
        title: st.title,
        subtitle: st.subtitle,
        date: st.date,
        data: st,
      });
    });

    loanAlerts.forEach(l => {
      list.push({
        id: l.id,
        category: 'loans',
        urgency: l.urgency,
        title: l.title,
        subtitle: l.subtitle,
        date: l.date,
        data: l,
      });
    });

    return list;
  }, [expiryAlerts, salaryAlerts, vendorAlerts, stockAlerts, loanAlerts]);

  // Filtered Alerts based on Active Category, Urgency, Search
  const filteredAlerts = useMemo(() => {
    return allAlerts.filter(a => {
      if (snoozedAlertIds.has(a.id)) return false;
      if (activeCategory !== 'all' && a.category !== activeCategory) return false;
      if (urgencyFilter !== 'all' && a.urgency !== urgencyFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = a.title.toLowerCase().includes(query);
        const matchSubtitle = a.subtitle.toLowerCase().includes(query);
        if (!matchTitle && !matchSubtitle) return false;
      }
      return true;
    });
  }, [allAlerts, snoozedAlertIds, activeCategory, urgencyFilter, searchQuery]);

  // EXECUTIVE METRICS
  const criticalCount = useMemo(() => allAlerts.filter(a => a.urgency === 'critical').length, [allAlerts]);
  const totalExpiryRiskVal = useMemo(() => expiryAlerts.reduce((sum, e) => sum + e.capitalAtRisk, 0), [expiryAlerts]);
  const totalPendingSalariesVal = useMemo(() => salaryAlerts.reduce((sum, s) => sum + s.netAmount, 0), [salaryAlerts]);
  const totalVendorPayablesVal = useMemo(() => vendorAlerts.reduce((sum, v) => sum + v.balance, 0), [vendorAlerts]);
  const lowStockCount = useMemo(() => stockAlerts.length, [stockAlerts]);

  // ACTIONS HANDLERS
  const handleApplyFlashDiscount = () => {
    if (!discountModalProduct) return;
    const oldPrice = discountModalProduct.salePrice;
    const newPrice = Number((oldPrice * (1 - discountPercentage / 100)).toFixed(2));

    updateProduct({
      ...discountModalProduct,
      salePrice: newPrice,
    });

    showToast(`تم تطبيق تخفيض ${discountPercentage}% على (${discountModalProduct.nameAr || discountModalProduct.name}) السعر الجديد: ${newPrice.toFixed(2)} ${t.currency}`
    );
    setDiscountModalProduct(null);
  };

  const handleWriteOffSpoilage = (product: Product) => {
    const confirmMsg =`هل أنت متأكد من تسجيل إتلاف وهالك لكمية ${product.currentStock} ${product.unit} من (${product.nameAr || product.name})؟`;

    if (window.confirm(confirmMsg)) {
      adjustStock(product.id, -product.currentStock, 'Spoilage disposal / Shelf expiry');
      showToast(`تم شطب الكمية وتوثيق هالك منتهٍ الصلاحية بنجاح.`
      );
    }
  };

  const handlePaySalaryConfirm = () => {
    if (!paySalaryModal) return;
    paySalary(paySalaryModal.id, salaryPayMethod);
    showToast(`تم صرف راتب الموظف (${paySalaryModal.employeeName}) بمبلغ ${paySalaryModal.netSalary.toLocaleString()} ${t.currency} عن طريق ${salaryPayMethod === 'bank' ? 'التحويل البنكي' : 'صندوق الكاشير'}.`
    );
    setPaySalaryModal(null);
  };

  const handleGenerateAllSeptemberPayroll = () => {
    generateMonthlyPayroll('2026-09');
    showToast('تم إصدار مسير رواتب شهر سبتمبر 2026 لجميع الموظفين بنجاح.'
    );
  };

  const handleSettleVendorPO = (poId: string, vendorName: string, amount: number) => {
    payPurchaseOrder(poId, 'Bank Transfer');
    showToast(`تم سداد فاتورة المورد (${vendorName}) بمبلغ ${amount.toLocaleString()} ${t.currency}.`
    );
  };

  const handlePayLoan = (loanId: string, amount: number) => {
    payLoanInstallment(loanId, amount);
    showToast(`تم سداد قسط التمويل بمبلغ ${amount.toLocaleString()} ${t.currency}.`
    );
  };

  const handleToggleSnooze = (id: string) => {
    setSnoozedAlertIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExportCSV = () => {
    let csv = 'معرف التنبيه,التصنيف,الأولوية,العنوان,التفاصيل,تاريخ الاستحقاق\n';
    filteredAlerts.forEach(a => {
      csv += `"${a.id}","${a.category}","${a.urgency}","${a.title}","${a.subtitle}","${a.date}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alban-zaman-alerts-${REFERENCE_DATE_STR}.csv`;
    link.click();
    showToast('تم تنزيل ملف التنبيهات بنجاح.');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-top-2 border border-slate-700">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xs">
            <Bell className="h-5 w-5 animate-bounce" />
            {criticalCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white ring-2 ring-white">
                {criticalCount}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                {'مركز التنبيهات والمواعيد التشغيلية'}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                <ShieldAlert className="h-3 w-3 text-amber-600" />
                <span>{'نظام الإنذار المبكر'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {'مراقبة فورية لصلاحية الألبان الطازجة، استحقاقات الرواتب، فواتير الموردين، ونواقص المخزون.'}
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            title="تصدير CSV"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">{'تصدير CSV'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            title="طباعة قائمة الجرد"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">{'طباعة القائمة'}</span>
          </button>

          <button
            onClick={handleGenerateAllSeptemberPayroll}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{'إصدار مسير رواتب سبتمبر'}</span>
          </button>
        </div>
      </div>

      {/* EXECUTIVE KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Critical Alerts Count */}
        <div
          onClick={() => setUrgencyFilter('critical')}
          className={`cursor-pointer rounded-2xl p-3.5 border transition-all ${
            urgencyFilter === 'critical'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/20'
              : 'bg-white border-slate-200/80 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{'تنبيهات حرجة فورية'}</span>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-1 text-2xl font-black text-rose-600">
            {criticalCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {'صلاحية ≤ يومين أو متأخرات'}
          </div>
        </div>

        {/* Perishable Capital at Risk */}
        <div
          onClick={() => setActiveCategory('expiry')}
          className={`cursor-pointer rounded-2xl p-3.5 border transition-all ${
            activeCategory === 'expiry'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200/80 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{'رأس مال ألبان معرض للتلف'}</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-1 text-2xl font-black text-amber-600">
            {totalExpiryRiskVal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
            <span className="text-xs font-bold text-slate-600">{t.currency}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {expiryAlerts.length} {'تشغيلة ألبان خلال 14 يوماً'}
          </div>
        </div>

        {/* Pending Staff Payroll */}
        <div
          onClick={() => setActiveCategory('salaries')}
          className={`cursor-pointer rounded-2xl p-3.5 border transition-all ${
            activeCategory === 'salaries'
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400/20'
              : 'bg-white border-slate-200/80 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{'رواتب سبتمبر المستحقة'}</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-1 text-2xl font-black text-blue-600">
            {totalPendingSalariesVal.toLocaleString()}{' '}
            <span className="text-xs font-bold text-slate-600">{t.currency}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {salaryAlerts.length} {'موظفين بانتظار الصرف'}
          </div>
        </div>

        {/* Due Vendor Invoices */}
        <div
          onClick={() => setActiveCategory('vendors')}
          className={`cursor-pointer rounded-2xl p-3.5 border transition-all ${
            activeCategory === 'vendors'
              ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-400/20'
              : 'bg-white border-slate-200/80 hover:border-purple-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{'مستحقات الموردين'}</span>
            <Truck className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-1 text-2xl font-black text-purple-600">
            {totalVendorPayablesVal.toLocaleString()}{' '}
            <span className="text-xs font-bold text-slate-600">{t.currency}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {vendorAlerts.length} {'موردين بانتظار السداد'}
          </div>
        </div>

        {/* Low Stock Thresholds */}
        <div
          onClick={() => setActiveCategory('stock')}
          className={`cursor-pointer rounded-2xl p-3.5 border transition-all col-span-2 md:col-span-1 ${
            activeCategory === 'stock'
              ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-400/20'
              : 'bg-white border-slate-200/80 hover:border-orange-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{'نواقص المخزون'}</span>
            <Package className="h-4 w-4 text-orange-500" />
          </div>
          <div className="mt-1 text-2xl font-black text-orange-600">
            {lowStockCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {'أصناف بلغت حد الطلب'}
          </div>
        </div>
      </div>

      {/* FILTER TABS & SEARCH CONTROLS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                activeCategory === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{'جميع التنبيهات'}</span>
              <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
                {allAlerts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveCategory('expiry')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                activeCategory === 'expiry'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>🥛</span>
              <span>{'صلاحية الألبان'}</span>
              <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px]">
                {expiryAlerts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveCategory('salaries')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                activeCategory === 'salaries'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>👥</span>
              <span>{'رواتب الموظفين'}</span>
              <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px]">
                {salaryAlerts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveCategory('vendors')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                activeCategory === 'vendors'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>🚚</span>
              <span>{'فواتير الموردين'}</span>
              <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px]">
                {vendorAlerts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveCategory('stock')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                activeCategory === 'stock'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>📦</span>
              <span>{'نواقص المخزون'}</span>
              <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px]">
                {stockAlerts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveCategory('loans')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                activeCategory === 'loans'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>🏦</span>
              <span>{'أقساط التمويل'}</span>
              <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px]">
                {loanAlerts.length}
              </span>
            </button>
          </div>

          {/* Urgency & Branch Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Urgency Filter */}
            <div className="flex items-center rounded-xl bg-slate-100 p-0.5 text-xs font-bold text-slate-600">
              <button
                onClick={() => setUrgencyFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  urgencyFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'hover:text-slate-900'
                }`}
              >
                {'الكل'}
              </button>
              <button
                onClick={() => setUrgencyFilter('critical')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  urgencyFilter === 'critical' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-600 hover:bg-rose-50'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                <span>{'حرج'}</span>
              </button>
              <button
                onClick={() => setUrgencyFilter('warning')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  urgencyFilter === 'warning' ? 'bg-amber-500 text-white shadow-2xs' : 'text-amber-600 hover:bg-amber-50'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span>{'تحذير'}</span>
              </button>
              <button
                onClick={() => setUrgencyFilter('upcoming')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  urgencyFilter === 'upcoming' ? 'bg-blue-600 text-white shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                <span>{'قادم'}</span>
              </button>
            </div>

            {/* Branch Filter */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="bg-transparent font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="all">{'جميع الفروع'}</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.nameAr}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 rtl:right-3.5 rtl:left-auto" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={'ابحث في التنبيهات بالاسم، كود الصنف، اسم الموظف، أو المورد...'
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden rtl:pr-10 rtl:pl-4 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 rtl:left-3 rtl:right-auto text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* SNOOZED ITEMS NOTICE (IF ANY) */}
      {snoozedAlertIds.size > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>
              {snoozedAlertIds.size} {'تنبيهات تم تأكيد مراجعتها وإخفاؤها مؤقتاً.'}
            </span>
          </div>
          <button
            onClick={() => setSnoozedAlertIds(new Set())}
            className="text-blue-600 hover:underline font-bold text-[11px]"
          >
            {'إظهار الكل مجدداً'}
          </button>
        </div>
      )}

      {/* MAIN ALERTS LIST / EMPTY STATE */}
      {filteredAlerts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-base font-black text-slate-900">
            {'لا توجد تنبيهات مستحقة تطابق التصفية!'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {'مخزون الألبان آمن ومسيرات الرواتب والموردين في حالة ممتازة بالنسبة للمعايير المختارة.'}
          </p>
          {(activeCategory !== 'all' || urgencyFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setActiveCategory('all');
                setUrgencyFilter('all');
                setSearchQuery('');
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>{'إعادة ضبط الفلاتر'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map(alert => {
            // Render Card based on category
            if (alert.category === 'expiry') {
              const item = alert.data;
              const prod = item.product as Product;
              const isExpired = item.daysLeft <= 0;
              const isUrgent = item.daysLeft <= 2;

              return (
                <div
                  key={alert.id}
                  className={`rounded-2xl border bg-white p-4 transition-all shadow-2xs hover:shadow-xs ${
                    isExpired
                      ? 'border-rose-300 bg-rose-50/20'
                      : isUrgent
                      ? 'border-amber-300 bg-amber-50/10'
                      : 'border-slate-200/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Product & Expiry Status */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-2xl border border-amber-100 shrink-0">
                        {prod.imageEmoji || '🥛'}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">
                            {prod.nameAr || prod.name}
                          </h3>
                          {isExpired ? (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-800 border border-rose-200 animate-pulse">
                              {'منتهي الصلاحية!'}
                            </span>
                          ) : isUrgent ? (
                            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                              {`متبقٍ ${item.daysLeft} يوم (عاجل)`}
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                              {`متبقٍ ${item.daysLeft} أيام`}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                            {prod.batchNumber}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                          <span>
                            {'المخزون الحالي'}:{' '}
                            <strong className="text-slate-800 font-black">
                              {prod.currentStock} {prod.unit}
                            </strong>
                          </span>
                          <span>
                            {'تاريخ الانتهاء'}:{' '}
                            <strong className="text-slate-800 font-mono">{prod.expiryDate}</strong>
                          </span>
                          <span>
                            {'سعر البيع'}:{' '}
                            <strong className="text-slate-800">{prod.salePrice.toFixed(2)} {t.currency}</strong>
                          </span>
                          <span>
                            {'القيمة المعرضة للتلف'}:{' '}
                            <strong className="text-rose-600 font-black">{item.capitalAtRisk.toFixed(2)} {t.currency}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Quick Operational Actions */}
                    <div className="flex flex-wrap items-center gap-2 sm:self-center shrink-0">
                      <button
                        onClick={() => {
                          setDiscountModalProduct(prod);
                          setDiscountPercentage(30);
                        }}
                        className="flex items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition-colors shadow-2xs"
                      >
                        <Percent className="h-3.5 w-3.5" />
                        <span>{'تخفيض سريع للبيع'}</span>
                      </button>

                      <button
                        onClick={() => handleWriteOffSpoilage(prod)}
                        className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                        <span>{'تسجيل إتلاف/هالك'}</span>
                      </button>

                      <button
                        onClick={() => handleToggleSnooze(alert.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                        title={'تأكيد المراجعة وإخفاء'}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            if (alert.category === 'salaries') {
              const item = alert.data;
              const emp = item.employee as Employee;
              const sal = item.salary as Salary | undefined;
              const isPending = item.status === 'pending_payment';

              return (
                <div
                  key={alert.id}
                  className="rounded-2xl border border-blue-200/90 bg-white p-4 transition-all shadow-2xs hover:shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0 font-black text-sm">
                        {emp.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">
                            {emp.nameAr || emp.name}
                          </h3>
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-800">
                            {'راتب سبتمبر 2026'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                            {emp.employeeCode}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                          <span>
                            {'المسمى الوظيفي'}:{' '}
                            <strong className="text-slate-800 font-semibold">{emp.position}</strong>
                          </span>
                          <span>
                            {'الراتب الأساسي'}:{' '}
                            <strong className="text-slate-800">{emp.salary.toLocaleString()} {t.currency}</strong>
                          </span>
                          {sal && sal.advances > 0 && (
                            <span className="text-amber-700 font-medium">
                              {'خصم سلفة'}: -{sal.advances} {t.currency}
                            </span>
                          )}
                          <span>
                            {'صافي المستحق للصرف'}:{' '}
                            <strong className="text-blue-600 font-black text-sm">
                              {item.netAmount.toLocaleString()} {t.currency}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:self-center shrink-0">
                      {isPending && sal ? (
                        <>
                          <button
                            onClick={() => {
                              setPaySalaryModal(sal);
                              setSalaryPayMethod('bank');
                            }}
                            className="flex items-center gap-1 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white transition-colors shadow-2xs"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>{'صرف الراتب الآن'}</span>
                          </button>

                          <button
                            onClick={() => setSalaryVoucher(sal)}
                            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors"
                          >
                            <FileText className="h-3.5 w-3.5 text-slate-500" />
                            <span>{'إيصال الصرف'}</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            paySalary(emp.id, emp.salary, 300, 0, '2026-09');
                            showToast(`تم إصدار وصرف راتب سبتمبر للموظف ${emp.name}.`
                            );
                          }}
                          className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white transition-colors shadow-2xs"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>{'إصدار وصرف فوري'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleToggleSnooze(alert.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                        title={'تأكيد المراجعة'}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            if (alert.category === 'vendors') {
              const item = alert.data;
              const ven = item.vendor as Vendor;

              return (
                <div
                  key={alert.id}
                  className="rounded-2xl border border-purple-200/90 bg-white p-4 transition-all shadow-2xs hover:shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 shrink-0">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">
                            {ven.nameAr || ven.name}
                          </h3>
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-800">
                            {ven.paymentTerms}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                          <span>
                            {'هاتف المورد'}:{' '}
                            <strong className="text-slate-800 font-mono">{ven.phone}</strong>
                          </span>
                          <span>
                            {'العنوان'}:{' '}
                            <span className="text-slate-700">{ven.address}</span>
                          </span>
                          <span>
                            {'الرصيد المستحق'}:{' '}
                            <strong className="text-purple-700 font-black text-sm">
                              {ven.balance.toLocaleString()} {t.currency}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:self-center shrink-0">
                      {item.pendingPO ? (
                        <button
                          onClick={() => handleSettleVendorPO(item.pendingPO.id, ven.name, item.pendingPO.totalAmount)}
                          className="flex items-center gap-1 rounded-xl bg-purple-600 hover:bg-purple-700 px-3.5 py-1.5 text-xs font-bold text-white transition-colors shadow-2xs"
                        >
                          <DollarSign className="h-3.5 w-3.5" />
                          <span>{'سداد فاتورة التوريد'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onNavigate && onNavigate('purchases')}
                          className="flex items-center gap-1 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 text-xs font-bold text-purple-700 transition-colors"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          <span>{'فتح المشتريات'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleToggleSnooze(alert.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            if (alert.category === 'stock') {
              const item = alert.data;
              const prod = item.product as Product;
              const isOut = item.currentStock <= 0;

              return (
                <div
                  key={alert.id}
                  className="rounded-2xl border border-orange-200/90 bg-white p-4 transition-all shadow-2xs hover:shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 border border-orange-100 shrink-0 text-xl">
                        {prod.imageEmoji || '📦'}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">
                            {prod.nameAr || prod.name}
                          </h3>
                          {isOut ? (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-800">
                              {'نفد تماماً (Out of Stock)'}
                            </span>
                          ) : (
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800">
                              {'أقل من حد الأمان'}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                            {prod.sku}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                          <span>
                            {'الكمية الحالية'}:{' '}
                            <strong className={isOut ? 'text-rose-600 font-black' : 'text-orange-700 font-bold'}>
                              {prod.currentStock} {prod.unit}
                            </strong>
                          </span>
                          <span>
                            {'حد إعادة الطلب'}:{' '}
                            <strong className="text-slate-800">{item.threshold} {prod.unit}</strong>
                          </span>
                          <span>
                            {'سعر التكلفة'}:{' '}
                            <span className="text-slate-700">{prod.costPrice.toFixed(2)} {t.currency}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:self-center shrink-0">
                      <button
                        onClick={() => onNavigate && onNavigate('purchases')}
                        className="flex items-center gap-1 rounded-xl bg-orange-600 hover:bg-orange-700 px-3.5 py-1.5 text-xs font-bold text-white transition-colors shadow-2xs"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        <span>{'إنشاء أمر توريد'}</span>
                      </button>

                      <button
                        onClick={() => handleToggleSnooze(alert.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            if (alert.category === 'loans') {
              const item = alert.data;
              const loan = item.loan as Loan;

              return (
                <div
                  key={alert.id}
                  className="rounded-2xl border border-emerald-200/90 bg-white p-4 transition-all shadow-2xs hover:shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">{loan.counterpartyName}</h3>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                            {loan.loanNumber}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                          <span>
                            {'القسط الشهري'}:{' '}
                            <strong className="text-emerald-700 font-bold">
                              {item.installment.toLocaleString()} {t.currency}
                            </strong>
                          </span>
                          <span>
                            {'الرصيد المتبقي'}:{' '}
                            <strong className="text-slate-800">
                              {loan.remainingBalance.toLocaleString()} {t.currency}
                            </strong>
                          </span>
                          <span>
                            {'تاريخ الاستحقاق'}:{' '}
                            <span className="font-mono text-slate-600">{loan.dueDate}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:self-center shrink-0">
                      <button
                        onClick={() => handlePayLoan(loan.id, item.installment)}
                        className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white transition-colors shadow-2xs"
                      >
                        <DollarSign className="h-3.5 w-3.5" />
                        <span>{'سداد القسط'}</span>
                      </button>

                      <button
                        onClick={() => handleToggleSnooze(alert.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}

      {/* MODAL 1: CLEARANCE FLASH DISCOUNT */}
      {discountModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Percent className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {'تخفيض سريع لتصريف الصلاحية'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {discountModalProduct.nameAr || discountModalProduct.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDiscountModalProduct(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 py-4">
              <div className="rounded-xl bg-amber-50/50 p-3 border border-amber-200/50 text-xs text-amber-900">
                {`الكمية المتوفرة: ${discountModalProduct.currentStock} ${discountModalProduct.unit} تنتهي في ${discountModalProduct.expiryDate}. تطبيق تخفيض يحفز العملاء على الشراء قبل انتهاء الصلاحية.`}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  {'اختر نسبة التخفيض (%):'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[20, 30, 40, 50].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDiscountPercentage(pct)}
                      className={`py-2 rounded-xl text-xs font-black transition-all ${
                        discountPercentage === pct
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {pct}% OFF
                    </button>
                  ))}
                </div>
              </div>

              {/* Price comparison */}
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/70 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-500">
                  <span>{'السعر الأصلي الحالي:'}</span>
                  <span className="font-mono">{discountModalProduct.salePrice.toFixed(2)} {t.currency}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>{'سعر التكلفة بالجملة:'}</span>
                  <span className="font-mono">{discountModalProduct.costPrice.toFixed(2)} {t.currency}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>{'السعر الجديد بعد الخصم:'}</span>
                  <span className="text-base text-amber-600 font-black">
                    {(discountModalProduct.salePrice * (1 - discountPercentage / 100)).toFixed(2)} {t.currency}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDiscountModalProduct(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                {'إلغاء'}
              </button>
              <button
                type="button"
                onClick={handleApplyFlashDiscount}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-xs"
              >
                {'تطبيق التخفيض وتحديث الكاشير'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PAY SALARY DIALOG */}
      {paySalaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {'صرف راتب الموظف'}
                  </h3>
                  <p className="text-[11px] text-slate-400">{paySalaryModal.employeeName}</p>
                </div>
              </div>
              <button
                onClick={() => setPaySalaryModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 py-4">
              <div className="rounded-xl bg-blue-50/50 p-3 border border-blue-200/60 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">{'دورة الراتب:'}</span>
                  <span className="font-bold text-slate-900">{paySalaryModal.monthYear}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{'الراتب الأساسي:'}</span>
                  <span className="font-mono">{paySalaryModal.basicSalary.toLocaleString()} {t.currency}</span>
                </div>
                {paySalaryModal.allowances > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{'البدلات والمكافآت:'}</span>
                    <span className="font-mono text-emerald-600">+{paySalaryModal.allowances} {t.currency}</span>
                  </div>
                )}
                {paySalaryModal.advances > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{'خصم سلفة سابقة:'}</span>
                    <span className="font-mono text-rose-600">-{paySalaryModal.advances} {t.currency}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-slate-900 pt-2 border-t border-blue-200">
                  <span>{'إجمالي المبلغ المستحق للصرف:'}</span>
                  <span className="text-blue-700 text-sm font-black">
                    {paySalaryModal.netSalary.toLocaleString()} {t.currency}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  {'اختر طريقة الدفع:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSalaryPayMethod('bank')}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      salaryPayMethod === 'bank'
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                    <span>{'تحويل بنكي'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalaryPayMethod('cash')}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      salaryPayMethod === 'cash'
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <DollarSign className="h-4 w-4" />
                    <span>{'نقداً من الصندوق'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaySalaryModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                {'إلغاء'}
              </button>
              <button
                type="button"
                onClick={handlePaySalaryConfirm}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
              >
                {'تأكيد الصرف وتسجيل القيد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SALARY VOUCHER PRINT VIEW */}
      {salaryVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {'سند صرف راتب شهري'}
              </h3>
              <button
                onClick={() => setSalaryVoucher(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-4 rounded-xl border border-slate-200 p-4 space-y-3 text-xs">
              <div className="text-center pb-2 border-b border-slate-200">
                <div className="font-black text-sm text-slate-900">
                  {'ألبان زمان'}
                </div>
                <div className="text-[10px] text-slate-400">{'سجل تجاري: 1010889922'}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-slate-400">{'الموظف:'}</span>{' '}
                  <strong className="text-slate-900">{salaryVoucher.employeeName}</strong>
                </div>
                <div>
                  <span className="text-slate-400">{'الفترة:'}</span>{' '}
                  <strong className="text-slate-900">{salaryVoucher.monthYear}</strong>
                </div>
                <div>
                  <span className="text-slate-400">{'الراتب الأساسي:'}</span>{' '}
                  <span>{salaryVoucher.basicSalary.toLocaleString()} {t.currency}</span>
                </div>
                <div>
                  <span className="text-slate-400">{'الصافي المستلم:'}</span>{' '}
                  <strong className="text-emerald-700">{salaryVoucher.netSalary.toLocaleString()} {t.currency}</strong>
                </div>
              </div>

              <div className="pt-6 grid grid-cols-2 gap-4 text-center text-[11px] text-slate-500 border-t border-slate-100">
                <div>
                  <div className="border-b border-slate-300 pb-8 mb-1"></div>
                  <span>{'توقيع المحاسب / الإدارة'}</span>
                </div>
                <div>
                  <div className="border-b border-slate-300 pb-8 mb-1"></div>
                  <span>{'توقيع الموظف المستلم'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSalaryVoucher(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                {'إغلاق'}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl flex items-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>{'طباعة السند'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
