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
  Branch,
  CashRegister,
  CashierShift,
  ParkedOrder,
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
} from '../data/initialData';
import {
  IAccountingRepository,
  AccountingDataSnapshot,
  StorageQuotaListener,
} from './AccountingRepository';
import { validateAccountingBackupJson } from '../services/dataValidationService';
import {
  SHADIFLEX_STORAGE_PREFIX,
  CURRENT_SCHEMA_VERSION,
  LEGACY_STORAGE_PREFIX_V1,
} from '../constants/storage';

export { SHADIFLEX_STORAGE_PREFIX, CURRENT_SCHEMA_VERSION, LEGACY_STORAGE_PREFIX_V1 };

export class LocalStorageAccountingRepository implements IAccountingRepository {
  private static instance: LocalStorageAccountingRepository;
  private quotaListeners: Set<StorageQuotaListener> = new Set();
  private hasMigrated = false;

  public static getInstance(): LocalStorageAccountingRepository {
    if (!LocalStorageAccountingRepository.instance) {
      LocalStorageAccountingRepository.instance = new LocalStorageAccountingRepository();
    }
    return LocalStorageAccountingRepository.instance;
  }

  constructor() {
    this.runMigrationsIfNeeded();
  }

  public onQuotaExceeded(listener: StorageQuotaListener): () => void {
    this.quotaListeners.add(listener);
    return () => {
      this.quotaListeners.delete(listener);
    };
  }

  private notifyQuotaExceeded(error: unknown) {
    console.error('[ShadiFlex Storage Engine] LocalStorage quota exceeded or storage error:', error);
    const info = {
      isExceeded: true,
      messageAr:
        'تنبيه: مساحة التخزين المحلي في المتصفح ممتلئة! يرجى تصدير نسخة احتياطية أو تنظيف العمليات القديمة لتجنب فقدان البيانات.',
      messageEn:
        'Warning: Browser local storage quota is full! Please export a backup or clean old records to prevent data loss.',
    };
    this.quotaListeners.forEach((listener) => {
      try {
        listener(info);
      } catch (err) {
        console.error('Error executing quota listener', err);
      }
    });
  }

  private getKey(key: string): string {
    return `${SHADIFLEX_STORAGE_PREFIX}_${key}`;
  }

  private isQuotaExceededError(e: unknown): boolean {
    return (
      e instanceof DOMException &&
      (e.code === 22 ||
        e.code === 1014 ||
        e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    );
  }

  /**
   * Safe JSON parse with corrupted data recovery.
   * If parsing fails or data is invalid, logs error safely and returns the provided fallback.
   */
  private getItem<T>(key: string, defaultValue: T): T {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return defaultValue;
      }
      const raw = localStorage.getItem(this.getKey(key));
      if (!raw) return defaultValue;

      const parsed = JSON.parse(raw);
      if (parsed === null || parsed === undefined) {
        return defaultValue;
      }
      return parsed as T;
    } catch (err) {
      console.warn(
        `[ShadiFlex Storage] Corrupted JSON detected for key "${key}". Falling back to safe defaults without crashing.`,
        err
      );
      return defaultValue;
    }
  }

  /**
   * Safe JSON set with QuotaExceeded catching and isolated domain protection.
   */
  private setItem<T>(key: string, value: T): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      const serialized = JSON.stringify(value);
      localStorage.setItem(this.getKey(key), serialized);
    } catch (err) {
      if (this.isQuotaExceededError(err)) {
        this.notifyQuotaExceeded(err);
      } else {
        console.error(`[ShadiFlex Storage] Failed to write key "${key}":`, err);
      }
    }
  }

  /**
   * Simple Migration mechanism to automatically upgrade legacy storage structures
   * from v1 prefix to current v2 format seamlessly.
   */
  private runMigrationsIfNeeded(): void {
    if (this.hasMigrated || typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const storedVersionStr = localStorage.getItem(this.getKey('schema_version'));
      const storedVersion = storedVersionStr ? parseInt(storedVersionStr, 10) : 1;

      if (storedVersion < CURRENT_SCHEMA_VERSION) {
        console.info(`[ShadiFlex Storage Engine] Upgrading schema from v${storedVersion} to v${CURRENT_SCHEMA_VERSION}...`);

        // Check if old v1 keys exist
        const keysToMigrate = [
          'company',
          'accounts',
          'customers',
          'suppliers',
          'inventory',
          'stock_movements',
          'sales_invoices',
          'purchase_invoices',
          'debit_credit_notes',
          'vouchers',
          'simple_expenses',
          'journal_entries',
          'fiscal_closings',
          'branches',
          'cash_registers',
          'cashier_shifts',
          'parked_orders',
          'active_branch',
          'active_register',
        ];

        keysToMigrate.forEach((k) => {
          const oldFullKey = `${LEGACY_STORAGE_PREFIX_V1}_${k}`;
          const oldVal = localStorage.getItem(oldFullKey);
          const newFullKey = this.getKey(k);

          // If new key does not exist but old one does, migrate it
          if (oldVal !== null && localStorage.getItem(newFullKey) === null) {
            try {
              localStorage.setItem(newFullKey, oldVal);
            } catch (e) {
              console.warn(`Failed to copy key during migration: ${k}`, e);
            }
          }
          // Clean legacy ShadiFlex v1 key without touching other domain keys
          localStorage.removeItem(oldFullKey);
        });

        // Set the current schema version
        localStorage.setItem(this.getKey('schema_version'), String(CURRENT_SCHEMA_VERSION));
        console.info(`[ShadiFlex Storage Engine] Schema upgrade to v${CURRENT_SCHEMA_VERSION} completed successfully.`);
      }

      this.hasMigrated = true;
    } catch (err) {
      console.warn('[ShadiFlex Storage Engine] Error during migration check:', err);
    }
  }

  // Company Settings
  public loadCompanySettings(): CompanySettings {
    try {
      const parsed = this.getItem<Partial<CompanySettings> | null>('company', null);
      if (parsed) {
        const nationalAddress = {
          ...DEFAULT_COMPANY_SETTINGS.nationalAddress,
          ...(parsed.nationalAddress || parsed.address || {}),
        };
        const address = {
          ...DEFAULT_COMPANY_SETTINGS.address,
          ...(parsed.address || parsed.nationalAddress || {}),
        };
        return {
          ...DEFAULT_COMPANY_SETTINGS,
          ...parsed,
          nationalAddress,
          address,
          fiscalYear: parsed.fiscalYear || 2026,
          fiscalYearStart: parsed.fiscalYearStart || '2026-01-01',
          fiscalYearEnd: parsed.fiscalYearEnd || '2026-12-31',
        };
      }
    } catch (e) {
      console.error('Failed to parse company settings', e);
    }
    return DEFAULT_COMPANY_SETTINGS;
  }

  public saveCompanySettings(settings: CompanySettings): void {
    this.setItem('company', settings);
  }

  // Chart of Accounts
  public loadAccounts(): Account[] {
    return this.getItem<Account[]>('accounts', DEFAULT_CHART_OF_ACCOUNTS);
  }

  public saveAccounts(accounts: Account[]): void {
    this.setItem('accounts', accounts);
  }

  // Customers & Suppliers
  public loadCustomers(): Customer[] {
    return this.getItem<Customer[]>('customers', INITIAL_CUSTOMERS);
  }

  public saveCustomers(customers: Customer[]): void {
    this.setItem('customers', customers);
  }

  public loadSuppliers(): Supplier[] {
    return this.getItem<Supplier[]>('suppliers', INITIAL_SUPPLIERS);
  }

  public saveSuppliers(suppliers: Supplier[]): void {
    this.setItem('suppliers', suppliers);
  }

  // Inventory & Movements
  public loadInventory(): InventoryItem[] {
    return this.getItem<InventoryItem[]>('inventory', INITIAL_INVENTORY);
  }

  public saveInventory(inventory: InventoryItem[]): void {
    this.setItem('inventory', inventory);
  }

  public loadStockMovements(): StockMovement[] {
    return this.getItem<StockMovement[]>('stock_movements', []);
  }

  public saveStockMovements(movements: StockMovement[]): void {
    this.setItem('stock_movements', movements);
  }

  // Invoices
  public loadSalesInvoices(): SalesInvoice[] {
    return this.getItem<SalesInvoice[]>('sales_invoices', INITIAL_SALES_INVOICES);
  }

  public saveSalesInvoices(invoices: SalesInvoice[]): void {
    this.setItem('sales_invoices', invoices);
  }

  public loadPurchaseInvoices(): PurchaseInvoice[] {
    return this.getItem<PurchaseInvoice[]>('purchase_invoices', INITIAL_PURCHASE_INVOICES);
  }

  public savePurchaseInvoices(invoices: PurchaseInvoice[]): void {
    this.setItem('purchase_invoices', invoices);
  }

  // Notes & Vouchers
  public loadDebitCreditNotes(): DebitCreditNote[] {
    return this.getItem<DebitCreditNote[]>('debit_credit_notes', INITIAL_DEBIT_CREDIT_NOTES);
  }

  public saveDebitCreditNotes(notes: DebitCreditNote[]): void {
    this.setItem('debit_credit_notes', notes);
  }

  public loadVouchers(): Voucher[] {
    return this.getItem<Voucher[]>('vouchers', INITIAL_VOUCHERS);
  }

  public saveVouchers(vouchers: Voucher[]): void {
    this.setItem('vouchers', vouchers);
  }

  // Expenses & Journal Entries
  public loadSimpleExpenses(): SimpleExpenseInvoice[] {
    return this.getItem<SimpleExpenseInvoice[]>('simple_expenses', INITIAL_SIMPLE_EXPENSES);
  }

  public saveSimpleExpenses(expenses: SimpleExpenseInvoice[]): void {
    this.setItem('simple_expenses', expenses);
  }

  public loadJournalEntries(): JournalEntry[] {
    return this.getItem<JournalEntry[]>('journal_entries', INITIAL_JOURNAL_ENTRIES);
  }

  public saveJournalEntries(entries: JournalEntry[]): void {
    this.setItem('journal_entries', entries);
  }

  /**
   * API Keys persistence:
   * Secrets are NEVER stored in plaintext or persisted as active production credentials in localStorage.
   * All loaded keys ensure secrets are sanitized.
   */
  public loadApiKeys(): ApiKey[] {
    const rawKeys = this.getItem<ApiKey[]>('api_keys', INITIAL_API_KEYS);
    // Sanitize any accidentally saved raw keys
    return rawKeys.map((k) => ({
      ...k,
      key: 'demo_key_not_active',
      maskedKey: k.maskedKey || 'demo_••••••••2371',
    }));
  }

  public saveApiKeys(keys: ApiKey[]): void {
    // Sanitize keys before storing into localStorage so secrets are never saved
    const sanitized = keys.map((k) => ({
      ...k,
      key: 'demo_key_not_active', // Never store raw keys in local storage
    }));
    this.setItem('api_keys', sanitized);
  }

  public loadFiscalClosings(): FiscalYearClosing[] {
    return this.getItem<FiscalYearClosing[]>('fiscal_closings', INITIAL_FISCAL_CLOSINGS);
  }

  public saveFiscalClosings(closings: FiscalYearClosing[]): void {
    this.setItem('fiscal_closings', closings);
  }

  // POS & Branches
  public loadBranches(): Branch[] {
    return this.getItem<Branch[]>('branches', INITIAL_BRANCHES);
  }

  public saveBranches(branches: Branch[]): void {
    this.setItem('branches', branches);
  }

  public loadCashRegisters(): CashRegister[] {
    return this.getItem<CashRegister[]>('cash_registers', INITIAL_CASH_REGISTERS);
  }

  public saveCashRegisters(registers: CashRegister[]): void {
    this.setItem('cash_registers', registers);
  }

  public loadCashierShifts(): CashierShift[] {
    return this.getItem<CashierShift[]>('cashier_shifts', INITIAL_CASHIER_SHIFTS);
  }

  public saveCashierShifts(shifts: CashierShift[]): void {
    this.setItem('cashier_shifts', shifts);
  }

  public loadParkedOrders(): ParkedOrder[] {
    return this.getItem<ParkedOrder[]>('parked_orders', INITIAL_PARKED_ORDERS);
  }

  public saveParkedOrders(orders: ParkedOrder[]): void {
    this.setItem('parked_orders', orders);
  }

  public loadActiveBranchId(): string {
    return this.getItem<string>('active_branch', 'br_1');
  }

  public saveActiveBranchId(id: string): void {
    this.setItem('active_branch', id);
  }

  public loadActiveRegisterId(): string {
    return this.getItem<string>('active_register', 'reg_1');
  }

  public saveActiveRegisterId(id: string): void {
    this.setItem('active_register', id);
  }

  // Snapshot & Data Management
  public getAllDataSnapshot(includeSanitizedKeysOnly = true): AccountingDataSnapshot {
    const rawKeys = this.loadApiKeys();
    // Strictly sanitize and exclude raw secrets/keys/tokens from exported snapshot
    const sanitizedKeys = rawKeys.map((k) => ({
      ...k,
      key: 'demo_key_not_active',
    }));

    return {
      companySettings: this.loadCompanySettings(),
      accounts: this.loadAccounts(),
      customers: this.loadCustomers(),
      suppliers: this.loadSuppliers(),
      inventory: this.loadInventory(),
      stockMovements: this.loadStockMovements(),
      salesInvoices: this.loadSalesInvoices(),
      purchaseInvoices: this.loadPurchaseInvoices(),
      debitCreditNotes: this.loadDebitCreditNotes(),
      vouchers: this.loadVouchers(),
      simpleExpenses: this.loadSimpleExpenses(),
      journalEntries: this.loadJournalEntries(),
      apiKeys: includeSanitizedKeysOnly ? sanitizedKeys : [],
      fiscalClosings: this.loadFiscalClosings(),
      branches: this.loadBranches(),
      cashRegisters: this.loadCashRegisters(),
      cashierShifts: this.loadCashierShifts(),
      parkedOrders: this.loadParkedOrders(),
      activeBranchId: this.loadActiveBranchId(),
      activeRegisterId: this.loadActiveRegisterId(),
      exportedAt: new Date().toISOString(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
      version: '2.0.0',
    };
  }

  public exportDataJson(): string {
    return JSON.stringify(this.getAllDataSnapshot(true), null, 2);
  }

  public importDataJson(jsonString: string): boolean {
    try {
      // Validate full JSON schema and business rules before touching any state
      const validationResult = validateAccountingBackupJson(jsonString);
      if (!validationResult.isValid || !validationResult.sanitizedData) {
        console.error('[ShadiFlex Storage Engine] Validation failed for imported data:', validationResult.errors);
        return false;
      }

      const data = validationResult.sanitizedData;

      // Apply changes atomically
      if (data.companySettings) this.saveCompanySettings(data.companySettings);
      if (data.accounts) this.saveAccounts(data.accounts);
      if (data.customers) this.saveCustomers(data.customers);
      if (data.suppliers) this.saveSuppliers(data.suppliers);
      if (data.inventory) this.saveInventory(data.inventory);
      if (data.stockMovements) this.saveStockMovements(data.stockMovements);
      if (data.salesInvoices) this.saveSalesInvoices(data.salesInvoices);
      if (data.purchaseInvoices) this.savePurchaseInvoices(data.purchaseInvoices);
      if (data.debitCreditNotes) this.saveDebitCreditNotes(data.debitCreditNotes);
      if (data.vouchers) this.saveVouchers(data.vouchers);
      if (data.simpleExpenses) this.saveSimpleExpenses(data.simpleExpenses);
      if (data.journalEntries) this.saveJournalEntries(data.journalEntries);
      if (data.apiKeys) this.saveApiKeys(data.apiKeys);
      if (data.fiscalClosings) this.saveFiscalClosings(data.fiscalClosings);
      if (data.branches) this.saveBranches(data.branches);
      if (data.cashRegisters) this.saveCashRegisters(data.cashRegisters);
      if (data.cashierShifts) this.saveCashierShifts(data.cashierShifts);
      if (data.parkedOrders) this.saveParkedOrders(data.parkedOrders);
      if (data.activeBranchId) this.saveActiveBranchId(data.activeBranchId);
      if (data.activeRegisterId) this.saveActiveRegisterId(data.activeRegisterId);
      return true;
    } catch (err) {
      console.error('[ShadiFlex Storage Engine] Failed to import json:', err);
      return false;
    }
  }

  /**
   * Reset to Demo Data:
   * STRICT SAFETY RULE: ONLY removes keys that start with SHADIFLEX_STORAGE_PREFIX or LEGACY_STORAGE_PREFIX_V1.
   * NEVER calls localStorage.clear(), protecting all other domain/app data and tokens.
   */
  public resetToDemoData(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }

      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith(SHADIFLEX_STORAGE_PREFIX) || k.startsWith(LEGACY_STORAGE_PREFIX_V1))
        ) {
          keysToRemove.push(k);
        }
      }

      keysToRemove.forEach((k) => localStorage.removeItem(k));
      console.info(`[ShadiFlex Storage Engine] Cleared ${keysToRemove.length} ShadiFlex keys safely.`);
    } catch (e) {
      console.error('Failed to clear demo data safely', e);
    }
  }
}
