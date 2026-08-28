/**
 * Comprehensive Journal Entry Validation Service
 * 
 * Enforces strict accounting integrity before any journal entry is persisted or posted:
 * 1. Checks that sum of Debit strictly equals sum of Credit with 2-decimal precision.
 * 2. Prevents negative values, NaN, or Infinity on debit & credit amounts.
 * 3. Prevents any single line having both debit > 0 and credit > 0.
 * 4. Prevents zero lines (where debit === 0 and credit === 0).
 * 5. Verifies all referenced accounts exist, are active (isActive !== false), and are postable (isTransactional !== false).
 * 6. Calculates totalDebit and totalCredit strictly from lines, disregarding frontend values.
 * 7. Ignores frontend isBalanced flag and computes balance strictly.
 * 8. Utilizes centralized 2-decimal money utilities to prevent floating-point inaccuracies.
 */

import { Account, JournalEntry, JournalEntryLine } from '../types/accounting';
import { roundMoney, moneyAdd, moneySub, moneyEquals, isZeroMoney, isValidNonNegativeMoney } from '../utils/money';

export interface LineValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedLine?: JournalEntryLine;
}

export interface JournalValidationResult {
  isValid: boolean;
  errors: string[];
  totalDebit: number;
  totalCredit: number;
  difference: number;
  isBalanced: boolean;
  sanitizedLines: JournalEntryLine[];
}

export class JournalValidationError extends Error {
  public validationErrors: string[];

  constructor(message: string, validationErrors: string[] = []) {
    super(message);
    this.name = 'JournalValidationError';
    this.validationErrors = validationErrors.length > 0 ? validationErrors : [message];
  }
}

/**
 * Validates if an individual account is eligible for journal entry posting.
 */
export function validateAccountForPosting(
  accountIdentifier: string,
  accounts: Account[]
): { isValid: boolean; error?: string; account?: Account } {
  if (!accountIdentifier || !accountIdentifier.trim()) {
    return { isValid: false, error: 'لم يتم تحديد الحساب المحاسبي للسطر.' };
  }

  const trimmed = accountIdentifier.trim();
  const account = accounts.find((a) => a.id === trimmed || a.code === trimmed);

  if (!account) {
    return {
      isValid: false,
      error: `الحساب المحاسبي (${trimmed}) غير موجود في دليل الحسابات.`,
    };
  }

  if (account.isActive === false) {
    return {
      isValid: false,
      error: `الحساب [${account.code}] "${account.nameAr}" معطّل (غير نشط) ولا يمكن الترحيل عليه.`,
      account,
    };
  }

  if (account.isTransactional === false) {
    return {
      isValid: false,
      error: `الحساب [${account.code}] "${account.nameAr}" هو حساب رئيسي/تجميعي وغير قابل للترحيل المباشر. يجب اختيار حساب فرعي تحليلي.`,
      account,
    };
  }

  return { isValid: true, account };
}

/**
 * Validates and sanitizes a single journal entry line.
 */
export function validateJournalLine(
  line: Partial<JournalEntryLine>,
  lineIndex: number,
  accounts: Account[]
): LineValidationResult {
  const errors: string[] = [];
  const lineNum = lineIndex + 1;

  // 1. Account identification & eligibility
  const accountIdOrCode = line.accountId || line.accountCode || '';
  const accountCheck = validateAccountForPosting(accountIdOrCode, accounts);

  if (!accountCheck.isValid) {
    errors.push(`السطر رقم (${lineNum}): ${accountCheck.error}`);
  }

  const account = accountCheck.account;
  const accountName = account?.nameAr || line.accountNameAr || `سطر ${lineNum}`;
  const accountCode = account?.code || line.accountCode || 'غير محدد';
  const accountId = account?.id || line.accountId || '';

  // 2. Validate Debit value
  const rawDebit = line.debit;
  if (!isValidNonNegativeMoney(rawDebit)) {
    errors.push(
      `السطر رقم (${lineNum}) [${accountCode} - ${accountName}]: قيمة المدين غير صالحة أو سالبة أو غير رقمية.`
    );
  }

  // 3. Validate Credit value
  const rawCredit = line.credit;
  if (!isValidNonNegativeMoney(rawCredit)) {
    errors.push(
      `السطر رقم (${lineNum}) [${accountCode} - ${accountName}]: قيمة الدائن غير صالحة أو سالبة أو غير رقمية.`
    );
  }

  const roundedDebit = roundMoney(rawDebit);
  const roundedCredit = roundMoney(rawCredit);

  // 4. Prevent both debit > 0 and credit > 0 in the same line
  if (roundedDebit > 0 && roundedCredit > 0) {
    errors.push(
      `السطر رقم (${lineNum}) [${accountCode} - ${accountName}]: لا يمكن أن يحتوي السطر على مدين (${roundedDebit.toFixed(2)}) ودائن (${roundedCredit.toFixed(2)}) معاً. يجب أن يكون السطر إما مديناً فقط أو دائناً فقط.`
    );
  }

  // 5. Prevent zero line (both debit === 0 and credit === 0)
  if (isZeroMoney(roundedDebit) && isZeroMoney(roundedCredit)) {
    errors.push(
      `السطر رقم (${lineNum}) [${accountCode} - ${accountName}]: السطر صفري (المدين 0.00 والدائن 0.00). يجب تحديد مبلغ مدين أو دائن أكبر من الصفر.`
    );
  }

  const sanitizedLine: JournalEntryLine = {
    id: line.id || `line_${Date.now()}_${lineIndex}`,
    accountId,
    accountCode,
    accountNameAr: accountName,
    debit: roundedDebit,
    credit: roundedCredit,
    description: (line.description || '').trim(),
  };

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedLine,
  };
}

/**
 * Validates an entire journal entry structure, lines, and balance.
 * Recomputes totalDebit and totalCredit directly from lines using 2-decimal Money math.
 */
export function validateJournalEntry(
  entry: Partial<JournalEntry> & { lines?: Partial<JournalEntryLine>[] },
  accounts: Account[]
): JournalValidationResult {
  const allErrors: string[] = [];

  const rawLines = entry.lines || [];

  if (!Array.isArray(rawLines) || rawLines.length < 2) {
    allErrors.push('يجب أن يحتوي القيد المحاسبي على طرفين على الأقل (سطرين: مدين ودائن).');
  }

  const sanitizedLines: JournalEntryLine[] = [];
  let calculatedTotalDebit = 0;
  let calculatedTotalCredit = 0;

  rawLines.forEach((line, index) => {
    const lineResult = validateJournalLine(line, index, accounts);
    if (!lineResult.isValid) {
      allErrors.push(...lineResult.errors);
    }
    if (lineResult.sanitizedLine) {
      sanitizedLines.push(lineResult.sanitizedLine);
      calculatedTotalDebit = moneyAdd(calculatedTotalDebit, lineResult.sanitizedLine.debit);
      calculatedTotalCredit = moneyAdd(calculatedTotalCredit, lineResult.sanitizedLine.credit);
    }
  });

  // Calculate difference with 2-decimal precision
  const difference = Math.abs(moneySub(calculatedTotalDebit, calculatedTotalCredit));
  const isBalanced = moneyEquals(calculatedTotalDebit, calculatedTotalCredit) && calculatedTotalDebit > 0;

  // Check balance
  if (!moneyEquals(calculatedTotalDebit, calculatedTotalCredit)) {
    allErrors.push(
      `القيد غير متوازن: مجموع المدين (${calculatedTotalDebit.toFixed(2)} ر.س) لا يساوي مجموع الدائن (${calculatedTotalCredit.toFixed(2)} ر.س). الفارق: (${difference.toFixed(2)} ر.س).`
    );
  }

  if (isZeroMoney(calculatedTotalDebit) && isZeroMoney(calculatedTotalCredit)) {
    allErrors.push('إجمالي مبالغ القيد المحاسبي لا يمكن أن يكون صفراً.');
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    totalDebit: calculatedTotalDebit,
    totalCredit: calculatedTotalCredit,
    difference,
    isBalanced,
    sanitizedLines,
  };
}

/**
 * Asserts that a journal entry is valid and returns the sanitized entry ready to be added to ledger.
 * Throws a detailed JournalValidationError if any constraint fails.
 */
export function assertValidJournalEntry(
  entry: Partial<JournalEntry> & { lines?: Partial<JournalEntryLine>[] },
  accounts: Account[]
): {
  sanitizedEntry: JournalEntry;
  totalDebit: number;
  totalCredit: number;
} {
  const result = validateJournalEntry(entry, accounts);

  if (!result.isValid) {
    const errorSummary = result.errors.join('\n• ');
    throw new JournalValidationError(
      `فشل التحقق من صحة القيد المحاسبي:\n• ${errorSummary}`,
      result.errors
    );
  }

  const nowIso = new Date().toISOString();
  const sanitizedEntry: JournalEntry = {
    id: entry.id || `jv_${Date.now()}`,
    entryNumber: entry.entryNumber || 'JV-UNASSIGNED',
    date: entry.date || nowIso.split('T')[0],
    referenceType: entry.referenceType || 'manual',
    referenceId: entry.referenceId,
    referenceNumber: entry.referenceNumber,
    narrationAr: (entry.narrationAr || '').trim() || 'قيد محاسبي',
    lines: result.sanitizedLines,
    totalDebit: result.totalDebit,
    totalCredit: result.totalCredit,
    isBalanced: true,
    status: entry.status || 'posted',
    isReversal: entry.isReversal || false,
    reversedEntryId: entry.reversedEntryId,
    reversedEntryNumber: entry.reversedEntryNumber,
    reversalEntryId: entry.reversalEntryId,
    reversalEntryNumber: entry.reversalEntryNumber,
    reversalReason: entry.reversalReason,
    reversalDate: entry.reversalDate,
    reversedAt: entry.reversedAt,
    postedAt: entry.status === 'posted' || !entry.status ? (entry.postedAt || nowIso) : undefined,
    cancelledAt: entry.cancelledAt,
    cancellationReason: entry.cancellationReason,
    createdAt: (entry as any).createdAt || nowIso,
  };

  return {
    sanitizedEntry,
    totalDebit: result.totalDebit,
    totalCredit: result.totalCredit,
  };
}
