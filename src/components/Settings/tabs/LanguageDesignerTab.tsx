import React from 'react';
import {
  Globe,
  CheckCircle2,
  Crown,
  Sparkles,
} from 'lucide-react';
import { useAccounting } from '../../../context/AccountingContext';

export const LanguageDesignerTab: React.FC = () => {
  const { language, setLanguage } = useAccounting();

  return (
    <div className="space-y-6">
      {/* Language Selection Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">
              {language === 'ar' ? 'إعدادات اللغة والواجهة' : 'Language & Interface Preferences'}
            </h3>
            <p className="text-xs text-slate-500">
              {language === 'ar'
                ? 'التبديل بين اللغة العربية والإنجليزية مع محاذاة اتجاه النصوص والأرقام تلقائياً'
                : 'Switch between Arabic and English with automated RTL/LTR alignment and currency formatting'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Arabic Option */}
          <div
            onClick={() => setLanguage('ar')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
              language === 'ar'
                ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                ع
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-sm">اللغة العربية (الافتراضية)</h4>
                <p className="text-[11px] text-slate-500">واجهة كاملة من اليمين إلى اليسار (RTL) متوافقة مع الأنظمة السعودية</p>
              </div>
            </div>
            {language === 'ar' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          </div>

          {/* English Option */}
          <div
            onClick={() => setLanguage('en')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
              language === 'en'
                ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                EN
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-sm">English (Bilingual Mode)</h4>
                <p className="text-[11px] text-slate-500">Left-to-Right layout with standard international accounting terms</p>
              </div>
            </div>
            {language === 'en' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          </div>
        </div>
      </div>

      {/* Masterpiece Signature & Craftsmanship Showcase */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-950 via-slate-900 to-emerald-950 border-2 border-amber-400/40 p-6 sm:p-8 text-white shadow-xl shadow-slate-950/40">
        {/* Ambient Background Lights */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative space-y-6">
          {/* Header Badges */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950 uppercase tracking-widest font-serif flex items-center gap-1.5 shadow-md">
                <Crown className="w-3.5 h-3.5" />
                CRAFTED EXCELLENCE
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400/10 text-amber-300 border border-amber-400/30">
                VIP ARCHITECT
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-300/80 font-serif">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>{language === 'ar' ? 'تصميم حصري ومتقن' : 'Exclusive Architecture'}</span>
            </div>
          </div>

          {/* Designer Name & Identity */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-amber-400 tracking-wider font-serif block uppercase">
              {language === 'ar' ? 'التوقيع الرسمي للمصمم والمطور' : 'Official Designer & Developer Signature'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-linear-to-r from-amber-100 via-amber-300 to-amber-50 font-serif tracking-wide">
              {language === 'ar' ? '✨ الأستاذ / شادي ناصف ✨' : '✨ Mr. Shady Nassef ✨'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              {language === 'ar'
                ? 'تم بناء وتطوير هذا النظام المحاسبي السحابي ونقاط البيع وفق أحدث التقنيات العالمية ومعايير هيئة الزكاة والضريبة والجمارك (ZATCA)، مع مراعاة أدق التفاصيل الجمالية وسرعة الأداء.'
                : 'Architected and engineered with bespoke precision, adhering strictly to Saudi ZATCA standards, high-performance financial ledgers, and ergonomic cashier workflows.'}
            </p>
          </div>

          {/* Ornate Divider */}
          <div className="flex items-center gap-3">
            <div className="h-[1px] flex-1 bg-linear-to-r from-transparent via-amber-400/40 to-transparent" />
            <div className="text-amber-400 text-xs font-serif">✦ ⚜️ ✦</div>
            <div className="h-[1px] flex-1 bg-linear-to-r from-transparent via-amber-400/40 to-transparent" />
          </div>

          {/* Accolades & System Modules */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-amber-400/20">
              <div className="font-bold text-amber-300 text-sm mb-1">
                {language === 'ar' ? 'نظام نقاط بيع سحابي' : 'Cloud POS Architecture'}
              </div>
              <p className="text-slate-400 text-[11px]">
                {language === 'ar' ? 'شاشات كاشير سريعة مع طباعة إيصالات حرارية ورموز QR مشفرة' : 'Fast terminal, thermal receipts & TLV QR codes'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-emerald-400/20">
              <div className="font-bold text-emerald-300 text-sm mb-1">
                {language === 'ar' ? 'معايير ZATCA والفوترة' : 'ZATCA Phase 2'}
              </div>
              <p className="text-slate-400 text-[11px]">
                {language === 'ar' ? 'تشفير Base64 TLV، إشعارات مدينة ودائنة، وقيود متزنة' : 'Base64 TLV encryption, debit/credit notes, ledger'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-indigo-400/20">
              <div className="font-bold text-indigo-300 text-sm mb-1">
                {language === 'ar' ? 'ثنائي اللغة والتكامل' : 'Bilingual ERP Engine'}
              </div>
              <p className="text-slate-400 text-[11px]">
                {language === 'ar' ? 'دعم كامل للعربية والإنجليزية مع إقفال السنوات و API' : 'Full Arabic/English support, fiscal year closing & API'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
