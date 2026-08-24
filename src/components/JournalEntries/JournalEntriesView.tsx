import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { JournalEntryLine } from '../../types/accounting';
import { formatSAR } from '../../utils/currency';
import { X, Plus, Trash2, CheckCircle2, AlertTriangle, BookOpen } from 'lucide-react';
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
  const { accounts, journalEntries, createManualJournalEntry } = useAccounting();

  const nextEntryNumber = `JV-2026-${(journalEntries.length + 1).toString().padStart(4, '0')}`;

  const [entryNumber, setEntryNumber] = useState(nextEntryNumber);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [narrationAr, setNarrationAr] = useState('');

  const [lines, setLines] = useState<JournalEntryLine[]>([
    {
      id: `line_1_${Date.now()}`,
      accountId: accounts.find((a) => a.code === '5201')?.id || accounts[0]?.id || '',
      accountCode: '5201',
      accountNameAr: 'رواتب وأجور وبدلات العاملين',
      debit: 5000,
      credit: 0,
      description: 'إثبات مصروف الرواتب',
    },
    {
      id: `line_2_${Date.now()}`,
      accountId: accounts.find((a) => a.code === '110102')?.id || accounts[1]?.id || '',
      accountCode: '110102',
      accountNameAr: 'مصرف الراجحي - الحساب الجاري',
      debit: 0,
      credit: 5000,
      description: 'صرف من الحساب البنكي',
    },
  ]);

  if (!isOpen) return null;

  const handleLineChange = (index: number, field: keyof JournalEntryLine, value: any) => {
    const updated = [...lines];
    const current = { ...updated[index], [field]: value };

    if (field === 'accountId') {
      const selectedAcc = accounts.find((a) => a.id === value);
      if (selectedAcc) {
        current.accountCode = selectedAcc.code;
        current.accountNameAr = selectedAcc.nameAr;
      }
    }

    updated[index] = current;
    setLines(updated);
  };

  const addLine = () => {
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
    setLines(lines.filter((_, i) => i !== index));
  };

  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.001 && totalDebit > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!narrationAr.trim()) {
      alert('يرجى كتابة شرح وبيان القيد');
      return;
    }

    if (!isBalanced) {
      alert('لا يمكن حفظ القيد لأن مجموع المدين لا يساوي مجموع الدائن!');
      return;
    }

    createManualJournalEntry({
      entryNumber,
      date,
      referenceType: 'manual',
      narrationAr,
      lines,
      totalDebit,
      totalCredit,
      isBalanced: true,
    });

    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.6 },
    });

    onSuccess(entryNumber);
    onClose();
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
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
                    <td className="p-3 font-mono text-emerald-600 text-sm">{formatSAR(totalDebit)}</td>
                    <td className="p-3 font-mono text-blue-600 text-sm">{formatSAR(totalCredit)}</td>
                    <td colSpan={2} className="p-3 text-left">
                      {isBalanced ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          القيد متزن محاسبياً
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold text-xs bg-rose-50 px-3 py-1 rounded-xl border border-rose-200">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          فرق غير متزن: {formatSAR(difference)}
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
              disabled={!isBalanced}
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
  const { journalEntries } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = journalEntries.filter(
    (j) =>
      j.entryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.narrationAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (j.referenceNumber && j.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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

      {/* Entries List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم القيد، البيان، رقم المرجع..."
            className="w-full sm:w-80 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.map((entry) => {
            const isExpanded = expandedId === entry.id;
            return (
              <div key={entry.id} className="p-4 hover:bg-slate-50 transition">
                <div
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
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
                      <span className="text-xs text-slate-400 font-mono">{entry.date}</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">{entry.narrationAr}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-left font-mono font-bold text-sm text-purple-700">
                      {formatSAR(entry.totalDebit)}
                    </div>
                    <span className="text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-xl transition">
                      {isExpanded ? 'إخفاء التفاصيل' : 'عرض أطراف القيد'}
                    </span>
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
          })}
        </div>
      </div>
    </div>
  );
};
