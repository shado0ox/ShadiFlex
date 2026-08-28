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
  ShieldAlert,
  Zap,
  HelpCircle,
  RefreshCw,
  Clock,
  Sparkles,
  Crown,
  Languages,
  FileCheck,
  FileX,
  AlertTriangle,
  FileText,
  History,
  FileJson,
  Search,
  Filter,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CheckCircle,
} from 'lucide-react';
import { BackupValidationResult, ValidationIssue, EmergencyBackupRecord } from '../../services/dataValidationService';

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
    validateBackupJson,
    createPreImportEmergencyBackup,
    getEmergencyBackupRecord,
    restoreEmergencyBackup,
    resetToDemoData,
    accounts,
    journalEntries,
    salesInvoices,
    purchaseInvoices,
  } = useAccounting();

  const { language, setLanguage, toggleLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'profile' | 'closing' | 'api' | 'backup' | 'language_designer'>('profile');

  // Backup & Schema Validation State
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string; details?: string } | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [pendingImportJson, setPendingImportJson] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [selectedErrorSection, setSelectedErrorSection] = useState<string>('all');
  const [errorSearchQuery, setErrorSearchQuery] = useState<string>('');
  const [isConfirmImportModalOpen, setIsConfirmImportModalOpen] = useState(false);
  const [isEmergencyRollbackModalOpen, setIsEmergencyRollbackModalOpen] = useState(false);
  const [emergencyBackup, setEmergencyBackup] = useState<EmergencyBackupRecord | null>(() => getEmergencyBackupRecord());
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [copiedErrorReport, setCopiedErrorReport] = useState(false);

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

  // Handle Import File with Full Schema Validation
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the user can select the same file again if they fixed it
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setPendingImportJson(content);

      // Perform full synchronous schema & business rules validation
      const result = validateBackupJson(content);
      setValidationResult(result);

      if (!result.isValid) {
        // Atomic safety: NEVER alter application state when errors are found
        setIsValidationModalOpen(true);
        setImportStatus({
          success: false,
          message: `فشل فحص ملف النسخة الاحتياطية! تم اكتشاف ${result.errors.length} خطأ يمنع الاستيراد.`,
          details: 'لم يتم تعديل أي بيانات في النظام لضمان سلامة الدفاتر المحاسبية.',
        });
      } else {
        // Schema is 100% valid: Show verification summary & prompt confirmation
        setIsConfirmImportModalOpen(true);
      }
    };
    reader.readAsText(file);
  };

  // Handle Confirmed Import
  const handleConfirmImport = () => {
    if (!pendingImportJson) return;
    setIsProcessingImport(true);

    try {
      // 1. Create Local Emergency Backup of current state before applying changes
      createPreImportEmergencyBackup();

      // 2. Apply import atomically with sanitized secrets
      const ok = importDataJson(pendingImportJson);
      if (ok) {
        setImportStatus({
          success: true,
          message: 'تم استيراد واستعادة النسخة الاحتياطية بنجاح وتحديث كافة السجلات المحاسبية!',
          details: 'تم أخذ نسخة طوارئ محلية من بياناتك السابقة قبل تطبيق الاستيراد للرجوع إليها في أي وقت.',
        });
        setEmergencyBackup(getEmergencyBackupRecord());
        setIsConfirmImportModalOpen(false);
        setPendingImportJson(null);
        setValidationResult(null);
      } else {
        setImportStatus({
          success: false,
          message: 'حدث خطأ غير متوقع أثناء حفظ البيانات المستوردة.',
        });
      }
    } catch (err: any) {
      setImportStatus({
        success: false,
        message: `فشل الاستيراد: ${err?.message || 'خطأ غير معروف'}`,
      });
    } finally {
      setIsProcessingImport(false);
    }
  };

  // Handle Emergency Backup Rollback
  const handleRollbackEmergencyBackup = () => {
    setIsProcessingImport(true);
    try {
      const ok = restoreEmergencyBackup();
      if (ok) {
        setImportStatus({
          success: true,
          message: 'تم التراجع بنجاح واستعادة نسخة الطوارئ المحفوظة قبل الاستيراد!',
        });
        setIsEmergencyRollbackModalOpen(false);
      } else {
        setImportStatus({
          success: false,
          message: 'تعذر استرجاع نسخة الطوارئ أو لا توجد نسخة محفوظة مسبقاً.',
        });
      }
    } catch (err: any) {
      setImportStatus({
        success: false,
        message: `خطأ في استرجاع نسخة الطوارئ: ${err?.message}`,
      });
    } finally {
      setIsProcessingImport(false);
    }
  };

  // Copy Error Report to Clipboard
  const handleCopyErrorReport = () => {
    if (!validationResult || validationResult.errors.length === 0) return;
    const reportText = [
      '=== تقرير أخطاء فحص النسخة الاحتياطية المحاسبية ===',
      `تاريخ الفحص: ${new Date().toLocaleString('ar-SA')}`,
      `إجمالي الأخطاء: ${validationResult.errors.length}`,
      '',
      ...validationResult.errors.map(
        (err, idx) =>
          `[${idx + 1}] قسم: ${err.section}\nالمسار: ${err.path}\nالخطأ: ${err.message}${
            err.value !== undefined ? `\nالقيمة المدخلة: ${JSON.stringify(err.value)}` : ''
          }\n----------------------------------------`
      ),
    ].join('\n');

    navigator.clipboard.writeText(reportText);
    setCopiedErrorReport(true);
    setTimeout(() => setCopiedErrorReport(false), 2500);
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
            {/* Demo Notice Warning Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-amber-900">
                  تنبيه أمان بيئة العرض التجريبية (Demo Mode Security)
                </div>
                <p className="text-amber-800 leading-relaxed">
                  مفاتيح الـ API المعروضة هنا هي مفاتيح توضيحية لغرض تجربة الواجهة فقط. لا يتم تخزين مفاتيح سرية حقيقية داخل التخزين المحلي (LocalStorage)، ولا تُستخدم هذه المفاتيح للمصادقة الإنتاجية الحقيقية.
                </p>
              </div>
            </div>

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
                    <label className="block font-bold text-slate-700 mb-1">بيئة الاستخدام (Demo Reference)</label>
                    <select
                      value={keyEnv}
                      onChange={(e) => setKeyEnv(e.target.value as 'production' | 'test')}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                    >
                      <option value="production">نموذج بيئة الإنتاج التجريبي (Demo Live - demo_live_...)</option>
                      <option value="test">نموذج بيئة الاختبار التجريبي (Demo Sandbox - demo_test_...)</option>
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
      {/* TAB 4: BACKUP, RESTORE & STRICT SCHEMA VALIDATION */}
      {/* ========================================================================= */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Status Message */}
          {importStatus && (
            <div
              className={`p-4 rounded-2xl border text-xs animate-in fade-in space-y-1 ${
                importStatus.success
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50/80 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {importStatus.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span className="text-sm">{importStatus.message}</span>
              </div>
              {importStatus.details && (
                <p className="text-xs text-slate-600 pr-7 font-normal">{importStatus.details}</p>
              )}
            </div>
          )}

          {/* Top Security & Validation Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-7 h-7 text-indigo-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>منظومة التحقق وفحص البيانات الذكية (Schema Validation & Integrity)</span>
                  <span className="text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-full font-mono">
                    Zod Engine v3
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  فحص شامل ومطابقة فورية لكافة التواريخ، الأسعار، الكميات، الأرقام الضريبية 15 رقماً، واتزان القيود والحسابات المرتبطة قبل تطبيق أي تعديل.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 font-mono text-emerald-400 shrink-0">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>حماية الأسرار والمفاتيح (Secrets Excluded)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Export Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                      <Download className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">تصدير نسخة احتياطية كاملة (Backup JSON)</h3>
                      <p className="text-xs text-slate-500">حفظ كافة الدفاتر، القيود، الفواتير، الحسابات، والمخزون</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg">
                    JSON v2.0
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="space-y-1">
                    <div className="text-slate-500">• قيود اليومية: <span className="font-bold font-mono text-slate-900">{journalEntries.length}</span></div>
                    <div className="text-slate-500">• فواتير المبيعات: <span className="font-bold font-mono text-slate-900">{salesInvoices.length}</span></div>
                    <div className="text-slate-500">• فواتير المشتريات: <span className="font-bold font-mono text-slate-900">{purchaseInvoices.length}</span></div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-slate-500">• شجرة الحسابات: <span className="font-bold font-mono text-slate-900">{accounts.length}</span></div>
                    <div className="text-slate-500">• الرقم الضريبي: <span className="font-bold font-mono text-slate-900">{companySettings.vatNumber}</span></div>
                    <div className="text-slate-500">• السجل التجاري: <span className="font-bold font-mono text-slate-900">{companySettings.crNumber}</span></div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>يتم تلقائياً استبعاد أي مفاتيح سرية أو كلمات مرور لضمان الأمان المطلق.</span>
                </div>
              </div>

              <button
                onClick={handleDownloadBackup}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تحميل وتصدير النسخة الاحتياطية الآن (JSON)</span>
              </button>
            </div>

            {/* 2. Import & Strict Validation Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">استيراد وفحص نسخة احتياطية</h3>
                      <p className="text-xs text-slate-500">فحص شامل للبيانات قبل الاستبدال وحماية من الملفات التالفة</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    فحص Zod إجباري
                  </span>
                </div>

                <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 transition-all rounded-xl p-5 text-center">
                  <input
                    type="file"
                    id="backup-file-upload-strict"
                    accept=".json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                  <label
                    htmlFor="backup-file-upload-strict"
                    className="cursor-pointer flex flex-col items-center gap-2.5 text-slate-600 text-xs"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
                      <FileJson className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block text-sm">اسحب ملف النسخة الاحتياطية (.json) هنا أو انقر للاختيار</span>
                      <span className="text-[11px] text-slate-400">سيتم فحص الملف بالكامل والتأكد من صحته قبل طلب تأكيدك</span>
                    </div>
                  </label>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    قواعد الفحص التلقائي الإلزامية:
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 text-slate-500">
                    <div>• مطابقة الرقم الضريبي (15 رقم)</div>
                    <div>• اتزان قيود اليومية رياضياً</div>
                    <div>• التحقق من وجود الحسابات المرتبطة</div>
                    <div>• منع الكميات والأسعار السالبة</div>
                  </div>
                </div>
              </div>

              {validationResult && validationResult.hasErrors && (
                <button
                  type="button"
                  onClick={() => setIsValidationModalOpen(true)}
                  className="w-full py-2.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>عرض تقرير الأخطاء المكتشفة ({validationResult.errors.length} خطأ)</span>
                </button>
              )}
            </div>
          </div>

          {/* 3. Emergency Backup Rollback Card */}
          <div className="bg-amber-50/50 rounded-2xl border border-amber-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <History className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-bold text-amber-950 text-sm flex items-center gap-2">
                  <span>نسخة الطوارئ المحلية السابقة (Pre-Import Snapshot)</span>
                  {emergencyBackup ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                      متاحة وجاهزة للرجوع
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold">
                      يتم إنشاؤها آلياً قبل كل استيراد
                    </span>
                  )}
                </h4>
                <p className="text-xs text-amber-800">
                  {emergencyBackup
                    ? `محفوظة بتاريخ: ${new Date(emergencyBackup.timestamp).toLocaleString('ar-SA')} المنشأة: ${
                        emergencyBackup.data.companySettings?.nameAr || 'المنشأة'
                      } (قيود: ${emergencyBackup.data.journalEntries?.length || 0})`
                    : 'يحتفظ النظام تلقائياً بآخر حالة سليمة للنظام قبل إدخال أي ملف جديد لضمان عدم ضياع أعمالك.'}
                </p>
              </div>
            </div>

            {emergencyBackup && (
              <button
                type="button"
                onClick={() => setIsEmergencyRollbackModalOpen(true)}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs shrink-0 cursor-pointer flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>استرجاع نسخة الطوارئ السابقة</span>
              </button>
            )}
          </div>

          {/* 4. Reset To Demo Data */}
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
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              إعادة ضبط البيانات التجريبية
            </button>
          </div>

          {/* ===================================================================== */}
          {/* DETAILED VALIDATION ERROR REPORT MODAL */}
          {/* ===================================================================== */}
          {isValidationModalOpen && validationResult && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 max-w-3xl w-full shadow-2xl border border-slate-200 text-right space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <FileX className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <span>تقرير أخطاء فحص النسخة الاحتياطية</span>
                        <span className="text-xs bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full font-bold">
                          {validationResult.errors.length} خطأ يمنع الاستيراد
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        حفاظاً على سلامة الدفاتر المحاسبية، لم يتم تعديل أي بيانات في النظام نظراً لعدم اجتياز قواعد الفحص.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsValidationModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="بحث في الأخطاء أو المسار أو اسم الحقل..."
                      value={errorSearchQuery}
                      onChange={(e) => setErrorSearchQuery(e.target.value)}
                      className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  {/* Section Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
                    {Array.from(new Set(['all', ...validationResult.errors.map((e) => e.section)])).map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setSelectedErrorSection(sec)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                          selectedErrorSection === sec
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {sec === 'all' ? 'جميع الأقسام' : sec}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error Items List */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {validationResult.errors
                    .filter((err) => selectedErrorSection === 'all' || err.section === selectedErrorSection)
                    .filter(
                      (err) =>
                        !errorSearchQuery ||
                        err.message.toLowerCase().includes(errorSearchQuery.toLowerCase()) ||
                        err.path.toLowerCase().includes(errorSearchQuery.toLowerCase()) ||
                        err.section.toLowerCase().includes(errorSearchQuery.toLowerCase())
                    )
                    .map((err, idx) => (
                      <div
                        key={err.id || idx}
                        className="bg-rose-50/50 border border-rose-200/80 rounded-2xl p-4 space-y-2 hover:bg-rose-50 transition-colors text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-900 font-bold font-mono text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-bold bg-white text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md text-[11px]">
                              {err.section}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-500 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                            {err.path}
                          </span>
                        </div>

                        <p className="font-bold text-rose-950 pr-7 text-xs leading-relaxed">
                          {err.message}
                        </p>

                        {err.value !== undefined && (
                          <div className="pr-7 pt-1 text-[11px] text-slate-500 font-mono">
                            القيمة المدخلة في الملف:{' '}
                            <code className="bg-white px-2 py-0.5 rounded border border-slate-200 text-rose-700">
                              {typeof err.value === 'object' ? JSON.stringify(err.value) : String(err.value)}
                            </code>
                          </div>
                        )}
                      </div>
                    ))}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyErrorReport}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    {copiedErrorReport ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">تم نسخ التقرير للحافظة</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>نسخ تقرير الأخطاء</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsValidationModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    إغلاق التقرير
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* CONFIRMATION & BACKUP CONTENT OVERVIEW MODAL */}
          {/* ===================================================================== */}
          {isConfirmImportModalOpen && validationResult && validationResult.summary && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 text-right space-y-5 animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <FileCheck className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <span>تم فحص الملف واجتياز قواعد التحقق بنجاح!</span>
                        <span className="text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                          100% Valid
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        تمت مطابقة بنية الملف، شجرة الحسابات، الفواتير، واتزان قيود اليومية.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsConfirmImportModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Company & File Overview */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <div>
                      <span className="text-slate-500 block text-[11px]">اسم المنشأة المستوردة</span>
                      <span className="font-bold text-slate-900 text-sm">{validationResult.summary.companyNameAr}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-slate-500 block text-[11px]">الرقم الضريبي</span>
                      <span className="font-bold font-mono text-slate-900">{validationResult.summary.vatNumber}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-500 block">شجرة الحسابات</span>
                      <span className="font-bold font-mono text-indigo-700 text-sm">{validationResult.summary.totalAccounts} حساب</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-500 block">فواتير المبيعات</span>
                      <span className="font-bold font-mono text-emerald-700 text-sm">{validationResult.summary.totalSalesInvoices} فاتورة</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-500 block">فواتير المشتريات</span>
                      <span className="font-bold font-mono text-blue-700 text-sm">{validationResult.summary.totalPurchaseInvoices} فاتورة</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-500 block">قيود اليومية</span>
                      <span className="font-bold font-mono text-purple-700 text-sm">{validationResult.summary.totalJournalEntries} قيد</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-500 block">أصناف المخزون</span>
                      <span className="font-bold font-mono text-slate-800 text-sm">{validationResult.summary.totalInventoryItems} صنف</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-500 block">حركات المخزون</span>
                      <span className="font-bold font-mono text-slate-800 text-sm">{validationResult.summary.totalStockMovements} حركة</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-500 block">السندات والمصروفات</span>
                      <span className="font-bold font-mono text-slate-800 text-sm">
                        {validationResult.summary.totalVouchers + validationResult.summary.totalSimpleExpenses}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-500 block">الفروع والكاشير</span>
                      <span className="font-bold font-mono text-slate-800 text-sm">
                        {validationResult.summary.totalBranches} / {validationResult.summary.totalCashRegisters}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Safety Guarantee Box */}
                <div className="bg-indigo-50/80 border border-indigo-200 p-3.5 rounded-2xl text-xs space-y-1 text-indigo-950">
                  <div className="font-bold flex items-center gap-1.5 text-indigo-900">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    ضمان الأمان والنسخ الاحتياطي التلقائي:
                  </div>
                  <p className="text-[11px] text-indigo-800 leading-relaxed pr-5">
                    • سيتم أوتوماتيكياً حفظ <strong>نسخة طوارئ محلية</strong> من بياناتك الحالية قبل استبدالها لتتمكن من الرجوع إليها في أي وقت.
                    <br />
                    • تم تطهير واستبعاد أي مفاتيح API أو أسرار حساسة لضمان حماية النظام.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsConfirmImportModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                  >
                    إلغاء الأمر
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingImport}
                    onClick={handleConfirmImport}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingImport ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري الحفظ الآمن وتحديث السجلات...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تأكيد واستبدال البيانات الآن</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* EMERGENCY ROLLBACK MODAL */}
          {/* ===================================================================== */}
          {isEmergencyRollbackModalOpen && emergencyBackup && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-right space-y-4 animate-in fade-in zoom-in-95">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">هل ترغب في استرجاع نسخة الطوارئ السابقة؟</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    سيتم التراجع عن الملف المستورد واستعادة كافة البيانات التي تم حفظها تلقائياً بتاريخ:{' '}
                    <strong>{new Date(emergencyBackup.timestamp).toLocaleString('ar-SA')}</strong>.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsEmergencyRollbackModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleRollbackEmergencyBackup}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    نعم، استرجاع نسخة الطوارئ
                  </button>
                </div>
              </div>
            </div>
          )}

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
