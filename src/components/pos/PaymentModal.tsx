import React, { useState } from 'react';
import { SaleItem, PaymentBreakdown, PaymentMethod } from '../../types';
import { useApp } from '../../context/AppContext';
import { Banknote, Smartphone, Zap, Check, X, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  total: number;
  customerId?: string;
  pointsRedeemed?: number;
  pointsDiscountAmount?: number;
  onClose: () => void;
  onSuccess: (saleData: any) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  items,
  subtotal,
  discountTotal,
  total,
  customerId,
  pointsRedeemed = 0,
  pointsDiscountAmount = 0,
  onClose,
  onSuccess,
}) => {
  const { t } = useApp();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState<number>(total);
  const [reference, setReference] = useState<string>('');

  const changeDue = Math.max(0, cashTendered - total);

  // Preset quick cash buttons
  const quickCashOptions = [
    total,
    Math.ceil(total / 5) * 5,
    Math.ceil(total / 10) * 10,
    50,
    100,
    200,
    500,
  ].filter((val, index, self) => val >= total && self.indexOf(val) === index).slice(0, 5);

  const methodMeta: Array<{ id: PaymentMethod; label: string; desc: string; icon: React.ReactNode; activeCls: string; iconCls: string }> = [
    {
      id: 'cash',
      label: t.cash,
      desc: 'دفع نقدي مباشر',
      icon: <Banknote className="h-5 w-5 text-blue-600" />,
      activeCls: 'border-blue-600 bg-blue-50/70 text-blue-700 shadow-xs',
      iconCls: 'text-blue-600',
    },
    {
      id: 'vodafone_cash',
      label: t.vodafoneCash,
      desc: 'محفظة فودافون كاش',
      icon: <Smartphone className="h-5 w-5 text-rose-600" />,
      activeCls: 'border-rose-600 bg-rose-50/70 text-rose-700 shadow-xs',
      iconCls: 'text-rose-600',
    },
    {
      id: 'instapay',
      label: t.instapay,
      desc: 'تحويل إنستاباي فوري',
      icon: <Zap className="h-5 w-5 text-emerald-600" />,
      activeCls: 'border-emerald-600 bg-emerald-50/70 text-emerald-700 shadow-xs',
      iconCls: 'text-emerald-600',
    },
  ];

  const handleComplete = () => {
    let payments: PaymentBreakdown[] = [];

    if (paymentMethod === 'cash') {
      if (cashTendered < total) {
        alert(`${t.warning}: المبلغ المستلم أقل من المطلوب`);
        return;
      }
      payments = [{ method: 'cash', amount: total }];
    } else {
      payments = [{ method: paymentMethod, amount: total, reference: reference.trim() || undefined }];
    }

    onSuccess({
      items,
      subtotal,
      discountTotal,
      total,
      paymentMethod,
      payments,
      customerId,
      pointsRedeemed,
      pointsDiscountAmount,
      notes: reference.trim() ? `Ref: ${reference.trim()}` : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[95vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{t.paymentTitle}</h3>
            <p className="text-xs text-slate-500">{items.length} {t.itemsInCart}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-6">
          {/* Total Amount Box */}
          <div className="flex items-baseline justify-between rounded-xl bg-slate-900 p-4 text-white">
            <span className="text-sm font-medium text-slate-300">{t.totalPayable}</span>
            <div className="text-right">
              <span className="text-3xl font-black text-blue-400">{total.toFixed(2)}</span>
              <span className="ml-1 text-sm font-semibold text-slate-300 rtl:mr-1">{t.currency}</span>
            </div>
          </div>

          {/* Pre-payment loyalty points discount summary (applied on the order) */}
          {pointsRedeemed > 0 && pointsDiscountAmount > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-2.5 text-xs text-blue-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-blue-600" />
              <span>
                {t.pointsDiscountApplied}: <b>{pointsRedeemed} pts</b> (-{pointsDiscountAmount.toFixed(2)} {t.currency})
              </span>
            </div>
          )}

          {/* Payment Method Selector */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              {t.selectPaymentMethod}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {methodMeta.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                    paymentMethod === m.id ? m.activeCls : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                  <span className="text-[9px] font-normal text-slate-400">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cash Payment Mode Details */}
          {paymentMethod === 'cash' && (
            <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  {t.cashTendered} ({t.currency})
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={cashTendered}
                  onChange={e => setCashTendered(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-lg font-bold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Quick Cash Presets */}
              <div className="flex flex-wrap gap-2">
                {quickCashOptions.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCashTendered(opt)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    {opt === total ? `Exact (${opt.toFixed(2)})` : `${opt} ${t.currency}`}
                  </button>
                ))}
              </div>

              {/* Change calculation */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-sm font-medium text-slate-600">{t.changeDue}</span>
                <span className="text-xl font-black text-blue-600">
                  {changeDue.toFixed(2)} {t.currency}
                </span>
              </div>
            </div>
          )}

          {/* Vodafone Cash / InstaPay reference */}
          {(paymentMethod === 'vodafone_cash' || paymentMethod === 'instapay') && (
            <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <label className="block text-xs font-semibold text-slate-700">
                {t.enterPhoneOrRef}
              </label>
              <input
                type="text"
                placeholder={paymentMethod === 'vodafone_cash' ? '01X-XXX-XXXX' : 'رقم عملية / محفظة إنستاباي'}
                value={reference}
                onChange={e => setReference(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-500">
                {paymentMethod === 'vodafone_cash'
                  ? 'تأكد من استلام المبلغ على محفظة فودافون كاش قبل إتمام البيع.'
                  : 'تأكد من استلام المبلغ عبر إنستاباي قبل إتمام البيع.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={handleComplete}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700"
          >
            <Check className="h-4 w-4" />
            {t.finishSale}
          </button>
        </div>
      </div>
    </div>
  );
};