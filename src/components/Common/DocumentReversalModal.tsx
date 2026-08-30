import React, { useState } from 'react';
import { DocumentType } from '../../types/accounting';
import { RotateCcw, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { formatSAR } from '../../utils/currency';
import { useToast } from '../../context/ToastContext';

interface DocumentReversalModalProps {
  isOpen: boolean;
  documentType: DocumentType;
  documentId: string;
  documentNumber: string;
  documentAmount?: number;
  onClose: () => void;
  onConfirm: (reason: string, reversalDate: string) => void;
}

export const DocumentReversalModal: React.FC<DocumentReversalModalProps> = ({
  isOpen,
  documentType,
  documentId,
  documentNumber,
  documentAmount,
  onClose,
  onConfirm,
}) => {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [reversalDate, setReversalDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const getDocTypeLabel = (type: DocumentType) => {
    switch (type) {
      case 'sales_invoice':
        return 'فاتورة مبيعات';
      case 'purchase_invoice':
        return 'فاتورة مشتريات';
      case 'debit_credit_note':
        return 'إشعار دائن / مدين';
      case 'voucher':
        return 'سند مالي (قبض / صرف)';
      case 'simple_expense':
        return 'مصروف تشغيلي';
      case 'journal_entry':
        return 'قيد يومية عامة';
      default:
        return 'مستند محاسبي';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.warning('يرجى كتابة سبب العكس المحاسبي للمستند');
      return;
    }

    setIsSubmitting(true);
    try {
      onConfirm(reason.trim(), reversalDate);
      toast.success(`تم إنشاء القيد العكسي للمستند ${documentNumber} بنجاح`);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="bg-rose-50 border-b border-rose-100 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">العكس المحاسبي للمستند المرحّل</h3>
              <p className="text-xs text-rose-700 font-medium">إنشاء قيد عكسي نظامي دون حذف السجل الأصلي</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-white/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Document Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">نوع المستند:</span>
              <span className="font-bold text-slate-800">{getDocTypeLabel(documentType)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">رقم المستند:</span>
              <span className="font-mono font-bold text-slate-900">{documentNumber}</span>
            </div>
            {documentAmount !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">المبلغ الإجمالي:</span>
                <span className="font-mono font-bold text-rose-700">{formatSAR(documentAmount)}</span>
              </div>
            )}
          </div>

          {/* Compliance & Audit Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">معايير الامتثال والرقابة المحاسبية (ZATCA):</p>
              <p className="text-amber-800 mt-0.5 text-[11px]">
                المستندات المرحّلة والضريبية لا تُحذف منعاً للتلاعب في السجلات. سيتم إنشاء قيد عكسي برقم مرجعي جديد، وتعديل أرصدة الحسابات والمخزون، وربط القيدين معاً في سجل التدقيق.
              </p>
            </div>
          </div>

          {/* Reversal Date */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">تاريخ العكس المحاسبي</label>
            <input
              type="date"
              value={reversalDate}
              onChange={(e) => setReversalDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              required
            />
          </div>

          {/* Reversal Reason */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              سبب العكس المحاسبي <span className="text-rose-600">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: تصحيح خطأ في القيد المحاسبي، إلغاء المعاملة بالاتفاق، أو استرجاع كامل للبضاعة..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تأكيد العكس المحاسبي وإنشاء القيد العكسي</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
