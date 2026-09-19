import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { SearchableSelect } from '../common/SearchableSelect';
import { 
  Layers, 
  ArrowDownRight, 
  ArrowUpRight, 
  RefreshCw, 
  Send, 
  AlertOctagon, 
  AlertTriangle,
  Trash2,
  Clock, 
  Calendar, 
  CheckCircle2, 
  Filter,
  Plus
} from 'lucide-react';

export const InventoryModule: React.FC = () => {
  const {
    t,
    products,
    branches,
    activeBranchId,
    inventoryMovements,
    damagedGoods,
    adjustStock,
    transferStock,
    recordDamagedGoods,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'stock' | 'perishables' | 'movements' | 'damage'>('stock');

  // Damage reporting Modal state
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [damageProductId, setDamageProductId] = useState(products[0]?.id || '');
  const [damageQty, setDamageQty] = useState<number>(1);
  const [damageType, setDamageType] = useState<'damaged' | 'expired' | 'destroyed' | 'lost'>('damaged');
  const [damageNotes, setDamageNotes] = useState('');

  // Adjustment Modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState(products[0]?.id || '');
  const [adjustQty, setAdjustQty] = useState<number>(5);
  const [adjustReason, setAdjustReason] = useState('جولة جرد دورية للمخزون الفعلي');

  // Transfer Modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferProductId, setTransferProductId] = useState(products[0]?.id || '');
  const [transferQty, setTransferQty] = useState<number>(5);
  const [targetBranchId, setTargetBranchId] = useState(branches.find(b => b.id !== activeBranchId)?.id || '');
  const [transferNotes, setTransferNotes] = useState('نقل بسيارة مبردة لتعويض مخزون نهاية الأسبوع');

  const productOptions = useMemo(
    () =>
      products.map(p => ({
        id: p.id,
        label: p.nameAr || p.name,
        sublabel: `${p.barcode || p.sku} · الرصيد: ${p.currentStock} ${p.unit}`,
      })),
    [products]
  );

  // Perishable classification
  const perishableStats = useMemo(() => {
    const now = new Date();
    let expired = 0;
    let critical = 0; // <= 3 days
    let upcoming = 0; // 4 - 7 days
    let safe = 0;

    products.forEach(p => {
      if (!p.expiryDate) return;
      const exp = new Date(p.expiryDate);
      const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) expired++;
      else if (diffDays <= 3) critical++;
      else if (diffDays <= 7) upcoming++;
      else safe++;
    });

    return { expired, critical, upcoming, safe };
  }, [products]);

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProductId || adjustQty === 0) return;
    adjustStock(adjustProductId, adjustQty, adjustReason);
    setShowAdjustModal(false);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferProductId || transferQty <= 0 || !targetBranchId) return;
    transferStock(transferProductId, transferQty, targetBranchId, transferNotes);
    setShowTransferModal(false);
  };

  const handleDamageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!damageProductId || damageQty <= 0) return;
    const ok = recordDamagedGoods({
      productId: damageProductId,
      quantity: damageQty,
      damageType,
      notes: damageNotes,
    });
    if (!ok) {
      alert(`${t.warning}: الكمية أكبر من المتوفر بالمخزون`);
      return;
    }
    setShowDamageModal(false);
  };

  // Damage summary
  const damageStats = useMemo(() => {
    const totalUnits = damagedGoods.reduce((s, e) => s + e.quantity, 0);
    const totalLoss = damagedGoods.reduce((s, e) => s + e.lossValue, 0);
    const byType = (type: string) => damagedGoods.filter(e => e.damageType === type).reduce((s, e) => s + e.lossValue, 0);
    return { totalUnits, totalLoss, damaged: byType('damaged'), expired: byType('expired'), destroyed: byType('destroyed'), lost: byType('lost') };
  }, [damagedGoods]);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.inventoryTitle}</h2>
          <p className="text-xs text-slate-500">
            {'مراقبة حركة المخزون، صلاحية الألبان، والتحويلات بين الفروع'}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAdjustModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4 text-blue-600" />
            <span>{t.stockAdjustment}</span>
          </button>
          <button
            onClick={() => setShowDamageModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 shadow-2xs hover:bg-rose-100"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>تسجيل تالف / مفقود</span>
          </button>
          <button
            onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 transition-all active:scale-98"
          >
            <Send className="h-4 w-4 text-white" />
            <span>{t.branchTransfer}</span>
          </button>
        </div>
      </div>

      {/* Perishable Freshness Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-bold">{t.expired}</span>
            <AlertOctagon className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700">{perishableStats.expired}</div>
          <p className="text-[10px] text-rose-600">{'يجب إتلافها أو إرجاعها'}</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-xs font-bold">{t.criticalExpiry}</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-800">{perishableStats.critical}</div>
          <p className="text-[10px] text-amber-700">{'ضع تخفيضاً أو أولوية بيع'}</p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3.5">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-xs font-bold">{t.upcomingExpiry}</span>
            <Calendar className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-700">{perishableStats.upcoming}</div>
          <p className="text-[10px] text-blue-600">{'تحت المراقبة الأسبوعية'}</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-bold">{t.goodCondition}</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-800">{perishableStats.safe}</div>
          <p className="text-[10px] text-emerald-700">{'طازجة وتبريد ممتاز'}</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex gap-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('stock')}
          className={`border-b-2 pb-2 px-3 transition-all ${
            activeTab === 'stock'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.stockOnHand}
        </button>
        <button
          onClick={() => setActiveTab('perishables')}
          className={`border-b-2 pb-2 px-3 transition-all ${
            activeTab === 'perishables'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.perishableWatch}
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`border-b-2 pb-2 px-3 transition-all ${
            activeTab === 'movements'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.movementHistory}
        </button>
        <button
          onClick={() => setActiveTab('damage')}
          className={`border-b-2 pb-2 px-3 transition-all ${
            activeTab === 'damage'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          تالف / مفقود ({damagedGoods.length})
        </button>
      </div>

      {/* Tab Content 1: Stock on Hand */}
      {activeTab === 'stock' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
          <table className="w-full text-left text-xs rtl:text-right">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
              <tr>
                <th className="py-3 px-4">{t.productName}</th>
                <th className="py-3 px-3">{t.sku}</th>
                <th className="py-3 px-3">{t.batchNumber}</th>
                <th className="py-3 px-3 text-center">{t.stockOnHand}</th>
                <th className="py-3 px-3 text-center">{t.minStock}</th>
                <th className="py-3 px-3">{t.expiryDate}</th>
                <th className="py-3 px-4 text-center">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map(p => {
                const isLow = p.currentStock <= p.minStock && p.currentStock > 0;
                const isOut = p.currentStock <= 0;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span>{p.imageEmoji || '🥛'}</span>
                        <span>{p.nameAr || p.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{p.sku}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-700">{p.batchNumber}</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-bold ${
                          isOut
                            ? 'bg-rose-100 text-rose-700'
                            : isLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {p.currentStock} {p.unit}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">
                      {p.minStock} {p.unit}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">{p.expiryDate}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setAdjustProductId(p.id);
                          setShowAdjustModal(true);
                        }}
                        className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                      >
                        {t.stockAdjustment}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Tab Content 2: Perishables Watch */}
      {activeTab === 'perishables' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {products
            .filter(p => p.isPerishable)
            .map(p => {
              const exp = new Date(p.expiryDate);
              const diffDays = Math.ceil((exp.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              const isExpired = diffDays < 0;
              const isUrgent = diffDays >= 0 && diffDays <= 3;

              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border p-4 transition-all ${
                    isExpired
                      ? 'border-rose-200 bg-rose-50/40'
                      : isUrgent
                      ? 'border-amber-200 bg-amber-50/40'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-2xl">{p.imageEmoji || '🥛'}</span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        isExpired
                          ? 'bg-rose-600 text-white'
                          : isUrgent
                          ? 'bg-amber-600 text-white'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isExpired ? t.expired : `${diffDays} ${t.days}`}
                    </span>
                  </div>

                  <h4 className="mt-2 text-xs font-bold text-slate-900">
                    {p.nameAr || p.name}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {t.batchNumber}: <span className="font-mono text-slate-700">{p.batchNumber}</span>
                  </p>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2 text-xs">
                    <span className="text-slate-500">{t.stockOnHand}:</span>
                    <span className="font-bold text-slate-800">
                      {p.currentStock} {p.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{t.expiryDate}:</span>
                    <span className="font-mono font-semibold text-slate-700">{p.expiryDate}</span>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Tab Content 3: Movements Audit Log */}
      {activeTab === 'movements' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
          <table className="w-full text-left text-xs rtl:text-right">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
              <tr>
                <th className="py-3 px-4">{t.productName}</th>
                <th className="py-3 px-3">النوع</th>
                <th className="py-3 px-3 text-center">فرق الكمية</th>
                <th className="py-3 px-3">المرجع</th>
                <th className="py-3 px-3">التاريخ</th>
                <th className="py-3 px-4">الملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventoryMovements.map(m => {
                const isPositive = m.quantity > 0;
                return (
                  <tr key={m.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-semibold text-slate-800">{m.productName}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 capitalize">
                        {m.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold">
                      <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                        {isPositive ? `+${m.quantity}` : m.quantity} {m.unit}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{m.referenceId}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                      {new Date(m.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">{m.notes}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Tab Content 4: Damage / Loss Report */}
      {activeTab === 'damage' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5">
              <div className="flex items-center justify-between text-rose-700">
                <span className="text-xs font-bold">إجمالي الوحدات التالفة</span>
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="mt-2 text-2xl font-black text-rose-700">{damageStats.totalUnits} وحدة</div>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5">
              <div className="flex items-center justify-between text-rose-700">
                <span className="text-xs font-bold">إجمالي قيمة الخسارة</span>
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="mt-2 text-2xl font-black text-rose-700">
                {damageStats.totalLoss.toFixed(2)} {t.currency}
              </div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5">
              <div className="flex items-center justify-between text-amber-800">
                <span className="text-xs font-bold">تالف / فاسد</span>
                <Layers className="h-4 w-4" />
              </div>
              <div className="mt-2 text-2xl font-black text-amber-800">{damageStats.damaged.toFixed(2)} {t.currency}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-xs font-bold">منتهي الصلاحية / مفقود / متلف</span>
                <Clock className="h-4 w-4" />
              </div>
              <div className="mt-2 text-2xl font-black text-slate-700">
                {(damageStats.expired + damageStats.destroyed + damageStats.lost).toFixed(2)} {t.currency}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs rtl:text-right">
                <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
                  <tr>
                    <th className="py-3 px-4">رقم التلف</th>
                    <th className="py-3 px-3">{t.productName}</th>
                    <th className="py-3 px-3">النوع</th>
                    <th className="py-3 px-3 text-center">الكمية المتلفة</th>
                    <th className="py-3 px-3 text-right rtl:text-left">تكلفة الوحدة</th>
                    <th className="py-3 px-3 text-right rtl:text-left">قيمة الخسارة</th>
                    <th className="py-3 px-3">الموظف</th>
                    <th className="py-3 px-3">التاريخ</th>
                    <th className="py-3 px-4">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {damagedGoods.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        لا توجد خسائر مسجلة — استخدم زر «تسجيل تالف / مفقود» أعلاه.
                      </td>
                    </tr>
                  ) : (
                    damagedGoods.map(entry => (
                      <tr key={entry.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{entry.damageNumber}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{entry.productName}</td>
                        <td className="py-3 px-3">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            entry.damageType === 'expired'
                              ? 'bg-slate-100 text-slate-700'
                              : entry.damageType === 'lost'
                              ? 'bg-blue-100 text-blue-700'
                              : entry.damageType === 'destroyed'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            {entry.damageType === 'damaged' ? 'تالف/فاسد' : entry.damageType === 'expired' ? 'منتهي الصلاحية' : entry.damageType === 'destroyed' ? 'متلف' : 'مفقود'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-rose-600">
                          -{entry.quantity} {entry.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-500 rtl:text-left">
                          {entry.unitCost.toFixed(2)} {t.currency}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-rose-700 rtl:text-left">
                          {entry.lossValue.toFixed(2)} {t.currency}
                        </td>
                        <td className="py-3 px-3 text-slate-600">{entry.employeeName}</td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                          {new Date(entry.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">{entry.notes || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">{t.stockAdjustment}</h3>
            <form onSubmit={handleAdjustSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">{t.productName}</label>
                <SearchableSelect
                  options={productOptions}
                  value={adjustProductId}
                  onChange={setAdjustProductId}
                  placeholder="ابحث عن صنف..."
                  noResultsText="لا يوجد صنف مطابق"
                  aria-label={t.productName}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">{t.adjustQuantity}</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={adjustQty}
                  onChange={e => setAdjustQty(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-bold"
                  placeholder="مثال: +10 أو -5"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  {'استخدم إشارة موجب (+) للإضافة وسالب (-) للخصم أو التالف'}
                </p>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">{t.adjustmentReason}</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-98 transition-all"
                >
                  {t.confirmAdjustment}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Damaged/Lost Goods Modal */}
      {showDamageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">تسجيل تالف / مفقود / متلف</h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              سيتم خصم الكمية من المخزون وتسجيل قيمة الخسارة في تقرير التلفيات
            </p>
            <form onSubmit={handleDamageSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">{t.productName}</label>
                <SearchableSelect
                  options={productOptions}
                  value={damageProductId}
                  onChange={setDamageProductId}
                  placeholder="ابحث عن صنف..."
                  noResultsText="لا يوجد صنف مطابق"
                  aria-label={t.productName}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">نوع الخسارة</label>
                  <select
                    value={damageType}
                    onChange={e => setDamageType(e.target.value as typeof damageType)}
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  >
                    <option value="damaged">تالف / فاسد</option>
                    <option value="expired">منتهي الصلاحية</option>
                    <option value="destroyed">متلف (إتلاف مقصود)</option>
                    <option value="lost">مفقود (عجز بالمخزون)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">{t.adjustQuantity}</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    min="0.5"
                    value={damageQty}
                    onChange={e => setDamageQty(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">ملاحظات (سبب التلف)</label>
                <input
                  type="text"
                  value={damageNotes}
                  onChange={e => setDamageNotes(e.target.value)}
                  placeholder="مثال: انقطاع تبريد الليلي، كسر أثناء النقل، عجز جرد"
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDamageModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-600 px-5 py-2 font-bold text-white shadow-md shadow-rose-500/25 hover:bg-rose-700 active:scale-98 transition-all"
                >
                  <AlertTriangle className="mr-1 inline h-3.5 w-3.5 rtl:ml-1" />
                  تأكيد الخصم والتسجيل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Branch Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">{t.branchTransfer}</h3>
            <form onSubmit={handleTransferSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">{t.productName}</label>
                <SearchableSelect
                  options={productOptions}
                  value={transferProductId}
                  onChange={setTransferProductId}
                  placeholder="ابحث عن صنف..."
                  noResultsText="لا يوجد صنف مطابق"
                  aria-label={t.productName}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">{t.destBranch}</label>
                <select
                  value={targetBranchId}
                  onChange={e => setTargetBranchId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                >
                  {branches
                    .filter(b => b.id !== activeBranchId)
                    .map(b => (
                        <option key={b.id} value={b.id}>
                        {b.nameAr} ({b.code})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">{t.qty}</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  min="0.5"
                  value={transferQty}
                  onChange={e => setTransferQty(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-bold"
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">ملاحظات التحويل</label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={e => setTransferNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-98 transition-all"
                >
                  {t.confirmTransfer}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
