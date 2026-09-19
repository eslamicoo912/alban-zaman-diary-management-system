import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Sale, ReturnItem } from '../../types';
import { 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Receipt, 
  Clock, 
  User, 
  Store 
} from 'lucide-react';

export const ReturnsModule: React.FC = () => {
  const { t, sales, returns, processReturn } = useApp();

  const [receiptSearch, setReceiptSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [refundMethod, setRefundMethod] = useState<'cash' | 'vodafone_cash' | 'instapay' | 'original' | 'store_credit'>('cash');
  const [returnReason, setReturnReason] = useState<string>('ألبان تالفة / فاسدة');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const handleSearchReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    const query = receiptSearch.trim().toLowerCase();
    if (!query) return;

    const found = (
      [...sales]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .find(
          s =>
            s.receiptNumber.toLowerCase().includes(query) ||
            s.id.toLowerCase().includes(query) ||
            (s.customerName || '').toLowerCase().includes(query)
        )
    );
    if (found) {
      setSelectedSale(found);
      // Initialize return quantities
      const initialQty: Record<string, number> = {};
      found.items.forEach(i => (initialQty[i.productId] = 0));
      setReturnQuantities(initialQty);
      setSuccessMessage('');
    } else {
      alert(`الفاتورة غير موجودة: ${receiptSearch}`);
    }
  };

  const updateItemReturnQty = (productId: string, qty: number, maxQty: number) => {
    const validQty = Math.max(0, Math.min(qty, maxQty));
    setReturnQuantities(prev => ({ ...prev, [productId]: validQty }));
  };

  // Calculate refund totals
  const returnItemsSummary = useMemo(() => {
    if (!selectedSale) return { items: [], totalRefund: 0 };

    const items: ReturnItem[] = [];
    let totalRefund = 0;

    selectedSale.items.forEach(item => {
      const qty = returnQuantities[item.productId] || 0;
      if (qty > 0) {
        const itemRefund = Number((qty * item.salePrice).toFixed(2));
        totalRefund += itemRefund;
        items.push({
          productId: item.productId,
          productName: item.productName,
          quantity: qty,
          unitPrice: item.salePrice,
          costPrice: item.costPrice,
          refundAmount: itemRefund,
          reason: returnReason,
          batchNumber: item.batchNumber,
        });
      }
    });

    return { items, totalRefund };
  }, [selectedSale, returnQuantities, returnReason]);

  const handleConfirmReturn = () => {
    if (!selectedSale || returnItemsSummary.items.length === 0) {
      alert('الرجاء تحديد صنف واحد على الأقل بكمية مرتجعة.');
      return;
    }

    processReturn({
      originalSaleId: selectedSale.id,
      originalReceiptNumber: selectedSale.receiptNumber,
      items: returnItemsSummary.items,
      refundMethod,
      reason: returnReason,
    });

    setSuccessMessage(t.returnProcessedSuccess);
    setSelectedSale(null);
    setReceiptSearch('');
    setReturnQuantities({});
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">{t.returnsTitle}</h2>
        <p className="text-xs text-slate-500">
          {'استرجاع فوري للأصناف مع إعادة المخزون وعكس تكلفة المبيعات ونقاط الولاء تلقائياً'}
        </p>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-blue-50 p-4 text-xs font-bold text-blue-800 border border-blue-200">
          <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Receipt Lookup Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.processReturn}</h3>
        <form onSubmit={handleSearchReceipt} className="mt-3 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3" />
            <input
              type="text"
              placeholder={t.lookupReceipt + ' (e.g. REC-260903-001)'}
              value={receiptSearch}
              onChange={e => setReceiptSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-9 pr-3 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white focus:outline-hidden rtl:pl-3 rtl:pr-9"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-98 transition-all"
          >
            {t.search}
          </button>
        </form>

        {/* Quick Suggestion Chips from recent sales */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span>الأخيرة:</span>
          {sales.slice(0, 3).map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setReceiptSearch(s.receiptNumber);
                setSelectedSale(s);
                const q: Record<string, number> = {};
                s.items.forEach(i => (q[i.productId] = 0));
                setReturnQuantities(q);
              }}
              className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-700 hover:bg-slate-200"
            >
              {s.receiptNumber} ({s.total.toFixed(2)} {t.currency})
            </button>
          ))}
        </div>
      </div>

      {/* Sale Return Processor Box */}
      {selectedSale && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/20 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between border-b border-blue-100 pb-3">
            <div>
              <span className="text-xs font-bold text-blue-800">{t.receiptFound}:</span>
              <span className="ml-2 font-mono text-sm font-black text-slate-900 rtl:mr-2">
                {selectedSale.receiptNumber}
              </span>
              <span className="ml-2 text-xs text-slate-500">({new Date(selectedSale.date).toLocaleString()})</span>
            </div>
            <div className="text-xs text-slate-600">
              {t.customer}: <b className="text-slate-800">{selectedSale.customerName || t.walkInCustomer}</b>
            </div>
          </div>

          {/* Item Return Pickers */}
          <div className="mt-4 space-y-2">
            <h4 className="text-xs font-bold text-slate-700">{t.originalReceiptItems}</h4>
            <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {selectedSale.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{item.productName}</div>
                    <div className="text-[10px] text-slate-400">
                      Purchased: {item.quantity} {item.unit} @ {item.salePrice.toFixed(2)} {t.currency} • Batch: {item.batchNumber}
                    </div>
                  </div>

                  {/* Return Qty Counter */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">كمية الإرجاع:</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max={item.quantity}
                      value={returnQuantities[item.productId] || 0}
                      onChange={e =>
                        updateItemReturnQty(item.productId, parseFloat(e.target.value) || 0, item.quantity)
                      }
                      className="w-16 rounded-lg border border-slate-300 p-1.5 text-center font-bold"
                    />
                    <span className="w-20 text-right font-mono font-bold text-slate-800 rtl:text-left">
                      {((returnQuantities[item.productId] || 0) * item.salePrice).toFixed(2)} {t.currency}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Refund Details */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">{t.refundMethod}</label>
              <select
                value={refundMethod}
                onChange={e => setRefundMethod(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold text-slate-800"
              >
                <option value="cash">{t.cash}</option>
                <option value="vodafone_cash">{t.vodafoneCash}</option>
                <option value="instapay">{t.instapay}</option>
                <option value="original">{t.originalPayment}</option>
                <option value="store_credit">{t.storeCredit}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">{t.returnReason}</label>
              <select
                value={returnReason}
                onChange={e => setReturnReason(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800"
              >
                <option value="Damaged / Sour Dairy">{t.spoiledDairy}</option>
                <option value="Purchased by Mistake">{t.customerMistake}</option>
                <option value="Quality / Taste Complaint">{t.qualityIssue}</option>
                <option value="Other Reason">{t.otherReason}</option>
              </select>
            </div>
          </div>

          {/* Refund Amount & Submit */}
          <div className="mt-5 flex items-center justify-between border-t border-emerald-200 pt-4">
            <div>
              <span className="text-xs text-slate-500">إجمالي الاسترداد المستحق:</span>
              <span className="ml-2 text-2xl font-black text-rose-600">
                {returnItemsSummary.totalRefund.toFixed(2)} {t.currency}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmReturn}
                disabled={returnItemsSummary.totalRefund <= 0}
                className="rounded-xl bg-rose-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-40"
              >
                Confirm Refund & Restock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Returns History Audit Log */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="border-b border-slate-200 bg-slate-50/80 p-3 text-xs font-bold text-slate-700">
          Past Returns & Refunds Log
        </div>
        <table className="w-full text-left text-xs rtl:text-right">
          <thead className="border-b border-slate-200 font-bold text-slate-500">
            <tr>
              <th className="py-2.5 px-4">Return #</th>
              <th className="py-2.5 px-3">الفاتورة الأصلية</th>
              <th className="py-2.5 px-3">العميل</th>
              <th className="py-2.5 px-3">الأصناف المرتجعة</th>
              <th className="py-2.5 px-3 text-right rtl:text-left">قيمة الاسترداد</th>
              <th className="py-2.5 px-3">الطريقة</th>
              <th className="py-2.5 px-4">السبب</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {returns.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  لا توجد مرتجعات حتى الآن.
                </td>
              </tr>
            ) : (
              returns.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.returnNumber}</td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600">{r.originalReceiptNumber}</td>
                  <td className="py-3 px-3">{r.customerName || t.walkInCustomer}</td>
                  <td className="py-3 px-3">
                    <div className="space-y-0.5">
                      {r.items.map((it, idx) => (
                        <div key={idx} className="text-[11px] text-slate-700">
                          • {it.quantity}x {it.productName}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 rtl:text-left">
                    -{r.totalRefundAmount.toFixed(2)} {t.currency}
                  </td>
                  <td className="py-3 px-3 capitalize text-slate-600">{r.refundMethod}</td>
                  <td className="py-3 px-4 text-slate-500 text-[11px]">{r.reason}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
