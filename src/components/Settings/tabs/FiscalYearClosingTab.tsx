import React, { useState } from 'react';
import {
  Lock,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAccounting } from '../../../context/AccountingContext';
import { useToast } from '../../../context/ToastContext';
import { formatSAR } from '../../../utils/tafqeet';

export const FiscalYearClosingTab: React.FC = () => {
  const {
    fiscalClosings,
    closeFiscalYear,
    reopenFiscalYear,
  } = useAccounting();
  const { toast } = useToast();

  // Year-End Closing Modal / Form
  const [closingYear, setClosingYear] = useState<number>(2025);
  const [closingDate, setClosingDate] = useState<string>('2025-12-31');
  const [closedByName, setClosedByName] = useState<string>('المدير المالي المعتمد');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [closingInProgress, setClosingInProgress] = useState(false);
  const [closingSuccessMsg, setClosingSuccessMsg] = useState<string | null>(null);
  const [reopenTargetId, setReopenTargetId] = useState<string | null>(null);

  // Handle Fiscal Year Closing Execution
  const handleExecuteClosing = async (e: React.FormEvent) => {
    e.preventDefault();
    setClosingInProgress(true);
    try {
      const record = await closeFiscalYear(
        closingYear,
        closingDate,
        closedByName,
        closingNotes
      );
      toast.success(`تم إقفال السنة المالية ${closingYear} بنجاح برقم قيد ${record.journalEntryNumber}`);
      setClosingSuccessMsg(`تم إقفال السنة المالية ${closingYear} بنجاح برقم قيد ${record.journalEntryNumber}`);
      setIsClosingModalOpen(false);
      setTimeout(() => setClosingSuccessMsg(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء إقفال السنة المالية';
      toast.error(msg);
    } finally {
      setClosingInProgress(false);
    }
  };

  return (
    <div className="space-y-6">
      {closingSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{closingSuccessMsg}</span>
        </div>
      )}

      {/* Explanation Card */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black">نظام إقفال السنة المالية وترحيل الحسابات (Year-End Closing)</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                تصفير الحسابات الاسمية (الإيرادات 4xxx والمصروفات 5xxx) وترحيل صافي الأرباح/الخسائر إلى حساب الأرباح المبقاة (3102)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsClosingModalOpen(true)}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all self-start"
          >
            <Lock className="w-4 h-4" />
            <span>بدء إقفال سنة مالية وترحيل الأرصدة</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="bg-white/10 p-3 rounded-xl border border-white/10 space-y-1">
            <div className="font-bold text-emerald-300">1. تصفير الإيرادات (4xxx)</div>
            <div className="text-[11px] text-slate-300">
              يتم جعل حسابات المبيعات والإيرادات مدينة برصيدها الدائن لتصبح أصفاراً للسنة الجديدة.
            </div>
          </div>
          <div className="bg-white/10 p-3 rounded-xl border border-white/10 space-y-1">
            <div className="font-bold text-amber-300">2. تصفير المصروفات (5xxx)</div>
            <div className="text-[11px] text-slate-300">
              يتم جعل حسابات المصروفات وتكلفة المبيعات دائنة برصيدها المدين لتصبح أصفاراً للسنة الجديدة.
            </div>
          </div>
          <div className="bg-white/10 p-3 rounded-xl border border-white/10 space-y-1">
            <div className="font-bold text-cyan-300">3. ترحيل الأرباح المبقاة (3102)</div>
            <div className="text-[11px] text-slate-300">
              تتم إضافة صافي الربح (أو خصم الخسارة) تلقائياً إلى حساب حقوق الملكية (الأرباح المحتجزة).
            </div>
          </div>
        </div>
      </div>

      {/* History of Closings */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            سجل إقفالات السنوات المالية السابقة
          </h3>
          <span className="text-xs text-slate-500">{fiscalClosings.length} سنوات مقفلة مسجلة</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="p-3.5">السنة المالية</th>
                <th className="p-3.5">تاريخ الإقفال</th>
                <th className="p-3.5 text-left">إجمالي الإيرادات</th>
                <th className="p-3.5 text-left">إجمالي المصروفات</th>
                <th className="p-3.5 text-left">صافي الربح / الخسارة المُرَحَّل</th>
                <th className="p-3.5">رقم قيد الإقفال</th>
                <th className="p-3.5">المُقْفِل المعتمد</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fiscalClosings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    لم يتم تسجيل أي إقفال سنوي حتى الآن. انقر على "بدء إقفال سنة مالية" لإقفال سنة سابقة وترحيل نتائجها.
                  </td>
                </tr>
              ) : (
                fiscalClosings.map((closing) => {
                  const isProfit = closing.netProfitOrLoss >= 0;
                  return (
                    <tr key={closing.id} className="hover:bg-slate-50/60">
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-slate-900 text-sm">{closing.year}</span>
                        <span className="mr-2 inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold">
                          مقفلة
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 font-mono">{closing.closingDate}</td>
                      <td className="p-3.5 text-left font-mono font-medium text-emerald-700">
                        {formatSAR(closing.totalRevenue)}
                      </td>
                      <td className="p-3.5 text-left font-mono font-medium text-rose-700">
                        {formatSAR(closing.totalExpense)}
                      </td>
                      <td className="p-3.5 text-left font-mono font-bold text-sm">
                        <span className={isProfit ? 'text-emerald-600' : 'text-rose-600'}>
                          {isProfit ? '+' : ''}
                          {formatSAR(closing.netProfitOrLoss)}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-indigo-700 font-bold">{closing.journalEntryNumber}</td>
                      <td className="p-3.5 text-slate-700">{closing.closedBy}</td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => setReopenTargetId(closing.id)}
                          title="إعادة فتح السنة المالية وحذف قيد الإقفال"
                          className="px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 flex items-center gap-1 mx-auto"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>إعادة فتح</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reopen Confirmation Modal */}
      {reopenTargetId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-right space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">تأكيد إعادة فتح السنة المالية</h3>
              <p className="text-xs text-slate-500 mt-1">
                سيتم حذف قيد الإقفال السنوي وإعادة أرصدة حسابات الإيرادات والمصروفات إلى حالتها الأصلية قبل الإقفال.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReopenTargetId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={async () => {
                  await reopenFiscalYear(reopenTargetId);
                  setReopenTargetId(null);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors"
              >
                تأكيد إعادة الفتح وإلغاء القيد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Closing Execution Modal */}
      {isClosingModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 text-right space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">إقفال السنة المالية وترحيل الأرباح</h3>
                  <p className="text-[11px] text-slate-500">توليد قيد الإقفال السنوي وترحيل الحسابات لحساب 3102</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClosingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteClosing} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  السنة المالية المراد إقفالها <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={closingYear}
                  onChange={(e) => setClosingYear(parseInt(e.target.value) || 2025)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  تاريخ قيد الإقفال السنوي <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  اسم المسؤول / المعتمد للإقفال <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={closedByName}
                  onChange={(e) => setClosedByName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ملاحظات وقرار الجمعية / مجلس الإدارة</label>
                <textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="قرار اعتماد القوائم المالية وإقفال الحسابات وترحيل الصافي للأرباح المبقاة..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 resize-none"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  تنبيه محاسبي مهم:
                </div>
                <div>
                  سيقوم النظام بحساب كافة أرصدة الإيرادات والمصروفات حتى تاريخ الإقفال وإنشاء قيد محاسبي مزدوج متوازن تلقائياً يصفر حسابات قائمة الدخل ويرحل الصافي لحساب حقوق الملكية (3102).
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsClosingModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={closingInProgress}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{closingInProgress ? 'جاري الإقفال...' : 'تنفيذ الإقفال وترحيل الأرصدة'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
