import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  ShieldAlert,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useLanguage } from './LanguageContext';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  details?: string;
  impactWarning?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  severity?: 'danger' | 'warning' | 'info';
  impactType?: 'journal' | 'inventory' | 'period_close' | 'general';
}

export interface AlertDialogOptions {
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'info' | 'success';
  buttonLabel?: string;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (options: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  toast: {
    success: (message: string, title?: string) => string;
    error: (message: string, title?: string) => string;
    warning: (message: string, title?: string) => string;
    info: (message: string, title?: string) => string;
  };
  confirmModal: (options: ConfirmDialogOptions) => Promise<boolean>;
  alertModal: (options: AlertDialogOptions) => Promise<void>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const { language, isRtl } = useLanguage();

  // Confirm Modal State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmDialogOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  // Alert Modal State
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    options: AlertDialogOptions;
    resolve: () => void;
  } | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  const toast = {
    success: (message: string, title?: string) =>
      showToast({
        type: 'success',
        title: title || (language === 'ar' ? 'عملية ناجحة' : 'Success'),
        message,
      }),
    error: (message: string, title?: string) =>
      showToast({
        type: 'error',
        title: title || (language === 'ar' ? 'تنبيه خطأ' : 'Error'),
        message,
        duration: 5500,
      }),
    warning: (message: string, title?: string) =>
      showToast({
        type: 'warning',
        title: title || (language === 'ar' ? 'تحذير محاسبي' : 'Warning'),
        message,
        duration: 5000,
      }),
    info: (message: string, title?: string) =>
      showToast({
        type: 'info',
        title: title || (language === 'ar' ? 'إشعار' : 'Info'),
        message,
      }),
  };

  const confirmModal = useCallback(
    (options: ConfirmDialogOptions): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        setConfirmState({
          isOpen: true,
          options,
          resolve: (val) => {
            setConfirmState(null);
            resolve(val);
          },
        });
      });
    },
    []
  );

  const alertModal = useCallback(
    (options: AlertDialogOptions): Promise<void> => {
      return new Promise<void>((resolve) => {
        setAlertState({
          isOpen: true,
          options,
          resolve: () => {
            setAlertState(null);
            resolve();
          },
        });
      });
    },
    []
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        removeToast,
        toast,
        confirmModal,
        alertModal,
      }}
    >
      {children}

      {/* Floating Toast Stack */}
      <div
        className={`fixed top-5 z-[9999] flex flex-col gap-2.5 max-w-md w-full px-4 pointer-events-none transition-all ${
          isRtl ? 'left-5 sm:left-6' : 'right-5 sm:right-6'
        }`}
        style={{ direction: isRtl ? 'rtl' : 'ltr' }}
      >
        {toasts.map((t) => {
          const isError = t.type === 'error';
          const isSuccess = t.type === 'success';
          const isWarning = t.type === 'warning';
          const isInfo = t.type === 'info';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md transform transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
                isSuccess
                  ? 'bg-emerald-900/95 text-white border-emerald-700 shadow-emerald-950/20'
                  : isError
                  ? 'bg-rose-900/95 text-white border-rose-700 shadow-rose-950/20'
                  : isWarning
                  ? 'bg-amber-900/95 text-white border-amber-700 shadow-amber-950/20'
                  : 'bg-slate-900/95 text-white border-slate-700 shadow-slate-950/20'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-300" />}
                {isError && <AlertCircle className="w-5 h-5 text-rose-300" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-300" />}
                {isInfo && <Info className="w-5 h-5 text-sky-300" />}
              </div>

              <div className="flex-1 min-w-0">
                {t.title && (
                  <h4 className="text-xs font-black tracking-wide uppercase opacity-90 mb-0.5">
                    {t.title}
                  </h4>
                )}
                <p className="text-xs sm:text-sm font-medium leading-relaxed break-words opacity-95">
                  {t.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 p-1 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {confirmState && (
        <div className="fixed inset-0 z-[10000] overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <div className="p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    confirmState.options.severity === 'danger'
                      ? 'bg-rose-100 text-rose-600 border border-rose-200'
                      : confirmState.options.severity === 'warning'
                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                      : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  {confirmState.options.severity === 'danger' ? (
                    <AlertCircle className="w-6 h-6" />
                  ) : confirmState.options.severity === 'warning' ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <ShieldAlert className="w-6 h-6" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-black text-slate-800 mb-2">
                    {confirmState.options.title ||
                      (language === 'ar' ? 'تأكيد الإجراء المحاسبي' : 'Confirm Action')}
                  </h3>

                  <p className="text-sm text-slate-600 leading-relaxed mb-3">
                    {confirmState.options.message}
                  </p>

                  {confirmState.options.details && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 mb-3 font-mono leading-relaxed break-words">
                      {confirmState.options.details}
                    </div>
                  )}

                  {/* Impact Notice Banner */}
                  {(confirmState.options.impactWarning ||
                    confirmState.options.impactType) && (
                    <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 mb-2">
                      <Layers className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold text-amber-950 mb-0.5">
                          {language === 'ar'
                            ? 'أثر محاسبي ومخزني مباشر:'
                            : 'Direct Accounting & Inventory Impact:'}
                        </strong>
                        <p className="leading-normal">
                          {confirmState.options.impactWarning ||
                            (confirmState.options.impactType === 'journal'
                              ? language === 'ar'
                                ? 'سيقوم هذا الإجراء بإنشاء أو تعديل قيود يومية تلقائياً في دفتر الأستاذ العام.'
                                : 'This action will automatically generate journal entries in the General Ledger.'
                              : confirmState.options.impactType === 'inventory'
                              ? language === 'ar'
                                ? 'سيؤثر هذا الإجراء على كميات المستودعات ورصيد تكلفة المخزون.'
                                : 'This action will directly impact stock balances and inventory valuation.'
                              : language === 'ar'
                              ? 'سيتم تسجيل العملية في سجل التدقيق المحاسبي (Audit Logs).'
                              : 'This operation will be logged in the immutable audit trail.')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => confirmState.resolve(false)}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer"
              >
                {confirmState.options.cancelLabel ||
                  (language === 'ar' ? 'إلغاء الأمر' : 'Cancel')}
              </button>

              <button
                type="button"
                onClick={() => confirmState.resolve(true)}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md active:scale-98 transition flex items-center gap-2 cursor-pointer ${
                  confirmState.options.severity === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                    : confirmState.options.severity === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                }`}
              >
                <span>
                  {confirmState.options.confirmLabel ||
                    (language === 'ar' ? 'تأكيد ومتابعة' : 'Confirm & Proceed')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertState && (
        <div className="fixed inset-0 z-[10000] overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    alertState.options.type === 'error'
                      ? 'bg-rose-100 text-rose-600 border border-rose-200'
                      : alertState.options.type === 'warning'
                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                      : alertState.options.type === 'success'
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  {alertState.options.type === 'error' ? (
                    <AlertCircle className="w-6 h-6" />
                  ) : alertState.options.type === 'warning' ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : alertState.options.type === 'success' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Info className="w-6 h-6" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-slate-800 mb-2">
                    {alertState.options.title ||
                      (alertState.options.type === 'error'
                        ? language === 'ar'
                          ? 'تنبيه خطأ'
                          : 'Error Notice'
                        : alertState.options.type === 'warning'
                        ? language === 'ar'
                          ? 'تحذير محاسبي'
                          : 'Warning Notice'
                        : language === 'ar'
                        ? 'إشعار النظام'
                        : 'System Notification')}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-words">
                    {alertState.options.message}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end">
              <button
                type="button"
                onClick={() => alertState.resolve()}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer"
              >
                {alertState.options.buttonLabel ||
                  (language === 'ar' ? 'فهمت ذلك' : 'Understood')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
