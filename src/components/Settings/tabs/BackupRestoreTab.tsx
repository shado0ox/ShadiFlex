import React, { useState } from 'react';
import {
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  FileX,
  ShieldCheck,
  History,
  ShieldAlert,
  FileJson,
  Search,
  Copy,
  Check,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { useAccounting } from '../../../context/AccountingContext';
import {
  validateBackupStrict,
  formatValidationErrorReport,
  downloadBackupAsJson,
  EmergencyBackupState,
} from '../../../utils/backupValidator';

export const BackupRestoreTab: React.FC = () => {
  const {
    companySettings,
    accounts,
    journalEntries,
    salesInvoices,
    purchaseInvoices,
    exportDataJson,
    importDataJson,
    resetToDemoData,
    restoreEmergencyBackup,
  } = useAccounting();

  // Status & Validation State
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string; details?: string } | null>(null);
  const [validationResult, setValidationResult] = useState<ReturnType<typeof validateBackupStrict> | null>(null);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [isConfirmImportModalOpen, setIsConfirmImportModalOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<any>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  // Filter & Search inside Error Report Modal
  const [errorSearchQuery, setErrorSearchQuery] = useState('');
  const [selectedErrorSection, setSelectedErrorSection] = useState<string>('all');
  const [copiedErrorReport, setCopiedErrorReport] = useState(false);

  // Emergency Rollback Snapshot State (Saved in LocalStorage before every import)
  const [emergencyBackup, setEmergencyBackup] = useState<EmergencyBackupState | null>(() => {
    try {
      const saved = localStorage.getItem('accounting_emergency_pre_import_backup');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isEmergencyRollbackModalOpen, setIsEmergencyRollbackModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Handle Download Backup
  const handleDownloadBackup = () => {
    try {
      const backupJson = exportDataJson();
      const backupData = JSON.parse(backupJson);
      const filename = `accounting_backup_${companySettings.crNumber || 'sa'}_${new Date().toISOString().split('T')[0]}.json`;
      downloadBackupAsJson(backupData, filename);
      setImportStatus({
        success: true,
        message: 'تم تصدير وحفظ النسخة الاحتياطية بنجاح بصيغة JSON الآمنة والمطهرة.',
      });
    } catch (err: unknown) {
      setImportStatus({
        success: false,
        message: 'تعذر تصدير النسخة الاحتياطية',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // Handle File Input Change with Strict Validation
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        let parsed: any;
        try {
          parsed = JSON.parse(content);
        } catch {
          setValidationResult({
            isValid: false,
            hasErrors: true,
            hasWarnings: false,
            errors: [
              {
                id: 'json-syntax-err',
                section: 'الملف العام (File Format)',
                path: 'root',
                severity: 'error',
                message: 'الملف المرفوع ليس بصيغة JSON صالحة أو يحتوي على أخطاء بنية برمجية.',
              },
            ],
            warnings: [],
            summary: null,
            sanitizedData: null,
          });
          setIsValidationModalOpen(true);
          return;
        }

        // Run Strict Validation
        const result = validateBackupStrict(parsed);
        setValidationResult(result);

        if (!result.isValid || result.hasErrors) {
          setIsValidationModalOpen(true);
          setImportStatus({
            success: false,
            message: `فشل التحقق من صحة ملف النسخة الاحتياطية: تم اكتشاف ${result.errors.length} خطأ بالبيانات.`,
          });
        } else {
          setPendingImportData(parsed);
          setIsConfirmImportModalOpen(true);
        }
      } catch (err: unknown) {
        setImportStatus({
          success: false,
          message: 'حدث خطأ غير متوقع أثناء فحص الملف',
          details: err instanceof Error ? err.message : String(err),
        });
      }
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  // Confirm Import after Successful Validation
  const handleConfirmImport = () => {
    if (!pendingImportData) return;
    setIsProcessingImport(true);

    try {
      // 1. Create and Save Emergency Pre-Import Snapshot
      const currentBackupJson = exportDataJson();
      const currentBackup = JSON.parse(currentBackupJson);
      const emergencySnapshot: EmergencyBackupState = {
        timestamp: new Date().toISOString(),
        data: currentBackup,
      };
      localStorage.setItem('accounting_emergency_pre_import_backup', JSON.stringify(emergencySnapshot));
      setEmergencyBackup(emergencySnapshot);

      // 2. Perform Safe Restore
      importDataJson(JSON.stringify(pendingImportData));

      setIsConfirmImportModalOpen(false);
      setPendingImportData(null);
      setImportStatus({
        success: true,
        message: 'تم استيراد وتحديث كافة السجلات والبيانات بنجاح! تم حفظ نسخة طوارئ سابقة للرجوع إليها.',
      });
    } catch (err: unknown) {
      setImportStatus({
        success: false,
        message: 'فشلت عملية استيراد وتطبيق البيانات',
        details: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsProcessingImport(false);
    }
  };

  // Rollback to Emergency Backup
  const handleRollbackEmergencyBackup = () => {
    if (!emergencyBackup) return;
    try {
      importDataJson(JSON.stringify(emergencyBackup.data));
      setIsEmergencyRollbackModalOpen(false);
      setImportStatus({
        success: true,
        message: 'تم استرجاع نسخة الطوارئ السابقة واستعادة البيانات كما كانت بنجاح!',
      });
    } catch (err: unknown) {
      setImportStatus({
        success: false,
        message: 'فشلت استعادة نسخة الطوارئ',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // Copy Error Report
  const handleCopyErrorReport = () => {
    if (!validationResult) return;
    const formatted = formatValidationErrorReport(validationResult.errors);
    navigator.clipboard.writeText(formatted);
    setCopiedErrorReport(true);
    setTimeout(() => setCopiedErrorReport(false), 2500);
  };

  return (
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

      {/* DETAILED VALIDATION ERROR REPORT MODAL */}
      {isValidationModalOpen && validationResult && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full shadow-2xl border border-slate-200 text-right space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
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

      {/* CONFIRMATION & BACKUP CONTENT OVERVIEW MODAL */}
      {isConfirmImportModalOpen && validationResult && validationResult.summary && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 text-right space-y-5 animate-in fade-in zoom-in-95">
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

      {/* EMERGENCY ROLLBACK MODAL */}
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
  );
};
