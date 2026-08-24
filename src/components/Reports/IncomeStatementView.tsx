import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { formatSAR } from '../../utils/currency';
import {
  TrendingUp,
  Percent,
  Hash,
  FileText,
  ChevronDown,
  ChevronUp,
  Search,
  DollarSign,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
} from 'lucide-react';

interface IncomeStatementViewProps {
  startDate?: string;
  endDate?: string;
  periodLabel: string;
}

export const IncomeStatementView: React.FC<IncomeStatementViewProps> = ({
  startDate,
  endDate,
  periodLabel,
}) => {
  const { getIncomeStatement, companySettings } = useAccounting();
  const data = getIncomeStatement(startDate, endDate);

  // Customization Toggles
  const [showPercentage, setShowPercentage] = useState(true);
  const [showAccountCode, setShowAccountCode] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    revenue: true,
    cogs: true,
    expenses: true,
    other: true,
  });
  const [searchTerm, setSearchTerm] = useState('');

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Safe Percentage Helper
  const safePct = (part: number, base: number) => {
    if (!base || base <= 0 || isNaN(part) || isNaN(base) || !isFinite(part) || !isFinite(base)) return '0.0%';
    return `${((part / base) * 100).toFixed(1)}%`;
  };

  const safeValPct = (pct: number) => {
    if (isNaN(pct) || !isFinite(pct)) return '0.0%';
    return `${pct.toFixed(1)}%`;
  };

  // Calculations
  const grossMarginPct = data.totalRevenue > 0 && !isNaN(data.grossProfit) ? (data.grossProfit / data.totalRevenue) * 100 : 0;
  const operatingMarginPct = data.totalRevenue > 0 && !isNaN(data.netOperatingProfit) ? (data.netOperatingProfit / data.totalRevenue) * 100 : 0;
  const netMarginPct = data.totalRevenue > 0 && !isNaN(data.netProfit) ? (data.netProfit / data.totalRevenue) * 100 : 0;

  // Estimated Zakat (2.5% of estimated net profit base if positive)
  const estimatedZakat = data.netProfit > 0 ? data.netProfit * 0.025 : 0;
  const netIncomeAfterZakat = data.netProfit - estimatedZakat;

  const filteredRevenue = data.revenueBreakdown.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredExpenses = data.expenseBreakdown.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 text-right">
      {/* KPI Cards Bento Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 no-print">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>إجمالي الإيرادات</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-slate-900">
            {formatSAR(data.totalRevenue)}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>100% أساس الإيرادات</span>
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>مجمل الربح</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-blue-900">
            {formatSAR(data.grossProfit)}
          </div>
          <span className="text-[11px] text-slate-500 font-mono mt-1 block">
            هامش مجمل الربح: <strong>{safeValPct(grossMarginPct)}</strong>
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>المصروفات التشغيلية</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-amber-900">
            {formatSAR(data.operatingExpenses)}
          </div>
          <span className="text-[11px] text-slate-500 font-mono mt-1 block">
            نسبة المصاريف: {safePct(data.operatingExpenses, data.totalRevenue)}
          </span>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/40 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800 text-xs mb-1.5 font-medium">
            <span>صافي الربح بعد الزكاة</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-emerald-950">
            {formatSAR(netIncomeAfterZakat)}
          </div>
          <span className="text-[11px] text-emerald-700 font-bold font-mono mt-1 block">
            هامش صافي الربح: {safeValPct(netMarginPct)}
          </span>
        </div>
      </div>

      {/* Customization & Filter Controls Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-600 font-bold ml-2">تخصيص الأعمدة:</span>
          
          <button
            onClick={() => setShowPercentage(!showPercentage)}
            className={`px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 ${
              showPercentage
                ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>النسبة المئوية (%)</span>
          </button>

          <button
            onClick={() => setShowAccountCode(!showAccountCode)}
            className={`px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 ${
              showAccountCode
                ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>رمز الحساب المحاسبي</span>
          </button>

          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 ${
              showNotes
                ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>الملاحظات والإيضاحات</span>
          </button>
        </div>

        {/* In-report search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث في بنود الدخل..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Main Income Statement Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                {showAccountCode && <th className="p-3.5 w-24 text-center">رمز الحساب</th>}
                <th className="p-3.5">البيان / البند المالي</th>
                {showNotes && <th className="p-3.5 text-slate-500 font-normal">إيضاحات محاسبية</th>}
                {showPercentage && <th className="p-3.5 text-center w-24">النسبة (%)</th>}
                <th className="p-3.5 text-left w-36">المبلغ (ر.س)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
              {/* SECTION 1: REVENUE */}
              <tr
                onClick={() => toggleSection('revenue')}
                className="bg-slate-100/70 font-bold text-slate-900 cursor-pointer hover:bg-slate-100 transition"
              >
                {showAccountCode && <td className="p-3 text-center font-mono text-emerald-700">4</td>}
                <td className="p-3 flex items-center gap-2">
                  {expandedSections.revenue ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  <span>1. الإيرادات التشغيلية والمبيعات</span>
                </td>
                {showNotes && <td className="p-3 text-slate-500 font-normal text-[11px]">مبيعات البضائع والخدمات</td>}
                {showPercentage && <td className="p-3 text-center font-mono text-slate-600">100.0%</td>}
                <td className="p-3 text-left font-mono text-emerald-700 font-bold">{formatSAR(data.totalRevenue)}</td>
              </tr>

              {expandedSections.revenue &&
                filteredRevenue.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition">
                    {showAccountCode && <td className="p-2.5 text-center font-mono text-slate-500">{item.code}</td>}
                    <td className="p-2.5 pr-8 text-slate-800">{item.name}</td>
                    {showNotes && <td className="p-2.5 text-slate-400 text-[11px]">إيراد مبيعات مباشر</td>}
                    {showPercentage && (
                      <td className="p-2.5 text-center font-mono text-slate-500 text-[11px]">
                        {safePct(item.amount, data.totalRevenue)}
                      </td>
                    )}
                    <td className="p-2.5 text-left font-mono text-slate-800">{formatSAR(item.amount)}</td>
                  </tr>
                ))}

              {/* SECTION 2: COGS */}
              <tr
                onClick={() => toggleSection('cogs')}
                className="bg-slate-100/70 font-bold text-slate-900 cursor-pointer hover:bg-slate-100 transition"
              >
                {showAccountCode && <td className="p-3 text-center font-mono text-rose-700">51</td>}
                <td className="p-3 flex items-center gap-2">
                  {expandedSections.cogs ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  <span>2. يخصم: تكلفة البضاعة المباعة (COGS)</span>
                </td>
                {showNotes && <td className="p-3 text-slate-500 font-normal text-[11px]">تكاليف المخزون المنصرف للبيع</td>}
                {showPercentage && (
                  <td className="p-3 text-center font-mono text-rose-600">
                    {safePct(data.cogs, data.totalRevenue)}
                  </td>
                )}
                <td className="p-3 text-left font-mono text-rose-600 font-bold">({formatSAR(data.cogs)})</td>
              </tr>

              {expandedSections.cogs && (
                <tr className="hover:bg-slate-50/70 transition">
                  {showAccountCode && <td className="p-2.5 text-center font-mono text-slate-500">5101</td>}
                  <td className="p-2.5 pr-8 text-slate-800">تكلفة البضاعة المباعة المباشرة</td>
                  {showNotes && <td className="p-2.5 text-slate-400 text-[11px]">حساب الأستاذ العام 5101</td>}
                  {showPercentage && (
                    <td className="p-2.5 text-center font-mono text-slate-500 text-[11px]">
                      {safePct(data.cogs, data.totalRevenue)}
                    </td>
                  )}
                  <td className="p-2.5 text-left font-mono text-slate-800">{formatSAR(data.cogs)}</td>
                </tr>
              )}

              {/* GROSS PROFIT HIGHLIGHT ROW */}
              <tr className="bg-emerald-50/60 font-bold text-emerald-950 border-y-2 border-emerald-300">
                {showAccountCode && <td className="p-3 text-center font-mono">-</td>}
                <td className="p-3 font-bold text-sm">مجمل الربح (Gross Profit)</td>
                {showNotes && <td className="p-3 text-emerald-800 text-[11px]">الإيرادات ناقص تكلفة البضاعة</td>}
                {showPercentage && <td className="p-3 text-center font-mono text-emerald-800 font-bold">{safeValPct(grossMarginPct)}</td>}
                <td className="p-3 text-left font-mono text-emerald-900 font-bold text-sm">{formatSAR(data.grossProfit)}</td>
              </tr>

              {/* SECTION 3: OPERATING EXPENSES */}
              <tr
                onClick={() => toggleSection('expenses')}
                className="bg-slate-100/70 font-bold text-slate-900 cursor-pointer hover:bg-slate-100 transition"
              >
                {showAccountCode && <td className="p-3 text-center font-mono text-amber-700">52</td>}
                <td className="p-3 flex items-center gap-2">
                  {expandedSections.expenses ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  <span>3. يخصم: المصروفات التشغيلية والإدارية والعمومية</span>
                </td>
                {showNotes && <td className="p-3 text-slate-500 font-normal text-[11px]">الرواتب، الإيجار، التسويق، الإهلاك، والمنافع</td>}
                {showPercentage && (
                  <td className="p-3 text-center font-mono text-amber-700">
                    {safePct(data.operatingExpenses, data.totalRevenue)}
                  </td>
                )}
                <td className="p-3 text-left font-mono text-amber-800 font-bold">({formatSAR(data.operatingExpenses)})</td>
              </tr>

              {expandedSections.expenses &&
                filteredExpenses.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition">
                    {showAccountCode && <td className="p-2.5 text-center font-mono text-slate-500">{item.code}</td>}
                    <td className="p-2.5 pr-8 text-slate-800">{item.name}</td>
                    {showNotes && <td className="p-2.5 text-slate-400 text-[11px]">مصروف تشغيلي / إداري</td>}
                    {showPercentage && (
                      <td className="p-2.5 text-center font-mono text-slate-500 text-[11px]">
                        {safePct(item.amount, data.totalRevenue)}
                      </td>
                    )}
                    <td className="p-2.5 text-left font-mono text-slate-800">{formatSAR(item.amount)}</td>
                  </tr>
                ))}

              {/* OPERATING PROFIT HIGHLIGHT ROW */}
              <tr className="bg-blue-50/60 font-bold text-blue-950 border-y border-blue-200">
                {showAccountCode && <td className="p-3 text-center font-mono">-</td>}
                <td className="p-3 font-bold">صافي الربح التشغيلي (Operating Income / EBIT)</td>
                {showNotes && <td className="p-3 text-blue-800 text-[11px]">مجمل الربح ناقص المصروفات التشغيلية</td>}
                {showPercentage && <td className="p-3 text-center font-mono text-blue-800 font-bold">{safeValPct(operatingMarginPct)}</td>}
                <td className="p-3 text-left font-mono text-blue-900 font-bold">{formatSAR(data.netOperatingProfit)}</td>
              </tr>

              {/* SECTION 4: OTHER INCOMES / EXPENSES */}
              <tr className="hover:bg-slate-50/70 transition">
                {showAccountCode && <td className="p-3 text-center font-mono text-slate-400">42/53</td>}
                <td className="p-3 pr-4 text-slate-700">4. إيرادات / (مصروفات) تمويلية وغير تشغيلية أخرى</td>
                {showNotes && <td className="p-3 text-slate-400 text-[11px]">عوائد بنكية، فروق عملة</td>}
                {showPercentage && <td className="p-3 text-center font-mono text-slate-400 text-[11px]">0.0%</td>}
                <td className="p-3 text-left font-mono text-slate-700">{formatSAR(data.otherIncomeExpense)}</td>
              </tr>

              {/* NET PROFIT BEFORE ZAKAT */}
              <tr className="bg-slate-100 font-bold text-slate-900 border-t border-slate-300">
                {showAccountCode && <td className="p-3 text-center font-mono">-</td>}
                <td className="p-3 font-bold">صافي الربح قبل الزكاة الشرعية وضريبة الدخل</td>
                {showNotes && <td className="p-3 text-slate-600 text-[11px]">وعاء حساب الزكاة والضريبة</td>}
                {showPercentage && <td className="p-3 text-center font-mono text-slate-700 font-bold">{safeValPct(netMarginPct)}</td>}
                <td className="p-3 text-left font-mono text-slate-900 font-bold">{formatSAR(data.netProfit)}</td>
              </tr>

              {/* ZAKAT ESTIMATE PROVISION */}
              <tr className="hover:bg-slate-50/70 transition text-amber-900">
                {showAccountCode && <td className="p-2.5 text-center font-mono text-slate-400">2102</td>}
                <td className="p-2.5 pr-8">يخصم: مخصص الزكاة الشرعية التقديري (2.5%)</td>
                {showNotes && <td className="p-2.5 text-slate-400 text-[11px]">هيئة الزكاة والضريبة والجمارك ZATCA</td>}
                {showPercentage && (
                  <td className="p-2.5 text-center font-mono text-amber-700 text-[11px]">
                    {safePct(estimatedZakat, data.totalRevenue)}
                  </td>
                )}
                <td className="p-2.5 text-left font-mono text-amber-800">({formatSAR(estimatedZakat)})</td>
              </tr>

              {/* FINAL COMPREHENSIVE NET PROFIT */}
              <tr className="bg-emerald-600 text-white font-bold text-sm border-t-2 border-emerald-700">
                {showAccountCode && <td className="p-3.5 text-center font-mono">3102</td>}
                <td className="p-3.5 font-bold">صافي الدخل الشامل للفترة (Comprehensive Net Income)</td>
                {showNotes && <td className="p-3.5 text-emerald-100 text-[11px] font-normal">يرحل إلى الأرباح المبقاة في حقوق الملكية</td>}
                {showPercentage && (
                  <td className="p-3.5 text-center font-mono text-emerald-100">
                    {safePct(netIncomeAfterZakat, data.totalRevenue)}
                  </td>
                )}
                <td className="p-3.5 text-left font-mono font-bold text-base">{formatSAR(netIncomeAfterZakat)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Accounting Footnotes & Compliance Footer */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-1.5">
        <div className="font-bold text-slate-800 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-emerald-600" />
          <span>إيضاحات حول السياسات المحاسبية المتبعة:</span>
        </div>
        <p className="leading-relaxed text-[11px] text-slate-500">
          - تم إعداد قائمة الدخل وفقاً للمعايير الدولية للتقرير المالي المعتمدة في المملكة العربية السعودية (SOCPA IFRS).
          - يتم الاعتراف بالإيرادات عند تحقق نقطة البيع وتسليم السلع أو الخدمات للعملاء وفقاً لمتطلبات معيار IFRS 15.
          - تكلفة البضاعة المباعة محتسبة بنظام الجرد المستمر وحسب طريقة الوارد أولاً يصادر أولاً (FIFO).
        </p>
      </div>
    </div>
  );
};
