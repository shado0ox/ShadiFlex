import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { JournalEntryLine, JournalEntry, DocumentStatus } from '../../types/accounting';
import { formatSAR } from '../../utils/currency';
import { documentSequenceService } from '../../services/documentSequenceService';
import { DocumentReversalModal } from '../Common/DocumentReversalModal';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  RotateCcw,
  Clock,
  Ban,
  XCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface NewJournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (entryNumber: string) => void;
}

export const NewJournalEntryModal: React.FC<NewJournalEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    accounts,
    journalEntries,
    createManualJournalEntry,
    validateJournalEntry,
    companySettings,
    checkDateInFiscalYear,
    checkDateInFiscalPeriod,
  } = useAccounting();

  const fiscalYear = companySettings.fiscalYear || new Date().getFullYear();
  const nextEntryNumber = documentSequenceService.peekNextNumber(
    'journal_entry',
    fiscalYear,
    journalEntries.map((j) => j.entryNumber)
  );

  const [entryNumber, setEntryNumber] = useState(nextEntryNumber);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [narrationAr, setNarrationAr] = useState('');
  const [docStatus, setDocStatus] = useState<'posted' | 'draft'>('posted');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [lines, setLines] = useState<JournalEntryLine[]>([
    {
      id: `line_1_${Date.now()}`,
      accountId: accounts.find((a) => a.code === '5201' && a.isTransactional)?.id || accounts.find((a) => a.isTransactional)?.id || '',
      accountCode: '5201',
      accountNameAr: 'رواتب وأجور وبدلات العاملين',
      debit: 5000,
      credit: 0,
      description: 'إثبات مصروف الرواتب',
    },
    {
      id: `line_2_${Date.now()}`,
      accountId: accounts.find((a) => a.code === '110102' && a.isTransactional)?.id || accounts.filter((a) => a.isTransactional)[1]?.id || '',
      accountCode: '110102',
      accountNameAr: 'مصرف الراجحي - الحساب الجاري',
      debit: 0,
      credit: 5000,
      description: 'صرف من الحساب البنكي',
    },
  ]);

  if (!isOpen) return null;

  // Real-time journal validation (strict money math, account eligibility, 2-decimal precision)
  const validation = validateJournalEntry({
    entryNumber,
    date,
    narrationAr,
    lines,
    status: docStatus,
  });

  const handleLineChange = (index: number, field: keyof JournalEntryLine, value: any) => {
    setSubmitError(null);
    const updated = [...lines];
    const current = { ...updated[index] };

    if (field === 'accountId') {
      current.accountId = value;
      const selectedAcc = accounts.find((a) => a.id === value);
      if (selectedAcc) {
        current.accountCode = selectedAcc.code;
        current.accountNameAr = selectedAcc.nameAr;
      }
    } else if (field === 'debit') {
      const numVal = isNaN(Number(value)) ? 0 : Math.max(0, Number(value));
      current.debit = numVal;
      if (numVal > 0) {
        current.credit = 0; // Prevent both debit and credit on same line
      }
    } else if (field === 'credit') {
      const numVal = isNaN(Number(value)) ? 0 : Math.max(0, Number(value));
      current.credit = numVal;
      if (numVal > 0) {
        current.debit = 0; // Prevent both debit and credit on same line
      }
    } else {
      (current as any)[field] = value;
    }

    updated[index] = current;
    setLines(updated);
  };

  const addLine = () => {
    setSubmitError(null);
    setLines([
      ...lines,
      {
        id: `line_${Date.now()}_${lines.length}`,
        accountId: '',
        accountCode: '',
        accountNameAr: '',
        debit: 0,
        credit: 0,
        description: '',
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    setSubmitError(null);
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!narrationAr.trim()) {
      setSubmitError('يرجى كتابة شرح وبيان القيد المحاسبي');
      return;
    }

    if (!validation.isValid) {
      setSubmitError(validation.errors[0] || 'القيد غير صالح محاسبياً');
      return;
    }

    try {
      createManualJournalEntry({
        entryNumber,
        date,
        referenceType: 'manual',
        narrationAr,
        lines,
        totalDebit: validation.totalDebit,
        totalCredit: validation.totalCredit,
        isBalanced: true,
        status: docStatus,
      });

      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.6 },
      });

      onSuccess(entryNumber);
      onClose();
    } catch (err: any) {
      setSubmitError(err?.message || 'حدث خطأ أثناء التحقق من صحة القيد وحفظه');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">إضافة قيد يومية عامة يدوي</h3>
              <p className="text-xs text-slate-500">تسوية حسابات، رواتب، مصاريف، إهلاك، أو قيود تسوية سنوية</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-right">
          {submitError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{submitError}</span>
            </div>
          )}

          {validation.errors.length > 0 && (
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-1 text-amber-800">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>ملاحظات التدقيق المحاسبي الصارم للقيد:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800/90 text-2xs pr-1">
                {validation.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">رقم سند القيد *</label>
              <input
                type="text"
                value={entryNumber}
                onChange={(e) => setEntryNumber(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">حالة القيد</label>
              <select
                value={docStatus}
                onChange={(e) => setDocStatus(e.target.value as 'posted' | 'draft')}
                className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="posted">مرحّل للأستاذ العام</option>
                <option value="draft">مسودة (دون تأثير مالي)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">تاريخ القيد *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">البيان والشرح العام للقيد *</label>
              <input
                type="text"
                value={narrationAr}
                onChange={(e) => setNarrationAr(e.target.value)}
                placeholder="مثال: إثبات سداد إيجار المكتب الشهري"
                className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Fiscal Period & Year Warning Alert */}
          {(() => {
            const pCheck = checkDateInFiscalPeriod(date);
            const yCheck = checkDateInFiscalYear(date);

            if (pCheck.isClosed) {
              return (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">تحذير رقابي حاسم: </span>
                    الفترة المالية ({pCheck.period?.nameAr || date}) مقفلة تماماً. يمنع النظام إنشاء أو ترحيل قيود اليومية ضمن فترات مقفلة.
                  </div>
                </div>
              );
            }

            if (!yCheck.isWithinYear) {
              return (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">تنبيه السنة المالية: </span>
                    {yCheck.warningMessage}
                  </div>
                </div>
              );
            }

            return null;
          })()}

          {/* Lines Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800">أطراف القيد المحاسبي (مدين / دائن)</h4>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1.5 text-xs text-purple-700 hover:text-purple-800 font-bold bg-purple-50 hover:bg-purple-100 px-3.5 py-1.5 rounded-xl border border-purple-200 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة طرف قيد</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-1/3">الحساب المحاسبي</th>
                    <th className="p-3 w-32">مدين (Debit)</th>
                    <th className="p-3 w-32">دائن (Credit)</th>
                    <th className="p-3">البيان / مركز التكلفة</th>
                    <th className="p-3 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {lines.map((line, index) => (
                    <tr key={line.id}>
                      <td className="p-2.5">
                        <select
                          value={line.accountId}
                          onChange={(e) => handleLineChange(index, 'accountId', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          required
                        >
                          <option value="">-- اختر الحساب من الدليل --</option>
                          {accounts
                            .filter((a) => a.isTransactional)
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.code} - {a.nameAr} ({a.nature === 'debit' ? 'مدين' : 'دائن'})
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.debit}
                          onChange={(e) => handleLineChange(index, 'debit', Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-1.5 text-xs text-slate-900 font-mono text-emerald-600 font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.credit}
                          onChange={(e) => handleLineChange(index, 'credit', Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-1.5 text-xs text-slate-900 font-mono text-blue-600 font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={line.description || ''}
                          onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                          placeholder="شرح فرعي للبند"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30 transition"
                          disabled={lines.length <= 2}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-800">
                  <tr>
                    <td className="p-3 text-slate-900">المجموع الإجمالي:</td>
                    <td className="p-3 font-mono text-emerald-600 text-sm">{formatSAR(validation.totalDebit)}</td>
                    <td className="p-3 font-mono text-blue-600 text-sm">{formatSAR(validation.totalCredit)}</td>
                    <td colSpan={2} className="p-3 text-left">
                      {validation.isBalanced ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          القيد متزن محاسبياً
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold text-xs bg-rose-50 px-3 py-1 rounded-xl border border-rose-200">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          فرق غير متزن: {formatSAR(validation.difference)}
                        </span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!validation.isValid}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl transition shadow-xs active:scale-95 disabled:opacity-40"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ترحيل وحفظ قيد اليومية</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const JournalEntriesView: React.FC<{ onOpenNewEntry: () => void }> = ({ onOpenNewEntry }) => {
  const {
    journalEntries,
    postDocument,
    cancelDraftDocument,
    reversePostedDocument,
    deleteJournalEntry,
  } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Reversal Modal State
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [entryToReverse, setEntryToReverse] = useState<JournalEntry | null>(null);

  const filtered = journalEntries.filter((entry) => {
    const matchesSearch =
      entry.entryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.narrationAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.referenceNumber && entry.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const docStatus = entry.status || 'posted';
    const matchesStatus = statusFilter === 'all' ? true : docStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">دفتر قيود اليومية العامة</h2>
            <span className="bg-purple-50 text-purple-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-purple-200">
              {journalEntries.length} قيد محاسبي
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            سجل كافة الحركات والقيود الآلية واليدوية المرحّلة على دليل الحسابات
          </p>
        </div>

        <button
          onClick={onOpenNewEntry}
          className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition shadow-xs active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ إضافة قيد يومية يدوي</span>
        </button>
      </div>

      {/* Search & Status Filter */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="w-full sm:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم القيد، البيان، رقم المرجع..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">جميع حالات القيود</option>
          <option value="posted">المرحّلة (Posted)</option>
          <option value="draft">المسودة (Draft)</option>
          <option value="reversed">المعكوسة (Reversed)</option>
          <option value="cancelled">الملغاة (Cancelled)</option>
        </select>
      </div>

      {/* Entries List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              لا توجد قيود يومية مطابقة للبحث.
            </div>
          ) : (
            filtered.map((entry) => {
              const isExpanded = expandedId === entry.id;
              const status: DocumentStatus = entry.status || 'posted';

              return (
                <div key={entry.id} className="p-4 hover:bg-slate-50 transition">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div
                      className="space-y-1 cursor-pointer flex-1"
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-slate-900 text-sm">{entry.entryNumber}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            entry.referenceType === 'manual'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : entry.referenceType === 'sales_invoice'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {entry.referenceType === 'manual'
                            ? 'قيد يدوي'
                            : entry.referenceType === 'sales_invoice'
                            ? 'فاتورة مبيعات'
                            : 'فاتورة مشتريات'}
                        </span>

                        {/* Status badge */}
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
                            title={`معكوس بتاريخ: ${entry.reversalDate || '-'} | السبب: ${entry.reversalReason || '-'}`}
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>معكوس</span>
                          </span>
                        )}
                        {status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                            <Ban className="w-3 h-3" />
                            <span>ملغى</span>
                          </span>
                        )}

                        <span className="text-xs text-slate-400 font-mono">{entry.date}</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">{entry.narrationAr}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-left font-mono font-bold text-sm text-purple-700">
                        {formatSAR(entry.totalDebit)}
                      </div>

                      {/* Action buttons */}
                      {status === 'draft' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              postDocument('journal_entry', entry.id);
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white transition font-bold text-[11px] border border-purple-200"
                            title="ترحيل القيد للأستاذ العام"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ترحيل</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const reason = prompt('سبب إلغاء مسودة القيد:') || 'إلغاء مسودة';
                              cancelDraftDocument('journal_entry', entry.id, reason);
                            }}
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="إلغاء المسودة"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`هل أنت متأكد من حذف مسودة القيد ${entry.entryNumber}؟`)) {
                                deleteJournalEntry(entry.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="حذف المسودة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {status === 'posted' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEntryToReverse(entry);
                            setReversalModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition flex items-center gap-1"
                          title="إنشاء قيد عكسي محاسبي"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold">عكس</span>
                        </button>
                      )}

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className="text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-xl transition"
                      >
                        {isExpanded ? 'إخفاء' : 'عرض الأطراف'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Lines */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-slate-100 animate-in fade-in">
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-medium">
                            <tr>
                              <th className="p-2.5">رمز الحساب</th>
                              <th className="p-2.5">اسم الحساب</th>
                              <th className="p-2.5">البيان الفرعي</th>
                              <th className="p-2.5">مدين</th>
                              <th className="p-2.5">دائن</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                            {entry.lines.map((l) => (
                              <tr key={l.id} className="hover:bg-slate-50">
                                <td className="p-2.5 font-mono text-slate-500">{l.accountCode}</td>
                                <td className="p-2.5 font-medium text-slate-900">{l.accountNameAr}</td>
                                <td className="p-2.5 text-slate-500">{l.description || '-'}</td>
                                <td className="p-2.5 font-mono text-emerald-600">
                                  {l.debit > 0 ? formatSAR(l.debit, false) : '-'}
                                </td>
                                <td className="p-2.5 font-mono text-blue-600">
                                  {l.credit > 0 ? formatSAR(l.credit, false) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Reversal Modal */}
      {reversalModalOpen && entryToReverse && (
        <DocumentReversalModal
          isOpen={reversalModalOpen}
          documentType="journal_entry"
          documentId={entryToReverse.id}
          documentNumber={entryToReverse.entryNumber}
          documentAmount={entryToReverse.totalDebit}
          onClose={() => {
            setReversalModalOpen(false);
            setEntryToReverse(null);
          }}
          onConfirm={(reason, reversalDate) => {
            reversePostedDocument('journal_entry', entryToReverse.id, reason, reversalDate);
          }}
        />
      )}
    </div>
  );
};
