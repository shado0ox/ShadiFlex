import React, { useState } from 'react';
import { CashierShift, CashRegister, Branch, CompanySettings } from '../../types/accounting';
import { Clock, DollarSign, AlertTriangle, CheckCircle, Printer, X, Shield, Lock, Calculator, ArrowDownRight } from 'lucide-react';

interface PosShiftModalProps {
  mode: 'start' | 'close' | 'view_z_report';
  activeShift?: CashierShift;
  selectedShiftForReport?: CashierShift;
  cashRegisters: CashRegister[];
  branches: Branch[];
  activeRegisterId: string;
  companySettings: CompanySettings;
  onStartShift: (registerId: string, cashierName: string, openingCash: number) => void;
  onCloseShift: (shiftId: string, actualCash: number, closingNotes?: string) => void;
  onClose: () => void;
}

export const PosShiftModal: React.FC<PosShiftModalProps> = ({
  mode,
  activeShift,
  selectedShiftForReport,
  cashRegisters,
  branches,
  activeRegisterId,
  companySettings,
  onStartShift,
  onCloseShift,
  onClose,
}) => {
  const [targetRegisterId, setTargetRegisterId] = useState<string>(activeRegisterId);
  const [cashierName, setCashierName] = useState<string>('سعود المحاسب');
  const [openingCash, setOpeningCash] = useState<number>(300);

  // Close shift state
  const currentShift = mode === 'view_z_report' ? selectedShiftForReport : activeShift;
  const [actualCashCount, setActualCashCount] = useState<number>(currentShift ? currentShift.expectedCash : 0);
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [showZReportPrint, setShowZReportPrint] = useState<boolean>(mode === 'view_z_report');

  const expectedCash = currentShift ? currentShift.expectedCash : 0;
  const cashDifference = actualCashCount - expectedCash;

  const handleStartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRegisterId) {
      alert('يرجى اختيار صندوق الكاشير للوردية!');
      return;
    }
    onStartShift(targetRegisterId, cashierName, openingCash);
    onClose();
  };

  const handleCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift) return;
    onCloseShift(currentShift.id, actualCashCount, closingNotes);
    setShowZReportPrint(true);
  };

  const handlePrintZReport = () => {
    window.print();
  };

  if (showZReportPrint && currentShift) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto" dir="rtl">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col my-auto max-h-[92vh]">
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">تقرير إغلاق الوردية الشامل (Z-Report)</h3>
                <p className="text-xs text-slate-400 font-mono">{currentShift.zReportNumber || currentShift.shiftNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintZReport}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                طباعة التقرير
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Z-Report Thermal Content */}
          <div className="p-6 overflow-y-auto bg-slate-100 flex justify-center flex-1">
            <div
              id="pos-z-report"
              className="w-full max-w-[320px] bg-white text-slate-900 p-5 rounded-lg shadow-md font-sans text-xs border border-slate-300 print:shadow-none print:border-none print:p-2 print:w-[80mm] print:max-w-[80mm] print:m-0"
            >
              {/* Header */}
              <div className="text-center pb-3 border-b border-dashed border-slate-400 space-y-1">
                <h2 className="text-sm font-black text-slate-900">{companySettings.nameAr}</h2>
                <div className="text-xs font-bold text-emerald-800">{currentShift.branchName}</div>
                <p className="text-[10px] text-slate-500 font-mono">الرقم الضريبي: {companySettings.vatNumber}</p>
                <div className="py-1 px-3 bg-slate-900 text-white rounded font-bold text-xs inline-block mt-1">
                  تقرير إغلاق الوردية اليومي (Z-REPORT)
                </div>
              </div>

              {/* Shift Details */}
              <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">رقم تقرير Z:</span>
                  <span className="font-bold">{currentShift.zReportNumber || 'Z-2026-001'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">رقم الوردية:</span>
                  <span>{currentShift.shiftNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">نقطة البيع:</span>
                  <span>{currentShift.registerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">الكاشير المسؤول:</span>
                  <span className="font-bold">{currentShift.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">وقت البداية:</span>
                  <span>{new Date(currentShift.startTime).toLocaleTimeString('ar-SA')} ({new Date(currentShift.startTime).toLocaleDateString('ar-SA')})</span>
                </div>
                {currentShift.endTime && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">وقت الإغلاق:</span>
                    <span>{new Date(currentShift.endTime).toLocaleTimeString('ar-SA')} ({new Date(currentShift.endTime).toLocaleDateString('ar-SA')})</span>
                  </div>
                )}
              </div>

              {/* Sales Breakdown by Payment Channel */}
              <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1.5 text-[11px]">
                <div className="font-bold text-slate-800 text-xs pb-1 border-b border-slate-200">
                  تفاصيل المبيعات حسب وسيلة الدفع:
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">مبيعات نقدية (Cash):</span>
                  <span className="font-mono font-bold">{currentShift.cashSales.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">مبيعات شبكة مدى (Mada):</span>
                  <span className="font-mono font-bold">{currentShift.madaSales.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">مبيعات بطاقات ائتمانية:</span>
                  <span className="font-mono font-bold">{currentShift.creditCardSales.toFixed(2)} ر.س</span>
                </div>
                {currentShift.otherSales > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">مبيعات أخرى / آجل:</span>
                    <span className="font-mono font-bold">{currentShift.otherSales.toFixed(2)} ر.س</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1">
                  <span>إجمالي المبيعات (شامل الضريبة):</span>
                  <span className="font-mono text-emerald-800">{currentShift.totalSales.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[10px]">
                  <span>ضريبة القيمة المضافة المحصلة (15%):</span>
                  <span className="font-mono">{currentShift.totalVat.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[10px]">
                  <span>عدد الفواتير الصادرة:</span>
                  <span className="font-mono font-bold">{currentShift.invoicesCount} فاتورة</span>
                </div>
              </div>

              {/* Cash Drawer Reconciliation (مطابقة الدرج) */}
              <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1.5 text-[11px]">
                <div className="font-bold text-slate-800 text-xs pb-1 border-b border-slate-200">
                  مطابقة النقدية في الدرج:
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>الرصيد الافتتاحي (عهدة البداية):</span>
                  <span className="font-mono">+{currentShift.openingCash.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>مبيعات نقدية مضافة:</span>
                  <span className="font-mono">+{currentShift.cashSales.toFixed(2)} ر.س</span>
                </div>
                {currentShift.cashDropAmount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>توريدات مسحوبة للخزينة:</span>
                    <span className="font-mono">-{currentShift.cashDropAmount.toFixed(2)} ر.س</span>
                  </div>
                )}
                {currentShift.refundsTotal > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>مرتجعات نقدية:</span>
                    <span className="font-mono">-{currentShift.refundsTotal.toFixed(2)} ر.س</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1">
                  <span>المبلغ النقدي المتوقع في الدرج:</span>
                  <span className="font-mono text-indigo-900">{currentShift.expectedCash.toFixed(2)} ر.س</span>
                </div>

                {currentShift.actualClosingCash !== undefined && (
                  <>
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>العد الفعلي للنقدية:</span>
                      <span className="font-mono">{currentShift.actualClosingCash.toFixed(2)} ر.س</span>
                    </div>
                    <div className={`flex justify-between font-black text-xs p-1.5 rounded ${
                      (currentShift.cashDifference || 0) === 0
                        ? 'bg-emerald-50 text-emerald-800'
                        : (currentShift.cashDifference || 0) > 0
                        ? 'bg-blue-50 text-blue-800'
                        : 'bg-rose-50 text-rose-800'
                    }`}>
                      <span>الفارق (عجز / زيادة):</span>
                      <span className="font-mono" dir="ltr">
                        {(currentShift.cashDifference || 0) > 0 ? `+${currentShift.cashDifference?.toFixed(2)}` : currentShift.cashDifference?.toFixed(2)} ر.س
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Signatures */}
              <div className="pt-4 text-[9px] text-slate-500 space-y-4">
                <div className="flex justify-between pt-3">
                  <div>توقيع الكاشير: ........................</div>
                  <div>توقيع المشرف: ........................</div>
                </div>
                <p className="text-center font-mono text-[8px] text-slate-400">
                  تم التوليد آلياً من النظام المحاسبي الموحد • ZATCA Compatible
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-2 print:hidden">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              تم وإغلاق النافذة
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col my-auto">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${mode === 'start' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {mode === 'start' ? <Clock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold">
                {mode === 'start' ? 'فتح وبدء وردية كاشير جديدة' : 'إغلاق الوردية الحالية وإصدار تقرير Z'}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'start' ? 'تسجيل عهدة البداية واسم الكاشير' : `الوردية الحالية: ${currentShift?.shiftNumber}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Start Shift Form */}
        {mode === 'start' ? (
          <form onSubmit={handleStartSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">صندوق الكاشير / نقطة البيع:</label>
              <select
                value={targetRegisterId}
                onChange={(e) => setTargetRegisterId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
              >
                {cashRegisters.map((reg) => (
                  <option key={reg.id} value={reg.id}>
                    {reg.nameAr} ({reg.branchName}) - {reg.code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم الكاشير المسؤول:</label>
              <input
                type="text"
                required
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
                placeholder="مثال: سعود المحاسب أو أحمد علي"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الرصيد الافتتاحي للنقدية في الدرج (عهدة البداية / الفكة):
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={openingCash}
                  onChange={(e) => setOpeningCash(parseFloat(e.target.value) || 0)}
                  className="w-full text-lg font-bold font-mono text-slate-900 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden pl-12"
                />
                <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-500">ر.س</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                المبلغ النقدي المتواجد في درج الكاشير قبل بدء استقبال طلبات المبيعات.
              </p>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                بدء الوردية والفتح
              </button>
            </div>
          </form>
        ) : (
          /* Close Shift Form */
          <form onSubmit={handleCloseSubmit} className="p-6 space-y-4">
            {currentShift ? (
              <>
                {/* Live Shift Summary Stats (X-Report) */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-800">بيانات الوردية المفتوحة:</span>
                    <span className="font-mono text-slate-600">{currentShift.shiftNumber}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>الكاشير: <span className="font-bold text-slate-900">{currentShift.cashierName}</span></div>
                    <div>نقطة البيع: <span className="font-bold text-slate-900">{currentShift.registerName}</span></div>
                    <div>عدد الفواتير: <span className="font-mono font-bold text-slate-900">{currentShift.invoicesCount}</span></div>
                    <div>إجمالي المبيعات: <span className="font-mono font-bold text-emerald-700">{currentShift.totalSales.toFixed(2)} ر.س</span></div>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700">النقدية المتوقعة حسابياً في الدرج:</span>
                    <span className="text-base font-black font-mono text-indigo-900">
                      {expectedCash.toFixed(2)} ر.س
                    </span>
                  </div>
                </div>

                {/* Actual Cash Count Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    العد الفعلي للنقدية في الدرج (الجرد الفعلي):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={actualCashCount}
                      onChange={(e) => setActualCashCount(parseFloat(e.target.value) || 0)}
                      className="w-full text-xl font-bold font-mono text-slate-900 px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden pl-12"
                    />
                    <span className="absolute left-3.5 top-3.5 text-xs font-bold text-slate-500">ر.س</span>
                  </div>

                  {/* Variance Calculation */}
                  <div className={`mt-2 p-2.5 rounded-lg text-xs font-bold flex items-center justify-between ${
                    cashDifference === 0
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : cashDifference > 0
                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    <span>
                      {cashDifference === 0
                        ? 'النقدية متطابقة تماماً (بدون فروقات)'
                        : cashDifference > 0
                        ? 'يوجد زيادة نقدية في الدرج:'
                        : 'يوجد عجز نقدي في الدرج:'}
                    </span>
                    <span className="font-mono text-sm" dir="ltr">
                      {cashDifference > 0 ? `+${cashDifference.toFixed(2)}` : cashDifference.toFixed(2)} ر.س
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">ملاحظات الإغلاق والتسليم:</label>
                  <textarea
                    rows={2}
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder="أي ملاحظات حول الجرد أو التسليم..."
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl outline-hidden focus:bg-white"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    <Lock className="w-4 h-4" />
                    إغلاق الوردية وإصدار تقرير Z
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                لا توجد وردية مفتوحة حالياً للإغلاق!
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
