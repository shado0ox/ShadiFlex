import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { useLanguage } from '../../context/LanguageContext';
import { DesignerSignature } from '../Signature/DesignerSignature';
import {
  CompanySettings,
  ApiKey,
  FiscalYearClosing,
} from '../../types/accounting';
import { formatSAR } from '../../utils/currency';
import {
  Building2,
  Lock,
  Key,
  Database,
  CheckCircle2,
  AlertCircle,
  Save,
  Plus,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  RotateCcw,
  Download,
  Upload,
  Calendar,
  Layers,
  FileSpreadsheet,
  Globe,
  Code2,
  ShieldCheck,
  Zap,
  HelpCircle,
  RefreshCw,
  Clock,
  Sparkles,
  Crown,
  Languages,
} from 'lucide-react';

export const CompanySettingsManager: React.FC = () => {
  const {
    companySettings,
    updateCompanySettings,
    apiKeys,
    createApiKey,
    toggleApiKeyStatus,
    deleteApiKey,
    fiscalClosings,
    closeFiscalYear,
    reopenFiscalYear,
    exportDataJson,
    importDataJson,
    resetToDemoData,
    accounts,
    journalEntries,
    salesInvoices,
    purchaseInvoices,
  } = useAccounting();

  const { language, setLanguage, toggleLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'profile' | 'closing' | 'api' | 'backup' | 'language_designer'>('profile');

  // Company Profile State
  const [profileForm, setProfileForm] = useState<CompanySettings>(() => {
    const nat = companySettings.nationalAddress || companySettings.address || {
      city: 'الرياض',
      district: 'العليا',
      street: 'طريق الملك فهد الفرعي',
      buildingNumber: '7342',
      postalCode: '12214',
      additionalNumber: '3190',
      country: 'المملكة العربية السعودية',
    };
    return {
      ...companySettings,
      nationalAddress: nat,
      address: nat,
      fiscalYear: companySettings.fiscalYear || new Date().getFullYear(),
      fiscalYearStart: companySettings.fiscalYearStart || `${new Date().getFullYear()}-01-01`,
      fiscalYearEnd: companySettings.fiscalYearEnd || `${new Date().getFullYear()}-12-31`,
    };
  });
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);

  // Sync profile form if companySettings changes externally
  React.useEffect(() => {
    const nat = companySettings.nationalAddress || companySettings.address || {
      city: 'الرياض',
      district: 'العليا',
      street: 'طريق الملك فهد الفرعي',
      buildingNumber: '7342',
      postalCode: '12214',
      additionalNumber: '3190',
      country: 'المملكة العربية السعودية',
    };
    setProfileForm({
      ...companySettings,
      nationalAddress: nat,
      address: nat,
      fiscalYear: companySettings.fiscalYear || new Date().getFullYear(),
      fiscalYearStart: companySettings.fiscalYearStart || `${new Date().getFullYear()}-01-01`,
      fiscalYearEnd: companySettings.fiscalYearEnd || `${new Date().getFullYear()}-12-31`,
    });
  }, [companySettings]);

  // Year-End Closing Modal / Form
  const [closingYear, setClosingYear] = useState<number>(2025);
  const [closingDate, setClosingDate] = useState<string>('2025-12-31');
  const [closedByName, setClosedByName] = useState<string>('المدير المالي المعتمد');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [closingInProgress, setClosingInProgress] = useState(false);
  const [closingSuccessMsg, setClosingSuccessMsg] = useState<string | null>(null);
  const [reopenTargetId, setReopenTargetId] = useState<string | null>(null);

  // API Key Form State
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [keyEnv, setKeyEnv] = useState<'production' | 'test'>('production');
  const [keyPermissions, setKeyPermissions] = useState<string[]>([
    'invoices:read',
    'invoices:write',
    'customers:read',
    'reports:read',
  ]);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [revealedKeyId, setRevealedKeyId] = useState<string | null>(null);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKey | null>(null);

  // Backup state
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Handle Profile Save
  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanySettings(profileForm);
    setProfileSuccessMsg('تم حفظ إعدادات وبيانات المنشأة بنجاح.');
    setTimeout(() => setProfileSuccessMsg(null), 4000);
  };

  // Handle Fiscal Year Closing Execution
  const handleExecuteClosing = async (e: React.FormEvent) => {
    e.preventDefault();
    setClosingInProgress(true);
    try {
      const record = await closeFiscalYear(
        closingYear,
        closingDate,
        closedByName,
        closingNotes
      );
      setClosingSuccessMsg(`تم إقفال السنة المالية ${closingYear} بنجاح برقم قيد ${record.journalEntryNumber}`);
      setIsClosingModalOpen(false);
      setTimeout(() => setClosingSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء إقفال السنة المالية');
    } finally {
      setClosingInProgress(false);
    }
  };

  // Handle API Key Creation
  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    const created = createApiKey({
      name: keyName.trim(),
      environment: keyEnv,
      permissions: keyPermissions,
    });

    setNewlyCreatedKey(created);
    setKeyName('');
    setIsApiKeyModalOpen(false);
  };

  // Copy API key to clipboard
  const handleCopyKey = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2500);
  };

  // Handle Export Backup
  const handleDownloadBackup = () => {
    const jsonStr = exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${companySettings.crNumber || 'company'}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle Import Backup
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const ok = importDataJson(content);
      if (ok) {
        setImportStatus({
          success: true,
          message: 'تمت استعادة النسخة الاحتياطية بنجاح وتحديث كافة السجلات والحسابات!',
        });
      } else {
        setImportStatus({
          success: false,
          message: 'الملف غير صالح أو به تلف في بنية البيانات JSON.',
        });
      }
    };
    reader.readAsText(file);
  };

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
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>بيانات وهوية المنشأة الضريبية</span>
        </button>

        <button
          onClick={() => setActiveTab('closing')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
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
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
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
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
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
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'language_designer'
              ? 'bg-linear-to-r from-amber-500 to-amber-600 text-slate-950 shadow-xs'
              : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-50/50'
          }`}
        >
          <Crown className="w-4 h-4 text-amber-500" />
          <span>اللغة وتوقيع المصمم (Mr. Shady Nassef)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COMPANY PROFILE */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          {profileSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{profileSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleProfileSave} className="space-y-6 text-slate-800 text-xs">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                المعلومات القانونية والاسم التجاري
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    اسم المنشأة الرسمي بالعربية <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileForm.nameAr}
                    onChange={(e) => setProfileForm({ ...profileForm, nameAr: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    اسم المنشأة بالإنجليزية (English Legal Name) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileForm.nameEn}
                    onChange={(e) => setProfileForm({ ...profileForm, nameEn: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    الرقم الضريبي للمنشأة (15 رقماً - ZATCA VAT Number) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileForm.vatNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, vatNumber: e.target.value })}
                    maxLength={15}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">يجب أن يبدأ برقم 3 وينتهي برقم 3 ويتكون من 15 رقماً</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    رقم السجل التجاري (Commercial Registration - CR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileForm.crNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, crNumber: e.target.value })}
                    maxLength={10}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* National Address */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                العنوان الوطني السعودي والاتصال
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المدينة (City)</label>
                  <input
                    type="text"
                    value={profileForm.nationalAddress?.city || profileForm.address?.city || ''}
                    onChange={(e) => {
                      const updatedNat = {
                        ...(profileForm.nationalAddress || profileForm.address || {}),
                        city: e.target.value,
                      } as any;
                      setProfileForm({
                        ...profileForm,
                        nationalAddress: updatedNat,
                        address: updatedNat,
                      });
                    }}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الحي (District)</label>
                  <input
                    type="text"
                    value={profileForm.nationalAddress?.district || profileForm.address?.district || ''}
                    onChange={(e) => {
                      const updatedNat = {
                        ...(profileForm.nationalAddress || profileForm.address || {}),
                        district: e.target.value,
                      } as any;
                      setProfileForm({
                        ...profileForm,
                        nationalAddress: updatedNat,
                        address: updatedNat,
                      });
                    }}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم الشارع (Street)</label>
                  <input
                    type="text"
                    value={profileForm.nationalAddress?.street || profileForm.address?.street || ''}
                    onChange={(e) => {
                      const updatedNat = {
                        ...(profileForm.nationalAddress || profileForm.address || {}),
                        street: e.target.value,
                      } as any;
                      setProfileForm({
                        ...profileForm,
                        nationalAddress: updatedNat,
                        address: updatedNat,
                      });
                    }}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم المبنى (Building #)</label>
                  <input
                    type="text"
                    value={profileForm.nationalAddress?.buildingNumber || profileForm.address?.buildingNumber || ''}
                    onChange={(e) => {
                      const updatedNat = {
                        ...(profileForm.nationalAddress || profileForm.address || {}),
                        buildingNumber: e.target.value,
                      } as any;
                      setProfileForm({
                        ...profileForm,
                        nationalAddress: updatedNat,
                        address: updatedNat,
                      });
                    }}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الرمز البريدي (Postal Code)</label>
                  <input
                    type="text"
                    value={profileForm.nationalAddress?.postalCode || profileForm.address?.postalCode || ''}
                    onChange={(e) => {
                      const updatedNat = {
                        ...(profileForm.nationalAddress || profileForm.address || {}),
                        postalCode: e.target.value,
                      } as any;
                      setProfileForm({
                        ...profileForm,
                        nationalAddress: updatedNat,
                        address: updatedNat,
                      });
                    }}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الرقم الإضافي (Additional #)</label>
                  <input
                    type="text"
                    value={profileForm.nationalAddress?.additionalNumber || profileForm.address?.additionalNumber || ''}
                    onChange={(e) => {
                      const updatedNat = {
                        ...(profileForm.nationalAddress || profileForm.address || {}),
                        additionalNumber: e.target.value,
                      } as any;
                      setProfileForm({
                        ...profileForm,
                        nationalAddress: updatedNat,
                        address: updatedNat,
                      });
                    }}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم الهاتف / الجوال المعتمد</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني الرسمي</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Fiscal Year Settings */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                إعدادات السنة والعملة المحاسبية
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">السنة المالية المفتوحة</label>
                  <input
                    type="number"
                    value={profileForm.fiscalYear}
                    onChange={(e) => setProfileForm({ ...profileForm, fiscalYear: parseInt(e.target.value) || 2026 })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">بداية السنة المالية</label>
                  <input
                    type="date"
                    value={profileForm.fiscalYearStart}
                    onChange={(e) => setProfileForm({ ...profileForm, fiscalYearStart: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">نهاية السنة المالية</label>
                  <input
                    type="date"
                    value={profileForm.fiscalYearEnd}
                    onChange={(e) => setProfileForm({ ...profileForm, fiscalYearEnd: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات وتحديث البيانات</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FISCAL YEAR CLOSING & ACCOUNT ROLL-FORWARD */}
      {/* ========================================================================= */}
      {activeTab === 'closing' && (
        <div className="space-y-6">
          {closingSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{closingSuccessMsg}</span>
            </div>
          )}

          {/* Explanation Card */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-md space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black">نظام إقفال السنة المالية وترحيل الحسابات (Year-End Closing)</h2>
                  <p className="text-xs text-slate-300">
                    تصفير الحسابات الاسمية (الإيرادات 4xxx والمصروفات 5xxx) وترحيل صافي الأرباح/الخسائر إلى حساب الأرباح المبقاة (3102)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsClosingModalOpen(true)}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all"
              >
                <Lock className="w-4 h-4" />
                <span>بدء إقفال سنة مالية وترحيل الأرصدة</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="bg-white/10 p-3 rounded-xl border border-white/10 space-y-1">
                <div className="font-bold text-emerald-300">1. تصفير الإيرادات (4xxx)</div>
                <div className="text-[11px] text-slate-300">
                  يتم جعل حسابات المبيعات والإيرادات مدينة برصيدها الدائن لتصبح أصفاراً للسنة الجديدة.
                </div>
              </div>
              <div className="bg-white/10 p-3 rounded-xl border border-white/10 space-y-1">
                <div className="font-bold text-amber-300">2. تصفير المصروفات (5xxx)</div>
                <div className="text-[11px] text-slate-300">
                  يتم جعل حسابات المصروفات وتكلفة المبيعات دائنة برصيدها المدين لتصبح أصفاراً للسنة الجديدة.
                </div>
              </div>
              <div className="bg-white/10 p-3 rounded-xl border border-white/10 space-y-1">
                <div className="font-bold text-cyan-300">3. ترحيل الأرباح المبقاة (3102)</div>
                <div className="text-[11px] text-slate-300">
                  تتم إضافة صافي الربح (أو خصم الخسارة) تلقائياً إلى حساب حقوق الملكية (الأرباح المحتجزة).
                </div>
              </div>
            </div>
          </div>

          {/* History of Closings */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                سجل إقفالات السنوات المالية السابقة
              </h3>
              <span className="text-xs text-slate-500">{fiscalClosings.length} سنوات مقفلة مسجلة</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3.5">السنة المالية</th>
                    <th className="p-3.5">تاريخ الإقفال</th>
                    <th className="p-3.5 text-left">إجمالي الإيرادات</th>
                    <th className="p-3.5 text-left">إجمالي المصروفات</th>
                    <th className="p-3.5 text-left">صافي الربح / الخسارة المُرَحَّل</th>
                    <th className="p-3.5">رقم قيد الإقفال</th>
                    <th className="p-3.5">المُقْفِل المعتمد</th>
                    <th className="p-3.5 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fiscalClosings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        لم يتم تسجيل أي إقفال سنوي حتى الآن. انقر على "بدء إقفال سنة مالية" لإقفال سنة سابقة وترحيل نتائجها.
                      </td>
                    </tr>
                  ) : (
                    fiscalClosings.map((closing) => {
                      const isProfit = closing.netProfitOrLoss >= 0;
                      return (
                        <tr key={closing.id} className="hover:bg-slate-50/60">
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-slate-900 text-sm">{closing.year}</span>
                            <span className="mr-2 inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold">
                              مقفلة
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-600 font-mono">{closing.closingDate}</td>
                          <td className="p-3.5 text-left font-mono font-medium text-emerald-700">
                            {formatSAR(closing.totalRevenue)}
                          </td>
                          <td className="p-3.5 text-left font-mono font-medium text-rose-700">
                            {formatSAR(closing.totalExpense)}
                          </td>
                          <td className="p-3.5 text-left font-mono font-bold text-sm">
                            <span className={isProfit ? 'text-emerald-600' : 'text-rose-600'}>
                              {isProfit ? '+' : ''}{formatSAR(closing.netProfitOrLoss)}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-indigo-700 font-bold">
                            {closing.journalEntryNumber}
                          </td>
                          <td className="p-3.5 text-slate-700">{closing.closedBy}</td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => setReopenTargetId(closing.id)}
                              title="إعادة فتح السنة المالية وحذف قيد الإقفال"
                              className="px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 flex items-center gap-1 mx-auto"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>إعادة فتح</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reopen Confirmation Modal */}
          {reopenTargetId && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-right space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">تأكيد إعادة فتح السنة المالية</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    سيتم حذف قيد الإقفال السنوي وإعادة أرصدة حسابات الإيرادات والمصروفات إلى حالتها الأصلية قبل الإقفال.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setReopenTargetId(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={async () => {
                      await reopenFiscalYear(reopenTargetId);
                      setReopenTargetId(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors"
                  >
                    تأكيد إعادة الفتح وإلغاء القيد
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Closing Execution Modal */}
          {isClosingModalOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 text-right space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">إقفال السنة المالية وترحيل الأرباح</h3>
                      <p className="text-[11px] text-slate-500">توليد قيد الإقفال السنوي وترحيل الحسابات لحساب 3102</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsClosingModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleExecuteClosing} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      السنة المالية المراد إقفالها <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={closingYear}
                      onChange={(e) => setClosingYear(parseInt(e.target.value) || 2025)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold font-mono text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      تاريخ قيد الإقفال السنوي <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={closingDate}
                      onChange={(e) => setClosingDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      اسم المسؤول / المعتمد للإقفال <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={closedByName}
                      onChange={(e) => setClosedByName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ملاحظات وقرار الجمعية / مجلس الإدارة</label>
                    <textarea
                      value={closingNotes}
                      onChange={(e) => setClosingNotes(e.target.value)}
                      placeholder="قرار اعتماد القوائم المالية وإقفال الحسابات وترحيل الصافي للأرباح المبقاة..."
                      rows={2}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 resize-none"
                    />
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      تنبيه محاسبي مهم:
                    </div>
                    <div>
                      سيقوم النظام بحساب كافة أرصدة الإيرادات والمصروفات حتى تاريخ الإقفال وإنشاء قيد محاسبي مزدوج متوازن تلقائياً يصفر حسابات قائمة الدخل ويرحل الصافي لحساب حقوق الملكية (3102).
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsClosingModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={closingInProgress}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md flex items-center gap-2 disabled:opacity-50"
                    >
                      <Lock className="w-4 h-4" />
                      <span>{closingInProgress ? 'جاري الإقفال...' : 'تنفيذ الإقفال وترحيل الأرصدة'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: API KEYS & EXTERNAL PLATFORM INTEGRATIONS */}
      {/* ========================================================================= */}
      {activeTab === 'api' && (
        <div className="space-y-6">
          {/* Newly Created Key Alert Modal */}
          {newlyCreatedKey && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-slate-900 text-xs space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>تم إنشاء مفتاح API الجديد بنجاح!</span>
                </div>
                <button
                  onClick={() => setNewlyCreatedKey(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  إغلاق
                </button>
              </div>

              <p className="text-slate-600 text-[11px]">
                يرجى نسخ هذا المفتاح الآن وحفظه في مكان آمن. لن تتمكن من رؤية المفتاح السري الكامل مرة أخرى لأسباب أمنية.
              </p>

              <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-emerald-300">
                <code className="flex-1 font-mono text-xs font-bold text-indigo-900 select-all overflow-x-auto">
                  {newlyCreatedKey.key}
                </code>
                <button
                  onClick={() => handleCopyKey(newlyCreatedKey.key, newlyCreatedKey.id)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  {copiedKeyId === newlyCreatedKey.id ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ المفتاح</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* API Header & Key Manager */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-600" />
                  مفاتيح الربط والواجهات البرمجية (REST API Keys)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  استخدم هذه المفاتيح لربط برنامج المحاسبة مع متجرك على سلة (Salla)، زد (Zid)، شوبيفاي، أو أنظمة نقاط البيع POS
                </p>
              </div>

              <button
                onClick={() => setIsApiKeyModalOpen(true)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-indigo-600/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء مفتاح API جديد</span>
              </button>
            </div>

            {/* API Keys Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3.5">اسم المفتاح / التطبيق</th>
                    <th className="p-3.5">البيئة</th>
                    <th className="p-3.5">المفتاح السري (API Key)</th>
                    <th className="p-3.5">الصلاحيات</th>
                    <th className="p-3.5">تاريخ الإنشاء</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {apiKeys.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        لا توجد مفاتيح API حالياً. انقر على "إنشاء مفتاح API جديد" للبدء بالربط مع التطبيقات الخارجية.
                      </td>
                    </tr>
                  ) : (
                    apiKeys.map((key) => {
                      const isRevealed = revealedKeyId === key.id;
                      return (
                        <tr key={key.id} className="hover:bg-slate-50/60">
                          <td className="p-3.5 font-bold text-slate-900">{key.name}</td>
                          <td className="p-3.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                key.environment === 'production'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {key.environment === 'production' ? 'بيئة الإنتاج Live' : 'بيئة الاختبار Sandbox'}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-700 select-all">
                                {isRevealed ? key.key : key.maskedKey}
                              </span>
                              <button
                                onClick={() => setRevealedKeyId(isRevealed ? null : key.id)}
                                className="text-slate-400 hover:text-slate-600 p-1"
                                title={isRevealed ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleCopyKey(key.key, key.id)}
                                className="text-slate-400 hover:text-indigo-600 p-1"
                                title="نسخ المفتاح"
                              >
                                {copiedKeyId === key.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="flex flex-wrap gap-1">
                              {key.permissions.map((p) => (
                                <span
                                  key={p}
                                  className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono"
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                            {new Date(key.createdAt).toLocaleDateString('ar-SA')}
                          </td>
                          <td className="p-3.5">
                            <button
                              onClick={() => toggleApiKeyStatus(key.id)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                                key.isActive
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {key.isActive ? 'نشط ومفعل' : 'معطل مؤقتاً'}
                            </button>
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => deleteApiKey(key.id)}
                              title="حذف المفتاح نهائياً"
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Integration Examples & Webhook Docs */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-400" />
                <h4 className="font-bold text-white text-sm">أمثلة الربط والتكامل البرمجي (Integration Guides)</h4>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">REST API v1 / JSON</span>
            </div>

            <p className="text-xs text-slate-300">
              يمكنك تمرير مفتاح الـ API في ترويسة الطلب <code className="bg-slate-800 px-2 py-0.5 rounded text-indigo-300 font-mono">Authorization: Bearer sk_live_...</code> لمزامنة فواتير المبيعات، تسجيل المدفوعات، وإصدار الفواتير الإلكترونية ZATCA فورياً.
            </p>

            <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-slate-300 space-y-2 overflow-x-auto border border-slate-800">
              <div className="text-slate-500"># مثال طلب إنشاء فاتورة مبيعات إلكترونية عبر cURL:</div>
              <div className="text-indigo-300">curl -X POST https://api.accounting.sa/v1/invoices \</div>
              <div className="pl-4 text-emerald-400">-H "Authorization: Bearer sk_live_your_api_key" \</div>
              <div className="pl-4 text-emerald-400">-H "Content-Type: application/json" \</div>
              <div className="pl-4 text-slate-300">-d '&#123;</div>
              <div className="pl-8 text-slate-300">"customer_id": "cust_123",</div>
              <div className="pl-8 text-slate-300">"issue_date": "2026-08-24",</div>
              <div className="pl-8 text-slate-300">"items": [&#123; "name": "خدمة استشارية", "qty": 1, "unit_price": 500, "vat_rate": 0.15 &#125;],</div>
              <div className="pl-8 text-slate-300">"payment_method": "bank_transfer"</div>
              <div className="pl-4 text-slate-300">&#125;'</div>
            </div>
          </div>

          {/* Create API Key Modal */}
          {isApiKeyModalOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-right space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                      <Key className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">توليد مفتاح API جديد</h3>
                  </div>
                  <button onClick={() => setIsApiKeyModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <form onSubmit={handleCreateApiKey} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      اسم المفتاح / اسم المنصة المرتبطة <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder="مثال: متجر سلة Salla / منصة زد Zid / نظام نقاط البيع"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">بيئة الاستخدام</label>
                    <select
                      value={keyEnv}
                      onChange={(e) => setKeyEnv(e.target.value as 'production' | 'test')}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                    >
                      <option value="production">بيئة الإنتاج الحية (Production - sk_live_...)</option>
                      <option value="test">بيئة الاختبار والتجربة (Sandbox - sk_test_...)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-2">صلاحيات المفتاح (Permissions)</label>
                    <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {[
                        { id: 'invoices:read', label: 'قراءة واستعلام الفواتير' },
                        { id: 'invoices:write', label: 'إصدار وتعديل فواتير المبيعات' },
                        { id: 'customers:read', label: 'قراءة بيانات وسجلات العملاء' },
                        { id: 'customers:write', label: 'إضافة وتحديث العملاء' },
                        { id: 'vouchers:write', label: 'إنشاء سندات القبض والصرف' },
                        { id: 'reports:read', label: 'استخراج التقارير المالية والإقرارات' },
                      ].map((perm) => (
                        <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={keyPermissions.includes(perm.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setKeyPermissions([...keyPermissions, perm.id]);
                              } else {
                                setKeyPermissions(keyPermissions.filter((p) => p !== perm.id));
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-slate-700">{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsApiKeyModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md"
                    >
                      توليد المفتاح الآن
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BACKUP, RESTORE & RESET */}
      {/* ========================================================================= */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {importStatus && (
            <div
              className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                importStatus.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {importStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{importStatus.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-indigo-50 text-indigo-700">
                  <Download className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">تصدير نسخة احتياطية كاملة (Backup JSON)</h3>
                  <p className="text-xs text-slate-500">حفظ كافة قيود اليومية، الفواتير، الحسابات، والمصروفات بملف آمن</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div>• عدد قيود اليومية المحاسبية: <span className="font-bold font-mono text-slate-900">{journalEntries.length}</span></div>
                <div>• فواتير المبيعات والمشتريات: <span className="font-bold font-mono text-slate-900">{salesInvoices.length + purchaseInvoices.length}</span></div>
                <div>• الحسابات المالية النشطة: <span className="font-bold font-mono text-slate-900">{accounts.length}</span></div>
              </div>

              <button
                onClick={handleDownloadBackup}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>تحميل النسخة الاحتياطية الآن (JSON)</span>
              </button>
            </div>

            {/* Import Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">استعادة نسخة احتياطية (Restore Data)</h3>
                  <p className="text-xs text-slate-500">رفع ملف JSON تم تصديره مسبقاً لاستعادة السجلات بالكامل</p>
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors">
                <input
                  type="file"
                  id="backup-file-upload"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
                <label
                  htmlFor="backup-file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2 text-slate-600 text-xs"
                >
                  <Upload className="w-8 h-8 text-slate-400" />
                  <span className="font-bold text-slate-800">انقر هنا لاختيار ملف النسخة الاحتياطية (.json)</span>
                  <span className="text-[11px] text-slate-400">سيتم استبدال البيانات الحالية فوراً بالبيانات المستعادة</span>
                </label>
              </div>
            </div>
          </div>

          {/* Reset To Demo Data */}
          <div className="bg-rose-50/60 rounded-2xl border border-rose-200 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h4 className="font-bold text-rose-900 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                إعادة تعيين النظام للبيانات التجريبية السعودية الافتراضية
              </h4>
              <p className="text-xs text-rose-700 mt-0.5">
                مسح التغييرات الحالية واستعادة شجرة الحسابات السعودية النموذجية وفواتير ومصروفات العرض التجريبية
              </p>
            </div>

            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs shrink-0"
            >
              إعادة ضبط البيانات التجريبية
            </button>
          </div>

          {/* Reset Modal Confirmation */}
          {isResetConfirmOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-right space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">هل أنت متأكد من إعادة تعيين البيانات؟</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    سيتم مسح أي سجلات جديدة قمت بإضافتها واسترجاع شجرة الحسابات والبيانات التجريبية المعتمدة.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsResetConfirmOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => {
                      resetToDemoData();
                      setIsResetConfirmOpen(false);
                      setImportStatus({
                        success: true,
                        message: 'تمت إعادة تعيين النظام للبيانات التجريبية الافتراضية بنجاح!',
                      });
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
                  >
                    نعم، إعادة التعيين الآن
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: LANGUAGE & DESIGNER SIGNATURE */}
      {/* ========================================================================= */}
      {activeTab === 'language_designer' && (
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
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
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
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
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
      )}
    </div>
  );
};
