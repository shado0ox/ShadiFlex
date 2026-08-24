import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { useLanguage } from '../context/LanguageContext';
import { DesignerSignature } from './Signature/DesignerSignature';
import {
  FileText,
  ShoppingCart,
  PlusCircle,
  BookOpen,
  Package,
  Calendar,
  Sparkles,
  Menu,
  Zap,
  Languages,
  Globe,
} from 'lucide-react';

interface HeaderProps {
  onOpenSidebar: () => void;
  onOpenNewSalesInvoice: () => void;
  onOpenNewPurchaseInvoice: () => void;
  onOpenNewJournalEntry: () => void;
  onOpenNewItem?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSidebar,
  onOpenNewSalesInvoice,
  onOpenNewPurchaseInvoice,
  onOpenNewJournalEntry,
  onOpenNewItem = () => {},
}) => {
  const { companySettings, setActiveTab, activeTab } = useAccounting();
  const { language, toggleLanguage, t, isRtl } = useLanguage();
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);

  const formattedDate = new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  const companyDisplayName =
    language === 'ar'
      ? companySettings.nameAr || 'مؤسسة الحلول المحاسبية'
      : companySettings.nameEn || companySettings.nameAr || 'Accounting Solutions Est.';

  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-30 shadow-xs shrink-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Company & Title */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {/* Mobile Hamburger */}
            <button
              onClick={onOpenSidebar}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
              title={language === 'ar' ? 'القائمة الرئيسية' : 'Main Menu'}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-sm shadow-emerald-700/20 shrink-0">
                <div className="w-4 h-4 border-2 border-white rotate-45 rounded-xs"></div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                    {companyDisplayName}
                  </span>
                  <span className="hidden sm:inline-flex bg-emerald-50 text-emerald-700 text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full font-bold border border-emerald-200 items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t('header.zatca_certified', 'معتمد ZATCA')}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 hidden md:block truncate">
                  {t('header.vat_no', 'الرقم الضريبي')}:{' '}
                  <span className="font-mono text-slate-600">{companySettings.vatNumber}</span> |{' '}
                  {t('header.cr_no', 'السجل')}:{' '}
                  <span className="font-mono text-slate-600">{companySettings.crNumber}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Actions & Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Language Switcher Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-xs"
              title={language === 'ar' ? 'Switch to English' : 'التحويل إلى اللغة العربية'}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-semibold">{language === 'ar' ? 'English' : 'العربية'}</span>
            </button>

            {/* Today Date */}
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100/80 px-2.5 py-1.5 rounded-xl border border-slate-200 font-medium">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>{formattedDate}</span>
            </div>

            {/* POS Cashier Button */}
            <button
              onClick={() => setActiveTab('pos_sales')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                activeTab === 'pos_sales'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">{t('header.pos_shortcut', 'نقطة البيع (POS)')}</span>
              <span className="sm:hidden">POS</span>
            </button>

            {/* AI Advisor Shortcut */}
            <button
              onClick={() => setActiveTab('ai_advisor')}
              className={`hidden md:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                activeTab === 'ai_advisor'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>{t('header.ai_advisor', 'المستشار الذكي')}</span>
            </button>

            {/* Quick Action Dropdown */}
            <div className="relative">
              <button
                onClick={() => setQuickMenuOpen(!quickMenuOpen)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl transition shadow-xs active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">{t('header.quick_action', 'إجراء سريع')}</span>
              </button>

              {quickMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setQuickMenuOpen(false)}
                  />
                  <div
                    className={`absolute ${
                      isRtl ? 'left-0' : 'right-0'
                    } mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-2 divide-y divide-slate-100 ${
                      isRtl ? 'text-right' : 'text-left'
                    } animate-in fade-in slide-in-from-top-2`}
                  >
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setQuickMenuOpen(false);
                          onOpenNewSalesInvoice();
                        }}
                        className="w-full px-4 py-2.5 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center justify-between transition font-medium"
                      >
                        <span>{t('header.new_sales_invoice', 'فاتورة مبيعات جديدة (ZATCA)')}</span>
                        <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      </button>
                      <button
                        onClick={() => {
                          setQuickMenuOpen(false);
                          onOpenNewPurchaseInvoice();
                        }}
                        className="w-full px-4 py-2.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between transition font-medium"
                      >
                        <span>{t('header.new_purchase_invoice', 'فاتورة مشتريات جديدة')}</span>
                        <ShoppingCart className="w-4 h-4 text-blue-600 shrink-0" />
                      </button>
                      <button
                        onClick={() => {
                          setQuickMenuOpen(false);
                          setActiveTab('expenses');
                        }}
                        className="w-full px-4 py-2.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center justify-between transition font-medium"
                      >
                        <span>{t('header.new_expense', 'فاتورة مصروفات / كهرباء / وقود')}</span>
                        <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
                      </button>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setQuickMenuOpen(false);
                          onOpenNewJournalEntry();
                        }}
                        className="w-full px-4 py-2.5 text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center justify-between transition font-medium"
                      >
                        <span>{t('header.new_journal', 'إضافة قيد يومية عام')}</span>
                        <BookOpen className="w-4 h-4 text-purple-600 shrink-0" />
                      </button>
                      <button
                        onClick={() => {
                          setQuickMenuOpen(false);
                          onOpenNewItem();
                        }}
                        className="w-full px-4 py-2.5 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-700 flex items-center justify-between transition font-medium"
                      >
                        <span>{t('header.new_item', 'إضافة صنف مخزون')}</span>
                        <Package className="w-4 h-4 text-amber-600 shrink-0" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Designer Signature Pill */}
            <div className="hidden lg:block">
              <DesignerSignature variant="compact" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
