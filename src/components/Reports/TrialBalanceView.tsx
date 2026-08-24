import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { formatSAR } from '../../utils/currency';
import { Scale, CheckCircle2, AlertCircle, Search, Hash } from 'lucide-react';

interface TrialBalanceViewProps {
  startDate?: string;
  endDate?: string;
  periodLabel: string;
}

export const TrialBalanceView: React.FC<TrialBalanceViewProps> = ({
  startDate,
  endDate,
  periodLabel,
}) => {
  const { getTrialBalance } = useAccounting();
  const rows = getTrialBalance(startDate, endDate);

  const [searchTerm, setSearchTerm] = useState('');
  const [onlyActive, setOnlyActive] = useState(false);

  const filteredRows = rows.filter((r) => {
    if (onlyActive && r.debit === 0 && r.credit === 0 && r.netDebit === 0 && r.netCredit === 0) {
      return false;
    }
    if (
      searchTerm &&
      !r.account.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !r.account.code.includes(searchTerm)
    ) {
      return false;
    }
    return true;
  });

  const totalDebitMovements = filteredRows.reduce((s, r) => s + r.debit, 0);
  const totalCreditMovements = filteredRows.reduce((s, r) => s + r.credit, 0);
  const totalNetDebit = filteredRows.reduce((s, r) => s + r.netDebit, 0);
  const totalNetCredit = filteredRows.reduce((s, r) => s + r.netCredit, 0);

  const isMovementBalanced = Math.abs(totalDebitMovements - totalCreditMovements) < 0.05;
  const isNetBalanced = Math.abs(totalNetDebit - totalNetCredit) < 0.05;

  return (
    <div className="space-y-6 text-right">
      {/* Equilibrium Alert */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition shadow-xs ${
          isNetBalanced
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            : 'bg-rose-50/70 border-rose-200 text-rose-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isNetBalanced ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}
          >
            {isNetBalanced ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          </div>
          <div>
            <h4 className="font-bold text-sm">
              {isNetBalanced ? 'ميزان المراجعة متطابق وموزون بالأرصدة والمجاميع' : 'تنبيه: ميزان المراجعة غير موزون'}
            </h4>
            <p className="text-xs opacity-80 mt-0.5">
              مجموع الأرصدة المدينة ({formatSAR(totalNetDebit)}) = مجموع الأرصدة الدائنة ({formatSAR(totalNetCredit)})
            </p>
          </div>
        </div>

        <div className="bg-white/80 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold">
          الفارق: {formatSAR(Math.abs(totalNetDebit - totalNetCredit))}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
              className="accent-emerald-600 rounded"
            />
            <span>عرض الحسابات ذات الحركة فقط</span>
          </label>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم أو رقم الحساب..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Main Trial Balance Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th rowSpan={2} className="p-3 w-20 text-center border-l border-slate-200">رمز الحساب</th>
                <th rowSpan={2} className="p-3 border-l border-slate-200">اسم الحساب المحاسبي</th>
                <th colSpan={2} className="p-2.5 text-center border-b border-l border-slate-200 bg-slate-100/70">
                  مجاميع الحركات خلال الفترة
                </th>
                <th colSpan={2} className="p-2.5 text-center bg-emerald-50/70">
                  الأرصدة الختامية المعدلة
                </th>
              </tr>
              <tr className="border-b border-slate-200">
                <th className="p-2.5 text-left w-28 text-blue-800 border-l border-slate-200">مدين (ر.س)</th>
                <th className="p-2.5 text-left w-28 text-purple-800 border-l border-slate-200">دائن (ر.س)</th>
                <th className="p-2.5 text-left w-32 text-emerald-900 border-l border-slate-200">رصيد مدين (ر.س)</th>
                <th className="p-2.5 text-left w-32 text-slate-900">رصيد دائن (ر.س)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
              {filteredRows.map((r) => (
                <tr key={r.account.id} className="hover:bg-slate-50/70 transition">
                  <td className="p-2.5 text-center font-mono font-bold text-slate-700 border-l border-slate-100">
                    {r.account.code}
                  </td>
                  <td className="p-2.5 font-medium text-slate-900 border-l border-slate-100">
                    {r.account.nameAr}
                  </td>
                  <td className="p-2.5 text-left font-mono text-blue-700 border-l border-slate-100">
                    {formatSAR(r.debit)}
                  </td>
                  <td className="p-2.5 text-left font-mono text-purple-700 border-l border-slate-100">
                    {formatSAR(r.credit)}
                  </td>
                  <td className="p-2.5 text-left font-mono font-bold text-emerald-800 border-l border-slate-100">
                    {r.netDebit > 0 ? formatSAR(r.netDebit) : '-'}
                  </td>
                  <td className="p-2.5 text-left font-mono font-bold text-slate-900">
                    {r.netCredit > 0 ? formatSAR(r.netCredit) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Total Footer Row */}
            <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
              <tr>
                <td colSpan={2} className="p-3 text-right border-l border-slate-300">
                  الإجمالي العام لميزان المراجعة
                </td>
                <td className="p-3 text-left font-mono text-blue-900 border-l border-slate-300">
                  {formatSAR(totalDebitMovements)}
                </td>
                <td className="p-3 text-left font-mono text-purple-900 border-l border-slate-300">
                  {formatSAR(totalCreditMovements)}
                </td>
                <td className="p-3 text-left font-mono text-emerald-950 text-sm border-l border-slate-300 font-bold">
                  {formatSAR(totalNetDebit)}
                </td>
                <td className="p-3 text-left font-mono text-slate-950 text-sm font-bold">
                  {formatSAR(totalNetCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
