import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { formatSAR } from '../../utils/currency';
import {
  FileSpreadsheet,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  Building,
} from 'lucide-react';
import { PaymentStatus, PaymentMethod } from '../../types/accounting';

interface InvoicesSummaryViewProps {
  startDate?: string;
  endDate?: string;
  periodLabel: string;
}

export const InvoicesSummaryView: React.FC<InvoicesSummaryViewProps> = ({
  startDate,
  endDate,
  periodLabel,
}) => {
  const { salesInvoices, purchaseInvoices, customers, suppliers } = useAccounting();

  const [invoiceType, setInvoiceType] = useState<'all' | 'sales' | 'purchases'>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Combine and normalize invoices
  const salesList = salesInvoices.map((inv) => {
    const grand = Number(inv.totalAmount) || 0;
    const paid = Number(inv.paidAmount) || 0;
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      type: 'sales' as const,
      date: inv.issueDate,
      dueDate: inv.dueDate,
      partyName: inv.customerName,
      partyVatNumber: inv.customerVatNumber,
      subtotal: Number(inv.subtotal) || 0,
      vatTotal: Number(inv.vatTotal) || 0,
      grandTotal: grand,
      paidAmount: paid,
      balanceDue: Math.max(0, grand - paid),
      paymentStatus: inv.paymentStatus,
      paymentMethod: inv.paymentMethod,
    };
  });

  const purchaseList = purchaseInvoices.map((inv) => {
    const grand = Number(inv.totalAmount) || 0;
    const paid = Number(inv.paidAmount) || 0;
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      type: 'purchases' as const,
      date: inv.issueDate,
      dueDate: inv.dueDate,
      partyName: inv.supplierName,
      partyVatNumber: inv.supplierVatNumber,
      subtotal: Number(inv.subtotal) || 0,
      vatTotal: Number(inv.vatTotal) || 0,
      grandTotal: grand,
      paidAmount: paid,
      balanceDue: Math.max(0, grand - paid),
      paymentStatus: inv.paymentStatus,
      paymentMethod: inv.paymentMethod,
    };
  });

  const allInvoices = [...salesList, ...purchaseList].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Filter
  const filteredInvoices = allInvoices.filter((inv) => {
    if (startDate && inv.date < startDate) return false;
    if (endDate && inv.date > endDate) return false;
    if (invoiceType !== 'all' && inv.type !== invoiceType) return false;
    if (paymentStatusFilter !== 'all' && inv.paymentStatus !== paymentStatusFilter) return false;
    if (
      searchTerm &&
      !inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !inv.partyName.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Calculate Aggregates for period
  const totalSalesAmount = filteredInvoices
    .filter((i) => i.type === 'sales')
    .reduce((sum, i) => sum + (i.grandTotal || 0), 0);
  const totalSalesVat = filteredInvoices
    .filter((i) => i.type === 'sales')
    .reduce((sum, i) => sum + (i.vatTotal || 0), 0);
  const totalSalesPaid = filteredInvoices
    .filter((i) => i.type === 'sales')
    .reduce((sum, i) => sum + (i.paidAmount || 0), 0);
  const totalSalesOutstanding = Math.max(0, totalSalesAmount - totalSalesPaid);

  const totalPurchasesAmount = filteredInvoices
    .filter((i) => i.type === 'purchases')
    .reduce((sum, i) => sum + (i.grandTotal || 0), 0);
  const totalPurchasesVat = filteredInvoices
    .filter((i) => i.type === 'purchases')
    .reduce((sum, i) => sum + (i.vatTotal || 0), 0);
  const totalPurchasesPaid = filteredInvoices
    .filter((i) => i.type === 'purchases')
    .reduce((sum, i) => sum + (i.paidAmount || 0), 0);
  const totalPurchasesOutstanding = Math.max(0, totalPurchasesAmount - totalPurchasesPaid);

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return { label: 'مدفوعة بالكامل', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'partial':
        return { label: 'مدفوعة جزئياً', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'unpaid':
        return { label: 'غير مدفوعة', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: 'مسودة', color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const getPaymentMethodLabel = (method?: PaymentMethod) => {
    switch (method) {
      case 'cash':
        return 'نقداً';
      case 'bank_transfer':
        return 'تحويل بنكي';
      case 'pos_card':
      case 'mada':
        return 'شبكة مدى / نقاط بيع';
      case 'credit':
        return 'آجل';
      default:
        return '-';
    }
  };

  return (
    <div className="space-y-6 text-right">
      {/* Bento Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 no-print">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>إجمالي فواتير المبيعات</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-emerald-900">
            {formatSAR(totalSalesAmount)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            ضريبة المخرجات: {formatSAR(totalSalesVat)}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>إجمالي فواتير المشتريات</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-amber-900">
            {formatSAR(totalPurchasesAmount)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            ضريبة المدخلات: {formatSAR(totalPurchasesVat)}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>المتحصلات المحصلة (مبيعات)</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-blue-900">
            {formatSAR(totalSalesPaid)}
          </div>
          <span className="text-[11px] text-blue-700 font-mono mt-1 block">
            نسبة التحصيل: {totalSalesAmount > 0 ? ((totalSalesPaid / totalSalesAmount) * 100).toFixed(1) : 0}%
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>ذمم معلقة غير محصلة (عملاء)</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-base sm:text-lg font-bold font-mono ${totalSalesOutstanding > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
            {formatSAR(totalSalesOutstanding)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            مستحقات آجلة قيد التحصيل
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
        <div className="flex flex-wrap items-center gap-2">
          {/* Invoice Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-bold ml-1">نوع الفاتورة:</span>
            {[
              { id: 'all', label: 'كافة الفواتير' },
              { id: 'sales', label: 'فواتير مبيعات' },
              { id: 'purchases', label: 'فواتير مشتريات' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setInvoiceType(t.id as any)}
                className={`px-2.5 py-1 rounded-lg border transition ${
                  invoiceType === t.id
                    ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center gap-1.5 mr-2">
            <span className="text-slate-600 font-bold ml-1">حالة السداد:</span>
            {[
              { id: 'all', label: 'الكل' },
              { id: 'paid', label: 'مدفوعة' },
              { id: 'partial', label: 'جزئي' },
              { id: 'unpaid', label: 'غير مدفوعة' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setPaymentStatusFilter(st.id)}
                className={`px-2.5 py-1 rounded-lg border transition ${
                  paymentStatusFilter === st.id
                    ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم الفاتورة أو الطرف الثاني..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3 w-28 text-center">رقم الفاتورة</th>
                <th className="p-3 text-center w-20">النوع</th>
                <th className="p-3 text-center w-24">التاريخ</th>
                <th className="p-3">الطرف الثاني (العميل / المورد)</th>
                <th className="p-3 text-left w-24">قبل الضريبة</th>
                <th className="p-3 text-left w-24">الضريبة 15%</th>
                <th className="p-3 text-left w-28">الإجمالي شامل الضريبة</th>
                <th className="p-3 text-left w-24">المدفوع</th>
                <th className="p-3 text-left w-24">المتبقي</th>
                <th className="p-3 text-center w-24">طريقة الدفع</th>
                <th className="p-3 text-center w-24">حالة السداد</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    لا توجد فواتير مطابقة للتصفية المحددة.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const statusBadge = getStatusBadge(inv.paymentStatus);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 text-center font-mono font-bold text-slate-800">{inv.invoiceNumber}</td>
                      <td className="p-3 text-center">
                        {inv.type === 'sales' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            مبيعات
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            مشتريات
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-600">{inv.date}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{inv.partyName}</div>
                        {inv.partyVatNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">ضريبة: {inv.partyVatNumber}</div>
                        )}
                      </td>
                      <td className="p-3 text-left font-mono text-slate-600">{formatSAR(inv.subtotal)}</td>
                      <td className="p-3 text-left font-mono text-slate-600">{formatSAR(inv.vatTotal)}</td>
                      <td className="p-3 text-left font-mono font-bold text-slate-900">{formatSAR(inv.grandTotal)}</td>
                      <td className="p-3 text-left font-mono text-emerald-700">{formatSAR(inv.paidAmount)}</td>
                      <td
                        className={`p-3 text-left font-mono font-bold ${
                          inv.balanceDue > 0 ? 'text-rose-700' : 'text-slate-400'
                        }`}
                      >
                        {formatSAR(inv.balanceDue)}
                      </td>
                      <td className="p-3 text-center text-[11px] text-slate-600">
                        {getPaymentMethodLabel(inv.paymentMethod)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Total Footer Row */}
            <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
              <tr>
                <td colSpan={4} className="p-3 text-right">
                  إجمالي فواتير التقرير ({filteredInvoices.length} فاتورة)
                </td>
                <td className="p-3 text-left font-mono">
                  {formatSAR(filteredInvoices.reduce((s, i) => s + i.subtotal, 0))}
                </td>
                <td className="p-3 text-left font-mono">
                  {formatSAR(filteredInvoices.reduce((s, i) => s + i.vatTotal, 0))}
                </td>
                <td className="p-3 text-left font-mono text-slate-950 font-bold">
                  {formatSAR(filteredInvoices.reduce((s, i) => s + i.grandTotal, 0))}
                </td>
                <td className="p-3 text-left font-mono text-emerald-800">
                  {formatSAR(filteredInvoices.reduce((s, i) => s + i.paidAmount, 0))}
                </td>
                <td className="p-3 text-left font-mono text-rose-800">
                  {formatSAR(filteredInvoices.reduce((s, i) => s + i.balanceDue, 0))}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
