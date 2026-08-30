import React from 'react';
import { DependencyCheckResult } from '../../types/accounting';
import { AlertOctagon, Power, X, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';

interface DependencyCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  entityName: string;
  entityType?: string;
  checkResult: DependencyCheckResult | null;
  onDeactivate?: () => void;
  onToggleDeactivate?: () => void;
  isActive?: boolean;
  isCurrentlyActive?: boolean;
}

export const DependencyCheckModal: React.FC<DependencyCheckModalProps> = ({
  isOpen,
  onClose,
  title,
  entityName,
  checkResult,
  onDeactivate,
  onToggleDeactivate,
  isActive = true,
  isCurrentlyActive,
}) => {
  if (!isOpen || !checkResult) return null;
  const activeStatus = isCurrentlyActive !== undefined ? isCurrentlyActive : isActive;
  const handleToggle = onToggleDeactivate || onDeactivate;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-right">
        {/* Header */}
        <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-start gap-4">
          <div className="p-3 bg-rose-100 text-rose-700 rounded-xl shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-base text-slate-900">{title}</h3>
            <p className="text-xs text-rose-800 mt-1 font-medium">
              الارتباط المحاسبي يمنع الحذف لحماية تكامل الدفاتر والقيود والمخزون
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">السجل المطلوب حذفه:</div>
            <div className="text-sm font-bold text-slate-900">{entityName}</div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-700 mb-2">المستندات والارتباطات النشطة:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {checkResult.dependenciesSummary && checkResult.dependenciesSummary.length > 0 ? (
                checkResult.dependenciesSummary.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs"
                  >
                    <span className="text-slate-700 font-medium">{item.label}</span>
                    <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-amber-200/60 text-amber-900">
                      {item.count}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500">
                  {checkResult.reason || 'يوجد ارتباطات محاسبية وقيد مالي مرتبط بهذا السجل.'}
                </div>
              )}
            </div>
          </div>

          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
            <div className="font-bold flex items-center gap-1.5 mb-1 text-blue-950">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>الحل الموصى به محاسبياً:</span>
            </div>
            يُوصى بـ <strong>التعطيل (إلغاء التنشيط)</strong> بدلاً من الحذف؛ حيث يمنع التعطيل اختيار هذا السجل في أي فواتير أو سندات أو حركات مستقبلية مع الاحتفاظ الكامل بسلامة القيود والتقارير التاريخية.
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition"
          >
            إلغاء الأمر
          </button>

          {handleToggle && (
            <button
              type="button"
              onClick={() => {
                handleToggle();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 transition shadow-xs"
            >
              <Power className="w-4 h-4" />
              <span>{activeStatus ? 'تعطيل الحساب / السجل الآن' : 'تنشيط السجل'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
