import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { useToast } from '../../context/ToastContext';
import { DebitCreditNote, NoteType } from '../../types/accounting';
import { formatSAR, formatDateAr } from '../../utils/currency';
import { DebitCreditNoteModal } from './DebitCreditNoteModal';
import { DebitCreditNotePrintModal } from './DebitCreditNotePrintModal';
import { DocumentReversalModal } from '../Common/DocumentReversalModal';
import { EmptyState } from '../Common/EmptyState';
import {
  FileText,
  Plus,
  Search,
  Printer,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Filter,
  CheckCircle2,
  Receipt,
  Boxes,
  FileCheck2,
  RotateCcw,
  Clock,
  XCircle,
  Ban,
} from 'lucide-react';

export const DebitCreditNotesView: React.FC = () => {
  const {
    debitCreditNotes,
    deleteDebitCreditNote,
    postDocument,
    cancelDraftDocument,
    reversePostedDocument,
    setActiveTab,
  } = useAccounting();
  const { toast, confirmModal } = useToast();

  const [activeFilter, setActiveFilter] = useState<'all' | 'credit_note' | 'debit_note'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createType, setCreateType] = useState<NoteType>('credit_note');
  const [selectedNoteForPrint, setSelectedNoteForPrint] = useState<DebitCreditNote | null>(null);

  // Reversal Modal State
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [noteToReverse, setNoteToReverse] = useState<DebitCreditNote | null>(null);

  const handlePostNote = async (note: DebitCreditNote) => {
    const ok = await confirmModal({
      title: 'ترحيل الإشعار المحاسبي',
      message: `هل أنت متأكد من ترحيل الإشعار ${note.noteNumber}؟ سيتم إنشاء القيود العكسية وتعديل رصيد الضريبة والمخزون وحساب الطرف المعني.`,
      severity: 'warning',
      confirmLabel: 'تأكيد الترحيل',
    });
    if (ok) {
      postDocument('debit_credit_note', note.id);
      toast.success(`تم ترحيل الإشعار ${note.noteNumber} بنجاح`);
    }
  };

  const handleDeleteNote = async (note: DebitCreditNote) => {
    const ok = await confirmModal({
      title: 'حذف مسودة الإشعار',
      message: `هل أنت متأكد من حذف مسودة الإشعار رقم ${note.noteNumber}؟`,
      severity: 'danger',
      confirmLabel: 'حذف المسودة',
    });
    if (ok) {
      deleteDebitCreditNote(note.id);
      toast.success(`تم حذف مسودة الإشعار ${note.noteNumber} بنجاح`);
    }
  };

  // Statistics calculation
  const totalCreditNotes = debitCreditNotes
    .filter((n) => n.type === 'credit_note')
    .reduce((sum, n) => sum + n.totalAmount, 0);

  const totalDebitNotes = debitCreditNotes
    .filter((n) => n.type === 'debit_note')
    .reduce((sum, n) => sum + n.totalAmount, 0);

  const totalVatAdjusted = debitCreditNotes.reduce((sum, n) => {
    return sum + (n.type === 'credit_note' ? -n.vatTotal : n.vatTotal);
  }, 0);

  // Filtered List
  const filteredNotes = debitCreditNotes.filter((note) => {
    const matchesFilter = activeFilter === 'all' || note.type === activeFilter;
    const matchesSearch =
      searchTerm.trim() === '' ||
      note.noteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.originalInvoiceNumber && note.originalInvoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (note.reasonTextAr && note.reasonTextAr.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const handleOpenCreate = (type: NoteType) => {
    setCreateType(type);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12" dir="rtl">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Receipt className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-slate-900">
              نظام الإشعارات المدينة والإشعارات الدائنة
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إدارة مردودات المبيعات والمشتريات وتعديلات الفواتير وفق لوائح هيئة الزكاة والضريبة والجمارك (ZATCA)
          </p>
        </div>

        {/* Create Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenCreate('credit_note')}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition active:scale-95"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>إشعار دائن جديد (مردودات مبيعات)</span>
          </button>
          <button
            onClick={() => handleOpenCreate('debit_note')}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition active:scale-95"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>إشعار مدين جديد (مردودات مشتريات)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Credit Notes KPI */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">إجمالي الإشعارات الدائنة (تخفيضات/مردودات)</span>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono">
            {formatSAR(totalCreditNotes)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            عدد {debitCreditNotes.filter((n) => n.type === 'credit_note').length} إشعار دائن صادر
          </p>
        </div>

        {/* Debit Notes KPI */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">إجمالي الإشعارات المدينة (مردودات مشتريات)</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono">
            {formatSAR(totalDebitNotes)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            عدد {debitCreditNotes.filter((n) => n.type === 'debit_note').length} إشعار مدين صادر
          </p>
        </div>

        {/* VAT Adjustment KPI */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">صافي تسويات ضريبة القيمة المضافة (ZATCA)</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-extrabold text-emerald-700 font-mono">
            {formatSAR(Math.abs(totalVatAdjusted))}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            تأثير مباشر على إقرار ضريبة القيمة المضافة
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
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
            جميع الإشعارات ({debitCreditNotes.length})
          </button>
          <button
            onClick={() => setActiveFilter('credit_note')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeFilter === 'credit_note'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>إشعارات دائنة ({debitCreditNotes.filter((n) => n.type === 'credit_note').length})</span>
          </button>
          <button
            onClick={() => setActiveFilter('debit_note')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeFilter === 'debit_note'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>إشعارات مدينة ({debitCreditNotes.filter((n) => n.type === 'debit_note').length})</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم الإشعار، العميل، الفاتورة..."
            className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pr-9 pl-3 py-2 text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Notes Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">رقم الإشعار</th>
                <th className="p-3.5">النوع</th>
                <th className="p-3.5">تاريخ الإصدار</th>
                <th className="p-3.5">الطرف (العميل / المورد)</th>
                <th className="p-3.5">الفاتورة المرجعية</th>
                <th className="p-3.5">السبب والبيان</th>
                <th className="p-3.5 text-left">المبلغ قبل الضريبة</th>
                <th className="p-3.5 text-left">ضريبة 15%</th>
                <th className="p-3.5 text-left">الإجمالي شامل الضريبة</th>
                <th className="p-3.5 text-center">المستودع</th>
                <th className="p-3.5 text-center">الحالة</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredNotes.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center">
                    <EmptyState
                      icon={Receipt}
                      title="لا توجد إشعارات مدينة أو دائنة"
                      description={searchTerm ? "لم يتم العثور على إشعارات تطابق معايير البحث." : "لم يتم إنشاء أي إشعارات مدينة أو دائنة بعد. يمكنك إصدار إشعار لتسوية المردودات أو الخصومات."}
                      actionLabel="إصدار إشعار دائن جديد"
                      onAction={() => {
                        setCreateType('credit_note');
                        setIsCreateModalOpen(true);
                      }}
                    />
                  </td>
                </tr>
              ) : (
                filteredNotes.map((note) => {
                  const isCredit = note.type === 'credit_note';
                  const status = note.status || 'posted';

                  return (
                    <tr key={note.id} className="hover:bg-slate-50/70 transition">
                      {/* Note Number */}
                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        <span className="text-slate-900">{note.noteNumber}</span>
                      </td>

                      {/* Type Badge */}
                      <td className="p-3.5">
                        {isCredit ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <ArrowDownLeft className="w-3 h-3" />
                            <span>إشعار دائن (Credit)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>إشعار مدين (Debit)</span>
                          </span>
                        )}
                      </td>

                      {/* Issue Date */}
                      <td className="p-3.5 text-slate-600 font-mono">
                        {note.issueDate}
                      </td>

                      {/* Party Name */}
                      <td className="p-3.5 font-semibold text-slate-900">
                        <div>{note.partyName}</div>
                        <div className="text-[10px] text-slate-400">
                          {note.partyType === 'customer' ? 'عميل' : 'مورد'}
                          {note.partyVatNumber ? ` • ضريبي: ${note.partyVatNumber}` : ''}
                        </div>
                      </td>

                      {/* Original Invoice */}
                      <td className="p-3.5 font-mono">
                        {note.originalInvoiceNumber ? (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold text-[11px]">
                            {note.originalInvoiceNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Reason */}
                      <td className="p-3.5 max-w-[200px]">
                        <p className="truncate font-medium text-slate-800 text-[11px]">
                          {note.reasonTextAr || 'تسوية محاسبية'}
                        </p>
                      </td>

                      {/* Taxable Amount */}
                      <td className="p-3.5 text-left font-mono font-medium text-slate-700">
                        {formatSAR(note.taxableAmount)}
                      </td>

                      {/* VAT Amount */}
                      <td className="p-3.5 text-left font-mono font-medium text-slate-700">
                        {formatSAR(note.vatTotal)}
                      </td>

                      {/* Total Amount */}
                      <td className="p-3.5 text-left font-mono font-extrabold text-slate-900 text-sm">
                        {formatSAR(note.totalAmount)}
                      </td>

                      {/* Inventory Badge */}
                      <td className="p-3.5 text-center">
                        {note.affectInventory ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            <Boxes className="w-3 h-3" />
                            <span>محدّث</span>
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
                            title={`معكوس بتاريخ: ${note.reversalDate || '-'} | السبب: ${note.reversalReason || '-'}`}
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

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedNoteForPrint(note)}
                            title="طباعة الإشعار الضريبي الرسمي ZATCA"
                            className="p-1.5 bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 rounded-lg transition"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {status === 'draft' && (
                            <>
                              <button
                                onClick={() => handlePostNote(note)}
                                title="ترحيل الإشعار المحاسبي وتوليد القيد"
                                className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={async () => {
                                  const ok = await confirmModal({
                                    title: 'إلغاء مسودة الإشعار',
                                    message: `هل أنت متأكد من إلغاء مسودة الإشعار رقم ${note.noteNumber}؟`,
                                    severity: 'warning',
                                    confirmLabel: 'تأكيد الإلغاء',
                                  });
                                  if (ok) {
                                    cancelDraftDocument('debit_credit_note', note.id, 'إلغاء مسودة');
                                    toast.info(`تم إلغاء مسودة الإشعار ${note.noteNumber}`);
                                  }
                                }}
                                title="إلغاء المسودة"
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note)}
                                title="حذف مسودة الإشعار"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {status === 'posted' && (
                            <button
                              onClick={() => {
                                setNoteToReverse(note);
                                setReversalModalOpen(true);
                              }}
                              title="عكس محاسبي للإشعار المرحّل (إنشاء قيد عكسي)"
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

      {/* Creation Modal */}
      {isCreateModalOpen && (
        <DebitCreditNoteModal
          initialType={createType}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(newNote) => {
            setSelectedNoteForPrint(newNote);
          }}
        />
      )}

      {/* Print Document Modal */}
      {selectedNoteForPrint && (
        <DebitCreditNotePrintModal
          note={selectedNoteForPrint}
          onClose={() => setSelectedNoteForPrint(null)}
        />
      )}

      {/* Reversal Modal */}
      {reversalModalOpen && noteToReverse && (
        <DocumentReversalModal
          isOpen={reversalModalOpen}
          documentType="debit_credit_note"
          documentId={noteToReverse.id}
          documentNumber={noteToReverse.noteNumber}
          documentAmount={noteToReverse.totalAmount}
          onClose={() => {
            setReversalModalOpen(false);
            setNoteToReverse(null);
          }}
          onConfirm={(reason, reversalDate) => {
            reversePostedDocument('debit_credit_note', noteToReverse.id, reason, reversalDate);
          }}
        />
      )}
    </div>
  );
};
