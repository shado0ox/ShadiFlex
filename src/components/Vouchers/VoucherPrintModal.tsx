import React, { useRef } from 'react';
import { Voucher } from '../../types/accounting';
import { useAccounting } from '../../context/AccountingContext';
import { formatSAR, formatDateAr, tafqeetArabic } from '../../utils/currency';
import { X, Printer, Receipt, DollarSign, Building2, CheckCircle2, ShieldCheck, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface VoucherPrintModalProps {
  voucher: Voucher | null;
  onClose: () => void;
}

export const VoucherPrintModal: React.FC<VoucherPrintModalProps> = ({ voucher, onClose }) => {
  const { companySettings } = useAccounting();
  const printRef = useRef<HTMLDivElement>(null);

  if (!voucher) return null;

  const isReceipt = voucher.type === 'receipt';
  const titleAr = isReceipt ? 'سند قبض مالي معتمد' : 'سند صرف مالي معتمد';
  const titleEn = isReceipt ? 'OFFICIAL RECEIPT VOUCHER' : 'OFFICIAL PAYMENT VOUCHER';

  const handlePrint = () => {
    window.print();
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'نقداً (من الصندوق الرئيسي)';
      case 'bank_transfer':
        return 'تحويل بنكي / إيداع مباشر';
      case 'cheque':
        return 'شيك مصرفي';
      case 'mada':
      case 'pos_card':
        return 'بطاقة مدى / نقاط بيع POS';
      default:
        return method;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Control Bar */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-slate-900 no-print">
          <div className="flex items-center gap-2">
            {isReceipt ? (
              <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg flex items-center gap-1 font-bold text-xs">
                <ArrowDownLeft className="w-4 h-4" />
                <span>سند قبض مالي (Receipt Voucher)</span>
              </span>
            ) : (
              <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg flex items-center gap-1 font-bold text-xs">
                <ArrowUpRight className="w-4 h-4" />
                <span>سند صرف مالي (Payment Voucher)</span>
              </span>
            )}
            <h3 className="font-bold text-sm sm:text-base text-slate-900">
              معاينة وطباعة السند المالي الرسمي ({voucher.voucherNumber})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة السند</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Paper Area */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-slate-100 flex justify-center">
          <div
            ref={printRef}
            id="printable-accounting-voucher"
            className="w-full max-w-[210mm] bg-white text-slate-900 p-6 sm:p-10 rounded-2xl shadow-md border border-slate-200 text-xs sm:text-sm font-sans"
            dir="rtl"
          >
            {/* Header: Company Info + Voucher Title */}
            <div className="border-b-2 border-slate-900 pb-5 mb-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Company Info */}
                <div className="space-y-1 text-right">
                  <h1 className="text-base sm:text-xl font-extrabold text-slate-900 leading-tight">
                    {companySettings.nameAr}
                  </h1>
                  <p className="text-xs font-medium text-slate-600 font-sans">
                    {companySettings.nameEn}
                  </p>
                  <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                    <p>
                      <strong>السجل التجاري / CR:</strong>{' '}
                      <span className="font-mono text-slate-900">{companySettings.crNumber}</span>
                    </p>
                    <p>
                      <strong>الرقم الضريبي / VAT:</strong>{' '}
                      <span className="font-mono font-bold text-slate-900">{companySettings.vatNumber}</span>
                    </p>
                    <p>
                      <strong>العنوان:</strong> {companySettings.nationalAddress?.city || companySettings.address?.city || 'الرياض'} - {companySettings.nationalAddress?.street || companySettings.address?.street || ''}
                    </p>
                  </div>
                </div>

                {/* Voucher Title Box & Number */}
                <div className="text-left sm:text-left flex flex-col items-end justify-center">
                  <div className={`px-5 py-2.5 rounded-xl text-center border ${
                    isReceipt
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}>
                    <span className="block text-base sm:text-lg font-black tracking-wide">
                      {titleAr}
                    </span>
                    <span className="block text-[10px] font-bold text-slate-600 font-sans tracking-wider mt-0.5">
                      {titleEn}
                    </span>
                  </div>
                  <div className="mt-2 text-left text-xs font-mono font-bold text-slate-900">
                    NO: <span className="text-sm text-slate-900">{voucher.voucherNumber}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Voucher Metadata Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-6 text-xs">
              <div>
                <span className="font-bold text-slate-600">التاريخ: </span>
                <span className="font-mono font-bold text-slate-900">{voucher.date} ({formatDateAr(voucher.date)})</span>
              </div>
              <div>
                <span className="font-bold text-slate-600">طريقة الدفع: </span>
                <span className="font-bold text-slate-900">{getPaymentMethodLabel(voucher.paymentMethod)}</span>
              </div>
              <div className="bg-slate-900 text-white px-3 py-1 rounded-lg">
                <span className="text-[11px] text-slate-300 ml-1">المبلغ الصافي: </span>
                <span className="font-mono font-black text-sm">{formatSAR(voucher.amount)}</span>
              </div>
            </div>

            {/* Formal Voucher Body */}
            <div className="space-y-4 text-xs sm:text-sm text-slate-800 leading-relaxed border border-slate-200 rounded-2xl p-6 bg-slate-50/50 mb-6">
              {/* Party Row */}
              <div className="flex items-baseline gap-2 border-b border-dashed border-slate-300 pb-3">
                <span className="font-bold text-slate-700 min-w-[140px]">
                  {isReceipt ? 'استلمنا من المكرم / السادة:' : 'صرفنا إلى المكرم / السادة:'}
                </span>
                <span className="font-bold text-slate-900 text-base flex-1">
                  {voucher.partyName}
                </span>
              </div>

              {/* Amount in Numbers & Words */}
              <div className="flex items-baseline gap-2 border-b border-dashed border-slate-300 pb-3">
                <span className="font-bold text-slate-700 min-w-[140px]">مبلغ وقدره بالأرقام:</span>
                <span className="font-mono font-black text-slate-900 text-base min-w-[120px]">
                  {formatSAR(voucher.amount)}
                </span>
                <span className="font-bold text-slate-700 mr-4">فقط وقدره:</span>
                <span className="font-bold text-emerald-900 text-sm flex-1 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                  {voucher.amountInWordsAr || tafqeetArabic(voucher.amount)}
                </span>
              </div>

              {/* Payment Details (Cheque / Bank / Transfer) */}
              {(voucher.chequeNumber || voucher.bankName || voucher.transferReference) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
                  {voucher.bankName && (
                    <div>
                      <span className="font-bold text-slate-600">المصرف / البنك: </span>
                      <span className="font-semibold text-slate-900">{voucher.bankName}</span>
                    </div>
                  )}
                  {voucher.chequeNumber && (
                    <div>
                      <span className="font-bold text-slate-600">رقم الشيك: </span>
                      <span className="font-mono font-bold text-slate-900">{voucher.chequeNumber}</span>
                    </div>
                  )}
                  {voucher.chequeDueDate && (
                    <div>
                      <span className="font-bold text-slate-600">تاريخ استحقاق الشيك: </span>
                      <span className="font-mono text-slate-900">{voucher.chequeDueDate}</span>
                    </div>
                  )}
                  {voucher.transferReference && (
                    <div className="sm:col-span-2">
                      <span className="font-bold text-slate-600">الرقم المرجعي للتحويل: </span>
                      <span className="font-mono font-semibold text-slate-900">{voucher.transferReference}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Description / For */}
              <div className="flex items-baseline gap-2 border-b border-dashed border-slate-300 pb-3">
                <span className="font-bold text-slate-700 min-w-[140px]">وذلك سداداً عن:</span>
                <span className="font-medium text-slate-900 text-xs sm:text-sm flex-1">
                  {voucher.description}
                </span>
              </div>

              {/* Related Invoice (if any) */}
              {voucher.relatedInvoiceNumber && (
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-slate-700 min-w-[140px]">الفاتورة المرجعية:</span>
                  <span className="font-mono font-bold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {voucher.relatedInvoiceNumber}
                  </span>
                </div>
              )}
            </div>

            {/* Double Entry Ledger Accounting Summary (For Internal Control) */}
            <div className="mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div className="text-[11px] font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                <span>البيان المحاسبي والقيد المزدوج الآلي (Accounting Entry):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px]">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-600 block mb-1">الطرف المدين (Debit Account):</span>
                  <span className="font-mono font-bold text-slate-900">{voucher.debitAccountCode}</span> - {voucher.debitAccountNameAr}
                  <div className="mt-1 font-mono font-bold text-emerald-700 text-left">{formatSAR(voucher.amount)}</div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-600 block mb-1">الطرف الدائن (Credit Account):</span>
                  <span className="font-mono font-bold text-slate-900">{voucher.creditAccountCode}</span> - {voucher.creditAccountNameAr}
                  <div className="mt-1 font-mono font-bold text-slate-800 text-left">{formatSAR(voucher.amount)}</div>
                </div>
              </div>
            </div>

            {/* Four Official Signatures */}
            <div className="border-t-2 border-slate-300 pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs text-slate-600">
              <div className="space-y-10">
                <p className="font-bold text-slate-700">
                  {isReceipt ? 'المُسلِم / الدافع' : 'المُستلِم / القابض'}
                </p>
                <div className="border-b border-dashed border-slate-300 w-28 mx-auto"></div>
              </div>
              <div className="space-y-10">
                <p className="font-bold text-slate-700">المحاسب المسؤول</p>
                <div className="border-b border-dashed border-slate-300 w-28 mx-auto"></div>
              </div>
              <div className="space-y-10">
                <p className="font-bold text-slate-700">المراجع الداخلي</p>
                <div className="border-b border-dashed border-slate-300 w-28 mx-auto"></div>
              </div>
              <div className="space-y-10">
                <p className="font-bold text-slate-700">المدير المالي / الاعتماد</p>
                <div className="border-b border-dashed border-slate-300 w-28 mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
