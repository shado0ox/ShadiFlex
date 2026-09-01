import React, { useState } from 'react';
import { Sparkles, Crown, Award, Feather, Star, CheckCircle, Heart, X, Code2, Palette, Shield } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface DesignerSignatureProps {
  variant?: 'sidebar' | 'footer' | 'compact' | 'banner';
  className?: string;
}

export const DesignerSignature: React.FC<DesignerSignatureProps> = ({
  variant = 'sidebar',
  className = '',
}) => {
  const { language, isRtl } = useLanguage();
  const [showModal, setShowModal] = useState(false);

  if (variant === 'sidebar') {
    return (
      <>
        <div
          onClick={() => setShowModal(true)}
          className={`cursor-pointer group relative overflow-hidden rounded-2xl p-3.5 transition-all duration-300 ${className} bg-linear-to-br from-slate-900 via-emerald-950 to-slate-900 border border-amber-400/30 hover:border-amber-400/60 shadow-lg shadow-emerald-950/20 hover:shadow-amber-500/10 hover:-translate-y-0.5`}
        >
          {/* Subtle Golden Glow Accents */}
          <div className="absolute top-0 right-0 -mt-2 -mr-2 w-12 h-12 bg-amber-400/10 rounded-full blur-lg group-hover:bg-amber-400/20 transition-all" />
          <div className="absolute bottom-0 left-0 -mb-2 -ml-2 w-12 h-12 bg-emerald-400/10 rounded-full blur-lg group-hover:bg-emerald-400/20 transition-all" />

          {/* Decorative Corner Flourishes */}
          <div className="absolute top-1.5 right-1.5 text-amber-400/40 text-[9px] select-none font-serif">✦</div>
          <div className="absolute bottom-1.5 left-1.5 text-amber-400/40 text-[9px] select-none font-serif">✦</div>

          <div className="relative flex items-center gap-3">
            {/* Ornate Medallion Icon */}
            <div className="relative shrink-0 w-9 h-9 rounded-xl bg-linear-to-br from-amber-400 via-amber-500 to-amber-600 p-[1.5px] shadow-sm shadow-amber-500/30">
              <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center text-amber-300">
                <Crown className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border border-slate-950"></span>
              </span>
            </div>

            {/* Signature Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] tracking-wider font-extrabold uppercase text-amber-400/90 font-serif">
                  {language === 'ar' ? 'تصميم وإبداع' : 'Crafted & Designed By'}
                </span>
                <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
              </div>
              
              <div className="text-xs sm:text-sm font-black text-transparent bg-clip-text bg-linear-to-r from-amber-200 via-amber-400 to-amber-100 font-serif tracking-wide truncate">
                {language === 'ar' ? 'الأستاذ / شادي ناصف' : 'Mr. Shady Nassef'}
              </div>
              
              <div className="text-[10px] text-emerald-300/80 truncate">
                {language === 'ar' ? '✨ إتقان وفخامة برمجية' : 'Masterpiece Architecture'}
              </div>
            </div>
          </div>
        </div>

        {/* Details Modal */}
        {showModal && <SignatureModal onClose={() => setShowModal(false)} />}
      </>
    );
  }

  if (variant === 'footer') {
    return (
      <>
        <footer
          onClick={() => setShowModal(true)}
          className={`cursor-pointer group mt-6 pt-4 pb-2 border-t border-slate-200/80 transition-all duration-200 ${className}`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 hover:text-slate-600">
            <div className="flex items-center gap-2">
              <Feather className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              <span className="font-medium text-slate-500 group-hover:text-slate-700 transition-colors">
                {language === 'ar'
                  ? 'تصميم وتطوير: أ/ شادي ناصف'
                  : 'Designed & Developed by: Mr. Shady Nassef'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span>
                {language === 'ar'
                  ? 'نظام المحاسبة ونقاط البيع السحابي ZATCA'
                  : 'Cloud ERP & ZATCA POS System'}
              </span>
            </div>
          </div>
        </footer>

        {showModal && <SignatureModal onClose={() => setShowModal(false)} />}
      </>
    );
  }

  // Compact Pill Variant
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-linear-to-r from-slate-900 to-emerald-950 border border-amber-400/30 text-amber-300 text-xs font-serif font-bold shadow-xs hover:border-amber-400/70 hover:shadow-amber-500/20 transition-all active:scale-95 ${className}`}
      >
        <Crown className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        <span>
          {language === 'ar' ? 'تصميم: أ/ شادي ناصف' : 'By: Mr. Shady Nassef'}
        </span>
      </button>

      {showModal && <SignatureModal onClose={() => setShowModal(false)} />}
    </>
  );
};

// Ornate Dedicated Modal
const SignatureModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { language } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-linear-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-400/40 p-6 sm:p-8 text-white shadow-2xl shadow-amber-500/10 animate-in zoom-in-95 duration-200">
        {/* Ornate Background Elements */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ornate Header */}
        <div className="text-center space-y-3 pt-2">
          <div className="inline-flex p-3.5 rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/30">
            <Crown className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400 font-serif">
              {language === 'ar' ? '⚜️ لمسة الإبداع والريادة ⚜️' : '⚜️ Masterpiece Architecture ⚜️'}
            </span>
            <h3 className="text-2xl font-black text-transparent bg-clip-text bg-linear-to-r from-amber-100 via-amber-300 to-amber-100 font-serif">
              {language === 'ar' ? 'الأستاذ / شادي ناصف' : 'Mr. Shady Nassef'}
            </h3>
            <p className="text-xs text-amber-200/80 font-medium">
              {language === 'ar'
                ? 'مطور وخبير النظم السحابية والحلول المحاسبية المتقدمة'
                : 'Principal Architect & Senior Software Specialist'}
            </p>
          </div>
        </div>

        {/* Decorative Divider */}
        <div className="my-6 flex items-center justify-center gap-3">
          <div className="h-[1px] flex-1 bg-linear-to-r from-transparent via-amber-400/40 to-transparent" />
          <Sparkles className="w-4 h-4 text-amber-400" />
          <div className="h-[1px] flex-1 bg-linear-to-r from-transparent via-amber-400/40 to-transparent" />
        </div>

        {/* Features Highlights */}
        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-200 text-sm">
                {language === 'ar' ? 'واجهات مستخدم فائقة الدقة' : 'Bespoke Modern UX/UI'}
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                {language === 'ar'
                  ? 'تصميم راقٍ يجمع بين السهولة المطلقة والسرعة الفائقة لخدمة الكاشير والمحاسبين.'
                  : 'Engineered for seamless efficiency, visual harmony, and intuitive cashier flow.'}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-200 text-sm">
                {language === 'ar' ? 'امتثال تام لمعايير ZATCA' : 'ZATCA Phase 2 Compliance'}
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                {language === 'ar'
                  ? 'دعم تشفير Base64 TLV، الإيصالات الحرارية، وقيود اليومية الآلية المتزنة.'
                  : 'Full TLV QR generation, thermal receipt formats, and balanced ledger automation.'}
              </p>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-6 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-sm hover:from-amber-400 hover:to-amber-500 transition shadow-lg shadow-amber-500/20"
          >
            {language === 'ar' ? 'إغلاق نافذة التوقيع' : 'Close Signature'}
          </button>
        </div>
      </div>
    </div>
  );
};
