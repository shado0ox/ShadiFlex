import React, { useState, useEffect, useMemo } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import {
  SimpleExpenseCategory,
  SimpleExpenseInvoice,
  PaymentMethod,
} from '../../types/accounting';
import { formatSAR, tafqeetArabic } from '../../utils/currency';
import {
  X,
  Plus,
  Zap,
  Droplet,
  Wifi,
  Fuel,
  Wrench,
  FileText,
  Coffee,
  Building2,
  Cloud,
  Layers,
  Upload,
  Eye,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';

interface SimpleExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdExpense: SimpleExpenseInvoice) => void;
}

interface CategoryOption {
  id: SimpleExpenseCategory;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  color: string;
  defaultAccountCode: string;
  quickVendors: string[];
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: 'electricity',
    label: 'فاتورة كهرباء وطاقة',
    sublabel: 'الشركة السعودية للكهرباء، محطات الطاقة',
    icon: Zap,
    color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    defaultAccountCode: '520301',
    quickVendors: ['الشركة السعودية للكهرباء (SEC)', 'محطة توليد كهرباء'],
  },
  {
    id: 'water',
    label: 'فاتورة مياه وخدمات',
    sublabel: 'شركة المياه الوطنية، صهاريج مياه',
    icon: Droplet,
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100',
    defaultAccountCode: '520302',
    quickVendors: ['شركة المياه الوطنية (NWC)', 'مؤسسة إمداد المياه الصالحة'],
  },
  {
    id: 'internet_telecom',
    label: 'إنترنت وهاتف واتصالات',
    sublabel: 'STC، موبايلي، زين، سلام، فايبر أعمال',
    icon: Wifi,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    defaultAccountCode: '520303',
    quickVendors: ['شركة الاتصالات السعودية (stc)', 'شركة اتحاد اتصالات (Mobily)', 'شركة زين السعودية (Zain)', 'شركة سلام للاتصالات'],
  },
  {
    id: 'fuel_petrol',
    label: 'وقود وبنزين ومحروقات',
    sublabel: 'الدريس، ساسكو، نفط، بترومين، مواقف',
    icon: Fuel,
    color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    defaultAccountCode: '5206',
    quickVendors: ['شركة الدريس للخدمات البترولية', 'الشركة السعودية لخدمات السيارات (ساسكو)', 'شركة نفط للخدمات', 'شركة بترومين للزيوت والوقود'],
  },
  {
    id: 'maintenance_repair',
    label: 'صيانة وإصلاح ونظافة',
    sublabel: 'تكييف، كهرباء، سباكة، نظافة، قطع غيار',
    icon: Wrench,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    defaultAccountCode: '5207',
    quickVendors: ['مؤسسة إتقان التكييف والصيانة', 'شركة درع النظافة للمرافق', 'ورشة السلام الميكانيكية'],
  },
  {
    id: 'office_stationery',
    label: 'أدوات مكتبية وقرطاسية',
    sublabel: 'مكتبة جرير، العبيكان، ورق، أحبار، مطبوعات',
    icon: FileText,
    color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    defaultAccountCode: '5208',
    quickVendors: ['شركة مكتبة جرير', 'مكتبة العبيكان', 'مؤسسة الفاخر للمطبوعات والأوراق'],
  },
  {
    id: 'hospitality_pantry',
    label: 'ضيافة وبوفيه ونثريات',
    sublabel: 'شاي، قهوة، تمور، مياه شرب، وجبات عمل',
    icon: Coffee,
    color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
    defaultAccountCode: '5209',
    quickVendors: ['أسواق العثيم للتموين', 'أسواق بنده والضيافة', 'مؤسسة نجد للتمور والقهوة'],
  },
  {
    id: 'software_tech',
    label: 'اشتراكات برمجيات وسحابة',
    sublabel: 'جوجل وورك سبيس، مايكروسوفت، استضافة',
    icon: Cloud,
    color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    defaultAccountCode: '5210',
    quickVendors: ['Google Cloud & Workspace', 'Microsoft 365', 'Amazon Web Services (AWS)', 'منصة سلة / زد'],
  },
  {
    id: 'government_fees',
    label: 'رسوم وتراخيص حكومية',
    sublabel: 'بلدي، تأمينات GOSI، غرفة تجارية، مقيم',
    icon: Building2,
    color: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',
    defaultAccountCode: '5204',
    quickVendors: ['المؤسسة العامة للتأمينات الاجتماعية (GOSI)', 'منصة بلدي - وزارة الشؤون البلدية', 'الغرفة التجارية بالرياض'],
  },
  {
    id: 'other',
    label: 'مصروفات ونثريات أخرى',
    sublabel: 'مصروفات تشغيلية عامة غير مصنفة',
    icon: Layers,
    color: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
    defaultAccountCode: '52',
    quickVendors: ['مورد خدمات متنوعة', 'مصروف نثريات عام'],
  },
];

export const SimpleExpenseFormModal: React.FC<SimpleExpenseFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { accounts, createSimpleExpense } = useAccounting();

  const [category, setCategory] = useState<SimpleExpenseCategory>('electricity');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [vendorName, setVendorName] = useState('');
  const [vendorVatNumber, setVendorVatNumber] = useState('');
  const [vendorInvoiceRef, setVendorInvoiceRef] = useState('');

  // Selected accounts
  const [selectedExpenseAccountId, setSelectedExpenseAccountId] = useState('');
  const [amountInputMode, setAmountInputMode] = useState<'base' | 'gross'>('base');
  const [amountValue, setAmountValue] = useState<number | ''>(100);
  const [vatRate, setVatRate] = useState<number>(0.15); // 15% standard VAT

  // Payment Method & Source
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | 'petty_cash'>('cash');
  const [selectedPaidAccountId, setSelectedPaidAccountId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [notes, setNotes] = useState('');

  // Attachment
  const [attachmentName, setAttachmentName] = useState<string | undefined>();
  const [attachmentDataUrl, setAttachmentDataUrl] = useState<string | undefined>();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter available expense accounts (Class 5)
  const expenseAccounts = useMemo(() => {
    return accounts.filter((a) => a.type === 'expense' && a.isTransactional);
  }, [accounts]);

  // Filter available payment accounts (Class 1 Cash & Bank Assets)
  const paymentAccounts = useMemo(() => {
    return accounts.filter(
      (a) =>
        a.type === 'asset' &&
        a.isTransactional &&
        (a.code.startsWith('1101') || a.code.startsWith('1105'))
    );
  }, [accounts]);

  // Set default accounts based on category selection
  useEffect(() => {
    const catConfig = CATEGORY_OPTIONS.find((c) => c.id === category);
    if (catConfig) {
      const matchAcc = expenseAccounts.find((a) => a.code === catConfig.defaultAccountCode) ||
        expenseAccounts.find((a) => a.code.startsWith(catConfig.defaultAccountCode.substring(0, 3))) ||
        expenseAccounts[0];

      if (matchAcc) {
        setSelectedExpenseAccountId(matchAcc.id);
      }
      if (!title || CATEGORY_OPTIONS.some((c) => title.startsWith(`فاتورة ${c.label}`))) {
        setTitle(`فاتورة ${catConfig.label}`);
      }
    }
  }, [category, expenseAccounts]);

  // Set default payment account
  useEffect(() => {
    if (!selectedPaidAccountId && paymentAccounts.length > 0) {
      if (paymentMethod === 'cash') {
        const cashAcc = paymentAccounts.find((a) => a.code === '110101') || paymentAccounts[0];
        setSelectedPaidAccountId(cashAcc.id);
      } else if (paymentMethod === 'bank_transfer') {
        const bankAcc = paymentAccounts.find((a) => a.code === '110102') || paymentAccounts[0];
        setSelectedPaidAccountId(bankAcc.id);
      } else if (paymentMethod === 'pos_card' || paymentMethod === 'mada') {
        const posAcc = paymentAccounts.find((a) => a.code === '110104') || paymentAccounts[0];
        setSelectedPaidAccountId(posAcc.id);
      } else if (paymentMethod === 'petty_cash') {
        const pettyAcc = paymentAccounts.find((a) => a.code === '110101' || a.code === '1105') || paymentAccounts[0];
        setSelectedPaidAccountId(pettyAcc.id);
      }
    }
  }, [paymentMethod, paymentAccounts, selectedPaidAccountId]);

  // Calculate Base & VAT
  const { amountBeforeVat, calculatedVat, calculatedTotal } = useMemo(() => {
    const rawVal = typeof amountValue === 'number' ? amountValue : 0;
    if (rawVal <= 0) return { amountBeforeVat: 0, calculatedVat: 0, calculatedTotal: 0 };

    if (vatRate === 0 || vatRate === -1) {
      return {
        amountBeforeVat: rawVal,
        calculatedVat: 0,
        calculatedTotal: rawVal,
      };
    }

    if (amountInputMode === 'base') {
      const vat = Number((rawVal * vatRate).toFixed(2));
      const total = Number((rawVal + vat).toFixed(2));
      return { amountBeforeVat: rawVal, calculatedVat: vat, calculatedTotal: total };
    } else {
      // Gross mode: Extract base and 15% VAT
      const base = Number((rawVal / (1 + vatRate)).toFixed(2));
      const vat = Number((rawVal - base).toFixed(2));
      return { amountBeforeVat: base, calculatedVat: vat, calculatedTotal: rawVal };
    }
  }, [amountValue, amountInputMode, vatRate]);

  const selectedExpenseAccount = accounts.find((a) => a.id === selectedExpenseAccountId);
  const selectedPaidAccount = accounts.find((a) => a.id === selectedPaidAccountId);
  const currentCatConfig = CATEGORY_OPTIONS.find((c) => c.id === category);

  // File Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setAttachmentDataUrl(uploadEvent.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('يرجى كتابة عنوان أو وصف الفاتورة');
      return;
    }
    if (!vendorName.trim()) {
      setErrorMsg('يرجى كتابة اسم المورد أو الجهة المصدرة للفاتورة');
      return;
    }
    if (!selectedExpenseAccount) {
      setErrorMsg('يرجى تحديد الحساب المحاسبي للمصروف');
      return;
    }
    if (!selectedPaidAccount) {
      setErrorMsg('يرجى تحديد حساب السداد / مصدر الدفع');
      return;
    }
    if (calculatedTotal <= 0) {
      setErrorMsg('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createSimpleExpense({
        category,
        title: title.trim(),
        date,
        vendorName: vendorName.trim(),
        vendorVatNumber: vendorVatNumber.trim() || undefined,
        vendorInvoiceRef: vendorInvoiceRef.trim() || undefined,
        expenseAccountId: selectedExpenseAccount.id,
        expenseAccountCode: selectedExpenseAccount.code,
        expenseAccountNameAr: selectedExpenseAccount.nameAr,
        amountBeforeVat,
        vatRate,
        vatAmount: calculatedVat,
        totalAmount: calculatedTotal,
        paymentMethod,
        paidThroughAccountId: selectedPaidAccount.id,
        paidThroughAccountCode: selectedPaidAccount.code,
        paidThroughAccountNameAr: selectedPaidAccount.nameAr,
        employeeName: employeeName.trim() || undefined,
        notes: notes.trim() || undefined,
        attachmentName,
        attachmentDataUrl,
        status: 'paid',
      });

      if (onSuccess) {
        onSuccess(created);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ فاتورة المصروف');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-l from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">تسجيل فاتورة مشتريات ومصروفات تشغيلية بسيطة</h2>
              <p className="text-xs text-slate-300">
                تسجيل فواتير الكهرباء، الاتصالات، الوقود، الصيانة، القرطاسية مع القيد المحاسبي واحتساب ضريبة المدخلات 15% تلقائياً
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-sm">
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Category Quick Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">
              اختر نوع وتصنيف المصروف التشغيلي:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {CATEGORY_OPTIONS.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategory(cat.id);
                      if (cat.quickVendors.length > 0 && !vendorName) {
                        setVendorName(cat.quickVendors[0]);
                      }
                    }}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20 text-indigo-900 font-bold shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && <CheckCircle className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-snug">{cat.label}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{cat.sublabel}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Main Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                بيان الفاتورة / الوصف التفصيلي <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: فاتورة استهلاك كهرباء المقر الرئيسي - شهر أغسطس"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                required
              />
            </div>

            {/* Vendor Name & Quick Suggestions */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  اسم المورد / الشركة المصدرة <span className="text-rose-500">*</span>
                </label>
              </div>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="مثال: الشركة السعودية للكهرباء، STC، محطة الدريس..."
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                required
              />
              {currentCatConfig && currentCatConfig.quickVendors.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <span className="text-[11px] text-slate-400 self-center">مقترحات:</span>
                  {currentCatConfig.quickVendors.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVendorName(v)}
                      className="text-[11px] px-2 py-0.5 bg-white border border-slate-200 rounded-md text-slate-600 hover:text-indigo-600 hover:border-indigo-300"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ الفاتورة <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                required
              />
            </div>

            {/* Vendor VAT Number (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الرقم الضريبي للمورد (إن وجد - 15 رقم ZATCA)
              </label>
              <input
                type="text"
                value={vendorVatNumber}
                onChange={(e) => setVendorVatNumber(e.target.value)}
                placeholder="300000000000003"
                maxLength={15}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Vendor Invoice Ref Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم فاتورة المورد / المرجع
              </label>
              <input
                type="text"
                value={vendorInvoiceRef}
                onChange={(e) => setVendorInvoiceRef(e.target.value)}
                placeholder="مثال: SEC-982310 أو INV-4412"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* 3. Amounts & Tax Calculation Card */}
          <div className="bg-gradient-to-br from-indigo-50/50 via-slate-50 to-white p-4.5 rounded-xl border border-indigo-100 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-600" />
                المبالغ وضريبة القيمة المضافة (ZATCA 15%):
              </span>

              {/* Mode switch */}
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setAmountInputMode('base')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    amountInputMode === 'base' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  إدخال المبلغ قبل الضريبة
                </button>
                <button
                  type="button"
                  onClick={() => setAmountInputMode('gross')}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    amountInputMode === 'gross' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  إدخال الإجمالي (شامل الضريبة)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Input Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {amountInputMode === 'base' ? 'المبلغ الخاضع للضريبة (قبل الضريبة)' : 'المبلغ الإجمالي المدفوع'} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amountValue}
                    onChange={(e) => setAmountValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 text-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pl-12"
                    required
                  />
                  <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">ر.س</span>
                </div>
              </div>

              {/* VAT Rate */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نسبة ضريبة القيمة المضافة
                </label>
                <select
                  value={vatRate}
                  onChange={(e) => setVatRate(parseFloat(e.target.value))}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value={0.15}>خاضع للضريبة بالنسبة الأساسية (15%)</option>
                  <option value={0}>نسبة صفرية (0%)</option>
                  <option value={-1}>معفى / غير خاضع للضريبة (0%)</option>
                </select>
              </div>

              {/* Calculated Summary Box */}
              <div className="bg-white p-3 rounded-lg border border-indigo-100 flex flex-col justify-center space-y-1">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>الأساس الخاضع:</span>
                  <span className="font-semibold text-slate-900">{formatSAR(amountBeforeVat)}</span>
                </div>
                <div className="flex justify-between text-xs text-indigo-700">
                  <span>الضريبة المستردة (15%):</span>
                  <span className="font-bold text-indigo-600">+{formatSAR(calculatedVat)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-100">
                  <span>الإجمالي النهائي:</span>
                  <span className="text-indigo-900">{formatSAR(calculatedTotal)}</span>
                </div>
              </div>
            </div>

            {calculatedTotal > 0 && (
              <div className="text-xs text-slate-600 bg-white/80 px-3 py-1.5 rounded-md border border-slate-100">
                <span className="font-bold text-slate-700">المبلغ كتابةً: </span>
                <span>{tafqeetArabic(calculatedTotal)}</span>
              </div>
            )}
          </div>

          {/* 4. Accounting Accounts Mapping */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Expense Account */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                حساب المصروف في شجرة الحسابات <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedExpenseAccountId}
                onChange={(e) => setSelectedExpenseAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                {expenseAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.nameAr}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method & Payment Source */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                طريقة وسيلة السداد <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  const val = e.target.value as PaymentMethod | 'petty_cash';
                  setPaymentMethod(val);
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="cash">نقداً (كاش من الصندوق الرئيسي)</option>
                <option value="pos_card">بطاقة مدى / نقاط بيع POS</option>
                <option value="bank_transfer">تحويل بنكي مباشر (مصرف الراجحي)</option>
                <option value="petty_cash">عهدة موظف نقدية (Petty Cash Custody)</option>
              </select>
            </div>

            {/* Source Account */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                حساب السداد / جهة الدفع <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedPaidAccountId}
                onChange={(e) => setSelectedPaidAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                {paymentAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.nameAr}
                  </option>
                ))}
              </select>
            </div>

            {/* Employee Name (Custody) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الموظف المسؤول / صاحب العهدة (اختياري)
              </label>
              <input
                type="text"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="مثال: سعود المحاسب / فهد المطيري"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* 5. File Attachment & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                إرفاق صورة الفاتورة / السند المرفوع (اختياري)
              </label>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      {attachmentName ? attachmentName : 'اسحب الملف هنا أو انقر للاختيار'}
                    </div>
                    <div className="text-[11px] text-slate-500">صور أو مستندات PDF (حتى 5MB)</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-3 py-1.5 bg-white border border-slate-300 hover:border-indigo-500 rounded-lg text-xs font-bold text-slate-700 transition-colors">
                    اختيار ملف
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {attachmentName && (
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentName(undefined);
                        setAttachmentDataUrl(undefined);
                      }}
                      className="text-rose-500 hover:text-rose-700 p-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ملاحظات إضافية
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي ملاحظات حول الفاتورة أو شروط السداد أو المستلم..."
                rows={2}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              />
            </div>
          </div>

          {/* 6. Live Auto Journal Entry Preview */}
          <div className="p-4 bg-slate-900 rounded-xl text-white space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                معاينة القيد المحاسبي الآلي المزدوج (Double-Entry Journal):
              </span>
              <span className="text-emerald-400 font-mono text-[11px]">متوازن آلياً (Balanced)</span>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-right font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="pb-1 font-normal">الحساب</th>
                    <th className="pb-1 font-normal">البيان</th>
                    <th className="pb-1 font-normal text-left">مدين (Debit)</th>
                    <th className="pb-1 font-normal text-left">دائن (Credit)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  <tr>
                    <td className="py-1.5 text-emerald-300 font-sans">
                      {selectedExpenseAccount?.code} - {selectedExpenseAccount?.nameAr}
                    </td>
                    <td className="py-1.5 text-slate-400 font-sans text-[11px]">إثبات مصروف {title}</td>
                    <td className="py-1.5 text-left text-emerald-400">{formatSAR(amountBeforeVat)}</td>
                    <td className="py-1.5 text-left text-slate-500">0.00</td>
                  </tr>

                  {calculatedVat > 0 && (
                    <tr>
                      <td className="py-1.5 text-cyan-300 font-sans">
                        1104 - ضريبة القيمة المضافة على المدخلات (مستردة 15%)
                      </td>
                      <td className="py-1.5 text-slate-400 font-sans text-[11px]">ضريبة مدخلات الفاتورة</td>
                      <td className="py-1.5 text-left text-cyan-400">{formatSAR(calculatedVat)}</td>
                      <td className="py-1.5 text-left text-slate-500">0.00</td>
                    </tr>
                  )}

                  <tr>
                    <td className="py-1.5 text-amber-300 font-sans">
                      {selectedPaidAccount?.code} - {selectedPaidAccount?.nameAr}
                    </td>
                    <td className="py-1.5 text-slate-400 font-sans text-[11px]">سداد الفاتورة</td>
                    <td className="py-1.5 text-left text-slate-500">0.00</td>
                    <td className="py-1.5 text-left text-amber-400">{formatSAR(calculatedTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-l from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>جاري الحفظ...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>حفظ وتسجيل المصروف وتوليد القيد</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
