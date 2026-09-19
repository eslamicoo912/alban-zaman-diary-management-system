import React from 'react';
import { Sale, Branch } from '../../types';
import { useApp } from '../../context/AppContext';
import { Printer, CheckCircle, X, Store, Calendar, User, CreditCard } from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale;
  branch: Branch;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, branch, onClose }) => {
  const { t } = useApp();

  const methodLabel = (m: string) => {
    switch (m) {
      case 'cash': return t.cash;
      case 'vodafone_cash': return t.vodafoneCash;
      case 'instapay': return t.instapay;
      default: return m;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('ar-SA', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[95vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2 text-blue-600">
            <CheckCircle className="h-5 w-5" />
            <h3 className="font-bold text-slate-800">{t.saleCompletedTitle}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Receipt Content (Printable target) */}
        <div className="overflow-y-auto p-6">
          <div
            id="printable-receipt"
            className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-5 font-mono text-xs text-slate-800"
          >
            {/* Store Banner */}
            <div className="mb-4 text-center">
              <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Store className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                {branch.nameAr}
              </h2>
              <p className="text-[11px] text-slate-500">{t.appSubtitle}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">{branch.address} • {branch.phone}</p>
              <div className="my-2 border-b border-dashed border-slate-300" />
              <p className="text-[11px] font-semibold text-slate-700">
                {t.thermalReceipt}
              </p>
            </div>

            {/* Meta Info */}
            <div className="mb-3 space-y-1 text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span>{t.receiptNumber}:</span>
                <span className="font-bold text-slate-900">{sale.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {formatDate(sale.date)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" /> {t.currentEmployee}:
                </span>
                <span>{sale.employeeName}</span>
              </div>
              {sale.customerName && (
                <div className="flex justify-between">
                  <span>{t.customer}:</span>
                  <span className="font-semibold text-blue-700">{sale.customerName}</span>
                </div>
              )}
            </div>

            <div className="mb-2 border-b border-slate-300" />

            {/* Items Table */}
            <table className="w-full text-left rtl:text-right">
              <thead>
                <tr className="border-b border-slate-300 text-[10px] text-slate-500">
                  <th className="pb-1">{t.productName}</th>
                  <th className="pb-1 text-center">{t.qty}</th>
                  <th className="pb-1 text-right rtl:text-left">{t.price}</th>
                  <th className="pb-1 text-right rtl:text-left">{t.total}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-slate-200">
                {sale.items.map((item, idx) => (
                  <tr key={idx} className="text-[11px]">
                    <td className="py-1.5 font-sans">
                      <div className="font-semibold text-slate-800">
                        {item.productNameAr ? item.productNameAr : item.productName}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {item.sku} • {t.batch}: {item.batchNumber}
                      </div>
                    </td>
                    <td className="py-1.5 text-center">{item.quantity} {item.unit}</td>
                    <td className="py-1.5 text-right rtl:text-left">{item.salePrice.toFixed(2)}</td>
                    <td className="py-1.5 text-right font-bold rtl:text-left">{item.lineTotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="my-2 border-b border-slate-300" />

            {/* Totals */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>{t.subtotal}</span>
                <span>{sale.subtotal.toFixed(2)} {t.currency}</span>
              </div>
              {sale.discountTotal > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>{t.discount}</span>
                  <span>-{sale.discountTotal.toFixed(2)} {t.currency}</span>
                </div>
              )}
              {sale.pointsDiscountAmount > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>{t.pointsDiscountApplied}</span>
                  <span>-{sale.pointsDiscountAmount.toFixed(2)} {t.currency}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-300 pt-1 text-sm font-bold text-slate-900">
                <span>{t.total}</span>
                <span className="text-blue-600 font-extrabold">{sale.total.toFixed(2)} {t.currency}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="mt-3 border-t border-dashed border-slate-200 pt-2 text-[11px] text-slate-600">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 font-semibold">
                  <CreditCard className="h-3 w-3" /> {t.selectPaymentMethod}:
                </span>
                <span className="font-bold uppercase text-slate-800">{methodLabel(sale.paymentMethod)}</span>
              </div>
              {sale.payments.map((p, i) => (
                <div key={i} className="flex justify-between pl-4 text-[10px] text-slate-500 rtl:pr-4">
                  <span className="capitalize">{methodLabel(p.method)}:</span>
                  <span>{p.amount.toFixed(2)} {t.currency}</span>
                </div>
              ))}
              {sale.pointsEarned > 0 && (
                <div className="mt-2 rounded-md bg-blue-50 p-1.5 text-center font-sans text-[11px] font-semibold text-blue-800">
                  ⭐ +{sale.pointsEarned} {t.pointsBalance} {'مكتسبة'}!
                </div>
              )}
            </div>

            {/* Barcode representation */}
            <div className="mt-4 border-t border-dashed border-slate-300 pt-3 text-center">
              <div className="mx-auto flex h-7 w-48 items-center justify-center bg-slate-900 text-[10px] font-bold tracking-widest text-white">
                ||||| | |||| ||||| || |||
              </div>
              <p className="mt-1 text-[10px] tracking-wider text-slate-400">{sale.receiptNumber}</p>
              <p className="mt-2 text-[10px] text-slate-500">
                {'شكراً لزيارتكم - ألبان طازجة يومياً'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800"
          >
            <Printer className="h-4 w-4" />
            {t.printReceipt}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700"
          >
            {t.newSale}
          </button>
        </div>
      </div>
    </div>
  );
};
