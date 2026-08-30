import React, { useState } from 'react';
import { CashierShift } from '../../types/accounting';
import { ArrowDownRight, X, DollarSign, CheckCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface PosCashDropModalProps {
  activeShift: CashierShift;
  onCashDrop: (shiftId: string, amount: number, notes?: string) => void;
  onClose: () => void;
}

export const PosCashDropModal: React.FC<PosCashDropModalProps> = ({
  activeShift,
  onCashDrop,
  onClose,
}) => {
  const { toast, confirmModal } = useToast();
  const [amount, setAmount] = useState<number>(500);
  const [notes, setNotes] = useState<string>('توريد وسحب نقدية للخزينة الرئيسية');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح للتوريد!');
      return;
    }
    if (amount > activeShift.expectedCash) {
      const ok = await confirmModal({
        title: 'تنبيه تجاوز رصيد الدرج',
        message: 'المبلغ المدخل أكبر من الرصيد النقدي المتوقع بالدرج! هل ترغب في المتابعة والتوريد؟',
        severity: 'warning',
        confirmLabel: 'متابعة التوريد',
      });
      if (!ok) {
        return;
      }
    }
    onCashDrop(activeShift.id, amount, notes);
    toast.success(`تم توريد مبلغ ${amount.toFixed(2)} ر.س من الدرج بنجاح`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">توريد وسحب نقدية (Cash Drop)</h2>
              <p className="text-xs text-slate-400">سحب فائض النقدية من الدرج إلى الخزينة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center">
            <span className="text-slate-600">النقدية المتوفرة حالياً بالدرج:</span>
            <span className="font-mono font-bold text-emerald-800 text-sm">
              {activeShift.expectedCash.toFixed(2)} ر.س
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ المراد سحبه/توريده (ر.س):</label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full text-lg font-bold font-mono text-slate-900 px-4 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden pl-12"
                autoFocus
              />
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-500">ر.س</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">بيان / سبب التوريد:</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-hidden"
              placeholder="مثال: تسليم لمسؤول الخزينة / إيداع بنكي"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              تأكيد سحب النقدية
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
