import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Keyboard,
  Search,
  X,
  Pin,
  PinOff,
  ShoppingCart,
  LayoutDashboard,
  Bell,
  Package,
  Boxes,
  RotateCcw,
  Gift,
  Truck,
  Users,
  DollarSign,
  Globe,
  Printer,
  ScanBarcode,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  Bookmark,
  ExternalLink,
  Info
} from 'lucide-react';

export interface ShortcutItem {
  id: string;
  keys: string[];
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  category: 'pos' | 'navigation' | 'system';
  targetTab?: string;
  actionCode?: string;
  isContextActive?: boolean;
}

interface ShortcutManagerOverlayProps {
  isOpen: boolean;
  isPinned: boolean;
  isCtrlHeld: boolean;
  onClose: () => void;
  onTogglePin: () => void;
  currentTab: string;
  onNavigate: (tab: any) => void;
}

export const ShortcutManagerOverlay: React.FC<ShortcutManagerOverlayProps> = ({
  isOpen,
  isPinned,
  isCtrlHeld,
  onClose,
  onTogglePin,
  currentTab,
  onNavigate,
}) => {
  const { t } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'pos' | 'navigation' | 'system'>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input if pinned or opened manually
  useEffect(() => {
    if (isOpen && isPinned) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isPinned]);

  // All application shortcuts definitions
  const shortcuts: ShortcutItem[] = useMemo(() => [
    // --- POS SCREEN SHORTCUTS ---
    {
      id: 'pos-search',
      keys: ['F2', 'Ctrl', 'K'],
      titleEn: 'Focus Search / Barcode',
      titleAr: 'التركيز على بحث الصنف / الباركود',
      descriptionEn: 'Quickly focus on the POS product search input for instant scanning or typing',
      descriptionAr: 'الانتقال المباشر إلى خانة البحث أو مسح الباركود دون استخدام الفأرة',
      category: 'pos',
      targetTab: 'pos',
      isContextActive: currentTab === 'pos',
    },
    {
      id: 'pos-quick-save',
      keys: ['F1'],
      titleEn: 'Quick Save Sale (No Print)',
      titleAr: 'حفظ البيع السريع (بدون طباعة)',
      descriptionEn: 'Complete the checkout instantly as cash without opening a printable invoice',
      descriptionAr: 'إتمام البيع فوراً كدفع نقدي وحفظه دون فتح فاتورة قابلة للطباعة',
      category: 'pos',
      targetTab: 'pos',
      isContextActive: currentTab === 'pos',
    },
    {
      id: 'pos-checkout',
      keys: ['F4', 'Ctrl', '↵ Enter'],
      titleEn: 'Pay & Complete Sale (Printable)',
      titleAr: 'سداد وإتمام الفاتورة (للطباعة)',
      descriptionEn: 'Open cashier payment modal, then save and show the printable thermal invoice',
      descriptionAr: 'فتح نافذة الدفع، ثم حفظ الفاتورة وإظهارها للطباعة الفورية',
      category: 'pos',
      targetTab: 'pos',
      isContextActive: currentTab === 'pos',
    },
    {
      id: 'pos-hold',
      keys: ['F8'],
      titleEn: 'Hold Active Cart',
      titleAr: 'تعليق السلة الحالية',
      descriptionEn: 'Park the current basket to serve another customer and recall it anytime',
      descriptionAr: 'حفظ سلة العميل الحالية مؤقتاً لخدمة عميل آخر واسترجاعها لاحقاً',
      category: 'pos',
      targetTab: 'pos',
      isContextActive: currentTab === 'pos',
    },
    {
      id: 'pos-held-orders',
      keys: ['Ctrl', 'H'],
      titleEn: 'View Suspended Carts',
      titleAr: 'عرض السلات المعلقة',
      descriptionEn: 'Open drawer with all parked baskets and resume customer transactions',
      descriptionAr: 'فتح قائمة الفواتير المعلقة واسترجاع أي طلب بنقرة واحدة',
      category: 'pos',
      targetTab: 'pos',
      isContextActive: currentTab === 'pos',
    },
    {
      id: 'pos-scanner-config',
      keys: ['Ctrl', 'B'],
      titleEn: 'Hardware Scanner Config',
      titleAr: 'إعدادات قارئ الباركود',
      descriptionEn: 'Configure USB laser sensitivity, continuous camera scanning, or sound feedback',
      descriptionAr: 'ضبط حساسية الليزر والماسح اللاسلكي أو تفعيل كاميرا الهاتف',
      category: 'pos',
      targetTab: 'pos',
      isContextActive: currentTab === 'pos',
    },
    {
      id: 'pos-add-customer',
      keys: ['Ctrl', 'U'],
      titleEn: 'Quick Add Customer',
      titleAr: 'إضافة عميل ولاء جديد',
      descriptionEn: 'Register customer phone and name to earn loyalty points on this ticket',
      descriptionAr: 'تسجيل اسم وهاتف العميل السريع لمنحه نقاط الولاء والمكافآت',
      category: 'pos',
      targetTab: 'pos',
      isContextActive: currentTab === 'pos',
    },
    {
      id: 'pos-barcode-hardware',
      keys: ['Scanner', '↵ Enter'],
      titleEn: 'Always-On Laser Scanning',
      titleAr: 'مسح الباركود الفوري المتواصل',
      descriptionEn: 'Aim and pull trigger on any dairy barcode anywhere on POS to instantly add to cart',
      descriptionAr: 'التقاط باركود أي منتج ألبان مباشرة دون الحاجة للضغط على أي حقل',
      category: 'pos',
      targetTab: 'pos',
      isContextActive: currentTab === 'pos',
    },

    // --- NAVIGATION SHORTCUTS ---
    {
      id: 'nav-pos',
      keys: ['Ctrl', '1', 'F2'],
      titleEn: 'POS Terminal Cashier',
      titleAr: 'شاشة الكاشير ونقطة البيع',
      descriptionEn: 'Return directly to active sales register',
      descriptionAr: 'العودة الفورية لشاشة الكاشير وتسجيل المبيعات',
      category: 'navigation',
      targetTab: 'pos',
      isContextActive: currentTab === 'pos',
    },
    {
      id: 'nav-dashboard',
      keys: ['Ctrl', '2'],
      titleEn: 'Executive Dashboard',
      titleAr: 'لوحة التحكم والتحليلات',
      descriptionEn: 'Live profit vs sales chart, dairy KPIs, and top items',
      descriptionAr: 'رسم بياني مباشر للأرباح والمبيعات ومؤشرات الأداء',
      category: 'navigation',
      targetTab: 'dashboard',
      isContextActive: currentTab === 'dashboard',
    },
    {
      id: 'nav-alerts',
      keys: ['Ctrl', '3'],
      titleEn: 'Alerts & Due Dates',
      titleAr: 'مركز التنبيهات والمواعيد',
      descriptionEn: 'Fresh dairy shelf-life countdowns, payroll dues, and supplier balances',
      descriptionAr: 'متابعة تواريخ انتهاء الألبان ومستحقات الرواتب والموردين',
      category: 'navigation',
      targetTab: 'alerts',
      isContextActive: currentTab === 'alerts',
    },
    {
      id: 'nav-products',
      keys: ['Ctrl', '4'],
      titleEn: 'Products Catalog',
      titleAr: 'كتالوج المنتجات والأصناف',
      descriptionEn: 'Browse, edit prices, batches, and barcodes',
      descriptionAr: 'إدارة وتعديل أسعار الألبان والأجبان وتواريخ الصلاحية',
      category: 'navigation',
      targetTab: 'products',
      isContextActive: currentTab === 'products',
    },
    {
      id: 'nav-inventory',
      keys: ['Ctrl', '5'],
      titleEn: 'Inventory Movements',
      titleAr: 'حركات المخزون والتحويلات',
      descriptionEn: 'Audit stock-in, stock-out, and multi-branch inventory transfers',
      descriptionAr: 'سجل حركات التوريد والصرف والتحويل بين فروع المعمل',
      category: 'navigation',
      targetTab: 'inventory',
      isContextActive: currentTab === 'inventory',
    },
    {
      id: 'nav-returns',
      keys: ['Ctrl', '6'],
      titleEn: 'Returns & Spoilage',
      titleAr: 'المرتجعات وإتلاف الهوالك',
      descriptionEn: 'Customer return receipts and expired dairy write-off logging',
      descriptionAr: 'تسجيل مرتجعات العملاء وإعدام الألبان منتهية الصلاحية',
      category: 'navigation',
      targetTab: 'returns',
      isContextActive: currentTab === 'returns',
    },
    {
      id: 'nav-loyalty',
      keys: ['Ctrl', '7'],
      titleEn: 'Customer Loyalty & Points',
      titleAr: 'برنامج الولاء والعملاء',
      descriptionEn: 'Customer rewards, discount tier credits, and points balance',
      descriptionAr: 'أرصدة نقاط العملاء ومكافآت التخفيض الفورية',
      category: 'navigation',
      targetTab: 'loyalty',
      isContextActive: currentTab === 'loyalty',
    },
    {
      id: 'nav-purchases',
      keys: ['Ctrl', '8'],
      titleEn: 'Purchases & Vendors',
      titleAr: 'المشتريات وفواتير الموردين',
      descriptionEn: 'Raw milk procurement, packaging orders, and supplier ledgers',
      descriptionAr: 'أوامر توريد الحليب الخام وعبوات التعبئة ومستحقات المزارع',
      category: 'navigation',
      targetTab: 'purchases',
      isContextActive: currentTab === 'purchases',
    },
    {
      id: 'nav-employees',
      keys: ['Ctrl', '9', 'F3'],
      titleEn: 'Staff, Shifts & Payroll',
      titleAr: 'الموظفين، الورديات والرواتب',
      descriptionEn: 'Active shift reconciliation, staff attendance, and salary slips',
      descriptionAr: 'إغلاق وردية الكاشير، الحضور والانصراف، ومسير الرواتب',
      category: 'navigation',
      targetTab: 'employees',
      isContextActive: currentTab === 'employees',
    },
    {
      id: 'nav-finance',
      keys: ['Ctrl', '0'],
      titleEn: 'Finance & Day-End Close',
      titleAr: 'المالية وتقفيل اليومية',
      descriptionEn: 'Z-Report day closing, cash drawer reconciliation, and P&L statements',
      descriptionAr: 'تقرير تقفيل اليومية Z-Report ومطابقة عهدة الصندوق النقدية',
      category: 'navigation',
      targetTab: 'finance',
      isContextActive: currentTab === 'finance',
    },

    // --- SYSTEM & GLOBAL SHORTCUTS ---
    {
      id: 'sys-hold-ctrl',
      keys: ['Hold Ctrl'],
      titleEn: 'Show Shortcut Manager Overlay',
      titleAr: 'إظهار دليل اختصارات الكيبورد',
      descriptionEn: 'Hold down the Ctrl key anywhere to reveal this interactive cheat sheet HUD',
      descriptionAr: 'الضغط المطول على زر Ctrl في أي شاشة لإظهار هذه اللوحة التفاعلية',
      category: 'system',
    },
    {
      id: 'sys-print',
      keys: ['Ctrl', 'P'],
      titleEn: 'Print Receipt / Report',
      titleAr: 'طباعة الإيصال أو التقرير',
      descriptionEn: 'Instant thermal 80mm receipt printing or PDF export',
      descriptionAr: 'أمر الطباعة المباشر لطابعة الإيصالات الحرارية أو ملف PDF',
      category: 'system',
    },
    {
      id: 'sys-escape',
      keys: ['Esc'],
      titleEn: 'Close Modal / Cancel Action',
      titleAr: 'إلغاء الأمر / إغلاق النافذة',
      descriptionEn: 'Dismiss active dialogs, close overlays, or unpin this cheat sheet',
      descriptionAr: 'إغلاق النوافذ المنبثقة الحالية أو إلغاء تثبيت هذه اللوحة',
      category: 'system',
    },
  ], [currentTab]);

  // Filter shortcuts based on category and query
  const filteredShortcuts = useMemo(() => {
    return shortcuts.filter(s => {
      const matchCat = selectedCategory === 'all' || s.category === selectedCategory;
      if (!matchCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      return (
        s.titleEn.toLowerCase().includes(q) ||
        s.titleAr.toLowerCase().includes(q) ||
        s.descriptionEn.toLowerCase().includes(q) ||
        s.descriptionAr.toLowerCase().includes(q) ||
        s.keys.some(k => k.toLowerCase().includes(q))
      );
    });
  }, [shortcuts, selectedCategory, searchQuery]);

  // Handle shortcut click execution
  const handleExecuteShortcut = (s: ShortcutItem) => {
    if (s.targetTab) {
      onNavigate(s.targetTab);
      if (!isPinned) {
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md bg-slate-950/75 animate-in fade-in duration-150 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isCtrlHeld) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-700/80 bg-slate-900/95 text-slate-100 shadow-2xl shadow-black/80 overflow-hidden ring-1 ring-white/10"
        dir={'rtl'}
      >
        {/* Top Header with HUD Pulse */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide text-white">
                  {'مدير اختصارات لوحة المفاتيح'}
                </h2>
                {isCtrlHeld && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[11px] font-bold text-amber-300 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <span>{'مفتاح Ctrl مضغوط'}</span>
                  </span>
                )}
                {isPinned && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 border border-blue-500/40 px-2 py-0.5 text-[11px] font-bold text-blue-300">
                    <Pin className="h-2.5 w-2.5" />
                    <span>{'مثبت على الشاشة'}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {'دليل سريع لجميع الأوامر السريعة لنقاط البيع وإدارة ألبان زمان (اترك زر Ctrl للإغلاق)'}
              </p>
            </div>
          </div>

          {/* Action Tools: Pin open & Close */}
          <div className="flex items-center gap-2">
            <button
              onClick={onTogglePin}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
                isPinned
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
              title={'تثبيت اللوحة لتظل مفتوحة'}
            >
              {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              <span>{isPinned ? ('إلغاء التثبيت') : ('تثبيت اللوحة')}</span>
            </button>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
              title={'إغلاق (Esc)'}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-900/80 px-6 py-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {'الكل'} ({shortcuts.length})
            </button>
            <button
              onClick={() => setSelectedCategory('pos')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === 'pos'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>{'الكاشير والمبيعات'}</span>
            </button>
            <button
              onClick={() => setSelectedCategory('navigation')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === 'navigation'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>{'التنقل بين الأقسام'}</span>
            </button>
            <button
              onClick={() => setSelectedCategory('system')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === 'system'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>{'النظام والأدوات'}</span>
            </button>
          </div>

          {/* Quick Search Box */}
          <div className="relative min-w-[200px] sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 rtl:left-auto rtl:right-3" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={'ابحث عن اختصار أو زر...'}
              className="h-8 w-full rounded-xl border border-slate-700/80 bg-slate-950/90 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-hidden rtl:pr-8 rtl:pl-3"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs rtl:right-auto rtl:left-2.5"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Shortcuts Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredShortcuts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <Search className="h-10 w-10 text-slate-600 mb-2" />
              <p className="font-bold text-sm text-slate-300">
                {'لا توجد اختصارات تطابق بحثك'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {'جرب البحث عن "F4", "بحث", "كاشير", "دفع"'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredShortcuts.map((s) => {
                const isNavigable = Boolean(s.targetTab || s.actionCode);
                return (
                  <div
                    key={s.id}
                    onClick={() => handleExecuteShortcut(s)}
                    className={`group relative flex items-start justify-between gap-3 rounded-2xl border p-3.5 transition-all ${
                      s.isContextActive
                        ? 'border-blue-500/60 bg-blue-950/20 hover:bg-blue-950/30'
                        : 'border-slate-800/90 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-800/40'
                    } ${isNavigable ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-100 group-hover:text-blue-400 transition-colors">
                          {s.titleAr}
                        </span>
                        {s.isContextActive && (
                          <span className="rounded-md bg-blue-500/20 border border-blue-500/30 px-1.5 py-0.5 text-[9px] font-extrabold text-blue-300 uppercase">
                            {'الشاشة الحالية'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {s.descriptionAr}
                      </p>
                    </div>

                    {/* Key Combination Badges (Styled as Physical Keyboard Keycaps) */}
                    <div className="flex items-center gap-1.5 shrink-0 self-center">
                      {s.keys.map((key, kIdx) => (
                        <React.Fragment key={kIdx}>
                          <kbd className="inline-flex min-w-[28px] h-7 items-center justify-center rounded-lg border border-slate-600 bg-linear-to-b from-slate-700 to-slate-800 px-2 text-[11px] font-mono font-black text-slate-100 shadow-xs shadow-black/60 ring-1 ring-white/10 group-hover:border-blue-400 group-hover:text-white transition-colors">
                            {key}
                          </kbd>
                          {kIdx < s.keys.length - 1 && (
                            <span className="text-slate-500 text-[10px] font-bold">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    {isNavigable && (
                      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 rtl:right-auto rtl:left-2">
                        <ExternalLink className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer HUD Bar with Pro-Tips */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/80 px-6 py-3.5 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-400 shrink-0" />
            <span>
              {'نصيحة للمحترفين: يمكنك النقر مباشرة على أي اختصار لتنفيذه فورياً أو الضغط على مفتاح Esc للإغلاق.'}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-slate-500">{'الحالة:'}</span>
            {isCtrlHeld ? (
              <span className="text-amber-400 font-bold animate-pulse">
                {'اضغط باستمرار على [Ctrl]'}
              </span>
            ) : isPinned ? (
              <span className="text-blue-400 font-bold">
                {'مثبت (انقر Esc أو إلغاء التثبيت)'}
              </span>
            ) : (
              <span className="text-emerald-400 font-bold">
                {'جاهز للاستماع'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
