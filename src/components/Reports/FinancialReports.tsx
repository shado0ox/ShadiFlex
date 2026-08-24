import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import {
  TrendingUp,
  Scale,
  Banknote,
  BookOpen,
  Boxes,
  FileSpreadsheet,
  FileCheck,
  ShieldCheck,
  Printer,
  Download,
  Calendar,
  Building2,
  Share2,
} from 'lucide-react';
import { PeriodFilterToolbar, PeriodFilterState } from './PeriodFilterToolbar';
import { IncomeStatementView } from './IncomeStatementView';
import { BalanceSheetView } from './BalanceSheetView';
import { CashFlowView } from './CashFlowView';
import { AccountSummaryView } from './AccountSummaryView';
import { InventoryMovementView } from './InventoryMovementView';
import { InvoicesSummaryView } from './InvoicesSummaryView';
import { TrialBalanceView } from './TrialBalanceView';
import { VatReturnView } from './VatReturnView';

type ReportTabId =
  | 'income_statement'
  | 'balance_sheet'
  | 'cash_flow'
  | 'accounts_summary'
  | 'inventory_movement'
  | 'invoices_summary'
  | 'trial_balance'
  | 'vat_return';

export const FinancialReports: React.FC = () => {
  const { companySettings } = useAccounting();

  const [activeTab, setActiveTab] = useState<ReportTabId>('income_statement');

  const [periodFilter, setPeriodFilter] = useState<PeriodFilterState>({
    type: 'quarterly',
    year: 2026,
    month: 8,
    quarter: 3,
    startDate: '2026-07-01',
    endDate: '2026-09-30',
    label: 'الربع الثالث (يوليو - سبتمبر) 2026',
  });

  const handlePrint = () => {
    window.print();
  };

  const reportTabs = [
    {
      id: 'income_statement' as const,
      label: 'قائمة الدخل الشامل',
      shortLabel: 'قائمة الدخل',
      icon: TrendingUp,
      desc: 'الأرباح والخسائر ومجمل الربح',
    },
    {
      id: 'balance_sheet' as const,
      label: 'الميزانية العمومية',
      shortLabel: 'المركز المالي',
      icon: Scale,
      desc: 'الأصول والالتزامات وحقوق الملكية',
    },
    {
      id: 'cash_flow' as const,
      label: 'قائمة التدفقات النقدية',
      shortLabel: 'التدفقات النقدية',
      icon: Banknote,
      desc: 'الأنشطة التشغيلية والاستثمارية والتمويلية',
    },
    {
      id: 'accounts_summary' as const,
      label: 'ملخص الحسابات والأرصدة',
      shortLabel: 'ملخص الحسابات',
      icon: BookOpen,
      desc: 'الأرصدة الافتتاحية والختامية والحركات',
    },
    {
      id: 'inventory_movement' as const,
      label: 'حركة وتقييم المخزون',
      shortLabel: 'حركة المخزون',
      icon: Boxes,
      desc: 'الوارد والمنصرف والتقييم بالتكلفة',
    },
    {
      id: 'invoices_summary' as const,
      label: 'ملخص وتحليل الفواتير',
      shortLabel: 'ملخص الفواتير',
      icon: FileSpreadsheet,
      desc: 'المبيعات والمشتريات وحالات السداد',
    },
    {
      id: 'trial_balance' as const,
      label: 'ميزان المراجعة',
      shortLabel: 'ميزان المراجعة',
      icon: FileCheck,
      desc: 'مراجعة الأرصدة والمجاميع والمدين والدائن',
    },
    {
      id: 'vat_return' as const,
      label: 'إقرار ضريبة ZATCA',
      shortLabel: 'إقرار الضريبة',
      icon: ShieldCheck,
      desc: 'ضريبة المخرجات والمدخلات 15%',
    },
  ];

  return (
    <div className="space-y-6 text-right animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                منظومة القوائم والتقارير المالية والضريبية الشاملة
              </h2>
              <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                SOCPA & ZATCA Compliant
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              إعداد واستخراج القوائم المالية الختامية، التدفقات النقدية، حركة المخزون، وملخصات الحسابات والفواتير
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition shadow-xs active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة التقرير / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Period Filter Toolbar */}
      <PeriodFilterToolbar onPeriodChange={(filter) => setPeriodFilter(filter)} />

      {/* Main Report Navigation Tabs (Bento Style Chips) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 no-print">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-3 rounded-2xl border text-right transition flex flex-col justify-between gap-2 shadow-xs cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className={`font-bold text-xs leading-tight ${isActive ? 'text-white' : 'text-slate-900'}`}>
                  {tab.shortLabel}
                </div>
                <div
                  className={`text-[10px] mt-0.5 line-clamp-1 ${
                    isActive ? 'text-emerald-100' : 'text-slate-400'
                  }`}
                >
                  {tab.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Print-Only Official Document Header */}
      <div className="hidden print:block text-right border-b-2 border-slate-800 pb-4 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{companySettings?.nameAr}</h1>
            <p className="text-xs text-slate-600 mt-0.5">
              س.ت: {companySettings?.crNumber} | الرقم الضريبي: {companySettings?.vatNumber}
            </p>
            <p className="text-xs text-slate-500">{companySettings?.nationalAddress?.city || 'الرياض'}، المملكة العربية السعودية</p>
          </div>

          <div className="text-left">
            <h2 className="text-lg font-bold text-emerald-800">
              {reportTabs.find((t) => t.id === activeTab)?.label}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5 font-mono">{periodFilter.label}</p>
            <p className="text-[10px] text-slate-400">تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA')}</p>
          </div>
        </div>
      </div>

      {/* Active Tab View Rendering */}
      <div>
        {activeTab === 'income_statement' && (
          <IncomeStatementView
            startDate={periodFilter.startDate}
            endDate={periodFilter.endDate}
            periodLabel={periodFilter.label}
          />
        )}

        {activeTab === 'balance_sheet' && (
          <BalanceSheetView
            asOfDate={periodFilter.endDate}
            periodLabel={periodFilter.label}
          />
        )}

        {activeTab === 'cash_flow' && (
          <CashFlowView
            startDate={periodFilter.startDate}
            endDate={periodFilter.endDate}
            periodLabel={periodFilter.label}
          />
        )}

        {activeTab === 'accounts_summary' && (
          <AccountSummaryView
            startDate={periodFilter.startDate}
            endDate={periodFilter.endDate}
            periodLabel={periodFilter.label}
          />
        )}

        {activeTab === 'inventory_movement' && (
          <InventoryMovementView
            startDate={periodFilter.startDate}
            endDate={periodFilter.endDate}
            periodLabel={periodFilter.label}
          />
        )}

        {activeTab === 'invoices_summary' && (
          <InvoicesSummaryView
            startDate={periodFilter.startDate}
            endDate={periodFilter.endDate}
            periodLabel={periodFilter.label}
          />
        )}

        {activeTab === 'trial_balance' && (
          <TrialBalanceView
            startDate={periodFilter.startDate}
            endDate={periodFilter.endDate}
            periodLabel={periodFilter.label}
          />
        )}

        {activeTab === 'vat_return' && (
          <VatReturnView
            startDate={periodFilter.startDate}
            endDate={periodFilter.endDate}
            periodLabel={periodFilter.label}
          />
        )}
      </div>
    </div>
  );
};
