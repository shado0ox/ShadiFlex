import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  Lock,
  Key,
  Database,
  Crown,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { CompanyProfileTab } from './tabs/CompanyProfileTab';
import { FinancialPeriodsTab } from './tabs/FinancialPeriodsTab';
import { FiscalYearClosingTab } from './tabs/FiscalYearClosingTab';
import { ApiKeysTab } from './tabs/ApiKeysTab';
import { BackupRestoreTab } from './tabs/BackupRestoreTab';
import { LanguageDesignerTab } from './tabs/LanguageDesignerTab';

export const CompanySettingsManager: React.FC = () => {
  const {
    companySettings,
    fiscalClosings,
    apiKeys,
    financialPeriods,
  } = useAccounting();

  const [activeTab, setActiveTab] = useState<'profile' | 'periods' | 'closing' | 'api' | 'backup' | 'language_designer'>('profile');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-md">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">إعدادات المنشأة والإدارة المالية</h1>
            <p className="text-xs text-slate-500">
              إدارة بيانات المنشأة الضريبية، إقفال السنة المالية وترحيل الحسابات، ومفاتيح API للربط السحابي مع المنصات
            </p>
          </div>
        </div>

        {/* Current Fiscal Year Badge */}
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3.5 py-1.5 rounded-xl text-xs font-bold text-indigo-900">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span>السنة المالية الحالية: {companySettings.fiscalYear || new Date().getFullYear()}</span>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>بيانات وهوية المنشأة الضريبية</span>
        </button>

        <button
          onClick={() => setActiveTab('periods')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'periods'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-500" />
          <span>الفترات المالية المحاسبية (12 فترة)</span>
          {financialPeriods.filter((p) => p.status === 'closed').length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
              {financialPeriods.filter((p) => p.status === 'closed').length} مقفلة
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('closing')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'closing'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>إقفال السنة المالية وترحيل الأرصدة</span>
          {fiscalClosings.length > 0 && (
            <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.2 rounded-full">
              {fiscalClosings.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('api')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'api'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>مفاتيح API والربط مع المنصات</span>
          <span className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.2 rounded-full">
            {apiKeys.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'backup'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>النسخ الاحتياطي واستعادة البيانات</span>
        </button>

        <button
          onClick={() => setActiveTab('language_designer')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'language_designer'
              ? 'bg-linear-to-r from-amber-500 to-amber-600 text-slate-950 shadow-xs'
              : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-50/50'
          }`}
        >
          <Crown className="w-4 h-4 text-amber-500" />
          <span>اللغة وتوقيع المصمم (Mr. Shady Nassef)</span>
        </button>
      </div>

      {/* Tabs Content */}
      {activeTab === 'profile' && <CompanyProfileTab />}
      {activeTab === 'periods' && <FinancialPeriodsTab />}
      {activeTab === 'closing' && <FiscalYearClosingTab />}
      {activeTab === 'api' && <ApiKeysTab />}
      {activeTab === 'backup' && <BackupRestoreTab />}
      {activeTab === 'language_designer' && <LanguageDesignerTab />}
    </div>
  );
};
