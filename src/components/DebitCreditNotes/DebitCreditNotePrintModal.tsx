import React, { useEffect, useState, useRef } from 'react';
import { DebitCreditNote } from '../../types/accounting';
import { useAccounting } from '../../context/AccountingContext';
import { formatSAR, formatSAR_EN, tafqeetArabic, formatDateAr } from '../../utils/currency';
import { generateZatcaQrDataUrl } from '../../utils/zatca';
import { X, Printer, ShieldCheck, CheckCircle2, QrCode, FileText, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface DebitCreditNotePrintModalProps {
  note: DebitCreditNote | null;
  onClose: () => void;
}

export const DebitCreditNotePrintModal: React.FC<DebitCreditNotePrintModalProps> = ({ note, onClose }) => {
  const { companySettings } = useAccounting();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (note) {
      generateZatcaQrDataUrl({
        sellerName: companySettings.nameAr,
        vatNumber: companySettings.vatNumber,
        timestamp: `${note.issueDate}T${note.issueTime || '12:00:00'}Z`,
        totalAmount: note.totalAmount,
        vatAmount: note.vatTotal,
      }).then((url) => setQrCodeUrl(url));
    }
  }, [note, companySettings]);

  if (!note) return null;

  const isCreditNote = note.type === 'credit_note';
  const titleAr = isCreditNote ? 'إشعار دائن ضريبي' : 'إشعار مدين ضريبي';
  const titleEn = isCreditNote ? 'TAX CREDIT NOTE (ZATCA)' : 'TAX DEBIT NOTE (ZATCA)';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Control Bar */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-slate-900 no-print">
          <div className="flex items-center gap-2">
            {isCreditNote ? (
              <span className="p-1.5 bg-rose-100 text-rose-700 rounded-lg flex items-center gap-1 font-bold text-xs">
                <ArrowDownLeft className="w-4 h-4" />
                <span>إشعار دائن (Credit Note)</span>
              </span>
            ) : (
              <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg flex items-center gap-1 font-bold text-xs">
                <ArrowUpRight className="w-4 h-4" />
                <span>إشعار مدين (Debit Note)</span>
              </span>
            )}
            <h3 className="font-bold text-sm sm:text-base text-slate-900">
              معاينة وطباعة المستند الضريبي الرسمي ({note.noteNumber})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الإشعار</span>
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
            id="printable-zatca-note"
            className="w-full max-w-[210mm] bg-white text-slate-900 p-6 sm:p-10 rounded-2xl shadow-md border border-slate-200 text-xs sm:text-sm font-sans"
            dir="rtl"
          >
            {/* Header: Company Info + Note Title */}
            <div className="border-b-2 border-slate-900 pb-5 mb-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Seller Info */}
                <div className="space-y-1 text-right">
                  <h1 className="text-base sm:text-xl font-extrabold text-slate-900 leading-tight">
                    {companySettings.nameAr}
                  </h1>
                  <p className="text-xs font-medium text-slate-600 font-sans">
                    {companySettings.nameEn}
                  </p>
                  <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                    <p>
                      <strong>الرقم الضريبي / VAT:</strong>{' '}
                      <span className="font-mono font-bold text-slate-900">{companySettings.vatNumber}</span>
                    </p>
                    <p>
                      <strong>السجل التجاري / CR:</strong>{' '}
                      <span className="font-mono text-slate-900">{companySettings.crNumber}</span>
                    </p>
                    <p>
                      <strong>العنوان الوطني:</strong> {companySettings.nationalAddress?.street || companySettings.address?.street || ''}، حي {companySettings.nationalAddress?.district || companySettings.address?.district || ''}، {companySettings.nationalAddress?.city || companySettings.address?.city || 'الرياض'}
                    </p>
                    <p>
                      <strong>الهاتف:</strong> {companySettings.phone} | <strong>البريد:</strong> {companySettings.email}
                    </p>
                  </div>
                </div>

                {/* Document Type Badge & Title */}
                <div className="text-left sm:text-left flex flex-col items-end sm:items-end justify-center self-stretch sm:self-center">
                  <div className={`px-4 py-2 rounded-xl text-center border ${
                    isCreditNote ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    <span className="block text-sm sm:text-base font-extrabold tracking-wide">
                      {titleAr}
                    </span>
                    <span className="block text-[10px] font-bold text-slate-600 font-sans tracking-wider mt-0.5">
                      {titleEn}
                    </span>
                  </div>
                  <div className="mt-2 text-left text-[11px] text-slate-600 font-mono">
                    <span className="font-bold text-slate-900">NO: {note.noteNumber}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Note & Reference Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {/* Note Details */}
              <div className="space-y-1.5 text-slate-700 text-xs">
                <div className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span className="font-bold text-slate-600">رقم الإشعار:</span>
                  <span className="font-mono font-bold text-slate-900">{note.noteNumber}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span className="font-bold text-slate-600">تاريخ الإصدار:</span>
                  <span className="font-mono text-slate-900">{note.issueDate} ({formatDateAr(note.issueDate)})</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span className="font-bold text-slate-600">وقت الإصدار:</span>
                  <span className="font-mono text-slate-900">{note.issueTime || '12:00:00'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span className="font-bold text-slate-600">سبب إصدار الإشعار (ZATCA):</span>
                  <span className="font-bold text-rose-700">{note.reasonTextAr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-600">طريقة التسوية:</span>
                  <span className="font-medium text-slate-900">
                    {note.refundMethod === 'account_balance'
                      ? 'تسوية على كشف الحساب'
                      : note.refundMethod === 'cash'
                      ? 'نقداً من الخزينة'
                      : note.refundMethod === 'bank_transfer'
                      ? 'تحويل بنكي'
                      : 'نقاط بيع / مدى'}
                  </span>
                </div>
              </div>

              {/* Reference Invoice & Party Details */}
              <div className="space-y-1.5 text-slate-700 text-xs">
                <div className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span className="font-bold text-slate-600">
                    {note.partyType === 'customer' ? 'بيانات العميل:' : 'بيانات المورد:'}
                  </span>
                  <span className="font-bold text-slate-900">{note.partyName}</span>
                </div>
                {note.partyVatNumber && (
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="font-bold text-slate-600">الرقم الضريبي للطرف:</span>
                    <span className="font-mono font-bold text-slate-900">{note.partyVatNumber}</span>
                  </div>
                )}
                {note.originalInvoiceNumber && (
                  <div className="flex justify-between border-b border-slate-200/60 pb-1 bg-amber-50/70 px-1 py-0.5 rounded">
                    <span className="font-bold text-amber-900">الفاتورة المرجعية الأصلية:</span>
                    <span className="font-mono font-bold text-amber-900">{note.originalInvoiceNumber}</span>
                  </div>
                )}
                {note.originalInvoiceDate && (
                  <div className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="font-bold text-slate-600">تاريخ الفاتورة الأصلية:</span>
                    <span className="font-mono text-slate-900">{note.originalInvoiceDate}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-bold text-slate-600">الأثر على المخزون:</span>
                  <span className="font-semibold text-slate-900">
                    {note.affectInventory ? 'تم تحديث كميات المستودع آلياً' : 'تسوية مالية فقط (بدون حركة مخزون)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="p-2.5 rounded-tr-lg text-center w-10">#</th>
                    <th className="p-2.5">الوصف / البيان (Item Description)</th>
                    <th className="p-2.5 text-center">الكمية</th>
                    <th className="p-2.5 text-left">سعر الوحدة</th>
                    <th className="p-2.5 text-left">الخصم</th>
                    <th className="p-2.5 text-left">المبلغ الخاضع</th>
                    <th className="p-2.5 text-center">نسبة الضريبة</th>
                    <th className="p-2.5 text-left">مبلغ الضريبة</th>
                    <th className="p-2.5 text-left rounded-tl-lg">الإجمالي شامل الضريبة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 border-x border-b border-slate-200">
                  {note.items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50">
                      <td className="p-2.5 text-center text-slate-500 font-mono">{idx + 1}</td>
                      <td className="p-2.5 font-medium text-slate-900">
                        <div>{item.nameAr}</div>
                        {item.nameEn && <div className="text-[10px] text-slate-500 font-sans">{item.nameEn}</div>}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold">{item.quantity} {item.unit}</td>
                      <td className="p-2.5 text-left font-mono">{formatSAR(item.unitPrice, false)}</td>
                      <td className="p-2.5 text-left font-mono text-slate-500">{formatSAR(item.discount || 0, false)}</td>
                      <td className="p-2.5 text-left font-mono font-semibold">{formatSAR(item.subtotal, false)}</td>
                      <td className="p-2.5 text-center font-mono">15%</td>
                      <td className="p-2.5 text-left font-mono text-slate-700">{formatSAR(item.vatAmount, false)}</td>
                      <td className="p-2.5 text-left font-mono font-bold text-slate-900">{formatSAR(item.totalWithVat, false)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals & QR Code Section */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 mb-6 items-start">
              {/* QR Code & ZATCA Seal (Left) */}
              <div className="sm:col-span-5 flex flex-col items-center sm:items-start space-y-2 border border-slate-200 p-3.5 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>رمز التحقق الإلكتروني لهيئة الزكاة (ZATCA QR)</span>
                </div>
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="ZATCA Note QR Code"
                    className="w-32 h-32 border border-slate-300 rounded-lg p-1 bg-white shadow-xs"
                  />
                ) : (
                  <div className="w-32 h-32 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                    جاري توليد الرمز...
                  </div>
                )}
                <div className="text-[10px] text-slate-500 space-y-0.5">
                  <p className="flex items-center gap-1 text-slate-600 font-semibold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> مشفر بتنسيق Base64 / TLV التجريبي المحلي
                  </p>
                  <p className="font-mono text-[9px] text-slate-400 break-all">UUID: {note.uuid}</p>
                </div>
              </div>

              {/* Financial Totals Summary (Right) */}
              <div className="sm:col-span-7 space-y-2 text-xs">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>المجموع قبل الخصم والضريبة:</span>
                    <span className="font-mono font-semibold text-slate-800">{formatSAR(note.subtotal)}</span>
                  </div>
                  {note.discountTotal > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>إجمالي الخصم الممنوح:</span>
                      <span className="font-mono font-semibold">-{formatSAR(note.discountTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>المبلغ الخاضع للضريبة (15%):</span>
                    <span className="font-mono font-semibold text-slate-800">{formatSAR(note.taxableAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-800 font-semibold border-t border-slate-200 pt-1.5">
                    <span>ضريبة القيمة المضافة (15% VAT):</span>
                    <span className="font-mono font-bold text-slate-900">{formatSAR(note.vatTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900 text-white p-3 rounded-lg font-bold text-sm mt-2">
                    <span>{isCreditNote ? 'صافي قيمة الإشعار الدائن:' : 'صافي قيمة الإشعار المدين:'}</span>
                    <span className="font-mono text-base font-extrabold">{formatSAR(note.totalAmount)}</span>
                  </div>
                </div>

                {/* Arabic Tafqeet Words */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px]">
                  <span className="font-bold text-slate-700">المبلغ كتابةً: </span>
                  <span className="font-semibold text-slate-900">{tafqeetArabic(note.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Notes & Terms */}
            {note.notes && (
              <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <span className="font-bold text-slate-700">ملاحظات إضافية: </span>
                <span className="text-slate-800">{note.notes}</span>
              </div>
            )}

            {/* Signatures & Official Approvals Footer */}
            <div className="border-t border-slate-200 pt-6 mt-6 grid grid-cols-3 gap-4 text-center text-xs text-slate-600">
              <div className="space-y-8">
                <p className="font-bold text-slate-700">المحاسب المسؤول / Prepared By</p>
                <div className="border-b border-dashed border-slate-300 w-32 mx-auto"></div>
              </div>
              <div className="space-y-8">
                <p className="font-bold text-slate-700">المدير المالي / Financial Approval</p>
                <div className="border-b border-dashed border-slate-300 w-32 mx-auto"></div>
              </div>
              <div className="space-y-8">
                <p className="font-bold text-slate-700">الختم الرسمي / Official Stamp</p>
                <div className="border-b border-dashed border-slate-300 w-32 mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
