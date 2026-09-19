import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { POSScreen } from './components/pos/POSScreen';
import { Dashboard } from './components/dashboard/Dashboard';
import { ProductsModule } from './components/products/ProductsModule';
import { InventoryModule } from './components/inventory/InventoryModule';
import { ReturnsModule } from './components/returns/ReturnsModule';
import { LoyaltyModule } from './components/loyalty/LoyaltyModule';
import { PurchasesModule } from './components/purchases/PurchasesModule';
import { EmployeesModule } from './components/employees/EmployeesModule';
import { OrdersModule } from './components/orders/OrdersModule';
import { FinanceModule } from './components/finance/FinanceModule';
import { BranchesModule } from './components/branches/BranchesModule';
import { ReportsModule } from './components/reports/ReportsModule';
import { AlertsModule } from './components/alerts/AlertsModule';
import { SettingsModule } from './components/settings/SettingsModule';
import { UsersModule } from './components/users/UsersModule';
import { LoginScreen } from './components/auth/LoginScreen';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { EmptyStatePage } from './components/common/EmptyStatePage';
import { canAccessTab, CASHIER_ALLOWED_TABS } from './permissions';
import { 
  ShoppingBag, 
  LayoutDashboard, 
  Package, 
  Layers, 
  DollarSign, 
  BarChart3, 
  MoreHorizontal,
  ReceiptText,
  RotateCcw,
  Gift,
  Truck,
  Users,
  Building2,
  Bell
} from 'lucide-react';

type NavTab = 
  | 'pos'
  | 'dashboard'
  | 'alerts'
  | 'products'
  | 'inventory'
  | 'returns'
  | 'loyalty'
  | 'purchases'
  | 'employees'
  | 'orders'
  | 'finance'
  | 'branches'
  | 'reports'
  | 'settings'
  | 'users';

const ALL_TABS: NavTab[] = [
  'pos',
  'dashboard',
  'alerts',
  'products',
  'inventory',
  'returns',
  'loyalty',
  'purchases',
  'employees',
  'orders',
  'finance',
  'branches',
  'reports',
  'settings',
  'users',
];

const parseTabFromHash = (): NavTab => {
  const h = window.location.hash.replace(/^#\/?/, '');
  return (ALL_TABS as readonly string[]).includes(h) ? (h as NavTab) : 'pos';
};

const MainShell: React.FC = () => {
  const { t, currentUser } = useApp();
  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    const h = parseTabFromHash();
    return canAccessTab(h, currentUser?.role) ? (h as NavTab) : 'pos';
  });
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isCtrlHeld, setIsCtrlHeld] = useState(false);
  const [isShortcutsPinned, setIsShortcutsPinned] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  // Navigate only to tabs the current user is allowed to open.
  const navigate = (tab: string) => {
    setCurrentTab(canAccessTab(tab, currentUser?.role) ? (tab as NavTab) : 'pos');
  };

  // Keep a unique URL path in the address bar for every page (e.g. /#/products).
  useEffect(() => {
    const want = `#/${currentTab}`;
    if (window.location.hash !== want) {
      window.history.replaceState(null, '', want);
    }
    window.scrollTo(0, 0);
  }, [currentTab]);

  // Support browser back/forward and manually-typed URLs.
  useEffect(() => {
    const onHashChange = () => {
      const wanted = parseTabFromHash();
      setCurrentTab(prev => {
        if (!canAccessTab(wanted, currentUser?.role)) return 'pos';
        return prev === wanted ? prev : wanted;
      });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [currentUser]);

  // Global Keyboard Shortcuts Listener & Ctrl Hold Detector
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl?.getAttribute('contenteditable') === 'true';

      // 1. Detect holding down the 'Ctrl' (or Command on Mac) key
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlHeld(true);
      }

      // 2. Escape dismisses pinned shortcut manager
      if (e.key === 'Escape') {
        setIsCtrlHeld(false);
        setIsShortcutsPinned(false);
      }

      // 3. Toggle pinned shortcuts overlay with '?' or Ctrl + /
      if ((e.key === '?' && !isInput) || (e.ctrlKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsPinned(prev => !prev);
      }

      // 4. Function keys navigation
      // F1 is reserved for "quick save without printable invoice" while on the POS tab.
      if (e.key === 'F1') {
        e.preventDefault();
        if (currentTab !== 'pos') {
          navigate('dashboard');
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        navigate('pos');
      } else if (e.key === 'F3') {
        e.preventDefault();
        navigate('employees');
      }

      // 5. Global Ctrl + Number Shortcuts (Navigation)
      if (e.ctrlKey && !e.altKey && !e.shiftKey) {
        if (e.key === '1') {
          e.preventDefault();
          navigate('pos');
        } else if (e.key === '2') {
          e.preventDefault();
          navigate('dashboard');
        } else if (e.key === '3') {
          e.preventDefault();
          navigate('alerts');
        } else if (e.key === '4') {
          e.preventDefault();
          navigate('products');
        } else if (e.key === '5') {
          e.preventDefault();
          navigate('inventory');
        } else if (e.key === '6') {
          e.preventDefault();
          navigate('returns');
        } else if (e.key === '7') {
          e.preventDefault();
          navigate('loyalty');
        } else if (e.key === '8') {
          e.preventDefault();
          navigate('purchases');
        } else if (e.key === '9') {
          e.preventDefault();
          navigate('employees');
        } else if (e.key === '0') {
          e.preventDefault();
          navigate('finance');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // When Ctrl or Meta is released, hide the non-pinned overlay
      if (e.key === 'Control' || e.key === 'Meta' || !e.ctrlKey) {
        setIsCtrlHeld(false);
      }
    };

    const handleWindowBlur = () => {
      setIsCtrlHeld(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [currentTab, currentUser]);

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 font-sans flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Header Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={navigate}
        onToggleShortcuts={() => setIsShortcutsPinned(prev => !prev)}
        isShortcutsOpen={isCtrlHeld || isShortcutsPinned}
      />

      {/* Main Container */}
      <main className="mx-auto max-w-[1720px] w-full flex-1 p-3 sm:p-4 pb-20 xl:pb-4">
        <ErrorBoundary onReset={() => navigate('pos')}>
          {currentTab === 'pos' && <POSScreen />}
          {currentTab === 'dashboard' && <Dashboard onNavigate={navigate} />}
          {currentTab === 'alerts' && <AlertsModule onNavigate={navigate} />}
          {currentTab === 'products' && <ProductsModule />}
          {currentTab === 'inventory' && <InventoryModule />}
          {currentTab === 'returns' && <ReturnsModule />}
          {currentTab === 'loyalty' && <LoyaltyModule />}
          {currentTab === 'purchases' && <PurchasesModule />}
          {currentTab === 'employees' && <EmployeesModule />}
          {currentTab === 'orders' && <OrdersModule />}
          {currentTab === 'finance' && <FinanceModule />}
          {currentTab === 'branches' && <BranchesModule />}
          {currentTab === 'reports' && <ReportsModule />}
          {currentTab === 'settings' && <SettingsModule />}
          {currentTab === 'users' && <UsersModule />}
          {![
            ...ALL_TABS,
          ].includes(currentTab) && (
            <EmptyStatePage
              type="not-found"
              actionLabel={t.pos}
              onAction={() => navigate('pos')}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Sleek Terminal Status Footer (Desktop) */}
      <footer className="hidden xl:flex bg-slate-800 text-slate-400 py-2 px-6 items-center justify-between text-[10px] font-medium tracking-widest uppercase border-t border-slate-700">
        <div className="flex items-center space-x-6 rtl:space-x-reverse">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-200">نقطة البيع 01 (مفتوحة)</span>
          </div>
          <span>ألبان زمان v1.0.4</span>
        </div>
        <div className="flex items-center space-x-6 rtl:space-x-reverse font-mono text-[11px]">
          <span className="hover:text-slate-200 cursor-pointer" onClick={() => navigate('dashboard')}>[F1] Dashboard / Quick Save (POS)</span>
          <span className="hover:text-slate-200 cursor-pointer" onClick={() => navigate('pos')}>[F2] POS Register</span>
          {isAdmin && (
            <span className="hover:text-slate-200 cursor-pointer" onClick={() => navigate('employees')}>[F3] Shifts & طاقم العمل</span>
          )}
          <span className="text-blue-400">[F4] Checkout + Print</span>
          <span>[F8] Hold Cart</span>
        </div>
      </footer>

      {/* Mobile/Tablet Bottom Navigation Bar (Visible on screens < md) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200/90 bg-white/95 py-2 px-2 backdrop-blur-md md:hidden">
        <div className="relative group">
          <button
            onClick={() => navigate('pos')}
            title={`${t.pos} — POS Terminal`}
            aria-label={t.pos}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              currentTab === 'pos' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1 rounded-xl ${currentTab === 'pos' ? 'bg-blue-50' : ''}`}>
              <ShoppingBag className="h-5 w-5" />
            </div>
            <span>{t.pos}</span>
          </button>
          <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white shadow-md">
              {t.pos}
            </div>
            <div className="h-1.5 w-1.5 rotate-45 bg-slate-900 -mt-0.5" />
          </div>
        </div>

        <div className="relative group">
          <button
            onClick={() => navigate('dashboard')}
            title={`${t.dashboard} — Overview & KPIs`}
            aria-label={t.dashboard}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              currentTab === 'dashboard' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1 rounded-xl ${currentTab === 'dashboard' ? 'bg-blue-50' : ''}`}>
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <span>{t.dashboard}</span>
          </button>
          <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white shadow-md">
              {t.dashboard}
            </div>
            <div className="h-1.5 w-1.5 rotate-45 bg-slate-900 -mt-0.5" />
          </div>
        </div>

        <div className="relative group">
          <button
            onClick={() => navigate('products')}
            title={`${t.products} — Dairy Catalog`}
            aria-label={t.products}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              currentTab === 'products' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1 rounded-xl ${currentTab === 'products' ? 'bg-blue-50' : ''}`}>
              <Package className="h-5 w-5" />
            </div>
            <span>{t.products}</span>
          </button>
          <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white shadow-md">
              {t.products}
            </div>
            <div className="h-1.5 w-1.5 rotate-45 bg-slate-900 -mt-0.5" />
          </div>
        </div>

        <div className="relative group">
          <button
            onClick={() => navigate('inventory')}
            title={`${t.inventory} — Stock & Expiry`}
            aria-label={t.inventory}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              currentTab === 'inventory' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1 rounded-xl ${currentTab === 'inventory' ? 'bg-blue-50' : ''}`}>
              <Layers className="h-5 w-5" />
            </div>
            <span>{t.inventory}</span>
          </button>
          <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white shadow-md">
              {t.inventory}
            </div>
            <div className="h-1.5 w-1.5 rotate-45 bg-slate-900 -mt-0.5" />
          </div>
        </div>

        {isAdmin && (
        <div className="relative group">
          <button
            onClick={() => navigate('reports')}
            title={`${t.reports} — Reports & Analytics`}
            aria-label={t.reports}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              currentTab === 'reports' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1 rounded-xl ${currentTab === 'reports' ? 'bg-blue-50' : ''}`}>
              <BarChart3 className="h-5 w-5" />
            </div>
            <span>{t.reports}</span>
          </button>
          <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white shadow-md">
              {t.reports}
            </div>
            <div className="h-1.5 w-1.5 rotate-45 bg-slate-900 -mt-0.5" />
          </div>
        </div>
        )}

        {/* More Options Drawer Trigger */}
        <div className="relative group">
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            title="الوحدات الإضافية والإعدادات"
            aria-label="المزيد من الوحدات"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              showMoreMenu ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className={`p-1 rounded-xl ${showMoreMenu ? 'bg-blue-50' : ''}`}>
              <MoreHorizontal className="h-5 w-5" />
            </div>
            <span>{t.viewAll}</span>
          </button>

          {/* Quick Popover Menu */}
          {showMoreMenu && (
            <div className="absolute bottom-14 right-0 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                {'الوحدات الإضافية'}
              </div>
              {isAdmin && (
                <>
                  <button
                    onClick={() => { setShowMoreMenu(false); navigate('alerts'); }}
                    title={`${t.alerts || 'Alerts'} — Expiry & Payroll`}
                    className="flex w-full items-center gap-2.5 rounded-xl p-2 text-xs font-semibold text-slate-700 hover:bg-amber-50/70 bg-amber-50/30 transition-colors border border-amber-200/50 mb-1"
                  >
                    <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="text-left rtl:text-right">
                      <div className="font-bold text-amber-900 flex items-center gap-1.5">
                        <span>{t.alerts || ('التنبيهات والمواعيد')}</span>
                        <span className="text-[9px] bg-rose-500 text-white px-1.5 py-0.2 rounded-full font-bold">جديد</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        {'صلاحية الألبان، الرواتب، والمستحقات'}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => { setShowMoreMenu(false); navigate('orders'); }}
                    title={`${t.orders} — All completed sales`}
                    className="flex w-full items-center gap-2.5 rounded-xl p-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                      <ReceiptText className="h-4 w-4" />
                    </div>
                    <div className="text-left rtl:text-right">
                      <div className="font-bold text-slate-800">{t.orders}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{'جميع الفواتير والمبيعات'}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => { setShowMoreMenu(false); navigate('returns'); }}
                    title={`${t.returns} — Customer returns & spoilage`}
                    className="flex w-full items-center gap-2.5 rounded-xl p-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                      <RotateCcw className="h-4 w-4" />
                    </div>
                    <div className="text-left rtl:text-right">
                      <div className="font-bold text-slate-800">{t.returns}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{'مرتجعات العملاء وتالف الصلاحية'}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => { setShowMoreMenu(false); navigate('loyalty'); }}
                    title={`${t.loyalty} — Customer rewards & points`}
                    className="flex w-full items-center gap-2.5 rounded-xl p-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                      <Gift className="h-4 w-4" />
                    </div>
                    <div className="text-left rtl:text-right">
                      <div className="font-bold text-slate-800">{t.loyalty}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{'برنامج ولاء ونقاط العملاء'}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => { setShowMoreMenu(false); navigate('employees'); }}
                    title={`${t.employees} — Cashier shifts & staff directory`}
                    className="flex w-full items-center gap-2.5 rounded-xl p-2 text-xs font-semibold text-slate-700 hover:bg-blue-50/70 bg-slate-50/50 transition-colors border border-blue-100/60"
                  >
                    <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="text-left rtl:text-right">
                      <div className="font-bold text-blue-900 flex items-center gap-1.5">
                        <span>{t.employees}</span>
                        <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded font-mono">طاقم العمل</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">{'ورديات الكاشير ومطابقة الصندوق والموظفون'}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => { setShowMoreMenu(false); navigate('finance'); }}
                    title={`${t.finance} — Expenses, salaries & profit/loss`}
                    className="flex w-full items-center gap-2.5 rounded-xl p-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div className="text-left rtl:text-right">
                      <div className="font-bold text-slate-800">{t.finance}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{'المصروفات والرواتب والأرباح'}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => { setShowMoreMenu(false); navigate('branches'); }}
                    title={`${t.branches} — Store branches & registers`}
                    className="flex w-full items-center gap-2.5 rounded-xl p-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="text-left rtl:text-right">
                      <div className="font-bold text-slate-800">{t.branches}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{'الفروع ونقاط البيع'}</div>
                    </div>
                  </button>
                </>
              )}
              <button
                onClick={() => { setShowMoreMenu(false); navigate('purchases'); }}
                title={`${t.purchases} — Vendor orders & supply`}
                className="flex w-full items-center gap-2.5 rounded-xl p-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <Truck className="h-4 w-4" />
                </div>
                <div className="text-left rtl:text-right">
                  <div className="font-bold text-slate-800">{t.purchases}</div>
                  <div className="text-[10px] text-slate-400 font-normal">{'أوامر الشراء وفواتير الموردين'}</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppGate />
    </AppProvider>
  );
}

const AppGate: React.FC = () => {
  const { currentUser, authReady } = useApp();
  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <div className="text-sm font-semibold text-slate-500">{'جارٍ التحميل...'}</div>
        </div>
      </div>
    );
  }
  if (!currentUser) {
    return <LoginScreen />;
  }
  return <MainShell />;
};
