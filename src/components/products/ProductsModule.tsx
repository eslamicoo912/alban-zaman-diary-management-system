import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, ProductUnit } from '../../types';
import { BulkUpdateModal } from './BulkUpdateModal';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  DollarSign, 
  Percent,
  Layers,
  Check,
  X,
  Sliders,
  Sparkles,
  ArrowUpDown,
  FilterX,
  PackageSearch,
  Save,
  RotateCcw
} from 'lucide-react';

export const ProductsModule: React.FC = () => {
  const { 
    t, 
    products, 
    addProduct, 
    updateProduct, 
    bulkUpdateProducts, 
    deleteProduct, 
    bulkDeleteProducts 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [scanHint, setScanHint] = useState<string | null>(null);

  // Barcode scanner on this page: catches scan keystrokes (typed while no text
  // field is focused) and drops them into the search input — unlike POS, it does
  // NOT add anything to the cart.
  useEffect(() => {
    let buffer = '';
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (typing) return;

      if (e.key === 'Enter') {
        if (buffer.length >= 4) {
          setSearchQuery(buffer);
          searchInputRef.current?.focus();
          setScanHint(`تم المسح: ${buffer}`
          );
          setTimeout(() => setScanHint(null), 2500);
        }
        buffer = '';
        if (timer) { clearTimeout(timer); timer = null; }
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        buffer += e.key;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { buffer = ''; }, 300);
      } else {
        buffer = '';
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPriceHistoryFor, setShowPriceHistoryFor] = useState<Product | null>(null);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk Update Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Global Inline Edit Mode Toggle & Row Drafts
  const [isInlineEditMode, setIsInlineEditMode] = useState(false);
  const [inlineDrafts, setInlineDrafts] = useState<Record<string, Partial<Product>>>({});
  const [activeEditingRowId, setActiveEditingRowId] = useState<string | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Form states for full Add/Edit modal
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    nameAr: '',
    sku: '',
    barcode: '',
    unit: 'Bottle',
    imageEmoji: '🥛',
    costPrice: 0,
    salePrice: 0,
    minSalePrice: 0,
    currentStock: 10,
    minStock: 5,
    expiryDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    batchNumber: `B-${new Date().getFullYear()}`,
    isActive: true,
    isPerishable: true,
  });

  const unitsList: ProductUnit[] = ['Bottle', 'Liter', 'Piece', 'Kg', 'Gram', 'Box', 'Carton'];

  // Form Profit & Margin live preview for modal
  const formProfit = Math.max(0, (formData.salePrice || 0) - (formData.costPrice || 0));
  const formMargin = formData.salePrice && formData.salePrice > 0 ? (formProfit / formData.salePrice) * 100 : 0;

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      nameAr: '',
      sku: `DRY-${Date.now().toString().slice(-4)}`,
      barcode: `628${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      unit: 'Bottle',
      imageEmoji: '🥛',
      costPrice: 5,
      salePrice: 8,
      minSalePrice: 7,
      currentStock: 25,
      minStock: 8,
      expiryDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
      batchNumber: `B-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}A`,
      isActive: true,
      isPerishable: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({ ...product });
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() && !formData.nameAr?.trim()) return;

    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        ...(formData as Product),
      });
      showToast('تم تحديث الصنف بنجاح');
    } else {
      const payload: Omit<Product, 'id'> = {
        ...(formData as Omit<Product, 'id'>),
        name: (formData.name || '').trim() || (formData.nameAr || '').trim(),
        nameAr: (formData.nameAr || '').trim(),
        sku: (formData.sku || '').trim() || `DRY-${Date.now().toString().slice(-4)}`,
        batchNumber: (formData.batchNumber || '').trim() || `B-${new Date().getFullYear()}`,
      };
      addProduct(payload);
      showToast('تمت إضافة الصنف بنجاح');
    }
    setIsModalOpen(false);
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const query = searchQuery.toLowerCase().trim();
      const matchQuery =
        !query ||
        p.name.toLowerCase().includes(query) ||
        (p.nameAr && p.nameAr.toLowerCase().includes(query)) ||
        p.sku.toLowerCase().includes(query) ||
        p.barcode.includes(query);

      let matchStock = true;
      if (stockFilter === 'low') matchStock = p.currentStock > 0 && p.currentStock <= p.minStock;
      if (stockFilter === 'out') matchStock = p.currentStock <= 0;

      return matchQuery && matchStock;
    });
  }, [products, searchQuery, stockFilter]);

  // Selected products array
  const selectedProducts = useMemo(() => {
    return products.filter(p => selectedIds.has(p.id));
  }, [products, selectedIds]);

  // Selection handlers
  const handleSelectAllFiltered = () => {
    if (selectedIds.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Inline editing helpers
  const handleInlineChange = (productId: string, field: keyof Product, value: any) => {
    setInlineDrafts(prev => {
      const currentDraft = prev[productId] || {};
      return {
        ...prev,
        [productId]: {
          ...currentDraft,
          [field]: value,
        },
      };
    });
  };

  const saveSingleRow = (product: Product) => {
    const draft = inlineDrafts[product.id];
    if (!draft) {
      setActiveEditingRowId(null);
      return;
    }

    const updated: Product = {
      ...product,
      ...draft,
      costPrice: Number(draft.costPrice ?? product.costPrice),
      salePrice: Number(draft.salePrice ?? product.salePrice),
      currentStock: Number(draft.currentStock ?? product.currentStock),
      minStock: Number(draft.minStock ?? product.minStock),
    };

    updateProduct(updated);
    setInlineDrafts(prev => {
      const next = { ...prev };
      delete next[product.id];
      return next;
    });
    setActiveEditingRowId(null);
    showToast('تم حفظ التعديلات');
  };

  const cancelSingleRow = (productId: string) => {
    setInlineDrafts(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    setActiveEditingRowId(null);
  };

  // Save all modified rows in bulk
  const hasUnsavedChanges = Object.keys(inlineDrafts).length > 0;

  const saveAllInlineChanges = () => {
    const updatedProducts: Product[] = [];
    Object.entries(inlineDrafts).forEach(([id, rawDraft]) => {
      const draft = rawDraft as Partial<Product>;
      const original = products.find(p => p.id === id);
      if (original) {
        updatedProducts.push({
          ...original,
          ...draft,
          costPrice: Number(draft.costPrice ?? original.costPrice),
          salePrice: Number(draft.salePrice ?? original.salePrice),
          currentStock: Number(draft.currentStock ?? original.currentStock),
          minStock: Number(draft.minStock ?? original.minStock),
        });
      }
    });

    if (updatedProducts.length > 0) {
      bulkUpdateProducts(updatedProducts);
      showToast(`تم حفظ تعديلات ${updatedProducts.length} صنف بنجاح`
      );
    }
    setInlineDrafts({});
    setIsInlineEditMode(false);
    setActiveEditingRowId(null);
  };

  const discardAllInlineChanges = () => {
    setInlineDrafts({});
    setIsInlineEditMode(false);
    setActiveEditingRowId(null);
  };

  // Bulk update apply handler
  const handleApplyBulkUpdates = (updates: Partial<Product>) => {
    const updatedList = selectedProducts.map(prod => ({
      ...prod,
      ...updates,
    }));
    bulkUpdateProducts(updatedList);
    showToast(`تم تحديث ${updatedList.length} صنف جماعياً`
    );
    setSelectedIds(new Set());
  };

  // Bulk Price Formula (e.g. +10% or fixed price)
  const handleApplyPriceFormula = (
    type: 'percent' | 'fixed',
    value: number,
    field: 'salePrice' | 'costPrice'
  ) => {
    const updatedList = selectedProducts.map(prod => {
      let newPrice = prod[field];
      if (type === 'percent') {
        newPrice = Math.max(0.01, prod[field] * (1 + value / 100));
        // Round to 2 decimals
        newPrice = Math.round(newPrice * 100) / 100;
      } else {
        newPrice = Math.max(0.01, value);
      }
      return {
        ...prod,
        [field]: newPrice,
      };
    });

    bulkUpdateProducts(updatedList);
    showToast(`تم تعديل أسعار ${updatedList.length} صنف بنجاح`
    );
    setSelectedIds(new Set());
  };

  // Bulk Delete
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const confirmText =`هل أنت متأكد من حذف ${selectedIds.size} صنف محدد نهائياً؟`;

    if (window.confirm(confirmText)) {
      bulkDeleteProducts(Array.from(selectedIds));
      showToast(`تم حذف ${selectedIds.size} صنف`
      );
      setSelectedIds(new Set());
    }
  };

  const allFilteredSelected =
    filteredProducts.length > 0 && selectedIds.size === filteredProducts.length;

  return (
    <div className="space-y-4">
      {/* Real-time Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-xl border border-blue-200 bg-white/95 px-4 py-2.5 text-xs font-semibold text-slate-800 shadow-xl backdrop-blur-xs transition-all rtl:right-auto rtl:left-6">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
            ✓
          </span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.productsTitle}</h2>
          <p className="text-xs text-slate-500">
            {products.length} {'أصناف غذائية مسجلة'} •{' '}
            {'تعديل سريع ومباشر'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle Inline Edit Mode */}
          <button
            onClick={() => setIsInlineEditMode(!isInlineEditMode)}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
              isInlineEditMode
                ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            title="تفعيل التعديل المباشر لكل الأسطر"
          >
            <Edit3 className="h-4 w-4" />
            <span>{isInlineEditMode ? t.cancelEditing || 'إنهاء التحرير المباشر' : t.inlineEditMode || 'وضع التحرير المباشر'}</span>
            {isInlineEditMode && (
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            )}
          </button>

          {/* Add Product Modal Trigger */}
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-98 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>{t.addProduct}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={t.searchProductPlaceholder}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-3 text-xs font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden rtl:pl-3 rtl:pr-9"
          />
          {scanHint && (
            <span className="pointer-events-none absolute left-3 top-full mt-1 rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300 rtl:left-auto rtl:right-3">
              {scanHint}
            </span>
          )}
        </div>

        <select
          value={stockFilter}
          onChange={e => setStockFilter(e.target.value as any)}
          className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-hidden"
        >
          <option value="all">{t.filterByStock}: {t.all}</option>
          <option value="low">{t.lowStockBadge}</option>
          <option value="out">{t.outOfStockBadge}</option>
        </select>

        {(searchQuery || stockFilter !== 'all') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setStockFilter('all');
            }}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            title="إعادة ضبط الفلاتر"
          >
            <FilterX className="h-3.5 w-3.5" />
            <span>{t.clearFilters || 'إعادة تعيين'}</span>
          </button>
        )}
      </div>

      {/* BULK SELECTION ACTION BAR (Appears when items are selected) */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-3 shadow-sm transition-all animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-600 text-xs font-black text-white">
              {selectedIds.size}
            </span>
            <div>
              <span className="text-xs font-bold text-blue-950">
                {selectedIds.size} {t.selectedItems || 'products selected'}
              </span>
              <span className="block text-[11px] text-blue-700 font-medium">
                {'يمكنك التعديل المباشر أو تطبيق تحديث شامل على الأصناف المحددة'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Activate inline editing for selected rows */}
            <button
              onClick={() => setIsInlineEditMode(true)}
              className="flex items-center gap-1.5 rounded-xl border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>{'تعديل المحدد بالجدول'}</span>
            </button>

            {/* Bulk Adjust Modal button */}
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>{t.bulkActions || 'تعديل جماعي'}</span>
            </button>

            {/* Bulk Delete */}
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{t.bulkDelete || 'حذف'}</span>
            </button>

            {/* Deselect All */}
            <button
              onClick={clearSelection}
              className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              {'إلغاء التحديد'}
            </button>
          </div>
        </div>
      )}

      {/* UNSAVED CHANGES STICKY BANNER */}
      {hasUnsavedChanges && (
        <div className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-300 bg-amber-50/95 p-3 shadow-md backdrop-blur-xs animate-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-white">
              !
            </span>
            <span className="text-xs font-bold text-amber-950">
              {Object.keys(inlineDrafts).length} {t.unsavedChanges || 'unsaved product modifications'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={discardAllInlineChanges}
              className="rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100/50"
            >
              <RotateCcw className="inline h-3.5 w-3.5 mr-1" />
              <span>{t.cancelEditing || 'تجاهل'}</span>
            </button>
            <button
              onClick={saveAllInlineChanges}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{t.saveAllChanges || 'حفظ جميع التغييرات'}</span>
            </button>
          </div>
        </div>
      )}

      {/* PRODUCTS TABLE / EMPTY STATE */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
            <PackageSearch className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {t.noDataAvailable || 'لا توجد منتجات'}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            {searchQuery || stockFilter !== 'all'
              ? t.noDataAvailableDesc || 'لا توجد منتجات مطابقة لشروط البحث والتصفية الحالية.'
              : 'Your product catalog is currently empty. Start by adding dairy goods.'}
          </p>
          <div className="mt-4 flex items-center gap-2">
            {(searchQuery || stockFilter !== 'all') ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStockFilter('all');
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                {t.clearFilters || 'مسح الفلاتر'}
              </button>
            ) : null}
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>{t.addProduct}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs rtl:text-right">
              <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600 select-none">
                <tr>
                  {/* Select All Checkbox Header */}
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={handleSelectAllFiltered}
                      className="h-4 w-4 rounded-md border-slate-300 accent-blue-600 cursor-pointer"
                      title={allFilteredSelected ? 'إلغاء تحديد الكل' : 'تحديد كل النتائج المفلترة'}
                    />
                  </th>
                  <th className="py-3 px-3">{t.productName}</th>
                  <th className="py-3 px-3">{t.sku} / {t.barcode}</th>
                  <th className="py-3 px-3">{t.unit}</th>
                  <th className="py-3 px-3 text-right rtl:text-left">{t.costPrice}</th>
                  <th className="py-3 px-3 text-right rtl:text-left">{t.salePrice}</th>
                  <th className="py-3 px-3 text-right rtl:text-left">{t.profit} / {t.margin}</th>
                  <th className="py-3 px-3 text-center">{t.stock}</th>
                  <th className="py-3 px-3">{t.expiryDate}</th>
                  <th className="py-3 px-3 text-center">{t.status}</th>
                  <th className="py-3 px-3 text-center">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map(p => {
                  const isSelected = selectedIds.has(p.id);
                  const isRowEditing = isInlineEditMode || activeEditingRowId === p.id;
                  const draft = inlineDrafts[p.id] || {};

                  // Current values (either draft or original)
                  const currentName = draft.name !== undefined ? draft.name : p.name;
                  const currentNameAr = draft.nameAr !== undefined ? draft.nameAr : (p.nameAr || '');
                  const currentCost = draft.costPrice !== undefined ? Number(draft.costPrice) : p.costPrice;
                  const currentSale = draft.salePrice !== undefined ? Number(draft.salePrice) : p.salePrice;
                  const currentStock = draft.currentStock !== undefined ? Number(draft.currentStock) : p.currentStock;
                  const currentUnit = (draft.unit || p.unit) as ProductUnit;
                  const currentExpiry = draft.expiryDate || p.expiryDate;
                  const currentActive = draft.isActive !== undefined ? draft.isActive : p.isActive;

                  const profit = currentSale - currentCost;
                  const margin = currentSale > 0 ? (profit / currentSale) * 100 : 0;
                  const isLow = currentStock <= p.minStock && currentStock > 0;
                  const isOut = currentStock <= 0;
                  const isDirty = Object.keys(draft).length > 0;

                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-blue-50/50 hover:bg-blue-50/80'
                          : isDirty
                          ? 'bg-amber-50/30 hover:bg-amber-50/50'
                          : isRowEditing
                          ? 'bg-slate-50/80'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(p.id)}
                          className="h-4 w-4 rounded-md border-slate-300 accent-blue-600 cursor-pointer"
                        />
                      </td>

                      {/* Product Name (Inline editable or static display) */}
                      <td className="py-3 px-3 font-semibold text-slate-900 min-w-[180px]">
                        {isRowEditing ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={currentName}
                              onChange={e => handleInlineChange(p.id, 'name', e.target.value)}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold focus:border-blue-500 focus:outline-hidden"
                              placeholder="اسم الصنف"
                            />
                            <input
                              type="text"
                              value={currentNameAr}
                              onChange={e => handleInlineChange(p.id, 'nameAr', e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600 focus:border-blue-500 focus:outline-hidden"
                              placeholder="الاسم بالعربي"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{p.imageEmoji || '🥛'}</span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span>{p.nameAr || p.name}</span>
                                {isDirty && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="تم التعديل" />
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-normal">
                                {t.batch}: {p.batchNumber}
                              </span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* SKU / Barcode */}
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                        <div>{p.sku}</div>
                        <div className="text-[10px] text-slate-400">{p.barcode}</div>
                      </td>

                      {/* Unit */}
                      <td className="py-3 px-3">
                        {isRowEditing ? (
                          <select
                            value={currentUnit}
                            onChange={e => handleInlineChange(p.id, 'unit', e.target.value)}
                            className="rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-[11px] font-medium"
                          >
                            {unitsList.map(u => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            {p.unit}
                          </span>
                        )}
                      </td>

                      {/* Cost Price */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600 rtl:text-left">
                        {isRowEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={currentCost}
                            onChange={e => handleInlineChange(p.id, 'costPrice', e.target.value)}
                            className="w-20 rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-right text-xs font-mono font-bold focus:border-blue-500 focus:outline-hidden rtl:text-left"
                          />
                        ) : (
                          p.costPrice.toFixed(2)
                        )}
                      </td>

                      {/* Sale Price */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 rtl:text-left">
                        {isRowEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            min="0.01"
                            value={currentSale}
                            onChange={e => handleInlineChange(p.id, 'salePrice', e.target.value)}
                            className="w-20 rounded-lg border border-blue-400 bg-white px-1.5 py-1 text-right text-xs font-mono font-bold text-blue-700 focus:border-blue-600 focus:outline-hidden rtl:text-left"
                          />
                        ) : (
                          p.salePrice.toFixed(2)
                        )}
                      </td>

                      {/* Profit & Margin */}
                      <td className="py-3 px-3 text-right font-mono rtl:text-left">
                        <div className="font-semibold text-emerald-600">
                          +{profit.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {margin.toFixed(1)}%
                        </div>
                      </td>

                      {/* Stock Quantity */}
                      <td className="py-3 px-3 text-center">
                        {isRowEditing ? (
                          <input
                            type="number"
                            step="1"
                            value={currentStock}
                            onChange={e => handleInlineChange(p.id, 'currentStock', e.target.value)}
                            className="w-16 rounded-lg border border-slate-300 bg-white px-1 py-1 text-center text-xs font-bold focus:border-blue-500 focus:outline-hidden"
                          />
                        ) : (
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                              isOut
                                ? 'bg-rose-100 text-rose-700'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-50 text-emerald-800'
                            }`}
                          >
                            {p.currentStock} {p.unit}
                          </span>
                        )}
                      </td>

                      {/* Expiry Date */}
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                        {isRowEditing ? (
                          <input
                            type="date"
                            value={currentExpiry}
                            onChange={e => handleInlineChange(p.id, 'expiryDate', e.target.value)}
                            className="rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-[11px] font-mono"
                          />
                        ) : (
                          p.expiryDate
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        {isRowEditing ? (
                          <input
                            type="checkbox"
                            checked={currentActive}
                            onChange={e => handleInlineChange(p.id, 'isActive', e.target.checked)}
                            className="h-4 w-4 rounded-md accent-blue-600 cursor-pointer"
                          />
                        ) : p.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                            <XCircle className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isRowEditing ? (
                            <>
                              <button
                                onClick={() => saveSingleRow(p)}
                                className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700 hover:bg-emerald-200 transition-colors"
                                title="حفظ هذا السطر"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => cancelSingleRow(p.id)}
                                className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200 transition-colors"
                                title="تجاهل تعديلات السطر"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Inline edit toggle for this row */}
                              <button
                                onClick={() => setActiveEditingRowId(p.id)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                title="تعديل مباشر"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              {/* Open full modal */}
                              <button
                                onClick={() => openEditModal(p)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                title="تعديل في نافذة"
                              >
                                <Sliders className="h-3.5 w-3.5" />
                              </button>
                              {/* Price history */}
                              <button
                                onClick={() => setShowPriceHistoryFor(p)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                                title={t.priceHistory}
                              >
                                <Clock className="h-3.5 w-3.5" />
                              </button>
                              {/* Delete */}
                              <button
                                onClick={() => {
                                  if (confirm('Delete this product?')) {
                                    deleteProduct(p.id);
                                    showToast('تم حذف الصنف');
                                  }
                                }}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                title="حذف"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">
              {editingProduct ? t.editProduct : t.addProduct}
            </h3>

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">{t.productNameAr} *</label>
                  <input
                    type="text"
                    value={formData.nameAr || formData.name || ''}
                    onChange={e => setFormData({ ...formData, nameAr: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5"
                    placeholder="مثال: حليب طازج كامل الدسم 1 لتر"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">{t.barcode} *</label>
                  <input
                    type="text"
                    required
                    value={formData.barcode || ''}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">{t.unit}</label>
                  <select
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value as ProductUnit })}
                    className="w-full rounded-xl border border-slate-200 p-2"
                  >
                    {unitsList.map(u => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">{t.expiryDate}</label>
                  <input
                    type="date"
                    value={formData.expiryDate || ''}
                    onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">{t.stock} ({formData.unit})</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.currentStock || 0}
                    onChange={e => setFormData({ ...formData, currentStock: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 p-2 font-bold"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">{t.minStock}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.minStock || 0}
                    onChange={e => setFormData({ ...formData, minStock: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 p-2"
                  />
                </div>
              </div>

              {/* Pricing, Profit & Margin Calculation */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                <div className="mb-2 font-bold text-blue-950">
                  {'التسعير وحساب الربحية والهامش'}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">{t.costPrice} ({t.currency})</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formData.costPrice || 0}
                      onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2 font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">{t.salePrice} ({t.currency})</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formData.salePrice || 0}
                      onChange={e => setFormData({ ...formData, salePrice: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2 font-bold text-blue-600"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">{t.minSalePrice}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.minSalePrice || 0}
                      onChange={e => setFormData({ ...formData, minSalePrice: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-slate-300 bg-white p-2 font-mono"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-blue-200 pt-2 text-xs">
                  <div>
                    <span className="text-slate-600">{t.profit}: </span>
                    <span className="font-extrabold text-blue-700">{formProfit.toFixed(2)} {t.currency}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">{t.margin}: </span>
                    <span className="font-extrabold text-blue-800">{formMargin.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>{t.active}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.isPerishable}
                    onChange={e => setFormData({ ...formData, isPerishable: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>{t.perishable}</span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700"
                >
                  {t.saveProduct}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      <BulkUpdateModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        selectedProducts={selectedProducts}
        onApply={handleApplyBulkUpdates}
        onApplyPriceFormula={handleApplyPriceFormula}
      />

      {/* Price History Modal */}
      {showPriceHistoryFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">{t.priceHistory}</h3>
              <button
                onClick={() => setShowPriceHistoryFor(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 text-sm font-bold text-slate-800">
              {showPriceHistoryFor.nameAr || showPriceHistoryFor.name}
            </div>
            <div className="mb-4 flex gap-4 text-[11px] text-slate-500">
              <span>{t.salePrice}: <b className="text-slate-700">{showPriceHistoryFor.salePrice.toFixed(2)} {t.currency}</b></span>
              <span>{t.costPrice}: <b className="text-slate-700">{showPriceHistoryFor.costPrice.toFixed(2)} {t.currency}</b></span>
            </div>

            {(showPriceHistoryFor.priceHistory || []).length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-400">
                {t.noPriceHistory}
              </div>
            ) : (
              <div className="space-y-2">
                {(showPriceHistoryFor.priceHistory || [])
                  .slice()
                  .reverse()
                  .map((h, i) => (
                    <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="font-semibold capitalize">
                          {'سعر البيع'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(h.changedAt).toLocaleString('ar-EG')}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between font-mono">
                        <span className="text-slate-500">{h.fromSalePrice.toFixed(2)} {t.currency}</span>
                        <ArrowUpDown className="h-3.5 w-3.5 rotate-90 text-amber-500" />
                        <span className="font-bold text-slate-800">{h.toSalePrice.toFixed(2)} {t.currency}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-slate-200/70 pt-1.5 text-[10px] text-slate-400">
                        <span>{'التكلفة'}: {h.fromCostPrice.toFixed(2)} → {h.toCostPrice.toFixed(2)}</span>
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
