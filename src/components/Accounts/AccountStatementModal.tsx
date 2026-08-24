import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { Account } from '../../types/accounting';
import { formatSAR } from '../../utils/currency';
import { X, Printer, Calendar, FileSpreadsheet, ArrowLeftRight } from 'lucide-react';

interface AccountStatementModalProps {
  account: Account | null;
  onClose: () => void;
}

export const AccountStatementModal: React.FC<AccountStatementModalProps> = ({ account, onClose }) => {
  const { getAccountStatement } = useAccounting();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (!account) return null;

  const statement = getAccountStatement(account.id, startDate, endDate);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-slate-900 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                كشف حساب تفصيلي: {account.nameAr}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                رقم الحساب: {account.code} | طبيعة الحساب: {account.nature === 'debit' ? 'مدين (Debit)' : 'دائن (Credit)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الكشف</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center gap-4 text-xs no-print text-right">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-medium">من تاريخ:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-medium">إلى تاريخ:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-purple-600 hover:text-purple-700 font-bold px-2 py-1 bg-purple-50 rounded-lg border border-purple-200"
            >
              إعادة ضبط الفترة
            </button>
          )}
        </div>

        {/* Statement Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-right">
          {/* Summary Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">إجمالي الحركات المدينة</span>
              <div className="text-base font-bold font-mono text-emerald-600 mt-1">
                {formatSAR(statement.totalDebit)}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">إجمالي الحركات الدائنة</span>
              <div className="text-base font-bold font-mono text-blue-600 mt-1">
                {formatSAR(statement.totalCredit)}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">الرصيد الختامي الحالي</span>
              <div className="text-base font-bold font-mono text-purple-700 mt-1">
                {formatSAR(statement.closingBalance)}
              </div>
            </div>
          </div>

          {/* Lines Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">رقم القيد</th>
                  <th className="p-3">البيان والشرح</th>
                  <th className="p-3">مدين (Debit)</th>
                  <th className="p-3">دائن (Credit)</th>
                  <th className="p-3">الرصيد التراكمي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {statement.lines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      لا توجد حركات مقيدة على هذا الحساب خلال الفترة المحددة.
                    </td>
                  </tr>
                ) : (
                  statement.lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-500 font-mono">{line.date}</td>
                      <td className="p-3 font-mono text-purple-700 font-bold">{line.entryNumber}</td>
                      <td className="p-3 text-slate-900 font-medium">{line.narration}</td>
                      <td className="p-3 font-mono text-emerald-600">
                        {line.debit > 0 ? formatSAR(line.debit, false) : '-'}
                      </td>
                      <td className="p-3 font-mono text-blue-600">
                        {line.credit > 0 ? formatSAR(line.credit, false) : '-'}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {formatSAR(line.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
