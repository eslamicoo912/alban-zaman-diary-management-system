import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { canAccessTab } from '../../permissions';
import { 
  ShoppingBag, 
  LayoutDashboard, 
  Package, 
  Layers, 
  RotateCcw, 
  Gift, 
  Truck, 
  Users, 
  DollarSign, 
  Building2, 
  BarChart3, 
  ReceiptText,
  MoreHorizontal,
  Bell,
  ChevronDown,
  Settings,
  ShieldCheck,
  LogOut,
  Lock,
  Store
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: any) => void;
  onToggleShortcuts?: () => void;
  isShortcutsOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const { 
    t, 
    branches, 
    activeBranchId, 
    setActiveBranchId, 
    activeBranch, 
    activeShift,
    products,
    salaries,
    vendors,
    currentUser,
    isAdmin,
    logout
  } = useApp();

  const urgentAlertsCount = React.useMemo(() => {
    const today = new Date('2026-09-03T00:00:00');
    // Perishable products expiring within 7 days
    const expiringCount = products.filter(p => {
      if (p.currentStock <= 0) return false;
      const exp = new Date(`${p.expiryDate}T00:00:00`);
      const days = Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return days <= 7;
    }).length;

    // Pending salaries
    const pendingSalariesCount = salaries.filter(s => s.status === 'Pending').length;

    // Due vendor balances
    const vendorBalCount = vendors.filter(v => v.balance > 0).length;

    return expiringCount + pendingSalariesCount + (vendorBalCount > 0 ? 1 : 0);
  }, [products, salaries, vendors]);

  const navItems = [
    { 
      id: 'pos', 
      label: t.pos, 
      icon: ShoppingBag, 
      highlight: true,
      hint: 'نقطة البيع والكاشير' 
    },
    { 
      id: 'dashboard', 
      label: t.dashboard, 
      icon: LayoutDashboard,
      hint: 'نظرة عامة ومؤشرات الأداء'
    },
    { 
      id: 'alerts', 
      label: t.alerts || ('التنبيهات'), 
      icon: Bell,
      badge: urgentAlertsCount,
      hint: 'تنبيهات صلاحية الألبان ومستحقات الرواتب'
    },
    { 
      id: 'products', 
      label: t.products, 
      icon: Package,
      hint: 'إدارة المنتجات والألبان'
    },
    { 
      id: 'inventory', 
      label: t.inventory, 
      icon: Layers,
      hint: 'المخزون وتواريخ الصلاحية'
    },
    { 
      id: 'orders', 
      label: t.orders, 
      icon: ReceiptText,
      hint: 'جميع الطلبات المكتملة والمرتجعات'
    },
    { 
      id: 'returns', 
      label: t.returns, 
      icon: RotateCcw,
      hint: 'مرتجعات العملاء وتالف الصلاحية'
    },
    { 
      id: 'loyalty', 
      label: t.loyalty, 
      icon: Gift,
      hint: 'برنامج ولاء ونقاط العملاء'
    },
    { 
      id: 'purchases', 
      label: t.purchases, 
      icon: Truck,
      hint: 'أوامر الشراء وفواتير الموردين'
    },
    { 
      id: 'employees', 
      label: t.employees, 
      icon: Users,
      hint: 'إدارة الورديات والموظفين ومطابقة الصندوق'
    },
    { 
      id: 'finance', 
      label: t.finance, 
      icon: DollarSign,
      hint: 'المصروفات والرواتب والأرباح'
    },
    { 
      id: 'branches', 
      label: t.branches, 
      icon: Building2,
      hint: 'إدارة الفروع ونقاط البيع'
    },
    { 
      id: 'reports', 
      label: t.reports, 
      icon: BarChart3,
      hint: 'التقارير التحليلية والمالية'
    },
    { 
      id: 'users', 
      label: 'المستخدمون', 
      icon: ShieldCheck,
      hint: 'إدارة حسابات الدخول والأدوار'
    },
  ];

  // Cashier initials
  const cashierName = currentUser?.fullName || activeShift?.employeeName || ('أحمد خليل (كاشير)');
  const initials = cashierName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('');

  // Restrict navigation items by the signed-in user's role.
  const allowedNavItems = navItems.filter(item => canAccessTab(item.id, currentUser?.role));

  // Primary navigation items
  const primaryIds = ['pos', 'dashboard', 'alerts'];
  const primaryItems = allowedNavItems.filter(i => primaryIds.includes(i.id));

  // Secondary navigation items grouped by category
  const secondaryGroups = [
    {
      groupTitle: 'المبيعات والعملاء',
      itemIds: ['orders', 'returns', 'loyalty']
    },
    {
      groupTitle: 'المخزون والمنتجات',
      itemIds: ['products', 'inventory']
    },
    {
      groupTitle: 'المشتريات والموردين',
      itemIds: ['purchases']
    },
    {
      groupTitle: 'الموارد البشرية والورديات',
      itemIds: ['employees']
    },
    {
      groupTitle: 'التقارير والإدارة',
      itemIds: ['finance', 'reports', 'branches', 'users']
    }
  ].map(group => ({
    ...group,
    items: allowedNavItems.filter(item => group.itemIds.includes(item.id))
  })).filter(group => group.items.length > 0);

  const isAnySecondaryActive = secondaryGroups.some(group => 
    group.items.some(i => i.id === currentTab)
  );

  const [moreOpen, setMoreOpen] = useState(false);
  const closeMore = () => setMoreOpen(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const moreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!moreOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [moreOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-6">
      {/* Left: Brand & Navigation */}
      <div className="flex items-center gap-3 lg:gap-6">
        {/* Brand Logo & Title */}
        <button
          onClick={() => onSelectTab('pos')}
          className="flex items-center gap-2.5 text-left rtl:text-right group shrink-0"
          title={`${'ألبان زمان'} - نقطة البيع`}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-black shadow-xs ring-2 ring-blue-600/20 group-hover:scale-105 transition-transform">
            <span className="text-xs font-extrabold tracking-tighter">AZ</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                {'ألبان زمان'}
              </h1>
              <span className="text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 px-1.5 py-0.2 rounded-md border border-blue-200">
                POS
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
              {'نظام نقاط بيع منتجات الألبان'}
            </span>
          </div>
        </button>

        {/* Main Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 py-1">
          {primaryItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => onSelectTab(item.id)}
                  title={`${item.label} — ${item.hint}`}
                  aria-label={item.label}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    item.highlight
                      ? isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      : isActive
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden xl:inline whitespace-nowrap">{item.label}</span>
                  {Boolean(item.badge && item.badge > 0) && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">
                      {item.badge}
                    </span>
                  )}
                </button>

                {/* Hover Tooltip */}
                <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:flex flex-col items-center z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <div className="h-1.5 w-1.5 rotate-45 bg-slate-900 -mb-1" />
                  <div className="whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-center text-xs font-medium text-white shadow-xl">
                    <div className="font-bold flex items-center justify-center gap-1.5">
                      <Icon className="h-3 w-3 text-blue-400" />
                      <span>{item.label}</span>
                    </div>
                    <div className="text-[10px] text-slate-300 mt-0.5 max-w-[200px] whitespace-normal">
                      {item.hint}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Grouped "More" Dropdown */}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen(v => !v)}
              title={'المزيد من الوحدات'}
              aria-label="المزيد من الوحدات"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                moreOpen || isAnySecondaryActive
                  ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <MoreHorizontal className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden xl:inline whitespace-nowrap">{t.viewAll}</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
            </button>

            {moreOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 max-h-[80vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                {secondaryGroups.map((group, groupIdx) => (
                  <div key={group.groupTitle} className={groupIdx > 0 ? 'mt-2 pt-2 border-t border-slate-100' : ''}>
                    <div className="px-3 py-1 text-[13px] font-semibold uppercase tracking-wider text-slate-400 font-['Cairo']">
                      {group.groupTitle}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {group.items.map(item => {
                        const Icon = item.icon;
                        const isActive = currentTab === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => { onSelectTab(item.id); closeMore(); }}
                            className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                              isActive ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="text-left rtl:text-right flex-1 min-w-0">
                              <div className="truncate text-xs text-slate-800">{item.label}</div>
                              <div className="truncate text-[10px] text-slate-400 font-normal">{item.hint}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-3 lg:gap-4 shrink-0">
        {/* Branch Quick Selector */}
        <div className="hidden text-right xl:block rtl:text-left">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {activeBranch ? activeBranch.nameAr : 'الفرع'}
          </div>
          <div className="flex items-center justify-end gap-1 text-xs font-semibold text-slate-700">
            <Store className="h-3 w-3 text-slate-400" />
            <select
              value={activeBranchId}
              onChange={e => setActiveBranchId(e.target.value)}
              className="cursor-pointer bg-transparent font-semibold text-slate-700 focus:outline-hidden hover:text-blue-600"
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.nameAr} ({b.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Shift Indicator */}
        <div className="relative group">
          <button
            onClick={() => isAdmin && onSelectTab('employees')}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all ${
              isAdmin ? 'cursor-pointer' : 'cursor-default'
            } ${
              activeShift
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
            title={`${t.employees} - ${activeShift ? t.shiftInProgress : t.openShiftPrompt}`}
            aria-label={`${t.employees} - ${activeShift ? t.shiftInProgress : t.openShiftPrompt}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                activeShift ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span className="hidden sm:inline">
              {activeShift ? `${activeShift.employeeName.split(' ')[0]}` : t.openShift}
            </span>
          </button>

          <div className="pointer-events-none absolute right-0 top-full mt-2 hidden group-hover:flex flex-col items-end z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <div className="h-1.5 w-1.5 rotate-45 bg-slate-900 -mb-1 mr-4" />
            <div className="whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-xl">
              <div className="font-bold flex items-center gap-1.5">
                <Users className="h-3 w-3 text-emerald-400" />
                <span>{t.employees} ({t.activeShift})</span>
              </div>
              <div className="text-[10px] text-slate-300 mt-0.5">
                {activeShift ? `${activeShift.employeeName} - ${t.shiftInProgress}` : t.openShiftPrompt}
              </div>
            </div>
          </div>
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(prev => !prev)}
            className={`flex items-center gap-2 rounded-xl border py-1.5 pl-2 pr-2.5 text-xs shadow-2xs transition-all ${
              userMenuOpen
                ? 'border-blue-400 bg-blue-50/60'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
            title={cashierName}
            aria-label={cashierName}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-white">
              {initials || 'AZ'}
            </div>
            <span className="hidden max-w-32 truncate text-xs font-bold text-slate-700 md:inline">
              {cashierName}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="border-b border-slate-100 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[11px] font-black text-white">
                    {initials || 'AZ'}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-slate-800">{cashierName}</div>
                    <div className="text-[10px] text-slate-400">
                      {isAdmin ? 'مدير النظام' : 'مستخدم'}
                    </div>
                  </div>
                </div>
              </div>
              {isAdmin && (
                <>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onSelectTab('employees');
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left rtl:text-right text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    {t.employees}
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onSelectTab('settings');
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left rtl:text-right text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Settings className="h-3.5 w-3.5 text-slate-400" />
                    {'الإعدادات'}
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onSelectTab('users');
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left rtl:text-right text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                    {'المستخدمون'}
                  </button>
                </>
              )}
              <div className="border-t border-slate-100">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left rtl:text-right text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {'تسجيل الخروج'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};