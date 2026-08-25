import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { useLanguage } from '../../context/LanguageContext';
import { ShadiFlexLogo } from '../Branding/ShadiFlexLogo';
import {
  ZatcaPhase2Config,
  INITIAL_ZATCA_PHASE2_CONFIG,
  validateAndSimulateZatcaInvoice,
  generateZatcaPhase2QrDataUrl,
  generateZatcaUbl21Xml,
  generateRealZatcaCsr,
  calculateSha256Hex,
  ZATCA_INITIAL_PIH,
  ZatcaValidationResult,
} from '../../utils/zatcaPhase2';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  QrCode,
  Key,
  RefreshCw,
  Download,
  Copy,
  Check,
  Zap,
  Lock,
  Layers,
  Clock,
  Info,
  Server,
  XCircle,
  Eye,
  Terminal,
} from 'lucide-react';

export const ZatcaPhase2Hub: React.FC = () => {
  const { companySettings, salesInvoices } = useAccounting();
  const { language } = useLanguage();

  const [config, setConfig] = useState<ZatcaPhase2Config>(INITIAL_ZATCA_PHASE2_CONFIG);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(
    salesInvoices.length > 0 ? salesInvoices[0].id : ''
  );
  const [activeTab, setActiveTab] = useState<'overview' | 'validator' | 'onboarding' | 'logs'>('validator');
  const [otpInput, setOtpInput] = useState('123456');
  const [isValidating, setIsValidating] = useState(false);
  const [isOnboardingRunning, setIsOnboardingRunning] = useState(false);
  const [validationResult, setValidationResult] = useState<ZatcaValidationResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [previewQrUrl, setPreviewQrUrl] = useState<string>('');
  const [showXmlModal, setShowXmlModal] = useState(false);
  const [liveLogs, setLiveLogs] = useState<
    Array<{ id: string; timestamp: string; invoiceNo: string; type: string; status: string; validationMode: string; details: string }>
  >([
    {
      id: 'SIM-001',
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toLocaleTimeString('ar-SA'),
      invoiceNo: 'INV-2026-0001',
      type: 'Simplified Tax (B2C)',
      status: 'LOCAL_VALIDATION_PASSED (SIMULATED)',
      validationMode: 'local_simulation',
      details: 'فحص محلي ناجح: بنية 9-Tag TLV والهاش والمجاميع متطابقة',
    },
    {
      id: 'SIM-002',
      timestamp: new Date(Date.now() - 1000 * 60 * 35).toLocaleTimeString('ar-SA'),
      invoiceNo: 'INV-2026-0002',
      type: 'Standard Tax (B2B)',
      status: 'LOCAL_VALIDATION_PASSED (SIMULATED)',
      validationMode: 'local_simulation',
      details: 'فحص محلي ناجح: تدقيق الرقم الضريبي 15 رقماً وبنية UBL 2.1',
    },
  ]);

  const selectedInvoice = salesInvoices.find((i) => i.id === selectedInvoiceId) || salesInvoices[0];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRunValidation = async () => {
    if (!selectedInvoice) return;
    setIsValidating(true);

    try {
      // 1. Run Local Validation & Simulation Engine (No live submission to FATOORA)
      const result = await validateAndSimulateZatcaInvoice(
        selectedInvoice,
        companySettings,
        config,
        ZATCA_INITIAL_PIH,
        1
      );
      setValidationResult(result);

      // 2. Generate Local Simulation QR Code
      const qrUrl = await generateZatcaPhase2QrDataUrl({
        sellerName: companySettings.nameAr,
        vatNumber: companySettings.vatNumber,
        timestamp: `${selectedInvoice.issueDate}T${selectedInvoice.issueTime || '12:00:00'}Z`,
        totalAmount: selectedInvoice.totalAmount,
        vatAmount: selectedInvoice.vatTotal,
        invoiceHash: result.hash,
      });
      setPreviewQrUrl(qrUrl);

      // 3. Append to Local Simulation Logs
      const isB2B = selectedInvoice.type === 'tax_invoice';
      const newLog = {
        id: `SIM-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toLocaleTimeString('ar-SA'),
        invoiceNo: selectedInvoice.invoiceNumber,
        type: isB2B ? 'Standard B2B' : 'Simplified B2C',
        status: `${result.status} (SIMULATED)`,
        validationMode: 'local_simulation',
        details: isB2B ? 'فحص محلي لضوابط الفاتورة القياسية B2B' : 'فحص محلي لضوابط الفاتورة المبسطة B2C',
      };
      setLiveLogs((prev) => [newLog, ...prev]);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleGenerateCsr = async () => {
    const keys = await generateRealZatcaCsr(companySettings, config);
    setConfig((prev) => ({
      ...prev,
      csrPem: keys.csrPem,
      privateKeyPem: keys.privateKeyPem,
      publicKeyPem: keys.publicKeyPem,
      onboardingStatus: 'csr_ready',
    }));
  };

  const handleRunSimulationWizard = async () => {
    setIsOnboardingRunning(true);
    try {
      // Step 1: CSR & Key simulation
      await handleGenerateCsr();
      await new Promise((r) => setTimeout(r, 400));

      // Step 2: Educational Simulation Step
      setConfig((prev) => ({
        ...prev,
        ccsidSecret: 'demo_simulation_secret',
        ccsidToken: `demo_simulation_ccsid_${otpInput}`,
        complianceChecks: {
          standardInvoice: true,
          simplifiedInvoice: true,
          debitNote: true,
          creditNote: true,
        },
        onboardingStatus: 'simulation_ready',
        lastSyncDate: new Date().toISOString(),
      }));
    } finally {
      setIsOnboardingRunning(false);
    }
  };

  const currentXml = selectedInvoice ? generateZatcaUbl21Xml(selectedInvoice, companySettings) : '';

  const handleDownloadXml = () => {
    if (!currentXml) return;
    const blob = new Blob([currentXml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SIMULATED-UBL21-${selectedInvoice?.invoiceNumber || 'INV'}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsr = () => {
    if (!config.csrPem) return;
    const blob = new Blob([config.csrPem], { type: 'application/x-pem-file;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zatca-demo-csr-${config.serialNumber}.csr`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* MANDATORY PERSISTENT DISCLAIMER BANNER */}
      <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-amber-950 shadow-xs">
        <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs sm:text-sm">
          <p className="font-bold text-amber-900 leading-snug">
            {language === 'ar'
              ? 'تنبيه نظامي: لم يتم إرسال هذه الفاتورة إلى منصة فاتورة، وهذه النتيجة فحص محلي فقط ولا تمثل اعتمادًا رسميًا من هيئة الزكاة والضريبة والجمارك.'
              : 'Regulatory Notice: This invoice was not submitted to the FATOORA platform. This result is a local check only and does not represent official accreditation from the Zakat, Tax and Customs Authority (ZATCA).'}
          </p>
          <p className="text-amber-800 text-[11px] sm:text-xs">
            {language === 'ar'
              ? 'يُستخدم هذا المركز كفاحص حسابي وهيكلي ومحاكي محلي لمعايير UBL 2.1 XML وسلاسل الهاش والتشفير TLV دون اتصال حي بخوادم الإنتاج الحكومية.'
              : 'This hub functions as an offline structural, arithmetic, and TLV simulator for UBL 2.1 XML compliance without live government server submission.'}
          </p>
        </div>
      </div>

      {/* Top Hub Card */}
      <div className="bg-slate-900 rounded-2xl p-5 sm:p-7 text-white shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15">
                <ShadiFlexLogo size="sm" variant="white" />
              </div>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                {language === 'ar' ? 'الفحص المحلي والمحاكاة (Local Simulation)' : 'Local Validation & Simulation'}
              </span>
              <span className="bg-slate-800 text-slate-300 border border-slate-700 text-xs px-3 py-1 rounded-full font-mono">
                officialZatcaSubmission: false
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <ShieldCheck className="w-7 h-7 text-emerald-400" />
              {language === 'ar'
                ? 'مركز الفحص المحلي والمحاكاة لاشتراطات هيئة الزكاة (ZATCA)'
                : 'ZATCA Local Validation & Simulation Hub'}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {language === 'ar'
                ? 'محرك فحص محلي لقواعد الفوترة الإلكترونية: التحقق من صحة الرقم الضريبي (15 رقماً)، تدقيق مجاميع البنود وضريبة 15%، بنية ملفات UBL 2.1 XML، محاكاة سلاسل الهاش (PIH)، وتوليد رمز QR تجريبي محلي.'
                : 'Local validation engine for e-invoicing business rules: 15-digit VAT verification, 15% arithmetic consistency, UBL 2.1 XML schema compliance, and local demo QR generation.'}
            </p>
          </div>

          {/* Quick Status Pill */}
          <div className="bg-slate-800/90 backdrop-blur-md border border-slate-700 rounded-xl p-4 shrink-0 space-y-2 min-w-64">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{language === 'ar' ? 'وضع التشغيل:' : 'Mode:'}</span>
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                {language === 'ar' ? 'محاكاة وفحص محلي' : 'Local Simulation'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{language === 'ar' ? 'الإرسال الرسمي لهيئة الزكاة:' : 'Official Submission:'}</span>
              <span className="bg-rose-500/20 text-rose-300 font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                FALSE (غير متصل)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{language === 'ar' ? 'حالة المعالج:' : 'Simulation Status:'}</span>
              <span className="text-emerald-400 font-mono text-[11px] font-bold">
                SIMULATION_READY
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('validator')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
            activeTab === 'validator'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          {language === 'ar' ? 'الفحص المحلي والمحاكاة (Validator)' : 'Local Validation & Simulation'}
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          {language === 'ar' ? 'قواعد ومعايير الفحص' : 'Validation Rules'}
        </button>

        <button
          onClick={() => setActiveTab('onboarding')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
            activeTab === 'onboarding'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Key className="w-4 h-4" />
          {language === 'ar' ? 'معالج التهيئة (محاكاة تعليمية)' : 'Onboarding Simulation'}
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
            activeTab === 'logs'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          {language === 'ar' ? 'سجل المحاكاة المحلية' : 'Simulation Logs'}
        </button>
      </div>

      {/* TAB 1: LOCAL VALIDATOR & SIMULATION (Default) */}
      {activeTab === 'validator' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-600" />
                  {language === 'ar' ? 'تشغيل الفحص المحلي والمحاكاة للفواتير' : 'Run Local Invoice Validation & Simulation'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {language === 'ar'
                    ? 'اختر فاتورة لإجراء الفحص المحلي لقواعد الأعمال وتوليد الهاش المحلي وبنية UBL XML ورمز الاستجابة التجريبي.'
                    : 'Select an invoice to run local structural checks, SHA-256 hash generation, and demo TLV QR creation.'}
                </p>
              </div>

              {/* Invoice Selector */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 w-full sm:w-64"
                >
                  {salesInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {inv.customerName} ({inv.totalAmount.toFixed(2)} ر.س)
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleRunValidation}
                  disabled={isValidating}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition shadow-xs shrink-0 disabled:opacity-50"
                >
                  {isValidating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {language === 'ar' ? 'تشغيل الفحص المحلي والمحاكاة' : 'Run Local Simulation'}
                </button>
              </div>
            </div>

            {/* Validation Results Display */}
            {validationResult ? (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                {/* Notice inside validation result */}
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">
                      {language === 'ar'
                        ? 'ملاحظة الفحص المحلي:'
                        : 'Local Check Disclaimer:'}
                    </span>
                    <span>
                      {validationResult.disclaimerAr}
                    </span>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    validationResult.status === 'LOCAL_VALIDATION_PASSED'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : validationResult.status === 'LOCAL_VALIDATION_WARNING'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {validationResult.status === 'LOCAL_VALIDATION_PASSED' ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                    ) : validationResult.status === 'LOCAL_VALIDATION_WARNING' ? (
                      <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm">
                          {validationResult.status === 'LOCAL_VALIDATION_PASSED'
                            ? language === 'ar'
                              ? 'اجتازت الفاتورة الفحص المحلي بنجاح (LOCAL_VALIDATION_PASSED)'
                              : 'Invoice Passed Local Validation (LOCAL_VALIDATION_PASSED)'
                            : validationResult.status === 'LOCAL_VALIDATION_WARNING'
                            ? language === 'ar'
                              ? 'اجتازت الفاتورة الفحص مع تنبيهات (LOCAL_VALIDATION_WARNING)'
                              : 'Local Validation Warning (LOCAL_VALIDATION_WARNING)'
                            : language === 'ar'
                            ? 'فشل الفحص المحلي (LOCAL_VALIDATION_FAILED)'
                            : 'Local Validation Failed (LOCAL_VALIDATION_FAILED)'}
                        </h4>
                        <span className="bg-slate-200 text-slate-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                          SIMULATED
                        </span>
                      </div>

                      <p className="text-xs opacity-80 mt-1">
                        {language === 'ar' ? 'ختم المحاكاة المحلي:' : 'Local Simulation Stamp:'}{' '}
                        <span className="font-mono">{validationResult.cryptographicStamp}</span>
                      </p>
                      <p className="text-[11px] opacity-75 font-mono break-all mt-0.5">
                        SHA-256 Hex: {validationResult.sha256Hex}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() => setShowXmlModal(true)}
                      className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 flex items-center gap-1 shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {language === 'ar' ? 'عرض XML' : 'View XML'}
                    </button>
                    <button
                      onClick={handleDownloadXml}
                      className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 flex items-center gap-1 shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {language === 'ar' ? 'تنزيل UBL XML' : 'Download XML'}
                    </button>
                    <span className="bg-slate-800 text-white font-bold px-3 py-1 rounded-full text-xs shadow-xs font-mono">
                      {validationResult.status}
                    </span>
                  </div>
                </div>

                {/* Grid with QR Code & Checks */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* QR Code Preview */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-2 flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-slate-700">
                      {language === 'ar' ? 'رمز QR تجريبي محلي (Simulation QR)' : 'Demo Simulation QR Code'}
                    </span>
                    {previewQrUrl ? (
                      <img src={previewQrUrl} alt="Demo Simulation QR" className="w-36 h-36 rounded-lg border border-slate-200 bg-white p-1" />
                    ) : (
                      <div className="w-36 h-36 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                        QR Preview
                      </div>
                    )}
                    <span className="text-[10px] text-slate-500 font-mono">
                      {language === 'ar' ? 'ترميز محلي TLV تجريبي' : 'Local Demo TLV Encoding'}
                    </span>
                    <p className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200 leading-tight">
                      {language === 'ar'
                        ? 'ملاحظة: الهاش ورمز الاستجابة (QR) تم توليدهما محلياً لأغراض المحاكاة والتطوير فقط، ولم يتم توقيعهما أو اعتمادهما من هيئة الزكاة والضريبة والجمارك.'
                        : 'Note: Hash and QR code are generated locally for simulation only and are not signed by ZATCA.'}
                    </p>
                  </div>

                  {/* Passed Checks List */}
                  <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">
                      {language === 'ar' ? 'نتائج الفحص والتحقق المحلي (Local Business Rules):' : 'Local Business Rules Results:'}
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {validationResult.passedChecks.map((check, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{check}</span>
                        </li>
                      ))}
                      {validationResult.warnings.map((warn, idx) => (
                        <li key={`warn-${idx}`} className="flex items-start gap-2 text-amber-800">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>{warn}</span>
                        </li>
                      ))}
                      {validationResult.errors.map((err, idx) => (
                        <li key={`err-${idx}`} className="flex items-start gap-2 text-rose-800">
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <span>{err}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <ShieldCheck className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  {language === 'ar'
                    ? 'اضغط على زر "تشغيل الفحص المحلي والمحاكاة" للتحقق من سلامة الأرقام الضريبية، المجاميع، وبنية UBL XML محلياً.'
                    : 'Click "Run Local Simulation" to verify VAT numbers, math calculations, and XML schema locally.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: OVERVIEW & COMPLIANCE RULES */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {language === 'ar' ? 'فحص الرقم الضريبي (15 خانة)' : '15-Digit VAT Validation'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {language === 'ar'
                  ? 'التحقق من أن الرقم الضريبي للمنشأة والمشتري مكون من 15 خانة ويبدأ وينتهي بالرقم 3.'
                  : 'Validates that seller and buyer VAT numbers consist of 15 digits starting and ending with 3.'}
              </p>
              <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg inline-block">
                BR-KSA-01
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {language === 'ar' ? 'محاكي ترميز QR (9-Tags TLV)' : '9-Tag TLV QR Simulator'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {language === 'ar'
                  ? 'ترميز محلي لـ 9 وسوم تشمل اسم البائع، الرقم الضريبي، التاريخ، الضريبة، ومحاكاة التوقيع والهاش.'
                  : 'Simulates the 9-Tag TLV Base64 format structure for development and testing.'}
              </p>
              <div className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg inline-block">
                {language === 'ar' ? 'محاكاة محلية' : 'Local Simulation'}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {language === 'ar' ? 'سلاسل الهاش (PIH Chaining)' : 'PIH Hash Chaining'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {language === 'ar'
                  ? 'حساب هاش SHA-256 للفاتورة وربطه بالهاش السابق لمحاكاة تسلسل الفواتير غير القابل للتعديل.'
                  : 'Calculates local SHA-256 XML hash and chains with previous invoice hash.'}
              </p>
              <div className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg inline-block">
                BR-KSA-05
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <FileCode className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {language === 'ar' ? 'توليد UBL 2.1 XML' : 'UBL 2.1 XML Generator'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {language === 'ar'
                  ? 'توليد هيكل XML متوافق مع قاموس المعايير القياسي واشتراطات تصنيف الفواتير الضريبية والمبسطة.'
                  : 'Generates OASIS standard UBL 2.1 XML document structure for tax and simplified invoices.'}
              </p>
              <div className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg inline-block">
                BR-KSA-08
              </div>
            </div>
          </div>

          {/* Unit & Device Parameters Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-600" />
              {language === 'ar' ? 'بيانات وحدة المحاكاة (Simulation Environment Specs)' : 'Simulation Environment Specs'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 block font-medium">اسم الحل والبرنامج</span>
                <span className="font-bold text-slate-800 text-sm font-mono">{config.solutionName}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 block font-medium">المعرف الفريد للجهاز (EGS UUID)</span>
                <span className="font-bold text-slate-800 text-xs font-mono break-all">{config.egsUuid}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 block font-medium">الرقم التسلسلي للجهاز (Serial Number)</span>
                <span className="font-bold text-slate-800 text-xs font-mono">{config.serialNumber}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 block font-medium">الفرع والوحدة التنظيمية</span>
                <span className="font-bold text-slate-800 text-xs">{config.organizationUnit}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 block font-medium">الرقم الضريبي للمنشأة</span>
                <span className="font-bold text-emerald-700 text-sm font-mono">{companySettings.vatNumber}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 block font-medium">الوضع الحالي</span>
                <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[11px] inline-block font-mono">
                  LOCAL_SIMULATION
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ONBOARDING SIMULATION (Educational Only) */}
      {activeTab === 'onboarding' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-600" />
                {language === 'ar' ? 'معالج التهيئة التجريبي والتعليمي (Educational Onboarding Simulation)' : 'Educational Onboarding Simulation'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar'
                  ? 'محاكاة لخطوات استخراج الشهادات والمفاتيح المشفرة CSR بصيغة تجريبية لأغراض التدريب والتطوير فقط.'
                  : 'Simulates key generation and CSR creation for educational and development purposes only.'}
              </p>
            </div>

            {/* Warning that real production connection requires dedicated backend integration */}
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-900 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-rose-950">
                  {language === 'ar' ? 'تنبيه الربط الإنتاجي الفعلي (Production Integration Notice):' : 'Production Integration Notice:'}
                </h4>
                <p className="mt-1 leading-relaxed text-rose-800">
                  {language === 'ar'
                    ? 'يتطلب تفعيل الربط الإنتاجي الفعلي توفير واجهات برمجة وتصاريح رسمية من هيئة الزكاة والضريبة والجمارك (ZATCA Production API) عبر خادم خلفي معتمد وشهادة رقمية فعلية مستخرجة من بوابة فاتورة. هذا المعالج مخصص للمحاكاة المحلية فقط.'
                    : 'Real production integration requires official ZATCA API credentials, a compliant backend server, and certified PCSID issued by FATOORA portal. This wizard is for local simulation only.'}
                </p>
              </div>
            </div>

            {/* Steps Timeline */}
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      {language === 'ar' ? 'توليد نموذج مفاتيح وطلب شهادة تجريبي (Demo CSR & Keypair)' : 'Generate Demo Keypair & CSR'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {language === 'ar'
                        ? 'إنشاء نموذج طلب توقيع رقمي (CSR تجريبي) ومفاتيح تشفير محلية.'
                        : 'Generates local demo EC keypair and demonstration CSR PEM.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {config.csrPem && (
                    <button
                      onClick={handleDownloadCsr}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 border border-emerald-200 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {language === 'ar' ? 'تنزيل CSR تجريبي' : 'Download Demo CSR'}
                    </button>
                  )}
                  <button
                    onClick={handleGenerateCsr}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition"
                  >
                    {language === 'ar' ? 'توليد CSR تجريبي' : 'Generate Demo CSR'}
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      {language === 'ar' ? 'حقل رمز OTP (محاكاة شكلية)' : 'OTP Input (Simulation)'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {language === 'ar'
                        ? 'في بيئة الربط الفعلي يتم إدخال الرمز المستخرج من بوابة فاتورة.'
                        : 'In production mode, this represents the 6-digit OTP from FATOORA portal.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="123456"
                    className="w-28 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-center font-mono font-bold text-slate-900 text-sm"
                  />
                </div>
              </div>

              {/* Step 3: Run Simulation Wizard */}
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      {language === 'ar' ? 'محاكاة اختبارات الامتثال (Simulation Only)' : 'Run Simulation Test'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {language === 'ar'
                        ? 'تهيئة الإعدادات التجريبية لمحاكاة إصدار الفواتير محلياً.'
                        : 'Prepares local simulation state for testing invoice generation.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={isOnboardingRunning}
                    onClick={handleRunSimulationWizard}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition disabled:opacity-50 shrink-0"
                  >
                    {isOnboardingRunning ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    {language === 'ar' ? 'تشغيل المحاكاة' : 'Run Simulation'}
                  </button>

                  <button
                    disabled={true}
                    className="bg-slate-200 text-slate-400 cursor-not-allowed text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 border border-slate-300 shrink-0"
                    title={language === 'ar' ? 'يتطلب ربط ZATCA الحقيقي عبر خادم API معتمد' : 'Requires Real ZATCA API Integration'}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {language === 'ar' ? 'الربط المباشر (يتطلب API رسمي)' : 'Live API (Disabled)'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SIMULATION LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              {language === 'ar' ? 'سجل المحاكاة والفحص المحلي (Local Simulation Logs)' : 'Local Simulation Logs'}
            </h3>
            <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">
              validationMode: local_simulation
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-hidden border border-slate-200 rounded-xl">
            {liveLogs.map((log) => (
              <div key={log.id} className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs hover:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="font-mono font-bold text-slate-800">{log.invoiceNo}</span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-600 font-medium">{log.type}</span>
                  <span className="text-slate-400 hidden sm:inline">|</span>
                  <span className="text-slate-500 text-[11px] hidden sm:inline">{log.details}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                    {log.status}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* XML Viewer Modal */}
      {showXmlModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {language === 'ar' ? 'معاينة ملف UBL 2.1 XML التجريبي' : 'Simulated UBL 2.1 XML Preview'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(currentXml, 'xml_modal')}
                  className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1"
                >
                  {copiedKey === 'xml_modal' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'xml_modal' ? (language === 'ar' ? 'تم النسخ' : 'Copied') : (language === 'ar' ? 'نسخ' : 'Copy')}
                </button>
                <button
                  onClick={handleDownloadXml}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  {language === 'ar' ? 'تنزيل' : 'Download'}
                </button>
                <button
                  onClick={() => setShowXmlModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-auto bg-slate-950 text-emerald-400 font-mono text-xs leading-relaxed flex-1">
              <pre className="whitespace-pre-wrap select-all">{currentXml}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
