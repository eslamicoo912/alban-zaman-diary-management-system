import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Building2, 
  ShoppingBag, 
  DollarSign, 
  TrendingUp, 
  Layers, 
  Clock, 
  Users, 
  CheckCircle, 
  ArrowRight,
  Store,
  CreditCard,
  MapPin,
  Phone
} from 'lucide-react';

interface BranchComparisonReportProps {
  onSelectBranchFilter?: (branchId: string) => void;
}

export const BranchComparisonReport: React.FC<BranchComparisonReportProps> = ({ onSelectBranchFilter }) => {
  const { t, branches, sales, products, shifts, employees, registers, activeBranchId } = useApp();

  // Calculate chain totals
  const chainTotalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const chainTotalProfit = sales.reduce((sum, s) => sum + s.totalProfit, 0);
  const chainTotalStockCost = products.reduce((sum, p) => sum + (p.currentStock * p.costPrice), 0);

  // Compute metrics per branch
  const branchMetrics = branches.map(branch => {
    const branchSales = sales.filter(s => s.branchId === branch.id || (!s.branchId && branch.isDefault));
    const revenue = branchSales.reduce((sum, s) => sum + s.total, 0);
    const profit = branchSales.reduce((sum, s) => sum + s.totalProfit, 0);
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const ticketCount = branchSales.length;
    const avgTicket = ticketCount > 0 ? revenue / ticketCount : 0;
    const revenueShare = chainTotalRevenue > 0 ? (revenue / chainTotalRevenue) * 100 : 0;

    // Registers in this branch
    const branchRegisters = registers.filter(r => r.branchId === branch.id);

    // Active shift for this branch
    const openShift = shifts.find(
      s => (s.branchId === branch.id || (!s.branchId && branch.isDefault)) && s.status === 'Open'
    );

    // Employees assigned to this branch
    const branchEmployees = employees.filter(e => e.branchId === branch.id);

    // Find top selling product in this branch
    const productSoldCounts: Record<string, { name: string; quantity: number; revenue: number }> = {};
    branchSales.forEach(s => {
      s.items.forEach(it => {
        if (!productSoldCounts[it.productId]) {
          productSoldCounts[it.productId] = { name: it.productName, quantity: 0, revenue: 0 };
        }
        productSoldCounts[it.productId].quantity += it.quantity;
        productSoldCounts[it.productId].revenue += it.lineTotal;
      });
    });

    const topProduct = Object.values(productSoldCounts).sort((a, b) => b.revenue - a.revenue)[0];

    return {
      ...branch,
      revenue,
      profit,
      margin,
      ticketCount,
      avgTicket,
      revenueShare,
      branchRegisters,
      openShift,
      branchEmployees,
      topProduct,
    };
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Executive Answer Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
              <Building2 className="h-3.5 w-3.5" />
              <span>{t.q5Title || 'ماذا يحدث في كل فرع؟'}</span>
            </div>
            <h3 className="mt-1.5 text-lg font-bold text-slate-900">
              {'تقرير مقارنة ومتابعة الفروع الحية'}
            </h3>
            <p className="text-xs text-slate-500">
              {'مقارنة فورية للإيرادات، الأرباح، الورديات المفتوحة، النقدية في الأدراج، وأفضل المنتجات مبيعاً لكل فرع'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
              {branches.length} فرع مسجل
            </span>
          </div>
        </div>

        {/* Chain Summary Metrics */}
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <span className="text-xs font-semibold text-slate-500">إجمالي مبيعات السلسلة</span>
            <div className="mt-1 font-mono text-xl font-extrabold text-slate-900">
              {chainTotalRevenue.toFixed(2)} {t.currency}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{sales.length} total receipts</div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
            <span className="text-xs font-semibold text-emerald-800">إجمالي ربح السلسلة</span>
            <div className="mt-1 font-mono text-xl font-extrabold text-emerald-700">
              +{chainTotalProfit.toFixed(2)} {t.currency}
            </div>
            <div className="text-[11px] text-emerald-800/70 mt-0.5">
              Avg Margin: {chainTotalRevenue > 0 ? ((chainTotalProfit / chainTotalRevenue) * 100).toFixed(1) : '0'}%
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5">
            <span className="text-xs font-semibold text-blue-800">عدد الفروع المفتوحة</span>
            <div className="mt-1 font-mono text-xl font-extrabold text-blue-700">
              {branchMetrics.filter(b => !!b.openShift).length} of {branches.length}
            </div>
            <div className="text-[11px] text-blue-800/70 mt-0.5">ورديات المتاجر الحية</div>
          </div>

          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3.5">
            <span className="text-xs font-semibold text-purple-800">قيمة مخزون السلسلة</span>
            <div className="mt-1 font-mono text-xl font-extrabold text-purple-700">
              {chainTotalStockCost.toFixed(2)} {t.currency}
            </div>
            <div className="text-[11px] text-purple-800/70 mt-0.5">{products.length} catalog items</div>
          </div>
        </div>
      </div>

      {/* Cross-Branch Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {branchMetrics.map(b => (
          <div 
            key={b.id} 
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-blue-300 hover:shadow-md flex flex-col justify-between"
          >
            <div>
              {/* Branch Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-800">
                      {b.code}
                    </span>
                    {b.isDefault && (
                      <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                        Primary HQ
                      </span>
                    )}
                  </div>
                  <h4 className="mt-1.5 text-base font-bold text-slate-900">
                    {b.nameAr}
                  </h4>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    <span>{b.address}</span>
                  </div>
                </div>

                <div className="text-right rtl:text-left">
                  <div className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 font-mono">
                    {b.revenueShare.toFixed(0)}% of sales
                  </div>
                </div>
              </div>

              {/* Revenue & Profit metrics */}
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50/80 p-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">إجمالي المبيعات</span>
                  <div className="font-mono text-base font-black text-slate-900">
                    {b.revenue.toFixed(2)} {t.currency}
                  </div>
                  <div className="text-[10px] text-slate-500">{b.ticketCount} receipts</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">إجمالي الربح</span>
                  <div className="font-mono text-base font-black text-emerald-600">
                    +{b.profit.toFixed(2)} {t.currency}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-semibold">{b.margin.toFixed(1)}% margin</div>
                </div>
              </div>

              {/* Progress bar of revenue */}
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>حصة حجم المبيعات</span>
                  <span>{b.revenueShare.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div 
                    className="h-full rounded-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, b.revenueShare))}%` }}
                  />
                </div>
              </div>

              {/* Live Shift Status */}
              <div className="mt-4 rounded-xl border border-slate-100 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    Live Register Status:
                  </span>
                  {b.openShift ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Shift Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      Closed
                    </span>
                  )}
                </div>

                {b.openShift ? (
                  <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                    <div className="flex justify-between">
                      <span>الكاشير:</span>
                      <span className="font-semibold text-slate-900">{b.openShift.cashierName || b.openShift.employeeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>الرصيد المتوقع في الصندوق:</span>
                      <span className="font-mono font-bold text-emerald-600">
                        {b.openShift.expectedCash.toFixed(2)} {t.currency}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-[10px] text-slate-400">
                    No active shift running on branch registers right now.
                  </p>
                )}
              </div>

              {/* Top Seller in this branch */}
              {b.topProduct && (
                <div className="mt-3 text-xs bg-amber-50/40 rounded-xl p-2.5 border border-amber-100">
                  <span className="text-[10px] font-bold uppercase text-amber-800">الأصناف الأعلى أداءً:</span>
                  <div className="font-bold text-slate-900 truncate mt-0.5">{b.topProduct.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {b.topProduct.quantity} sold • {b.topProduct.revenue.toFixed(2)} {t.currency}
                  </div>
                </div>
              )}
            </div>

            {/* Branch Quick Action */}
            {onSelectBranchFilter && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => onSelectBranchFilter(b.id)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/50 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <span>Filter Whole Report by {b.code}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Comprehensive Multi-Branch Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-100 px-5 py-3.5 bg-slate-50/50 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900">
            {'جدول المقارنة التفصيلي للفروع'}
          </h4>
          <span className="text-xs text-slate-500">أرقام مجمعة حية</span>
        </div>

        <table className="w-full text-left text-xs rtl:text-right">
          <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
            <tr>
              <th className="py-3 px-4">كود واسم الفرع</th>
              <th className="py-3 px-3">الحالة والعنوان</th>
              <th className="py-3 px-3 text-right rtl:text-left">إجمالي المبيعات</th>
              <th className="py-3 px-3 text-right rtl:text-left">إجمالي الربح</th>
              <th className="py-3 px-3 text-right rtl:text-left">Margin %</th>
              <th className="py-3 px-3 text-center">الفواتير</th>
              <th className="py-3 px-3 text-right rtl:text-left">متوسط الفاتورة</th>
              <th className="py-3 px-4 text-center">الوردية الحالية</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {branchMetrics.map(b => (
              <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-900">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[10px] text-blue-800 font-bold">
                      {b.code}
                    </span>
                    <span>{b.nameAr}</span>
                  </div>
                </td>
                <td className="py-3.5 px-3 text-slate-500">
                  <div className="truncate max-w-[160px]">{b.address}</div>
                </td>
                <td className="py-3.5 px-3 font-mono font-extrabold text-slate-900 text-right rtl:text-left">
                  {b.revenue.toFixed(2)} {t.currency}
                </td>
                <td className="py-3.5 px-3 font-mono font-bold text-emerald-600 text-right rtl:text-left">
                  +{b.profit.toFixed(2)} {t.currency}
                </td>
                <td className="py-3.5 px-3 font-mono font-semibold text-slate-700 text-right rtl:text-left">
                  {b.margin.toFixed(1)}%
                </td>
                <td className="py-3.5 px-3 font-mono text-center text-slate-600">
                  {b.ticketCount}
                </td>
                <td className="py-3.5 px-3 font-mono text-slate-800 text-right rtl:text-left">
                  {b.avgTicket.toFixed(1)} {t.currency}
                </td>
                <td className="py-3.5 px-4 text-center">
                  {b.openShift ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {(b.openShift.cashierName || b.openShift.employeeName).split(' ')[0]}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[11px]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
