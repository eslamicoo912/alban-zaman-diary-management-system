import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Percent,
  Calendar,
  Zap,
  Building2,
  Clock,
  Sparkles,
  ArrowUpRight,
  PlusCircle,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { Sale } from '../../types';

export type TimeViewMode = 'daily' | 'weekly' | 'monthly';
export type DailySubMode = 'past14' | 'todayHourly';

interface ChartPoint {
  key: string;
  label: string;
  subLabel?: string;
  sales: number;
  profit: number;
  cogs: number;
  margin: number;
  ordersCount: number;
  avgOrderValue: number;
}

export const ProfitVsSalesChart: React.FC = () => {
  const {
    t,
    sales,
    completeSale,
    branches,
    activeBranchId,
    activeShift,
    currentEmployee
  } = useApp();

  const [viewMode, setViewMode] = useState<TimeViewMode>('daily');
  const [dailySubMode, setDailySubMode] = useState<DailySubMode>('past14');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [showMarginLine, setShowMarginLine] = useState<boolean>(false);
  const [simulatedFeedback, setSimulatedFeedback] = useState<string | null>(null);

  // Format currency
  const formatCurr = (num: number) => {
    return `${num.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${t.currency}`;
  };

  // Filter sales by branch if selected
  const branchSales = useMemo(() => {
    if (selectedBranchId === 'all') return sales;
    return sales.filter(s => s.branchId === selectedBranchId);
  }, [sales, selectedBranchId]);

  // Last transaction time
  const lastTransaction = useMemo(() => {
    if (sales.length === 0) return null;
    const sorted = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted[0];
  }, [sales]);

  // Build chart dataset depending on viewMode
  const chartData: ChartPoint[] = useMemo(() => {
    const today = new Date();
    // Anchor to today's date
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    if (viewMode === 'daily') {
      if (dailySubMode === 'todayHourly') {
        // Today's hourly breakdown: 8:00 AM to 22:00 PM (15 hours)
        const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
        
        return hours.map(h => {
          const matchedSales = branchSales.filter(s => {
            const d = new Date(s.date);
            return (
              d.getFullYear() === todayYear &&
              d.getMonth() === todayMonth &&
              d.getDate() === todayDate &&
              d.getHours() === h
            );
          });

          const totalSales = matchedSales.reduce((sum, s) => sum + s.total, 0);
          const totalProfit = matchedSales.reduce((sum, s) => sum + (s.totalProfit || 0), 0);
          const totalCogs = matchedSales.reduce((sum, s) => sum + (s.totalCost || 0), 0);
          const count = matchedSales.length;
          const margin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
          const avgOrder = count > 0 ? totalSales / count : 0;

          const hourLabel =`${h > 12 ? h - 12 : h} ${h >= 12 ? 'م' : 'ص'}`;

          return {
            key: `hour-${h}`,
            label: hourLabel,
            subLabel:'اليوم',
            sales: Math.round(totalSales * 10) / 10,
            profit: Math.round(totalProfit * 10) / 10,
            cogs: Math.round(totalCogs * 10) / 10,
            margin: Math.round(margin * 10) / 10,
            ordersCount: count,
            avgOrderValue: Math.round(avgOrder * 10) / 10,
          };
        });
      } else {
        // Past 14 Days daily progression
        const days: ChartPoint[] = [];
        for (let i = 13; i >= 0; i--) {
          const target = new Date(todayYear, todayMonth, todayDate - i);
          const targetStr = target.toISOString().split('T')[0];
          
          const matchedSales = branchSales.filter(s => {
            const dStr = new Date(s.date).toISOString().split('T')[0];
            return dStr === targetStr;
          });

          const totalSales = matchedSales.reduce((sum, s) => sum + s.total, 0);
          const totalProfit = matchedSales.reduce((sum, s) => sum + (s.totalProfit || 0), 0);
          const totalCogs = matchedSales.reduce((sum, s) => sum + (s.totalCost || 0), 0);
          const count = matchedSales.length;
          const margin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
          const avgOrder = count > 0 ? totalSales / count : 0;

          const isToday = i === 0;
          const dateMonthStr = target.toLocaleDateString('ar-EG', {
            month: 'short',
            day: 'numeric',
          });

          days.push({
            key: `day-${targetStr}`,
            label: isToday ? ('اليوم') : dateMonthStr,
            subLabel: targetStr,
            sales: Math.round(totalSales * 10) / 10,
            profit: Math.round(totalProfit * 10) / 10,
            cogs: Math.round(totalCogs * 10) / 10,
            margin: Math.round(margin * 10) / 10,
            ordersCount: count,
            avgOrderValue: Math.round(avgOrder * 10) / 10,
          });
        }
        return days;
      }
    }

    if (viewMode === 'weekly') {
      // Last 8 weeks
      const weeks: ChartPoint[] = [];
      const currentDay = today.getDay(); // 0 is Sunday
      // Find start of current week (Saturday or Sunday)
      const currentWeekStart = new Date(todayYear, todayMonth, todayDate - currentDay);

      for (let w = 7; w >= 0; w--) {
        const start = new Date(currentWeekStart);
        start.setDate(start.getDate() - w * 7);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        const startTime = start.getTime();
        const endTime = end.getTime();

        const matchedSales = branchSales.filter(s => {
          const tTime = new Date(s.date).getTime();
          return tTime >= startTime && tTime <= endTime;
        });

        const totalSales = matchedSales.reduce((sum, s) => sum + s.total, 0);
        const totalProfit = matchedSales.reduce((sum, s) => sum + (s.totalProfit || 0), 0);
        const totalCogs = matchedSales.reduce((sum, s) => sum + (s.totalCost || 0), 0);
        const count = matchedSales.length;
        const margin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
        const avgOrder = count > 0 ? totalSales / count : 0;

        const isCurrentWeek = w === 0;
        const weekLabel =isCurrentWeek ? 'الأسبوع الحالي' : `أسبوع ${start.getDate()}/${start.getMonth() + 1}`;

        weeks.push({
          key: `week-${w}`,
          label: weekLabel,
          subLabel: `${start.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}`,
          sales: Math.round(totalSales * 10) / 10,
          profit: Math.round(totalProfit * 10) / 10,
          cogs: Math.round(totalCogs * 10) / 10,
          margin: Math.round(margin * 10) / 10,
          ordersCount: count,
          avgOrderValue: Math.round(avgOrder * 10) / 10,
        });
      }
      return weeks;
    }

    if (viewMode === 'monthly') {
      // Last 7 months up to current month (e.g. Mar to Sep)
      const months: ChartPoint[] = [];
      for (let m = 6; m >= 0; m--) {
        const targetDate = new Date(todayYear, todayMonth - m, 1);
        const mYear = targetDate.getFullYear();
        const mMonth = targetDate.getMonth();

        const matchedSales = branchSales.filter(s => {
          const d = new Date(s.date);
          return d.getFullYear() === mYear && d.getMonth() === mMonth;
        });

        const totalSales = matchedSales.reduce((sum, s) => sum + s.total, 0);
        const totalProfit = matchedSales.reduce((sum, s) => sum + (s.totalProfit || 0), 0);
        const totalCogs = matchedSales.reduce((sum, s) => sum + (s.totalCost || 0), 0);
        const count = matchedSales.length;
        const margin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
        const avgOrder = count > 0 ? totalSales / count : 0;

        const isCurrentMonth = m === 0;
        const monthLabel = targetDate.toLocaleDateString('ar-EG', {
          month: 'short',
        }) + (isCurrentMonth ? (' (الحالي)') : '');

        months.push({
          key: `month-${mYear}-${mMonth}`,
          label: monthLabel,
          subLabel: `${targetDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}`,
          sales: Math.round(totalSales * 10) / 10,
          profit: Math.round(totalProfit * 10) / 10,
          cogs: Math.round(totalCogs * 10) / 10,
          margin: Math.round(margin * 10) / 10,
          ordersCount: count,
          avgOrderValue: Math.round(avgOrder * 10) / 10,
        });
      }
      return months;
    }

    return [];
  }, [viewMode, dailySubMode, branchSales]);

  // Aggregate stats across current chart view
  const aggregates = useMemo(() => {
    const totalSales = chartData.reduce((acc, p) => acc + p.sales, 0);
    const totalProfit = chartData.reduce((acc, p) => acc + p.profit, 0);
    const totalOrders = chartData.reduce((acc, p) => acc + p.ordersCount, 0);
    const overallMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
    
    // Find peak point
    let peakPoint = chartData[0];
    chartData.forEach(p => {
      if (p.sales > (peakPoint?.sales || 0)) {
        peakPoint = p;
      }
    });

    return {
      totalSales,
      totalProfit,
      totalOrders,
      overallMargin,
      peakPoint,
    };
  }, [chartData]);

  // Quick Counter Sale Simulator (adds a real-time sale to demonstrate instant chart re-render)
  const handleSimulateQuickSale = () => {
    const nowIso = new Date().toISOString();
    const newSale = completeSale({
      items: [
        {
          productId: 'prod-1',
          productName: 'Fresh Whole Cow Milk 1L',
          productNameAr: 'حليب بقري كامل الدسم 1 لتر',
          sku: 'DRY-MLK-001',
          barcode: '6281007001012',
          unit: 'Bottle',
          quantity: 2,
          costPrice: 4.20,
          salePrice: 6.00,
          discountAmount: 0,
          lineTotal: 12.00,
          batchNumber: 'B-2609A',
          expiryDate: '2026-09-08',
        },
        {
          productId: 'prod-9',
          productName: 'Artisan Pure Cow Ghee (Baladi Samna)',
          productNameAr: 'سمن بلدي بقري صافي فاخر',
          sku: 'DRY-BTR-002',
          barcode: '6281007004020',
          unit: 'Bottle',
          quantity: 1,
          costPrice: 42.00,
          salePrice: 62.00,
          discountAmount: 0,
          lineTotal: 62.00,
          batchNumber: 'B-2609G',
          expiryDate: '2026-12-15',
        },
      ],
      subtotal: 74.00,
      discountTotal: 0,
      total: 74.00,
      paymentMethod: 'cash',
      payments: [{ method: 'cash', amount: 74.00 }],
      notes: 'فاتورة تجريبية فورية من عارض الأرباح مقابل المبيعات في لوحة التحكم',
    });

    setSimulatedFeedback(`تم تسجيل فاتورة تجريبية رقم ${newSale.receiptNumber} بقيمة 74.00 ج.م بربح +23.60 ج.م لحظياً!`
    );

    setTimeout(() => {
      setSimulatedFeedback(null);
    }, 4500);
  };

  // Custom Chart Tooltip
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: ChartPoint = payload[0].payload;
      return (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/95 p-3.5 text-xs text-white shadow-2xl backdrop-blur-md min-w-[210px]">
          <div className="border-b border-slate-800 pb-2 mb-2 flex items-center justify-between">
            <span className="font-extrabold text-sm text-slate-100">{data.label}</span>
            {data.subLabel && (
              <span className="text-[10px] text-slate-400 font-mono">{data.subLabel}</span>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-blue-400 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-blue-400/30" />
                {'إجمالي المبيعات:'}
              </span>
              <span className="font-mono font-black text-slate-100">
                {data.sales.toFixed(1)} {t.currency}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-400/30" />
                {'صافي الربح:'}
              </span>
              <span className="font-mono font-black text-emerald-400">
                +{data.profit.toFixed(1)} {t.currency}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-500" />
                {'تكلفة البضاعة:'}
              </span>
              <span className="font-mono text-slate-300">
                {data.cogs.toFixed(1)} {t.currency}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-purple-300 font-semibold">{'هامش الربح:'}</span>
              <span className="font-mono font-bold text-purple-300 bg-purple-950/70 border border-purple-800/50 px-1.5 py-0.5 rounded">
                {data.margin.toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>{'الفواتير المنجزة:'}</span>
              <span className="font-mono">{data.ordersCount}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all">
      {/* Header with Title, Live Badge, and Action Buttons */}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-4 ring-blue-50/50">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-black text-slate-900">
              {'المبيعات مقابل الأرباح (مباشر)'}
            </h3>
            
            {/* Real-time sync badge */}
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200/70">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>{'مزامنة لحظية للكاشير'}</span>
            </div>
          </div>
          
          <p className="mt-1 text-xs text-slate-500">
            {'مراقبة فورية لمنحنى الإيرادات المحققة مقارنة بصافي هوامش الربح الفعلي بعد خصم تكلفة البضاعة'}
          </p>
        </div>

        {/* View Controls: Daily / Weekly / Monthly Switchers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Branch filter dropdown */}
          <div className="relative">
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-slate-50/80 px-3 pr-8 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus:border-blue-500 focus:outline-hidden rtl:pl-8 rtl:pr-3"
              aria-label="تصفية الفروع"
            >
              <option value="all">{'🏢 كافة الفروع'}</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe Pill Toggle: Daily / Weekly / Monthly */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/60">
            <button
              onClick={() => setViewMode('daily')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'daily'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {'يومي'}
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'weekly'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {'أسبوعي'}
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'monthly'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {'شهري'}
            </button>
          </div>
        </div>
      </div>

      {/* Sub-bar: Daily mode sub-toggle, Quick Simulation Button, and Margin line toggle */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {viewMode === 'daily' && (
            <div className="inline-flex rounded-lg bg-slate-50 p-0.5 border border-slate-200">
              <button
                onClick={() => setDailySubMode('past14')}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                  dailySubMode === 'past14'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {'آخر 14 يوماً'}
              </button>
              <button
                onClick={() => setDailySubMode('todayHourly')}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all flex items-center gap-1 ${
                  dailySubMode === 'todayHourly'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="h-3 w-3" />
                <span>{'ساعات اليوم (لحظي)'}</span>
              </button>
            </div>
          )}

          {/* Toggle Margin Line */}
          <button
            onClick={() => setShowMarginLine(!showMarginLine)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold border transition-all ${
              showMarginLine
                ? 'border-purple-300 bg-purple-50 text-purple-700'
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
            }`}
            title="إظهار/إخفاء خط نسبة الهامش"
          >
            <Percent className="h-3 w-3" />
            <span>{'خط نسبة الهامش %'}</span>
          </button>
        </div>

        {/* Live POS simulation button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulateQuickSale}
            className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 active:scale-98 transition-all"
            title="إدخال فاتورة حقيقية لرؤية تحديث المخطط فوراً"
          >
            <PlusCircle className="h-3.5 w-3.5 text-blue-600" />
            <span>{'+ تسجيل حركة بيع حية'}</span>
          </button>
        </div>
      </div>

      {/* Simulated Live Toast Feedback */}
      {simulatedFeedback && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-800 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{simulatedFeedback}</span>
        </div>
      )}

      {/* Executive KPI Summary Ribbon */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Period Sales */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>{'إجمالي المبيعات بالفترة'}</span>
            <div className="h-2 w-2 rounded-full bg-blue-500" />
          </div>
          <div className="mt-1 font-mono text-xl font-extrabold text-blue-700">
            {formatCurr(aggregates.totalSales)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {aggregates.totalOrders} {'فاتورة بيع مسجلة'}
          </div>
        </div>

        {/* Total Period Profit */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>{'صافي الربح بالفترة'}</span>
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-1 font-mono text-xl font-extrabold text-emerald-600">
            +{formatCurr(aggregates.totalProfit)}
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5 font-medium">
            {'ربح صافٍ بعد خصم التكاليف'}
          </div>
        </div>

        {/* Period Average Profit Margin */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>{'متوسط هامش الربح'}</span>
            <div className="h-2 w-2 rounded-full bg-purple-500" />
          </div>
          <div className="mt-1 font-mono text-xl font-extrabold text-purple-700">
            {aggregates.overallMargin.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {'هامش الألبان والأجبان'}
          </div>
        </div>

        {/* Peak Performance Period */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>{'أعلى نقطة أداء'}</span>
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="mt-1 text-sm font-black text-slate-900 truncate">
            {aggregates.peakPoint?.label || '-'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {aggregates.peakPoint ? formatCurr(aggregates.peakPoint.sales) : '0'}
          </div>
        </div>
      </div>

      {/* Main Recharts Line Chart */}
      <div className="mt-6 h-[330px] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 15, right: 25, left: 10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f1f5f9"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              dy={5}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) =>
                val >= 1000 ? `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k` : `${val}`
              }
              dx={-5}
            />
            <Tooltip content={<CustomChartTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: 15, fontSize: 12, fontWeight: 600 }}
              formatter={(value) => {
                if (value === 'sales') return'إجمالي المبيعات (ج.م)';
                if (value === 'profit') return'صافي الأرباح (ج.م)';
                if (value === 'margin') return'هامش الربح %';
                return value;
              }}
            />

            {/* Sales Line */}
            <Line
              name="sales"
              type="monotone"
              dataKey="sales"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 4, stroke: '#2563eb', strokeWidth: 2, fill: '#ffffff' }}
              activeDot={{ r: 7, stroke: '#1d4ed8', strokeWidth: 2, fill: '#2563eb' }}
              animationDuration={600}
            />

            {/* Profit Line */}
            <Line
              name="profit"
              type="monotone"
              dataKey="profit"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, stroke: '#10b981', strokeWidth: 2, fill: '#ffffff' }}
              activeDot={{ r: 7, stroke: '#059669', strokeWidth: 2, fill: '#10b981' }}
              animationDuration={600}
            />

            {/* Optional Margin Line */}
            {showMarginLine && (
              <Line
                name="margin"
                type="monotone"
                dataKey="margin"
                stroke="#a855f7"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, stroke: '#a855f7', strokeWidth: 1.5, fill: '#ffffff' }}
                activeDot={{ r: 5, stroke: '#9333ea', strokeWidth: 2, fill: '#a855f7' }}
                animationDuration={600}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer: Operational Insights & Last Sale indicator */}
      <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-slate-50/80 p-3.5 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-600 shrink-0" />
          <span>
            {'ملاحظة تشغيلية: ترتفع هوامش الأرباح (+42%) في الأجبان البلدية والسمن، بينما يتميز الحليب الطازج بسرعة دوران نقدية فائقة (26%).'}
          </span>
        </div>

        {lastTransaction && (
          <div className="shrink-0 text-[11px] text-slate-400 font-mono">
            {'آخر حركة مسجلة:'}{' '}
            <span className="font-bold text-slate-700">{lastTransaction.receiptNumber}</span> (
            {new Date(lastTransaction.date).toLocaleTimeString('ar-EG', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            )
          </div>
        )}
      </div>
    </div>
  );
};
