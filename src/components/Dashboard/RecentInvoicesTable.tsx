import React from 'react';
import { Printer } from 'lucide-react';
import { SalesInvoice } from '../../types/accounting';
import { formatSAR } from '../../utils/currency';

interface RecentInvoicesTableProps {
  invoices: SalesInvoice[];
  onViewAllInvoices: () => void;
  onOpenNewSalesInvoice: () => void;
  onViewInvoicePrint: (invoice: SalesInvoice) => void;
}

export const RecentInvoicesTable: React.FC<RecentInvoicesTableProps> = ({
  invoices,
  onViewAllInvoices,
  onOpenNewSalesInvoice,
  onViewInvoicePrint,
}) => {
  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              أحدث فواتير المبيعات الإلكترونية (ZATCA)
            </h3>
            <p className="text-xs text-slate-500">الفواتير الضريبية والمبسطة المتوافقة مع هيئة الزكاة</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onViewAllInvoices}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-bold px-3 py-1.5 rounded-xl hover:bg-emerald-50 transition"
            >
              جميع الفواتير &larr;
            </button>
            <button
              onClick={onOpenNewSalesInvoice}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-xl transition shadow-xs"
            >
              + إنشاء فاتورة
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
              <tr>
                <th className="p-2.5">رقم الفاتورة</th>
                <th className="p-2.5">النوع</th>
                <th className="p-2.5">العميل</th>
                <th className="p-2.5">التاريخ</th>
                <th className="p-2.5">المبلغ شامل الضريبة</th>
                <th className="p-2.5">الحالة</th>
                <th className="p-2.5 text-center">طباعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    لا توجد فواتير مبيعات مسجلة حتى الآن.
                  </td>
                </tr>
              ) : (
                invoices.slice(0, 4).map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-2.5 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="p-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          inv.type === 'tax_invoice'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-teal-50 text-teal-700 border-teal-200'
                        }`}
                      >
                        {inv.type === 'tax_invoice' ? 'ضريبية B2B' : 'مبسطة B2C'}
                      </span>
                    </td>
                    <td className="p-2.5 font-medium text-slate-800">{inv.customerName}</td>
                    <td className="p-2.5 text-slate-500">{inv.issueDate}</td>
                    <td className="p-2.5 font-mono font-bold text-slate-900">{formatSAR(inv.totalAmount)}</td>
                    <td className="p-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          inv.paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : inv.paymentStatus === 'partial'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {inv.paymentStatus === 'paid' ? 'مدفوعة' : inv.paymentStatus === 'partial' ? 'جزئية' : 'آجل'}
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => onViewInvoicePrint(inv)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition"
                        title="عرض وطباعة فاتورة ZATCA الرسمية"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecentInvoicesTable;
