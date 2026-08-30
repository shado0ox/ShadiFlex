import {
  Account,
  JournalEntry,
  JournalEntryLine,
  SalesInvoice,
  PurchaseInvoice,
  SimpleExpenseInvoice,
  Voucher,
  DebitCreditNote,
  DocumentStatus,
} from '../types/accounting';

export interface PostableDocumentMetadata {
  jvId: string;
  jvNumber: string;
  nowIso: string;
  fiscalYear: number;
}

/**
 * Recalculate account balances based strictly on posted, non-cancelled journal entries.
 */
export function recalculateAccountBalances(
  allEntries: JournalEntry[],
  currentAccounts: Account[]
): Account[] {
  // Map of debit & credit totals per account ID
  const totalsMap = new Map<string, { debit: number; credit: number }>();

  // Filter ONLY posted entries (excluding draft, cancelled, reversed, etc.)
  const activePostedEntries = allEntries.filter(
    (e) => e.status === 'posted' && !e.isReversal
  );

  for (const entry of activePostedEntries) {
    for (const line of entry.lines) {
      const current = totalsMap.get(line.accountId) || { debit: 0, credit: 0 };
      current.debit += Number(line.debit || 0);
      current.credit += Number(line.credit || 0);
      totalsMap.set(line.accountId, current);
    }
  }

  return currentAccounts.map((account) => {
    const totals = totalsMap.get(account.id) || { debit: 0, credit: 0 };
    const totalDebit = Number(totals.debit.toFixed(2));
    const totalCredit = Number(totals.credit.toFixed(2));

    // Determine balance based on normal balance nature (nature is 'debit' | 'credit')
    let balance = 0;
    if (account.nature === 'debit') {
      balance = Number((totalDebit - totalCredit).toFixed(2));
    } else {
      balance = Number((totalCredit - totalDebit).toFixed(2));
    }

    return {
      ...account,
      balance,
    };
  });
}

/**
 * Generate a reversal Journal Entry for an existing posted entry.
 */
export function buildReversalJournalEntry(params: {
  originalEntry: JournalEntry;
  reversalEntryId: string;
  reversalEntryNumber: string;
  reversalDate: string;
  reason: string;
  nowIso: string;
  userId?: string;
}): JournalEntry {
  const { originalEntry, reversalEntryId, reversalEntryNumber, reversalDate, reason, nowIso } = params;

  // Invert debit & credit on all lines
  const invertedLines: JournalEntryLine[] = originalEntry.lines.map((line, idx) => ({
    id: `jvl_rev_${Date.now()}_${idx}`,
    accountId: line.accountId,
    accountCode: line.accountCode,
    accountNameAr: line.accountNameAr,
    debit: line.credit, // Invert
    credit: line.debit, // Invert
    description: `قيد عكسي لإلغاء القيد ${originalEntry.entryNumber}: ${line.description || ''}`,
  }));

  return {
    id: reversalEntryId,
    entryNumber: reversalEntryNumber,
    date: reversalDate,
    referenceType: 'manual',
    referenceId: originalEntry.id,
    referenceNumber: originalEntry.entryNumber,
    narrationAr: `قيد تسوية عكسي لإلغاء القيد رقم (${originalEntry.entryNumber}) - السبب: ${reason}`,
    lines: invertedLines,
    totalDebit: originalEntry.totalCredit,
    totalCredit: originalEntry.totalDebit,
    isBalanced: true,
    status: 'posted',
    isReversal: true,
    reversedEntryId: originalEntry.id,
    reversedEntryNumber: originalEntry.entryNumber,
    postedAt: nowIso,
    createdAt: nowIso,
  };
}

/**
 * Posting helper for Sales Invoice
 */
export function buildSalesInvoiceJournalEntry(params: {
  invoice: SalesInvoice;
  meta: PostableDocumentMetadata;
  accounts: Account[];
  cogsAmount?: number;
}): JournalEntry {
  const { invoice, meta, accounts, cogsAmount = 0 } = params;
  const lines: JournalEntryLine[] = [];

  // 1. Debit Payment Method / Customer Account
  let drAccountId = 'acc_1102'; // Accounts Receivable
  let drAccountCode = '1102';
  let drAccountName = 'المدينون والعملاء التجاريون';

  if (invoice.paymentMethod === 'cash') {
    drAccountId = 'acc_110101';
    drAccountCode = '110101';
    drAccountName = 'الصندوق الرئيسي (النقدية بالخزينة)';
  } else if (invoice.paymentMethod === 'bank_transfer') {
    drAccountId = 'acc_110102';
    drAccountCode = '110102';
    drAccountName = 'مصرف الراجحي - الحساب الجاري';
  } else if (invoice.paymentMethod === 'mada' || invoice.paymentMethod === 'pos_card') {
    drAccountId = 'acc_110104';
    drAccountCode = '110104';
    drAccountName = 'حساب نقاط البيع ومدى وسيط';
  }

  lines.push({
    id: `jvl_${Date.now()}_1`,
    accountId: drAccountId,
    accountCode: drAccountCode,
    accountNameAr: drAccountName,
    debit: invoice.totalAmount,
    credit: 0,
    description: `استحقاق فاتورة مبيعات ${invoice.invoiceNumber} - العميل: ${invoice.customerName}`,
  });

  // 2. Credit Sales Revenue (Taxable Amount)
  const revenueAcc = accounts.find((a) => a.code === '4101') || {
    id: 'acc_4101',
    code: '4101',
    nameAr: 'إيرادات مبيعات السلع (خاضعة لضريبة 15%)',
  };

  lines.push({
    id: `jvl_${Date.now()}_2`,
    accountId: revenueAcc.id,
    accountCode: revenueAcc.code,
    accountNameAr: revenueAcc.nameAr,
    debit: 0,
    credit: invoice.taxableAmount,
    description: `إيراد مبيعات فاتورة ${invoice.invoiceNumber}`,
  });

  // 3. Credit Output VAT (if > 0)
  if (invoice.vatTotal > 0) {
    lines.push({
      id: `jvl_${Date.now()}_3`,
      accountId: 'acc_2102',
      accountCode: '2102',
      accountNameAr: 'ضريبة القيمة المضافة على المخرجات (مستحقة لهيئة الزكاة)',
      debit: 0,
      credit: invoice.vatTotal,
      description: `ضريبة مخرجات 15% لفاتورة مبيعات ZATCA ${invoice.invoiceNumber}`,
    });
  }

  // 4. Perpetual Inventory: Cost of Goods Sold vs Inventory reduction (if COGS is calculated)
  if (cogsAmount > 0) {
    lines.push({
      id: `jvl_${Date.now()}_4`,
      accountId: 'acc_5101',
      accountCode: '5101',
      accountNameAr: 'تكلفة البضاعة المباعة (COGS)',
      debit: cogsAmount,
      credit: 0,
      description: `إثبات تكلفة البضاعة المباعة لفاتورة مبيعات ${invoice.invoiceNumber}`,
    });
    lines.push({
      id: `jvl_${Date.now()}_5`,
      accountId: 'acc_1103',
      accountCode: '1103',
      accountNameAr: 'المخزون السلعي (بضاعة بالمستودع)',
      debit: 0,
      credit: cogsAmount,
      description: `صرف بضاعة مباعة من المستودع لفاتورة ${invoice.invoiceNumber}`,
    });
  }

  const totalDebit = Number((invoice.totalAmount + (cogsAmount > 0 ? cogsAmount : 0)).toFixed(2));
  const totalCredit = Number((invoice.taxableAmount + invoice.vatTotal + (cogsAmount > 0 ? cogsAmount : 0)).toFixed(2));

  return {
    id: meta.jvId,
    entryNumber: meta.jvNumber,
    date: invoice.issueDate,
    referenceType: 'sales_invoice',
    referenceId: invoice.id,
    referenceNumber: invoice.invoiceNumber,
    narrationAr: `إثبات فاتورة مبيعات ضريبية رقم ${invoice.invoiceNumber} - العميل: ${invoice.customerName}`,
    lines,
    totalDebit,
    totalCredit,
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    status: 'posted',
    postedAt: meta.nowIso,
    createdAt: meta.nowIso,
  };
}

/**
 * Posting helper for Purchase Invoice
 */
export function buildPurchaseInvoiceJournalEntry(params: {
  invoice: PurchaseInvoice;
  meta: PostableDocumentMetadata;
  accounts: Account[];
}): JournalEntry {
  const { invoice, meta, accounts } = params;
  const lines: JournalEntryLine[] = [];

  // 1. Debit Inventory / Purchases Account
  const inventoryAcc = accounts.find((a) => a.code === '1103') || {
    id: 'acc_1103',
    code: '1103',
    nameAr: 'المخزون السلعي (بضاعة بالمستودع)',
  };

  lines.push({
    id: `jvl_${Date.now()}_1`,
    accountId: inventoryAcc.id,
    accountCode: inventoryAcc.code,
    accountNameAr: inventoryAcc.nameAr,
    debit: invoice.taxableAmount,
    credit: 0,
    description: `إثبات مشتريات بضاعة ومخزون فاتورة ${invoice.invoiceNumber}`,
  });

  // 2. Debit Input VAT (if > 0)
  if (invoice.vatTotal > 0) {
    lines.push({
      id: `jvl_${Date.now()}_2`,
      accountId: 'acc_1104',
      accountCode: '1104',
      accountNameAr: 'ضريبة القيمة المضافة على المدخلات (مستردة)',
      debit: invoice.vatTotal,
      credit: 0,
      description: `ضريبة مدخلات 15% لفاتورة مشتريات ${invoice.invoiceNumber}`,
    });
  }

  // 3. Credit Payment Method / Supplier Account
  let crAccountId = 'acc_2101'; // Accounts Payable
  let crAccountCode = '2101';
  let crAccountName = 'الدائنون والموردون التجاريون';

  if (invoice.paymentMethod === 'cash') {
    crAccountId = 'acc_110101';
    crAccountCode = '110101';
    crAccountName = 'الصندوق الرئيسي (النقدية بالخزينة)';
  } else if (invoice.paymentMethod === 'bank_transfer') {
    crAccountId = 'acc_110102';
    crAccountCode = '110102';
    crAccountName = 'مصرف الراجحي - الحساب الجاري';
  }

  lines.push({
    id: `jvl_${Date.now()}_3`,
    accountId: crAccountId,
    accountCode: crAccountCode,
    accountNameAr: crAccountName,
    debit: 0,
    credit: invoice.totalAmount,
    description: `استحقاق / سداد فاتورة مشتريات ${invoice.invoiceNumber} - المورد: ${invoice.supplierName}`,
  });

  return {
    id: meta.jvId,
    entryNumber: meta.jvNumber,
    date: invoice.issueDate,
    referenceType: 'purchase_invoice',
    referenceId: invoice.id,
    referenceNumber: invoice.invoiceNumber,
    narrationAr: `إثبات فاتورة مشتريات رقم ${invoice.invoiceNumber} - المورد: ${invoice.supplierName}`,
    lines,
    totalDebit: invoice.totalAmount,
    totalCredit: invoice.totalAmount,
    isBalanced: true,
    status: 'posted',
    postedAt: meta.nowIso,
    createdAt: meta.nowIso,
  };
}
