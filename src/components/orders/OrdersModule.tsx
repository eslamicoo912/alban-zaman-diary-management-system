import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Sale } from '../../types';
import {
  Search,
  X,
  ReceiptText,
  CalendarDays,
  User,
  Store,
  Filter,
  Printer,
  Package,
  DollarSign,
  TrendingUp
} from 'lucide-react';

const statusMeta: Record<string, { label: string; cls: string; dot: string }> = {
  Completed: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  Refunded: { label: 'Refunded', cls: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  Partially_Refunded: { label: 'Partially Refunded', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  Cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};

const PAGE_SIZE = 10;

export const OrdersModule: React.FC = () => {
  const { t, sales, branches, customers } = useApp();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customFilter, setCustomFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Sale | null>(null);
  const [page, setPage] = useState(1);

  const customerById = useMemo(() => {
    const map: Record<string, string> = {};
    customers.forEach(c => (map[c.id] = c.name));
    return map;
  }, [customers]);

  const branchName = (branchId: string) => {
    const b = branches.find(br => br.id === branchId);
    return b ? (b.nameAr) : branchId;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    return sales
      .filter(s => {
        if (q) {
          const match = (s.receiptNumber + ' ' + (s.customerName || '') + ' ' + branchName(s.branchId)).toLowerCase().includes(q);
          if (!match) return false;
        }
        if (statusFilter !== 'all' && s.status !== statusFilter) return false;
        if (branchFilter !== 'all' && s.branchId !== branchFilter) return false;
        if (dateFilter === 'today' && s.date.slice(0, 10) !== today) return false;
        if (dateFilter === 'thisWeek') {
          const d = new Date(s.date);
          const now = new Date();
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          if (d < startOfWeek) return false;
        }
        if (customFilter === 'custom' && !s.isCustomOrder) return false;
        if (customFilter === 'normal' && s.isCustomOrder) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, query, statusFilter, branchFilter, dateFilter, customFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages, filtered.length]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const goToPage = (p: number) => {
    setPage(Math.min(Math.max(1, p), totalPages));
  };

  const stats = useMemo(() => {
    const total = filtered.reduce((sum, s) => sum + (s.status === 'Cancelled' ? 0 : s.total), 0);
    const completed = filtered.filter(s => s.status === 'Completed').length;
    const profit = filtered.reduce((sum, s) => sum + (s.status === 'Cancelled' ? 0 : s.totalProfit), 0);
    const items = filtered.reduce((sum, s) => sum + s.items.reduce((a, i) => a + i.quantity, 0), 0);
    return { total, completed, profit, items, count: filtered.length };
  }, [filtered]);

  const allStatuses = Array.from(new Set(sales.map(s => s.status)));

  const statusLabel = (status: string) => {
    switch (status) {
      case 'Completed': return t.completed;
      case 'Refunded': return t.refunded;
      case 'Partially_Refunded': return t.partiallyRefunded;
      case 'Cancelled': return t.cancelled;
      default: return status;
    }
  };

  const paymentLabel = (m: string) => {
    switch (m) {
      case 'cash': return t.cash;
      case 'vodafone_cash': return t.vodafoneCash;
      case 'instapay': return t.instapay;
      default: return m;
    }
  };

  const handlePrint = (sale: Sale) => {
    setSelected(sale);
    setTimeout(() => window.print(), 150);
  };

  return (
    <div className="space-y-4 print-area">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.ordersTitle}</h2>
          <p className="text-xs text-slate-500">{t.ordersDesc}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">
          <ReceiptText className="h-3.5 w-3.5 text-blue-600" />
          {sales.length} {t.totalItems}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.orders}</span>
            <ReceiptText className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-1 text-2xl font-black text-slate-900">{stats.count}</div>
          <div className="text-[10px] text-slate-400">{t.completed}: {stats.completed}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.revenue}</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1 text-2xl font-black text-emerald-600">{stats.total.toFixed(2)} {t.currency}</div>
          <div className="text-[10px] text-slate-400">{t.totalSales}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.profit}</span>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-1 text-2xl font-black text-indigo-600">{stats.profit.toFixed(2)} {t.currency}</div>
          <div className="text-[10px] text-slate-400">{t.totalProfit}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.totalItems}</span>
            <Package className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-1 text-2xl font-black text-slate-900">{stats.items}</div>
          <div className="text-[10px] text-slate-400">{t.qty}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t.searchOrder}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white focus:outline-hidden rtl:pl-3 rtl:pr-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Filter className="h-3 w-3" /> {t.filterStatus}
            </span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700"
            >
              <option value="all">{t.all}</option>
              {allStatuses.map(st => (
                <option key={st} value={st}>{statusLabel(st)}</option>
              ))}
            </select>

            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Store className="h-3 w-3" /> {t.filterBranch}
            </span>
            <select
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700"
            >
              <option value="all">{t.all}</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.nameAr}</option>
              ))}
            </select>

            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <CalendarDays className="h-3 w-3" /> {t.filterDate}
            </span>
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700"
            >
              <option value="all">{t.all}</option>
              <option value="today">{t.today}</option>
              <option value="thisWeek">{'هذا الأسبوع'}</option>
            </select>

            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <ReceiptText className="h-3 w-3" /> {'النوع'}
            </span>
            <select
              value={customFilter}
              onChange={e => setCustomFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700"
            >
              <option value="all">{t.all}</option>
              <option value="normal">{'طلبات عادية'}</option>
              <option value="custom">{'طلبات مخصصة'}</option>
            </select>

            {(query || statusFilter !== 'all' || branchFilter !== 'all' || dateFilter !== 'all' || customFilter !== 'all') && (
              <button
                onClick={() => { setQuery(''); setStatusFilter('all'); setBranchFilter('all'); setDateFilter('all'); setCustomFilter('all'); }}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                <X className="h-3.5 w-3.5" /> {'مسح الفلاتر'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Orders table (scrollable on small screens) */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs rtl:text-right">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-500">
              <tr>
                <th className="py-2.5 px-4">{t.receiptNumber}</th>
                <th className="py-2.5 px-3">{t.date}</th>
                <th className="py-2.5 px-3">{t.customer}</th>
                <th className="py-2.5 px-3">{t.branch || 'الفرع'}</th>
                <th className="py-2.5 px-3">{t.paymentMethod}</th>
                <th className="py-2.5 px-3">{t.status}</th>
                <th className="py-2.5 px-3 text-right rtl:text-left">{t.total}</th>
                <th className="py-2.5 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center">
                    <div className="text-3xl mb-2"><Search className="mx-auto h-6 w-6 text-slate-300" /></div>
                    <div className="text-sm text-slate-400">{t.noOrders}</div>
                  </td>
                </tr>
              ) : (
                paged.map(s => {
                  const meta = statusMeta[s.status] || statusMeta.Completed;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(s)}>
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {s.receiptNumber}
                        {s.isCustomOrder && (
                          <span className="ml-1.5 inline-block rounded-md bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 align-middle rtl:mr-1.5 rtl:ml-0">
                            {'مخصص'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                        {new Date(s.date).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short' })}
                        <span className="text-slate-400"> · </span>
                        <span className="text-slate-400">{new Date(s.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{s.customerName || customerById[s.customerId || ''] || t.walkInCustomer}</td>
                      <td className="py-3 px-3 text-slate-600">{branchName(s.branchId)}</td>
                      <td className="py-3 px-3 capitalize text-slate-600">{paymentLabel(s.paymentMethod)}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                          {statusLabel(s.status)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 rtl:text-left">
                        {s.total.toFixed(2)} {t.currency}
                      </td>
                      <td className="py-3 px-4 text-right rtl:text-left">
                        <button
                          onClick={e => { e.stopPropagation(); setSelected(s); }}
                          className="rounded-lg bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                        >
                          {t.view}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-[11px] text-slate-500">
            <span>{`النتيجة ${(page - 1) * PAGE_SIZE + 1} - ${Math.min(page * PAGE_SIZE, filtered.length)} من ${filtered.length} طلب`}</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t.previous || 'السابق'}
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => {
                  if (totalPages <= 7) return true;
                  return p === 1 || p === totalPages || Math.abs(p - page) <= 1;
                })
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-0.5 text-slate-400">…</span>}
                    <button
                      onClick={() => goToPage(p)}
                      className={`rounded-lg border px-2.5 py-1 font-bold transition-colors ${
                        p === page
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t.next || 'التالي'}
              </button>
            </div>
            <span className="font-bold text-slate-700">{stats.total.toFixed(2)} {t.currency}</span>
          </div>
        )}
      </div>

      {/* Order detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm print:hidden" onClick={() => setSelected(null)}>
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-3">
              <div className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-sm font-black text-slate-900">{t.orderDetails}</div>
                  <div className="font-mono text-[11px] text-blue-700">
                    {selected.receiptNumber}
                    {selected.isCustomOrder && (
                      <span className="ml-1.5 inline-block rounded-md bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 align-middle rtl:mr-1.5 rtl:ml-0">
                        {'طلب مخصص'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* Status + meta */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${(statusMeta[selected.status] || statusMeta.Completed).cls}`}>
                  <span className={`h-2 w-2 rounded-full ${(statusMeta[selected.status] || statusMeta.Completed).dot}`} />
                  {statusLabel(selected.status)}
                </span>
                <span className="text-[11px] text-slate-500">{new Date(selected.date).toLocaleString('ar-EG')}</span>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 p-2">
                  <Store className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-semibold">{branchName(selected.branchId)}</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 p-2">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span className="truncate">{selected.customerName || t.walkInCustomer}</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 p-2">
                  <Search className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-semibold">{selected.employeeName || '-'}</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 p-2">
                  <ReceiptText className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-semibold">{paymentLabel(selected.paymentMethod)}</span>
                </div>
              </div>

              {/* Items */}
              <div className="mb-4">
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{t.items}</div>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {selected.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-2 text-xs">
                      <div>
                        <div className="font-bold text-slate-800">{item.productName}</div>
                        <div className="text-[10px] text-slate-400">
                          {item.quantity} {item.unit} @ {item.salePrice.toFixed(2)} {t.currency}
                          {item.batchNumber && <span className="ml-1 font-mono">· {item.batchNumber}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-900">{item.lineTotal.toFixed(2)} {t.currency}</div>
                        <div className="text-[10px] font-semibold text-emerald-600">
                          {t.netProfit}: {(item.profit ?? (item.lineTotal - item.costPrice * item.quantity)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>{t.subtotal}</span>
                  <span className="font-mono">{selected.subtotal.toFixed(2)} {t.currency}</span>
                </div>
                {selected.pointsDiscountAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>{t.pointsDiscount}</span>
                    <span className="font-mono text-emerald-600">-{selected.pointsDiscountAmount.toFixed(2)} {t.currency}</span>
                  </div>
                )}
                {selected.discountTotal > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>{t.discount}</span>
                    <span className="font-mono text-emerald-600">-{selected.discountTotal.toFixed(2)} {t.currency}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-black text-slate-900">
                  <span>{t.total}</span>
                  <span className="font-mono">{selected.total.toFixed(2)} {t.currency}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>{t.totalProfit}</span>
                  <span className="font-mono font-bold text-indigo-600">{selected.totalProfit.toFixed(2)} {t.currency}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3 print:hidden">
              <button
                onClick={() => handlePrint(selected)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                <Printer className="h-3.5 w-3.5" /> {t.printReceipt}
              </button>
              <button
                onClick={() => setSelected(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print-only receipt view */}
      {selected && (
        <div className="hidden printable-only print:block p-6 text-xs">
          <div className="mb-3 border-b pb-2 text-center">
            <div className="text-sm font-black">{'ألبان زمان'}</div>
            <div className="font-mono">{selected.receiptNumber}</div>
            <div>{new Date(selected.date).toLocaleString()}</div>
          </div>
          {selected.items.map((item, idx) => (
            <div key={idx} className="flex justify-between py-0.5">
              <span>{item.quantity} x {item.productName}</span>
              <span>{item.lineTotal.toFixed(2)} {t.currency}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t pt-1 font-black">
            <span>{t.total}</span><span>{selected.total.toFixed(2)} {t.currency}</span>
          </div>
          <div className="mt-1 flex justify-between text-indigo-600">
            <span>{t.totalProfit}</span><span>{selected.totalProfit.toFixed(2)} {t.currency}</span>
          </div>
        </div>
      )}
    </div>
  );
};