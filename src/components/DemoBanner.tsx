import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { IS_DEMO_MODE } from '../config/appConfig';
import { getAccountingRepository } from '../services/dataService';
import { HardDrive, AlertTriangle, X } from 'lucide-react';

export const DemoBanner: React.FC = () => {
  const { language } = useLanguage();
  const [quotaWarning, setQuotaWarning] = useState<string | null>(null);

  useEffect(() => {
    const repo = getAccountingRepository();
    const unsubscribe = repo.onQuotaExceeded((info) => {
      setQuotaWarning(language === 'ar' ? info.messageAr : info.messageEn);
    });
    return () => {
      unsubscribe();
    };
  }, [language]);

  if (!IS_DEMO_MODE) {
    return null;
  }

  return (
    <div className="flex flex-col z-40 relative">
      {/* Storage Quota Warning Banner if local storage is full */}
      {quotaWarning && (
        <div className="bg-rose-600 text-white px-4 py-2 text-xs font-bold shadow-md flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-200 shrink-0" />
            <span>{quotaWarning}</span>
          </div>
          <button
            onClick={() => setQuotaWarning(null)}
            className="p-1 hover:bg-rose-700 rounded-md text-white/80 hover:text-white"
            title="إغلاق التنبيه"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Persistent Demo Banner */}
      <div className="bg-amber-500 text-slate-950 px-3 py-1.5 text-xs font-bold border-b border-amber-600 shadow-xs flex items-center justify-between">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="bg-slate-950 text-amber-300 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-black flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              {language === 'ar' ? 'تجريبي' : 'DEMO'}
            </span>
            <span className="font-bold text-xs sm:text-[13px] tracking-tight">
              {language === 'ar'
                ? 'وضع تجريبي — البيانات محفوظة على هذا المتصفح فقط'
                : 'Demo Mode — Data is stored in this browser only'}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-slate-900 bg-amber-400/80 px-2 py-0.5 rounded-md">
            <HardDrive className="w-3.5 h-3.5 text-slate-950" />
            <span>{language === 'ar' ? 'التخزين المحلي (LocalStorage)' : 'Local Browser Storage'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
