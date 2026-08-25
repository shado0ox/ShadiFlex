import React, { useEffect, useState } from 'react';
import { SalesInvoice, CompanySettings, Branch, CashRegister } from '../../types/accounting';
import { generateZatcaPhase2QrDataUrl } from '../../utils/zatcaPhase2';
import { ShadiFlexLogo } from '../Branding/ShadiFlexLogo';
import { Printer, X, CheckCircle, Share2, Store, CreditCard, User, Clock, Building2 } from 'lucide-react';

interface PosReceiptModalProps {
  invoice: SalesInvoice;
  companySettings: CompanySettings;
  branch?: Branch;
  register?: CashRegister;
  onClose: () => void;
  onNewSale?: () => void;
}

export const PosReceiptModal: React.FC<PosReceiptModalProps> = ({
  invoice,
  companySettings,
  branch,
  register,
  onClose,
  onNewSale,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    const fetchQr = async () => {
      const qr = await generateZatcaPhase2QrDataUrl({
        sellerName: branch?.nameAr || invoice.branchName || companySettings.nameAr,
        vatNumber: branch?.vatNumber || companySettings.vatNumber,
        timestamp: `${invoice.issueDate}T${invoice.issueTime || '12:00:00'}Z`,
        totalAmount: invoice.totalAmount,
        vatAmount: invoice.vatTotal,
        invoiceHash: invoice.hash,
      });
      setQrDataUrl(qr);
    };
    fetchQr();
  }, [invoice, companySettings, branch]);

  const handlePrint = () => {
    window.print();
  };

  const paymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'نقداً (Cash)';
      case 'mada':
      case 'pos_card':
        return 'مدى / بطاقة بنكية (Mada)';
      case 'credit_card':
        return 'بطاقة ائتمان (Credit Card)';
      case 'bank_transfer':
        return 'تحويل بنكي';
      case 'credit':
        return 'آجل (On Credit)';
      default:
        return method;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto" dir="rtl">
      {/* Container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Top Control Bar - Hidden during print */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">تم إصدار فاتورة نقطة البيع بنجاح</h3>
              <p className="text-xs text-slate-400 font-mono">{invoice.invoiceNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              طباعة إيصال حراري (80mm)
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Area */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100 flex justify-center flex-1">
          {/* 80mm Thermal Receipt Canvas */}
          <div
            id="pos-thermal-receipt"
            className="w-full max-w-[320px] bg-white text-slate-900 p-5 rounded-lg shadow-md font-sans text-xs border border-slate-300 print:shadow-none print:border-none print:p-2 print:w-[80mm] print:max-w-[80mm] print:m-0"
          >
            {/* Header: Company & Branch Info */}
            <div className="text-center pb-3 border-b border-dashed border-slate-400 space-y-1">
              <div className="flex justify-center mb-1">
                <ShadiFlexLogo size="sm" />
              </div>
              <h2 className="text-sm font-black text-slate-900 leading-tight">
                {companySettings.nameAr}
              </h2>
              {companySettings.nameEn && (
                <p className="text-[10px] text-slate-600 font-medium">
                  {companySettings.nameEn}
                </p>
              )}
              <div className="text-[11px] font-bold text-emerald-800 pt-0.5">
                {branch?.nameAr || invoice.branchName || 'الفرع الرئيسي وصالة العرض'}
              </div>
              <p className="text-[10px] text-slate-600">
                {branch?.street || companySettings.nationalAddress?.street || 'طريق الملك فهد'} - {branch?.district || companySettings.nationalAddress?.district || 'العليا'}، {branch?.city || companySettings.nationalAddress?.city || 'الرياض'}
              </p>
              <p className="text-[10px] text-slate-600 font-mono">
                هاتف: {branch?.phone || companySettings.phone}
              </p>

              <div className="pt-1.5 flex flex-col gap-0.5 text-[10px] font-mono font-semibold">
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="text-slate-500">الرقم الضريبي VAT:</span>
                  <span>{branch?.vatNumber || companySettings.vatNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">السجل التجاري CR:</span>
                  <span>{branch?.crNumber || companySettings.crNumber}</span>
                </div>
              </div>
            </div>

            {/* Receipt Type Title */}
            <div className="py-2.5 text-center border-b border-dashed border-slate-400">
              <span className="inline-block px-2.5 py-0.5 bg-slate-900 text-white rounded font-bold text-[11px]">
                {invoice.type === 'tax_invoice' ? 'فاتورة ضريبية (B2B)' : 'فاتورة ضريبية مبسطة (B2C)'}
              </span>
              <p className="text-[9px] text-slate-500 mt-1">
                معتمدة وفق لائحة هيئة الزكاة والضريبة والجمارك (ZATCA Phase 2)
              </p>
            </div>

            {/* Invoice Meta */}
            <div className="py-2 text-[10px] border-b border-dashed border-slate-400 space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">رقم الفاتورة:</span>
                <span className="font-bold text-slate-900">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">التاريخ والوقت:</span>
                <span>{invoice.issueDate} | {invoice.issueTime || '12:00:00'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">نقطة البيع (الكاشير):</span>
                <span>{invoice.registerName || register?.nameAr || 'صندوق كاشير 1'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">اسم الكاشير:</span>
                <span>{invoice.cashierName || 'سعود المحاسب'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">العميل:</span>
                <span className="font-sans font-bold text-slate-800">{invoice.customerName || 'عميل نقدي / عام'}</span>
              </div>
              {invoice.customerVatNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">الرقم الضريبي للعميل:</span>
                  <span>{invoice.customerVatNumber}</span>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="py-2 border-b border-dashed border-slate-400">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-600 text-right">
                    <th className="pb-1 text-right">الصنف</th>
                    <th className="pb-1 text-center">الكمية</th>
                    <th className="pb-1 text-left">السعر</th>
                    <th className="pb-1 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="py-1">
                      <td className="py-1 text-right font-medium text-slate-900">
                        <div>{item.nameAr}</div>
                        {item.discount > 0 && (
                          <span className="text-[9px] text-rose-600 font-mono block">
                            (خصم: {item.discount.toFixed(2)} ر.س)
                          </span>
                        )}
                      </td>
                      <td className="py-1 text-center font-mono text-slate-700">
                        {item.quantity} {item.unit || 'حبة'}
                      </td>
                      <td className="py-1 text-left font-mono text-slate-700">
                        {item.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-1 text-left font-mono font-bold text-slate-900">
                        {item.totalWithVat.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Totals Summary */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>المجموع الخاضع للضريبة:</span>
                <span className="font-mono">{invoice.taxableAmount.toFixed(2)} ر.س</span>
              </div>
              {invoice.discountTotal > 0 && (
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>إجمالي الخصم التجاري:</span>
                  <span className="font-mono">-{invoice.discountTotal.toFixed(2)} ر.س</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>ضريبة القيمة المضافة (15%):</span>
                <span className="font-mono">{invoice.vatTotal.toFixed(2)} ر.س</span>
              </div>
              <div className="flex justify-between font-black text-sm text-slate-900 border-t border-slate-300 pt-1.5">
                <span>الإجمالي شامل الضريبة:</span>
                <span className="font-mono text-emerald-800">{invoice.totalAmount.toFixed(2)} ر.س</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">طريقة الدفع:</span>
                <span className="font-bold text-slate-800">{paymentMethodLabel(invoice.paymentMethod)}</span>
              </div>

              {invoice.splitPaymentDetails && (
                <div className="bg-slate-50 p-1 rounded space-y-0.5 text-[9px] border border-slate-200">
                  <div className="flex justify-between">
                    <span>نقداً:</span>
                    <span>{invoice.splitPaymentDetails.cashAmount.toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between">
                    <span>مدى:</span>
                    <span>{invoice.splitPaymentDetails.madaAmount.toFixed(2)} ر.س</span>
                  </div>
                </div>
              )}

              {invoice.cashTendered !== undefined && invoice.cashTendered > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">المبلغ المدفوع نقداً:</span>
                    <span>{invoice.cashTendered.toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-700">
                    <span className="font-sans">الباقي المسترجع للعميل:</span>
                    <span>{(invoice.changeReturned || 0).toFixed(2)} ر.س</span>
                  </div>
                </>
              )}

              {invoice.madaAuthCode && (
                <div className="flex justify-between text-slate-500">
                  <span className="font-sans">رقم تفويض مدى:</span>
                  <span>{invoice.madaAuthCode}</span>
                </div>
              )}
            </div>

            {/* ZATCA Phase 2 QR Code */}
            <div className="py-3 flex flex-col items-center justify-center text-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="ZATCA Phase 2 QR"
                  className="w-32 h-32 border border-slate-200 rounded p-1 bg-white"
                />
              ) : (
                <div className="w-32 h-32 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                  جاري تجهيز رمز الاستجابة...
                </div>
              )}
              <p className="text-[9px] text-slate-500 mt-1.5 font-medium">
                امسح الرمز عبر تطبيق «زكاة وضريبة» للتحقق من نظامية الفاتورة
              </p>
            </div>

            {/* Receipt Footer */}
            <div className="text-center pt-2 border-t border-dashed border-slate-400 text-[9px] text-slate-500 space-y-0.5">
              <p className="font-bold text-slate-700">شكراً لزيارتكم ونسعد بخدمتكم دائماً</p>
              <p>{companySettings.invoiceFooterNotesAr || 'البضاعة المباعة ترد وتستبدل خلال 3 أيام بموجب الفاتورة'}</p>
              <p className="font-mono text-[8px] text-slate-400">UUID: {invoice.uuid}</p>
            </div>
          </div>
        </div>

        {/* Bottom Actions - Hidden during print */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            إغلاق
          </button>
          <div className="flex items-center gap-2">
            {onNewSale && (
              <button
                onClick={() => {
                  onClose();
                  onNewSale();
                }}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
              >
                طلب بيع جديد (+)
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" />
              طباعة الإيصال
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
