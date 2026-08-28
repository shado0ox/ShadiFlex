import { z } from 'zod';

export interface SanitizedFinancialContext {
  companyName?: string;
  vatNumber?: string;
  totalSales?: number;
  grossProfit?: number;
  netProfit?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  totalEquity?: number;
  salesInvoicesCount?: number;
  purchaseInvoicesCount?: number;
  inventoryCount?: number;
  outputVat?: number;
  inputVat?: number;
  netVatDue?: number;
  cashAndBankBalance?: number;
  accountingPeriod?: string;
}

const MAX_PROMPT_LENGTH = 4000;
const MAX_CONTEXT_JSON_BYTES = 25 * 1024; // 25KB

export const aiAdvisorSchema = z.object({
  prompt: z
    .string({ message: 'حقل نص السؤال أو الاستفسار مطلوب' })
    .trim()
    .min(1, 'لا يمكن إرسال استفسار فارغ')
    .max(MAX_PROMPT_LENGTH, `تجاوز نص الاستفسار الحد الأقصى المسموح به (${MAX_PROMPT_LENGTH} حرف)`),
  financialContext: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Prunes and sanitizes the financial context to strictly whitelisted summary figures.
 * Ensures zero leakage of personal passwords, API keys, customer names, supplier names, raw PII, or raw database dumps.
 * Tax numbers and company identifiers are anonymized/masked by default.
 */
export function sanitizeFinancialContext(rawContext: Record<string, unknown> | undefined): SanitizedFinancialContext {
  if (!rawContext || typeof rawContext !== 'object') {
    return {};
  }

  const safeNum = (v: unknown): number | undefined => (typeof v === 'number' && isFinite(v) ? Math.round(v * 100) / 100 : undefined);
  const safeStr = (v: unknown, maxLen = 80): string | undefined => (typeof v === 'string' ? v.slice(0, maxLen).trim() : undefined);

  // Mask VAT number by default if passed (e.g. 3••••••••••••3)
  const maskVat = (vat: unknown): string | undefined => {
    if (typeof vat !== 'string' || !vat.trim()) return undefined;
    const clean = vat.trim();
    if (clean.length >= 4) {
      return `${clean.slice(0, 2)}•••••••••••${clean.slice(-2)}`;
    }
    return '•••••••••••••••';
  };

  const sanitized: SanitizedFinancialContext = {};

  if (rawContext.companyName && typeof rawContext.companyName === 'string') {
    sanitized.companyName = safeStr(rawContext.companyName, 60);
  }

  if (rawContext.vatNumber && typeof rawContext.vatNumber === 'string') {
    sanitized.vatNumber = maskVat(rawContext.vatNumber);
  }

  if (rawContext.totalSales !== undefined) sanitized.totalSales = safeNum(rawContext.totalSales);
  if (rawContext.grossProfit !== undefined) sanitized.grossProfit = safeNum(rawContext.grossProfit);
  if (rawContext.netProfit !== undefined) sanitized.netProfit = safeNum(rawContext.netProfit);
  if (rawContext.totalAssets !== undefined) sanitized.totalAssets = safeNum(rawContext.totalAssets);
  if (rawContext.totalLiabilities !== undefined) sanitized.totalLiabilities = safeNum(rawContext.totalLiabilities);
  if (rawContext.totalEquity !== undefined) sanitized.totalEquity = safeNum(rawContext.totalEquity);
  if (rawContext.salesInvoicesCount !== undefined && typeof rawContext.salesInvoicesCount === 'number') {
    sanitized.salesInvoicesCount = Math.max(0, Math.floor(rawContext.salesInvoicesCount));
  }
  if (rawContext.purchaseInvoicesCount !== undefined && typeof rawContext.purchaseInvoicesCount === 'number') {
    sanitized.purchaseInvoicesCount = Math.max(0, Math.floor(rawContext.purchaseInvoicesCount));
  }
  if (rawContext.inventoryCount !== undefined && typeof rawContext.inventoryCount === 'number') {
    sanitized.inventoryCount = Math.max(0, Math.floor(rawContext.inventoryCount));
  }
  if (rawContext.outputVat !== undefined) sanitized.outputVat = safeNum(rawContext.outputVat);
  if (rawContext.inputVat !== undefined) sanitized.inputVat = safeNum(rawContext.inputVat);
  if (rawContext.netVatDue !== undefined) sanitized.netVatDue = safeNum(rawContext.netVatDue);
  if (rawContext.cashAndBankBalance !== undefined) sanitized.cashAndBankBalance = safeNum(rawContext.cashAndBankBalance);
  if (rawContext.accountingPeriod && typeof rawContext.accountingPeriod === 'string') {
    sanitized.accountingPeriod = safeStr(rawContext.accountingPeriod, 40);
  }

  // Check JSON size cap
  const str = JSON.stringify(sanitized);
  if (str.length > MAX_CONTEXT_JSON_BYTES) {
    return {
      totalSales: sanitized.totalSales,
      netProfit: sanitized.netProfit,
    };
  }

  return sanitized;
}

export const zatcaVerifySchema = z.object({
  invoice: z.object({
    invoiceNumber: z.string().min(1, 'رقم الفاتورة مطلوب'),
    issueDate: z.string().min(1, 'تاريخ إصدار الفاتورة مطلوب'),
    totalAmount: z.number().min(0, 'إجمالي الفاتورة يجب أن يكون رقماً موجباً'),
    taxableAmount: z.number().optional(),
    vatAmount: z.number().optional(),
    type: z.enum(['tax_invoice', 'simplified_tax_invoice']).optional(),
    items: z
      .array(
        z.object({
          name: z.string().optional(),
          quantity: z.number().optional(),
          unitPrice: z.number().optional(),
          subtotal: z.number().optional(),
          vatAmount: z.number().optional(),
        })
      )
      .optional(),
  }),
  company: z.object({
    vatNumber: z.string().min(1, 'الرقم الضريبي للمنشأة مطلوب'),
    nameAr: z.string().optional(),
  }),
  config: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Execute a promise with a guaranteed maximum timeout.
 */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName = 'Operation'): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err: any = new Error(`انتهت مهلة انتظار الاستجابة (${operationName}) بعد ${timeoutMs / 1000} ثانية`);
      err.statusCode = 504;
      reject(err);
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer!);
    return result;
  } catch (error) {
    clearTimeout(timer!);
    throw error;
  }
}
