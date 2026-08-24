import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { formatSAR } from '../../utils/currency';
import {
  Banknote,
  TrendingUp,
  Building2,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Hash,
  FileText,
  Search,
  CheckCircle2,
  Landmark,
} from 'lucide-react';

interface CashFlowViewProps {
  startDate?: string;
  endDate?: string;
  periodLabel: string;
}

export const CashFlowView: React.FC<CashFlowViewProps> = ({
  startDate,
  endDate,
  periodLabel,
}) => {
  const { getCashFlowStatement } = useAccounting();
  const data = getCashFlowStatement(startDate, endDate);

  const [showAccountCode, setShowAccountCode] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const filterItems = (items: Array<{ name: string; amount: number; notes?: string; code?: string }>) => {
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.code && item.code.includes(searchTerm))
    );
  };

  const filteredOperating = filterItems(data.operatingActivities.details);
  const filteredInvesting = filterItems(data.investingActivities.details);
  const filteredFinancing = filterItems(data.financingActivities.details);

  return (
    <div className="space-y-6 text-right">
      {/* Bento Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 no-print">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>التدفقات التشغيلية (Operating)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-base sm:text-lg font-bold font-mono ${data.operatingActivities.netCashFromOperating >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatSAR(data.operatingActivities.netCashFromOperating)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {data.operatingActivities.netCashFromOperating >= 0 ? 'فائض نقدي تشغيلي' : 'عجز نقدي تشغيلي'}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>التدفقات الاستثمارية (Investing)</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-base sm:text-lg font-bold font-mono ${data.investingActivities.netCashFromInvesting >= 0 ? 'text-blue-700' : 'text-slate-800'}`}>
            {formatSAR(data.investingActivities.netCashFromInvesting)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            استحواذات رأسمالية ومعدات
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>التدفقات التمويلية (Financing)</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-base sm:text-lg font-bold font-mono ${data.financingActivities.netCashFromFinancing >= 0 ? 'text-purple-700' : 'text-slate-800'}`}>
            {formatSAR(data.financingActivities.netCashFromFinancing)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            رأس المال ومسحوبات الشركاء
          </span>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/40 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800 text-xs mb-1.5 font-medium">
            <span>رصيد النقدية الختامي</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-emerald-950">
            {formatSAR(data.summary.endingCash)}
          </div>
          <span className="text-[11px] text-emerald-700 font-mono mt-1 block">
            صافي التغير: {data.summary.netCashChange >= 0 ? `+${formatSAR(data.summary.netCashChange)}` : formatSAR(data.summary.netCashChange)}
          </span>
        </div>
      </div>

      {/* Customization Toolbar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-600 font-bold ml-2">تخصيص العرض:</span>
          
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
            <span>الملاحظات التحليلية</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث في بنود التدفقات النقدية..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Main Cash Flow Statement Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                {showAccountCode && <th className="p-3.5 w-24 text-center">رمز الحساب</th>}
                <th className="p-3.5">البيان / حركة التدفق النقدي</th>
                {showNotes && <th className="p-3.5 text-slate-500 font-normal">إيضاحات وتحليل الأثر النقدي</th>}
                <th className="p-3.5 text-left w-36">المبلغ (ر.س)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
              {/* SECTION 1: OPERATING ACTIVITIES */}
              <tr className="bg-emerald-700 text-white font-bold">
                {showAccountCode && <td className="p-3 text-center font-mono">1</td>}
                <td colSpan={showNotes ? 2 : 1} className="p-3 text-sm">
                  أولاً: التدفقات النقدية من الأنشطة التشغيلية (Operating Activities)
                </td>
                <td className="p-3 text-left font-mono font-bold text-sm">
                  {formatSAR(data.operatingActivities.netCashFromOperating)}
                </td>
              </tr>

              {filteredOperating.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition">
                  {showAccountCode && (
                    <td className="p-2.5 text-center font-mono text-slate-500">{item.code || '-'}</td>
                  )}
                  <td className="p-2.5 pr-8 text-slate-800 font-medium">{item.name}</td>
                  {showNotes && (
                    <td className="p-2.5 text-slate-500 text-[11px] font-normal">{item.notes || '-'}</td>
                  )}
                  <td
                    className={`p-2.5 text-left font-mono font-bold ${
                      item.amount < 0 ? 'text-rose-700' : 'text-slate-800'
                    }`}
                  >
                    {item.amount < 0 ? `(${formatSAR(Math.abs(item.amount))})` : formatSAR(item.amount)}
                  </td>
                </tr>
              ))}

              {/* NET CASH FROM OPERATING */}
              <tr className="bg-emerald-50 font-bold text-emerald-950 border-y border-emerald-200">
                {showAccountCode && <td className="p-3 text-center font-mono">-</td>}
                <td className="p-3 font-bold text-sm">صافي النقد المتولد من / (المستخدم في) الأنشطة التشغيلية</td>
                {showNotes && <td className="p-3 text-emerald-800 text-[11px]">مجموع التدفقات التشغيلية والتغير في رأس المال العامل</td>}
                <td className="p-3 text-left font-mono font-bold text-sm text-emerald-900">
                  {formatSAR(data.operatingActivities.netCashFromOperating)}
                </td>
              </tr>

              {/* SECTION 2: INVESTING ACTIVITIES */}
              <tr className="bg-blue-800 text-white font-bold">
                {showAccountCode && <td className="p-3 text-center font-mono">2</td>}
                <td colSpan={showNotes ? 2 : 1} className="p-3 text-sm">
                  ثانياً: التدفقات النقدية من الأنشطة الاستثمارية (Investing Activities)
                </td>
                <td className="p-3 text-left font-mono font-bold text-sm">
                  {formatSAR(data.investingActivities.netCashFromInvesting)}
                </td>
              </tr>

              {filteredInvesting.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition">
                  {showAccountCode && (
                    <td className="p-2.5 text-center font-mono text-slate-500">{item.code || '12'}</td>
                  )}
                  <td className="p-2.5 pr-8 text-slate-800 font-medium">{item.name}</td>
                  {showNotes && (
                    <td className="p-2.5 text-slate-500 text-[11px] font-normal">{item.notes || '-'}</td>
                  )}
                  <td
                    className={`p-2.5 text-left font-mono font-bold ${
                      item.amount < 0 ? 'text-rose-700' : 'text-slate-800'
                    }`}
                  >
                    {item.amount < 0 ? `(${formatSAR(Math.abs(item.amount))})` : formatSAR(item.amount)}
                  </td>
                </tr>
              ))}

              {/* NET CASH FROM INVESTING */}
              <tr className="bg-blue-50 font-bold text-blue-950 border-y border-blue-200">
                {showAccountCode && <td className="p-3 text-center font-mono">-</td>}
                <td className="p-3 font-bold text-sm">صافي النقد المستخدم في الأنشطة الاستثمارية</td>
                {showNotes && <td className="p-3 text-blue-800 text-[11px]">شراء وبيع أصول وممتلكات رأسمالية</td>}
                <td className="p-3 text-left font-mono font-bold text-sm text-blue-900">
                  {formatSAR(data.investingActivities.netCashFromInvesting)}
                </td>
              </tr>

              {/* SECTION 3: FINANCING ACTIVITIES */}
              <tr className="bg-purple-900 text-white font-bold">
                {showAccountCode && <td className="p-3 text-center font-mono">3</td>}
                <td colSpan={showNotes ? 2 : 1} className="p-3 text-sm">
                  ثالثاً: التدفقات النقدية من الأنشطة التمويلية (Financing Activities)
                </td>
                <td className="p-3 text-left font-mono font-bold text-sm">
                  {formatSAR(data.financingActivities.netCashFromFinancing)}
                </td>
              </tr>

              {filteredFinancing.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition">
                  {showAccountCode && (
                    <td className="p-2.5 text-center font-mono text-slate-500">{item.code || '31/22'}</td>
                  )}
                  <td className="p-2.5 pr-8 text-slate-800 font-medium">{item.name}</td>
                  {showNotes && (
                    <td className="p-2.5 text-slate-500 text-[11px] font-normal">{item.notes || '-'}</td>
                  )}
                  <td
                    className={`p-2.5 text-left font-mono font-bold ${
                      item.amount < 0 ? 'text-rose-700' : 'text-slate-800'
                    }`}
                  >
                    {item.amount < 0 ? `(${formatSAR(Math.abs(item.amount))})` : formatSAR(item.amount)}
                  </td>
                </tr>
              ))}

              {/* NET CASH FROM FINANCING */}
              <tr className="bg-purple-50 font-bold text-purple-950 border-y border-purple-200">
                {showAccountCode && <td className="p-3 text-center font-mono">-</td>}
                <td className="p-3 font-bold text-sm">صافي النقد من الأنشطة التمويلية</td>
                {showNotes && <td className="p-3 text-purple-800 text-[11px]">حركات رأس المال والمسحوبات والقروض</td>}
                <td className="p-3 text-left font-mono font-bold text-sm text-purple-900">
                  {formatSAR(data.financingActivities.netCashFromFinancing)}
                </td>
              </tr>

              {/* === SECTION 4: CASH RECONCILIATION SUMMARY === */}
              <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                {showAccountCode && <td className="p-3 text-center font-mono">-</td>}
                <td className="p-3 font-bold">صافي الزيادة / (النقص) في النقدية وما في حكمها</td>
                {showNotes && <td className="p-3 text-slate-600 text-[11px]">تشغيلي + استثماري + تمويلي</td>}
                <td className="p-3 text-left font-mono font-bold">
                  {formatSAR(data.summary.netCashChange)}
                </td>
              </tr>

              <tr className="hover:bg-slate-50/70 transition">
                {showAccountCode && <td className="p-2.5 text-center font-mono text-slate-400">1101</td>}
                <td className="p-2.5 pr-8">يضاف: رصيد النقدية وما في حكمها في بداية الفترة</td>
                {showNotes && <td className="p-2.5 text-slate-400 text-[11px]">الرصيد المرحل من الفترة السابقة</td>}
                <td className="p-2.5 text-left font-mono text-slate-700 font-medium">
                  {formatSAR(data.summary.beginningCash)}
                </td>
              </tr>

              {/* FINAL ENDING CASH */}
              <tr className="bg-slate-900 text-white font-bold text-sm border-t-2 border-slate-900">
                {showAccountCode && <td className="p-3.5 text-center font-mono">1101</td>}
                <td className="p-3.5 font-bold">رصيد النقدية وما في حكمها في نهاية الفترة</td>
                {showNotes && <td className="p-3.5 text-slate-300 text-[11px] font-normal">مطابق لمركز النقدية بالميزانية</td>}
                <td className="p-3.5 text-left font-mono font-bold text-base text-emerald-400">
                  {formatSAR(data.summary.endingCash)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash Accounts Distribution Sub-table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-emerald-600" />
            <h4 className="font-bold text-xs text-slate-900">
              توزيع وتفصيل أرصدة النقدية والحسابات البنكية في نهاية الفترة
            </h4>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            الإجمالي: {formatSAR(data.summary.endingCash)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.summary.cashAccountsBreakdown.map((item, idx) => (
            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-[11px] text-slate-500 font-mono mb-1">{item.code}</div>
              <div className="font-bold text-xs text-slate-800 mb-1">{item.name}</div>
              <div className="text-sm font-mono font-bold text-emerald-800">
                {formatSAR(item.balance)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Standard Footnote */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-1.5">
        <div className="font-bold text-slate-800 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-emerald-600" />
          <span>إيضاحات قائمة التدفقات النقدية وفقاً للمعيار الدولي IAS 7 و SOCPA:</span>
        </div>
        <p className="leading-relaxed text-[11px] text-slate-500">
          - تم إعداد التدفقات النقدية من الأنشطة التشغيلية باتباع **الطريقة غير المباشرة (Indirect Method)** بتسوية صافي الربح للتغيرات في رأس المال العامل والبنود غير النقدية.
          - النقدية وما في حكمها تشمل الخزينة النقدية والحسابات الجارية لدى البنوك السعودية ونقاط البيع مدى.
        </p>
      </div>
    </div>
  );
};
