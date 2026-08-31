import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { useToast } from '../../context/ToastContext';
import { SalesInvoice, PaymentMethod } from '../../types/accounting';
import { formatSAR } from '../../utils/currency';
import { DocumentReversalModal } from '../Common/DocumentReversalModal';
import { EmptyState } from '../Common/EmptyState';
import {
  FileText,
  Search,
  Plus,
  Printer,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Eye,
  Filter,
  DollarSign,
  Receipt,
  RotateCcw,
  Clock,
  XCircle,
  Ban,
  Trash2,
} from 'lucide-react';

interface SalesInvoicesProps {
  onOpenNewInvoice: () => void;
  onViewInvoicePrint: (invoice: SalesInvoice) => void;
}

export const SalesInvoices: React.FC<SalesInvoicesProps> = ({
  onOpenNewInvoice,
  onViewInvoicePrint,
}) => {
  const {
    salesInvoices,
    recordInvoicePayment,
    postDocument,
    cancelDraftDocument,
    reversePostedDocument,
    deleteSalesInvoice,
  } = useAccounting();
  const { toast, confirmModal } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'tax_invoice' | 'simplified_tax_invoice'>('all');

  // Payment Recording Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('bank_transfer');

  // Reversal Modal State
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [invoiceToReverse, setInvoiceToReverse] = useState<SalesInvoice | null>(null);

  const filteredInvoices = salesInvoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customerVatNumber && inv.customerVatNumber.includes(searchTerm));

    const matchesStatus =
      statusFilter === 'all' ? true : inv.paymentStatus === statusFilter;

    const matchesType =
      typeFilter === 'all' ? true : inv.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleOpenPayment = (inv: SalesInvoice) => {
    setSelectedInvoice(inv);
    setPayAmount(inv.remainingAmount || inv.totalAmount);
    setPaymentModalOpen(true);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    if (payAmount <= 0) {
      toast.warning('يرجى إدخال مبلغ سداد صحيح');
      return;
    }
    recordInvoicePayment(selectedInvoice.id, payAmount, payMethod);
    toast.success(`تم تسجيل تحصيل مبلغ ${formatSAR(payAmount)} للفاتورة ${selectedInvoice.invoiceNumber} بنجاح`);
    setPaymentModalOpen(false);
    setSelectedInvoice(null);
  };

  const handlePostInvoice = async (inv: SalesInvoice) => {
    const ok = await confirmModal({
      title: 'ترحيل الفاتورة وتوليد القيد',
      message: `هل أنت متأكد من ترحيل فاتورة المبيعات ${inv.invoiceNumber}؟ سيتم إنشاء وتثبيت القيد المحاسبي وتحديث المخزون وحساب العميل تلقائياً.`,
      severity: 'warning',
      confirmLabel: 'تأكيد الترحيل',
    });
    if (ok) {
      postDocument('sales_invoice', inv.id);
      toast.success(`تم ترحيل الفاتورة ${inv.invoiceNumber} وتوليد القيود المحاسبية بنجاح`);
    }
  };

  const handleDeleteInvoice = async (inv: SalesInvoice) => {
    const ok = await confirmModal({
      title: 'حذف مسودة الفاتورة',
      message: `هل أنت متأكد من حذف مسودة الفاتورة ${inv.invoiceNumber}؟`,
      severity: 'danger',
      confirmLabel: 'حذف المسودة',
    });
    if (ok) {
      deleteSalesInvoice(inv.id);
      toast.success(`تم حذف المسودة ${inv.invoiceNumber} بنجاح`);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">فواتير المبيعات الإلكترونية</h2>
            <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
              {salesInvoices.length} فاتورة
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إصدار ومتابعة الفواتير الضريبية والمبسطة المتوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك (ZATCA)
          </p>
        </div>

        <button
          onClick={onOpenNewInvoice}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition shadow-xs active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ إنشاء فاتورة مبيعات جديدة</span>
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 shadow-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم الفاتورة، اسم العميل، الرقم الضريبي..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">جميع حالات السداد</option>
          <option value="paid">مدفوعة بالكامل</option>
          <option value="unpaid">غير مدفوعة (آجل)</option>
          <option value="partial">مدفوعة جزئياً</option>
        </select>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">جميع أنواع الفواتير</option>
          <option value="tax_invoice">فاتورة ضريبية (B2B منشآت)</option>
          <option value="simplified_tax_invoice">فاتورة مبسطة (B2C أفراد)</option>
        </select>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">رقم الفاتورة</th>
                <th className="p-3.5">النوع</th>
                <th className="p-3.5">العميل</th>
                <th className="p-3.5">تاريخ الإصدار</th>
                <th className="p-3.5">المبلغ قبل الضريبة</th>
                <th className="p-3.5">الضريبة (15%)</th>
                <th className="p-3.5">الإجمالي</th>
                <th className="p-3.5">المتبقي</th>
                <th className="p-3.5">حالة السداد</th>
                <th className="p-3.5 text-center">حالة المستند</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center">
                    <EmptyState
                      icon={Receipt}
                      title="لا توجد فواتير مبيعات"
                      description={searchTerm ? "لم يتم العثور على فواتير تطابق معايير البحث الحالية." : "لم يتم إنشاء أي فواتير مبيعات بعد. ابدأ بإنشاء أول فاتورة ضريبية أو مبسطة."}
                      actionLabel="إنشاء فاتورة جديدة"
                      onAction={onOpenNewInvoice}
                    />
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const status = inv.status || 'posted';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="p-3.5">
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
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{inv.customerName}</div>
                        {inv.customerVatNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            الرقم الضريبي: {inv.customerVatNumber}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono">{inv.issueDate}</td>
                      <td className="p-3.5 font-mono">{formatSAR(inv.taxableAmount)}</td>
                      <td className="p-3.5 font-mono text-purple-700">{formatSAR(inv.vatTotal)}</td>
                      <td className="p-3.5 font-mono font-bold text-slate-900">{formatSAR(inv.totalAmount)}</td>
                      <td className="p-3.5 font-mono text-amber-700 font-bold">
                        {inv.remainingAmount > 0 ? formatSAR(inv.remainingAmount) : '-'}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-block ${
                            inv.paymentStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : inv.paymentStatus === 'partial'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {inv.paymentStatus === 'paid' ? 'مدفوعة' : inv.paymentStatus === 'partial' ? 'مدفوعة جزئياً' : 'غير مدفوعة (آجل)'}
                        </span>
                      </td>

                      {/* Document Status */}
                      <td className="p-3.5 text-center">
                        {status === 'posted' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>مرحّلة</span>
                          </span>
                        )}
                        {status === 'draft' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>مسودة</span>
                          </span>
                        )}
                        {status === 'reversed' && (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                            title={`معكوسة بتاريخ: ${inv.reversalDate || '-'} | السبب: ${inv.reversalReason || '-'}`}
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>معكوسة</span>
                          </span>
                        )}
                        {status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                            <Ban className="w-3 h-3" />
                            <span>ملغاة</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onViewInvoicePrint(inv)}
                            className="flex items-center gap-1 p-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition"
                            title="عرض وطباعة فاتورة ZATCA"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline text-[11px] font-semibold">طباعة</span>
                          </button>

                          {status === 'draft' && (
                            <>
                              <button
                                onClick={() => handlePostInvoice(inv)}
                                className="flex items-center gap-1 p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white transition font-bold text-[11px] border border-emerald-200"
                                title="ترحيل الفاتورة وتوليد القيد المحاسبي"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>ترحيل</span>
                              </button>
                              <button
                                onClick={async () => {
                                  const ok = await confirmModal({
                                    title: 'إلغاء مسودة الفاتورة',
                                    message: `هل أنت متأكد من إلغاء مسودة الفاتورة ${inv.invoiceNumber}؟`,
                                    severity: 'warning',
                                    confirmLabel: 'تأكيد الإلغاء',
                                  });
                                  if (ok) {
                                    cancelDraftDocument('sales_invoice', inv.id, 'إلغاء مسودة');
                                    toast.info(`تم إلغاء مسودة الفاتورة ${inv.invoiceNumber}`);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                title="إلغاء المسودة"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteInvoice(inv)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="حذف المسودة"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {status === 'posted' && (
                            <>
                              {inv.paymentStatus !== 'paid' && (
                                <button
                                  onClick={() => handleOpenPayment(inv)}
                                  className="flex items-center gap-1 p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white transition font-bold text-[11px] border border-emerald-200"
                                  title="تسجيل دفعة أو سداد"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>سداد</span>
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setInvoiceToReverse(inv);
                                  setReversalModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition flex items-center gap-1"
                                title="عكس محاسبي للفاتورة المرحّلة"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold">عكس</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {paymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 text-right space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">تسجيل سند قبض / تحصيل دفعة</h3>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg"
              >
                &times;
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>الفاتورة:</span>
                <span className="font-mono font-bold text-slate-900">{selectedInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>العميل:</span>
                <span className="font-bold text-slate-900">{selectedInvoice.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>المبلغ المتبقي:</span>
                <span className="font-mono text-amber-700 font-bold">{formatSAR(selectedInvoice.remainingAmount)}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">المبلغ المحصل (ر.س) *</label>
                <input
                  type="number"
                  min="1"
                  max={selectedInvoice.remainingAmount}
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">طريقة التحصيل / الحساب البنكي</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="bank_transfer">تحويل بنكي (مصرف الراجحي)</option>
                  <option value="cash">نقداً (الخزينة والصندوق الرئيسي)</option>
                  <option value="mada">مدى / نقاط بيع POS</option>
                  <option value="pos_card">بطاقة ائتمانية</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-xs"
                >
                  تأكيد وقيد السند
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reversal Modal */}
      {reversalModalOpen && invoiceToReverse && (
        <DocumentReversalModal
          isOpen={reversalModalOpen}
          documentType="sales_invoice"
          documentId={invoiceToReverse.id}
          documentNumber={invoiceToReverse.invoiceNumber}
          documentAmount={invoiceToReverse.totalAmount}
          onClose={() => {
            setReversalModalOpen(false);
            setInvoiceToReverse(null);
          }}
          onConfirm={(reason, reversalDate) => {
            reversePostedDocument('sales_invoice', invoiceToReverse.id, reason, reversalDate);
          }}
        />
      )}
    </div>
  );
};
