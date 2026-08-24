import React, { useEffect, useState, useRef } from 'react';
import { SalesInvoice } from '../../types/accounting';
import { useAccounting } from '../../context/AccountingContext';
import { formatSAR, formatSAR_EN, tafqeetArabic } from '../../utils/currency';
import { generateZatcaQrDataUrl } from '../../utils/zatca';
import { X, Printer, Download, ShieldCheck, CheckCircle2, QrCode } from 'lucide-react';

interface InvoicePrintModalProps {
  invoice: SalesInvoice | null;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({ invoice, onClose }) => {
  const { companySettings } = useAccounting();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (invoice) {
      generateZatcaQrDataUrl({
        sellerName: companySettings.nameAr,
        vatNumber: companySettings.vatNumber,
        timestamp: `${invoice.issueDate}T${invoice.issueTime || '12:00:00'}Z`,
        totalAmount: invoice.totalAmount,
        vatAmount: invoice.vatTotal,
      }).then((url) => setQrCodeUrl(url));
    }
  }, [invoice, companySettings]);

  if (!invoice) return null;

  const isTaxInvoice = invoice.type === 'tax_invoice';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-slate-900 no-print">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-sm sm:text-base text-slate-900">
              معاينة وطباعة الفاتورة الضريبية الرسمية (ZATCA Fatoora)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة المستند</span>
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
            id="printable-zatca-invoice"
            className="w-full max-w-[210mm] bg-white text-slate-900 p-6 sm:p-10 rounded-2xl shadow-md border border-slate-200 text-xs sm:text-sm font-sans"
            dir="rtl"
          >
            {/* Header: Company Info + Invoice Title */}
            <div className="border-b-2 border-slate-800 pb-5 mb-5">
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
                      <strong>العنوان الوطني:</strong> {companySettings.nationalAddress?.street || companySettings.address?.street || ''}، حي {companySettings.nationalAddress?.district || companySettings.address?.district || ''}، {companySettings.nationalAddress?.city || companySettings.address?.city || 'الرياض'} {companySettings.nationalAddress?.postalCode || ''}
                    </p>
                    <p>
                      <strong>الهاتف:</strong> {companySettings.phone} | <strong>البريد:</strong> {companySettings.email}
                    </p>
                  </div>
                </div>

                {/* ZATCA QR Code & Stamp */}
                <div className="flex flex-col items-center justify-center p-2 bg-slate-50 border border-slate-300 rounded-lg text-center self-center sm:self-auto min-w-[130px]">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="ZATCA Compliant QR Code"
                      className="w-28 h-28 object-contain"
                    />
                  ) : (
                    <div className="w-28 h-28 bg-slate-200 animate-pulse flex items-center justify-center text-slate-400">
                      <QrCode className="w-8 h-8" />
                    </div>
                  )}
                  <span className="text-[9px] font-bold text-slate-700 mt-1 uppercase tracking-wider">
                    رمز الاستجابة السريع ZATCA
                  </span>
                </div>
              </div>

              {/* Title Banner */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between bg-slate-100 px-4 py-2 rounded-lg">
                <div className="text-center sm:text-right">
                  <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase">
                    {isTaxInvoice ? 'فاتورة ضريبية' : 'فاتورة ضريبية مبسطة'}
                  </h2>
                  <span className="text-[10px] text-slate-600 uppercase font-semibold">
                    {isTaxInvoice ? 'TAX INVOICE' : 'SIMPLIFIED TAX INVOICE'}
                  </span>
                </div>
                <div className="text-center sm:text-left text-xs font-mono font-bold text-slate-800 mt-1 sm:mt-0">
                  <span>رقم الفاتورة: </span>
                  <span className="bg-white px-2 py-0.5 border border-slate-300 rounded">{invoice.invoiceNumber}</span>
                </div>
              </div>
            </div>

            {/* Invoice Meta Grid & Customer Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-xs">
              {/* Invoice Meta Details */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1 mb-1">
                  بيانات الفاتورة / Invoice Details
                </h4>
                <div className="flex justify-between">
                  <span className="text-slate-600">تاريخ الإصدار:</span>
                  <span className="font-semibold text-slate-900 font-mono">{invoice.issueDate} {invoice.issueTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">تاريخ الاستحقاق:</span>
                  <span className="font-semibold text-slate-900 font-mono">{invoice.dueDate || invoice.issueDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">طريقة الدفع:</span>
                  <span className="font-semibold text-slate-900">
                    {invoice.paymentMethod === 'cash' ? 'نقداً (Cash)' :
                     invoice.paymentMethod === 'bank_transfer' ? 'تحويل بنكي (Bank Transfer)' :
                     invoice.paymentMethod === 'mada' ? 'مدى / شبكة (Mada / POS)' :
                     invoice.paymentMethod === 'pos_card' ? 'بطاقة ائتمانية (Credit Card)' : 'آجل (Credit)'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-500">معرف الفاتورة ZATCA UUID:</span>
                  <span className="font-mono text-slate-700 truncate max-w-[150px]">{invoice.uuid}</span>
                </div>
              </div>

              {/* Customer / Buyer Details */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1 mb-1">
                  بيانات العميل (المشتري) / Buyer Details
                </h4>
                <div className="flex justify-between">
                  <span className="text-slate-600">اسم العميل:</span>
                  <span className="font-bold text-slate-900">{invoice.customerName}</span>
                </div>
                {invoice.customerVatNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">الرقم الضريبي للمشتري:</span>
                    <span className="font-mono font-bold text-slate-900">{invoice.customerVatNumber}</span>
                  </div>
                )}
                {invoice.customerCrNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">السجل التجاري للمشتري:</span>
                    <span className="font-mono text-slate-900">{invoice.customerCrNumber}</span>
                  </div>
                )}
                {invoice.customerAddress && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">العنوان:</span>
                    <span className="text-slate-900 text-right">{invoice.customerAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto mb-6 border border-slate-300 rounded-lg">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2.5 text-center w-8">#</th>
                    <th className="p-2.5">بيان السلعة أو الخدمة / Description</th>
                    <th className="p-2.5 text-center">الكمية</th>
                    <th className="p-2.5 text-left">سعر الوحدة</th>
                    <th className="p-2.5 text-left">الخصم</th>
                    <th className="p-2.5 text-left">المبلغ الخاضع</th>
                    <th className="p-2.5 text-center">الضريبة</th>
                    <th className="p-2.5 text-left">مبلغ الضريبة</th>
                    <th className="p-2.5 text-left">الإجمالي شامل الضريبة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoice.items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center text-slate-500">{idx + 1}</td>
                      <td className="p-2.5 font-medium text-slate-900">{item.nameAr}</td>
                      <td className="p-2.5 text-center font-mono">
                        {item.quantity} {item.unit || ''}
                      </td>
                      <td className="p-2.5 text-left font-mono">{formatSAR(item.unitPrice, false)}</td>
                      <td className="p-2.5 text-left font-mono text-slate-500">{formatSAR(item.discount || 0, false)}</td>
                      <td className="p-2.5 text-left font-mono">{formatSAR(item.subtotal, false)}</td>
                      <td className="p-2.5 text-center font-mono">{(item.vatRate * 100).toFixed(0)}%</td>
                      <td className="p-2.5 text-left font-mono text-purple-700">{formatSAR(item.vatAmount, false)}</td>
                      <td className="p-2.5 text-left font-mono font-bold text-slate-950">
                        {formatSAR(item.totalWithVat, false)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary & Tafqeet */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-6">
              {/* Tafqeet & Bank Details */}
              <div className="sm:col-span-7 bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex flex-col justify-between text-xs space-y-3">
                <div>
                  <span className="font-bold text-slate-700 block mb-1">المبلغ كتابة بالحروف العربية (Tafqeet):</span>
                  <p className="bg-white p-2 border border-slate-300 rounded font-semibold text-slate-900 leading-relaxed">
                    {tafqeetArabic(invoice.totalAmount)}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                  <p className="font-bold text-slate-800 mb-0.5">بيانات التحويل البنكي:</p>
                  <p>{companySettings.bankDetails.bankName} - الحساب: {companySettings.bankDetails.accountHolder}</p>
                  <p className="font-mono font-bold text-slate-900">IBAN: {companySettings.bankDetails.iban}</p>
                </div>
              </div>

              {/* Total Calculation Table */}
              <div className="sm:col-span-5 bg-slate-100 p-3.5 rounded-lg border border-slate-300 text-xs space-y-2">
                <div className="flex justify-between text-slate-700">
                  <span>الإجمالي قبل الخصم والضريبة:</span>
                  <span className="font-mono font-semibold">{formatSAR(invoice.subtotal)}</span>
                </div>
                {invoice.discountTotal > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>إجمالي الخصم التجاري:</span>
                    <span className="font-mono">- {formatSAR(invoice.discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-800 font-medium">
                  <span>المبلغ الخاضع للضريبة (15%):</span>
                  <span className="font-mono">{formatSAR(invoice.taxableAmount)}</span>
                </div>
                <div className="flex justify-between text-purple-700 font-bold">
                  <span>إجمالي ضريبة القيمة المضافة (15%):</span>
                  <span className="font-mono">{formatSAR(invoice.vatTotal)}</span>
                </div>
                <div className="border-t-2 border-slate-800 pt-2 flex justify-between text-slate-950 font-black text-sm">
                  <span>المبلغ الإجمالي المستحق:</span>
                  <span className="font-mono text-emerald-700">{formatSAR(invoice.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Footer notes & Stamp/Signature area */}
            <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-4">
              <div className="max-w-md text-right">
                <p className="font-medium text-slate-700">{companySettings.invoiceFooterNotesAr}</p>
                <p className="text-[10px] text-slate-500 font-sans mt-0.5">{companySettings.invoiceFooterNotesEn}</p>
              </div>

              <div className="flex items-center gap-8 text-center pt-2 sm:pt-0">
                <div>
                  <p className="text-[10px] text-slate-600 font-bold mb-6">توقيع المستلم / Receiver</p>
                  <div className="w-24 border-b border-slate-400"></div>
                </div>
                <div>
                  <p className="text-[10px] text-slate-600 font-bold mb-6">الختم والاعتماد / Stamp</p>
                  <div className="w-24 h-10 border border-dashed border-slate-300 rounded flex items-center justify-center text-[9px] text-slate-400">
                    ختم المنشأة
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
