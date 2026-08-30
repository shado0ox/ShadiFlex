import {
  accountingBackupDataSchema,
  ValidatedAccountingDataSnapshot,
} from '../schemas/accountingValidationSchemas';
import { AccountingDataSnapshot } from '../repositories/AccountingRepository';
import { SHADIFLEX_STORAGE_PREFIX, EMERGENCY_BACKUP_STORAGE_KEY } from '../constants/storage';
import { ApiKey, CompanySettings } from '../types/accounting';
import { ZodError } from 'zod';

export { EMERGENCY_BACKUP_STORAGE_KEY };

export interface ValidationIssue {
  id: string;
  section: string;
  path: string;
  message: string;
  severity: 'error' | 'warning';
  value?: unknown;
}

export interface BackupValidationResult {
  isValid: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  summary: {
    companyNameAr: string;
    crNumber: string;
    vatNumber: string;
    schemaVersion: number;
    appVersion: string;
    exportedAt?: string;
    totalAccounts: number;
    totalCustomers: number;
    totalSuppliers: number;
    totalInventoryItems: number;
    totalStockMovements: number;
    totalSalesInvoices: number;
    totalPurchaseInvoices: number;
    totalDebitCreditNotes: number;
    totalVouchers: number;
    totalSimpleExpenses: number;
    totalJournalEntries: number;
    totalBranches: number;
    totalCashRegisters: number;
  } | null;
  sanitizedData: AccountingDataSnapshot | null;
}

export interface EmergencyBackupRecord {
  timestamp: string;
  reason: string;
  data: AccountingDataSnapshot;
}

/**
 * Translate Zod / technical paths into clear, user-friendly Arabic breadcrumbs
 */
function translatePathToArabic(path: (string | number)[]): { section: string; friendlyPath: string } {
  if (!path || path.length === 0) {
    return { section: 'عام', friendlyPath: 'البيانات العامة' };
  }

  const rootKey = String(path[0]);
  let section = 'عام';

  const sectionMap: Record<string, string> = {
    companySettings: 'بيانات وإعدادات المنشأة',
    accounts: 'دليل وشجرة الحسابات',
    customers: 'سجل العملاء',
    suppliers: 'سجل الموردين',
    inventory: 'سجل الأصناف والمخزون',
    stockMovements: 'سجل حركات المخزون',
    salesInvoices: 'فواتير المبيعات',
    purchaseInvoices: 'فواتير المشتريات',
    debitCreditNotes: 'الإشعارات المدينة والدائنة',
    vouchers: 'سندات القبض والصرف',
    simpleExpenses: 'فواتير المصروفات التشغيلية',
    journalEntries: 'قيود اليومية المحاسبية',
    apiKeys: 'مفاتيح الربط والـ API',
    fiscalClosings: 'إقفالات السنوات المالية',
    branches: 'الفروع',
    cashRegisters: 'نقاط البيع والكاشير',
    cashierShifts: 'ورديات الكاشير',
    parkedOrders: 'الطلبات المعلقة',
    schemaVersion: 'إصدار بنية الملف',
    version: 'إصدار التطبيق',
  };

  if (sectionMap[rootKey]) {
    section = sectionMap[rootKey];
  }

  const parts = path.map((part) => {
    if (typeof part === 'number') {
      return `[عنصر ${part + 1}]`;
    }
    const fieldMap: Record<string, string> = {
      nameAr: 'الاسم بالعربية',
      nameEn: 'الاسم بالإنجليزية',
      vatNumber: 'الرقم الضريبي',
      crNumber: 'السجل التجاري',
      phone: 'الهاتف',
      email: 'البريد الإلكتروني',
      code: 'الرمز/الكود',
      balance: 'الرصيد',
      items: 'البنود',
      quantity: 'الكمية',
      unitPrice: 'سعر الوحدة',
      discount: 'الخصم',
      vatRate: 'نسبة الضريبة',
      vatAmount: 'مبلغ الضريبة',
      subtotal: 'المجموع الفرعي',
      totalAmount: 'المبلغ الإجمالي',
      totalWithVat: 'الإجمالي بالضريبة',
      lines: 'أطراف القيد',
      debit: 'المدين',
      credit: 'الدائن',
      narrationAr: 'البيان/الشرح',
      date: 'التاريخ',
      issueDate: 'تاريخ الإصدار',
      issueTime: 'وقت الإصدار',
      amount: 'المبلغ',
      amountBeforeVat: 'المبلغ قبل الضريبة',
      title: 'العنوان',
      vendorName: 'اسم المورد',
      customerName: 'اسم العميل',
      supplierName: 'اسم المورد',
      invoiceNumber: 'رقم الفاتورة',
      voucherNumber: 'رقم السند',
      expenseNumber: 'رقم المصروف',
      entryNumber: 'رقم القيد',
      noteNumber: 'رقم الإشعار',
      currentStock: 'الرصيد المخزني الحالي',
      purchasePrice: 'سعر الشراء/التكلفة',
      salePrice: 'سعر البيع',
      nationalAddress: 'العنوان الوطني',
      bankDetails: 'البيانات البنكية',
    };
    return fieldMap[part] || part;
  });

  return {
    section,
    friendlyPath: parts.join(' ❯ '),
  };
}

/**
 * Perform comprehensive Schema and Deep Relational Business Validation on JSON
 */
export function validateAccountingBackupJson(rawJsonOrObject: string | unknown): BackupValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // Step 1: Safe Parsing
  let parsedData: unknown = null;
  if (typeof rawJsonOrObject === 'string') {
    try {
      parsedData = JSON.parse(rawJsonOrObject);
    } catch (err: any) {
      return {
        isValid: false,
        hasErrors: true,
        hasWarnings: false,
        errors: [
          {
            id: 'json_parse_error',
            section: 'بنية الملف (JSON Structure)',
            path: 'root',
            message: `الملف تالف أو غير صالح كـ JSON: ${err?.message || 'خطأ في قراءة الترميز'}`,
            severity: 'error',
          },
        ],
        warnings: [],
        summary: null,
        sanitizedData: null,
      };
    }
  } else {
    parsedData = rawJsonOrObject;
  }

  if (!parsedData || typeof parsedData !== 'object' || Array.isArray(parsedData)) {
    return {
      isValid: false,
      hasErrors: true,
      hasWarnings: false,
      errors: [
        {
          id: 'root_not_object',
          section: 'بنية الملف',
          path: 'root',
          message: 'يجب أن يكون جذر ملف النسخة الاحتياطية كائناً (JSON Object) يحتوي على الحسابات والفواتير والإعدادات.',
          severity: 'error',
        },
      ],
      warnings: [],
      summary: null,
      sanitizedData: null,
    };
  }

  const rawObj = parsedData as Record<string, any>;

  // Step 2: Strict Zod Schema Validation
  const schemaResult = accountingBackupDataSchema.safeParse(rawObj);

  if (!schemaResult.success) {
    const zodIssues = schemaResult.error.issues;
    zodIssues.forEach((zErr, idx) => {
      const cleanPath: (string | number)[] = zErr.path.map((p) =>
        typeof p === 'symbol' ? p.toString() : p
      );
      const { section, friendlyPath } = translatePathToArabic(cleanPath);
      errors.push({
        id: `schema_err_${idx}`,
        section,
        path: friendlyPath,
        message: zErr.message,
        severity: 'error',
        value: cleanPath.reduce((acc: any, curr) => (acc ? acc[curr] : undefined), rawObj),
      });
    });
  }

  // If Zod schema succeeded, let's also do deep business rules check
  let validData: ValidatedAccountingDataSnapshot | null = null;
  if (schemaResult.success) {
    validData = schemaResult.data;

    // A. Check Account References in Journal Entries
    const accountIdSet = new Set(validData.accounts.map((a) => a.id));
    const accountCodeSet = new Set(validData.accounts.map((a) => a.code));

    // Check unique account codes
    const seenCodes = new Set<string>();
    validData.accounts.forEach((acc, idx) => {
      if (seenCodes.has(acc.code)) {
        errors.push({
          id: `dup_acc_code_${idx}`,
          section: 'شجرة الحسابات',
          path: `الحسابات ❯ [عنصر ${idx + 1}] (${acc.nameAr})`,
          message: `رمز الحساب (${acc.code}) مكرر في شجرة الحسابات! يجب أن يكون رمز الحساب فريداً.`,
          severity: 'error',
        });
      }
      seenCodes.add(acc.code);
    });

    // Check Journal Entry Math Balance & Account Existence
    validData.journalEntries.forEach((je, jeIdx) => {
      let debitSum = 0;
      let creditSum = 0;

      je.lines.forEach((line, lineIdx) => {
        debitSum += Number(line.debit) || 0;
        creditSum += Number(line.credit) || 0;

        if (!accountIdSet.has(line.accountId) && !accountCodeSet.has(line.accountCode)) {
          errors.push({
            id: `je_${je.id}_line_${line.id}`,
            section: 'قيود اليومية المحاسبية',
            path: `قيد اليومية (${je.entryNumber}) ❯ طرف القيد [${lineIdx + 1}]`,
            message: `الحساب المحاسبي المربوط بالطرف (${line.accountNameAr} - ${line.accountCode}) غير موجود في دليل الحسابات المستورد.`,
            severity: 'error',
          });
        }
      });

      const diff = Math.abs(debitSum - creditSum);
      if (diff > 0.01) {
        errors.push({
          id: `je_${je.id}_unbalanced`,
          section: 'قيود اليومية المحاسبية',
          path: `قيد اليومية (${je.entryNumber})`,
          message: `القيد المحاسبي غير متزن رياضياً! إجمالي المدين (${debitSum.toFixed(2)}) لا يساوي إجمالي الدائن (${creditSum.toFixed(2)}).`,
          severity: 'error',
        });
      }
    });

    // Check Vouchers Account References
    validData.vouchers.forEach((v, vIdx) => {
      if (!accountIdSet.has(v.debitAccountId) && !accountCodeSet.has(v.debitAccountCode)) {
        errors.push({
          id: `v_${v.id}_debit_acc`,
          section: 'سندات القبض والصرف',
          path: `السند (${v.voucherNumber}) ❯ حساب المدين`,
          message: `حساب المدين (${v.debitAccountNameAr} - ${v.debitAccountCode}) غير معرف في دليل الحسابات المستورد.`,
          severity: 'error',
        });
      }
      if (!accountIdSet.has(v.creditAccountId) && !accountCodeSet.has(v.creditAccountCode)) {
        errors.push({
          id: `v_${v.id}_credit_acc`,
          section: 'سندات القبض والصرف',
          path: `السند (${v.voucherNumber}) ❯ حساب الدائن`,
          message: `حساب الدائن (${v.creditAccountNameAr} - ${v.creditAccountCode}) غير معرف في دليل الحسابات المستورد.`,
          severity: 'error',
        });
      }
    });

    // Check Simple Expenses Account References
    validData.simpleExpenses.forEach((exp) => {
      if (!accountIdSet.has(exp.expenseAccountId) && !accountCodeSet.has(exp.expenseAccountCode)) {
        errors.push({
          id: `exp_${exp.id}_exp_acc`,
          section: 'فواتير المصروفات التشغيلية',
          path: `المصروف (${exp.expenseNumber}) ❯ حساب المصروف`,
          message: `حساب المصروف (${exp.expenseAccountNameAr} - ${exp.expenseAccountCode}) غير موجود في دليل الحسابات.`,
          severity: 'error',
        });
      }
      if (!accountIdSet.has(exp.paidThroughAccountId) && !accountCodeSet.has(exp.paidThroughAccountCode)) {
        errors.push({
          id: `exp_${exp.id}_paid_acc`,
          section: 'فواتير المصروفات التشغيلية',
          path: `المصروف (${exp.expenseNumber}) ❯ حساب وسيلة الدفع`,
          message: `حساب وسيلة الدفع (${exp.paidThroughAccountNameAr} - ${exp.paidThroughAccountCode}) غير موجود في دليل الحسابات.`,
          severity: 'error',
        });
      }
    });

    // Check Inventory Item Account References
    validData.inventory.forEach((inv) => {
      if (inv.accountId && !accountIdSet.has(inv.accountId)) {
        warnings.push({
          id: `inv_${inv.id}_asset_acc`,
          section: 'سجل الأصناف والمخزون',
          path: `الصنف (${inv.nameAr} - ${inv.sku}) ❯ حساب المخزون`,
          message: `حساب أصل المخزون المربوط بالصنف غير موجود في شجرة الحسابات، سيتم الاعتماد على الحساب الافتراضي للمخزون (1104).`,
          severity: 'warning',
        });
      }
    });
  }

  // Sanitize Secrets: Ensure API keys are stripped / neutralized
  let sanitizedSnapshot: AccountingDataSnapshot | null = null;
  if (validData && errors.length === 0) {
    const sanitizedApiKeys = validData.apiKeys.map((k) => ({
      ...k,
      permissions: k.permissions as ApiKey['permissions'],
      key: 'demo_key_not_active',
      maskedKey: k.maskedKey || 'demo_••••••••2371',
    }));

    sanitizedSnapshot = {
      ...validData,
      companySettings: {
        ...validData.companySettings,
        email: validData.companySettings.email || 'info@company.com',
      } as CompanySettings,
      apiKeys: sanitizedApiKeys as ApiKey[],
      schemaVersion: validData.schemaVersion || 2,
      version: validData.version || '2.0.0',
    } as AccountingDataSnapshot;
  }

  const summary = validData
    ? {
        companyNameAr: validData.companySettings.nameAr,
        crNumber: validData.companySettings.crNumber,
        vatNumber: validData.companySettings.vatNumber,
        schemaVersion: validData.schemaVersion || 2,
        appVersion: validData.version || '2.0.0',
        exportedAt: validData.exportedAt,
        totalAccounts: validData.accounts.length,
        totalCustomers: validData.customers.length,
        totalSuppliers: validData.suppliers.length,
        totalInventoryItems: validData.inventory.length,
        totalStockMovements: validData.stockMovements.length,
        totalSalesInvoices: validData.salesInvoices.length,
        totalPurchaseInvoices: validData.purchaseInvoices.length,
        totalDebitCreditNotes: validData.debitCreditNotes.length,
        totalVouchers: validData.vouchers.length,
        totalSimpleExpenses: validData.simpleExpenses.length,
        totalJournalEntries: validData.journalEntries.length,
        totalBranches: validData.branches.length,
        totalCashRegisters: validData.cashRegisters.length,
      }
    : null;

  return {
    isValid: errors.length === 0,
    hasErrors: errors.length > 0,
    hasWarnings: warnings.length > 0,
    errors,
    warnings,
    summary,
    sanitizedData: sanitizedSnapshot,
  };
}

/**
 * Emergency Local Backup Management
 * Creates a local emergency snapshot in localStorage before any import operation occurs.
 */
export function savePreImportEmergencyBackup(currentData: AccountingDataSnapshot): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const record: EmergencyBackupRecord = {
      timestamp: new Date().toISOString(),
      reason: 'نسخة طوارئ آلية تم إنشاؤها تلقائياً قبل استيراد ملف خارجي',
      data: currentData,
    };
    localStorage.setItem(EMERGENCY_BACKUP_STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch (err) {
    console.error('Failed to create emergency pre-import backup', err);
    return false;
  }
}

export function getPreImportEmergencyBackup(): EmergencyBackupRecord | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = localStorage.getItem(EMERGENCY_BACKUP_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EmergencyBackupRecord;
  } catch (err) {
    console.error('Failed to read pre-import emergency backup', err);
    return null;
  }
}

export function clearPreImportEmergencyBackup(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(EMERGENCY_BACKUP_STORAGE_KEY);
    }
  } catch (err) {
    console.error(err);
  }
}

/**
 * Compatibility alias for validateAccountingBackupJson
 */
export function validateBackupPayload(rawJsonOrObject: string | unknown) {
  const res = validateAccountingBackupJson(rawJsonOrObject);
  return {
    isValid: res.isValid,
    errors: res.errors.map((e) => `[${e.section}] ${e.message}`),
    warnings: res.warnings.map((w) => `[${w.section}] ${w.message}`),
    sanitizedData: res.sanitizedData,
    summary: res.summary,
  };
}

