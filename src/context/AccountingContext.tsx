import React, { createContext, useContext, useMemo } from 'react';
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
  DocumentType,
  AuditLogEntry,
  AuditLogAction,
  AuditLogEntityType,
  FinancialPeriod,
} from '../types/accounting';

import {
  CompanyProvider,
  useCompanySettings,
  FiscalPeriodsProvider,
  useFiscalPeriods,
  AccountsProvider,
  useAccounts,
  CustomersSuppliersProvider,
  useCustomersSuppliers,
  InventoryProvider,
  useInventory,
  JournalProvider,
  useJournal,
  InvoicesProvider,
  useInvoices,
  POSProvider,
  usePOS,
  ReportsProvider,
  useReports,
} from './modules';

export * from './modules';

import { JournalValidationResult } from '../services/journalValidationService';
import { InventoryValidationResult } from '../services/inventoryValidationService';
import { EmergencyBackupRecord, BackupValidationResult } from '../services/dataValidationService';

export interface AccountingContextType {
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

export const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

const AccountingInnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const company = useCompanySettings();
  const fiscal = useFiscalPeriods();
  const accs = useAccounts();
  const custSupp = useCustomersSuppliers();
  const inv = useInventory();
  const jv = useJournal();
  const invoices = useInvoices();
  const pos = usePOS();
  const reports = useReports();

  const combinedValue: AccountingContextType = useMemo(
    () => ({
      ...company,
      ...fiscal,
      ...accs,
      ...custSupp,
      ...inv,
      ...jv,
      ...invoices,
      ...pos,
      ...reports,
    }),
    [company, fiscal, accs, custSupp, inv, jv, invoices, pos, reports]
  );

  return <AccountingContext.Provider value={combinedValue}>{children}</AccountingContext.Provider>;
};

export const AccountingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <CompanyProvider>
      <FiscalPeriodsProvider>
        <AccountsProvider>
          <CustomersSuppliersProvider>
            <InventoryProvider>
              <JournalProvider>
                <InvoicesProvider>
                  <POSProvider>
                    <ReportsProvider>
                      <AccountingInnerProvider>{children}</AccountingInnerProvider>
                    </ReportsProvider>
                  </POSProvider>
                </InvoicesProvider>
              </JournalProvider>
            </InventoryProvider>
          </CustomersSuppliersProvider>
        </AccountsProvider>
      </FiscalPeriodsProvider>
    </CompanyProvider>
  );
};

export const useAccounting = (): AccountingContextType => {
  const context = useContext(AccountingContext);
  if (!context) {
    throw new Error('useAccounting must be used within an AccountingProvider');
  }
  return context;
};
