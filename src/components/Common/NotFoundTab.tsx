import React from 'react';
import { Compass, Home, Store, ArrowRight, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface NotFoundTabProps {
  currentTab: string;
  onNavigateHome: () => void;
  onNavigatePos?: () => void;
}

export const NotFoundTab: React.FC<NotFoundTabProps> = ({
  currentTab,
  onNavigateHome,
  onNavigatePos,
}) => {
  const { language, isRtl } = useLanguage();
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
      <div className="relative mb-6">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-inner">
          <Compass className="w-12 h-12 sm:w-14 sm:h-14 animate-pulse" />
        </div>
        <span className="absolute -bottom-2 -right-2 px-3 py-1 bg-rose-500 text-white font-mono text-xs font-bold rounded-full shadow-md">
          404
        </span>
      </div>

      <h2 className="text-xl sm:text-2xl font-black text-slate-800 mb-2">
        {language === 'ar' ? 'القسم أو الصفحة غير موجودة' : 'Page or Tab Not Found'}
      </h2>

      <p className="text-xs sm:text-sm text-slate-500 max-w-md mb-2 leading-relaxed">
        {language === 'ar'
          ? `التبويب المطلوب "${currentTab}" غير متاح أو تم نقله في التحديثات المحاسبية الأخيرة.`
          : `The requested tab "${currentTab}" is invalid or was moved in recent updates.`}
      </p>

      <p className="text-xs text-slate-400 max-w-md mb-8">
        {language === 'ar'
          ? 'يمكنك العودة إلى لوحة المؤشرات الرئيسية أو الانتقال إلى نقطة البيع السريعة.'
          : 'You can navigate back to the main accounting dashboard or open the POS terminal.'}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onNavigateHome}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>{language === 'ar' ? 'الرئيسية (لوحة المؤشرات)' : 'Main Dashboard'}</span>
        </button>

        {onNavigatePos && (
          <button
            type="button"
            onClick={onNavigatePos}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-bold text-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Store className="w-4 h-4 text-emerald-600" />
            <span>{language === 'ar' ? 'شاشة الكاشير (POS)' : 'Cashier (POS)'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
