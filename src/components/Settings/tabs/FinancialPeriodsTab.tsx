import React, { useState } from 'react';
import {
  Calendar,
  Lock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { useAccounting } from '../../../context/AccountingContext';
import { FinancialPeriod } from '../../../types/accounting';

export const FinancialPeriodsTab: React.FC = () => {
  const {
    companySettings,
    financialPeriods,
    closeFinancialPeriod,
    reopenFinancialPeriod,
  } = useAccounting();

  const [periodActionSuccessMsg, setPeriodActionSuccessMsg] = useState<string | null>(null);
  const [periodActionErrorMsg, setPeriodActionErrorMsg] = useState<string | null>(null);

  // Period Closing Modal State
  const [closingPeriodTarget, setClosingPeriodTarget] = useState<FinancialPeriod | null>(null);
  const [periodClosingNotes, setPeriodClosingNotes] = useState<string>('');
  const [periodClosingOfficer, setPeriodClosingOfficer] = useState<string>('المدير المالي المعتمد');
  const [periodClosingInProgress, setPeriodClosingInProgress] = useState(false);

  // Period Reopen Modal State
  const [reopenPeriodTarget, setReopenPeriodTarget] = useState<FinancialPeriod | null>(null);
  const [periodReopenReason, setPeriodReopenReason] = useState<string>('');
  const [periodReopenOfficer, setPeriodReopenOfficer] = useState<string>('المدير المالي المعتمد');
  const [periodReopenInProgress, setPeriodReopenInProgress] = useState(false);

  // Handle Close Financial Period Execution
  const handleExecuteClosePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingPeriodTarget) return;
    setPeriodClosingInProgress(true);
    setPeriodActionErrorMsg(null);
    try {
      await closeFinancialPeriod(closingPeriodTarget.id, periodClosingOfficer, periodClosingNotes);
      setPeriodActionSuccessMsg(`تم إقفال الفترة المالية (${closingPeriodTarget.nameAr}) بنجاح.`);
      setClosingPeriodTarget(null);
      setPeriodClosingNotes('');
      setTimeout(() => setPeriodActionSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء إقفال الفترة';
      setPeriodActionErrorMsg(msg);
    } finally {
      setPeriodClosingInProgress(false);
    }
  };

  // Handle Reopen Financial Period Execution
  const handleExecuteReopenPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenPeriodTarget) return;
    if (!periodReopenReason.trim()) {
      setPeriodActionErrorMsg('يجب إدخال سبب واضح ومبرر لإعادة فتح الفترة المالية.');
      return;
    }
    setPeriodReopenInProgress(true);
    setPeriodActionErrorMsg(null);
    try {
      await reopenFinancialPeriod(reopenPeriodTarget.id, periodReopenReason.trim(), periodReopenOfficer);
      setPeriodActionSuccessMsg(
        `تمت إعادة فتح الفترة المالية (${reopenPeriodTarget.nameAr}) بنجاح، وتم تسجيل التوثيق في سجل التدقيق (Audit Log).`
      );
      setReopenPeriodTarget(null);
      setPeriodReopenReason('');
      setTimeout(() => setPeriodActionSuccessMsg(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء إعادة فتح الفترة';
      setPeriodActionErrorMsg(msg);
    } finally {
      setPeriodReopenInProgress(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success / Error Alerts */}
      {periodActionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{periodActionSuccessMsg}</span>
          </div>
          <button onClick={() => setPeriodActionSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            ×
          </button>
        </div>
      )}

      {periodActionErrorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{periodActionErrorMsg}</span>
          </div>
          <button onClick={() => setPeriodActionErrorMsg(null)} className="text-rose-700 hover:text-rose-900">
            ×
          </button>
        </div>
      )}

      {/* Explanation Hero Card */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 text-white p-6 rounded-2xl shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black">إدارة الفترات المالية المحاسبية والإقفال الدوري (Fiscal Periods)</h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                تقسيم السنة المالية المعتمدة ({companySettings.fiscalYear || new Date().getFullYear()}) إلى 12 فترة شهرية منتظمة. عند إقفال أي فترة، يمنع النظام تلقائياً أي عمليات إنشاء، تعديل، ترحيل، أو إلغاء لمستندات تقع ضمن نطاقها الزمني لحماية نزاهة الدفاتر المحاسبية.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>حماية النزاهة والتدقيق</span>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="bg-white/10 p-3.5 rounded-xl border border-white/10 space-y-1">
            <div className="text-slate-300 text-[11px]">إجمالي فترات السنة</div>
            <div className="text-lg font-black font-mono text-white">{financialPeriods.length} فترات</div>
          </div>

          <div className="bg-emerald-500/20 p-3.5 rounded-xl border border-emerald-400/30 space-y-1">
            <div className="text-emerald-300 text-[11px]">الفترات المفتوحة للتسجيل</div>
            <div className="text-lg font-black font-mono text-emerald-300">
              {financialPeriods.filter((p) => p.status === 'open').length} فترة
            </div>
          </div>

          <div className="bg-rose-500/20 p-3.5 rounded-xl border border-rose-400/30 space-y-1">
            <div className="text-rose-300 text-[11px]">الفترات المقفلة دورياً</div>
            <div className="text-lg font-black font-mono text-rose-300">
              {financialPeriods.filter((p) => p.status === 'closed').length} فترة
            </div>
          </div>

          <div className="bg-amber-500/20 p-3.5 rounded-xl border border-amber-400/30 space-y-1">
            <div className="text-amber-300 text-[11px]">الفترة النشطة حالياً</div>
            <div className="text-sm font-bold text-amber-200 truncate">
              {(() => {
                const todayStr = new Date().toISOString().split('T')[0];
                const activeP = financialPeriods.find((p) => todayStr >= p.startDate && todayStr <= p.endDate);
                return activeP ? `${activeP.nameAr}` : `سنة ${companySettings.fiscalYear}`;
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Periods Table & Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              جدول الفترات المالية المحاسبية لسنة {companySettings.fiscalYear || new Date().getFullYear()}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              حالة الفترات وتاريخ بدايتها ونهايتها وإجراءات الإقفال وإعادة الفتح
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="p-3.5">الفترة</th>
                <th className="p-3.5">الربع</th>
                <th className="p-3.5">تاريخ البداية</th>
                <th className="p-3.5">تاريخ النهاية</th>
                <th className="p-3.5 text-center">حالة الفترة</th>
                <th className="p-3.5">بيانات الإقفال / المسؤول</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {financialPeriods.map((period) => {
                const isClosed = period.status === 'closed';
                return (
                  <tr key={period.id} className={isClosed ? 'bg-rose-50/20 hover:bg-rose-50/40' : 'hover:bg-slate-50/60'}>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-mono">
                          P{period.periodNumber}
                        </span>
                        <span>{period.nameAr}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{period.nameEn}</div>
                    </td>

                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-[11px]">
                        {period.quarter === 1 && 'الربع الأول Q1'}
                        {period.quarter === 2 && 'الربع الثاني Q2'}
                        {period.quarter === 3 && 'الربع الثالث Q3'}
                        {period.quarter === 4 && 'الربع الرابع Q4'}
                      </span>
                    </td>

                    <td className="p-3.5 font-mono text-slate-700 font-medium">{period.startDate}</td>
                    <td className="p-3.5 font-mono text-slate-700 font-medium">{period.endDate}</td>

                    <td className="p-3.5 text-center">
                      {isClosed ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <Lock className="w-3 h-3 text-rose-600" />
                          <span>مقفلة</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>مفتوحة</span>
                        </span>
                      )}
                    </td>

                    <td className="p-3.5">
                      {isClosed ? (
                        <div className="space-y-0.5 text-[11px]">
                          <div className="text-slate-800 font-semibold flex items-center gap-1">
                            <span>أُقفلت بواسطة:</span>
                            <span className="text-slate-900 font-bold">{period.closedBy || 'المدير المالي'}</span>
                          </div>
                          <div className="text-slate-500 font-mono text-[10px]">
                            {period.closedAt ? new Date(period.closedAt).toLocaleString('ar-SA') : '—'}
                          </div>
                          {period.notes && (
                            <div className="text-slate-600 italic text-[10px] truncate max-w-xs" title={period.notes}>
                              "{period.notes}"
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">متاحة لتسجيل العمليات</span>
                      )}
                    </td>

                    <td className="p-3.5 text-center">
                      {isClosed ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPeriodActionErrorMsg(null);
                            setPeriodReopenReason('');
                            setReopenPeriodTarget(period);
                          }}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors mx-auto"
                          title="إعادة فتح الفترة المالية بعد إبداء السبب لتوثيقه في سجل التدقيق"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>إعادة فتح</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setPeriodActionErrorMsg(null);
                            setPeriodClosingNotes('');
                            setClosingPeriodTarget(period);
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors mx-auto"
                          title="إقفال الفترة لمنع أي تعديل أو إدخال مستندات جديدة فيها"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>إقفال الفترة</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Period Closing */}
      {closingPeriodTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 text-slate-800 text-xs space-y-4">
            <div className="flex items-center gap-3 text-slate-900 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-600">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black">إقفال الفترة المالية: {closingPeriodTarget.nameAr}</h3>
                <p className="text-slate-500 text-[11px] font-mono">
                  {closingPeriodTarget.startDate} إلى {closingPeriodTarget.endDate}
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-rose-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>أثر إقفال الفترة المالية:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-700">
                سيقوم النظام فوراً بحظر إنشاء أو ترحيل أو تعديل أو إلغاء أي فواتير، قيود، سندات، أو حركات نقاط بيع يقع تاريخها ضمن هذه الفترة، لضمان استقرار القوائم المالية وإقرارات ضريبة القيمة المضافة.
              </p>
            </div>

            <form onSubmit={handleExecuteClosePeriod} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">المسؤول عن الإقفال المالي</label>
                <input
                  type="text"
                  value={periodClosingOfficer}
                  onChange={(e) => setPeriodClosingOfficer(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ملاحظات ومحضر الإقفال الدوري (اختياري)</label>
                <textarea
                  value={periodClosingNotes}
                  onChange={(e) => setPeriodClosingNotes(e.target.value)}
                  placeholder="مثال: تم إقفال الفترة بعد مطابقة كشوف الحسابات البنكية ومطابقة إقرار ضريبة القيمة المضافة..."
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setClosingPeriodTarget(null)}
                  disabled={periodClosingInProgress}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={periodClosingInProgress}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  <span>{periodClosingInProgress ? 'جاري الإقفال...' : 'تأكيد إقفال الفترة'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Period Reopen */}
      {reopenPeriodTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 text-slate-800 text-xs space-y-4">
            <div className="flex items-center gap-3 text-slate-900 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-600">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black">إعادة فتح الفترة المالية: {reopenPeriodTarget.nameAr}</h3>
                <p className="text-slate-500 text-[11px] font-mono">
                  {reopenPeriodTarget.startDate} إلى {reopenPeriodTarget.endDate}
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-amber-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>إجراء رقابي مدقق (Audit Trail Enforced):</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-700">
                إعادة فتح فترة مقفلة هو إجراء استثنائي. سيتم توثيق اسم المستخدم وتاريخ العملية ومبررات الفتح كاملة ضمن سجل التدقيق والرقابة المحاسبية (Audit Logs).
              </p>
            </div>

            <form onSubmit={handleExecuteReopenPeriod} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">المسؤول عن طلب إعادة الفتح</label>
                <input
                  type="text"
                  value={periodReopenOfficer}
                  onChange={(e) => setPeriodReopenOfficer(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  المبرر والسبب الرسمي لإعادة الفتح <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={periodReopenReason}
                  onChange={(e) => setPeriodReopenReason(e.target.value)}
                  placeholder="مثال: تصحيح قيد تسوية وارد من المراجع القانوني الخارجي برقم اعتماد 412..."
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReopenPeriodTarget(null)}
                  disabled={periodReopenInProgress}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={periodReopenInProgress}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{periodReopenInProgress ? 'جاري إعادة الفتح...' : 'تأكيد إعادة فتح الفترة'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
