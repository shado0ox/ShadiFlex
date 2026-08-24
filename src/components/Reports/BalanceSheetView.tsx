import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { formatSAR } from '../../utils/currency';
import {
  Scale,
  Percent,
  Hash,
  FileText,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  AlertCircle,
  Building2,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

interface BalanceSheetViewProps {
  asOfDate?: string;
  periodLabel: string;
}

export const BalanceSheetView: React.FC<BalanceSheetViewProps> = ({
  asOfDate,
  periodLabel,
}) => {
  const { getBalanceSheet, companySettings } = useAccounting();
  const data = getBalanceSheet(asOfDate);

  // Customization Toggles
  const [showPercentage, setShowPercentage] = useState(true);
  const [showAccountCode, setShowAccountCode] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    currentAssets: true,
    nonCurrentAssets: true,
    currentLiabilities: true,
    nonCurrentLiabilities: true,
    equity: true,
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

  const filterAccounts = (accs: any[]) => {
    return accs.filter(
      (a) =>
        a.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const currentAssetAccounts = filterAccounts(data.assetAccounts.filter((a) => a.code.startsWith('11')));
  const nonCurrentAssetAccounts = filterAccounts(data.assetAccounts.filter((a) => !a.code.startsWith('11')));
  const currentLiabilityAccounts = filterAccounts(data.liabilityAccounts.filter((a) => a.code.startsWith('21')));
  const nonCurrentLiabilityAccounts = filterAccounts(data.liabilityAccounts.filter((a) => !a.code.startsWith('21')));
  const equityAccounts = filterAccounts(data.equityAccounts);

  const totalLiabilitiesAndEquity = data.totalLiabilities + data.retainedEarningsWithCurrentProfit;

  return (
    <div className="space-y-6 text-right">
      {/* Top Status & Equilibrium Banner */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition shadow-xs ${
          data.isBalanced
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            : 'bg-rose-50/70 border-rose-200 text-rose-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              data.isBalanced ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}
          >
            {data.isBalanced ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          </div>
          <div>
            <h4 className="font-bold text-sm">
              {data.isBalanced ? 'الميزانية العمومية متزنة تماماً (100% Balanced)' : 'تنبيه: يوجد فارق محاسبي في التوازن'}
            </h4>
            <p className="text-xs opacity-80 mt-0.5 font-sans">
              معادلة المركز المالي: إجمالي الأصول ({formatSAR(data.totalAssets)}) = إجمالي الالتزامات وحقوق الملكية ({formatSAR(totalLiabilitiesAndEquity)})
            </p>
          </div>
        </div>

        <div className="bg-white/80 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2">
          <span className="text-slate-500">الفارق:</span>
          <span className={data.isBalanced ? 'text-emerald-700' : 'text-rose-700'}>
            {formatSAR(data.difference)}
          </span>
        </div>
      </div>

      {/* Bento Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 no-print">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>إجمالي الأصول (Assets)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-slate-900">
            {formatSAR(data.totalAssets)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            متداولة: {formatSAR(data.currentAssets)}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>الأصول غير المتداولة (الثابتة)</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-blue-900">
            {formatSAR(data.nonCurrentAssets)}
          </div>
          <span className="text-[11px] text-slate-500 font-mono mt-1 block">
            {safePct(data.nonCurrentAssets, data.totalAssets)} من الأصول
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>إجمالي الالتزامات (Liabilities)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-amber-900">
            {formatSAR(data.totalLiabilities)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            التزامات قصيرة: {formatSAR(data.currentLiabilities)}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>حقوق الملكية والأرباح (Equity)</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-purple-900">
            {formatSAR(data.retainedEarningsWithCurrentProfit)}
          </div>
          <span className="text-[11px] text-slate-500 font-mono mt-1 block">
            رأس المال والأرباح المبقاة
          </span>
        </div>
      </div>

      {/* Customization Toolbar */}
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
            <span>النسبة من إجمالي الأصول (%)</span>
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
            <span>الإيضاحات</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث في بنود المركز المالي..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Main Balance Sheet Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                {showAccountCode && <th className="p-3.5 w-24 text-center">رمز الحساب</th>}
                <th className="p-3.5">البند المحاسبي / الحساب</th>
                {showNotes && <th className="p-3.5 text-slate-500 font-normal">إيضاحات</th>}
                {showPercentage && <th className="p-3.5 text-center w-24">النسبة (%)</th>}
                <th className="p-3.5 text-left w-36">الرصيد (ر.س)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
              {/* === SECTION 1: ASSETS === */}
              <tr className="bg-emerald-700 text-white font-bold">
                {showAccountCode && <td className="p-3 text-center font-mono">1</td>}
                <td colSpan={showNotes ? (showPercentage ? 3 : 2) : showPercentage ? 2 : 1} className="p-3 text-sm">
                  أولاً: الأصول (ASSETS)
                </td>
                <td className="p-3 text-left font-mono font-bold text-sm">{formatSAR(data.totalAssets)}</td>
              </tr>

              {/* 1.1 Current Assets */}
              <tr
                onClick={() => toggleSection('currentAssets')}
                className="bg-slate-100/80 font-bold text-slate-900 cursor-pointer hover:bg-slate-100 transition"
              >
                {showAccountCode && <td className="p-2.5 text-center font-mono text-emerald-700">11</td>}
                <td className="p-2.5 flex items-center gap-2">
                  {expandedSections.currentAssets ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  <span>1.1 الأصول المتداولة (Current Assets)</span>
                </td>
                {showNotes && <td className="p-2.5 text-slate-500 font-normal text-[11px]">النقدية، البنوك، المدينون، والمخزون</td>}
                {showPercentage && (
                  <td className="p-2.5 text-center font-mono text-slate-600">
                    {safePct(data.currentAssets, data.totalAssets)}
                  </td>
                )}
                <td className="p-2.5 text-left font-mono font-bold text-emerald-800">{formatSAR(data.currentAssets)}</td>
              </tr>

              {expandedSections.currentAssets &&
                currentAssetAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/70 transition">
                    {showAccountCode && <td className="p-2.5 text-center font-mono text-slate-500">{acc.code}</td>}
                    <td className="p-2.5 pr-8 text-slate-800">{acc.nameAr}</td>
                    {showNotes && <td className="p-2.5 text-slate-400 text-[11px]">أصل متداول</td>}
                    {showPercentage && (
                      <td className="p-2.5 text-center font-mono text-slate-500 text-[11px]">
                        {safePct(acc.balance, data.totalAssets)}
                      </td>
                    )}
                    <td className="p-2.5 text-left font-mono text-slate-800">{formatSAR(acc.balance)}</td>
                  </tr>
                ))}

              {/* 1.2 Non-Current Assets */}
              <tr
                onClick={() => toggleSection('nonCurrentAssets')}
                className="bg-slate-100/80 font-bold text-slate-900 cursor-pointer hover:bg-slate-100 transition"
              >
                {showAccountCode && <td className="p-2.5 text-center font-mono text-blue-700">12</td>}
                <td className="p-2.5 flex items-center gap-2">
                  {expandedSections.nonCurrentAssets ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  <span>1.2 الأصول غير المتداولة (الأصول الثابتة)</span>
                </td>
                {showNotes && <td className="p-2.5 text-slate-500 font-normal text-[11px]">المعدات، التجهيزات، والمركبات</td>}
                {showPercentage && (
                  <td className="p-2.5 text-center font-mono text-slate-600">
                    {safePct(data.nonCurrentAssets, data.totalAssets)}
                  </td>
                )}
                <td className="p-2.5 text-left font-mono font-bold text-blue-800">{formatSAR(data.nonCurrentAssets)}</td>
              </tr>

              {expandedSections.nonCurrentAssets &&
                nonCurrentAssetAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/70 transition">
                    {showAccountCode && <td className="p-2.5 text-center font-mono text-slate-500">{acc.code}</td>}
                    <td className="p-2.5 pr-8 text-slate-800">{acc.nameAr}</td>
                    {showNotes && <td className="p-2.5 text-slate-400 text-[11px]">أصل ثابت بالقيمة الدفترية</td>}
                    {showPercentage && (
                      <td className="p-2.5 text-center font-mono text-slate-500 text-[11px]">
                        {safePct(acc.balance, data.totalAssets)}
                      </td>
                    )}
                    <td className="p-2.5 text-left font-mono text-slate-800">{formatSAR(acc.balance)}</td>
                  </tr>
                ))}

              {/* TOTAL ASSETS ROW */}
              <tr className="bg-emerald-50 font-bold text-emerald-950 border-y-2 border-emerald-300">
                {showAccountCode && <td className="p-3 text-center font-mono">-</td>}
                <td className="p-3 text-sm">مجموع الأصول (Total Assets)</td>
                {showNotes && <td className="p-3 text-emerald-800 text-[11px]">الأصول المتداولة + غير المتداولة</td>}
                {showPercentage && <td className="p-3 text-center font-mono text-emerald-800 font-bold">100.0%</td>}
                <td className="p-3 text-left font-mono text-emerald-900 font-bold text-sm">{formatSAR(data.totalAssets)}</td>
              </tr>

              {/* === SECTION 2: LIABILITIES === */}
              <tr className="bg-slate-800 text-white font-bold">
                {showAccountCode && <td className="p-3 text-center font-mono">2</td>}
                <td colSpan={showNotes ? (showPercentage ? 3 : 2) : showPercentage ? 2 : 1} className="p-3 text-sm">
                  ثانياً: الالتزامات والخصوم (LIABILITIES)
                </td>
                <td className="p-3 text-left font-mono font-bold text-sm">{formatSAR(data.totalLiabilities)}</td>
              </tr>

              {/* 2.1 Current Liabilities */}
              <tr
                onClick={() => toggleSection('currentLiabilities')}
                className="bg-slate-100/80 font-bold text-slate-900 cursor-pointer hover:bg-slate-100 transition"
              >
                {showAccountCode && <td className="p-2.5 text-center font-mono text-amber-700">21</td>}
                <td className="p-2.5 flex items-center gap-2">
                  {expandedSections.currentLiabilities ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  <span>2.1 الالتزامات المتداولة (قصيرة الأجل)</span>
                </td>
                {showNotes && <td className="p-2.5 text-slate-500 font-normal text-[11px]">الموردون، ضريبة ZATCA، والمستحقات</td>}
                {showPercentage && (
                  <td className="p-2.5 text-center font-mono text-slate-600">
                    {safePct(data.currentLiabilities, data.totalAssets)}
                  </td>
                )}
                <td className="p-2.5 text-left font-mono font-bold text-amber-800">{formatSAR(data.currentLiabilities)}</td>
              </tr>

              {expandedSections.currentLiabilities &&
                currentLiabilityAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/70 transition">
                    {showAccountCode && <td className="p-2.5 text-center font-mono text-slate-500">{acc.code}</td>}
                    <td className="p-2.5 pr-8 text-slate-800">{acc.nameAr}</td>
                    {showNotes && <td className="p-2.5 text-slate-400 text-[11px]">التزام متداول قصير الأجل</td>}
                    {showPercentage && (
                      <td className="p-2.5 text-center font-mono text-slate-500 text-[11px]">
                        {safePct(acc.balance, data.totalAssets)}
                      </td>
                    )}
                    <td className="p-2.5 text-left font-mono text-slate-800">{formatSAR(acc.balance)}</td>
                  </tr>
                ))}

              {/* 2.2 Non-Current Liabilities */}
              <tr
                onClick={() => toggleSection('nonCurrentLiabilities')}
                className="bg-slate-100/80 font-bold text-slate-900 cursor-pointer hover:bg-slate-100 transition"
              >
                {showAccountCode && <td className="p-2.5 text-center font-mono text-slate-700">22</td>}
                <td className="p-2.5 flex items-center gap-2">
                  {expandedSections.nonCurrentLiabilities ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  <span>2.2 الالتزامات غير المتداولة (طويلة الأجل)</span>
                </td>
                {showNotes && <td className="p-2.5 text-slate-500 font-normal text-[11px]">مخصص نهاية الخدمة وقروض طويلة الأجل</td>}
                {showPercentage && (
                  <td className="p-2.5 text-center font-mono text-slate-600">
                    {safePct(data.nonCurrentLiabilities, data.totalAssets)}
                  </td>
                )}
                <td className="p-2.5 text-left font-mono font-bold text-slate-800">{formatSAR(data.nonCurrentLiabilities)}</td>
              </tr>

              {expandedSections.nonCurrentLiabilities &&
                nonCurrentLiabilityAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/70 transition">
                    {showAccountCode && <td className="p-2.5 text-center font-mono text-slate-500">{acc.code}</td>}
                    <td className="p-2.5 pr-8 text-slate-800">{acc.nameAr}</td>
                    {showNotes && <td className="p-2.5 text-slate-400 text-[11px]">التزام طويل الأجل</td>}
                    {showPercentage && (
                      <td className="p-2.5 text-center font-mono text-slate-500 text-[11px]">
                        {safePct(acc.balance, data.totalAssets)}
                      </td>
                    )}
                    <td className="p-2.5 text-left font-mono text-slate-800">{formatSAR(acc.balance)}</td>
                  </tr>
                ))}

              {/* === SECTION 3: EQUITY === */}
              <tr className="bg-purple-900 text-white font-bold">
                {showAccountCode && <td className="p-3 text-center font-mono">3</td>}
                <td colSpan={showNotes ? (showPercentage ? 3 : 2) : showPercentage ? 2 : 1} className="p-3 text-sm">
                  ثالثاً: حقوق الملكية (EQUITY)
                </td>
                <td className="p-3 text-left font-mono font-bold text-sm">
                  {formatSAR(data.retainedEarningsWithCurrentProfit)}
                </td>
              </tr>

              {equityAccounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-50/70 transition">
                  {showAccountCode && <td className="p-2.5 text-center font-mono text-purple-700">{acc.code}</td>}
                  <td className="p-2.5 pr-8 text-slate-800">{acc.nameAr}</td>
                  {showNotes && <td className="p-2.5 text-slate-400 text-[11px]">رأس مال / أرباح مبقاة مرحلة</td>}
                  {showPercentage && (
                    <td className="p-2.5 text-center font-mono text-slate-500 text-[11px]">
                      {safePct(acc.balance, data.totalAssets)}
                    </td>
                  )}
                  <td className="p-2.5 text-left font-mono text-slate-800">{formatSAR(acc.balance)}</td>
                </tr>
              ))}

              {/* Retained Earnings / Current Period Profit Row */}
              <tr className="hover:bg-slate-50/70 transition bg-purple-50/30">
                {showAccountCode && <td className="p-2.5 text-center font-mono text-purple-700">3102+</td>}
                <td className="p-2.5 pr-8 text-purple-950 font-medium">صافي أرباح / (خسائر) الفترة الحالية</td>
                {showNotes && <td className="p-2.5 text-purple-700 text-[11px]">من واقع قائمة الدخل التراكمية</td>}
                {showPercentage && (
                  <td className="p-2.5 text-center font-mono text-purple-700 text-[11px]">
                    {safePct(data.retainedEarningsWithCurrentProfit - data.totalEquity, data.totalAssets)}
                  </td>
                )}
                <td className="p-2.5 text-left font-mono text-purple-950 font-bold">
                  {formatSAR(data.retainedEarningsWithCurrentProfit - data.totalEquity)}
                </td>
              </tr>

              {/* TOTAL LIABILITIES & EQUITY ROW */}
              <tr className="bg-slate-900 text-white font-bold text-sm border-t-2 border-slate-900">
                {showAccountCode && <td className="p-3.5 text-center font-mono">2+3</td>}
                <td className="p-3.5 font-bold">إجمالي الالتزامات وحقوق الملكية (Total Liabilities & Equity)</td>
                {showNotes && <td className="p-3.5 text-slate-300 text-[11px] font-normal">مطابق لمجموع الأصول</td>}
                {showPercentage && <td className="p-3.5 text-center font-mono text-slate-300">100.0%</td>}
                <td className="p-3.5 text-left font-mono font-bold text-base">{formatSAR(totalLiabilitiesAndEquity)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance Note */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-1.5">
        <div className="font-bold text-slate-800 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-emerald-600" />
          <span>إيضاحات المركز المالي وفقاً لمعيار المحاسبة الدولي IAS 1:</span>
        </div>
        <p className="leading-relaxed text-[11px] text-slate-500">
          - تُعرض بنود المركز المالي مصنفة حسب السيولة إلى متداولة وغير متداولة.
          - النقد وما في حكمه يتضمن الأرصدة النقدية في الخزينة والحسابات الجارية لدى البنوك المحلية السعودية.
          - الذمم المدينة والمدينون التجاريون معروضة بالصافي بعد استبعاد مخصص الخسائر الائتمانية المتوقعة (ECL).
        </p>
      </div>
    </div>
  );
};
