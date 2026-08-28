import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { Voucher, VoucherType } from '../../types/accounting';
import { formatSAR, formatDateAr } from '../../utils/currency';
import { VoucherFormModal } from './VoucherFormModal';
import { VoucherPrintModal } from './VoucherPrintModal';
import { DocumentReversalModal } from '../Common/DocumentReversalModal';
import {
  DollarSign,
  Plus,
  Search,
  Printer,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Receipt,
  Building2,
  CreditCard,
  FileCheck2,
  Calendar,
  Wallet,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Ban,
  Clock,
} from 'lucide-react';

export const VouchersManager: React.FC = () => {
  const {
    vouchers,
    deleteVoucher,
    postDocument,
    cancelDraftDocument,
    reversePostedDocument,
  } = useAccounting();

  const [activeFilter, setActiveFilter] = useState<'all' | 'receipt' | 'payment'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createType, setCreateType] = useState<VoucherType>('receipt');
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<Voucher | null>(null);

  // Reversal Modal State
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [voucherToReverse, setVoucherToReverse] = useState<Voucher | null>(null);

  // Statistics
  const totalReceipts = vouchers
    .filter((v) => v.type === 'receipt')
    .reduce((sum, v) => sum + v.amount, 0);

  const totalPayments = vouchers
    .filter((v) => v.type === 'payment')
    .reduce((sum, v) => sum + v.amount, 0);

  const netLiquidityChange = totalReceipts - totalPayments;

  // Filtered List
  const filteredVouchers = vouchers.filter((v) => {
    const matchesFilter = activeFilter === 'all' || v.type === activeFilter;
    const matchesSearch =
      searchTerm.trim() === '' ||
      v.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.description && v.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (v.relatedInvoiceNumber && v.relatedInvoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (v.bankName && v.bankName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (v.chequeNumber && v.chequeNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const handleOpenCreate = (type: VoucherType) => {
    setCreateType(type);
    setIsCreateModalOpen(true);
  };

  const getMethodBadge = (v: Voucher) => {
    switch (v.paymentMethod) {
      case 'cash':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700">نقداً</span>;
      case 'bank_transfer':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700">تحويل بنكي</span>;
      case 'cheque':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700">شيك ({v.chequeNumber})</span>;
      case 'mada':
      case 'pos_card':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700">مدى / POS</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">{v.paymentMethod}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12" dir="rtl">
      {/* Top Banner & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Wallet className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-slate-900">
              سندات القبض وسندات الصرف
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إدارة المقبوضات والمدفوعات النقدية والبنكية والشيكات مع القيود المحاسبية التلقائية
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenCreate('receipt')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition active:scale-95"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>إنشاء سند قبض جديد</span>
          </button>
          <button
            onClick={() => handleOpenCreate('payment')}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition active:scale-95"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>إنشاء سند صرف جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Receipts KPI */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">إجمالي سندات القبض (مقبوضات واردة)</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-extrabold text-emerald-700 font-mono">
            {formatSAR(totalReceipts)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            عدد {vouchers.filter((v) => v.type === 'receipt').length} سند قبض مسجل
          </p>
        </div>

        {/* Payments KPI */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">إجمالي سندات الصرف (مدفوعات صادرة)</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-extrabold text-amber-700 font-mono">
            {formatSAR(totalPayments)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            عدد {vouchers.filter((v) => v.type === 'payment').length} سند صرف مسجل
          </p>
        </div>

        {/* Net Liquidity Movement */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">صافي التدفق المالي للسندات</span>
            <span className={`p-2 rounded-xl ${netLiquidityChange >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
              {netLiquidityChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </span>
          </div>
          <div className={`text-xl font-extrabold font-mono ${netLiquidityChange >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
            {formatSAR(netLiquidityChange)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            الفرق بين المقبوضات والمدفوعات
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            جميع السندات ({vouchers.length})
          </button>
          <button
            onClick={() => setActiveFilter('receipt')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeFilter === 'receipt'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>سندات القبض ({vouchers.filter((v) => v.type === 'receipt').length})</span>
          </button>
          <button
            onClick={() => setActiveFilter('payment')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeFilter === 'payment'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>سندات الصرف ({vouchers.filter((v) => v.type === 'payment').length})</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم السند، الطرف، البيان..."
            className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pr-9 pl-3 py-2 text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">رقم السند</th>
                <th className="p-3.5">النوع</th>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5">الطرف (المستلم منه / المدفوع له)</th>
                <th className="p-3.5 text-left">المبلغ بالريال</th>
                <th className="p-3.5">طريقة الدفع</th>
                <th className="p-3.5">البيان والتفاصيل</th>
                <th className="p-3.5">الفاتورة المرجعية</th>
                <th className="p-3.5 text-center">الحالة</th>
                <th className="p-3.5 text-center">التوجيه المحاسبي</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Wallet className="w-10 h-10 text-slate-300" />
                      <p className="font-bold text-sm text-slate-600">لا توجد سندات قبض أو صرف مطابقة للبحث</p>
                      <p className="text-xs text-slate-400">يمكنك إنشاء سند جديد بالضغط على الأزرار أعلاه</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((v) => {
                  const isReceipt = v.type === 'receipt';
                  const status = v.status || 'posted';

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition">
                      {/* Voucher Number */}
                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        {v.voucherNumber}
                      </td>

                      {/* Type Badge */}
                      <td className="p-3.5">
                        {isReceipt ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ArrowDownLeft className="w-3 h-3" />
                            <span>سند قبض</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>سند صرف</span>
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="p-3.5 text-slate-600 font-mono">
                        {v.date}
                      </td>

                      {/* Party Name */}
                      <td className="p-3.5 font-semibold text-slate-900">
                        <div>{v.partyName}</div>
                        <div className="text-[10px] text-slate-400">
                          {v.partyType === 'customer'
                            ? 'عميل'
                            : v.partyType === 'supplier'
                            ? 'مورد'
                            : v.partyType === 'employee'
                            ? 'موظف'
                            : 'حساب عام'}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="p-3.5 text-left font-mono font-black text-sm">
                        <span className={isReceipt ? 'text-emerald-700' : 'text-amber-700'}>
                          {formatSAR(v.amount)}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <div>{getMethodBadge(v)}</div>
                          {v.bankName && <div className="text-[10px] text-slate-500">{v.bankName}</div>}
                        </div>
                      </td>

                      {/* Description */}
                      <td className="p-3.5 max-w-[200px]">
                        <p className="truncate font-medium text-slate-800 text-[11px]">
                          {v.description}
                        </p>
                      </td>

                      {/* Related Invoice */}
                      <td className="p-3.5 font-mono">
                        {v.relatedInvoiceNumber ? (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold text-[11px]">
                            {v.relatedInvoiceNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="p-3.5 text-center">
                        {status === 'posted' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>مرحّل</span>
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
                            title={`معكوس بتاريخ: ${v.reversalDate || '-'} | السبب: ${v.reversalReason || '-'}`}
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>معكوس محاسبياً</span>
                          </span>
                        )}
                        {status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                            <Ban className="w-3 h-3" />
                            <span>ملغي</span>
                          </span>
                        )}
                      </td>

                      {/* Accounting Entry Mapping */}
                      <td className="p-3.5 text-center text-[10px] text-slate-600 font-mono">
                        <div title={`مدين: ${v.debitAccountNameAr} / دائن: ${v.creditAccountNameAr}`}>
                          <span className="text-emerald-700 font-bold">{v.debitAccountCode}</span>
                          <span className="mx-1 text-slate-400">⇄</span>
                          <span className="text-slate-800 font-bold">{v.creditAccountCode}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedVoucherForPrint(v)}
                            title="طباعة السند المالي الرسمي"
                            className="p-1.5 bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 rounded-lg transition"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {status === 'draft' && (
                            <>
                              <button
                                onClick={() => postDocument('voucher', v.id)}
                                title="ترحيل السند المحاسبي وتوليد القيد"
                                className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('سبب إلغاء المسودة:') || 'إلغاء مسودة';
                                  cancelDraftDocument('voucher', v.id, reason);
                                }}
                                title="إلغاء المسودة"
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`هل أنت متأكد من حذف مسودة السند ${v.voucherNumber}؟`)) {
                                    deleteVoucher(v.id);
                                  }
                                }}
                                title="حذف مسودة السند"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {status === 'posted' && (
                            <button
                              onClick={() => {
                                setVoucherToReverse(v);
                                setReversalModalOpen(true);
                              }}
                              title="عكس محاسبي للسند المرحّل (إنشاء قيد عكسي)"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition flex items-center gap-1"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold">عكس</span>
                            </button>
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

      {/* Form Modal */}
      {isCreateModalOpen && (
        <VoucherFormModal
          initialType={createType}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(newVoucher) => {
            setSelectedVoucherForPrint(newVoucher);
          }}
        />
      )}

      {/* Print Modal */}
      {selectedVoucherForPrint && (
        <VoucherPrintModal
          voucher={selectedVoucherForPrint}
          onClose={() => setSelectedVoucherForPrint(null)}
        />
      )}

      {/* Reversal Modal */}
      {reversalModalOpen && voucherToReverse && (
        <DocumentReversalModal
          isOpen={reversalModalOpen}
          documentType="voucher"
          documentId={voucherToReverse.id}
          documentNumber={voucherToReverse.voucherNumber}
          documentAmount={voucherToReverse.amount}
          onClose={() => {
            setReversalModalOpen(false);
            setVoucherToReverse(null);
          }}
          onConfirm={(reason, reversalDate) => {
            reversePostedDocument('voucher', voucherToReverse.id, reason, reversalDate);
          }}
        />
      )}
    </div>
  );
};
