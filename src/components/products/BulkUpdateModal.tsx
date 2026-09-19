import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { 
  Percent, 
  DollarSign, 
  CheckCircle2, 
  Calendar, 
  X, 
  Check, 
  AlertCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface BulkUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProducts: Product[];
  onApply: (updates: Partial<Product>) => void;
  onApplyPriceFormula?: (type: 'percent' | 'fixed', value: number, field: 'salePrice' | 'costPrice') => void;
}

export const BulkUpdateModal: React.FC<BulkUpdateModalProps> = ({
  isOpen,
  onClose,
  selectedProducts,
  onApply,
  onApplyPriceFormula,
}) => {
  const { t } = useApp();

  const [activeTab, setActiveTab] = useState<'price' | 'status' | 'stock'>('price');

  // Price Adjustment state
  const [priceTarget, setPriceTarget] = useState<'salePrice' | 'costPrice'>('salePrice');
  const [adjustmentType, setAdjustmentType] = useState<'percent' | 'fixed'>('percent');
  const [adjustmentValue, setAdjustmentValue] = useState<number>(10);
  const [roundToNearest, setRoundToNearest] = useState<boolean>(true);

  // Status state
  const [targetStatus, setTargetStatus] = useState<boolean>(true);

  // Stock / Alert state
  const [targetMinStock, setTargetMinStock] = useState<number>(5);
  const [applyMinStock, setApplyMinStock] = useState<boolean>(false);
  const [targetExpiryDate, setTargetExpiryDate] = useState<string>(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );
  const [applyExpiryDate, setApplyExpiryDate] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'price') {
      if (onApplyPriceFormula) {
        onApplyPriceFormula(adjustmentType, adjustmentValue, priceTarget);
      } else {
        // Fallback calculation
        const updates: Partial<Product> = {};
        if (adjustmentType === 'fixed') {
          updates[priceTarget] = Math.max(0, adjustmentValue);
        }
        onApply(updates);
      }
    } else if (activeTab === 'status') {
      onApply({ isActive: targetStatus });
    } else if (activeTab === 'stock') {
      const updates: Partial<Product> = {};
      if (applyMinStock) updates.minStock = targetMinStock;
      if (applyExpiryDate) updates.expiryDate = targetExpiryDate;
      onApply(updates);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/70">
          <div>
            <h3 className="font-bold text-slate-900 text-base">{t.bulkPriceUpdate || 'تعديلات جماعية على المنتجات'}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedProducts.length} {t.selectedItems || 'منتج سيتم تحديثه معاً'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 bg-slate-50/40 px-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('price')}
            className={`flex items-center gap-1.5 py-3 border-b-2 px-3 transition-colors ${
              activeTab === 'price'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            <span>{t.salePrice || 'السعر'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`flex items-center gap-1.5 py-3 border-b-2 px-3 transition-colors ${
              activeTab === 'status'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{t.status || 'الحالة'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-1.5 py-3 border-b-2 px-3 transition-colors ${
              activeTab === 'stock'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>{t.minStock || 'المخزون والصلاحية'}</span>
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleApply} className="p-5 space-y-4">
          {/* TAB 1: PRICE FORMULA */}
          {activeTab === 'price' && (
            <div className="space-y-4">
              {/* Target Price */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">حقل سعر الهدف</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPriceTarget('salePrice')}
                    className={`rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                      priceTarget === 'salePrice'
                        ? 'border-blue-600 bg-blue-50/60 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {t.salePrice} (Selling Price)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceTarget('costPrice')}
                    className={`rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                      priceTarget === 'costPrice'
                        ? 'border-blue-600 bg-blue-50/60 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {t.costPrice} (Purchase Cost)
                  </button>
                </div>
              </div>

              {/* Adjustment Mode */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وضع التعديل</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('percent')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                      adjustmentType === 'percent'
                        ? 'border-blue-600 bg-blue-50/60 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Percent className="h-4 w-4" />
                    <span>{t.percentageAdjustment}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('fixed')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                      adjustmentType === 'fixed'
                        ? 'border-blue-600 bg-blue-50/60 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <DollarSign className="h-4 w-4" />
                    <span>{t.fixedAmount}</span>
                  </button>
                </div>
              </div>

              {/* Value Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {adjustmentType === 'percent' ? 'Percentage Change (+/- %)' : `New Fixed Amount (${t.currency})`}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step={adjustmentType === 'percent' ? '1' : '0.25'}
                    value={adjustmentValue}
                    onChange={e => setAdjustmentValue(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-sm font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 rtl:right-auto rtl:left-3">
                    {adjustmentType === 'percent' ? '%' : t.currency}
                  </span>
                </div>
                {adjustmentType === 'percent' && (
                  <div className="flex gap-2 mt-2">
                    {[5, 10, 15, -5, -10].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAdjustmentValue(val)}
                        className={`rounded-lg px-2 py-1 text-[11px] font-bold border transition-colors ${
                          adjustmentValue === val
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {val > 0 ? `+${val}%` : `${val}%`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sample preview */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                <span className="text-[11px] font-bold text-slate-500 block mb-1">معاينة على أول صنف محدد:</span>
                {selectedProducts[0] && (
                  <div className="flex justify-between items-center font-mono">
                    <span className="text-slate-700 truncate max-w-[200px]">{selectedProducts[0].name}</span>
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="text-slate-400 line-through">
                        {selectedProducts[0][priceTarget].toFixed(2)}
                      </span>
                      <span>→</span>
                      <span className="text-emerald-600">
                        {adjustmentType === 'percent'
                          ? (selectedProducts[0][priceTarget] * (1 + adjustmentValue / 100)).toFixed(2)
                          : adjustmentValue.toFixed(2)}{' '}
                        {t.currency}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: STATUS */}
          {activeTab === 'status' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">تعيين حالة {selectedProducts.length} صنف في الكتالوج</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTargetStatus(true)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all ${
                    targetStatus === true
                      ? 'border-emerald-600 bg-emerald-50/60 text-emerald-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  <span className="text-xs font-bold">{t.active || 'نشط / للبيع'}</span>
                  <span className="text-[10px] text-slate-500">ظاهر في نقاط البيع والماسح الضوئي</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetStatus(false)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all ${
                    targetStatus === false
                      ? 'border-rose-600 bg-rose-50/60 text-rose-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <AlertCircle className="h-6 w-6 text-rose-600" />
                  <span className="text-xs font-bold">{t.inactive || 'متوقف / مؤرشف'}</span>
                  <span className="text-[10px] text-slate-500">مخفي من شاشة البيع</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: STOCK & EXPIRY */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-3 bg-white space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyMinStock}
                    onChange={e => setApplyMinStock(e.target.checked)}
                    className="h-4 w-4 rounded-md accent-blue-600"
                  />
                  <span>تحديث جماعي لحد أدنى إنذار المخزون</span>
                </label>
                {applyMinStock && (
                  <div className="pt-2">
                    <input
                      type="number"
                      min="1"
                      value={targetMinStock}
                      onChange={e => setTargetMinStock(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 p-3 bg-white space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyExpiryDate}
                    onChange={e => setApplyExpiryDate(e.target.checked)}
                    className="h-4 w-4 rounded-md accent-blue-600"
                  />
                  <span>تحديث جماعي لتاريخ الصلاحية (تسليم طازج)</span>
                </label>
                {applyExpiryDate && (
                  <div className="pt-2">
                    <input
                      type="date"
                      value={targetExpiryDate}
                      onChange={e => setTargetExpiryDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-mono font-bold"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
            <span className="text-xs text-slate-400">
              {selectedProducts.length} صنف سيتغير
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-95 transition-all"
              >
                <Check className="h-4 w-4" />
                <span>{t.applyBulkUpdate || 'تطبيق على المحدد'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
