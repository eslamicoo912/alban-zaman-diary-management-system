import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Vendor, PurchaseOrder, PurchaseItem, Product, ProductUnit } from '../../types';
import { SearchableSelect } from '../common/SearchableSelect';
import {
  Truck,
  Plus,
  CheckCircle2,
  Check,
  Wallet,
  DollarSign,
  PackageCheck,
  RotateCcw,
  Clock,
  Building2,
  FileText,
  Eye,
  X
} from 'lucide-react';

export const PurchasesModule: React.FC = () => {
  const {
    t,
    vendors,
    purchases,
    vendorReturns,
    products,
    addProduct,
    addVendor,
    createPurchaseOrder,
    receivePurchaseOrder,
    payPurchaseOrder,
    processVendorReturn,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'orders' | 'vendors' | 'returns'>('orders');

  // Vendor detail view
  const [viewVendor, setViewVendor] = useState<Vendor | null>(null);

  // New Vendor Modal
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorForm, setVendorForm] = useState({
    name: '',
    nameAr: '',
    phone: '',
    email: '',
    address: '',
    paymentTerms: 'Net 30',
  });

  // New Purchase Order Modal
  const [showPOModal, setShowPOModal] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState(vendors[0]?.id || '');

  // Quick-add a brand-new product from a scanned/typed barcode inside the PO form
  const [showQuickAddProduct, setShowQuickAddProduct] = useState(false);
  const [qaBarcode, setQaBarcode] = useState('');
  const [qaTargetRow, setQaTargetRow] = useState<number | null>(null);
  const [qaForm, setQaForm] = useState({
    name: '',
    nameAr: '',
    price: 0,
    cost: 0,
    unit: 'Piece',
  });

  const poProductOptions = products.map(p => ({
    id: p.id,
    label: p.nameAr || p.name,
    sublabel: `${p.barcode || p.sku} · الرصيد: ${p.currentStock} ${p.unit}`,
  }));

  const vendorOptions = vendors.map(v => ({
    id: v.id,
    label: v.nameAr || v.name,
    sublabel: `${v.name} · ${v.phone} · ${v.paymentTerms}`,
  }));
  const [poItems, setPoItems] = useState<PurchaseItem[]>([
    {
      productId: products[0]?.id || '',
      productName: products[0]?.name || '',
      unit: products[0]?.unit || 'Bottle',
      quantity: 50,
      unitCost: products[0]?.costPrice || 4.2,
      totalCost: (products[0]?.costPrice || 4.2) * 50,
      batchNumber: `B-${new Date().getFullYear()}09A`,
      expiryDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
      barcode: products[0]?.barcode
    },
  ]);

  // Vendor Return Modal (editable PO copy)
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnPoId, setReturnPoId] = useState('');
  const [returnLines, setReturnLines] = useState<PurchaseItem[]>([]);
  const [replaceFlags, setReplaceFlags] = useState<Record<number, boolean>>({});
  const [returnReason, setReturnReason] = useState('عبوة كرتونية تالفة عند التحميل من السيارة');

  // Installment / partial payment state
  const [payPoId, setPayPoId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');

  const returnablePOs = purchases.filter(po => po.items.some(it => it.quantity > 0));

  const returnPoOptions = returnablePOs.map(po => ({
    id: po.id,
    label: `${po.poNumber} · ${po.vendorName}`,
    sublabel: `${po.items.reduce((s, it) => s + it.quantity, 0)} أصناف/وحدات`,
  }));

  const poStatusLabel = (status: string) => {
    switch (status) {
      case 'Paid': return 'مدفوع';
      case 'Received': return 'مستلم';
      case 'Cancelled': return 'ملغي';
      default: return 'قيد الانتظار';
    }
  };

  const openReturnForPO = (poId: string) => {
    const po = purchases.find(p => p.id === poId);
    if (!po) return;
    setReturnPoId(poId);
    setReturnLines(po.items.map(it => ({ ...it, totalCost: it.totalCost })));
    setReplaceFlags(po.items.map((_, idx) => ({ [idx]: false })).reduce((a, b) => ({ ...a, ...b }), {}));
    setShowReturnModal(true);
  };

  const updateReturnLineQty = (index: number, value: number) => {
    const po = purchases.find(p => p.id === returnPoId);
    const original = po?.items[index]?.quantity ?? returnLines[index].quantity;
    const clamped = Math.max(0, Math.min(Number.isFinite(value) ? value : 0, original));
    const updated = [...returnLines];
    updated[index] = {
      ...updated[index],
      quantity: clamped,
      totalCost: Number((clamped * updated[index].unitCost).toFixed(2)),
    };
    setReturnLines(updated);
    if (clamped === 0) {
      setReplaceFlags(prev => ({ ...prev, [index]: false }));
    }
  };

  const toggleReplaceFlag = (index: number) => {
    setReplaceFlags(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // Handle PO items
  const addPoItemRow = () => {
    const prod = products[0];
    setPoItems([
      ...poItems,
      {
        productId: prod?.id || '',
        productName: prod?.name || '',
        unit: prod?.unit || 'Bottle',
        quantity: 20,
        unitCost: prod?.costPrice || 5,
        totalCost: (prod?.costPrice || 5) * 20,
        batchNumber: `B-${new Date().getFullYear()}09`,
        expiryDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      },
    ]);
  };

  const updatePoItem = (index: number, field: keyof PurchaseItem, value: any) => {
    const updated = [...poItems];
    const item = { ...updated[index], [field]: value };
    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        item.productName = prod.name;
        item.unit = prod.unit;
        item.unitCost = prod.costPrice;
      }
    }
    item.totalCost = Number(((item.quantity || 0) * (item.unitCost || 0)).toFixed(2));
    updated[index] = item;
    setPoItems(updated);
  };

  const removePoItem = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  // Create a new product from a barcode typed/scanned in the PO item selector
  const handleQuickAddProduct = () => {
    if (!qaForm.name.trim()) return;
    const payload: Omit<Product, 'id'> = {
      name: qaForm.name.trim(),
      nameAr: qaForm.nameAr.trim() || qaForm.name.trim(),
      sku: `SKU-${qaBarcode.slice(-6) || Date.now().toString().slice(-6)}`,
      barcode: qaBarcode,
      unit: qaForm.unit as ProductUnit,
      imageEmoji: '🥛',
      costPrice: qaForm.cost,
      salePrice: qaForm.price,
      minSalePrice: 0,
      currentStock: 0,
      minStock: 10,
      expiryDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      batchNumber: `B-${new Date().getFullYear()}`,
      isActive: true,
      isPerishable: true,
    };
    const created = addProduct(payload);
    if (qaTargetRow !== null) {
      setPoItems(prev =>
        prev.map((it, idx) => {
          if (idx !== qaTargetRow) return it;
          const next = {
            ...it,
            productId: created.id,
            productName: created.name,
            unit: created.unit,
            unitCost: created.costPrice,
          };
          return { ...next, totalCost: Number(((next.quantity || 0) * next.unitCost).toFixed(2)) };
        })
      );
    }
    setShowQuickAddProduct(false);
    setQaForm({ name: '', nameAr: '', price: 0, cost: 0, unit: 'Piece' });
    setQaBarcode('');
    setQaTargetRow(null);
  };

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    const vendor = vendors.find(v => v.id === selectedVendorId);
    if (!vendor || poItems.length === 0) return;

    const totalAmount = poItems.reduce((sum, item) => sum + item.totalCost, 0);

    createPurchaseOrder({
      vendorId: vendor.id,
      vendorName: vendor.name,
      branchId: 'br-1',
      items: poItems,
      totalAmount,
      status: 'Pending',
      notes: 'طلب توريد ألبان دوري',
    });

    setShowPOModal(false);
  };

  const handleAddVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.name.trim()) return;

    addVendor({
      name: vendorForm.name.trim(),
      nameAr: vendorForm.nameAr.trim() || undefined,
      phone: vendorForm.phone.trim(),
      email: vendorForm.email.trim(),
      address: vendorForm.address.trim(),
      paymentTerms: vendorForm.paymentTerms,
    });

    setVendorForm({
      name: '',
      nameAr: '',
      phone: '',
      email: '',
      address: '',
      paymentTerms: 'Net 30',
    });
    setShowVendorModal(false);
  };

  const handlePartialPayment = (poId: string) => {
    const po = purchases.find(p => p.id === poId);
    if (!po) return;
    const remaining = Math.max(0, po.totalAmount - (po.paidAmount || 0));
    const amount = Math.min(parseFloat(payAmount) || remaining, remaining);
    if (amount <= 0) return;
    payPurchaseOrder(poId, 'Bank Transfer', amount);
    setPayPoId(null);
    setPayAmount('');
  };

  const handleVendorReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const po = purchases.find(p => p.id === returnPoId);
    if (!po || returnLines.length === 0) return;

    const items = returnLines
      .map((line, idx) => ({ line, idx }))
      .filter(({ line }) => line.quantity > 0)
      .map(({ line, idx }) => ({
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        unitCost: line.unitCost,
        total: Number((line.quantity * line.unitCost).toFixed(2)),
        replacement: !!replaceFlags[idx],
      }));
    if (items.length === 0) return;

    processVendorReturn({
      vendorId: po.vendorId,
      sourcePoId: po.id,
      sourcePoNumber: po.poNumber,
      items,
      reason: returnReason,
    });

    setShowReturnModal(false);
    setReturnPoId('');
    setReturnLines([]);
    setReplaceFlags({});
    setReturnReason('عبوة كرتونية تالفة عند التحميل من السيارة');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.purchasesTitle}</h2>
          <p className="text-xs text-slate-500">
            {'دورة التوريد: أمر الشراء ➔ استلام البضاعة ➔ تحديث المخزون ➔ سداد الفواتير'}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowVendorModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Building2 className="h-4 w-4 text-blue-600" />
            <span>{t.addVendor}</span>
          </button>
          <button
            onClick={() => (returnablePOs[0] ? openReturnForPO(returnablePOs[0].id) : setReturnPoId(''), setShowReturnModal(true))}
            className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
          >
            <RotateCcw className="h-4 w-4" />
            <span>مرتجع للمورد</span>
          </button>
          <button
            onClick={() => setShowPOModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-98 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>{t.createPO}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('orders')}
          className={`border-b-2 pb-2 px-3 transition-all ${activeTab === 'orders'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          {t.purchaseOrdersTab} ({purchases.length})
        </button>
        <button
          onClick={() => setActiveTab('vendors')}
          className={`border-b-2 pb-2 px-3 transition-all ${activeTab === 'vendors'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          {t.vendorsTab} ({vendors.length})
        </button>
        <button
          onClick={() => setActiveTab('returns')}
          className={`border-b-2 pb-2 px-3 transition-all ${activeTab === 'returns'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          {t.vendorReturnsTab} ({vendorReturns.length})
        </button>
      </div>

      {/* Tab 1: Purchase Orders */}
      {activeTab === 'orders' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs rtl:text-right">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
              <tr>
                <th className="py-3 px-4">PO #</th>
                <th className="py-3 px-3">المورد</th>
                <th className="py-3 px-3">تاريخ الإنشاء</th>
                <th className="py-3 px-3">ملخص الأصناف</th>
                <th className="py-3 px-3 text-right rtl:text-left">إجمالي الفاتورة</th>
                <th className="py-3 px-3 text-right rtl:text-left">المدفوع / المتبقي</th>
                <th className="py-3 px-3 text-center">الحالة</th>
                <th className="py-3 px-4 text-center">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.map(po => {
                const poPaid = po.paidAmount || 0;
                const poRemaining = Math.max(0, po.totalAmount - poPaid);
                const poDue = poRemaining > 0.001;
                return (
                  <tr key={po.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{po.poNumber}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{po.vendorName}</td>
                    <td className="py-3 px-3 text-slate-500">{po.createdDate}</td>
                    <td className="py-3 px-3">
                      <span className="text-slate-700 font-medium">
                        {po.items.length} product lines ({po.items.reduce((s, i) => s + i.quantity, 0)} units)
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900 rtl:text-left">
                      {po.totalAmount.toFixed(2)} {t.currency}
                    </td>
                    <td className="py-3 px-3 text-right font-mono rtl:text-left">
                      <div className="font-bold text-emerald-600">{poPaid.toFixed(2)} {t.currency}</div>
                      <div className={`text-[10px] font-semibold ${poDue ? 'text-rose-500' : 'text-slate-400'}`}>
                        متبقي: {poRemaining.toFixed(2)} {t.currency}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${po.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : poDue
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                          }`}
                      >
                        {poStatusLabel(po.status)}
                        {po.status === 'Received' && poDue && ' (جزئي)'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {po.status === 'Pending' && (
                          <button
                            onClick={() => receivePurchaseOrder(po.id)}
                            className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-blue-700"
                          >
                            <PackageCheck className="h-3.5 w-3.5" />
                            <span>{t.receiveGoods}</span>
                          </button>
                        )}
                        {po.status === 'Received' && payPoId !== po.id && (
                          <>
                            <button
                              onClick={() => payPurchaseOrder(po.id, 'Bank Transfer')}
                              title={'سداد كامل'}
                              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                            >
                              <DollarSign className="h-3.5 w-3.5" />
                              <span>{t.markAsPaid}</span>
                            </button>
                            <button
                              onClick={() => {
                                setPayPoId(po.id);
                                setPayAmount('');
                              }}
                              title={'دفع دفعة / قسط'}
                              className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-700"
                            >
                              <Wallet className="h-3.5 w-3.5" />
                              <span>دفعة</span>
                            </button>
                          </>
                        )}
                        {po.status === 'Received' && payPoId === po.id && (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              max={Math.round(poRemaining * 100)}
                              value={payAmount}
                              onChange={e => setPayAmount(e.target.value)}
                              placeholder={poRemaining.toFixed(2)}
                              className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-center font-mono text-[11px] font-bold focus:border-blue-500 focus:outline-hidden"
                            />
                            <button
                              onClick={() => handlePartialPayment(po.id)}
                              disabled={!payAmount || parseFloat(payAmount) <= 0}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setPayPoId(null);
                                setPayAmount('');
                              }}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        {po.status === 'Paid' && (
                          <span className="text-[11px] text-slate-400 font-semibold">مسدد</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Vendors Directory */}
      {activeTab === 'vendors' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <table className="w-full text-left text-xs rtl:text-right">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
              <tr>
                <th className="py-3 px-4">{t.vendorName}</th>
                <th className="py-3 px-3">جهة الاتصال</th>
                <th className="py-3 px-3">{t.paymentTerms}</th>
                <th className="py-3 px-4 text-right rtl:text-left">{t.payableBalance}</th>
                <th className="py-3 px-3 text-center">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendors.map(v => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <div>{v.nameAr || v.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{v.address}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    <div>{v.phone}</div>
                    <div className="text-[10px] text-slate-400">{v.email}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                      {v.paymentTerms}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold rtl:text-left">
                    <span className={v.balance > 0 ? 'text-rose-600' : 'text-slate-700'}>
                      {v.balance.toFixed(2)} {t.currency}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => setViewVendor(v)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      title={'عرض طلبات ومرتجعات المورد'}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Vendor Returns */}
      {activeTab === 'returns' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <table className="w-full text-left text-xs rtl:text-right">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
              <tr>
                <th className="py-3 px-4">Debit Note #</th>
                <th className="py-3 px-3">المورد</th>
                <th className="py-3 px-3">أمر الشراء</th>
                <th className="py-3 px-3">الأصناف المرتجعة</th>
                <th className="py-3 px-3 text-right rtl:text-left">قيمة الخصم</th>
                <th className="py-3 px-3">التاريخ</th>
                <th className="py-3 px-4">السبب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendorReturns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    لا توجد مرتجعات مسجلة لدى الموردين حتى الآن.
                  </td>
                </tr>
              ) : (
                vendorReturns.map(vr => (
                  <tr key={vr.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{vr.returnNumber}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{vr.vendorName}</td>
                    <td className="py-3 px-3 text-slate-500">
                      {vr.sourcePoNumber && (
                        <span className="font-mono text-[10px] text-slate-400">{t.returnReference}: {vr.sourcePoNumber}</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {vr.items.map((it, idx) => (
                        <div key={idx} className="text-slate-700">
                          {it.quantity}x {it.productName}
                          <span className={`ml-1.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${it.replacement ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                            {it.replacement ? t.replaced : t.returnedWithoutReplacement}
                          </span>
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 rtl:text-left">
                      -{vr.totalAmount.toFixed(2)} {t.currency}
                    </td>
                    <td className="py-3 px-3 text-slate-400">{new Date(vr.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-slate-500">{vr.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* New Purchase Order Modal */}
      {showPOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">{t.createPO}</h3>

            <form onSubmit={handleCreatePO} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">{t.vendorName}</label>
                <SearchableSelect
                  options={vendorOptions}
                  value={selectedVendorId}
                  onChange={setSelectedVendorId}
                  placeholder={`ابحث عن مورد... (${vendors.length})`}
                  noResultsText="لا يوجد مورد بهذا الاسم أو الهاتف"
                  aria-label={t.vendorName}
                />
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-700">بنود الطلب</label>
                  <button
                    type="button"
                    onClick={addPoItemRow}
                    className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>إضافة صنف</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {poItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 rounded-xl border border-slate-200 p-2.5 items-center">
                      <div className="col-span-4">
                        <label className="text-[10px] text-slate-400">الصنف</label>
                        <SearchableSelect
                          options={poProductOptions}
                          value={item.productId}
                          onChange={id => updatePoItem(idx, 'productId', id)}
                          placeholder="ابحث باسم أو باركود الصنف..."
                          noResultsText="لا يوجد صنف مطابق"
                          createLabel={q => `إنشاء صنف جديد بالباركود "${q}"`}
                          onCreateQuery={q => {
                            setQaBarcode(q);
                            setQaTargetRow(idx);
                            setQaForm({ name: '', nameAr: '', price: 0, cost: 0, unit: 'Piece' });
                            setShowQuickAddProduct(true);
                          }}
                          aria-label={`صنف ${idx + 1}`}
                        />
                      </div>



                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-400">قطعة / كيلو </label>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={item.quantity}
                          onChange={e => updatePoItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full rounded-lg border border-slate-200 p-1.5 font-bold"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-400">تكلفة الوحدة ({t.currency})</label>
                        <input
                          type="number"
                          step="0.1"
                          value={item.unitCost}
                          onChange={e => updatePoItem(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                          className="w-full rounded-lg border border-slate-200 p-1.5 font-bold"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-400">تاريخ الصلاحية</label>
                        <input
                          type="date"
                          value={item.expiryDate || ''}
                          onChange={e => updatePoItem(idx, 'expiryDate', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 p-1.5"
                        />
                      </div>

                      <div className="col-span-2 flex items-center justify-between pt-3">
                        <span className="font-mono font-bold text-slate-900">
                          {item.totalCost.toFixed(2)}
                        </span>
                        {poItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePoItem(idx)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grand Total */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-sm font-semibold text-slate-600">إجمالي أمر الشراء:</span>
                <span className="text-xl font-extrabold text-blue-600">
                  {poItems.reduce((s, i) => s + i.totalCost, 0).toFixed(2)} {t.currency}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPOModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-98 transition-all"
                >
                  حفظ أمر الشراء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Product Modal (new product from scanned barcode in PO) */}
      {showQuickAddProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">{'إضافة صنف جديد بالباركود'}</h3>
              <button
                onClick={() => setShowQuickAddProduct(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {`الباركود "${qaBarcode}" غير موجود في قائمة المنتجات. أدخل بيانات الصنف ليُضاف ويُدرج في الطلب.`}
            </p>
            <form onSubmit={e => { e.preventDefault(); handleQuickAddProduct(); }} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">{'اسم الصنف *'}</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={qaForm.name}
                  onChange={e => setQaForm({ ...qaForm, name: e.target.value })}
                  placeholder={'مثال: جبنة رومي'}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">{'الاسم بالعربية'}</label>
                <input
                  type="text"
                  value={qaForm.nameAr}
                  onChange={e => setQaForm({ ...qaForm, nameAr: e.target.value })}
                  placeholder={'اختياري'}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">{'الوحدة'}</label>
                  <select
                    value={qaForm.unit}
                    onChange={e => setQaForm({ ...qaForm, unit: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  >
                    {(['Piece', 'Bottle', 'Liter', 'Kg', 'Gram', 'Box', 'Carton'] as ProductUnit[]).map(u => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">{'سعر التكلفة'}</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={qaForm.cost}
                    onChange={e => setQaForm({ ...qaForm, cost: Math.max(0, Number(e.target.value)) })}
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">{'سعر البيع'}</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={qaForm.price}
                    onChange={e => setQaForm({ ...qaForm, price: Math.max(0, Number(e.target.value)) })}
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  />
                </div>
              </div>
              <p className="rounded-lg bg-slate-50 p-2 font-mono text-[10px] text-slate-500">
                {`الباركود: ${qaBarcode}`}
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowQuickAddProduct(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700"
                >
                  إضافة الصنف للطلب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Vendor Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">{t.addVendor}</h3>
            <form onSubmit={handleAddVendor} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">{t.vendorName} *</label>
                <input
                  type="text"
                  required
                  value={vendorForm.name}
                  onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })}
                  placeholder="مثال: المراعي لتوزيع الألبان"
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">الهاتف *</label>
                  <input
                    type="tel"
                    required
                    value={vendorForm.phone}
                    onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={vendorForm.email}
                    onChange={e => setVendorForm({ ...vendorForm, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">{t.paymentTerms}</label>
                  <select
                    value={vendorForm.paymentTerms}
                    onChange={e => setVendorForm({ ...vendorForm, paymentTerms: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                  >
                    <option value="Cash on Delivery">الدفع عند الاستلام</option>
                    <option value="Net 15">صافي 15 يوماً</option>
                    <option value="Net 30">صافي 30 يوماً</option>
                    <option value="Net 60">صافي 60 يوماً</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block font-semibold text-slate-700">عنوان المصنع / المستودع</label>
                <input
                  type="text"
                  value={vendorForm.address}
                  onChange={e => setVendorForm({ ...vendorForm, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowVendorModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-98 transition-all"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vendor Return Modal (editable copy of a purchase order) */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div>
              <h3 className="text-base font-bold text-slate-900">{t.vendorReturnTitle}</h3>
              <p className="mt-0.5 text-[11px] text-slate-500">{t.vendorReturnSubtitle}</p>
            </div>

            <form onSubmit={handleVendorReturnSubmit} className="mt-4 space-y-4 text-xs">
              {/* PO selector */}
              <div>
                <label className="mb-1 block font-semibold text-slate-700">{t.selectPurchaseOrder}</label>
                <SearchableSelect
                  options={returnPoOptions}
                  value={returnPoId}
                  onChange={openReturnForPO}
                  placeholder={`— ${t.selectPurchaseOrder} —`}
                  noResultsText="لا توجد أوامر شراء قابلة للإرجاع"
                  aria-label={t.selectPurchaseOrder}
                />
                {returnablePOs.length === 0 && (
                  <p className="mt-1 text-[11px] text-amber-600">{t.noReturnablePO}</p>
                )}
              </div>

              {/* Editable copy of the PO */}
              {returnPoId && (
                <>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <FileText className="h-3.5 w-3.5 text-slate-400" />
                      {t.editablePOCopy}
                    </div>
                    <div className="divide-y divide-slate-100">
                      {returnLines.map((line, idx) => {
                        const original = purchases.find(p => p.id === returnPoId)?.items[idx]?.quantity ?? line.quantity;
                        return (
                          <div key={idx} className="flex flex-wrap items-center justify-between gap-2 py-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-800">{line.productName}</div>
                              <div className="text-[10px] text-slate-400">
                                {t.originalQty}: {original} {line.unit} · {line.unitCost.toFixed(2)} {t.currency}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div>
                                <input
                                  type="number"
                                  min={0}
                                  max={original}
                                  step={line.unit === 'Kg' || line.unit === 'Gram' || line.unit === 'Liter' ? 0.25 : 1}
                                  value={line.quantity}
                                  onChange={e => updateReturnLineQty(idx, parseFloat(e.target.value) || 0)}
                                  className="w-20 rounded-xl border border-slate-300 p-2 text-center font-bold text-slate-900"
                                  title={t.returnLineQty}
                                />
                              </div>
                              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-[10px] font-bold text-blue-700">
                                <input
                                  type="checkbox"
                                  checked={!!replaceFlags[idx]}
                                  onChange={() => toggleReplaceFlag(idx)}
                                  disabled={!line.quantity || line.quantity <= 0}
                                  className="h-3.5 w-3.5 accent-blue-600"
                                />
                                {t.replaceWithNew}
                              </label>
                              <span className="w-16 text-right font-mono font-bold text-slate-900 rtl:text-left">
                                {line.totalCost.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-black text-slate-900">
                      <span>{t.total}</span>
                      <span>{returnLines.reduce((s, l) => s + l.totalCost, 0).toFixed(2)} {t.currency}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    <RotateCcw className="mr-1 inline h-3 w-3 text-rose-400 rtl:ml-1" />
                    {t.creditedToVendor}: <b className="text-rose-600">-{returnLines.reduce((s, l) => s + l.totalCost, 0).toFixed(2)} {t.currency}</b>
                  </p>
                </>
              )}

              <div>
                <label className="mb-1 block font-semibold text-slate-700">السبب</label>
                <input
                  type="text"
                  required
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={!returnPoId || returnLines.every(l => l.quantity <= 0)}
                  className="rounded-xl bg-rose-600 px-5 py-2 font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t.confirmVendorReturn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vendor Detail Modal: Orders (with product lines) & Returns */}
      {viewVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {viewVendor.nameAr || viewVendor.name}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {viewVendor.phone} · {viewVendor.email} · {viewVendor.address}
                </p>
              </div>
              <button
                onClick={() => setViewVendor(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-lg bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                {t.paymentTerms}: {viewVendor.paymentTerms}
              </span>
              <span className="rounded-lg bg-rose-50 px-2 py-1 font-bold text-rose-700">
                {t.payableBalance}: {viewVendor.balance.toFixed(2)} {t.currency}
              </span>
            </div>

            {/* Purchase Orders with product lines */}
            <div className="mt-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                <PackageCheck className="h-4 w-4 text-blue-500" />
                {'أوامر الشراء'}
              </div>
              <div className="mt-2 space-y-2">
                {purchases.filter(p => p.vendorId === viewVendor.id).length === 0 && (
                  <div className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400">
                    {'لا توجد أوامر شراء لهذا المورد'}
                  </div>
                )}
                {purchases
                  .filter(p => p.vendorId === viewVendor.id)
                  .map(po => (
                    <div key={po.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-slate-800">{po.poNumber}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800">
                            {po.totalAmount.toFixed(2)} {t.currency}
                          </span>
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase ${po.status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-700'
                              : po.status === 'Received'
                                ? 'bg-blue-100 text-blue-700'
                                : po.status === 'Cancelled'
                                  ? 'bg-rose-100 text-rose-600'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                          >
                            {poStatusLabel(po.status)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 text-[10px] text-slate-400">
                        {new Date(po.createdDate).toLocaleDateString()}
                      </div>
                      <div className="mt-2 space-y-0.5 border-t border-slate-200/70 pt-1.5">
                        {po.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-[11px] text-slate-700">
                            <span>
                              {it.quantity}x {it.productName}
                              <span className="text-slate-400"> @ {it.unitCost.toFixed(2)}</span>
                            </span>
                            <span className="font-mono">{it.totalCost.toFixed(2)} {t.currency}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Vendor Payments (installments history) */}
            <div className="mt-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                <Wallet className="h-4 w-4 text-emerald-500" />
                {'سجل دفعات / أقساط المورد'}
              </div>
              <div className="mt-2 space-y-2">
                {(() => {
                  const vendorPays = purchases
                    .filter(p => p.vendorId === viewVendor.id && (p.payments?.length || 0) > 0)
                    .flatMap(p => (p.payments || []).map(pay => ({
                      pay,
                      poNumber: p.poNumber,
                      remaining: Math.max(0, p.totalAmount - (p.paidAmount || 0)),
                    })))
                    .sort((a, b) => (a.pay.date < b.pay.date ? 1 : -1));
                  if (vendorPays.length === 0) {
                    return (
                      <div className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400">
                        {'لا توجد دفعات مسجلة لهذا المورد بعد'}
                      </div>
                    );
                  }
                  return vendorPays.map(({ pay, poNumber }, idx) => (
                    <div key={idx} className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-800">
                          {poNumber} · {new Date(pay.date).toLocaleString()}
                        </span>
                        <span className="font-mono font-bold text-emerald-700">
                          {pay.amount.toFixed(2)} {t.currency}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-500">طريقة السداد: {({ 'Bank Transfer': 'تحويل بنكي', 'Bank Transfer ': 'تحويل بنكي', cash: 'نقدي', card: 'بطاقة' } as Record<string, string>)[pay.paymentMethod] || pay.paymentMethod}</div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Vendor Returns */}
            <div className="mt-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                <RotateCcw className="h-4 w-4 text-emerald-500" />
                {'المرتجعات للمورد'}
              </div>
              <div className="mt-2 space-y-2">
                {vendorReturns.filter(vr => vr.vendorId === viewVendor.id).length === 0 && (
                  <div className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400">
                    {'لا توجد مرتجعات لهذا المورد'}
                  </div>
                )}
                {vendorReturns
                  .filter(vr => vr.vendorId === viewVendor.id)
                  .map(vr => (
                    <div key={vr.id} className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-slate-800">{vr.returnNumber}</span>
                        <span className="font-mono font-bold text-emerald-700">
                          -{vr.totalAmount.toFixed(2)} {t.currency}
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] text-slate-400">
                        {new Date(vr.date).toLocaleDateString()} · {vr.reason}
                      </div>
                      <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-700">
                        {vr.items.map((it, idx) => (
                          <div key={idx}>
                            {it.quantity}x {it.productName}
                            {it.replacement && (
                              <span className="ml-1.5 rounded-md bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
                                {t.replaced}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
