import React from 'react';
import { useAccounting } from '../context/AccountingContext';
import { useLanguage } from '../context/LanguageContext';
import { DesignerSignature } from './Signature/DesignerSignature';
import { ShadiFlexLogo } from './Branding/ShadiFlexLogo';
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Package,
  FolderTree,
  BookOpen,
  Scale,
  Receipt,
  BarChart3,
  Sparkles,
  Settings,
  ShieldCheck,
  Wallet,
  ArrowLeftRight,
  Zap,
  Users,
  Store,
  Computer,
  Layers,
  ShieldAlert,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const {
    activeTab,
    setActiveTab,
    salesInvoices,
    inventory,
    debitCreditNotes,
    vouchers,
    simpleExpenses,
    branches,
    parkedOrders,
    auditLogs,
  } = useAccounting();

  const { t, language, isRtl } = useLanguage();

  const lowStockCount = inventory.filter((i) => i.currentStock <= i.minStockAlert).length;
  const unpaidInvoicesCount = salesInvoices.filter((i) => i.paymentStatus !== 'paid').length;

  const menuItems = [
    {
      id: 'dashboard',
      label: t('nav.dashboard', 'لوحة التحكم والمؤشرات'),
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'pos_sales',
      label: t('nav.pos_sales', 'شاشة الكاشير ونقاط البيع (POS)'),
      icon: Store,
      badge: parkedOrders.length > 0 
        ? `${parkedOrders.length} ${language === 'ar' ? 'معلق' : 'Parked'}` 
        : (language === 'ar' ? 'سريع' : 'Fast'),
      badgeColor: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30 font-bold',
    },
    {
      id: 'pos_management',
      label: t('nav.pos_management', 'إدارة الفروع وصناديق الكاشير'),
      icon: Computer,
      badge: `${branches.length} ${language === 'ar' ? 'فروع' : 'Branches'}`,
      badgeColor: 'bg-teal-500/20 text-teal-700 border-teal-500/30',
    },
    {
      id: 'sales',
      label: t('nav.sales', 'فواتير المبيعات (ZATCA)'),
      icon: FileText,
      badge: unpaidInvoicesCount > 0 
        ? `${unpaidInvoicesCount} ${language === 'ar' ? 'معلقة' : 'Due'}` 
        : null,
      badgeColor: 'bg-amber-500/20 text-amber-700 border-amber-500/30',
    },
    {
      id: 'purchases',
      label: t('nav.purchases', 'فواتير المشتريات'),
      icon: ShoppingCart,
      badge: null,
    },
    {
      id: 'expenses',
      label: t('nav.expenses', 'فواتير المصروفات والنثريات'),
      icon: Zap,
      badge: simpleExpenses.length > 0 ? `${simpleExpenses.length}` : (language === 'ar' ? 'جديد' : 'New'),
      badgeColor: 'bg-indigo-500/20 text-indigo-700 border-indigo-500/30',
    },
    {
      id: 'debit_credit_notes',
      label: t('nav.debit_credit_notes', 'إشعارات دائنة ومدينة (ZATCA)'),
      icon: ArrowLeftRight,
      badge: debitCreditNotes.length > 0 ? `${debitCreditNotes.length}` : null,
      badgeColor: 'bg-rose-500/20 text-rose-700 border-rose-500/30',
    },
    {
      id: 'vouchers',
      label: t('nav.vouchers', 'سندات القبض وسندات الصرف'),
      icon: Wallet,
      badge: vouchers.length > 0 ? `${vouchers.length}` : null,
      badgeColor: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30',
    },
    {
      id: 'parties',
      label: language === 'ar' ? 'إدارة العملاء والموردين' : 'Customers & Suppliers',
      icon: Users,
      badge: null,
    },
    {
      id: 'inventory',
      label: t('nav.inventory', 'المخزون والمنتجات'),
      icon: Package,
      badge: lowStockCount > 0 
        ? `${lowStockCount} ${language === 'ar' ? 'تنبيه' : 'Low'}` 
        : null,
      badgeColor: 'bg-rose-500/20 text-rose-700 border-rose-500/30',
    },
    {
      id: 'accounts',
      label: t('nav.accounts', 'شجرة الحسابات والدليل'),
      icon: FolderTree,
      badge: null,
    },
    {
      id: 'journal',
      label: t('nav.journal', 'قيود اليومية العامة'),
      icon: BookOpen,
      badge: null,
    },
    {
      id: 'financial_statements',
      label: t('nav.reports', 'القوائم المالية والميزانية'),
      icon: Scale,
      badge: null,
    },
    {
      id: 'zatca_phase2',
      label: language === 'ar' ? 'الفحص المحلي ومحاكاة ZATCA' : 'ZATCA Local Simulation',
      icon: ShieldCheck,
      badge: language === 'ar' ? 'فحص ومحاكاة' : 'SIMULATION',
      badgeColor: 'bg-amber-500/20 text-amber-900 border-amber-500/40 font-bold',
    },
    {
      id: 'vat_return',
      label: t('nav.vat_return', 'إقرار الزكاة والضريبة (15%)'),
      icon: Receipt,
      badge: 'ZATCA',
      badgeColor: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30',
    },
    {
      id: 'reports',
      label: language === 'ar' ? 'التقارير المحاسبية والتفصيلية' : 'Detailed Accounting Reports',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'ai_advisor',
      label: t('nav.ai_advisor', 'المستشار المالي الذكي (AI)'),
      icon: Sparkles,
      badge: 'ZATCA AI',
      badgeColor: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
    },
    {
      id: 'settings',
      label: t('nav.settings', 'إعدادات المنشأة وإقفال السنة و API'),
      icon: Settings,
      badge: null,
    },
    {
      id: 'audit_logs',
      label: language === 'ar' ? 'سجل التدقيق المحلي التجريبي' : 'Local Audit Log (Demo)',
      icon: ShieldAlert,
      badge: auditLogs.length > 0 ? `${auditLogs.length}` : null,
      badgeColor: 'bg-slate-200 text-slate-700 border-slate-300 font-medium',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden backdrop-blur-xs"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static top-16 bottom-0 w-72 bg-white ${
          isRtl ? 'right-0 border-l' : 'left-0 border-r'
        } border-slate-200 text-slate-600 z-40 transition-transform duration-300 ease-in-out overflow-y-auto shrink-0 shadow-xs flex flex-col justify-between ${
          isOpen
            ? 'translate-x-0'
            : isRtl
            ? 'translate-x-full lg:translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-3">
          {/* ShadiFlex Brand Header */}
          <div className="p-3 bg-linear-to-b from-slate-50 to-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center gap-1.5 text-center">
            <ShadiFlexLogo size="md" showSubtitle={true} subtitleText={language === 'ar' ? 'منظومة المحاسبة والفوترة ZATCA' : 'Cloud ERP & POS System'} />
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {language === 'ar' ? 'المرحلة 2 (فاتورة) مفعّلة' : 'Phase 2 (FATOORA) Active'}
              </span>
            </div>
          </div>

          <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {t('nav.main_menu', 'القائمة الرئيسية')}
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isRtl ? 'text-right' : 'text-left'
                } group ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs'
                    : 'hover:bg-slate-100/80 hover:text-slate-900 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform group-hover:scale-105 ${
                      isActive ? 'text-emerald-700' : 'text-slate-400 group-hover:text-slate-700'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${
                      isActive
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : item.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Section: ZATCA Badge + Ornate Designer Signature */}
        <div className="p-4 space-y-3 shrink-0">
          {/* ZATCA Simulation Card */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-slate-600 space-y-1.5 shadow-xs">
            <div className="flex items-center gap-2 text-amber-900 font-bold">
              <div className="w-5 h-5 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span>{language === 'ar' ? 'فاحص ومحاكي اشتراطات ZATCA' : 'ZATCA Simulation Engine'}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              {language === 'ar'
                ? 'فحص محلي لاشتراطات الفوترة الإلكترونية وتشفير Base64 TLV وقواعد UBL 2.1.'
                : 'Local validation for e-invoicing requirements, Base64 TLV formatting & UBL 2.1 rules.'}
            </p>
          </div>

          {/* Ornate Signature of Mr. Shady Nassef */}
          <DesignerSignature variant="sidebar" />
        </div>
      </aside>
    </>
  );
};
