import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Account,
  SalesInvoice,
  PurchaseInvoice,
  Customer,
  Supplier,
  InventoryItem,
  StockMovement,
  JournalEntry,
  JournalEntryLine,
  CompanySettings,
  VatReturnReport,
  PaymentMethod,
  PaymentStatus,
  InvoiceType,
  InvoiceItem,
  CashFlowStatement,
  DebitCreditNote,
  Voucher,
  SimpleExpenseInvoice,
  ApiKey,
  FiscalYearClosing,
  Branch,
  CashRegister,
  CashierShift,
  ParkedOrder,
  DependencyCheckResult,
  DocumentStatus,
  DocumentType,
  AuditLogEntry,
  AuditLogAction,
  AuditLogEntityType,
  FinancialPeriod,
} from '../types/accounting';
import { DEFAULT_CHART_OF_ACCOUNTS } from '../data/defaultChartOfAccounts';
import {
  DEFAULT_COMPANY_SETTINGS,
  INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS,
  INITIAL_INVENTORY,
  INITIAL_SALES_INVOICES,
  INITIAL_PURCHASE_INVOICES,
  INITIAL_JOURNAL_ENTRIES,
  INITIAL_DEBIT_CREDIT_NOTES,
  INITIAL_VOUCHERS,
  INITIAL_SIMPLE_EXPENSES,
  INITIAL_API_KEYS,
  INITIAL_FISCAL_CLOSINGS,
  INITIAL_BRANCHES,
  INITIAL_CASH_REGISTERS,
  INITIAL_CASHIER_SHIFTS,
  INITIAL_PARKED_ORDERS,
  INITIAL_FINANCIAL_PERIODS,
} from '../data/initialData';
import {
  generateDefaultFinancialPeriods,
  isDateInClosedPeriod,
  checkDateInFiscalYear,
  isReportEligibleJournalEntry,
  getPeriodForDate,
} from '../utils/fiscalPeriodUtils';
import { generateZatcaTlvBase64 } from '../utils/zatca';
import { tafqeetArabic } from '../utils/currency';
import { getAccountingRepository } from '../services/dataService';
import { generateUUID, generateEntityId } from '../utils/uuid';
import { documentSequenceService } from '../services/documentSequenceService';
import { roundMoney, moneyAdd, moneySub, moneyEquals, isZeroMoney } from '../utils/money';
import { auditLogService } from '../services/auditLogService';
import {
  validateJournalEntry,
  validateAccountForPosting,
  validateJournalLine,
  assertValidJournalEntry,
  JournalValidationError,
  JournalValidationResult,
} from '../services/journalValidationService';
import {
  validateSaleInventory,
  assertSaleInventory,
  validatePurchaseInventory,
  checkDirectStockEditAllowed,
  InventoryValidationError,
  InventoryValidationResult,
  InventoryShortage,
} from '../services/inventoryValidationService';
import {
  savePreImportEmergencyBackup,
  getPreImportEmergencyBackup,
  EmergencyBackupRecord,
  validateAccountingBackupJson,
  BackupValidationResult,
} from '../services/dataValidationService';

interface AccountingContextType {
  accounts: Account[];
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  debitCreditNotes: DebitCreditNote[];
  vouchers: Voucher[];
  simpleExpenses: SimpleExpenseInvoice[];
  apiKeys: ApiKey[];
  fiscalClosings: FiscalYearClosing[];
  customers: Customer[];
  suppliers: Supplier[];
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  journalEntries: JournalEntry[];
  companySettings: CompanySettings;
  auditLogs: AuditLogEntry[];
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Branches & POS Registers
  branches: Branch[];
  cashRegisters: CashRegister[];
  cashierShifts: CashierShift[];
  parkedOrders: ParkedOrder[];
  activeBranchId: string;
  setActiveBranchId: (id: string) => void;
  activeRegisterId: string;
  setActiveRegisterId: (id: string) => void;
  activeShift: CashierShift | undefined;

  startCashierShift: (registerId: string, cashierName: string, openingCash: number) => CashierShift;
  closeCashierShift: (shiftId: string, actualCash: number, closingNotes?: string) => CashierShift;
  cashDropShift: (shiftId: string, amount: number, notes?: string) => void;

  parkOrder: (order: Omit<ParkedOrder, 'id' | 'savedAt' | 'orderNumber'>) => ParkedOrder;
  resumeParkedOrder: (orderId: string) => ParkedOrder | undefined;
  deleteParkedOrder: (orderId: string) => void;

  processPosSale: (saleData: {
    items: Array<{
      itemId?: string;
      nameAr: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      discount: number;
      vatRate: number;
      vatAmount: number;
      subtotal: number;
      totalWithVat: number;
    }>;
    customerId?: string;
    customerName?: string;
    customerVatNumber?: string;
    paymentMethod: PaymentMethod;
    paidAmount: number;
    cashTendered?: number;
    changeReturned?: number;
    madaAuthCode?: string;
    splitPaymentDetails?: {
      cashAmount: number;
      madaAmount: number;
    };
    discountTotal?: number;
    notes?: string;
  }) => Promise<SalesInvoice>;

  // Document Lifecycle & Actions
  postDocument: (type: DocumentType, id: string) => Promise<void>;
  cancelDraftDocument: (type: DocumentType, id: string, reason?: string) => Promise<void>;
  reversePostedDocument: (type: DocumentType, id: string, reversalReason: string, reversalDate?: string) => Promise<JournalEntry>;

  // Invoice & Accounting Operations
  createSalesInvoice: (invoice: Omit<SalesInvoice, 'id' | 'uuid' | 'zatcaQrBase64' | 'journalEntryId'>) => Promise<SalesInvoice>;
  updateSalesInvoice: (id: string, invoice: Partial<SalesInvoice>) => void;
  deleteSalesInvoice: (id: string) => void;
  createPurchaseInvoice: (invoice: Omit<PurchaseInvoice, 'id' | 'journalEntryId'>) => Promise<PurchaseInvoice>;
  updatePurchaseInvoice: (id: string, invoice: Partial<PurchaseInvoice>) => void;
  deletePurchaseInvoice: (id: string) => void;
  createDebitCreditNote: (note: Omit<DebitCreditNote, 'id' | 'uuid' | 'zatcaQrBase64' | 'journalEntryId'>) => Promise<DebitCreditNote>;
  deleteDebitCreditNote: (id: string) => void;
  createVoucher: (voucher: Omit<Voucher, 'id' | 'amountInWordsAr' | 'journalEntryId' | 'createdAt'>) => Promise<Voucher>;
  deleteVoucher: (id: string) => void;
  createSimpleExpense: (expense: Omit<SimpleExpenseInvoice, 'id' | 'expenseNumber' | 'journalEntryId' | 'createdAt'>) => Promise<SimpleExpenseInvoice>;
  deleteSimpleExpense: (id: string) => void;
  recordInvoicePayment: (invoiceId: string, amount: number, paymentMethod: PaymentMethod) => void;
  createManualJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void;
  deleteJournalEntry: (id: string) => void;
  validateJournalEntry: (entry: Partial<JournalEntry> & { lines?: Partial<JournalEntryLine>[] }) => JournalValidationResult;
  validateAccountForPosting: (accountIdentifier: string) => { isValid: boolean; error?: string; account?: Account };

  // API Keys & Integrations
  createApiKey: (keyData: Omit<ApiKey, 'id' | 'key' | 'maskedKey' | 'createdAt' | 'isActive'>) => ApiKey;
  toggleApiKeyStatus: (id: string) => void;
  deleteApiKey: (id: string) => void;

  // Financial Year Closing & Migration
  closeFiscalYear: (year: number, closingDate: string, closedBy: string, notes?: string) => Promise<FiscalYearClosing>;
  reopenFiscalYear: (closingId: string) => Promise<void>;

  // Financial Periods Management
  financialPeriods: FinancialPeriod[];
  closeFinancialPeriod: (periodId: string, closedBy?: string, notes?: string) => Promise<FinancialPeriod>;
  reopenFinancialPeriod: (periodId: string, reason: string, reopenedBy?: string) => Promise<FinancialPeriod>;
  checkDateInFiscalPeriod: (dateStr: string) => { isClosed: boolean; period?: FinancialPeriod };
  checkDateInFiscalYear: (dateStr: string) => { isWithinYear: boolean; warningMessage?: string };

  // Master Data CRUD & Validation
  addCustomer: (customer: Omit<Customer, 'id' | 'balance'>) => Customer;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  toggleCustomerStatus: (id: string) => void;
  checkCustomerDependencies: (id: string) => DependencyCheckResult;

  addSupplier: (supplier: Omit<Supplier, 'id' | 'balance'>) => Supplier;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  toggleSupplierStatus: (id: string) => void;
  checkSupplierDependencies: (id: string) => DependencyCheckResult;

  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => InventoryItem;
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  toggleInventoryItemStatus: (id: string) => void;
  checkInventoryItemDependencies: (id: string) => DependencyCheckResult;
  adjustInventoryStock: (itemId: string, newStock: number, reason: string) => void;
  validateSaleInventory: (
    items: Array<{ itemId?: string; nameAr?: string; quantity: number | string; unitPrice?: number | string; discount?: number | string }>
  ) => InventoryValidationResult;
  validatePurchaseInventory: (
    items: Array<{ itemId?: string; nameAr?: string; quantity: number | string; unitPrice?: number | string }>
  ) => { isValid: boolean; errors: string[] };
  checkDirectStockEditAllowed: (itemId: string) => { canDirectlyEdit: boolean; movementsCount: number; message?: string };

  addAccount: (account: Omit<Account, 'id' | 'balance'>) => Account;
  updateAccount: (id: string, account: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  toggleAccountStatus: (id: string) => void;
  checkAccountDependencies: (id: string) => DependencyCheckResult;

  // Branch & POS Registers CRUD & Dependencies
  addBranch: (data: Omit<Branch, 'id' | 'createdAt'>) => Branch;
  updateBranch: (id: string, data: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;
  toggleBranchStatus: (id: string) => void;
  checkBranchDependencies: (id: string) => DependencyCheckResult;

  addCashRegister: (data: Omit<CashRegister, 'id'>) => CashRegister;
  updateCashRegister: (id: string, data: Partial<CashRegister>) => void;
  deleteCashRegister: (id: string) => void;
  toggleCashRegisterStatus: (id: string) => void;
  checkCashRegisterDependencies: (id: string) => DependencyCheckResult;

  updateCompanySettings: (settings: CompanySettings) => void;
  resetToDemoData: () => void;
  exportDataJson: () => string;
  importDataJson: (json: string) => boolean;
  validateBackupJson: (json: string) => BackupValidationResult;
  createPreImportEmergencyBackup: () => boolean;
  getEmergencyBackupRecord: () => EmergencyBackupRecord | null;
  restoreEmergencyBackup: () => boolean;
  clearAuditLogs: () => void;
  logAuditEvent: (params: {
    action: AuditLogAction;
    entityType: AuditLogEntityType;
    entityId: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    reason?: string;
    source?: 'web_ui' | 'pos_terminal' | 'import_file' | 'system_reset' | 'api_simulation';
    metadata?: Record<string, unknown>;
  }) => AuditLogEntry;

  // Financial Calculators & Statements
  getAccountStatement: (accountId: string, startDate?: string, endDate?: string) => {
    account: Account | undefined;
    lines: Array<{
      date: string;
      entryNumber: string;
      narration: string;
      debit: number;
      credit: number;
      balance: number;
    }>;
    totalDebit: number;
    totalCredit: number;
    closingBalance: number;
  };
  getIncomeStatement: (startDate?: string, endDate?: string) => {
    totalRevenue: number;
    cogs: number;
    grossProfit: number;
    operatingExpenses: number;
    netOperatingProfit: number;
    otherIncomeExpense: number;
    netProfit: number;
    revenueBreakdown: Array<{ name: string; amount: number; code: string }>;
    expenseBreakdown: Array<{ name: string; amount: number; code: string }>;
  };
  getBalanceSheet: (asOfDate?: string) => {
    totalAssets: number;
    currentAssets: number;
    nonCurrentAssets: number;
    totalLiabilities: number;
    currentLiabilities: number;
    nonCurrentLiabilities: number;
    totalEquity: number;
    retainedEarningsWithCurrentProfit: number;
    isBalanced: boolean;
    difference: number;
    assetAccounts: Account[];
    liabilityAccounts: Account[];
    equityAccounts: Account[];
  };
  getTrialBalance: (startDate?: string, endDate?: string) => Array<{
    account: Account;
    debit: number;
    credit: number;
    netDebit: number;
    netCredit: number;
    openingBalance: number;
    closingBalance: number;
  }>;
  getCashFlowStatement: (startDate?: string, endDate?: string) => CashFlowStatement;
  getVatReturn: (startDate?: string, endDate?: string, period?: string) => VatReturnReport;
}

const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

export const AccountingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const repo = getAccountingRepository();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => repo.loadCompanySettings());
  const [accounts, setAccounts] = useState<Account[]>(() => repo.loadAccounts());
  const [customers, setCustomers] = useState<Customer[]>(() => repo.loadCustomers());
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => repo.loadSuppliers());
  const [inventory, setInventory] = useState<InventoryItem[]>(() => repo.loadInventory());
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => repo.loadStockMovements());
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>(() => repo.loadSalesInvoices());
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>(() => repo.loadPurchaseInvoices());
  const [debitCreditNotes, setDebitCreditNotes] = useState<DebitCreditNote[]>(() => repo.loadDebitCreditNotes());
  const [vouchers, setVouchers] = useState<Voucher[]>(() => repo.loadVouchers());
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => repo.loadJournalEntries());
  const [simpleExpenses, setSimpleExpenses] = useState<SimpleExpenseInvoice[]>(() => repo.loadSimpleExpenses());
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(() => repo.loadApiKeys());
  const [fiscalClosings, setFiscalClosings] = useState<FiscalYearClosing[]>(() => repo.loadFiscalClosings());
  const [branches, setBranches] = useState<Branch[]>(() => repo.loadBranches());
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>(() => repo.loadCashRegisters());
  const [cashierShifts, setCashierShifts] = useState<CashierShift[]>(() => repo.loadCashierShifts());
  const [parkedOrders, setParkedOrders] = useState<ParkedOrder[]>(() => repo.loadParkedOrders());
  const [financialPeriods, setFinancialPeriods] = useState<FinancialPeriod[]>(() => repo.loadFinancialPeriods());
  const [activeBranchId, setActiveBranchId] = useState<string>(() => repo.loadActiveBranchId());
  const [activeRegisterId, setActiveRegisterId] = useState<string>(() => repo.loadActiveRegisterId());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => auditLogService.getLogs());

  const logAuditEvent = (params: {
    action: AuditLogAction;
    entityType: AuditLogEntityType;
    entityId: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    reason?: string;
    source?: 'web_ui' | 'pos_terminal' | 'import_file' | 'system_reset' | 'api_simulation';
    metadata?: Record<string, unknown>;
  }): AuditLogEntry => {
    const entry = auditLogService.logAction(params);
    setAuditLogs(auditLogService.getLogs());
    return entry;
  };

  const clearAuditLogs = () => {
    auditLogService.clearLogs();
    setAuditLogs([]);
  };

  // Check if a date falls in a closed financial period
  const checkDateInFiscalPeriod = (dateStr: string): { isClosed: boolean; period?: FinancialPeriod } => {
    return isDateInClosedPeriod(dateStr, financialPeriods);
  };

  // Check if a date is within the company's active fiscal year
  const checkDateInFiscalYearWrapper = (dateStr: string): { isWithinYear: boolean; warningMessage?: string } => {
    return checkDateInFiscalYear(
      dateStr,
      companySettings.fiscalYearStart,
      companySettings.fiscalYearEnd,
      companySettings.fiscalYear
    );
  };

  // Strict assertion: block creating/editing/deleting/posting documents in closed periods
  const assertDateNotInClosedPeriod = (dateStr?: string, docName: string = 'المستند') => {
    if (!dateStr) return;
    const { isClosed, period } = isDateInClosedPeriod(dateStr, financialPeriods);
    if (isClosed && period) {
      throw new Error(
        `لا يمكن إنشاء أو تعديل أو حذف أو ترحيل ${docName} بتاريخ (${dateStr.split('T')[0]}) لأنه يقع ضمن فترة مالية مقفلة (${period.nameAr}). يرجى إعادة فتح الفترة أولاً.`
      );
    }
  };

  // Close a financial period locally
  const closeFinancialPeriod = async (
    periodId: string,
    closedBy: string = 'المدير المالي المعتمد',
    notes?: string
  ): Promise<FinancialPeriod> => {
    const period = financialPeriods.find((p) => p.id === periodId);
    if (!period) throw new Error('الفترة المالية غير موجودة');
    if (period.status === 'closed') throw new Error('الفترة المالية مقفلة بالفعل');

    const nowIso = new Date().toISOString();
    const updatedPeriod: FinancialPeriod = {
      ...period,
      status: 'closed',
      closedAt: nowIso,
      closedBy,
      notes: notes || `تم إقفال الفترة المالية ${period.nameAr} محلياً.`,
    };

    const updatedPeriods = financialPeriods.map((p) => (p.id === periodId ? updatedPeriod : p));
    setFinancialPeriods(updatedPeriods);

    logAuditEvent({
      action: 'period_close',
      entityType: 'fiscal_period',
      entityId: periodId,
      before: period as unknown as Record<string, unknown>,
      after: updatedPeriod as unknown as Record<string, unknown>,
      reason: `إقفال الفترة المالية: ${period.nameAr} (${period.startDate} إلى ${period.endDate})`,
      source: 'web_ui',
      metadata: { periodName: period.nameAr, year: period.year, closedBy },
    });

    return updatedPeriod;
  };

  // Reopen a financial period (Mandates reason and logs to Audit Log)
  const reopenFinancialPeriod = async (
    periodId: string,
    reason: string,
    reopenedBy: string = 'المدير المالي المعتمد'
  ): Promise<FinancialPeriod> => {
    if (!reason || !reason.trim()) {
      throw new Error('لا يمكن إعادة فتح الفترة المالية دون إدخال سبب واضح ومبرر يسجل في سجل التدقيق (Audit Log).');
    }

    const period = financialPeriods.find((p) => p.id === periodId);
    if (!period) throw new Error('الفترة المالية غير موجودة');
    if (period.status === 'open') throw new Error('الفترة المالية مفتوحة بالفعل');

    const nowIso = new Date().toISOString();
    const updatedPeriod: FinancialPeriod = {
      ...period,
      status: 'open',
      reopenedAt: nowIso,
      reopenedBy,
      reopenReason: reason.trim(),
    };

    const updatedPeriods = financialPeriods.map((p) => (p.id === periodId ? updatedPeriod : p));
    setFinancialPeriods(updatedPeriods);

    logAuditEvent({
      action: 'period_reopen',
      entityType: 'fiscal_period',
      entityId: periodId,
      before: period as unknown as Record<string, unknown>,
      after: updatedPeriod as unknown as Record<string, unknown>,
      reason: `إعادة فتح الفترة المالية ${period.nameAr} - السبب: ${reason.trim()}`,
      source: 'web_ui',
      metadata: { periodName: period.nameAr, year: period.year, reopenedBy, reopenReason: reason.trim() },
    });

    return updatedPeriod;
  };

  // Calculate current active shift for active register
  const activeShift = cashierShifts.find(
    (s) => s.registerId === activeRegisterId && s.status === 'open'
  );

  // Save to persistence layer via Repository
  useEffect(() => {
    // Sync documentSequenceService store with all active records
    documentSequenceService.syncWithRecords({
      salesInvoices,
      purchaseInvoices,
      journalEntries,
      vouchers,
      debitCreditNotes,
      simpleExpenses,
      cashierShifts,
      branches,
      cashRegisters,
      parkedOrders,
      fiscalYear: companySettings.fiscalYear || new Date().getFullYear(),
    });
  }, []);

  useEffect(() => {
    repo.saveCompanySettings(companySettings);
    repo.saveAccounts(accounts);
    repo.saveCustomers(customers);
    repo.saveSuppliers(suppliers);
    repo.saveInventory(inventory);
    repo.saveStockMovements(stockMovements);
    repo.saveSalesInvoices(salesInvoices);
    repo.savePurchaseInvoices(purchaseInvoices);
    repo.saveDebitCreditNotes(debitCreditNotes);
    repo.saveVouchers(vouchers);
    repo.saveSimpleExpenses(simpleExpenses);
    repo.saveApiKeys(apiKeys);
    repo.saveFiscalClosings(fiscalClosings);
    repo.saveFinancialPeriods(financialPeriods);
    repo.saveJournalEntries(journalEntries);
    repo.saveBranches(branches);
    repo.saveCashRegisters(cashRegisters);
    repo.saveCashierShifts(cashierShifts);
    repo.saveParkedOrders(parkedOrders);
    repo.saveActiveBranchId(activeBranchId);
    repo.saveActiveRegisterId(activeRegisterId);
  }, [
    companySettings,
    accounts,
    customers,
    suppliers,
    inventory,
    stockMovements,
    salesInvoices,
    purchaseInvoices,
    debitCreditNotes,
    vouchers,
    simpleExpenses,
    apiKeys,
    fiscalClosings,
    financialPeriods,
    journalEntries,
    branches,
    cashRegisters,
    cashierShifts,
    parkedOrders,
    activeBranchId,
    activeRegisterId,
  ]);

  const getDocFiscalYear = (dateStr?: string): number => {
    if (dateStr) {
      const parsed = parseInt(dateStr.split('-')[0], 10);
      if (!isNaN(parsed) && parsed > 2000) return parsed;
    }
    return companySettings.fiscalYear || new Date().getFullYear();
  };

  // Recalculate account balances based on journal entries
  const recalculateAccountBalances = (entries: JournalEntry[], baseAccounts: Account[]): Account[] => {
    const balances: Record<string, number> = {};

    entries.forEach((entry) => {
      // Exclude non-eligible entries (draft, cancelled, reversed, or reversal entries)
      if (!isReportEligibleJournalEntry(entry)) return;

      entry.lines.forEach((line) => {
        if (balances[line.accountId] === undefined) balances[line.accountId] = 0;
        const targetAcc = baseAccounts.find((a) => a.id === line.accountId);
        if (targetAcc) {
          const debitAmt = roundMoney(line.debit);
          const creditAmt = roundMoney(line.credit);
          if (targetAcc.nature === 'debit') {
            balances[line.accountId] = moneyAdd(balances[line.accountId], moneySub(debitAmt, creditAmt));
          } else {
            balances[line.accountId] = moneyAdd(balances[line.accountId], moneySub(creditAmt, debitAmt));
          }
        }
      });
    });

    return baseAccounts.map((acc) => {
      if (balances[acc.id] !== undefined) {
        return { ...acc, balance: roundMoney(balances[acc.id]) };
      }
      return acc;
    });
  };

  // Create Sales Invoice with ZATCA TLV, Sequence Service & Auto Double-Entry
  const createSalesInvoice = async (invoiceData: Omit<SalesInvoice, 'id' | 'uuid' | 'zatcaQrBase64' | 'journalEntryId'>): Promise<SalesInvoice> => {
    const newId = generateEntityId('inv');
    const uuid = generateUUID();
    const nowIso = new Date().toISOString();
    const [issueDate, issueTimePart] = nowIso.split('T');
    const issueTime = issueTimePart ? issueTimePart.substring(0, 8) : '12:00:00';
    const effectiveDate = invoiceData.issueDate || issueDate;
    assertDateNotInClosedPeriod(effectiveDate, 'فاتورة مبيعات');

    const fiscalYear = getDocFiscalYear(effectiveDate);

    // Monotonic Document Sequence
    const invoiceNumber = invoiceData.invoiceNumber && !invoiceData.invoiceNumber.startsWith('INV-AUTO')
      ? invoiceData.invoiceNumber
      : documentSequenceService.getNextNumber('sales_invoice', fiscalYear, salesInvoices.map((s) => s.invoiceNumber));

    const tlvBase64 = generateZatcaTlvBase64({
      sellerName: companySettings.nameAr,
      vatNumber: companySettings.vatNumber,
      timestamp: `${effectiveDate}T${issueTime}Z`,
      totalAmount: invoiceData.totalAmount,
      vatAmount: invoiceData.vatTotal,
    });

    const status: DocumentStatus = invoiceData.status || 'posted';
    let jvId: string | undefined = undefined;
    let updatedJournalEntries = journalEntries;
    let updatedInventory = inventory;
    const newStockMovements: StockMovement[] = [];

    // Pre-issuance stock & price validation
    if (status === 'posted' || (status as string) === 'issued') {
      assertSaleInventory(invoiceData.items, inventory);
    } else {
      const vResult = validateSaleInventory(invoiceData.items, inventory);
      if (!vResult.isValid && vResult.invalidLines.length > 0) {
        throw new Error(vResult.errors[0]);
      }
    }

    // Only post to ledger and decrement stock if status is 'posted'
    if (status === 'posted') {
      let paymentAccId = 'acc_1102'; // Accounts Receivable
      let paymentAccCode = '1102';
      let paymentAccName = 'المدينون والعملاء التجاريون';

      if (invoiceData.paymentStatus === 'paid') {
        if (invoiceData.paymentMethod === 'cash') {
          paymentAccId = 'acc_110101';
          paymentAccCode = '110101';
          paymentAccName = 'الصندوق الرئيسي (النقدية بالخزينة)';
        } else if (invoiceData.paymentMethod === 'bank_transfer') {
          paymentAccId = 'acc_110102';
          paymentAccCode = '110102';
          paymentAccName = 'مصرف الراجحي - الحساب الجاري';
        } else if (invoiceData.paymentMethod === 'mada' || invoiceData.paymentMethod === 'pos_card') {
          paymentAccId = 'acc_110104';
          paymentAccCode = '110104';
          paymentAccName = 'حساب نقاط البيع ومدى وسيط';
        }
      }

      jvId = generateEntityId('jv');
      const jvNumber = documentSequenceService.getNextNumber('journal_entry', fiscalYear, journalEntries.map((j) => j.entryNumber));

      const lines = [
        {
          id: generateEntityId('jvl'),
          accountId: paymentAccId,
          accountCode: paymentAccCode,
          accountNameAr: paymentAccName,
          debit: invoiceData.totalAmount,
          credit: 0,
          description: `قيمة فاتورة مبيعات ${invoiceNumber} - ${invoiceData.customerName}`,
        },
        {
          id: generateEntityId('jvl'),
          accountId: 'acc_4101',
          accountCode: '4101',
          accountNameAr: 'إيرادات مبيعات السلع (خاضعة لضريبة 15%)',
          debit: 0,
          credit: invoiceData.taxableAmount,
          description: `إيراد مبيعات فاتورة ${invoiceNumber}`,
        },
        {
          id: generateEntityId('jvl'),
          accountId: 'acc_2102',
          accountCode: '2102',
          accountNameAr: 'ضريبة القيمة المضافة على المخرجات (مستحقة لهيئة الزكاة)',
          debit: 0,
          credit: invoiceData.vatTotal,
          description: `ضريبة مخرجات 15% ZATCA - ${invoiceNumber}`,
        },
      ];

      const newJournalEntry: JournalEntry = {
        id: jvId,
        entryNumber: jvNumber,
        date: invoiceData.issueDate || issueDate,
        referenceType: 'sales_invoice',
        referenceId: newId,
        referenceNumber: invoiceNumber,
        narrationAr: `إثبات فاتورة مبيعات ${invoiceNumber} للعميل: ${invoiceData.customerName}`,
        lines,
        totalDebit: invoiceData.totalAmount,
        totalCredit: invoiceData.totalAmount,
        isBalanced: true,
        status: 'posted',
        postedAt: nowIso,
        createdAt: nowIso,
      };

      updatedJournalEntries = [newJournalEntry, ...journalEntries];
      setJournalEntries(updatedJournalEntries);

      // Inventory stock & movements
      updatedInventory = inventory.map((item) => {
        const lineItem = invoiceData.items.find((i) => i.itemId === item.id);
        if (lineItem) {
          const prev = item.currentStock;
          const newQty = prev - lineItem.quantity;
          newStockMovements.push({
            id: generateEntityId('sm'),
            itemId: item.id,
            itemName: item.nameAr,
            date: invoiceData.issueDate || issueDate,
            type: 'sale',
            quantity: lineItem.quantity,
            previousStock: prev,
            newStock: newQty,
            referenceNumber: invoiceNumber,
            documentType: 'sales_invoice',
            documentId: newId,
            notes: `مبيعات فاتورة ${invoiceNumber}`,
          });
          return { ...item, currentStock: newQty };
        }
        return item;
      });
      setInventory(updatedInventory);
      if (newStockMovements.length > 0) {
        setStockMovements((prev) => [...newStockMovements, ...prev]);
      }

      // Customer Balance
      if (invoiceData.remainingAmount > 0 && invoiceData.customerId) {
        setCustomers((prev) =>
          prev.map((c) => (c.id === invoiceData.customerId ? { ...c, balance: c.balance + invoiceData.remainingAmount } : c))
        );
      }

      setAccounts((prevAccs) => recalculateAccountBalances(updatedJournalEntries, prevAccs));
    }

    const newInvoice: SalesInvoice = {
      ...invoiceData,
      id: newId,
      invoiceNumber,
      uuid,
      issueDate: invoiceData.issueDate || issueDate,
      issueTime,
      zatcaQrBase64: tlvBase64,
      journalEntryId: jvId,
      status,
      postedAt: status === 'posted' ? nowIso : undefined,
    };

    setSalesInvoices([newInvoice, ...salesInvoices]);

    logAuditEvent({
      action: status === 'posted' ? 'post' : 'create',
      entityType: 'sales_invoice',
      entityId: newInvoice.id,
      after: newInvoice as unknown as Record<string, unknown>,
      reason: `إنشاء فاتورة مبيعات ${newInvoice.invoiceNumber}`,
      source: 'web_ui',
      metadata: { invoiceNumber: newInvoice.invoiceNumber, totalAmount: newInvoice.totalAmount },
    });

    return newInvoice;
  };

  const updateSalesInvoice = (id: string, invoiceUpdate: Partial<SalesInvoice>) => {
    const existing = salesInvoices.find((i) => i.id === id);
    if (!existing) return;

    assertDateNotInClosedPeriod(existing.issueDate, 'فاتورة مبيعات');
    if (invoiceUpdate.issueDate) {
      assertDateNotInClosedPeriod(invoiceUpdate.issueDate, 'فاتورة مبيعات');
    }

    if (existing.status === 'posted' || existing.status === 'reversed') {
      const financialKeys = ['totalAmount', 'taxableAmount', 'vatTotal', 'subtotal', 'items', 'customerId'];
      const hasFinancialChange = financialKeys.some((k) => k in invoiceUpdate && (invoiceUpdate as any)[k] !== (existing as any)[k]);
      if (hasFinancialChange) {
        throw new Error('لا يمكن تعديل القيم المالية أو أطراف فاتورة مبيعات مُرحّلة. يرجى استخدام القيد العكسي أو إصدار إشعار دائن/مدين.');
      }
    }

    const updated = { ...existing, ...invoiceUpdate };
    setSalesInvoices((prev) => prev.map((inv) => (inv.id === id ? updated : inv)));

    logAuditEvent({
      action: 'update',
      entityType: 'sales_invoice',
      entityId: id,
      before: existing as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
      reason: `تعديل فاتورة مبيعات ${existing.invoiceNumber}`,
      source: 'web_ui',
    });
  };

  const deleteSalesInvoice = (id: string) => {
    const target = salesInvoices.find((i) => i.id === id);
    if (!target) return;

    assertDateNotInClosedPeriod(target.issueDate, 'فاتورة مبيعات');

    if (target.status === 'posted') {
      throw new Error('لا يمكن حذف فاتورة ضريبية مُرحّلة مباشرة حفاظاً على التسلسل المحاسبي والضريبي ZATCA. يرجى استخدام الإلغاء العكسي (Reverse/Credit Note).');
    }

    // If draft or cancelled, safe to remove cleanly
    if (target.journalEntryId) {
      setJournalEntries((prev) => prev.filter((j) => j.id !== target.journalEntryId));
    }
    setSalesInvoices((prev) => prev.filter((i) => i.id !== id));
  };

  // Create Purchase Invoice with Auto Double-Entry & Inventory Update
  const createPurchaseInvoice = async (purchaseData: Omit<PurchaseInvoice, 'id' | 'journalEntryId'>): Promise<PurchaseInvoice> => {
    const newId = generateEntityId('pur');
    const nowIso = new Date().toISOString();
    const [today] = nowIso.split('T');
    const effectiveDate = purchaseData.issueDate || today;
    assertDateNotInClosedPeriod(effectiveDate, 'فاتورة مشتريات');

    const fiscalYear = getDocFiscalYear(effectiveDate);

    // Monotonic Document Sequence
    const invoiceNumber = purchaseData.invoiceNumber && !purchaseData.invoiceNumber.startsWith('PUR-AUTO')
      ? purchaseData.invoiceNumber
      : documentSequenceService.getNextNumber('purchase_invoice', fiscalYear, purchaseInvoices.map((p) => p.invoiceNumber));

    const status: DocumentStatus = purchaseData.status || 'posted';
    let jvId: string | undefined = undefined;
    let updatedJournalEntries = journalEntries;
    let updatedInventory = inventory;
    const newStockMovements: StockMovement[] = [];

    // Validate purchase items
    const purVal = validatePurchaseInventory(purchaseData.items);
    if (!purVal.isValid) {
      throw new Error(purVal.errors[0] || 'بيانات بنود فاتورة المشتريات غير صالحة');
    }

    if (status === 'posted') {
      jvId = generateEntityId('jv');
      const jvNumber = documentSequenceService.getNextNumber('journal_entry', fiscalYear, journalEntries.map((j) => j.entryNumber));

      let creditAccId = 'acc_2101'; // Accounts Payable (Suppliers)
      let creditAccCode = '2101';
      let creditAccName = 'الدائنون والموردون التجاريون';

      if (purchaseData.paymentStatus === 'paid') {
        if (purchaseData.paymentMethod === 'cash') {
          creditAccId = 'acc_110101';
          creditAccCode = '110101';
          creditAccName = 'الصندوق الرئيسي (النقدية بالخزينة)';
        } else if (purchaseData.paymentMethod === 'bank_transfer') {
          creditAccId = 'acc_110102';
          creditAccCode = '110102';
          creditAccName = 'مصرف الراجحي - الحساب الجاري';
        }
      }

      const lines = [
        {
          id: generateEntityId('jvl'),
          accountId: 'acc_1103', // Inventory Asset
          accountCode: '1103',
          accountNameAr: 'المخزون السلعي (بضاعة بالمستودع)',
          debit: purchaseData.taxableAmount,
          credit: 0,
          description: `شراء بضاعة فاتورة مورد ${purchaseData.supplierInvoiceNumber}`,
        },
        {
          id: generateEntityId('jvl'),
          accountId: 'acc_1104', // Input VAT Recoverable
          accountCode: '1104',
          accountNameAr: 'ضريبة القيمة المضافة على المدخلات (مستردة)',
          debit: purchaseData.vatTotal,
          credit: 0,
          description: `ضريبة مدخلات 15% مستردة - فاتورة ${purchaseData.supplierInvoiceNumber}`,
        },
        {
          id: generateEntityId('jvl'),
          accountId: creditAccId,
          accountCode: creditAccCode,
          accountNameAr: creditAccName,
          debit: 0,
          credit: purchaseData.totalAmount,
          description: `مستحقات فاتورة مشتريات ${purchaseData.supplierName}`,
        },
      ];

      const newJournalEntry: JournalEntry = {
        id: jvId,
        entryNumber: jvNumber,
        date: purchaseData.issueDate || today,
        referenceType: 'purchase_invoice',
        referenceId: newId,
        referenceNumber: invoiceNumber,
        narrationAr: `إثبات فاتورة مشتريات ${invoiceNumber} من المورد: ${purchaseData.supplierName}`,
        lines,
        totalDebit: purchaseData.totalAmount,
        totalCredit: purchaseData.totalAmount,
        isBalanced: true,
        status: 'posted',
        postedAt: nowIso,
        createdAt: nowIso,
      };

      updatedJournalEntries = [newJournalEntry, ...journalEntries];
      setJournalEntries(updatedJournalEntries);

      // Update Inventory stock & movements
      updatedInventory = inventory.map((item) => {
        const lineItem = purchaseData.items.find((i) => i.itemId === item.id);
        if (lineItem) {
          const prev = item.currentStock;
          const newQty = prev + lineItem.quantity;
          newStockMovements.push({
            id: generateEntityId('sm'),
            itemId: item.id,
            itemName: item.nameAr,
            date: purchaseData.issueDate || today,
            type: 'purchase',
            quantity: lineItem.quantity,
            previousStock: prev,
            newStock: newQty,
            referenceNumber: invoiceNumber,
            documentType: 'purchase_invoice',
            documentId: newId,
            notes: `مشتريات من المورد ${purchaseData.supplierName}`,
          });
          return {
            ...item,
            currentStock: newQty,
            purchasePrice: lineItem.unitPrice,
          };
        }
        return item;
      });
      setInventory(updatedInventory);
      if (newStockMovements.length > 0) {
        setStockMovements((prev) => [...newStockMovements, ...prev]);
      }

      // Update Supplier balance if unpaid
      if (purchaseData.paymentStatus !== 'paid' && purchaseData.supplierId) {
        setSuppliers((prev) =>
          prev.map((s) => (s.id === purchaseData.supplierId ? { ...s, balance: s.balance + (purchaseData.totalAmount - (purchaseData.paidAmount || 0)) } : s))
        );
      }

      setAccounts((prevAccs) => recalculateAccountBalances(updatedJournalEntries, prevAccs));
    }

    const newPurchase: PurchaseInvoice = {
      ...purchaseData,
      id: newId,
      invoiceNumber,
      journalEntryId: jvId,
      status,
      postedAt: status === 'posted' ? nowIso : undefined,
    };

    setPurchaseInvoices([newPurchase, ...purchaseInvoices]);

    logAuditEvent({
      action: status === 'posted' ? 'post' : 'create',
      entityType: 'purchase_invoice',
      entityId: newPurchase.id,
      after: newPurchase as unknown as Record<string, unknown>,
      reason: `إنشاء فاتورة مشتريات ${newPurchase.invoiceNumber}`,
      source: 'web_ui',
      metadata: { invoiceNumber: newPurchase.invoiceNumber, totalAmount: newPurchase.totalAmount },
    });

    return newPurchase;
  };

  const updatePurchaseInvoice = (id: string, invoiceUpdate: Partial<PurchaseInvoice>) => {
    const existing = purchaseInvoices.find((p) => p.id === id);
    if (!existing) return;

    assertDateNotInClosedPeriod(existing.issueDate, 'فاتورة مشتريات');
    if (invoiceUpdate.issueDate) {
      assertDateNotInClosedPeriod(invoiceUpdate.issueDate, 'فاتورة مشتريات');
    }

    if (existing.status === 'posted' || existing.status === 'reversed') {
      const financialKeys = ['totalAmount', 'taxableAmount', 'vatTotal', 'subtotal', 'items', 'supplierId'];
      const hasFinancialChange = financialKeys.some((k) => k in invoiceUpdate && (invoiceUpdate as any)[k] !== (existing as any)[k]);
      if (hasFinancialChange) {
        throw new Error('لا يمكن تعديل القيم المالية أو أطراف فاتورة مشتريات مُرحّلة. يرجى استخدام القيد العكسي أو إصدار إشعار مدين.');
      }
    }

    const updated = { ...existing, ...invoiceUpdate };
    setPurchaseInvoices((prev) => prev.map((pur) => (pur.id === id ? updated : pur)));

    logAuditEvent({
      action: 'update',
      entityType: 'purchase_invoice',
      entityId: id,
      before: existing as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
      reason: `تعديل فاتورة مشتريات ${existing.invoiceNumber}`,
      source: 'web_ui',
    });
  };

  const deletePurchaseInvoice = (id: string) => {
    const target = purchaseInvoices.find((p) => p.id === id);
    if (!target) return;

    assertDateNotInClosedPeriod(target.issueDate, 'فاتورة مشتريات');

    if (target.status === 'posted') {
      throw new Error('لا يمكن حذف فاتورة مشتريات مُرحّلة مباشرة حفاظاً على التسلسل المحاسبي. يرجى استخدام الإلغاء العكسي.');
    }

    if (target.journalEntryId) {
      setJournalEntries((prev) => prev.filter((j) => j.id !== target.journalEntryId));
    }
    setPurchaseInvoices((prev) => prev.filter((p) => p.id !== id));
  };

  // Create Debit / Credit Note with ZATCA TLV & Auto Double-Entry
  const createDebitCreditNote = async (noteData: Omit<DebitCreditNote, 'id' | 'uuid' | 'zatcaQrBase64' | 'journalEntryId'>): Promise<DebitCreditNote> => {
    const newId = generateEntityId('note');
    const uuid = generateUUID();
    const nowIso = new Date().toISOString();
    const [issueDate, issueTimePart] = nowIso.split('T');
    const issueTime = issueTimePart ? issueTimePart.substring(0, 8) : '12:00:00';
    const effectiveDate = noteData.issueDate || issueDate;
    assertDateNotInClosedPeriod(effectiveDate, noteData.type === 'credit_note' ? 'إشعار دائن' : 'إشعار مدين');

    const fiscalYear = getDocFiscalYear(effectiveDate);

    // Monotonic Document Sequence
    const noteNumber = noteData.noteNumber && !noteData.noteNumber.startsWith('NOTE-AUTO')
      ? noteData.noteNumber
      : documentSequenceService.getNextNumber(
          noteData.type === 'credit_note' ? 'credit_note' : 'debit_note',
          fiscalYear,
          debitCreditNotes.filter((n) => n.type === noteData.type).map((n) => n.noteNumber)
        );

    const tlvBase64 = generateZatcaTlvBase64({
      sellerName: companySettings.nameAr,
      vatNumber: companySettings.vatNumber,
      timestamp: `${effectiveDate}T${noteData.issueTime || issueTime}Z`,
      totalAmount: noteData.totalAmount,
      vatAmount: noteData.vatTotal,
    });

    const status: DocumentStatus = noteData.status || 'posted';
    let jvId: string | undefined = undefined;
    let updatedJournalEntries = journalEntries;
    let updatedInventory = [...inventory];
    const newStockMovements: StockMovement[] = [];

    // Pre-validation for inventory
    if (noteData.affectInventory && noteData.items && noteData.items.length > 0) {
      if (noteData.type === 'debit_note' && noteData.partyType === 'supplier') {
        // Returning items to supplier reduces our stock, so verify we have enough stock!
        assertSaleInventory(noteData.items, inventory);
      } else {
        const pVal = validatePurchaseInventory(noteData.items);
        if (!pVal.isValid) throw new Error(pVal.errors[0]);
      }
    }

    if (status === 'posted') {
      jvId = generateEntityId('jv');
      const jvNumber = documentSequenceService.getNextNumber('journal_entry', fiscalYear, journalEntries.map((j) => j.entryNumber));
      const lines: Array<{
        id: string;
        accountId: string;
        accountCode: string;
        accountNameAr: string;
        debit: number;
        credit: number;
        description?: string;
      }> = [];

      // Auto Journal Entry configuration according to standard Saudi accounting & ZATCA rules:
      if (noteData.type === 'credit_note') {
        if (noteData.partyType === 'customer') {
          // Credit Note to Customer (مردودات مبيعات / تخفيض للعميل)
          const returnAcc = accounts.find((a) => a.code === '4102') || { id: 'acc_4101', code: '4101', nameAr: 'إيرادات مبيعات السلع (خاضعة لضريبة 15%)' };
          lines.push({
            id: generateEntityId('jvl'),
            accountId: returnAcc.id,
            accountCode: returnAcc.code,
            accountNameAr: returnAcc.nameAr,
            debit: noteData.taxableAmount,
            credit: 0,
            description: `إشعار دائن ${noteNumber} - ${noteData.reasonTextAr || 'مردودات ومسموحات مبيعات'}`,
          });

          lines.push({
            id: generateEntityId('jvl'),
            accountId: 'acc_2102',
            accountCode: '2102',
            accountNameAr: 'ضريبة القيمة المضافة على المخرجات (مستحقة لهيئة الزكاة)',
            debit: noteData.vatTotal,
            credit: 0,
            description: `تخفيض ضريبة المخرجات 15% بإشعار دائن ZATCA ${noteNumber}`,
          });

          let crAccId = 'acc_1102';
          let crAccCode = '1102';
          let crAccName = 'المدينون والعملاء التجاريون';

          if (noteData.refundMethod === 'cash') {
            crAccId = 'acc_110101';
            crAccCode = '110101';
            crAccName = 'الصندوق الرئيسي (النقدية بالخزينة)';
          } else if (noteData.refundMethod === 'bank_transfer') {
            crAccId = 'acc_110102';
            crAccCode = '110102';
            crAccName = 'مصرف الراجحي - الحساب الجاري';
          } else if (noteData.refundMethod === 'mada' || noteData.refundMethod === 'pos_card') {
            crAccId = 'acc_110104';
            crAccCode = '110104';
            crAccName = 'حساب نقاط البيع ومدى وسيط';
          }

          lines.push({
            id: generateEntityId('jvl'),
            accountId: crAccId,
            accountCode: crAccCode,
            accountNameAr: crAccName,
            debit: 0,
            credit: noteData.totalAmount,
            description: `تسوية إشعار دائن للعميل ${noteData.partyName}`,
          });
        } else {
          // Credit Note from Supplier
          lines.push({
            id: generateEntityId('jvl'),
            accountId: 'acc_1103',
            accountCode: '1103',
            accountNameAr: 'المخزون السلعي (بضاعة بالمستودع)',
            debit: noteData.taxableAmount,
            credit: 0,
            description: `إشعار دائن من المورد ${noteData.partyName}`,
          });
          lines.push({
            id: generateEntityId('jvl'),
            accountId: 'acc_1104',
            accountCode: '1104',
            accountNameAr: 'ضريبة القيمة المضافة على المدخلات (مستردة)',
            debit: noteData.vatTotal,
            credit: 0,
            description: `ضريبة مدخلات إشعار دائن مورد ${noteNumber}`,
          });
          lines.push({
            id: generateEntityId('jvl'),
            accountId: 'acc_2101',
            accountCode: '2101',
            accountNameAr: 'الدائنون والموردون التجاريون',
            debit: 0,
            credit: noteData.totalAmount,
            description: `استحقاق إشعار دائن للمورد ${noteData.partyName}`,
          });
        }
      } else {
        // Debit Note
        if (noteData.partyType === 'supplier') {
          // Debit Note to Supplier
          lines.push({
            id: generateEntityId('jvl'),
            accountId: 'acc_2101',
            accountCode: '2101',
            accountNameAr: 'الدائنون والموردون التجاريون',
            debit: noteData.totalAmount,
            credit: 0,
            description: `إشعار مدين للمورد ${noteData.partyName} - ${noteData.reasonTextAr || 'مردودات مشتريات'}`,
          });

          lines.push({
            id: generateEntityId('jvl'),
            accountId: 'acc_1103',
            accountCode: '1103',
            accountNameAr: 'المخزون السلعي (بضاعة بالمستودع)',
            debit: 0,
            credit: noteData.taxableAmount,
            description: `تخفيض المخزون بإشعار مدين ${noteNumber}`,
          });

          lines.push({
            id: generateEntityId('jvl'),
            accountId: 'acc_1104',
            accountCode: '1104',
            accountNameAr: 'ضريبة القيمة المضافة على المدخلات (مستردة)',
            debit: 0,
            credit: noteData.vatTotal,
            description: `تخفيض ضريبة المدخلات بإشعار مدين ${noteNumber}`,
          });
        } else {
          // Debit Note to Customer
          lines.push({
            id: generateEntityId('jvl'),
            accountId: 'acc_1102',
            accountCode: '1102',
            accountNameAr: 'المدينون والعملاء التجاريون',
            debit: noteData.totalAmount,
            credit: 0,
            description: `إشعار مدين للعميل ${noteData.partyName} - ${noteData.reasonTextAr || 'فروقات وفواتير إضافية'}`,
          });
          lines.push({
            id: generateEntityId('jvl'),
            accountId: 'acc_4101',
            accountCode: '4101',
            accountNameAr: 'إيرادات مبيعات السلع (خاضعة لضريبة 15%)',
            debit: 0,
            credit: noteData.taxableAmount,
            description: `إيرادات إشعار مدين ${noteNumber}`,
          });
          lines.push({
            id: generateEntityId('jvl'),
            accountId: 'acc_2102',
            accountCode: '2102',
            accountNameAr: 'ضريبة القيمة المضافة على المخرجات (مستحقة لهيئة الزكاة)',
            debit: 0,
            credit: noteData.vatTotal,
            description: `ضريبة مخرجات إشعار مدين ZATCA ${noteNumber}`,
          });
        }
      }

      const newJournalEntry: JournalEntry = {
        id: jvId,
        entryNumber: jvNumber,
        date: noteData.issueDate || issueDate,
        referenceType: noteData.type,
        referenceId: newId,
        referenceNumber: noteNumber,
        narrationAr: `إثبات ${noteData.type === 'credit_note' ? 'إشعار دائن (Credit Note)' : 'إشعار مدين (Debit Note)'} رقم ${noteNumber} - ${noteData.partyName}`,
        lines,
        totalDebit: noteData.totalAmount,
        totalCredit: noteData.totalAmount,
        isBalanced: true,
        status: 'posted',
        postedAt: nowIso,
        createdAt: nowIso,
      };

      updatedJournalEntries = [newJournalEntry, ...journalEntries];
      setJournalEntries(updatedJournalEntries);

      // Inventory stock & movements
      if (noteData.affectInventory && noteData.items && noteData.items.length > 0) {
        updatedInventory = inventory.map((item) => {
          const lineItem = noteData.items.find((i) => i.itemId === item.id);
          if (lineItem) {
            const prev = item.currentStock;
            const isAddingToStock = (noteData.type === 'credit_note' && noteData.partyType === 'customer') ||
                                    (noteData.type === 'debit_note' && noteData.partyType === 'customer');
            const newQty = isAddingToStock ? prev + lineItem.quantity : prev - lineItem.quantity;
            
            newStockMovements.push({
              id: generateEntityId('sm'),
              itemId: item.id,
              itemName: item.nameAr,
              date: noteData.issueDate || issueDate,
              type: isAddingToStock ? 'return_in' : 'return_out',
              quantity: lineItem.quantity,
              previousStock: prev,
              newStock: newQty,
              referenceNumber: noteNumber,
              documentType: noteData.type,
              documentId: newId,
              notes: `${noteData.type === 'credit_note' ? 'إشعار دائن' : 'إشعار مدين'}: ${noteData.reasonTextAr || ''}`,
            });

            return { ...item, currentStock: newQty };
          }
          return item;
        });
        setInventory(updatedInventory);
        if (newStockMovements.length > 0) {
          setStockMovements((prev) => [...newStockMovements, ...prev]);
        }
      }

      // Update Customer / Supplier Balances
      if (noteData.partyType === 'customer' && noteData.partyId) {
        setCustomers((prev) =>
          prev.map((c) => {
            if (c.id !== noteData.partyId) return c;
            if (noteData.type === 'credit_note' && noteData.refundMethod === 'account_balance') {
              return { ...c, balance: Math.max(0, c.balance - noteData.totalAmount) };
            } else if (noteData.type === 'debit_note') {
              return { ...c, balance: c.balance + noteData.totalAmount };
            }
            return c;
          })
        );
      } else if (noteData.partyType === 'supplier' && noteData.partyId) {
        setSuppliers((prev) =>
          prev.map((s) => {
            if (s.id !== noteData.partyId) return s;
            if (noteData.type === 'debit_note') {
              return { ...s, balance: Math.max(0, s.balance - noteData.totalAmount) };
            } else if (noteData.type === 'credit_note') {
              return { ...s, balance: s.balance + noteData.totalAmount };
            }
            return s;
          })
        );
      }

      setAccounts((prevAccs) => recalculateAccountBalances(updatedJournalEntries, prevAccs));
    }

    const newNote: DebitCreditNote = {
      ...noteData,
      id: newId,
      noteNumber,
      uuid,
      issueDate: noteData.issueDate || issueDate,
      issueTime: noteData.issueTime || issueTime,
      zatcaQrBase64: tlvBase64,
      journalEntryId: jvId,
      status,
      postedAt: status === 'posted' ? nowIso : undefined,
    };

    setDebitCreditNotes([newNote, ...debitCreditNotes]);

    logAuditEvent({
      action: status === 'posted' ? 'post' : 'create',
      entityType: 'debit_credit_note',
      entityId: newNote.id,
      after: newNote as unknown as Record<string, unknown>,
      reason: `إنشاء ${newNote.type === 'credit_note' ? 'إشعار دائن' : 'إشعار مدين'} ${newNote.noteNumber}`,
      source: 'web_ui',
      metadata: { noteNumber: newNote.noteNumber, totalAmount: newNote.totalAmount, type: newNote.type },
    });

    return newNote;
  };

  const deleteDebitCreditNote = (id: string) => {
    const target = debitCreditNotes.find((n) => n.id === id);
    if (!target) return;

    assertDateNotInClosedPeriod(target.issueDate, target.type === 'credit_note' ? 'إشعار دائن' : 'إشعار مدين');

    if (target.status === 'posted') {
      throw new Error('لا يمكن حذف إشعار دائن/مدين مُرحّل مباشرة حفاظاً على التسلسل الضريبي ZATCA. يرجى استخدام الإلغاء العكسي.');
    }

    if (target.journalEntryId) {
      setJournalEntries((prev) => prev.filter((j) => j.id !== target.journalEntryId));
    }
    setDebitCreditNotes((prev) => prev.filter((n) => n.id !== id));
  };

  // Create Receipt / Payment Voucher (سند قبض / سند صرف)
  const createVoucher = async (voucherData: Omit<Voucher, 'id' | 'amountInWordsAr' | 'journalEntryId' | 'createdAt'>): Promise<Voucher> => {
    const nowIso = new Date().toISOString();
    const [today] = nowIso.split('T');
    const effectiveDate = voucherData.date || today;
    assertDateNotInClosedPeriod(effectiveDate, voucherData.type === 'receipt' ? 'سند قبض' : 'سند صرف');

    // Validation: prevent paying an amount larger than remaining invoice balance
    if (voucherData.relatedInvoiceId) {
      if (voucherData.type === 'receipt') {
        const inv = salesInvoices.find(
          (i) => i.id === voucherData.relatedInvoiceId || i.invoiceNumber === voucherData.relatedInvoiceNumber
        );
        if (inv) {
          const remaining = inv.remainingAmount ?? (inv.totalAmount - inv.paidAmount);
          if (voucherData.amount > remaining + 0.001) {
            throw new Error(`لا يمكن سداد مبلغ (${voucherData.amount} ر.س) أكبر من المبلغ المتبقي على الفاتورة (${remaining} ر.س)`);
          }
        }
      } else if (voucherData.type === 'payment') {
        const pur = purchaseInvoices.find(
          (p) => p.id === voucherData.relatedInvoiceId || p.invoiceNumber === voucherData.relatedInvoiceNumber
        );
        if (pur) {
          const remaining = pur.totalAmount - (pur.paidAmount || 0);
          if (voucherData.amount > remaining + 0.001) {
            throw new Error(`لا يمكن صرف مبلغ (${voucherData.amount} ر.س) أكبر من المبلغ المتبقي على فاتورة المشتريات (${remaining} ر.س)`);
          }
        }
      }
    }

    const newId = generateEntityId('vch');
    const fiscalYear = getDocFiscalYear(effectiveDate);
    const amountInWords = tafqeetArabic(voucherData.amount);

    const seqType = voucherData.type === 'receipt' ? 'receipt_voucher' : 'payment_voucher';
    const voucherNumber = voucherData.voucherNumber && !voucherData.voucherNumber.startsWith('VCH-AUTO')
      ? voucherData.voucherNumber
      : documentSequenceService.getNextNumber(seqType, fiscalYear, vouchers.filter((v) => v.type === voucherData.type).map((v) => v.voucherNumber));

    const status: DocumentStatus = voucherData.status || 'posted';
    let jvId: string | undefined = undefined;
    let updatedJournalEntries = journalEntries;

    if (status === 'posted') {
      jvId = generateEntityId('jv');
      const jvNumber = documentSequenceService.getNextNumber('journal_entry', fiscalYear, journalEntries.map((j) => j.entryNumber));

      const lines = [
        {
          id: generateEntityId('jvl'),
          accountId: voucherData.debitAccountId,
          accountCode: voucherData.debitAccountCode,
          accountNameAr: voucherData.debitAccountNameAr,
          debit: voucherData.amount,
          credit: 0,
          description: `طرف مدين لسند ${voucherData.type === 'receipt' ? 'قبض' : 'صرف'} ${voucherNumber} - ${voucherData.partyName}`,
        },
        {
          id: generateEntityId('jvl'),
          accountId: voucherData.creditAccountId,
          accountCode: voucherData.creditAccountCode,
          accountNameAr: voucherData.creditAccountNameAr,
          debit: 0,
          credit: voucherData.amount,
          description: `طرف دائن لسند ${voucherData.type === 'receipt' ? 'قبض' : 'صرف'} ${voucherNumber} - ${voucherData.partyName}`,
        },
      ];

      const newJournalEntry: JournalEntry = {
        id: jvId,
        entryNumber: jvNumber,
        date: effectiveDate,
        referenceType: 'voucher',
        referenceId: newId,
        referenceNumber: voucherNumber,
        narrationAr: `${voucherData.type === 'receipt' ? 'سند قبض مالي' : 'سند صرف مالي'} رقم ${voucherNumber} - ${voucherData.partyName}: ${voucherData.description}`,
        lines,
        totalDebit: voucherData.amount,
        totalCredit: voucherData.amount,
        isBalanced: true,
        status: 'posted',
        postedAt: nowIso,
        createdAt: nowIso,
      };

      updatedJournalEntries = [newJournalEntry, ...journalEntries];
      setJournalEntries(updatedJournalEntries);

      // Update Customer or Supplier Balances & Invoices
      if (voucherData.type === 'receipt') {
        if (voucherData.partyType === 'customer' && voucherData.partyId) {
          setCustomers((prev) =>
            prev.map((c) => (c.id === voucherData.partyId ? { ...c, balance: Math.max(0, c.balance - voucherData.amount) } : c))
          );
        }
        if (voucherData.relatedInvoiceId) {
          setSalesInvoices((prev) =>
            prev.map((inv) => {
              if (inv.id === voucherData.relatedInvoiceId || inv.invoiceNumber === voucherData.relatedInvoiceNumber) {
                const newPaid = inv.paidAmount + voucherData.amount;
                const newRemaining = Math.max(0, inv.totalAmount - newPaid);
                return {
                  ...inv,
                  paidAmount: newPaid,
                  remainingAmount: newRemaining,
                  paymentStatus: newRemaining === 0 ? 'paid' : 'partial',
                };
              }
              return inv;
            })
          );
        }
      } else if (voucherData.type === 'payment') {
        if (voucherData.partyType === 'supplier' && voucherData.partyId) {
          setSuppliers((prev) =>
            prev.map((s) => (s.id === voucherData.partyId ? { ...s, balance: Math.max(0, s.balance - voucherData.amount) } : s))
          );
        }
        if (voucherData.relatedInvoiceId) {
          setPurchaseInvoices((prev) =>
            prev.map((inv) => {
              if (inv.id === voucherData.relatedInvoiceId || inv.invoiceNumber === voucherData.relatedInvoiceNumber) {
                const newPaid = (inv.paidAmount || 0) + voucherData.amount;
                const isPaid = newPaid >= inv.totalAmount;
                return {
                  ...inv,
                  paidAmount: newPaid,
                  paymentStatus: isPaid ? 'paid' : 'partial',
                };
              }
              return inv;
            })
          );
        }
      }

      setAccounts((prevAccs) => recalculateAccountBalances(updatedJournalEntries, prevAccs));
    }

    const newVoucher: Voucher = {
      ...voucherData,
      id: newId,
      voucherNumber,
      amountInWordsAr: amountInWords,
      journalEntryId: jvId,
      status,
      postedAt: status === 'posted' ? nowIso : undefined,
      createdAt: nowIso,
    };

    setVouchers([newVoucher, ...vouchers]);

    logAuditEvent({
      action: status === 'posted' ? 'post' : 'create',
      entityType: 'voucher',
      entityId: newVoucher.id,
      after: newVoucher as unknown as Record<string, unknown>,
      reason: `إنشاء ${newVoucher.type === 'receipt' ? 'سند قبض' : 'سند صرف'} ${newVoucher.voucherNumber}`,
      source: 'web_ui',
      metadata: { voucherNumber: newVoucher.voucherNumber, amount: newVoucher.amount, type: newVoucher.type },
    });

    return newVoucher;
  };

  const deleteVoucher = (id: string) => {
    const target = vouchers.find((v) => v.id === id);
    if (!target) return;

    assertDateNotInClosedPeriod(target.date, 'سند مالي');

    if (target.status === 'posted') {
      throw new Error('لا يمكن حذف سند قبض/صرف مُرحّل مباشرة حفاظاً على دقة القيود المحاسبية. يرجى استخدام القيد العكسي (Reverse).');
    }

    // 1. Remove draft journal entry if any
    let updatedJournal = journalEntries;
    if (target.journalEntryId) {
      updatedJournal = journalEntries.filter(
        (j) => j.id !== target.journalEntryId && j.referenceId !== target.id
      );
      setJournalEntries(updatedJournal);
    }

    // 2. Remove voucher from state
    setVouchers((prev) => prev.filter((v) => v.id !== id));
    setAccounts((prevAccs) => recalculateAccountBalances(updatedJournal, prevAccs));
  };

  // Create Simple Expense Invoice (فاتورة مصروفات بسيطة / نثريات / كهرباء / وقود / صيانة...)
  const createSimpleExpense = async (
    expenseData: Omit<SimpleExpenseInvoice, 'id' | 'expenseNumber' | 'journalEntryId' | 'createdAt'>
  ): Promise<SimpleExpenseInvoice> => {
    const newId = generateEntityId('exp');
    const nowIso = new Date().toISOString();
    const [today] = nowIso.split('T');
    const effectiveDate = expenseData.date || today;
    assertDateNotInClosedPeriod(effectiveDate, 'فاتورة مصروف');

    const fiscalYear = getDocFiscalYear(effectiveDate);

    const expNumber = documentSequenceService.getNextNumber(
      'simple_expense',
      fiscalYear,
      simpleExpenses.map((e) => e.expenseNumber)
    );

    const vatAmount = expenseData.vatRate > 0 ? Number((expenseData.amountBeforeVat * expenseData.vatRate).toFixed(2)) : 0;
    const totalAmount = Number((expenseData.amountBeforeVat + vatAmount).toFixed(2));
    const status: DocumentStatus = expenseData.status || 'posted';

    let jvId: string | undefined = undefined;
    let updatedJournalEntries = journalEntries;

    if (status === 'posted') {
      jvId = generateEntityId('jv');
      const jvNumber = documentSequenceService.getNextNumber('journal_entry', fiscalYear, journalEntries.map((j) => j.entryNumber));

      const lines = [
        {
          id: generateEntityId('jvl'),
          accountId: expenseData.expenseAccountId,
          accountCode: expenseData.expenseAccountCode,
          accountNameAr: expenseData.expenseAccountNameAr,
          debit: expenseData.amountBeforeVat,
          credit: 0,
          description: `إثبات مصروف: ${expenseData.title} - المورد: ${expenseData.vendorName}`,
        },
      ];

      if (vatAmount > 0) {
        lines.push({
          id: generateEntityId('jvl'),
          accountId: 'acc_1104',
          accountCode: '1104',
          accountNameAr: 'ضريبة القيمة المضافة على المدخلات (مستردة)',
          debit: vatAmount,
          credit: 0,
          description: `ضريبة مدخلات 15% لفاتورة مصروف ${expNumber}`,
        });
      }

      lines.push({
        id: generateEntityId('jvl'),
        accountId: expenseData.paidThroughAccountId,
        accountCode: expenseData.paidThroughAccountCode,
        accountNameAr: expenseData.paidThroughAccountNameAr,
        debit: 0,
        credit: totalAmount,
        description: `سداد فاتورة مصروف ${expNumber} من ${expenseData.paidThroughAccountNameAr}`,
      });

      const newJournalEntry: JournalEntry = {
        id: jvId,
        entryNumber: jvNumber,
        date: effectiveDate,
        referenceType: 'simple_expense',
        referenceId: newId,
        referenceNumber: expNumber,
        narrationAr: `فاتورة مصروفات ${expenseData.title} (${expenseData.vendorName}) - رقم: ${expNumber}`,
        lines,
        totalDebit: totalAmount,
        totalCredit: totalAmount,
        isBalanced: true,
        status: 'posted',
        postedAt: nowIso,
        createdAt: nowIso,
      };

      updatedJournalEntries = [newJournalEntry, ...journalEntries];
      setJournalEntries(updatedJournalEntries);
      setAccounts((prevAccs) => recalculateAccountBalances(updatedJournalEntries, prevAccs));
    }

    const newExpense: SimpleExpenseInvoice = {
      ...expenseData,
      id: newId,
      expenseNumber: expNumber,
      vatAmount,
      totalAmount,
      journalEntryId: jvId,
      status,
      postedAt: status === 'posted' ? nowIso : undefined,
      createdAt: nowIso,
    };

    setSimpleExpenses([newExpense, ...simpleExpenses]);

    logAuditEvent({
      action: status === 'posted' ? 'post' : 'create',
      entityType: 'simple_expense',
      entityId: newExpense.id,
      after: newExpense as unknown as Record<string, unknown>,
      reason: `إنشاء فاتورة مصروف ${newExpense.expenseNumber} (${newExpense.title})`,
      source: 'web_ui',
      metadata: { expenseNumber: newExpense.expenseNumber, totalAmount: newExpense.totalAmount },
    });

    return newExpense;
  };

  const deleteSimpleExpense = (id: string) => {
    const target = simpleExpenses.find((e) => e.id === id);
    if (!target) return;

    assertDateNotInClosedPeriod(target.date, 'فاتورة مصروف');

    if (target.status === 'posted') {
      throw new Error('لا يمكن حذف فاتورة مصروفات مرحّلة مباشرة. يرجى استخدام القيد العكسي (Reverse).');
    }

    let updatedJournal = journalEntries;
    if (target.journalEntryId) {
      updatedJournal = journalEntries.filter(
        (j) => j.id !== target.journalEntryId && j.referenceId !== target.id
      );
      setJournalEntries(updatedJournal);
    }

    setSimpleExpenses((prev) => prev.filter((e) => e.id !== id));
    setAccounts((prevAccs) => recalculateAccountBalances(updatedJournal, prevAccs));
  };

  // API Keys Management (Demo Presentation Layer)
  const createApiKey = (keyData: Omit<ApiKey, 'id' | 'key' | 'maskedKey' | 'createdAt' | 'isActive'>): ApiKey => {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const prefix = keyData.environment === 'production' ? 'demo_live_' : 'demo_test_';
    // The key generated is an active in-memory demo reference, not saved to localStorage or usable as real credential
    const key = `${prefix}${randomHex}_not_active`;
    const maskedKey = `${prefix}••••••••${randomHex.slice(-4)}`;

    const newApiKey: ApiKey = {
      ...keyData,
      id: `key_${Date.now()}`,
      key,
      maskedKey,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    setApiKeys((prev) => [newApiKey, ...prev]);

    logAuditEvent({
      action: 'create',
      entityType: 'api_key',
      entityId: newApiKey.id,
      after: { name: newApiKey.name, maskedKey: newApiKey.maskedKey, environment: newApiKey.environment },
      reason: `إنشاء مفتاح API تجريبي: ${newApiKey.name}`,
      source: 'web_ui',
      metadata: { keyName: newApiKey.name, environment: newApiKey.environment },
    });

    return newApiKey;
  };

  const toggleApiKeyStatus = (id: string) => {
    const target = apiKeys.find((k) => k.id === id);
    setApiKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, isActive: !k.isActive } : k))
    );

    if (target) {
      logAuditEvent({
        action: 'api_key_toggle',
        entityType: 'api_key',
        entityId: id,
        before: { name: target.name, isActive: target.isActive },
        after: { name: target.name, isActive: !target.isActive },
        reason: `${target.isActive ? 'تعطيل' : 'تفعيل'} مفتاح API تجريبي: ${target.name}`,
        source: 'web_ui',
      });
    }
  };

  const deleteApiKey = (id: string) => {
    const target = apiKeys.find((k) => k.id === id);
    setApiKeys((prev) => prev.filter((k) => k.id !== id));

    if (target) {
      logAuditEvent({
        action: 'delete',
        entityType: 'api_key',
        entityId: id,
        before: { name: target.name, maskedKey: target.maskedKey },
        reason: `حذف مفتاح API تجريبي: ${target.name}`,
        source: 'web_ui',
      });
    }
  };

  // Fiscal Year Closing & Account Roll-Forward (إقفال السنة المالية وترحيل الأرصدة)
  const closeFiscalYear = async (
    year: number,
    closingDate: string,
    closedBy: string,
    notes?: string
  ): Promise<FiscalYearClosing> => {
    const nowIso = new Date().toISOString();
    const jvId = `jv_close_${year}_${Date.now()}`;
    const jvNumber = `JV-CLOSE-${year}-0001`;

    // 1. Calculate balances of temporary accounts (4xxx Revenue & 5xxx Expenses)
    let totalRevenue = 0;
    let totalExpense = 0;
    const closingLines: Array<{
      id: string;
      accountId: string;
      accountCode: string;
      accountNameAr: string;
      debit: number;
      credit: number;
      description?: string;
    }> = [];

    // Temporary Revenue accounts (Class 4): credit balance -> Debit to zero out
    accounts.forEach((acc) => {
      if (acc.type === 'revenue' && acc.isTransactional) {
        const stmt = getAccountStatement(acc.id, undefined, closingDate);
        const netRevenue = stmt.totalCredit - stmt.totalDebit;
        if (netRevenue !== 0) {
          totalRevenue += netRevenue;
          closingLines.push({
            id: `jvl_close_${acc.id}`,
            accountId: acc.id,
            accountCode: acc.code,
            accountNameAr: acc.nameAr,
            debit: netRevenue > 0 ? netRevenue : 0,
            credit: netRevenue < 0 ? Math.abs(netRevenue) : 0,
            description: `إقفال حساب الإيرادات ${acc.nameAr} لنهاية سنة ${year}`,
          });
        }
      }
    });

    // Temporary Expense accounts (Class 5): debit balance -> Credit to zero out
    accounts.forEach((acc) => {
      if (acc.type === 'expense' && acc.isTransactional) {
        const stmt = getAccountStatement(acc.id, undefined, closingDate);
        const netExpense = stmt.totalDebit - stmt.totalCredit;
        if (netExpense !== 0) {
          totalExpense += netExpense;
          closingLines.push({
            id: `jvl_close_${acc.id}`,
            accountId: acc.id,
            accountCode: acc.code,
            accountNameAr: acc.nameAr,
            debit: netExpense < 0 ? Math.abs(netExpense) : 0,
            credit: netExpense > 0 ? netExpense : 0,
            description: `إقفال حساب المصروفات ${acc.nameAr} لنهاية سنة ${year}`,
          });
        }
      }
    });

    const netProfitOrLoss = totalRevenue - totalExpense;
    const retainedEarningsAcc = accounts.find((a) => a.code === '3102') || {
      id: 'acc_3102',
      code: '3102',
      nameAr: 'الأرباح المبقاة (المحتجزة)',
    };

    // Post net difference to Retained Earnings
    if (netProfitOrLoss > 0) {
      // Net Profit: Credit Retained Earnings
      closingLines.push({
        id: `jvl_close_retained`,
        accountId: retainedEarningsAcc.id,
        accountCode: retainedEarningsAcc.code,
        accountNameAr: retainedEarningsAcc.nameAr,
        debit: 0,
        credit: netProfitOrLoss,
        description: `ترحيل صافي أرباح السنة المالية ${year} لحساب الأرباح المبقاة`,
      });
    } else if (netProfitOrLoss < 0) {
      // Net Loss: Debit Retained Earnings
      closingLines.push({
        id: `jvl_close_retained`,
        accountId: retainedEarningsAcc.id,
        accountCode: retainedEarningsAcc.code,
        accountNameAr: retainedEarningsAcc.nameAr,
        debit: Math.abs(netProfitOrLoss),
        credit: 0,
        description: `ترحيل صافي خسارة السنة المالية ${year} لحساب الأرباح المبقاة`,
      });
    }

    const totalDebit = closingLines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = closingLines.reduce((sum, l) => sum + l.credit, 0);

    const closingJournalEntry: JournalEntry = {
      id: jvId,
      entryNumber: jvNumber,
      date: closingDate,
      referenceType: 'year_closing',
      referenceId: `close_${year}`,
      referenceNumber: `CLOSE-${year}`,
      narrationAr: `قيد الإقفال السنوي وترحيل أرباح وخسائر السنة المالية ${year} إلى حساب الأرباح المبقاة (3102)`,
      lines: closingLines,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      createdAt: nowIso,
    };

    const closingRecord: FiscalYearClosing = {
      id: `close_${year}`,
      year,
      closingDate,
      totalRevenue,
      totalExpense,
      netProfitOrLoss,
      retainedEarningsAccountId: retainedEarningsAcc.id,
      journalEntryId: jvId,
      journalEntryNumber: jvNumber,
      closedBy: closedBy || 'المدير المالي المعتمد',
      status: 'closed',
      notes: notes || `تم إقفال السنة المالية ${year} بنجاح وترحيل صافي ${netProfitOrLoss >= 0 ? 'الربح' : 'الخسارة'}`,
      createdAt: nowIso,
    };

    const updatedJournalEntries = [closingJournalEntry, ...journalEntries];
    setJournalEntries(updatedJournalEntries);
    setFiscalClosings((prev) => [closingRecord, ...prev.filter((c) => c.year !== year)]);
    setAccounts((prevAccs) => recalculateAccountBalances(updatedJournalEntries, prevAccs));

    return closingRecord;
  };

  const reopenFiscalYear = async (closingId: string) => {
    const closing = fiscalClosings.find((c) => c.id === closingId);
    if (!closing) return;

    let updatedJournal = journalEntries;
    if (closing.journalEntryId) {
      updatedJournal = journalEntries.filter((j) => j.id !== closing.journalEntryId);
      setJournalEntries(updatedJournal);
    }

    setFiscalClosings((prev) => prev.filter((c) => c.id !== closingId));
    setAccounts((prevAccs) => recalculateAccountBalances(updatedJournal, prevAccs));
  };

  // Record payment on existing invoice
  const recordInvoicePayment = (invoiceId: string, amount: number, paymentMethod: PaymentMethod) => {
    const inv = salesInvoices.find((i) => i.id === invoiceId);
    if (!inv) return;

    const [today] = new Date().toISOString().split('T');
    assertDateNotInClosedPeriod(today, 'تحصيل دفعة فاتورة');

    const newPaidAmount = inv.paidAmount + amount;
    const newRemaining = Math.max(0, inv.totalAmount - newPaidAmount);
    const newStatus: PaymentStatus = newRemaining === 0 ? 'paid' : 'partial';

    // Create Payment Receipt Journal Entry
    let targetAccId = 'acc_110101';
    let targetAccCode = '110101';
    let targetAccName = 'الصندوق الرئيسي (النقدية بالخزينة)';

    if (paymentMethod === 'bank_transfer') {
      targetAccId = 'acc_110102';
      targetAccCode = '110102';
      targetAccName = 'مصرف الراجحي - الحساب الجاري';
    } else if (paymentMethod === 'mada' || paymentMethod === 'pos_card') {
      targetAccId = 'acc_110104';
      targetAccCode = '110104';
      targetAccName = 'حساب نقاط البيع ومدى وسيط';
    }

    const fiscalYear = getDocFiscalYear(today);
    const jvId = generateEntityId('jv');
    const jvNumber = documentSequenceService.getNextNumber(
      'journal_entry',
      fiscalYear,
      journalEntries.map((j) => j.entryNumber)
    );

    const paymentEntry: JournalEntry = {
      id: jvId,
      entryNumber: jvNumber,
      date: today,
      referenceType: 'receipt',
      referenceId: inv.id,
      referenceNumber: inv.invoiceNumber,
      narrationAr: `سند قبض / تحصيل دفعة من فاتورة ${inv.invoiceNumber} للعميل ${inv.customerName}`,
      lines: [
        {
          id: `jvl_${Date.now()}_1`,
          accountId: targetAccId,
          accountCode: targetAccCode,
          accountNameAr: targetAccName,
          debit: amount,
          credit: 0,
          description: `تحصيل من العميل ${inv.customerName}`,
        },
        {
          id: `jvl_${Date.now()}_2`,
          accountId: 'acc_1102',
          accountCode: '1102',
          accountNameAr: 'المدينون والعملاء التجاريون',
          debit: 0,
          credit: amount,
          description: `تسوية حساب العميل عن فاتورة ${inv.invoiceNumber}`,
        },
      ],
      totalDebit: amount,
      totalCredit: amount,
      isBalanced: true,
      createdAt: new Date().toISOString(),
    };

    setSalesInvoices((prev) =>
      prev.map((i) =>
        i.id === invoiceId
          ? {
              ...i,
              paidAmount: newPaidAmount,
              remainingAmount: newRemaining,
              paymentStatus: newStatus,
            }
          : i
      )
    );

    if (inv.customerId) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === inv.customerId ? { ...c, balance: Math.max(0, c.balance - amount) } : c))
      );
    }

    const updatedJournalEntries = [paymentEntry, ...journalEntries];
    setJournalEntries(updatedJournalEntries);
    setAccounts((prevAccs) => recalculateAccountBalances(updatedJournalEntries, prevAccs));
  };

  // Manual Journal Entry
  const createManualJournalEntry = (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => {
    const newId = generateEntityId('jv');
    const nowIso = new Date().toISOString();
    const [today] = nowIso.split('T');
    const effectiveDate = entry.date || today;
    assertDateNotInClosedPeriod(effectiveDate, 'قيد يومية');

    const fiscalYear = getDocFiscalYear(effectiveDate);

    const entryNumber = entry.entryNumber && !entry.entryNumber.startsWith('JV-AUTO')
      ? entry.entryNumber
      : documentSequenceService.getNextNumber('journal_entry', fiscalYear, journalEntries.map((j) => j.entryNumber));

    const status: DocumentStatus = entry.status || 'posted';

    // Strict validation & sanitization:
    // - Checks sum of Debit === sum of Credit with 2-decimal precision (halala integer math).
    // - Prevents negative values, NaN, or Infinity on debit & credit.
    // - Prevents line having both debit > 0 and credit > 0.
    // - Prevents zero line (debit === 0 && credit === 0).
    // - Verifies all accounts exist, are active, and are transactional.
    // - Calculates totalDebit and totalCredit strictly from lines.
    // - Ignores incoming isBalanced or totalDebit/totalCredit.
    const { sanitizedEntry } = assertValidJournalEntry(
      {
        ...entry,
        id: newId,
        entryNumber,
        status,
        postedAt: status === 'posted' ? (entry.postedAt || nowIso) : undefined,
      },
      accounts
    );

    const updatedJournal = [sanitizedEntry, ...journalEntries];
    setJournalEntries(updatedJournal);
    setAccounts((prevAccs) => recalculateAccountBalances(updatedJournal, prevAccs));

    logAuditEvent({
      action: status === 'posted' ? 'post' : 'create',
      entityType: 'journal_entry',
      entityId: sanitizedEntry.id,
      after: sanitizedEntry as unknown as Record<string, unknown>,
      reason: `إنشاء قيد يومية يدوي ${sanitizedEntry.entryNumber} (${sanitizedEntry.narrationAr || ''})`,
      source: 'web_ui',
      metadata: { entryNumber: sanitizedEntry.entryNumber, totalDebit: sanitizedEntry.totalDebit },
    });
  };

  // -------------------------------------------------------------
  // Document Lifecycle Management (postDocument, cancelDraftDocument, reversePostedDocument)
  // -------------------------------------------------------------
  const postDocument = async (type: DocumentType, id: string): Promise<void> => {
    const nowIso = new Date().toISOString();
    const [today] = nowIso.split('T');

    if (type === 'sales_invoice') {
      const inv = salesInvoices.find((i) => i.id === id);
      if (!inv) throw new Error('فاتورة المبيعات غير موجودة');
      if (inv.status !== 'draft') throw new Error('فقط الفواتير بحالة مسودة (draft) يمكن ترحيلها');

      const effectiveDate = inv.issueDate || today;
      assertDateNotInClosedPeriod(effectiveDate, 'فاتورة مبيعات');

      // Pre-validation of stock availability
      assertSaleInventory(inv.items, inventory);

      const fiscalYear = getDocFiscalYear(effectiveDate);
      const jvId = generateEntityId('jv');
      const jvNumber = documentSequenceService.getNextNumber('journal_entry', fiscalYear, journalEntries.map((j) => j.entryNumber));

      let paymentAccId = 'acc_1102';
      let paymentAccCode = '1102';
      let paymentAccName = 'المدينون والعملاء التجاريون';

      if (inv.paymentStatus === 'paid') {
        if (inv.paymentMethod === 'cash') {
          paymentAccId = 'acc_110101';
          paymentAccCode = '110101';
          paymentAccName = 'الصندوق الرئيسي (النقدية بالخزينة)';
        } else if (inv.paymentMethod === 'bank_transfer') {
          paymentAccId = 'acc_110102';
          paymentAccCode = '110102';
          paymentAccName = 'مصرف الراجحي - الحساب الجاري';
        } else if (inv.paymentMethod === 'mada' || inv.paymentMethod === 'pos_card') {
          paymentAccId = 'acc_110104';
          paymentAccCode = '110104';
          paymentAccName = 'حساب نقاط البيع ومدى وسيط';
        }
      }

      const lines: JournalEntryLine[] = [
        {
          id: generateEntityId('jvl'),
          accountId: paymentAccId,
          accountCode: paymentAccCode,
          accountNameAr: paymentAccName,
          debit: inv.totalAmount,
          credit: 0,
          description: `إثبات مستحق/تحصيل فاتورة مبيعات ${inv.invoiceNumber} - ${inv.customerName}`,
        },
        {
          id: generateEntityId('jvl'),
          accountId: 'acc_4101',
          accountCode: '4101',
          accountNameAr: 'إيرادات المبيعات والخدمات',
          debit: 0,
          credit: inv.taxableAmount,
          description: `إيراد مبيعات فاتورة ${inv.invoiceNumber}`,
        },
      ];

      if (inv.vatTotal > 0) {
        lines.push({
          id: generateEntityId('jvl'),
          accountId: 'acc_2102',
          accountCode: '2102',
          accountNameAr: 'مستحقات ضريبة القيمة المضافة (ZATCA)',
          debit: 0,
          credit: inv.vatTotal,
          description: `ضريبة مخرجات 15% لفاتورة ${inv.invoiceNumber}`,
        });
      }

      const newJournalEntry: JournalEntry = {
        id: jvId,
        entryNumber: jvNumber,
        date: inv.issueDate || today,
        referenceType: 'sales_invoice',
        referenceId: inv.id,
        referenceNumber: inv.invoiceNumber,
        narrationAr: `إثبات فاتورة مبيعات ${inv.invoiceNumber} للعميل: ${inv.customerName}`,
        lines,
        totalDebit: inv.totalAmount,
        totalCredit: inv.totalAmount,
        isBalanced: true,
        status: 'posted',
        postedAt: nowIso,
        createdAt: nowIso,
      };

      const updatedJournal = [newJournalEntry, ...journalEntries];
      setJournalEntries(updatedJournal);

      // Decrement inventory stock
      const newStockMovements: StockMovement[] = [];
      const updatedInventory = inventory.map((item) => {
        const lineItem = inv.items.find((i) => i.itemId === item.id);
        if (lineItem) {
          const prevStock = item.currentStock;
          const newStock = prevStock - lineItem.quantity;
          newStockMovements.push({
            id: generateEntityId('sm'),
            itemId: item.id,
            itemName: item.nameAr,
            date: inv.issueDate || today,
            type: 'sale',
            quantity: lineItem.quantity,
            previousStock: prevStock,
            newStock: newStock,
            referenceNumber: inv.invoiceNumber,
            documentType: 'sales_invoice',
            documentId: inv.id,
            notes: `مبيعات ترحيل فاتورة ${inv.invoiceNumber}`,
          });
          return { ...item, currentStock: newStock };
        }
        return item;
      });
      setInventory(updatedInventory);
      if (newStockMovements.length > 0) {
        setStockMovements((prev) => [...newStockMovements, ...prev]);
      }

      // Customer Balance
      if (inv.remainingAmount > 0 && inv.customerId) {
        setCustomers((prev) =>
          prev.map((c) => (c.id === inv.customerId ? { ...c, balance: c.balance + inv.remainingAmount } : c))
        );
      }

      setSalesInvoices((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, status: 'posted', postedAt: nowIso, journalEntryId: jvId } : i
        )
      );
      setAccounts((prevAccs) => recalculateAccountBalances(updatedJournal, prevAccs));
    } else if (type === 'purchase_invoice') {
      const pur = purchaseInvoices.find((p) => p.id === id);
      if (!pur) throw new Error('فاتورة المشتريات غير موجودة');
      if (pur.status !== 'draft') throw new Error('فقط فواتير المشتريات بحالة مسودة يمكن ترحيلها');

      const effectiveDate = pur.issueDate || today;
      assertDateNotInClosedPeriod(effectiveDate, 'فاتورة مشتريات');

      const fiscalYear = getDocFiscalYear(effectiveDate);
      const jvId = generateEntityId('jv');
      const jvNumber = documentSequenceService.getNextNumber('journal_entry', fiscalYear, journalEntries.map((j) => j.entryNumber));

      let creditAccId = 'acc_2101';
      let creditAccCode = '2101';
      let creditAccName = 'الدائنون والموردون التجاريون';

      if (pur.paymentStatus === 'paid') {
        if (pur.paymentMethod === 'cash') {
          creditAccId = 'acc_110101';
          creditAccCode = '110101';
          creditAccName = 'الصندوق الرئيسي (النقدية بالخزينة)';
        } else if (pur.paymentMethod === 'bank_transfer') {
          creditAccId = 'acc_110102';
          creditAccCode = '110102';
          creditAccName = 'مصرف الراجحي - الحساب الجاري';
        }
      }

      const lines: JournalEntryLine[] = [
        {
          id: generateEntityId('jvl'),
          accountId: 'acc_1103',
          accountCode: '1103',
          accountNameAr: 'المخزون السلعي (بضاعة بالمستودع)',
          debit: pur.taxableAmount,
          credit: 0,
          description: `شراء بضاعة فاتورة مورد ${pur.supplierInvoiceNumber}`,
        },
      ];

      if (pur.vatTotal > 0) {
        lines.push({
          id: generateEntityId('jvl'),
          accountId: 'acc_1104',
          accountCode: '1104',
          accountNameAr: 'ضريبة القيمة المضافة على المدخلات (مستردة)',
          debit: pur.vatTotal,
          credit: 0,
          description: `ضريبة مدخلات 15% لفاتورة مشتريات ${pur.invoiceNumber}`,
        });
      }

      lines.push({
        id: generateEntityId('jvl'),
        accountId: creditAccId,
        accountCode: creditAccCode,
        accountNameAr: creditAccName,
        debit: 0,
        credit: pur.totalAmount,
        description: `استحقاق فاتورة مشتريات للمورد: ${pur.supplierName}`,
      });

      const newJournalEntry: JournalEntry = {
        id: jvId,
        entryNumber: jvNumber,
        date: pur.issueDate || today,
        referenceType: 'purchase_invoice',
        referenceId: pur.id,
        referenceNumber: pur.invoiceNumber,
        narrationAr: `فاتورة مشتريات رقم ${pur.invoiceNumber} من المورد ${pur.supplierName} - فاتورة مورد رقم ${pur.supplierInvoiceNumber}`,
        lines,
        totalDebit: pur.totalAmount,
        totalCredit: pur.totalAmount,
        isBalanced: true,
        status: 'posted',
        postedAt: nowIso,
        createdAt: nowIso,
      };

      const updatedJournal = [newJournalEntry, ...journalEntries];
      setJournalEntries(updatedJournal);

      // Increase Inventory stock
      const newStockMovements: StockMovement[] = [];
      const updatedInventory = inventory.map((item) => {
        const lineItem = pur.items.find((i) => i.itemId === item.id);
        if (lineItem) {
          const prevStock = item.currentStock;
          const newStock = prevStock + lineItem.quantity;
          newStockMovements.push({
            id: generateEntityId('sm'),
            itemId: item.id,
            itemName: item.nameAr,
            date: pur.issueDate || today,
            type: 'purchase',
            quantity: lineItem.quantity,
            previousStock: prevStock,
            newStock: newStock,
            referenceNumber: pur.invoiceNumber,
            documentType: 'purchase_invoice',
            documentId: pur.id,
            notes: `مشتريات ترحيل فاتورة ${pur.invoiceNumber}`,
          });
          return { ...item, currentStock: newStock };
        }
        return item;
      });
      setInventory(updatedInventory);
      if (newStockMovements.length > 0) {
        setStockMovements((prev) => [...newStockMovements, ...prev]);
      }

      // Update Supplier balance if unpaid/partial
      const unpaid = pur.totalAmount - (pur.paidAmount || 0);
      if (unpaid > 0 && pur.supplierId) {
        setSuppliers((prev) =>
          prev.map((s) => (s.id === pur.supplierId ? { ...s, balance: s.balance + unpaid } : s))
        );
      }

      setPurchaseInvoices((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'posted', postedAt: nowIso, journalEntryId: jvId } : p))
      );
      setAccounts((prevAccs) => recalculateAccountBalances(updatedJournal, prevAccs));
    } else if (type === 'debit_credit_note') {
      const note = debitCreditNotes.find((n) => n.id === id);
      if (!note) throw new Error('الإشعار غير موجود');
      if (note.status !== 'draft') throw new Error('فقط الإشعارات بحالة مسودة يمكن ترحيلها');

      const effectiveDate = note.issueDate || today;
      assertDateNotInClosedPeriod(effectiveDate, note.type === 'credit_note' ? 'إشعار دائن' : 'إشعار مدين');

      if (note.affectInventory && note.items && note.items.length > 0) {
        if (note.type === 'debit_note' && note.partyType === 'supplier') {
          assertSaleInventory(note.items, inventory);
        }
      }

      const fiscalYear = getDocFiscalYear(effectiveDate);
      const jvId = generateEntityId('jv');
      const jvNumber = documentSequenceService.getNextNumber('journal_entry', fiscalYear, journalEntries.map((j) => j.entryNumber));

      let lines: JournalEntryLine[] = [];
      if (note.type === 'credit_note') {
        lines = [
          {
            id: generateEntityId('jvl'),
            accountId: 'acc_4102',
            accountCode: '4102',
            accountNameAr: 'مردودات ومسموحات المبيعات',
            debit: note.taxableAmount,
            credit: 0,
            description: `إشعار دائن ${note.noteNumber} - ${note.reasonTextAr}`,
          },
        ];
        if (note.vatTotal > 0) {
          lines.push({
            id: generateEntityId('jvl'),
            accountId: 'acc_2102',
            accountCode: '2102',
            accountNameAr: 'مستحقات ضريبة القيمة المضافة (ZATCA)',
            debit: note.vatTotal,
            credit: 0,
            description: `تسوية ضريبة مخرجات لإشعار دائن ${note.noteNumber}`,
          });
        }
        lines.push({
          id: generateEntityId('jvl'),
          accountId: 'acc_1102',
          accountCode: '1102',
          accountNameAr: 'المدينون والعملاء التجاريون',
          debit: 0,
          credit: note.totalAmount,
          description: `تسوية رصيد العميل ${note.partyName} بموجب إشعار دائن ${note.noteNumber}`,
        });
      } else {
        lines = [
          {
            id: generateEntityId('jvl'),
            accountId: 'acc_1102',
            accountCode: '1102',
            accountNameAr: 'المدينون والعملاء التجاريون',
            debit: note.totalAmount,
            credit: 0,
            description: `قيد إشعار مدين ${note.noteNumber} على العميل ${note.partyName}`,
          },
          {
            id: generateEntityId('jvl'),
            accountId: 'acc_4101',
            accountCode: '4101',
            accountNameAr: 'إيرادات المبيعات والخدمات',
            debit: 0,
            credit: note.taxableAmount,
            description: `إيراد إضافي بموجب إشعار مدين ${note.noteNumber}`,
          },
        ];
        if (note.vatTotal > 0) {
          lines.push({
            id: generateEntityId('jvl'),
            accountId: 'acc_2102',
            accountCode: '2102',
            accountNameAr: 'مستحقات ضريبة القيمة المضافة (ZATCA)',
            debit: 0,
            credit: note.vatTotal,
            description: `ضريبة مخرجات لإشعار مدين ${note.noteNumber}`,
          });
        }
      }

      const newJournalEntry: JournalEntry = {
        id: jvId,
        entryNumber: jvNumber,
        date: effectiveDate,
        referenceType: note.type === 'credit_note' ? 'credit_note' : 'debit_note',
        referenceId: note.id,
        referenceNumber: note.noteNumber,
        narrationAr: `${note.type === 'credit_note' ? 'إشعار دائن ضريبي' : 'إشعار مدين ضريبي'} رقم ${note.noteNumber} للطرف ${note.partyName} - ${note.reasonTextAr}`,
        lines,
        totalDebit: note.totalAmount,
        totalCredit: note.totalAmount,
        isBalanced: true,
        status: 'posted',
        postedAt: nowIso,
        createdAt: nowIso,
      };

      const updatedJournal = [newJournalEntry, ...journalEntries];
      setJournalEntries(updatedJournal);

      // Return items to inventory if credit note
      if (note.affectInventory && note.items && note.items.length > 0) {
        const newStockMovements: StockMovement[] = [];
        const updatedInventory = inventory.map((item) => {
          const lineItem = note.items.find((i) => i.itemId === item.id);
          if (lineItem) {
            const prevStock = item.currentStock;
            const isAdding = note.type === 'credit_note';
            const newStock = isAdding ? prevStock + lineItem.quantity : prevStock - lineItem.quantity;
            newStockMovements.push({
              id: generateEntityId('sm'),
              itemId: item.id,
              itemName: item.nameAr,
              date: effectiveDate,
              type: isAdding ? 'return_in' : 'return_out',
              quantity: lineItem.quantity,
              previousStock: prevStock,
              newStock: newStock,
              referenceNumber: note.noteNumber,
              documentType: note.type,
              documentId: note.id,
              notes: `حركة مخزون ترحيل ${note.type === 'credit_note' ? 'إشعار دائن' : 'إشعار مدين'} ${note.noteNumber}`,
            });
            return { ...item, currentStock: newStock };
          }
          return item;
        });
        setInventory(updatedInventory);
        if (newStockMovements.length > 0) {
          setStockMovements((prev) => [...newStockMovements, ...prev]);
        }
      }

      // Adjust customer balance
      if (note.partyType === 'customer' && note.partyId) {
        setCustomers((prev) =>
          prev.map((c) => {
            if (c.id === note.partyId) {
              const updatedBal = note.type === 'credit_note'
                ? Math.max(0, c.balance - note.totalAmount)
                : c.balance + note.totalAmount;
              return { ...c, balance: updatedBal };
            }
            return c;
          })
        );
      }

      setDebitCreditNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'posted', postedAt: nowIso, journalEntryId: jvId } : n))
      );
      setAccounts((prevAccs) => recalculateAccountBalances(updatedJournal, prevAccs));
    } else if (type === 'voucher') {
      const vch = vouchers.find((v) => v.id === id);
      if (!vch) throw new Error('السند غير موجود');
      if (vch.status !== 'draft') throw new Error('فقط السندات بحالة مسودة يمكن ترحيلها');

      const effectiveDate = vch.date || today;
      assertDateNotInClosedPeriod(effectiveDate, vch.type === 'receipt' ? 'سند قبض' : 'سند صرف');

      const fiscalYear = getDocFiscalYear(effectiveDate);
      const jvId = generateEntityId('jv');
      const jvNumber = documentSequenceService.getNextNumber('journal_entry', fiscalYear, journalEntries.map((j) => j.entryNumber));

      const lines: JournalEntryLine[] = [
        {
          id: generateEntityId('jvl'),
          accountId: vch.debitAccountId,
          accountCode: vch.debitAccountCode,
          accountNameAr: vch.debitAccountNameAr,
          debit: vch.amount,
          credit: 0,
          description: `طرف مدين لسند ${vch.type === 'receipt' ? 'قبض' : 'صرف'} ${vch.voucherNumber} - ${vch.partyName}`,
        },
        {
          id: generateEntityId('jvl'),
          accountId: vch.creditAccountId,
          accountCode: vch.creditAccountCode,
          accountNameAr: vch.creditAccountNameAr,
          debit: 0,
          credit: vch.amount,
          description: `طرف دائن لسند ${vch.type === 'receipt' ? 'قبض' : 'صرف'} ${vch.voucherNumber} - ${vch.partyName}`,
        },
      ];

      const newJournalEntry: JournalEntry = {
        id: jvId,
        entryNumber: jvNumber,
        date: effectiveDate,
        referenceType: 'voucher',
        referenceId: vch.id,
        referenceNumber: vch.voucherNumber,
        narrationAr: `${vch.type === 'receipt' ? 'سند قبض مالي' : 'سند صرف مالي'} رقم ${vch.voucherNumber} - ${vch.partyName}: ${vch.description}`,
        lines,
        totalDebit: vch.amount,
        totalCredit: vch.amount,
        isBalanced: true,
        status: 'posted',
        postedAt: nowIso,
        createdAt: nowIso,
      };

      const updatedJournal = [newJournalEntry, ...journalEntries];
      setJournalEntries(updatedJournal);

      if (vch.type === 'receipt') {
        if (vch.partyType === 'customer' && vch.partyId) {
          setCustomers((prev) =>
            prev.map((c) => (c.id === vch.partyId ? { ...c, balance: Math.max(0, c.balance - vch.amount) } : c))
          );
        }
      } else if (vch.type === 'payment') {
        if (vch.partyType === 'supplier' && vch.partyId) {
          setSuppliers((prev) =>
            prev.map((s) => (s.id === vch.partyId ? { ...s, balance: Math.max(0, s.balance - vch.amount) } : s))
          );
        }
      }

      setVouchers((prev) =>
        prev.map((v) => (v.id === id ? { ...v, status: 'posted', postedAt: nowIso, journalEntryId: jvId } : v))
      );
      setAccounts((prevAccs) => recalculateAccountBalances(updatedJournal, prevAccs));
    } else if (type === 'simple_expense') {
      const exp = simpleExpenses.find((e) => e.id === id);
      if (!exp) throw new Error('المصروف غير موجود');
      if (exp.status !== 'draft') throw new Error('فقط المصروفات بحالة مسودة يمكن ترحيلها');

      const effectiveDate = exp.date || today;
      assertDateNotInClosedPeriod(effectiveDate, 'فاتورة مصروف');

      const fiscalYear = getDocFiscalYear(effectiveDate);
      const jvId = generateEntityId('jv');
      const jvNumber = documentSequenceService.getNextNumber('journal_entry', fiscalYear, journalEntries.map((j) => j.entryNumber));

      const lines: JournalEntryLine[] = [
        {
          id: generateEntityId('jvl'),
          accountId: exp.expenseAccountId,
          accountCode: exp.expenseAccountCode,
          accountNameAr: exp.expenseAccountNameAr,
          debit: exp.amountBeforeVat,
          credit: 0,
          description: `إثبات مصروف: ${exp.title} - المورد: ${exp.vendorName}`,
        },
      ];

      if (exp.vatAmount > 0) {
        lines.push({
          id: generateEntityId('jvl'),
          accountId: 'acc_1104',
          accountCode: '1104',
          accountNameAr: 'ضريبة القيمة المضافة على المدخلات (مستردة)',
          debit: exp.vatAmount,
          credit: 0,
          description: `ضريبة مدخلات 15% لفاتورة مصروف ${exp.expenseNumber}`,
        });
      }

      lines.push({
        id: generateEntityId('jvl'),
        accountId: exp.paidThroughAccountId,
        accountCode: exp.paidThroughAccountCode,
        accountNameAr: exp.paidThroughAccountNameAr,
        debit: 0,
        credit: exp.totalAmount,
        description: `سداد فاتورة مصروف ${exp.expenseNumber} من ${exp.paidThroughAccountNameAr}`,
      });

      const newJournalEntry: JournalEntry = {
        id: jvId,
        entryNumber: jvNumber,
        date: effectiveDate,
        referenceType: 'simple_expense',
        referenceId: exp.id,
        referenceNumber: exp.expenseNumber,
        narrationAr: `فاتورة مصروفات ${exp.title} (${exp.vendorName}) - رقم: ${exp.expenseNumber}`,
        lines,
        totalDebit: exp.totalAmount,
        totalCredit: exp.totalAmount,
        isBalanced: true,
        status: 'posted',
        postedAt: nowIso,
        createdAt: nowIso,
      };

      const updatedJournal = [newJournalEntry, ...journalEntries];
      setJournalEntries(updatedJournal);
      setSimpleExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: 'posted', postedAt: nowIso, journalEntryId: jvId } : e))
      );
      setAccounts((prevAccs) => recalculateAccountBalances(updatedJournal, prevAccs));
    } else if (type === 'journal_entry') {
      const entry = journalEntries.find((j) => j.id === id);
      if (!entry) throw new Error('القيد المحاسبي غير موجود');
      if (entry.status !== 'draft') throw new Error('فقط القيود بحالة مسودة يمكن ترحيلها');

      const effectiveDate = entry.date || today;
      assertDateNotInClosedPeriod(effectiveDate, 'قيد محاسبي');

      const updatedJournal = journalEntries.map((j) =>
        j.id === id ? { ...j, status: 'posted' as DocumentStatus, postedAt: nowIso } : j
      );
      setJournalEntries(updatedJournal);
      setAccounts((prevAccs) => recalculateAccountBalances(updatedJournal, prevAccs));
    }

    logAuditEvent({
      action: 'post',
      entityType: type === 'simple_expense' ? 'simple_expense' : (type as any),
      entityId: id,
      reason: `ترحيل مستند من نوع ${type} برقم معرف ${id}`,
      source: 'web_ui',
      metadata: { documentType: type, documentId: id },
    });
  };

  const cancelDraftDocument = async (type: DocumentType, id: string, reason?: string): Promise<void> => {
    const nowIso = new Date().toISOString();
    const cancellationReason = reason || 'إلغاء مسودة المستند قبل الترحيل';

    if (type === 'sales_invoice') {
      const target = salesInvoices.find((i) => i.id === id);
      if (!target) throw new Error('المستند غير موجود');
      assertDateNotInClosedPeriod(target.issueDate, 'فاتورة مبيعات');
      if (target.status === 'posted' || target.status === 'issued') {
        throw new Error('لا يمكن إلغاء مستند مُرحّل مباشرة؛ يجب استخدام القيد العكسي (reversePostedDocument).');
      }
      setSalesInvoices((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: 'cancelled', cancelledAt: nowIso, cancellationReason } : i))
      );
    } else if (type === 'purchase_invoice') {
      const target = purchaseInvoices.find((p) => p.id === id);
      if (!target) throw new Error('المستند غير موجود');
      assertDateNotInClosedPeriod(target.issueDate, 'فاتورة مشتريات');
      if (target.status === 'posted') {
        throw new Error('لا يمكن إلغاء مستند مُرحّل مباشرة؛ يجب استخدام القيد العكسي.');
      }
      setPurchaseInvoices((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'cancelled', cancelledAt: nowIso, cancellationReason } : p))
      );
    } else if (type === 'debit_credit_note') {
      const target = debitCreditNotes.find((n) => n.id === id);
      if (!target) throw new Error('المستند غير موجود');
      assertDateNotInClosedPeriod(target.issueDate, target.type === 'credit_note' ? 'إشعار دائن' : 'إشعار مدين');
      if (target.status === 'posted' || target.status === 'issued') {
        throw new Error('لا يمكن إلغاء إشعار مُرحّل مباشرة؛ يجب استخدام القيد العكسي.');
      }
      setDebitCreditNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'cancelled', cancelledAt: nowIso, cancellationReason } : n))
      );
    } else if (type === 'voucher') {
      const target = vouchers.find((v) => v.id === id);
      if (!target) throw new Error('المستند غير موجود');
      assertDateNotInClosedPeriod(target.date, target.type === 'receipt' ? 'سند قبض' : 'سند صرف');
      if (target.status === 'posted') {
        throw new Error('لا يمكن إلغاء سند مُرحّل مباشرة؛ يجب استخدام القيد العكسي.');
      }
      setVouchers((prev) =>
        prev.map((v) => (v.id === id ? { ...v, status: 'cancelled', cancelledAt: nowIso, cancellationReason } : v))
      );
    } else if (type === 'simple_expense') {
      const target = simpleExpenses.find((e) => e.id === id);
      if (!target) throw new Error('المستند غير موجود');
      assertDateNotInClosedPeriod(target.date, 'فاتورة مصروف');
      if (target.status === 'posted') {
        throw new Error('لا يمكن إلغاء مصروف مُرحّل مباشرة؛ يجب استخدام القيد العكسي.');
      }
      setSimpleExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: 'cancelled', cancelledAt: nowIso, cancellationReason } : e))
      );
    } else if (type === 'journal_entry') {
      const target = journalEntries.find((j) => j.id === id);
      if (!target) throw new Error('القيد غير موجود');
      assertDateNotInClosedPeriod(target.date, 'قيد محاسبي');
      if (target.status === 'posted') {
        throw new Error('لا يمكن إلغاء قيد مُرحّل مباشرة؛ يجب استخدام القيد العكسي.');
      }
      setJournalEntries((prev) =>
        prev.map((j) => (j.id === id ? { ...j, status: 'cancelled', cancelledAt: nowIso, cancellationReason } : j))
      );
    }

    logAuditEvent({
      action: 'cancel',
      entityType: type === 'simple_expense' ? 'simple_expense' : (type as any),
      entityId: id,
      reason: cancellationReason,
      source: 'web_ui',
      metadata: { documentType: type, documentId: id },
    });
  };

  const reversePostedDocument = async (
    type: DocumentType,
    id: string,
    reversalReason: string,
    reversalDate?: string
  ): Promise<JournalEntry> => {
    if (!reversalReason || reversalReason.trim().length === 0) {
      throw new Error('يجب تحديد سبب العكس المحاسبي');
    }

    const nowIso = new Date().toISOString();
    const [today] = nowIso.split('T');
    const revDate = reversalDate || today;
    assertDateNotInClosedPeriod(revDate, 'قيد عكسي');
    const fiscalYear = getDocFiscalYear(revDate);

    const reversalJvId = generateEntityId('jv');
    const reversalJvNumber = documentSequenceService.getNextNumber(
      'journal_entry',
      fiscalYear,
      journalEntries.map((j) => j.entryNumber)
    );

    // Locate original journal entry
    let origJv: JournalEntry | undefined = undefined;
    let docRefNumber = '';

    if (type === 'sales_invoice') {
      const target = salesInvoices.find((i) => i.id === id);
      if (!target) throw new Error('فاتورة المبيعات غير موجودة');
      if (target.status !== 'posted' && target.status !== 'issued') {
        throw new Error('فقط الفواتير المرحلة (posted) يمكن عكسها محاسبياً.');
      }
      docRefNumber = target.invoiceNumber;
      origJv = journalEntries.find((j) => j.id === target.journalEntryId || j.referenceId === id);

      // Revert Inventory Stock
      const newStockMovements: StockMovement[] = [];
      const updatedInventory = inventory.map((item) => {
        const lineItem = target.items.find((i) => i.itemId === item.id);
        if (lineItem) {
          const prevStock = item.currentStock;
          const newStock = prevStock + lineItem.quantity;
          newStockMovements.push({
            id: generateEntityId('sm'),
            itemId: item.id,
            itemName: item.nameAr,
            date: revDate,
            type: 'sale_reversal',
            quantity: lineItem.quantity,
            previousStock: prevStock,
            newStock: newStock,
            referenceNumber: target.invoiceNumber,
            documentType: 'sales_invoice_reversal',
            documentId: target.id,
            notes: `إرجاع مخزون لعكس فاتورة مبيعات ${target.invoiceNumber} - السبب: ${reversalReason}`,
          });
          return { ...item, currentStock: newStock };
        }
        return item;
      });
      setInventory(updatedInventory);
      if (newStockMovements.length > 0) {
        setStockMovements((prev) => [...newStockMovements, ...prev]);
      }

      // Revert Customer Balance
      if (target.remainingAmount > 0 && target.customerId) {
        setCustomers((prev) =>
          prev.map((c) => (c.id === target.customerId ? { ...c, balance: Math.max(0, c.balance - target.remainingAmount) } : c))
        );
      }

      setSalesInvoices((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                status: 'reversed',
                reversalReason,
                reversalDate: revDate,
                reversalJournalEntryId: reversalJvId,
                reversedAt: nowIso,
              }
            : i
        )
      );
    } else if (type === 'purchase_invoice') {
      const target = purchaseInvoices.find((p) => p.id === id);
      if (!target) throw new Error('فاتورة المشتريات غير موجودة');
      if (target.status !== 'posted') {
        throw new Error('فقط فواتير المشتريات المرحلة يمكن عكسها محاسبياً.');
      }

      // Check if current stock is sufficient before reversing purchase invoice
      target.items.forEach((lineItem) => {
        const currentItem = inventory.find((i) => i.id === lineItem.itemId);
        if (currentItem && currentItem.currentStock < lineItem.quantity) {
          throw new Error(
            `لا يمكن عكس فاتورة المشتريات: الصنف "${currentItem.nameAr}" رصيده المتاح حالياً (${currentItem.currentStock}) أقل من الكمية المشتراة (${lineItem.quantity}) المطلوب استبعادها.`
          );
        }
      });

      docRefNumber = target.invoiceNumber;
      origJv = journalEntries.find((j) => j.id === target.journalEntryId || j.referenceId === id);

      // Deduct Inventory Stock
      const newStockMovements: StockMovement[] = [];
      const updatedInventory = inventory.map((item) => {
        const lineItem = target.items.find((i) => i.itemId === item.id);
        if (lineItem) {
          const prevStock = item.currentStock;
          const newStock = prevStock - lineItem.quantity;
          newStockMovements.push({
            id: generateEntityId('sm'),
            itemId: item.id,
            itemName: item.nameAr,
            date: revDate,
            type: 'purchase_reversal',
            quantity: lineItem.quantity,
            previousStock: prevStock,
            newStock: newStock,
            referenceNumber: target.invoiceNumber,
            documentType: 'purchase_invoice_reversal',
            documentId: target.id,
            notes: `استبعاد مخزون لعكس فاتورة مشتريات ${target.invoiceNumber} - السبب: ${reversalReason}`,
          });
          return { ...item, currentStock: newStock };
        }
        return item;
      });
      setInventory(updatedInventory);
      if (newStockMovements.length > 0) {
        setStockMovements((prev) => [...newStockMovements, ...prev]);
      }

      // Revert Supplier Balance
      const unpaid = target.totalAmount - (target.paidAmount || 0);
      if (unpaid > 0 && target.supplierId) {
        setSuppliers((prev) =>
          prev.map((s) => (s.id === target.supplierId ? { ...s, balance: Math.max(0, s.balance - unpaid) } : s))
        );
      }

      setPurchaseInvoices((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status: 'reversed',
                reversalReason,
                reversalDate: revDate,
                reversalJournalEntryId: reversalJvId,
                reversedAt: nowIso,
              }
            : p
        )
      );
    } else if (type === 'debit_credit_note') {
      const target = debitCreditNotes.find((n) => n.id === id);
      if (!target) throw new Error('الإشعار غير موجود');
      if (target.status !== 'posted' && target.status !== 'issued') {
        throw new Error('فقط الإشعارات المرحلة يمكن عكسها.');
      }
      docRefNumber = target.noteNumber;
      origJv = journalEntries.find((j) => j.id === target.journalEntryId || j.referenceId === id);

      if (target.affectInventory && target.items && target.items.length > 0) {
        if (target.type === 'credit_note') {
          // Reversing a credit note means removing the items that were returned into inventory
          target.items.forEach((lineItem) => {
            const currentItem = inventory.find((i) => i.id === lineItem.itemId);
            if (currentItem && currentItem.currentStock < lineItem.quantity) {
              throw new Error(
                `لا يمكن عكس الإشعار الدائن: الصنف "${currentItem.nameAr}" رصيده الحالي (${currentItem.currentStock}) غير كافٍ لاستبعاد كمية الإشعار (${lineItem.quantity}).`
              );
            }
          });
        }

        const newStockMovements: StockMovement[] = [];
        const updatedInventory = inventory.map((item) => {
          const lineItem = target.items.find((i) => i.itemId === item.id);
          if (lineItem) {
            const prevStock = item.currentStock;
            const isDeducting = target.type === 'credit_note';
            const newStock = isDeducting ? prevStock - lineItem.quantity : prevStock + lineItem.quantity;
            newStockMovements.push({
              id: generateEntityId('sm'),
              itemId: item.id,
              itemName: item.nameAr,
              date: revDate,
              type: isDeducting ? 'return_out' : 'return_in',
              quantity: lineItem.quantity,
              previousStock: prevStock,
              newStock: newStock,
              referenceNumber: target.noteNumber,
              documentType: `${target.type}_reversal`,
              documentId: target.id,
              notes: `عكس حركة مخزون لإشعار ${target.noteNumber} - السبب: ${reversalReason}`,
            });
            return { ...item, currentStock: newStock };
          }
          return item;
        });
        setInventory(updatedInventory);
        if (newStockMovements.length > 0) {
          setStockMovements((prev) => [...newStockMovements, ...prev]);
        }
      }

      if (target.partyType === 'customer' && target.partyId) {
        setCustomers((prev) =>
          prev.map((c) => {
            if (c.id === target.partyId) {
              const updatedBal = target.type === 'credit_note' ? c.balance + target.totalAmount : Math.max(0, c.balance - target.totalAmount);
              return { ...c, balance: updatedBal };
            }
            return c;
          })
        );
      }

      setDebitCreditNotes((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                status: 'reversed',
                reversalReason,
                reversalDate: revDate,
                reversalJournalEntryId: reversalJvId,
                reversedAt: nowIso,
              }
            : n
        )
      );
    } else if (type === 'voucher') {
      const target = vouchers.find((v) => v.id === id);
      if (!target) throw new Error('السند غير موجود');
      if (target.status !== 'posted') {
        throw new Error('فقط السندات المرحلة يمكن عكسها.');
      }
      docRefNumber = target.voucherNumber;
      origJv = journalEntries.find((j) => j.id === target.journalEntryId || j.referenceId === id);

      if (target.type === 'receipt') {
        if (target.relatedInvoiceId) {
          setSalesInvoices((prev) =>
            prev.map((inv) => {
              if (inv.id === target.relatedInvoiceId || inv.invoiceNumber === target.relatedInvoiceNumber) {
                const restoredPaid = Math.max(0, inv.paidAmount - target.amount);
                const restoredRemaining = Math.min(inv.totalAmount, inv.remainingAmount + target.amount);
                return {
                  ...inv,
                  paidAmount: restoredPaid,
                  remainingAmount: restoredRemaining,
                  paymentStatus: restoredPaid <= 0 ? 'unpaid' : 'partial',
                };
              }
              return inv;
            })
          );
        }
        if (target.partyType === 'customer' && target.partyId) {
          setCustomers((prev) =>
            prev.map((c) => (c.id === target.partyId ? { ...c, balance: c.balance + target.amount } : c))
          );
        }
      } else if (target.type === 'payment') {
        if (target.relatedInvoiceId) {
          setPurchaseInvoices((prev) =>
            prev.map((inv) => {
              if (inv.id === target.relatedInvoiceId || inv.invoiceNumber === target.relatedInvoiceNumber) {
                const restoredPaid = Math.max(0, (inv.paidAmount || 0) - target.amount);
                return {
                  ...inv,
                  paidAmount: restoredPaid,
                  paymentStatus: restoredPaid <= 0 ? 'unpaid' : (restoredPaid >= inv.totalAmount ? 'paid' : 'partial'),
                };
              }
              return inv;
            })
          );
        }
        if (target.partyType === 'supplier' && target.partyId) {
          setSuppliers((prev) =>
            prev.map((s) => (s.id === target.partyId ? { ...s, balance: s.balance + target.amount } : s))
          );
        }
      }

      setVouchers((prev) =>
        prev.map((v) =>
          v.id === id
            ? {
                ...v,
                status: 'reversed',
                reversalReason,
                reversalDate: revDate,
                reversalJournalEntryId: reversalJvId,
                reversedAt: nowIso,
              }
            : v
        )
      );
    } else if (type === 'simple_expense') {
      const target = simpleExpenses.find((e) => e.id === id);
      if (!target) throw new Error('المصروف غير موجود');
      if (target.status !== 'posted') {
        throw new Error('فقط المصروفات المرحلة يمكن عكسها.');
      }
      docRefNumber = target.expenseNumber;
      origJv = journalEntries.find((j) => j.id === target.journalEntryId || j.referenceId === id);

      setSimpleExpenses((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                status: 'reversed',
                reversalReason,
                reversalDate: revDate,
                reversalJournalEntryId: reversalJvId,
                reversedAt: nowIso,
              }
            : e
        )
      );
    } else if (type === 'journal_entry') {
      const target = journalEntries.find((j) => j.id === id);
      if (!target) throw new Error('القيد غير موجود');
      if (target.status !== 'posted') {
        throw new Error('فقط القيود المرحلة يمكن عكسها.');
      }
      docRefNumber = target.entryNumber;
      origJv = target;
    }

    // Build Inverted Lines for the Reversal Journal Entry
    let reversalLines: JournalEntryLine[] = [];
    if (origJv && origJv.lines && origJv.lines.length > 0) {
      reversalLines = origJv.lines.map((l) => ({
        id: generateEntityId('jvl'),
        accountId: l.accountId,
        accountCode: l.accountCode,
        accountNameAr: l.accountNameAr,
        debit: l.credit,
        credit: l.debit,
        description: `قيد عكسي: ${l.description || origJv?.narrationAr || ''}`,
      }));
    }

    const totalDebit = reversalLines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = reversalLines.reduce((s, l) => s + l.credit, 0);

    const reversalEntry: JournalEntry = {
      id: reversalJvId,
      entryNumber: reversalJvNumber,
      date: revDate,
      referenceType: origJv?.referenceType || (type as any),
      referenceId: id,
      referenceNumber: docRefNumber,
      narrationAr: `قيد عكسي للمستند رقم ${docRefNumber} - سبب العكس: ${reversalReason}`,
      lines: reversalLines,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      status: 'posted',
      isReversal: true,
      reversedEntryId: origJv?.id,
      reversedEntryNumber: origJv?.entryNumber,
      reversalReason,
      reversalDate: revDate,
      postedAt: nowIso,
      createdAt: nowIso,
    };

    // Update original journal entry & add reversal entry
    const updatedJournal = [
      reversalEntry,
      ...journalEntries.map((j) =>
        j.id === origJv?.id || j.referenceId === id
          ? {
              ...j,
              status: 'reversed' as DocumentStatus,
              reversalEntryId: reversalJvId,
              reversalEntryNumber: reversalJvNumber,
              reversalReason,
              reversalDate: revDate,
              reversedAt: nowIso,
            }
          : j
      ),
    ];

    setJournalEntries(updatedJournal);
    setAccounts((prevAccs) => recalculateAccountBalances(updatedJournal, prevAccs));

    logAuditEvent({
      action: 'reverse',
      entityType: type === 'simple_expense' ? 'simple_expense' : (type as any),
      entityId: id,
      after: reversalEntry as unknown as Record<string, unknown>,
      reason: reversalReason,
      source: 'web_ui',
      metadata: {
        documentType: type,
        documentId: id,
        reversalEntryId: reversalEntry.id,
        reversalEntryNumber: reversalEntry.entryNumber,
      },
    });

    return reversalEntry;
  };

  // Dependency Validation Functions
  const checkCustomerDependencies = (id: string): DependencyCheckResult => {
    const cust = customers.find((c) => c.id === id);
    if (!cust) return { canDelete: false, reason: 'العميل غير موجود' };

    const invoicesCount = salesInvoices.filter((i) => i.customerId === id).length;
    const vouchersCount = vouchers.filter((v) => v.partyType === 'customer' && v.partyId === id).length;
    const notesCount = debitCreditNotes.filter((n) => n.partyType === 'customer' && n.partyId === id).length;
    const parkedCount = parkedOrders.filter((p) => p.customerId === id).length;
    const hasBalance = Math.abs(cust.balance || 0) > 0.001;

    const summary: Array<{ label: string; count: number }> = [];
    if (invoicesCount > 0) summary.push({ label: 'فواتير مبيعات', count: invoicesCount });
    if (vouchersCount > 0) summary.push({ label: 'سندات قبض/صرف', count: vouchersCount });
    if (notesCount > 0) summary.push({ label: 'إشعارات دائنة/مدينة', count: notesCount });
    if (parkedCount > 0) summary.push({ label: 'فواتير معلقة بالكاشير', count: parkedCount });
    if (hasBalance) summary.push({ label: `رصيد مالي مستحق (${cust.balance.toFixed(2)} ر.س)`, count: 1 });

    const canDelete = summary.length === 0;
    const reason = !canDelete
      ? `لا يمكن حذف هذا العميل لوجود ${summary.map((s) => `${s.count > 1 ? s.count + ' ' : ''}${s.label}`).join('، ')}. يرجى تعطيل العميل بدلاً من الحذف لحفظ السجلات المحاسبية.`
      : undefined;

    return {
      canDelete,
      reason,
      details: {
        invoicesCount,
        vouchersCount,
        notesCount,
        parkedCount,
        hasBalance,
      },
      dependenciesSummary: summary,
    };
  };

  const checkSupplierDependencies = (id: string): DependencyCheckResult => {
    const supp = suppliers.find((s) => s.id === id);
    if (!supp) return { canDelete: false, reason: 'المورد غير موجود' };

    const purchasesCount = purchaseInvoices.filter((p) => p.supplierId === id).length;
    const vouchersCount = vouchers.filter((v) => v.partyType === 'supplier' && v.partyId === id).length;
    const notesCount = debitCreditNotes.filter((n) => n.partyType === 'supplier' && n.partyId === id).length;
    const hasBalance = Math.abs(supp.balance || 0) > 0.001;

    const summary: Array<{ label: string; count: number }> = [];
    if (purchasesCount > 0) summary.push({ label: 'فواتير مشتريات', count: purchasesCount });
    if (vouchersCount > 0) summary.push({ label: 'سندات صرف/قبض', count: vouchersCount });
    if (notesCount > 0) summary.push({ label: 'إشعارات دائنة/مدينة', count: notesCount });
    if (hasBalance) summary.push({ label: `رصيد مالي مستحق (${supp.balance.toFixed(2)} ر.س)`, count: 1 });

    const canDelete = summary.length === 0;
    const reason = !canDelete
      ? `لا يمكن حذف هذا المورد لوجود ${summary.map((s) => `${s.count > 1 ? s.count + ' ' : ''}${s.label}`).join('، ')}. يرجى تعطيل المورد لحفظ العمليات المحاسبية.`
      : undefined;

    return {
      canDelete,
      reason,
      details: {
        purchasesCount,
        vouchersCount,
        notesCount,
        hasBalance,
      },
      dependenciesSummary: summary,
    };
  };

  const checkInventoryItemDependencies = (id: string): DependencyCheckResult => {
    const item = inventory.find((i) => i.id === id);
    if (!item) return { canDelete: false, reason: 'الصنف غير موجود' };

    const movementsCount = stockMovements.filter((m) => m.itemId === id).length;
    const salesCount = salesInvoices.filter((i) => i.items.some((it) => it.itemId === id)).length;
    const purchasesCount = purchaseInvoices.filter((p) => p.items.some((it) => it.itemId === id)).length;
    const notesCount = debitCreditNotes.filter((n) => n.items && n.items.some((it) => it.itemId === id)).length;
    const parkedCount = parkedOrders.filter((p) => p.items.some((it) => it.itemId === id)).length;

    const summary: Array<{ label: string; count: number }> = [];
    if (movementsCount > 0) summary.push({ label: 'حركات مخزنية', count: movementsCount });
    if (salesCount > 0) summary.push({ label: 'فواتير مبيعات', count: salesCount });
    if (purchasesCount > 0) summary.push({ label: 'فواتير مشتريات', count: purchasesCount });
    if (notesCount > 0) summary.push({ label: 'إشعارات ضريبية', count: notesCount });
    if (parkedCount > 0) summary.push({ label: 'فواتير كاشير معلقة', count: parkedCount });

    const canDelete = summary.length === 0;
    const reason = !canDelete
      ? `لا يمكن حذف هذا الصنف لوجود ${summary.map((s) => `${s.count} ${s.label}`).join('، ')}. يرجى تعطيل الصنف بدلاً من الحذف لضمان سلامة تقارير المخزون والأرباح.`
      : undefined;

    return {
      canDelete,
      reason,
      details: {
        movementsCount,
        salesCount,
        purchasesCount,
        notesCount,
        parkedCount,
      },
      dependenciesSummary: summary,
    };
  };

  const checkAccountDependencies = (id: string): DependencyCheckResult => {
    const acc = accounts.find((a) => a.id === id);
    if (!acc) return { canDelete: false, reason: 'الحساب غير موجود' };

    const isSystemPrimary = acc.level === 1 || ['1', '2', '3', '4', '5', '11', '21', '31', '41', '51', '1101', '1102', '1104', '2101', '2102', '3101', '3102', '4101', '5101'].includes(acc.code);
    const childrenCount = accounts.filter((a) => a.parentId === id).length;
    const entriesCount = journalEntries.filter((j) => j.lines.some((l) => l.accountId === id || l.accountCode === acc.code)).length;
    const hasBalance = Math.abs(acc.balance || 0) > 0.001;
    const linkedRegisters = cashRegisters.filter((r) => r.cashAccountId === id || r.posCardAccountId === id).length;
    const linkedInventory = inventory.filter((i) => i.accountId === id || i.cogsAccountId === id || i.salesAccountId === id).length;

    const summary: Array<{ label: string; count: number }> = [];
    if (isSystemPrimary) summary.push({ label: 'حساب رئيسي في الدليل المحاسبي', count: 1 });
    if (childrenCount > 0) summary.push({ label: 'حسابات فرعية تابعة', count: childrenCount });
    if (entriesCount > 0) summary.push({ label: 'قيود محاسبية مرحلة', count: entriesCount });
    if (hasBalance) summary.push({ label: `رصيد مالي (${acc.balance.toFixed(2)} ر.س)`, count: 1 });
    if (linkedRegisters > 0) summary.push({ label: 'صناديق كاشير مرتبطة', count: linkedRegisters });
    if (linkedInventory > 0) summary.push({ label: 'أصناف مخزون مرتبطة', count: linkedInventory });

    const canDelete = summary.length === 0;
    const reason = !canDelete
      ? `لا يمكن حذف هذا الحساب لوجود ${summary.map((s) => `${s.label}${s.count > 1 ? ` (${s.count})` : ''}`).join('، ')}. استخدم التعطيل بدلاً من الحذف.`
      : undefined;

    return {
      canDelete,
      reason,
      details: {
        isSystemPrimary,
        childrenCount,
        entriesCount,
        hasBalance,
        linkedRegisters,
        linkedInventory,
      },
      dependenciesSummary: summary,
    };
  };

  const checkBranchDependencies = (id: string): DependencyCheckResult => {
    const branch = branches.find((b) => b.id === id);
    if (!branch) return { canDelete: false, reason: 'الفرع غير موجود' };

    const isMainBranch = branch.isMain || (branch as any).isMainBranch || false;
    const registersCount = cashRegisters.filter((r) => r.branchId === id).length;
    const shiftsCount = cashierShifts.filter((s) => s.branchId === id).length;
    const salesInvoicesCount = salesInvoices.filter((i) => i.branchId === id).length;

    const summary: Array<{ label: string; count: number }> = [];
    if (isMainBranch) summary.push({ label: 'الفرع الرئيسي للمنشأة', count: 1 });
    if (registersCount > 0) summary.push({ label: 'صناديق كاشير', count: registersCount });
    if (shiftsCount > 0) summary.push({ label: 'ورديات كاشير', count: shiftsCount });
    if (salesInvoicesCount > 0) summary.push({ label: 'فواتير مبيعات مسجلة', count: salesInvoicesCount });

    const canDelete = summary.length === 0;
    const reason = !canDelete
      ? `لا يمكن حذف هذا الفرع لوجود ${summary.map((s) => `${s.label}${s.count > 1 ? ` (${s.count})` : ''}`).join('، ')}. يرجى نقل الصناديق والعمليات أو تعطيل الفرع.`
      : undefined;

    return {
      canDelete,
      reason,
      details: {
        isMainBranch,
        registersCount,
        shiftsCount,
        salesInvoicesCount,
      },
      dependenciesSummary: summary,
    };
  };

  const checkCashRegisterDependencies = (id: string): DependencyCheckResult => {
    const reg = cashRegisters.find((r) => r.id === id);
    if (!reg) return { canDelete: false, reason: 'الصندوق غير موجود' };

    const openShiftsCount = cashierShifts.filter((s) => s.registerId === id && s.status === 'open').length;
    const shiftsCount = cashierShifts.filter((s) => s.registerId === id).length;
    const salesInvoicesCount = salesInvoices.filter((i) => i.registerId === id).length;
    const parkedCount = parkedOrders.filter((p) => p.registerId === id).length;

    const summary: Array<{ label: string; count: number }> = [];
    if (openShiftsCount > 0) summary.push({ label: 'وردية مفتوحة حالياً', count: openShiftsCount });
    if (shiftsCount > 0) summary.push({ label: 'سجلات ورديات سابقة', count: shiftsCount });
    if (salesInvoicesCount > 0) summary.push({ label: 'فواتير كاشير مصدرة', count: salesInvoicesCount });
    if (parkedCount > 0) summary.push({ label: 'فواتير معلقة', count: parkedCount });

    const canDelete = summary.length === 0;
    const reason = !canDelete
      ? `لا يمكن حذف هذا الصندوق لوجود ${summary.map((s) => `${s.label}${s.count > 1 ? ` (${s.count})` : ''}`).join('، ')}. يمكنك تعطيل الصندوق بدلاً من الحذف.`
      : undefined;

    return {
      canDelete,
      reason,
      details: {
        openShiftsCount,
        shiftsCount,
        salesInvoicesCount,
        parkedCount,
      },
      dependenciesSummary: summary,
    };
  };

  // Customer Management
  const addCustomer = (data: Omit<Customer, 'id' | 'balance'>): Customer => {
    const newCust: Customer = {
      ...data,
      id: `cust_${Date.now()}`,
      balance: 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
    };
    setCustomers((prev) => [...prev, newCust]);
    return newCust;
  };

  const updateCustomer = (id: string, data: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
  };

  const toggleCustomerStatus = (id: string) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: c.isActive === false ? true : false } : c))
    );
  };

  const deleteCustomer = (id: string) => {
    const check = checkCustomerDependencies(id);
    if (!check.canDelete) {
      throw new Error(check.reason || 'لا يمكن حذف العميل لوجود ارتباطات محاسبية');
    }
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  // Supplier Management
  const addSupplier = (data: Omit<Supplier, 'id' | 'balance'>): Supplier => {
    const newSupp: Supplier = {
      ...data,
      id: `supp_${Date.now()}`,
      balance: 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
    };
    setSuppliers((prev) => [...prev, newSupp]);
    return newSupp;
  };

  const updateSupplier = (id: string, data: Partial<Supplier>) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
  };

  const toggleSupplierStatus = (id: string) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: s.isActive === false ? true : false } : s))
    );
  };

  const deleteSupplier = (id: string) => {
    const check = checkSupplierDependencies(id);
    if (!check.canDelete) {
      throw new Error(check.reason || 'لا يمكن حذف المورد لوجود ارتباطات محاسبية');
    }
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  };

  // Inventory Management
  const addInventoryItem = (data: Omit<InventoryItem, 'id'>): InventoryItem => {
    if (data.purchasePrice < 0 || data.salePrice < 0 || (data.currentStock !== undefined && data.currentStock < 0)) {
      throw new Error('الأسعار والكميات لا يمكن أن تكون سالبة.');
    }
    const [today] = new Date().toISOString().split('T');
    const newItemId = `item_${Date.now()}`;
    const initialStock = Number(data.currentStock) || 0;

    const newItem: InventoryItem = {
      ...data,
      id: newItemId,
      currentStock: initialStock,
      minStockAlert: data.minStockAlert !== undefined ? data.minStockAlert : 5,
      isActive: data.isActive !== undefined ? data.isActive : true,
    };
    setInventory((prev) => [...prev, newItem]);

    if (initialStock > 0) {
      setStockMovements((prev) => [
        {
          id: `sm_init_${Date.now()}`,
          itemId: newItemId,
          itemName: newItem.nameAr,
          date: today,
          type: 'initial',
          quantity: initialStock,
          previousStock: 0,
          newStock: initialStock,
          referenceNumber: 'INIT-STOCK',
          documentType: 'initial_balance',
          notes: 'رصيد مخزون افتتاحي عند تعريف الصنف',
        },
        ...prev,
      ]);
    }
    return newItem;
  };

  const updateInventoryItem = (id: string, data: Partial<InventoryItem>) => {
    const existing = inventory.find((i) => i.id === id);
    if (!existing) return;

    if (data.purchasePrice !== undefined && (isNaN(Number(data.purchasePrice)) || Number(data.purchasePrice) < 0)) {
      throw new Error('سعر التكلفة / الشراء لا يمكن أن يكون سالباً');
    }
    if (data.salePrice !== undefined && (isNaN(Number(data.salePrice)) || Number(data.salePrice) < 0)) {
      throw new Error('سعر البيع لا يمكن أن يكون سالباً');
    }

    if (data.currentStock !== undefined && Number(data.currentStock) !== existing.currentStock) {
      const editCheck = checkDirectStockEditAllowed(id, stockMovements);
      if (!editCheck.canDirectlyEdit) {
        throw new Error(
          editCheck.message ||
            'لا يمكن تعديل الرصيد الحالي مباشرة لوجود حركات سابقة لهذا الصنف. يرجى استخدام حركة تسوية المخزون (Inventory Adjustment).'
        );
      }
      if (Number(data.currentStock) < 0) {
        throw new Error('رصيد المخزون لا يمكن أن يكون سالباً');
      }
    }

    setInventory((prev) => prev.map((i) => (i.id === id ? { ...i, ...data } : i)));
  };

  const toggleInventoryItemStatus = (id: string) => {
    setInventory((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isActive: i.isActive === false ? true : false } : i))
    );
  };

  const deleteInventoryItem = (id: string) => {
    const check = checkInventoryItemDependencies(id);
    if (!check.canDelete) {
      throw new Error(check.reason || 'لا يمكن حذف الصنف لوجود ارتباطات محاسبية أو حركات مخزنية');
    }
    setInventory((prev) => prev.filter((i) => i.id !== id));
  };

  const adjustInventoryStock = (itemId: string, newStock: number, reason: string) => {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;

    if (isNaN(newStock) || newStock < 0) {
      throw new Error('رصيد المخزون الفعلي بعد التسوية لا يمكن أن يكون سالباً');
    }

    const diff = newStock - item.currentStock;
    const [today] = new Date().toISOString().split('T');

    setInventory((prev) => prev.map((i) => (i.id === itemId ? { ...i, currentStock: newStock } : i)));

    setStockMovements((prev) => [
      {
        id: `sm_${Date.now()}`,
        itemId,
        itemName: item.nameAr,
        date: today,
        type: diff >= 0 ? 'adjustment_in' : 'adjustment_out',
        quantity: Math.abs(diff),
        previousStock: item.currentStock,
        newStock: newStock,
        referenceNumber: 'ADJ-MANUAL',
        documentType: 'inventory_adjustment',
        notes: reason || 'تسوية جردية يدوية موثقة',
      },
      ...prev,
    ]);
  };

  // Accounts Management
  const addAccount = (data: Omit<Account, 'id' | 'balance'>): Account => {
    const newAcc: Account = {
      ...data,
      id: `acc_${Date.now()}`,
      balance: 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
    };
    setAccounts((prev) => [...prev, newAcc]);
    return newAcc;
  };

  const updateAccount = (id: string, data: Partial<Account>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
  };

  const toggleAccountStatus = (id: string) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isActive: a.isActive === false ? true : false } : a))
    );
  };

  const deleteAccount = (id: string) => {
    const check = checkAccountDependencies(id);
    if (!check.canDelete) {
      throw new Error(check.reason || 'لا يمكن حذف الحساب لوجود قيود أو أرصدة أو حسابات فرعية');
    }
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const updateCompanySettings = (settings: CompanySettings) => {
    const prevSettings = companySettings;
    setCompanySettings(settings);

    logAuditEvent({
      action: 'settings_update',
      entityType: 'settings',
      entityId: 'company_settings',
      before: prevSettings as unknown as Record<string, unknown>,
      after: settings as unknown as Record<string, unknown>,
      reason: 'تحديث بيانات وإعدادات المنشأة والضريبة',
      source: 'web_ui',
    });
  };

  // Branch Management
  const addBranch = (data: Omit<Branch, 'id' | 'createdAt'>): Branch => {
    const newBranch: Branch = {
      ...data,
      id: `br_${Date.now()}`,
      createdAt: new Date().toISOString(),
      isActive: data.isActive !== undefined ? data.isActive : true,
    };
    setBranches((prev) => [...prev, newBranch]);
    return newBranch;
  };

  const updateBranch = (id: string, data: Partial<Branch>) => {
    setBranches((prev) => prev.map((b) => (b.id === id ? { ...b, ...data } : b)));
    if (data.nameAr) {
      setCashRegisters((prev) =>
        prev.map((r) => (r.branchId === id ? { ...r, branchName: data.nameAr! } : r))
      );
    }
  };

  const toggleBranchStatus = (id: string) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isActive: b.isActive === false ? true : false } : b))
    );
  };

  const deleteBranch = (id: string) => {
    const check = checkBranchDependencies(id);
    if (!check.canDelete) {
      throw new Error(check.reason || 'لا يمكن حذف الفرع لوجود صناديق أو ورديات أو مستندات');
    }
    setBranches((prev) => prev.filter((b) => b.id !== id));
  };

  // Cash Registers Management
  const addCashRegister = (data: Omit<CashRegister, 'id'>): CashRegister => {
    const newRegister: CashRegister = {
      ...data,
      id: `reg_${Date.now()}`,
      isActive: data.isActive !== undefined ? data.isActive : true,
      currentShiftId: null,
    };
    setCashRegisters((prev) => [...prev, newRegister]);
    return newRegister;
  };

  const updateCashRegister = (id: string, data: Partial<CashRegister>) => {
    setCashRegisters((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
  };

  const toggleCashRegisterStatus = (id: string) => {
    setCashRegisters((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: r.isActive === false ? true : false } : r))
    );
  };

  const deleteCashRegister = (id: string) => {
    const check = checkCashRegisterDependencies(id);
    if (!check.canDelete) {
      throw new Error(check.reason || 'لا يمكن حذف صندوق الكاشير لوجود ورديات أو فواتير مرتبطة');
    }
    setCashRegisters((prev) => prev.filter((r) => r.id !== id));
  };

  // Shift Management (X / Z Reports)
  const startCashierShift = (registerId: string, cashierName: string, openingCash: number): CashierShift => {
    const register = cashRegisters.find((r) => r.id === registerId);
    const fiscalYear = getDocFiscalYear();
    const shiftNumber = documentSequenceService.getNextNumber(
      'cashier_shift',
      fiscalYear,
      cashierShifts.map((s) => s.shiftNumber)
    );
    const newShift: CashierShift = {
      id: generateEntityId('shift'),
      shiftNumber,
      branchId: register?.branchId || activeBranchId,
      branchName: register?.branchName || 'الفرع الرئيسي وصالة العرض (الرياض)',
      registerId,
      registerName: register?.nameAr || 'صندوق كاشير',
      cashierName: cashierName.trim() || 'كاشير مبيعات',
      startTime: new Date().toISOString(),
      openingCash: Number(openingCash) || 0,
      cashSales: 0,
      madaSales: 0,
      creditCardSales: 0,
      otherSales: 0,
      totalSales: 0,
      totalVat: 0,
      invoicesCount: 0,
      refundsCount: 0,
      refundsTotal: 0,
      cashDropAmount: 0,
      expectedCash: Number(openingCash) || 0,
      status: 'open',
    };

    setCashierShifts((prev) => [newShift, ...prev]);
    setCashRegisters((prev) =>
      prev.map((r) =>
        r.id === registerId
          ? {
              ...r,
              currentShiftId: newShift.id,
              assignedCashierName: cashierName,
              lastActiveAt: new Date().toISOString(),
            }
          : r
      )
    );
    return newShift;
  };

  const closeCashierShift = (shiftId: string, actualCash: number, closingNotes?: string): CashierShift => {
    const shift = cashierShifts.find((s) => s.id === shiftId);
    const fiscalYear = getDocFiscalYear();
    const zReportNum = `Z-${fiscalYear}-${Math.floor(1000 + Math.random() * 9000)}`;
    const endTime = new Date().toISOString();
    const expected = shift ? shift.expectedCash : actualCash;
    const diff = actualCash - expected;

    const updatedShift: CashierShift = {
      ...(shift || ({} as CashierShift)),
      endTime,
      actualClosingCash: actualCash,
      cashDifference: diff,
      closingNotes: closingNotes || '',
      status: 'closed',
      zReportNumber: zReportNum,
    };

    setCashierShifts((prev) => prev.map((s) => (s.id === shiftId ? updatedShift : s)));
    if (shift) {
      setCashRegisters((prev) =>
        prev.map((r) =>
          r.id === shift.registerId
            ? { ...r, currentShiftId: null, lastActiveAt: endTime }
            : r
        )
      );
    }
    return updatedShift;
  };

  const cashDropShift = (shiftId: string, amount: number, notes?: string) => {
    setCashierShifts((prev) =>
      prev.map((s) => {
        if (s.id === shiftId) {
          const newDrop = (s.cashDropAmount || 0) + amount;
          const newExpected = s.openingCash + s.cashSales - s.refundsTotal - newDrop;
          return {
            ...s,
            cashDropAmount: newDrop,
            expectedCash: newExpected,
            closingNotes: s.closingNotes
              ? `${s.closingNotes} | توريد للخزينة: ${amount} ر.س (${notes || ''})`
              : `توريد نقدية للخزينة: ${amount} ر.س (${notes || ''})`,
          };
        }
        return s;
      })
    );
  };

  // Park / Hold Carts
  const parkOrder = (orderData: Omit<ParkedOrder, 'id' | 'savedAt' | 'orderNumber'>): ParkedOrder => {
    const orderNum = documentSequenceService.getNextNumber(
      'parked_order',
      undefined,
      parkedOrders.map((o) => o.orderNumber)
    );
    const newParked: ParkedOrder = {
      ...orderData,
      id: generateEntityId('hold'),
      orderNumber: orderNum,
      savedAt: new Date().toISOString(),
    };
    setParkedOrders((prev) => [newParked, ...prev]);
    return newParked;
  };

  const resumeParkedOrder = (orderId: string): ParkedOrder | undefined => {
    const found = parkedOrders.find((o) => o.id === orderId);
    if (found) {
      setParkedOrders((prev) => prev.filter((o) => o.id !== orderId));
    }
    return found;
  };

  const deleteParkedOrder = (orderId: string) => {
    setParkedOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  // Process Full POS Checkout & Accounting Post
  const processPosSale = async (saleData: {
    items: Array<{
      itemId?: string;
      nameAr: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      discount: number;
      vatRate: number;
      vatAmount: number;
      subtotal: number;
      totalWithVat: number;
    }>;
    customerId?: string;
    customerName?: string;
    customerVatNumber?: string;
    paymentMethod: PaymentMethod;
    paidAmount: number;
    cashTendered?: number;
    changeReturned?: number;
    madaAuthCode?: string;
    splitPaymentDetails?: {
      cashAmount: number;
      madaAmount: number;
    };
    discountTotal?: number;
    notes?: string;
  }): Promise<SalesInvoice> => {
    const nowIso = new Date().toISOString();
    const [issueDate, issueTimePart] = nowIso.split('T');
    const issueTime = issueTimePart ? issueTimePart.substring(0, 8) : '12:00:00';
    assertDateNotInClosedPeriod(issueDate, 'فاتورة مبيعات نقاط البيع (POS)');
    const fiscalYear = getDocFiscalYear(issueDate);

    // Validate inventory stock availability
    assertSaleInventory(saleData.items, inventory);

    const branch = branches.find((b) => b.id === activeBranchId) || branches[0];
    const register = cashRegisters.find((r) => r.id === activeRegisterId) || cashRegisters[0];
    const currentShift = cashierShifts.find((s) => s.registerId === register?.id && s.status === 'open');

    const totalSubtotal = saleData.items.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);
    const lineDiscounts = saleData.items.reduce((sum, i) => sum + (i.discount || 0), 0);
    const orderDiscount = saleData.discountTotal || 0;
    const totalDiscount = lineDiscounts + orderDiscount;
    const taxableAmount = saleData.items.reduce((sum, i) => sum + i.subtotal, 0) - orderDiscount;
    const totalVat = saleData.items.reduce((sum, i) => sum + i.vatAmount, 0);
    const totalAmount = taxableAmount + totalVat;

    const invoiceNumber = documentSequenceService.getNextNumber(
      'sales_invoice',
      fiscalYear,
      salesInvoices.map((s) => s.invoiceNumber)
    );
    const newId = generateEntityId('pos_inv');
    const uuid = generateUUID();

    // Generate ZATCA Phase 2 compliant TLV Base64
    const tlvBase64 = generateZatcaTlvBase64({
      sellerName: branch?.nameAr || companySettings.nameAr,
      vatNumber: branch?.vatNumber || companySettings.vatNumber,
      timestamp: `${issueDate}T${issueTime}Z`,
      totalAmount: totalAmount,
      vatAmount: totalVat,
    });

    const isB2B = Boolean(saleData.customerVatNumber && saleData.customerVatNumber.length === 15);
    const invoiceType: InvoiceType = isB2B ? 'tax_invoice' : 'simplified_tax_invoice';

    // Auto Journal Entry
    const jvId = generateEntityId('jv');
    const jvNumber = documentSequenceService.getNextNumber(
      'journal_entry',
      fiscalYear,
      journalEntries.map((j) => j.entryNumber)
    );

    const journalLines: JournalEntryLine[] = [];

    // Debit payment accounts
    if (saleData.paymentMethod === 'cash') {
      journalLines.push({
        id: `jvl_${Date.now()}_cash`,
        accountId: register?.cashAccountId || 'acc_110101',
        accountCode: register?.cashAccountCode || '110101',
        accountNameAr: `صندوق نقطة البيع (${register?.nameAr || 'الكاشير'})`,
        debit: totalAmount,
        credit: 0,
        description: `مبيعات نقدية فاتورة ${invoiceNumber} - ${branch?.nameAr}`,
      });
    } else if (saleData.paymentMethod === 'mada' || saleData.paymentMethod === 'pos_card') {
      journalLines.push({
        id: `jvl_${Date.now()}_mada`,
        accountId: register?.posCardAccountId || 'acc_110104',
        accountCode: register?.posCardAccountCode || '110104',
        accountNameAr: `حساب مدى لنقاط البيع (${register?.nameAr || 'POS'})`,
        debit: totalAmount,
        credit: 0,
        description: `مبيعات بطاقة مدى/POS فاتورة ${invoiceNumber} - تفويض: ${saleData.madaAuthCode || 'إلكتروني'}`,
      });
    } else if (saleData.splitPaymentDetails) {
      if (saleData.splitPaymentDetails.cashAmount > 0) {
        journalLines.push({
          id: `jvl_${Date.now()}_split_cash`,
          accountId: register?.cashAccountId || 'acc_110101',
          accountCode: register?.cashAccountCode || '110101',
          accountNameAr: `صندوق نقطة البيع (${register?.nameAr || 'الكاشير'})`,
          debit: saleData.splitPaymentDetails.cashAmount,
          credit: 0,
          description: `جزء نقدي فاتورة ${invoiceNumber}`,
        });
      }
      if (saleData.splitPaymentDetails.madaAmount > 0) {
        journalLines.push({
          id: `jvl_${Date.now()}_split_mada`,
          accountId: register?.posCardAccountId || 'acc_110104',
          accountCode: register?.posCardAccountCode || '110104',
          accountNameAr: `حساب مدى لنقاط البيع (${register?.nameAr || 'POS'})`,
          debit: saleData.splitPaymentDetails.madaAmount,
          credit: 0,
          description: `جزء مدى فاتورة ${invoiceNumber}`,
        });
      }
    } else {
      // Default to Cash or Accounts Receivable if credit
      journalLines.push({
        id: `jvl_${Date.now()}_other`,
        accountId: saleData.paymentMethod === 'credit' ? 'acc_1102' : (register?.cashAccountId || 'acc_110101'),
        accountCode: saleData.paymentMethod === 'credit' ? '1102' : (register?.cashAccountCode || '110101'),
        accountNameAr: saleData.paymentMethod === 'credit' ? 'العملاء والمدينون' : `صندوق نقطة البيع (${register?.nameAr})`,
        debit: totalAmount,
        credit: 0,
        description: `مبيعات نقطة بيع ${invoiceNumber}`,
      });
    }

    // Credit Sales Revenue
    journalLines.push({
      id: `jvl_${Date.now()}_rev`,
      accountId: 'acc_4101',
      accountCode: '4101',
      accountNameAr: 'إيرادات مبيعات السلع (خاضعة لضريبة 15%)',
      debit: 0,
      credit: taxableAmount,
      description: `إيراد مبيعات فاتورة كاشير ${invoiceNumber}`,
    });

    // Credit Output VAT 15%
    journalLines.push({
      id: `jvl_${Date.now()}_vat`,
      accountId: 'acc_2102',
      accountCode: '2102',
      accountNameAr: 'ضريبة القيمة المضافة على المخرجات (مستحقة لهيئة الزكاة)',
      debit: 0,
      credit: totalVat,
      description: `ضريبة مخرجات 15% ZATCA - ${invoiceNumber}`,
    });

    const newJournalEntry: JournalEntry = {
      id: jvId,
      entryNumber: jvNumber,
      date: issueDate,
      referenceType: 'sales_invoice',
      referenceId: newId,
      referenceNumber: invoiceNumber,
      narrationAr: `مبيعات نقطة بيع ${invoiceNumber} - ${branch?.nameAr} (${register?.nameAr}) - الكاشير: ${currentShift?.cashierName || 'سعود'}`,
      lines: journalLines,
      totalDebit: totalAmount,
      totalCredit: totalAmount,
      isBalanced: true,
      createdAt: nowIso,
    };

    const invoiceItemsFormatted: InvoiceItem[] = saleData.items.map((i, idx) => ({
      id: `pos_item_${Date.now()}_${idx}`,
      itemId: i.itemId,
      nameAr: i.nameAr,
      quantity: i.quantity,
      unit: i.unit || 'قطعة',
      unitPrice: i.unitPrice,
      discount: i.discount || 0,
      vatRate: i.vatRate,
      vatAmount: i.vatAmount,
      subtotal: i.subtotal,
      totalWithVat: i.totalWithVat,
    }));

    const newInvoice: SalesInvoice = {
      id: newId,
      invoiceNumber,
      uuid,
      issueDate,
      issueTime,
      type: invoiceType,
      customerId: saleData.customerId || 'cust_walkin',
      customerName: saleData.customerName || 'عميل نقدي / عام',
      customerVatNumber: saleData.customerVatNumber,
      items: invoiceItemsFormatted,
      subtotal: totalSubtotal,
      discountTotal: totalDiscount,
      taxableAmount,
      vatTotal: totalVat,
      totalAmount,
      paymentMethod: saleData.paymentMethod,
      paymentStatus: saleData.paidAmount >= totalAmount ? 'paid' : (saleData.paidAmount > 0 ? 'partial' : 'unpaid'),
      paidAmount: saleData.paidAmount,
      remainingAmount: Math.max(0, totalAmount - saleData.paidAmount),
      notes: saleData.notes,
      zatcaQrBase64: tlvBase64,
      journalEntryId: jvId,
      status: 'posted',
      postedAt: nowIso,
      isPosSale: true,
      branchId: branch?.id,
      branchName: branch?.nameAr,
      registerId: register?.id,
      registerName: register?.nameAr,
      shiftId: currentShift?.id,
      cashierName: currentShift?.cashierName || register?.assignedCashierName || 'الكاشير',
      cashTendered: saleData.cashTendered,
      changeReturned: saleData.changeReturned,
      madaAuthCode: saleData.madaAuthCode,
      splitPaymentDetails: saleData.splitPaymentDetails,
    };

    // Update Shift Sales Stats
    if (currentShift) {
      setCashierShifts((prev) =>
        prev.map((s) => {
          if (s.id === currentShift.id) {
            let addCash = 0;
            let addMada = 0;
            let addCc = 0;

            if (saleData.paymentMethod === 'cash') addCash = totalAmount;
            else if (saleData.paymentMethod === 'mada' || saleData.paymentMethod === 'pos_card') addMada = totalAmount;
            else if ((saleData.paymentMethod as string) === 'credit_card') addCc = totalAmount;
            else if (saleData.splitPaymentDetails) {
              addCash = saleData.splitPaymentDetails.cashAmount;
              addMada = saleData.splitPaymentDetails.madaAmount;
            }

            const newCashSales = s.cashSales + addCash;
            const newMadaSales = s.madaSales + addMada;
            const newCcSales = s.creditCardSales + addCc;
            const newTotalSales = s.totalSales + totalAmount;
            const newTotalVat = s.totalVat + totalVat;
            const newExpectedCash = s.openingCash + newCashSales - s.refundsTotal - s.cashDropAmount;

            return {
              ...s,
              cashSales: newCashSales,
              madaSales: newMadaSales,
              creditCardSales: newCcSales,
              totalSales: newTotalSales,
              totalVat: newTotalVat,
              invoicesCount: s.invoicesCount + 1,
              expectedCash: newExpectedCash,
            };
          }
          return s;
        })
      );
    }

    // Decrement inventory stock
    const newStockMovements: StockMovement[] = [];
    const updatedInventory = inventory.map((item) => {
      const lineItem = saleData.items.find((i) => i.itemId === item.id);
      if (lineItem) {
        const prevStock = item.currentStock;
        const newStock = prevStock - lineItem.quantity;
        newStockMovements.push({
          id: `sm_pos_${Date.now()}_${item.id}`,
          itemId: item.id,
          itemName: item.nameAr,
          date: issueDate,
          type: 'sale',
          quantity: lineItem.quantity,
          previousStock: prevStock,
          newStock: newStock,
          referenceNumber: invoiceNumber,
          documentType: 'pos_sale',
          documentId: newId,
          notes: `مبيعات كاشير POS - ${branch?.nameAr || ''} (${register?.nameAr || ''})`,
        });
        return { ...item, currentStock: newStock };
      }
      return item;
    });

    setInventory(updatedInventory);
    if (newStockMovements.length > 0) {
      setStockMovements((prev) => [...newStockMovements, ...prev]);
    }

    const updatedJournalEntries = [newJournalEntry, ...journalEntries];
    setJournalEntries(updatedJournalEntries);
    setSalesInvoices((prev) => [newInvoice, ...prev]);

    // Recalculate accounts
    const updatedAccounts = recalculateAccountBalances(updatedJournalEntries, accounts);
    setAccounts(updatedAccounts);

    return newInvoice;
  };

  const resetToDemoData = () => {
    repo.resetToDemoData();
    setCompanySettings(DEFAULT_COMPANY_SETTINGS);
    setAccounts(DEFAULT_CHART_OF_ACCOUNTS);
    setCustomers(INITIAL_CUSTOMERS);
    setSuppliers(INITIAL_SUPPLIERS);
    setInventory(INITIAL_INVENTORY);
    setSalesInvoices(INITIAL_SALES_INVOICES);
    setPurchaseInvoices(INITIAL_PURCHASE_INVOICES);
    setDebitCreditNotes(INITIAL_DEBIT_CREDIT_NOTES);
    setVouchers(INITIAL_VOUCHERS);
    setSimpleExpenses(INITIAL_SIMPLE_EXPENSES);
    setApiKeys(INITIAL_API_KEYS);
    setFiscalClosings(INITIAL_FISCAL_CLOSINGS);
    setJournalEntries(INITIAL_JOURNAL_ENTRIES);
    setBranches(INITIAL_BRANCHES);
    setCashRegisters(INITIAL_CASH_REGISTERS);
    setCashierShifts(INITIAL_CASHIER_SHIFTS);
    setParkedOrders(INITIAL_PARKED_ORDERS);
    setActiveBranchId('br_1');
    setActiveRegisterId('reg_1');
    setStockMovements([]);

    logAuditEvent({
      action: 'reset',
      entityType: 'backup',
      entityId: 'database_reset',
      reason: 'إعادة ضبط النظام الشامل إلى البيانات التجريبية الافتراضية',
      source: 'system_reset',
    });
  };

  const exportDataJson = (): string => {
    return repo.exportDataJson();
  };

  const validateBackupJson = (json: string): BackupValidationResult => {
    return validateAccountingBackupJson(json);
  };

  const createPreImportEmergencyBackup = (): boolean => {
    return savePreImportEmergencyBackup(repo.getAllDataSnapshot());
  };

  const getEmergencyBackupRecord = (): EmergencyBackupRecord | null => {
    return getPreImportEmergencyBackup();
  };

  const restoreEmergencyBackup = (): boolean => {
    const backupRecord = getPreImportEmergencyBackup();
    if (!backupRecord || !backupRecord.data) return false;
    const jsonStr = JSON.stringify(backupRecord.data);
    return importDataJson(jsonStr);
  };

  const importDataJson = (json: string): boolean => {
    const success = repo.importDataJson(json);
    if (success) {
      setCompanySettings(repo.loadCompanySettings());
      setAccounts(repo.loadAccounts());
      setCustomers(repo.loadCustomers());
      setSuppliers(repo.loadSuppliers());
      setInventory(repo.loadInventory());
      setSalesInvoices(repo.loadSalesInvoices());
      setPurchaseInvoices(repo.loadPurchaseInvoices());
      setDebitCreditNotes(repo.loadDebitCreditNotes());
      setVouchers(repo.loadVouchers());
      setSimpleExpenses(repo.loadSimpleExpenses());
      setApiKeys(repo.loadApiKeys());
      setFiscalClosings(repo.loadFiscalClosings());
      setJournalEntries(repo.loadJournalEntries());
      setBranches(repo.loadBranches());
      setCashRegisters(repo.loadCashRegisters());
      setCashierShifts(repo.loadCashierShifts());
      setParkedOrders(repo.loadParkedOrders());
      setStockMovements(repo.loadStockMovements());
      setActiveBranchId(repo.loadActiveBranchId());
      setActiveRegisterId(repo.loadActiveRegisterId());

      logAuditEvent({
        action: 'import',
        entityType: 'backup',
        entityId: 'json_import',
        reason: 'استيراد نسخة احتياطية من ملف JSON واستبدال البيانات',
        source: 'import_file',
      });
    }
    return success;
  };

  // Statement of Account (كشف حساب)
  const getAccountStatement = (accountId: string, startDate?: string, endDate?: string) => {
    const targetAccount = accounts.find((a) => a.id === accountId);
    let running = 0;
    const lines: Array<{
      date: string;
      entryNumber: string;
      narration: string;
      debit: number;
      credit: number;
      balance: number;
    }> = [];

    let totalDebit = 0;
    let totalCredit = 0;

    const sortedEntries = [...journalEntries]
      .filter(isReportEligibleJournalEntry)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedEntries.forEach((entry) => {
      if (startDate && entry.date < startDate) return;
      if (endDate && entry.date > endDate) return;

      entry.lines.forEach((line) => {
        if (line.accountId === accountId) {
          totalDebit += line.debit;
          totalCredit += line.credit;

          if (targetAccount?.nature === 'debit') {
            running += (line.debit - line.credit);
          } else {
            running += (line.credit - line.debit);
          }

          lines.push({
            date: entry.date,
            entryNumber: entry.entryNumber,
            narration: line.description || entry.narrationAr,
            debit: line.debit,
            credit: line.credit,
            balance: running,
          });
        }
      });
    });

    return {
      account: targetAccount,
      lines,
      totalDebit,
      totalCredit,
      closingBalance: running,
    };
  };

  // Income Statement (قائمة الدخل - الأرباح والخسائر)
  const getIncomeStatement = (startDate?: string, endDate?: string) => {
    let totalRevenue = 0;
    let cogs = 0;
    let operatingExpenses = 0;
    let otherIncomeExpense = 0;

    const revenueBreakdown: Array<{ name: string; amount: number; code: string }> = [];
    const expenseBreakdown: Array<{ name: string; amount: number; code: string }> = [];

    accounts.forEach((acc) => {
      if (acc.type === 'revenue' && acc.isTransactional) {
        const stmt = getAccountStatement(acc.id, startDate, endDate);
        const net = stmt.totalCredit - stmt.totalDebit;
        if (net !== 0) {
          totalRevenue += net;
          revenueBreakdown.push({ name: acc.nameAr, amount: net, code: acc.code });
        }
      } else if (acc.type === 'expense' && acc.isTransactional) {
        const stmt = getAccountStatement(acc.id, startDate, endDate);
        const net = stmt.totalDebit - stmt.totalCredit;
        if (net !== 0) {
          if (acc.code.startsWith('51')) {
            cogs += net;
          } else {
            operatingExpenses += net;
          }
          expenseBreakdown.push({ name: acc.nameAr, amount: net, code: acc.code });
        }
      }
    });

    const grossProfit = totalRevenue - cogs;
    const netOperatingProfit = grossProfit - operatingExpenses;
    const netProfit = netOperatingProfit + otherIncomeExpense;

    return {
      totalRevenue,
      cogs,
      grossProfit,
      operatingExpenses,
      netOperatingProfit,
      otherIncomeExpense,
      netProfit,
      revenueBreakdown,
      expenseBreakdown,
    };
  };

  // Balance Sheet (الميزانية العمومية / قائمة المركز المالي)
  const getBalanceSheet = (asOfDate?: string) => {
    let currentAssets = 0;
    let nonCurrentAssets = 0;
    let currentLiabilities = 0;
    let nonCurrentLiabilities = 0;
    let totalEquity = 0;

    const assetAccounts: Account[] = [];
    const liabilityAccounts: Account[] = [];
    const equityAccounts: Account[] = [];

    accounts.forEach((acc) => {
      if (!acc.isTransactional) return;
      const stmt = getAccountStatement(acc.id, undefined, asOfDate);
      const bal = stmt.closingBalance;

      if (acc.type === 'asset') {
        assetAccounts.push({ ...acc, balance: bal });
        if (acc.code.startsWith('11')) {
          currentAssets += bal;
        } else {
          nonCurrentAssets += bal;
        }
      } else if (acc.type === 'liability') {
        liabilityAccounts.push({ ...acc, balance: bal });
        if (acc.code.startsWith('21')) {
          currentLiabilities += bal;
        } else {
          nonCurrentLiabilities += bal;
        }
      } else if (acc.type === 'equity') {
        equityAccounts.push({ ...acc, balance: bal });
        totalEquity += bal;
      }
    });

    const incomeStmt = getIncomeStatement(undefined, asOfDate);
    const retainedEarningsWithCurrentProfit = totalEquity + incomeStmt.netProfit;

    const totalAssets = currentAssets + nonCurrentAssets;
    const totalLiabilities = currentLiabilities + nonCurrentLiabilities;
    const totalLiabilitiesAndEquity = totalLiabilities + retainedEarningsWithCurrentProfit;

    const difference = Math.abs(totalAssets - totalLiabilitiesAndEquity);
    const isBalanced = difference < 0.05;

    return {
      totalAssets,
      currentAssets,
      nonCurrentAssets,
      totalLiabilities,
      currentLiabilities,
      nonCurrentLiabilities,
      totalEquity,
      retainedEarningsWithCurrentProfit,
      isBalanced,
      difference,
      assetAccounts,
      liabilityAccounts,
      equityAccounts,
    };
  };

  // Trial Balance (ميزان المراجعة بالأرصدة والمجاميع)
  const getTrialBalance = (startDate?: string, endDate?: string) => {
    return accounts
      .filter((a) => a.isTransactional)
      .map((acc) => {
        let openingBalance = 0;
        if (startDate) {
          const d = new Date(startDate);
          d.setDate(d.getDate() - 1);
          const dayBefore = d.toISOString().split('T')[0];
          const priorStmt = getAccountStatement(acc.id, undefined, dayBefore);
          openingBalance = priorStmt.closingBalance;
        }

        const stmt = getAccountStatement(acc.id, startDate, endDate);
        const closingBalance = startDate
          ? openingBalance + (acc.nature === 'debit' ? (stmt.totalDebit - stmt.totalCredit) : (stmt.totalCredit - stmt.totalDebit))
          : stmt.closingBalance;

        let netDebit = 0;
        let netCredit = 0;

        if (closingBalance >= 0) {
          if (acc.nature === 'debit') netDebit = closingBalance;
          else netCredit = closingBalance;
        } else {
          if (acc.nature === 'debit') netCredit = Math.abs(closingBalance);
          else netDebit = Math.abs(closingBalance);
        }

        return {
          account: acc,
          debit: stmt.totalDebit,
          credit: stmt.totalCredit,
          netDebit,
          netCredit,
          openingBalance,
          closingBalance,
        };
      });
  };

  // Cash Flow Statement (قائمة التدفقات النقدية - SOCPA / IFRS IAS 7)
  const getCashFlowStatement = (startDate?: string, endDate?: string): CashFlowStatement => {
    const incomeStmt = getIncomeStatement(startDate, endDate);
    const netProfit = incomeStmt.netProfit;

    // 1. Non-cash depreciation (acc 5205 etc.)
    let depreciation = 0;
    accounts.forEach((acc) => {
      if (acc.code.startsWith('5205') || acc.nameAr.includes('إهلاك') || acc.nameAr.includes('اهتلاك')) {
        const stmt = getAccountStatement(acc.id, startDate, endDate);
        depreciation += Math.max(0, stmt.totalDebit - stmt.totalCredit);
      }
    });

    const getDayBefore = (dateStr: string) => {
      const d = new Date(dateStr);
      d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0];
    };

    const getAccountDelta = (codePrefix: string, nature: 'debit' | 'credit') => {
      let startBal = 0;
      let endBal = 0;
      accounts.filter((a) => a.code.startsWith(codePrefix) && a.isTransactional).forEach((acc) => {
        const startStmt = startDate ? getAccountStatement(acc.id, undefined, getDayBefore(startDate)) : { closingBalance: 0 };
        const endStmt = getAccountStatement(acc.id, undefined, endDate);
        startBal += startStmt.closingBalance;
        endBal += endStmt.closingBalance;
      });
      return { startBal, endBal, delta: endBal - startBal };
    };

    // Working capital changes:
    // Receivables (1102): an increase in asset is a cash outflow (-)
    const ar = getAccountDelta('1102', 'debit');
    const receivablesChange = -ar.delta;

    // Inventory (1104): an increase in asset is a cash outflow (-)
    const inv = getAccountDelta('1104', 'debit');
    const inventoryChange = -inv.delta;

    // Payables (2101): an increase in liability is a cash inflow (+)
    const ap = getAccountDelta('2101', 'credit');
    const payablesChange = ap.delta;

    // VAT & Taxes (2102): an increase in tax liability is cash inflow (+)
    const vat = getAccountDelta('2102', 'credit');
    const vatLiabilityChange = vat.delta;

    // Other current liabilities (2103, 2104)
    const ocl = getAccountDelta('2103', 'credit');
    const otherCurrentLiabilitiesChange = ocl.delta;

    const totalWorkingCapitalChange =
      receivablesChange + inventoryChange + payablesChange + vatLiabilityChange + otherCurrentLiabilitiesChange;
    const netCashFromOperating = netProfit + depreciation + totalWorkingCapitalChange;

    const operatingDetails = [
      { name: 'صافي الربح للفترة المحاسبية', amount: netProfit, notes: 'من واقع قائمة الدخل الشامل' },
      { name: 'يضاف: مصروفات الإهلاك والإطفاء (غير نقدية)', amount: depreciation, notes: 'إهلاك الأصول الثابتة والمعدات' },
      {
        name: '(الزيادة) / النقص في حسابات المدينين والعملاء',
        amount: receivablesChange,
        code: '1102',
        notes: receivablesChange < 0 ? 'زيادة في الذمم المدينة (استخدام نقد)' : 'تحصيل من الذمم المدينة (توليد نقد)',
      },
      {
        name: '(الزيادة) / النقص في المخزون السلعي',
        amount: inventoryChange,
        code: '1104',
        notes: inventoryChange < 0 ? 'مشتريات مخزون إضافي' : 'انخفاض في بضاعة المخزون',
      },
      {
        name: 'الزيادة / (النقص) في حسابات الدائنين والموردين',
        amount: payablesChange,
        code: '2101',
        notes: payablesChange > 0 ? 'تسهيلات ائتمانية من الموردين' : 'سداد مستحقات الموردين',
      },
      {
        name: 'الزيادة / (النقص) في ضريبة القيمة المضافة ومستحقات ZATCA',
        amount: vatLiabilityChange,
        code: '2102',
        notes: 'أرصدة ضريبة المخرجات والمدخلات المعلقة',
      },
    ];

    // Investing Activities (Fixed Assets 1201 to 1205)
    let fixedAssetsAdditions = 0;
    let fixedAssetsDisposals = 0;
    const fixedAssets = accounts.filter(
      (a) => a.code.startsWith('12') && !a.nameAr.includes('مجمع') && a.isTransactional
    );
    fixedAssets.forEach((fa) => {
      const delta = getAccountDelta(fa.code, 'debit');
      if (delta.delta > 0) {
        fixedAssetsAdditions += delta.delta;
      } else if (delta.delta < 0) {
        fixedAssetsDisposals += Math.abs(delta.delta);
      }
    });
    const netCashFromInvesting = -fixedAssetsAdditions + fixedAssetsDisposals;

    const investingDetails = [];
    if (fixedAssetsAdditions > 0) {
      investingDetails.push({
        name: 'النقد المدفوع لشراء أصول ثابتة وتجهيزات',
        amount: -fixedAssetsAdditions,
        notes: 'استحواذات رأسمالية وتوسعات',
      });
    }
    if (fixedAssetsDisposals > 0) {
      investingDetails.push({
        name: 'المتحصلات النقدية من استبعاد وبيع أصول ثابتة',
        amount: fixedAssetsDisposals,
        notes: 'تدفق نقدي استثماري داخل',
      });
    }
    if (investingDetails.length === 0) {
      investingDetails.push({
        name: 'شراء وبيع أصول وممتلكات رأسمالية',
        amount: 0,
        notes: 'لا توجد حركات استثمارية رأسمالية خلال الفترة',
      });
    }

    // Financing Activities (3101 Capital, 3103 Drawings, 2201 Loans)
    const capDelta = getAccountDelta('3101', 'credit');
    const capitalAdditions = Math.max(0, capDelta.delta);

    const drawDelta = getAccountDelta('3103', 'debit');
    const drawingsAndDividends = Math.max(0, drawDelta.delta);

    const loanDelta = getAccountDelta('2201', 'credit');
    const loansChange = loanDelta.delta;

    const netCashFromFinancing = capitalAdditions - drawingsAndDividends + loansChange;

    const financingDetails = [];
    if (capitalAdditions > 0) {
      financingDetails.push({
        name: 'الزيادة في رأس المال وضخ مساهمات الشركاء',
        amount: capitalAdditions,
        code: '3101',
      });
    }
    if (drawingsAndDividends > 0) {
      financingDetails.push({
        name: 'المسحوبات النقدية وتوزيعات أرباح الشركاء',
        amount: -drawingsAndDividends,
        code: '3103',
      });
    }
    if (loansChange !== 0) {
      financingDetails.push({
        name: 'صافي التغير في القروض والتسهيلات البنكية طويلة الأجل',
        amount: loansChange,
        code: '2201',
      });
    }
    if (financingDetails.length === 0) {
      financingDetails.push({
        name: 'الأنشطة التمويلية ورأس المال',
        amount: 0,
        notes: 'لا توجد مسحوبات أو تمويلات إضافية خلال الفترة',
      });
    }

    // Cash Accounts Breakdown & Reconciliation (1101)
    const cashAccounts = accounts.filter((a) => a.code.startsWith('1101') && a.isTransactional);
    let beginningCash = 0;
    let endingCash = 0;
    const cashAccountsBreakdown: Array<{ name: string; code: string; balance: number }> = [];

    cashAccounts.forEach((acc) => {
      const startStmt = startDate
        ? getAccountStatement(acc.id, undefined, getDayBefore(startDate))
        : { closingBalance: 0 };
      const endStmt = getAccountStatement(acc.id, undefined, endDate);
      beginningCash += startStmt.closingBalance;
      endingCash += endStmt.closingBalance;
      cashAccountsBreakdown.push({ name: acc.nameAr, code: acc.code, balance: endStmt.closingBalance });
    });

    const netCashChange = endingCash - beginningCash;

    return {
      period: {
        startDate,
        endDate,
        label: startDate && endDate ? `من ${startDate} إلى ${endDate}` : 'كامل الفترة المالية',
      },
      operatingActivities: {
        netProfit,
        depreciation,
        workingCapitalChanges: {
          receivablesChange,
          inventoryChange,
          payablesChange,
          vatLiabilityChange,
          otherCurrentLiabilitiesChange,
          totalWorkingCapitalChange,
        },
        netCashFromOperating,
        details: operatingDetails,
      },
      investingActivities: {
        fixedAssetsAdditions,
        fixedAssetsDisposals,
        netCashFromInvesting,
        details: investingDetails,
      },
      financingActivities: {
        capitalAdditions,
        drawingsAndDividends,
        loansChange,
        netCashFromFinancing,
        details: financingDetails,
      },
      summary: {
        beginningCash,
        netCashChange,
        endingCash,
        cashAccountsBreakdown,
      },
    };
  };

  // ZATCA VAT Return Report (إقرار ضريبة القيمة المضافة)
  const getVatReturn = (startDate?: string, endDate?: string, period = 'الربع الحالي 2026'): VatReturnReport => {
    let standardRatedSales = 0;
    let standardRatedSalesVat = 0;
    let zeroRatedSales = 0;
    let exemptSales = 0;

    salesInvoices.forEach((inv) => {
      // Strictly include posted/issued invoices only (exclude draft, cancelled, reversed)
      if (inv.status !== 'posted' && inv.status !== 'issued') return;
      if (startDate && inv.issueDate < startDate) return;
      if (endDate && inv.issueDate > endDate) return;

      inv.items.forEach((item) => {
        if (item.vatRate === 0.15) {
          standardRatedSales += item.subtotal;
          standardRatedSalesVat += item.vatAmount;
        } else if (item.vatRate === 0) {
          zeroRatedSales += item.subtotal;
        } else {
          exemptSales += item.subtotal;
        }
      });
    });

    let standardRatedPurchases = 0;
    let standardRatedPurchasesVat = 0;
    let zeroRatedPurchases = 0;
    let exemptPurchases = 0;

    purchaseInvoices.forEach((pur) => {
      // Strictly include posted invoices only (exclude draft, cancelled, reversed)
      if (pur.status !== 'posted') return;
      if (startDate && pur.issueDate < startDate) return;
      if (endDate && pur.issueDate > endDate) return;

      pur.items.forEach((item) => {
        if (item.vatRate === 0.15) {
          standardRatedPurchases += item.subtotal;
          standardRatedPurchasesVat += item.vatAmount;
        } else if (item.vatRate === 0) {
          zeroRatedPurchases += item.subtotal;
        } else {
          exemptPurchases += item.subtotal;
        }
      });
    });

    // Simple Expenses that are posted
    simpleExpenses.forEach((exp) => {
      if (exp.status !== 'posted') return;
      if (startDate && exp.date < startDate) return;
      if (endDate && exp.date > endDate) return;

      if (exp.vatAmount > 0) {
        standardRatedPurchases += exp.amountBeforeVat;
        standardRatedPurchasesVat += exp.vatAmount;
      } else {
        exemptPurchases += exp.amountBeforeVat;
      }
    });

    // Factor in Credit Notes and Debit Notes (ZATCA VAT adjustments)
    debitCreditNotes.forEach((note) => {
      // Strictly include posted/issued notes only
      if (note.status !== 'posted' && note.status !== 'issued') return;
      if (startDate && note.issueDate < startDate) return;
      if (endDate && note.issueDate > endDate) return;

      if (note.type === 'credit_note' && note.partyType === 'customer') {
        // Customer Credit Note reduces standard sales & VAT output
        standardRatedSales = Math.max(0, standardRatedSales - note.taxableAmount);
        standardRatedSalesVat = Math.max(0, standardRatedSalesVat - note.vatTotal);
      } else if (note.type === 'debit_note' && note.partyType === 'supplier') {
        // Supplier Debit Note reduces standard purchases & VAT input
        standardRatedPurchases = Math.max(0, standardRatedPurchases - note.taxableAmount);
        standardRatedPurchasesVat = Math.max(0, standardRatedPurchasesVat - note.vatTotal);
      } else if (note.type === 'debit_note' && note.partyType === 'customer') {
        // Customer Debit Note increases standard sales & VAT output
        standardRatedSales += note.taxableAmount;
        standardRatedSalesVat += note.vatTotal;
      }
    });

    const totalSales = standardRatedSales + zeroRatedSales + exemptSales;
    const totalSalesVat = standardRatedSalesVat;

    const totalPurchases = standardRatedPurchases + zeroRatedPurchases + exemptPurchases;
    const totalPurchasesVat = standardRatedPurchasesVat;

    const netVatPayableOrRefundable = totalSalesVat - totalPurchasesVat;

    return {
      period,
      year: 2026,
      quarterOrMonth: period,
      standardRatedSales,
      standardRatedSalesVat,
      zeroRatedSales,
      exemptSales,
      totalSales,
      totalSalesVat,
      standardRatedPurchases,
      standardRatedPurchasesVat,
      zeroRatedPurchases,
      exemptPurchases,
      totalPurchases,
      totalPurchasesVat,
      netVatPayableOrRefundable,
    };
  };

  return (
    <AccountingContext.Provider
      value={{
        accounts,
        salesInvoices,
        purchaseInvoices,
        debitCreditNotes,
        vouchers,
        simpleExpenses,
        apiKeys,
        fiscalClosings,
        customers,
        suppliers,
        inventory,
        stockMovements,
        journalEntries,
        companySettings,
        auditLogs,
        activeTab,
        setActiveTab,
        logAuditEvent,
        clearAuditLogs,
        createSalesInvoice,
        createPurchaseInvoice,
        createDebitCreditNote,
        deleteDebitCreditNote,
        createVoucher,
        deleteVoucher,
        createSimpleExpense,
        deleteSimpleExpense,
        createApiKey,
        toggleApiKeyStatus,
        deleteApiKey,
        closeFiscalYear,
        reopenFiscalYear,
        recordInvoicePayment,
        createManualJournalEntry,
        postDocument,
        cancelDraftDocument,
        reversePostedDocument,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        toggleCustomerStatus,
        checkCustomerDependencies,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        toggleSupplierStatus,
        checkSupplierDependencies,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        toggleInventoryItemStatus,
        checkInventoryItemDependencies,
        adjustInventoryStock,
        addAccount,
        updateAccount,
        deleteAccount,
        toggleAccountStatus,
        checkAccountDependencies,
        updateCompanySettings,
        resetToDemoData,
        exportDataJson,
        importDataJson,
        validateBackupJson,
        createPreImportEmergencyBackup,
        getEmergencyBackupRecord,
        restoreEmergencyBackup,
        // POS & Branches State and Methods
        branches,
        cashRegisters,
        cashierShifts,
        parkedOrders,
        activeBranchId,
        setActiveBranchId,
        activeRegisterId,
        setActiveRegisterId,
        activeShift,
        addBranch,
        updateBranch,
        deleteBranch,
        toggleBranchStatus,
        checkBranchDependencies,
        addCashRegister,
        updateCashRegister,
        deleteCashRegister,
        toggleCashRegisterStatus,
        checkCashRegisterDependencies,
        startCashierShift,
        closeCashierShift,
        cashDropShift,
        parkOrder,
        resumeParkedOrder,
        deleteParkedOrder,
        processPosSale,
        // Financial statements
        getAccountStatement,
        getIncomeStatement,
        getBalanceSheet,
        getTrialBalance,
        getCashFlowStatement,
        getVatReturn,
        // Journal validation helpers
        validateJournalEntry: (entry: Partial<JournalEntry> & { lines?: Partial<JournalEntryLine>[] }) =>
          validateJournalEntry(entry, accounts),
        validateAccountForPosting: (accountIdentifier: string) =>
          validateAccountForPosting(accountIdentifier, accounts),
        // Inventory validation helpers
        validateSaleInventory: (items) => validateSaleInventory(items, inventory),
        validatePurchaseInventory: (items) => validatePurchaseInventory(items),
        checkDirectStockEditAllowed: (itemId: string) => checkDirectStockEditAllowed(itemId, stockMovements),
      }}
    >
      {children}
    </AccountingContext.Provider>
  );
};

export const useAccounting = () => {
  const context = useContext(AccountingContext);
  if (!context) {
    throw new Error('useAccounting must be used within an AccountingProvider');
  }
  return context;
};
