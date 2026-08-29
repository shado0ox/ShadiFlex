import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingFallbackProps {
  message?: string;
  subMessage?: string;
  minHeight?: string;
}

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  message = 'جاري تحميل الوحدة المحاسبية...',
  subMessage = 'يرجى الانتظار لحظات ريثما يتم تجهيز البيانات والواجهة',
  minHeight = 'min-h-[400px]',
}) => {
  return (
    <div
      className={`w-full ${minHeight} flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 rounded-2xl border border-slate-200/60 animate-in fade-in duration-200`}
    >
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      </div>
      <h3 className="text-sm font-bold text-slate-800 mb-1">{message}</h3>
      <p className="text-xs text-slate-500 max-w-sm leading-relaxed">{subMessage}</p>
    </div>
  );
};
