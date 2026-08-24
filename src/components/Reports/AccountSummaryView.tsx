import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { formatSAR } from '../../utils/currency';
import {
  ListFilter,
  Search,
  BookOpen,
  ArrowUpDown,
  Download,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Layers,
} from 'lucide-react';
import { AccountType } from '../../types/accounting';

interface AccountSummaryViewProps {
  startDate?: string;
  endDate?: string;
  periodLabel: string;
}

export const AccountSummaryView: React.FC<AccountSummaryViewProps> = ({
  startDate,
  endDate,
  periodLabel,
}) => {
  const { accounts, getAccountStatement } = useAccounting();

  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyWithActivity, setOnlyWithActivity] = useState(false);

  // Compute stats for each account
  const accountRows = accounts
    .filter((a) => a.isTransactional)
    .map((acc) => {
      let openingBalance = 0;
      if (startDate) {
        const d = new Date(startDate);
        d.setDate(d.getDate() - 1);
        const dayBefore = d.toISOString().split('T')[0];
        const priorStmt = getAccountStatement(acc.id, undefined, dayBefore);
        openingBalance = priorStmt.closingBalance;
      }

      const stmt = getAccountStatement(acc.id, startDate, endDate);
      const periodDebit = stmt.totalDebit;
      const periodCredit = stmt.totalCredit;
      const netMovement = acc.nature === 'debit' ? (periodDebit - periodCredit) : (periodCredit - periodDebit);
      const closingBalance = startDate ? openingBalance + netMovement : stmt.closingBalance;

      return {
        account: acc,
        openingBalance,
        periodDebit,
        periodCredit,
        netMovement,
        closingBalance,
        hasActivity: periodDebit > 0 || periodCredit > 0 || Math.abs(closingBalance) > 0,
      };
    });

  // Filter accounts
  const filteredRows = accountRows.filter((row) => {
    if (selectedType !== 'all' && row.account.type !== selectedType) return false;
    if (onlyWithActivity && !row.hasActivity) return false;
    if (
      searchTerm &&
      !row.account.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !row.account.code.includes(searchTerm)
    ) {
      return false;
    }
    return true;
  });

  // Aggregates
  const totalOpening = filteredRows.reduce((sum, r) => sum + r.openingBalance, 0);
  const totalDebit = filteredRows.reduce((sum, r) => sum + r.periodDebit, 0);
  const totalCredit = filteredRows.reduce((sum, r) => sum + r.periodCredit, 0);
  const totalClosing = filteredRows.reduce((sum, r) => sum + r.closingBalance, 0);

  const getAccountTypeLabel = (type: AccountType) => {
    switch (type) {
      case 'asset':
        return { label: 'أصل', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'liability':
        return { label: 'التزام', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'equity':
        return { label: 'حقوق ملكية', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'revenue':
        return { label: 'إيراد', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'expense':
        return { label: 'مصروف', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: 'حساب', color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6 text-right">
      {/* Bento Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 no-print">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>عدد الحسابات المشمولة</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-slate-900">
            {filteredRows.length} حساب
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            من إجمالي {accountRows.length} حساب تحليلي
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>إجمالي حركات المدين</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-blue-900">
            {formatSAR(totalDebit)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            حركات القيود خلال الفترة
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>إجمالي حركات الدائن</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-purple-900">
            {formatSAR(totalCredit)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            حركات القيود خلال الفترة
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>توازن الحركات (Debit = Credit)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-emerald-700">
            {Math.abs(totalDebit - totalCredit) < 0.05 ? 'متطابق وموزون' : 'يوجد فارق'}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            فارق الحركة: {formatSAR(Math.abs(totalDebit - totalCredit))}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-600 font-bold ml-1">تصنيف الحسابات:</span>
          {[
            { id: 'all', label: 'كافة الحسابات' },
            { id: 'asset', label: 'الأصول (1)' },
            { id: 'liability', label: 'الالتزامات (2)' },
            { id: 'equity', label: 'حقوق الملكية (3)' },
            { id: 'revenue', label: 'الإيرادات (4)' },
            { id: 'expense', label: 'المصروفات (5)' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedType(cat.id)}
              className={`px-2.5 py-1 rounded-lg border transition ${
                selectedType === cat.id
                  ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}

          <label className="flex items-center gap-1.5 mr-2 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={onlyWithActivity}
              onChange={(e) => setOnlyWithActivity(e.target.checked)}
              className="accent-emerald-600 rounded"
            />
            <span>الحسابات ذات الحركة فقط</span>
          </label>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم أو رمز الحساب..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3 w-20 text-center">رمز الحساب</th>
                <th className="p-3">اسم الحساب المحاسبي</th>
                <th className="p-3 text-center w-20">النوع</th>
                <th className="p-3 text-center w-20">طبيعة الحساب</th>
                <th className="p-3 text-left w-28">الرصيد الافتتاحي</th>
                <th className="p-3 text-left w-28">مدين (حركات)</th>
                <th className="p-3 text-left w-28">دائن (حركات)</th>
                <th className="p-3 text-left w-28">صافي الحركة</th>
                <th className="p-3 text-left w-32">الرصيد الختامي</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    لا توجد حسابات مطابقة لمعايير البحث والتصفية المحددة.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const typeBadge = getAccountTypeLabel(row.account.type);
                  return (
                    <tr key={row.account.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 text-center font-mono font-bold text-slate-800">{row.account.code}</td>
                      <td className="p-3 font-medium text-slate-900">{row.account.nameAr}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeBadge.color}`}>
                          {typeBadge.label}
                        </span>
                      </td>
                      <td className="p-3 text-center text-[11px] font-medium text-slate-500">
                        {row.account.nature === 'debit' ? 'مدين بطبيعته' : 'دائن بطبيعته'}
                      </td>
                      <td className="p-3 text-left font-mono text-slate-600">{formatSAR(row.openingBalance)}</td>
                      <td className="p-3 text-left font-mono font-medium text-blue-700">{formatSAR(row.periodDebit)}</td>
                      <td className="p-3 text-left font-mono font-medium text-purple-700">{formatSAR(row.periodCredit)}</td>
                      <td className={`p-3 text-left font-mono font-bold ${row.netMovement >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {row.netMovement >= 0 ? `+${formatSAR(row.netMovement)}` : formatSAR(row.netMovement)}
                      </td>
                      <td className="p-3 text-left font-mono font-bold text-slate-900">{formatSAR(row.closingBalance)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Total Footer Row */}
            <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
              <tr>
                <td colSpan={4} className="p-3 text-right">
                  الإجمالي العام لحسابات التقرير ({filteredRows.length} حساب)
                </td>
                <td className="p-3 text-left font-mono">{formatSAR(totalOpening)}</td>
                <td className="p-3 text-left font-mono text-blue-900">{formatSAR(totalDebit)}</td>
                <td className="p-3 text-left font-mono text-purple-900">{formatSAR(totalCredit)}</td>
                <td className="p-3 text-left font-mono text-emerald-900">{formatSAR(totalDebit - totalCredit)}</td>
                <td className="p-3 text-left font-mono text-slate-950 text-sm">{formatSAR(totalClosing)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
