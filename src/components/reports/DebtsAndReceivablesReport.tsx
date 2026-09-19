import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Users, 
  Truck, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Phone, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownLeft,
  Scale
} from 'lucide-react';

export const DebtsAndReceivablesReport: React.FC = () => {
  const { t, customers, vendors, purchases, loans, salaries } = useApp();
  const [filterType, setFilterType] = useState<'all' | 'receivables' | 'payables'>('all');

  // Receivables: People who owe the dairy store (Customer tabs / credit accounts)
  const customersOwing = customers.filter(c => (c.outstandingBalance || 0) > 0);
  const totalCustomerReceivables = customersOwing.reduce(
    (sum, c) => sum + (c.outstandingBalance || 0),
    0
  );

  // Payables: What the store owes to vendors & suppliers
  const vendorsOwed = vendors.filter(v => (v.balance || 0) > 0);
  const totalVendorPayables = vendorsOwed.reduce(
    (sum, v) => sum + (v.balance || 0),
    0
  );

  // Unpaid Purchase Orders (Pending or Received)
  const unpaidPOs = purchases.filter(
    po => po.status !== 'Paid' && po.status !== 'Cancelled'
  );
  const totalUnpaidPOs = unpaidPOs.reduce(
    (sum, po) => sum + (po.totalAmount || 0),
    0
  );

  // Unsettled Staff Salaries
  const pendingSalaries = salaries.filter(s => s.status === 'Pending');
  const totalPendingSalaries = pendingSalaries.reduce(
    (sum, s) => sum + ((s.netSalary || s.baseSalary || 0)),
    0
  );

  // Active Bank Loans & Equipment Financing
  const totalLoanPrincipalRemaining = loans.reduce(
    (sum, l) => sum + (l.remainingBalance || 0),
    0
  );

  // Total Liabilities
  const totalLiabilities = totalVendorPayables + totalUnpaidPOs + totalPendingSalaries + totalLoanPrincipalRemaining;
  const netPosition = totalCustomerReceivables - totalLiabilities;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Executive Answer Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
              <Scale className="h-3.5 w-3.5" />
              <span>{t.q4Title || 'كم لي وكم عليّ؟ المديونيات'}</span>
            </div>
            <h3 className="mt-1.5 text-lg font-bold text-slate-900">
              {'تقرير الذمم والمديونيات والمستحقات (كم لي وكم عليّ)'}
            </h3>
            <p className="text-xs text-slate-500">
              {'مستحقات العملاء التجارية مقابل فواتير موردي الحليب والتعبئة ورواتب الموظفين والقروض'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
              <button
                onClick={() => setFilterType('all')}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.all}
              </button>
              <button
                onClick={() => setFilterType('receivables')}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  filterType === 'receivables' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.oweMeReceivables || 'المستحقات لي'} ({customersOwing.length})
              </button>
              <button
                onClick={() => setFilterType('payables')}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  filterType === 'payables' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.iOwePayables || 'المستحق عليّ'} ({vendorsOwed.length + loans.length})
              </button>
            </div>
          </div>
        </div>

        {/* 4 Summary Scorecards */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: People Owe Me */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
              <span className="flex items-center gap-1.5">
                <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                {t.oweMeReceivables || 'المستحقات لي'}
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">
                {customersOwing.length} clients
              </span>
            </div>
            <div className="mt-2 font-mono text-2xl font-black text-emerald-700">
              +{totalCustomerReceivables.toFixed(2)} {t.currency}
            </div>
            <p className="mt-1 text-[11px] text-emerald-900/70">
              Wholesale bakeries, restaurants & customer tabs
            </p>
          </div>

          {/* Card 2: Vendor Payables */}
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
            <div className="flex items-center justify-between text-xs font-bold text-rose-800">
              <span className="flex items-center gap-1.5">
                <ArrowUpRight className="h-4 w-4 text-rose-600" />
                {'فواتير الموردين المستحقة'}
              </span>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-700">
                {vendorsOwed.length} suppliers
              </span>
            </div>
            <div className="mt-2 font-mono text-2xl font-black text-rose-700">
              -{totalVendorPayables.toFixed(2)} {t.currency}
            </div>
            <p className="mt-1 text-[11px] text-rose-900/70">
              Raw milk, packaging bottles & feed supply
            </p>
          </div>

          {/* Card 3: Loans & Staff Payroll */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="flex items-center justify-between text-xs font-bold text-amber-800">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                {'قروض ورواتب مستحقة'}
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">
                {loans.length} loans
              </span>
            </div>
            <div className="mt-2 font-mono text-2xl font-black text-amber-800">
              -{(totalLoanPrincipalRemaining + totalPendingSalaries).toFixed(2)} {t.currency}
            </div>
            <p className="mt-1 text-[11px] text-amber-900/70">
              Equipment loans: {totalLoanPrincipalRemaining.toFixed(0)} | Staff: {totalPendingSalaries.toFixed(0)} {t.currency}
            </p>
          </div>

          {/* Card 4: Net Working Position */}
          <div className={`rounded-xl border p-4 ${
            netPosition >= 0 
              ? 'border-blue-200 bg-blue-50/50 text-blue-900' 
              : 'border-slate-200 bg-slate-50 text-slate-900'
          }`}>
            <div className="flex items-center justify-between text-xs font-bold">
              <span>{t.netPosition || 'صافي المركز المالي العامل'}</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-white border border-slate-200">
                Receivables - Payables
              </span>
            </div>
            <div className="mt-2 font-mono text-2xl font-black">
              {netPosition >= 0 ? `+${netPosition.toFixed(2)}` : netPosition.toFixed(2)} {t.currency}
            </div>
            <p className="mt-1 text-[11px] text-slate-600">
              {netPosition >= 0 
                ? ('مركز إيجابي: مستحقاتك تفوق ديونك المتداولة')
                : ('التزامات قصيرة الأجل تفوق مستحقات العملاء')}
            </p>
          </div>
        </div>
      </div>

      {/* Tables Side by Side or Filtered */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Section 1: People Owe Me (Customers) */}
        {(filterType === 'all' || filterType === 'receivables') && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">
                    {'العملاء المدينون (الذمم المدينة)'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {customersOwing.length} accounts with pending balance
                  </p>
                </div>
              </div>
              <span className="font-mono text-sm font-extrabold text-emerald-700">
                +{totalCustomerReceivables.toFixed(2)} {t.currency}
              </span>
            </div>

            {customersOwing.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
                No customers currently owe money to the store.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {customersOwing.map(c => (
                  <div key={c.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{c.name}</div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {c.phone}
                        </span>
                        {c.address && <span>• {c.address}</span>}
                        <span>• {c.loyaltyPointsBalance} loyalty pts</span>
                      </div>
                    </div>
                    <div className="text-right rtl:text-left">
                      <div className="font-mono text-sm font-extrabold text-emerald-700">
                        +{(c.outstandingBalance || 0).toFixed(2)} {t.currency}
                      </div>
                      <span className="inline-block mt-0.5 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        Owed to Store
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Section 2: I Owe Them (Vendors & Suppliers) */}
        {(filterType === 'all' || filterType === 'payables') && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">
                    {'الموردون والمستحقات (الذمم الدائنة)'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {vendorsOwed.length} suppliers with outstanding invoices
                  </p>
                </div>
              </div>
              <span className="font-mono text-sm font-extrabold text-rose-700">
                -{totalVendorPayables.toFixed(2)} {t.currency}
              </span>
            </div>

            {vendorsOwed.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
                All vendor accounts are fully settled.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {vendorsOwed.map(v => (
                  <div key={v.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">
                        {v.nameAr ? v.nameAr : v.name}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {v.phone}
                        </span>
                        <span>• Terms: <b>{v.paymentTerms}</b></span>
                      </div>
                    </div>
                    <div className="text-right rtl:text-left">
                      <div className="font-mono text-sm font-extrabold text-rose-700">
                        -{(v.balance || 0).toFixed(2)} {t.currency}
                      </div>
                      <span className="inline-block mt-0.5 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                        Due to Supplier
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Additional Liabilities Breakdown: Loans & Unpaid Purchases */}
      {(filterType === 'all' || filterType === 'payables') && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Active Bank Loans & Equipment Financing */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center justify-between">
              <span>{'قروض الآلات وتجهيزات الألبان'}</span>
              <span className="font-mono text-xs font-bold text-amber-800">
                -{totalLoanPrincipalRemaining.toLocaleString()} {t.currency}
              </span>
            </h4>
            <div className="divide-y divide-slate-100 text-xs">
              {loans.map(l => (
                <div key={l.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">{l.lenderName || l.counterpartyName || l.lender || 'مؤسسة تمويل'}</span>
                    <div className="text-[11px] text-slate-500">{l.notes || 'تمويل معدات التبريد والتنكات'}</div>
                  </div>
                  <div className="text-right rtl:text-left">
                    <div className="font-mono font-bold text-amber-800">
                      -{l.remainingBalance.toLocaleString()} {t.currency}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      شهرياً: {l.monthlyInstallment} {t.currency}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Staff Payroll */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center justify-between">
              <span>{'رواتب الموظفين المستحقة'}</span>
              <span className="font-mono text-xs font-bold text-slate-800">
                {totalPendingSalaries > 0 ? `-${totalPendingSalaries.toFixed(2)} ${t.currency}` : 'تم التسوية بالكامل'}
              </span>
            </h4>
            {pendingSalaries.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-400" />
                No pending salary disbursements for the current period.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {pendingSalaries.map(s => (
                  <div key={s.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">{s.employeeName}</span>
                      <div className="text-[11px] text-slate-500">Period: {s.month}</div>
                    </div>
                    <div className="text-right rtl:text-left">
                      <div className="font-mono font-bold text-slate-900">
                        -{((s.netSalary || s.baseSalary || 0)).toFixed(2)} {t.currency}
                      </div>
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                        Pending
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
