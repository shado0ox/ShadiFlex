import {
  Account,
  SalesInvoice,
  PurchaseInvoice,
  Customer,
  Supplier,
  InventoryItem,
  StockMovement,
  JournalEntry,
  CompanySettings,
  DebitCreditNote,
  Voucher,
  SimpleExpenseInvoice,
  ApiKey,
  FiscalYearClosing,
  FinancialPeriod,
  Branch,
  CashRegister,
  CashierShift,
  ParkedOrder,
} from '../types/accounting';

export interface AccountingDataSnapshot {
  companySettings: CompanySettings;
  accounts: Account[];
  customers: Customer[];
  suppliers: Supplier[];
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  debitCreditNotes: DebitCreditNote[];
  vouchers: Voucher[];
  simpleExpenses: SimpleExpenseInvoice[];
  journalEntries: JournalEntry[];
  apiKeys: ApiKey[];
  fiscalClosings: FiscalYearClosing[];
  financialPeriods?: FinancialPeriod[];
  branches: Branch[];
  cashRegisters: CashRegister[];
  cashierShifts: CashierShift[];
  parkedOrders: ParkedOrder[];
  activeBranchId: string;
  activeRegisterId: string;
  exportedAt?: string;
  schemaVersion?: number;
  version?: string;
}

export type StorageQuotaListener = (info: {
  isExceeded: boolean;
  messageAr: string;
  messageEn: string;
}) => void;

/**
 * Interface representing the persistence layer contract for the accounting system.
 * Components interact through this repository interface rather than directly touching storage drivers.
 */
export interface IAccountingRepository {
  // Quota & Error listeners
  onQuotaExceeded(listener: StorageQuotaListener): () => void;

  // Company & Settings
  loadCompanySettings(): CompanySettings;
  saveCompanySettings(settings: CompanySettings): void;

  // Chart of Accounts
  loadAccounts(): Account[];
  saveAccounts(accounts: Account[]): void;

  // Customers & Suppliers
  loadCustomers(): Customer[];
  saveCustomers(customers: Customer[]): void;
  loadSuppliers(): Supplier[];
  saveSuppliers(suppliers: Supplier[]): void;

  // Inventory & Stock Movements
  loadInventory(): InventoryItem[];
  saveInventory(inventory: InventoryItem[]): void;
  loadStockMovements(): StockMovement[];
  saveStockMovements(movements: StockMovement[]): void;

  // Invoices & Billing
  loadSalesInvoices(): SalesInvoice[];
  saveSalesInvoices(invoices: SalesInvoice[]): void;
  loadPurchaseInvoices(): PurchaseInvoice[];
  savePurchaseInvoices(invoices: PurchaseInvoice[]): void;

  // Debit/Credit Notes & Vouchers
  loadDebitCreditNotes(): DebitCreditNote[];
  saveDebitCreditNotes(notes: DebitCreditNote[]): void;
  loadVouchers(): Voucher[];
  saveVouchers(vouchers: Voucher[]): void;

  // Expenses & Journal Entries
  loadSimpleExpenses(): SimpleExpenseInvoice[];
  saveSimpleExpenses(expenses: SimpleExpenseInvoice[]): void;
  loadJournalEntries(): JournalEntry[];
  saveJournalEntries(entries: JournalEntry[]): void;

  // API Keys & Fiscal Closings & Financial Periods
  loadApiKeys(): ApiKey[];
  saveApiKeys(keys: ApiKey[]): void;
  loadFiscalClosings(): FiscalYearClosing[];
  saveFiscalClosings(closings: FiscalYearClosing[]): void;
  loadFinancialPeriods(): FinancialPeriod[];
  saveFinancialPeriods(periods: FinancialPeriod[]): void;

  // POS, Branches & Registers
  loadBranches(): Branch[];
  saveBranches(branches: Branch[]): void;
  loadCashRegisters(): CashRegister[];
  saveCashRegisters(registers: CashRegister[]): void;
  loadCashierShifts(): CashierShift[];
  saveCashierShifts(shifts: CashierShift[]): void;
  loadParkedOrders(): ParkedOrder[];
  saveParkedOrders(orders: ParkedOrder[]): void;
  loadActiveBranchId(): string;
  saveActiveBranchId(id: string): void;
  loadActiveRegisterId(): string;
  saveActiveRegisterId(id: string): void;

  // Backup, Import & Export
  getAllDataSnapshot(includeSanitizedKeysOnly?: boolean): AccountingDataSnapshot;
  exportDataJson(): string;
  importDataJson(json: string): boolean;
  resetToDemoData(): void;
}
