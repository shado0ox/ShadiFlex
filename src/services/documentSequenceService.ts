/**
 * DocumentSequenceService
 *
 * Robust, monotonic sequence generator for financial and tax documents.
 * Ensures:
 * 1. Independent prefixes for each document type.
 * 2. Dynamic fiscal year handling from company settings or document date (no hardcoded 2026).
 * 3. Extraction of maximum actual numeric sequence from existing data.
 * 4. Tracking of last allocated number in persistent storage to prevent reusing numbers of deleted documents.
 * 5. Monotonic incrementing without relying on array.length + 1.
 */

export type DocumentSequenceType =
  | 'sales_invoice'
  | 'purchase_invoice'
  | 'journal_entry'
  | 'receipt_voucher'
  | 'payment_voucher'
  | 'credit_note'
  | 'debit_note'
  | 'simple_expense'
  | 'cashier_shift'
  | 'branch'
  | 'cash_register'
  | 'parked_order';

interface SequenceDefinition {
  prefix: string;
  padLength: number;
  includesYear: boolean;
}

const SEQUENCE_DEFINITIONS: Record<DocumentSequenceType, SequenceDefinition> = {
  sales_invoice: { prefix: 'INV', padLength: 4, includesYear: true },
  purchase_invoice: { prefix: 'PUR', padLength: 4, includesYear: true },
  journal_entry: { prefix: 'JV', padLength: 4, includesYear: true },
  receipt_voucher: { prefix: 'RV', padLength: 4, includesYear: true },
  payment_voucher: { prefix: 'PV', padLength: 4, includesYear: true },
  credit_note: { prefix: 'CN', padLength: 4, includesYear: true },
  debit_note: { prefix: 'DN', padLength: 4, includesYear: true },
  simple_expense: { prefix: 'EXP', padLength: 4, includesYear: true },
  cashier_shift: { prefix: 'SH', padLength: 4, includesYear: true },
  branch: { prefix: 'BR', padLength: 2, includesYear: false },
  cash_register: { prefix: 'POS', padLength: 2, includesYear: false },
  parked_order: { prefix: 'HOLD', padLength: 2, includesYear: false },
};

const STORAGE_KEY = 'accounting_document_sequences_v1';

export class DocumentSequenceService {
  private static instance: DocumentSequenceService;
  private sequenceStore: Record<string, number> = {};

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): DocumentSequenceService {
    if (!DocumentSequenceService.instance) {
      DocumentSequenceService.instance = new DocumentSequenceService();
    }
    return DocumentSequenceService.instance;
  }

  private getStoreKey(type: DocumentSequenceType, year?: number): string {
    const def = SEQUENCE_DEFINITIONS[type] || { prefix: type.toUpperCase(), padLength: 4, includesYear: true };
    if (def.includesYear) {
      const fiscalYear = year || new Date().getFullYear();
      return `${type}_${fiscalYear}`;
    }
    return type;
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.sequenceStore = JSON.parse(raw);
      }
    } catch {
      this.sequenceStore = {};
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sequenceStore));
    } catch {
      // Ignore quota storage issues
    }
  }

  /**
   * Extracts maximum numeric sequence from existing document numbers in memory.
   * Handles patterns like 'INV-2026-0005', 'PUR-2026-0012', 'BR-03', 'HOLD-02', etc.
   */
  public extractMaxSequence(
    type: DocumentSequenceType,
    existingNumbers: string[] = [],
    year?: number
  ): number {
    const def = SEQUENCE_DEFINITIONS[type];
    if (!def) return 0;

    const fiscalYear = year || new Date().getFullYear();
    let max = 0;

    for (const numStr of existingNumbers) {
      if (!numStr || typeof numStr !== 'string') continue;

      if (def.includesYear) {
        // e.g. INV-2026-0004 or JV-2026-0010
        const regex = new RegExp(`^${def.prefix}-${fiscalYear}-(\\d+)$`, 'i');
        const match = numStr.trim().match(regex);
        if (match && match[1]) {
          const parsed = parseInt(match[1], 10);
          if (!isNaN(parsed) && parsed > max) {
            max = parsed;
          }
        }
      } else {
        // e.g. BR-01 or POS-02 or HOLD-05
        const regex = new RegExp(`^${def.prefix}-(\\d+)$`, 'i');
        const match = numStr.trim().match(regex);
        if (match && match[1]) {
          const parsed = parseInt(match[1], 10);
          if (!isNaN(parsed) && parsed > max) {
            max = parsed;
          }
        }
      }
    }

    return max;
  }

  /**
   * Previews the next number without incrementing the sequence counter.
   */
  public peekNextNumber(
    type: DocumentSequenceType,
    year?: number,
    existingNumbers: string[] = []
  ): string {
    const def = SEQUENCE_DEFINITIONS[type] || { prefix: type.toUpperCase(), padLength: 4, includesYear: true };
    const fiscalYear = year || new Date().getFullYear();
    const key = this.getStoreKey(type, fiscalYear);

    const storedLast = this.sequenceStore[key] || 0;
    const maxExisting = this.extractMaxSequence(type, existingNumbers, fiscalYear);
    const nextSeq = Math.max(storedLast, maxExisting) + 1;

    const padded = nextSeq.toString().padStart(def.padLength, '0');
    return def.includesYear ? `${def.prefix}-${fiscalYear}-${padded}` : `${def.prefix}-${padded}`;
  }

  /**
   * Generates and commits the next sequence number.
   * Monotonically increases the stored sequence so deleted documents won't cause number reuse.
   */
  public getNextNumber(
    type: DocumentSequenceType,
    year?: number,
    existingNumbers: string[] = []
  ): string {
    const def = SEQUENCE_DEFINITIONS[type] || { prefix: type.toUpperCase(), padLength: 4, includesYear: true };
    const fiscalYear = year || new Date().getFullYear();
    const key = this.getStoreKey(type, fiscalYear);

    const storedLast = this.sequenceStore[key] || 0;
    const maxExisting = this.extractMaxSequence(type, existingNumbers, fiscalYear);
    const nextSeq = Math.max(storedLast, maxExisting) + 1;

    // Persist new allocated sequence
    this.sequenceStore[key] = nextSeq;
    this.saveToStorage();

    const padded = nextSeq.toString().padStart(def.padLength, '0');
    return def.includesYear ? `${def.prefix}-${fiscalYear}-${padded}` : `${def.prefix}-${padded}`;
  }

  /**
   * Explicitly records a used number so that sequence store recognizes it.
   */
  public recordUsedNumber(type: DocumentSequenceType, numberString: string, year?: number): void {
    const def = SEQUENCE_DEFINITIONS[type];
    if (!def || !numberString) return;

    const fiscalYear = year || new Date().getFullYear();
    const key = this.getStoreKey(type, fiscalYear);

    const max = this.extractMaxSequence(type, [numberString], fiscalYear);
    if (max > (this.sequenceStore[key] || 0)) {
      this.sequenceStore[key] = max;
      this.saveToStorage();
    }
  }

  /**
   * Synchronize sequence store with all current records.
   */
  public syncWithRecords(allData: {
    salesInvoices?: Array<{ invoiceNumber: string }>;
    purchaseInvoices?: Array<{ invoiceNumber: string }>;
    journalEntries?: Array<{ entryNumber: string }>;
    vouchers?: Array<{ voucherNumber: string; type: 'receipt' | 'payment' }>;
    debitCreditNotes?: Array<{ noteNumber: string; type: 'credit_note' | 'debit_note' }>;
    simpleExpenses?: Array<{ expenseNumber: string }>;
    cashierShifts?: Array<{ shiftNumber: string }>;
    branches?: Array<{ code: string }>;
    cashRegisters?: Array<{ code: string }>;
    parkedOrders?: Array<{ orderNumber: string }>;
    fiscalYear?: number;
  }): void {
    const year = allData.fiscalYear || new Date().getFullYear();

    if (allData.salesInvoices) {
      const max = this.extractMaxSequence('sales_invoice', allData.salesInvoices.map((s) => s.invoiceNumber), year);
      this.sequenceStore[`sales_invoice_${year}`] = Math.max(this.sequenceStore[`sales_invoice_${year}`] || 0, max);
    }

    if (allData.purchaseInvoices) {
      const max = this.extractMaxSequence('purchase_invoice', allData.purchaseInvoices.map((p) => p.invoiceNumber), year);
      this.sequenceStore[`purchase_invoice_${year}`] = Math.max(this.sequenceStore[`purchase_invoice_${year}`] || 0, max);
    }

    if (allData.journalEntries) {
      const max = this.extractMaxSequence('journal_entry', allData.journalEntries.map((j) => j.entryNumber), year);
      this.sequenceStore[`journal_entry_${year}`] = Math.max(this.sequenceStore[`journal_entry_${year}`] || 0, max);
    }

    if (allData.vouchers) {
      const rvNumbers = allData.vouchers.filter((v) => v.type === 'receipt').map((v) => v.voucherNumber);
      const pvNumbers = allData.vouchers.filter((v) => v.type === 'payment').map((v) => v.voucherNumber);
      const maxRv = this.extractMaxSequence('receipt_voucher', rvNumbers, year);
      const maxPv = this.extractMaxSequence('payment_voucher', pvNumbers, year);
      this.sequenceStore[`receipt_voucher_${year}`] = Math.max(this.sequenceStore[`receipt_voucher_${year}`] || 0, maxRv);
      this.sequenceStore[`payment_voucher_${year}`] = Math.max(this.sequenceStore[`payment_voucher_${year}`] || 0, maxPv);
    }

    if (allData.debitCreditNotes) {
      const cnNumbers = allData.debitCreditNotes.filter((n) => n.type === 'credit_note').map((n) => n.noteNumber);
      const dnNumbers = allData.debitCreditNotes.filter((n) => n.type === 'debit_note').map((n) => n.noteNumber);
      const maxCn = this.extractMaxSequence('credit_note', cnNumbers, year);
      const maxDn = this.extractMaxSequence('debit_note', dnNumbers, year);
      this.sequenceStore[`credit_note_${year}`] = Math.max(this.sequenceStore[`credit_note_${year}`] || 0, maxCn);
      this.sequenceStore[`debit_note_${year}`] = Math.max(this.sequenceStore[`debit_note_${year}`] || 0, maxDn);
    }

    if (allData.simpleExpenses) {
      const max = this.extractMaxSequence('simple_expense', allData.simpleExpenses.map((e) => e.expenseNumber), year);
      this.sequenceStore[`simple_expense_${year}`] = Math.max(this.sequenceStore[`simple_expense_${year}`] || 0, max);
    }

    if (allData.cashierShifts) {
      const max = this.extractMaxSequence('cashier_shift', allData.cashierShifts.map((s) => s.shiftNumber), year);
      this.sequenceStore[`cashier_shift_${year}`] = Math.max(this.sequenceStore[`cashier_shift_${year}`] || 0, max);
    }

    if (allData.branches) {
      const max = this.extractMaxSequence('branch', allData.branches.map((b) => b.code));
      this.sequenceStore['branch'] = Math.max(this.sequenceStore['branch'] || 0, max);
    }

    if (allData.cashRegisters) {
      const max = this.extractMaxSequence('cash_register', allData.cashRegisters.map((r) => r.code));
      this.sequenceStore['cash_register'] = Math.max(this.sequenceStore['cash_register'] || 0, max);
    }

    if (allData.parkedOrders) {
      const max = this.extractMaxSequence('parked_order', allData.parkedOrders.map((o) => o.orderNumber));
      this.sequenceStore['parked_order'] = Math.max(this.sequenceStore['parked_order'] || 0, max);
    }

    this.saveToStorage();
  }

  public resetSequences(): void {
    this.sequenceStore = {};
    this.saveToStorage();
  }
}

export const documentSequenceService = DocumentSequenceService.getInstance();
