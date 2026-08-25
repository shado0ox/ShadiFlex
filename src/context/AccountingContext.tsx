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
import { generateZatcaTlvBase64 } from '../utils/zatca';
import { tafqeetArabic } from '../utils/currency';
import { getAccountingRepository } from '../services/dataService';

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

  addBranch: (branch: Omit<Branch, 'id' | 'createdAt'>) => Branch;
  updateBranch: (id: string, branch: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;

  addCashRegister: (register: Omit<CashRegister, 'id'>) => CashRegister;
  updateCashRegister: (id: string, register: Partial<CashRegister>) => void;
  deleteCashRegister: (id: string) => void;

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

  // Invoice & Accounting Operations
  createSalesInvoice: (invoice: Omit<SalesInvoice, 'id' | 'uuid' | 'zatcaQrBase64' | 'journalEntryId'>) => Promise<SalesInvoice>;
  createPurchaseInvoice: (invoice: Omit<PurchaseInvoice, 'id' | 'journalEntryId'>) => Promise<PurchaseInvoice>;
  createDebitCreditNote: (note: Omit<DebitCreditNote, 'id' | 'uuid' | 'zatcaQrBase64' | 'journalEntryId'>) => Promise<DebitCreditNote>;
  deleteDebitCreditNote: (id: string) => void;
  createVoucher: (voucher: Omit<Voucher, 'id' | 'amountInWordsAr' | 'journalEntryId' | 'createdAt'>) => Promise<Voucher>;
  deleteVoucher: (id: string) => void;
  createSimpleExpense: (expense: Omit<SimpleExpenseInvoice, 'id' | 'expenseNumber' | 'journalEntryId' | 'createdAt'>) => Promise<SimpleExpenseInvoice>;
  deleteSimpleExpense: (id: string) => void;
  recordInvoicePayment: (invoiceId: string, amount: number, paymentMethod: PaymentMethod) => void;
  createManualJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void;

  // API Keys & Integrations
  createApiKey: (keyData: Omit<ApiKey, 'id' | 'key' | 'maskedKey' | 'createdAt' | 'isActive'>) => ApiKey;
  toggleApiKeyStatus: (id: string) => void;
  deleteApiKey: (id: string) => void;

  // Financial Year Closing & Migration
  closeFiscalYear: (year: number, closingDate: string, closedBy: string, notes?: string) => Promise<FiscalYearClosing>;
  reopenFiscalYear: (closingId: string) => Promise<void>;

  // Master Data CRUD
  addCustomer: (customer: Omit<Customer, 'id' | 'balance'>) => Customer;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  addSupplier: (supplier: Omit<Supplier, 'id' | 'balance'>) => Supplier;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => InventoryItem;
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  adjustInventoryStock: (itemId: string, newStock: number, reason: string) => void;

  addAccount: (account: Omit<Account, 'id' | 'balance'>) => Account;
  updateAccount: (id: string, account: Partial<Account>) => void;
  deleteAccount: (id: string) => void;

  updateCompanySettings: (settings: CompanySettings) => void;
  resetToDemoData: () => void;
  exportDataJson: () => string;
  importDataJson: (json: string) => boolean;

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
  const [activeBranchId, setActiveBranchId] = useState<string>(() => repo.loadActiveBranchId());
  const [activeRegisterId, setActiveRegisterId] = useState<string>(() => repo.loadActiveRegisterId());

  // Calculate current active shift for active register
  const activeShift = cashierShifts.find(
    (s) => s.registerId === activeRegisterId && s.status === 'open'
  );

  // Save to persistence layer via Repository
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
    journalEntries,
    branches,
    cashRegisters,
    cashierShifts,
    parkedOrders,
    activeBranchId,
    activeRegisterId,
  ]);

  // Recalculate account balances based on journal entries
  const recalculateAccountBalances = (entries: JournalEntry[], baseAccounts: Account[]): Account[] => {
    const balances: Record<string, number> = {};

    entries.forEach((entry) => {
      entry.lines.forEach((line) => {
        if (!balances[line.accountId]) balances[line.accountId] = 0;
        const targetAcc = baseAccounts.find((a) => a.id === line.accountId);
        if (targetAcc) {
          if (targetAcc.nature === 'debit') {
            balances[line.accountId] += (line.debit - line.credit);
          } else {
            balances[line.accountId] += (line.credit - line.debit);
          }
        }
      });
    });

    return baseAccounts.map((acc) => {
      if (balances[acc.id] !== undefined) {
        return { ...acc, balance: balances[acc.id] };
      }
      return acc;
    });
  };

  // Create Sales Invoice with ZATCA TLV & Auto Double-Entry
  const createSalesInvoice = async (invoiceData: Omit<SalesInvoice, 'id' | 'uuid' | 'zatcaQrBase64' | 'journalEntryId'>): Promise<SalesInvoice> => {
    const newId = `inv_${Date.now()}`;
    const uuid = crypto.randomUUID ? crypto.randomUUID() : `uuid-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const nowIso = new Date().toISOString();
    const [issueDate, issueTimePart] = nowIso.split('T');
    const issueTime = issueTimePart.substring(0, 8);

    const tlvBase64 = generateZatcaTlvBase64({
      sellerName: companySettings.nameAr,
      vatNumber: companySettings.vatNumber,
      timestamp: `${invoiceData.issueDate || issueDate}T${issueTime}Z`,
      totalAmount: invoiceData.totalAmount,
      vatAmount: invoiceData.vatTotal,
    });

    // Determine target payment account
    let paymentAccId = 'acc_1102'; // Default: Accounts Receivable
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

    // Prepare Auto Journal Entry
    const jvId = `jv_${Date.now()}`;
    const jvNumber = `JV-2026-${(journalEntries.length + 1).toString().padStart(4, '0')}`;
    
    const lines = [
      {
        id: `jvl_${Date.now()}_1`,
        accountId: paymentAccId,
        accountCode: paymentAccCode,
        accountNameAr: paymentAccName,
        debit: invoiceData.totalAmount,
        credit: 0,
        description: `قيمة فاتورة مبيعات ${invoiceData.invoiceNumber} - ${invoiceData.customerName}`,
      },
      {
        id: `jvl_${Date.now()}_2`,
        accountId: 'acc_4101', // Sales revenue
        accountCode: '4101',
        accountNameAr: 'إيرادات مبيعات السلع (خاضعة لضريبة 15%)',
        debit: 0,
        credit: invoiceData.taxableAmount,
        description: `إيراد مبيعات فاتورة ${invoiceData.invoiceNumber}`,
      },
      {
        id: `jvl_${Date.now()}_3`,
        accountId: 'acc_2102', // Output VAT
        accountCode: '2102',
        accountNameAr: 'ضريبة القيمة المضافة على المخرجات (مستحقة لهيئة الزكاة)',
        debit: 0,
        credit: invoiceData.vatTotal,
        description: `ضريبة مخرجات 15% ZATCA - ${invoiceData.invoiceNumber}`,
      },
    ];

    const newJournalEntry: JournalEntry = {
      id: jvId,
      entryNumber: jvNumber,
      date: invoiceData.issueDate || issueDate,
      referenceType: 'sales_invoice',
      referenceId: newId,
      referenceNumber: invoiceData.invoiceNumber,
      narrationAr: `إثبات فاتورة مبيعات ${invoiceData.invoiceNumber} للعميل: ${invoiceData.customerName}`,
      lines,
      totalDebit: invoiceData.totalAmount,
      totalCredit: invoiceData.totalAmount,
      isBalanced: true,
      createdAt: nowIso,
    };

    const newInvoice: SalesInvoice = {
      ...invoiceData,
      id: newId,
      uuid,
      issueDate: invoiceData.issueDate || issueDate,
      issueTime: issueTime,
      zatcaQrBase64: tlvBase64,
      journalEntryId: jvId,
    };

    // Update Inventory stock & movements
    const newStockMovements: StockMovement[] = [];
    const updatedInventory = inventory.map((item) => {
      const lineItem = invoiceData.items.find((i) => i.itemId === item.id);
      if (lineItem) {
        const prev = item.currentStock;
        const newQty = Math.max(0, prev - lineItem.quantity);
        newStockMovements.push({
          id: `sm_${Date.now()}_${item.id}`,
          itemId: item.id,
          itemName: item.nameAr,
          date: invoiceData.issueDate || issueDate,
          type: 'sale',
          quantity: lineItem.quantity,
          previousStock: prev,
          newStock: newQty,
          referenceNumber: invoiceData.invoiceNumber,
          notes: `مبيعات فاتورة ${invoiceData.invoiceNumber}`,
        });
        return { ...item, currentStock: newQty };
      }
      return item;
    });

    // Update Customer balance if unpaid or partial
    if (invoiceData.remainingAmount > 0 && invoiceData.customerId) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === invoiceData.customerId ? { ...c, balance: c.balance + invoiceData.remainingAmount } : c))
      );
    }

    const updatedJournalEntries = [newJournalEntry, ...journalEntries];
    setJournalEntries(updatedJournalEntries);
    setSalesInvoices([newInvoice, ...salesInvoices]);
    setInventory(updatedInventory);
    if (newStockMovements.length > 0) {
      setStockMovements((prev) => [...newStockMovements, ...prev]);
    }

    // Refresh Account Balances
    setAccounts((prevAccs) => recalculateAccountBalances(updatedJournalEntries, prevAccs));

    return newInvoice;
  };

  // Create Purchase Invoice with Auto Double-Entry & Inventory Update
  const createPurchaseInvoice = async (purchaseData: Omit<PurchaseInvoice, 'id' | 'journalEntryId'>): Promise<PurchaseInvoice> => {
    const newId = `pur_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const [today] = nowIso.split('T');

    // Prepare Auto Journal Entry
    const jvId = `jv_${Date.now()}`;
    const jvNumber = `JV-2026-${(journalEntries.length + 1).toString().padStart(4, '0')}`;

    let creditAccId = 'acc_2101'; // Default: Accounts Payable (Suppliers)
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
        id: `jvl_${Date.now()}_1`,
        accountId: 'acc_1103', // Inventory Asset
        accountCode: '1103',
        accountNameAr: 'المخزون السلعي (بضاعة بالمستودع)',
        debit: purchaseData.taxableAmount,
        credit: 0,
        description: `شراء بضاعة فاتورة مورد ${purchaseData.supplierInvoiceNumber}`,
      },
      {
        id: `jvl_${Date.now()}_2`,
        accountId: 'acc_1104', // Input VAT Recoverable
        accountCode: '1104',
        accountNameAr: 'ضريبة القيمة المضافة على المدخلات (مستردة)',
        debit: purchaseData.vatTotal,
        credit: 0,
        description: `ضريبة مدخلات 15% مستردة - فاتورة ${purchaseData.supplierInvoiceNumber}`,
      },
      {
        id: `jvl_${Date.now()}_3`,
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
      referenceNumber: purchaseData.invoiceNumber,
      narrationAr: `إثبات فاتورة مشتريات ${purchaseData.invoiceNumber} من المورد: ${purchaseData.supplierName}`,
      lines,
      totalDebit: purchaseData.totalAmount,
      totalCredit: purchaseData.totalAmount,
      isBalanced: true,
      createdAt: nowIso,
    };

    const newPurchase: PurchaseInvoice = {
      ...purchaseData,
      id: newId,
      journalEntryId: jvId,
    };

    // Update Inventory stock & movements
    const newStockMovements: StockMovement[] = [];
    const updatedInventory = inventory.map((item) => {
      const lineItem = purchaseData.items.find((i) => i.itemId === item.id);
      if (lineItem) {
        const prev = item.currentStock;
        const newQty = prev + lineItem.quantity;
        newStockMovements.push({
          id: `sm_${Date.now()}_${item.id}`,
          itemId: item.id,
          itemName: item.nameAr,
          date: purchaseData.issueDate || today,
          type: 'purchase',
          quantity: lineItem.quantity,
          previousStock: prev,
          newStock: newQty,
          referenceNumber: purchaseData.invoiceNumber,
          notes: `مشتريات من المورد ${purchaseData.supplierName}`,
        });
        return {
          ...item,
          currentStock: newQty,
          purchasePrice: lineItem.unitPrice, // update cost price to latest
        };
      }
      return item;
    });

    // Update Supplier balance if unpaid
    if (purchaseData.paymentStatus !== 'paid' && purchaseData.supplierId) {
      setSuppliers((prev) =>
        prev.map((s) => (s.id === purchaseData.supplierId ? { ...s, balance: s.balance + (purchaseData.totalAmount - purchaseData.paidAmount) } : s))
      );
    }

    const updatedJournalEntries = [newJournalEntry, ...journalEntries];
    setJournalEntries(updatedJournalEntries);
    setPurchaseInvoices([newPurchase, ...purchaseInvoices]);
    setInventory(updatedInventory);
    if (newStockMovements.length > 0) {
      setStockMovements((prev) => [...newStockMovements, ...prev]);
    }

    setAccounts((prevAccs) => recalculateAccountBalances(updatedJournalEntries, prevAccs));

    return newPurchase;
  };

  // Create Debit / Credit Note with ZATCA TLV & Auto Double-Entry
  const createDebitCreditNote = async (noteData: Omit<DebitCreditNote, 'id' | 'uuid' | 'zatcaQrBase64' | 'journalEntryId'>): Promise<DebitCreditNote> => {
    const newId = `note_${Date.now()}`;
    const uuid = crypto.randomUUID ? crypto.randomUUID() : `uuid-note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const nowIso = new Date().toISOString();
    const [issueDate, issueTimePart] = nowIso.split('T');
    const issueTime = issueTimePart ? issueTimePart.substring(0, 8) : '12:00:00';

    const tlvBase64 = generateZatcaTlvBase64({
      sellerName: companySettings.nameAr,
      vatNumber: companySettings.vatNumber,
      timestamp: `${noteData.issueDate || issueDate}T${noteData.issueTime || issueTime}Z`,
      totalAmount: noteData.totalAmount,
      vatAmount: noteData.vatTotal,
    });

    const jvId = `jv_${Date.now()}`;
    const jvNumber = `JV-2026-${(journalEntries.length + 1).toString().padStart(4, '0')}`;
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
        // Debit: Sales Returns / Revenue (acc_4102 or acc_4101)
        const returnAcc = accounts.find((a) => a.code === '4102') || { id: 'acc_4101', code: '4101', nameAr: 'إيرادات مبيعات السلع (خاضعة لضريبة 15%)' };
        lines.push({
          id: `jvl_${Date.now()}_1`,
          accountId: returnAcc.id,
          accountCode: returnAcc.code,
          accountNameAr: returnAcc.nameAr,
          debit: noteData.taxableAmount,
          credit: 0,
          description: `إشعار دائن ${noteData.noteNumber} - ${noteData.reasonTextAr || 'مردودات ومسموحات مبيعات'}`,
        });

        // Debit: Output VAT (acc_2102) -> reduces VAT liability to ZATCA
        lines.push({
          id: `jvl_${Date.now()}_2`,
          accountId: 'acc_2102',
          accountCode: '2102',
          accountNameAr: 'ضريبة القيمة المضافة على المخرجات (مستحقة لهيئة الزكاة)',
          debit: noteData.vatTotal,
          credit: 0,
          description: `تخفيض ضريبة المخرجات 15% بإشعار دائن ZATCA ${noteData.noteNumber}`,
        });

        // Credit: Customer or Cash/Bank
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
          id: `jvl_${Date.now()}_3`,
          accountId: crAccId,
          accountCode: crAccCode,
          accountNameAr: crAccName,
          debit: 0,
          credit: noteData.totalAmount,
          description: `تسوية إشعار دائن للعميل ${noteData.partyName}`,
        });
      } else {
        // Credit Note from Supplier (زيادة التزام للمورد)
        lines.push({
          id: `jvl_${Date.now()}_1`,
          accountId: 'acc_1103',
          accountCode: '1103',
          accountNameAr: 'المخزون السلعي (بضاعة بالمستودع)',
          debit: noteData.taxableAmount,
          credit: 0,
          description: `إشعار دائن من المورد ${noteData.partyName}`,
        });
        lines.push({
          id: `jvl_${Date.now()}_2`,
          accountId: 'acc_1104',
          accountCode: '1104',
          accountNameAr: 'ضريبة القيمة المضافة على المدخلات (مستردة)',
          debit: noteData.vatTotal,
          credit: 0,
          description: `ضريبة مدخلات إشعار دائن مورد ${noteData.noteNumber}`,
        });
        lines.push({
          id: `jvl_${Date.now()}_3`,
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
        // Debit Note to Supplier (مردودات مشتريات / تخفيض مستحقات المورد)
        // Debit: Accounts Payable (acc_2101) -> reduces payable to supplier
        lines.push({
          id: `jvl_${Date.now()}_1`,
          accountId: 'acc_2101',
          accountCode: '2101',
          accountNameAr: 'الدائنون والموردون التجاريون',
          debit: noteData.totalAmount,
          credit: 0,
          description: `إشعار مدين للمورد ${noteData.partyName} - ${noteData.reasonTextAr || 'مردودات مشتريات'}`,
        });

        // Credit: Inventory (acc_1103)
        lines.push({
          id: `jvl_${Date.now()}_2`,
          accountId: 'acc_1103',
          accountCode: '1103',
          accountNameAr: 'المخزون السلعي (بضاعة بالمستودع)',
          debit: 0,
          credit: noteData.taxableAmount,
          description: `تخفيض المخزون بإشعار مدين ${noteData.noteNumber}`,
        });

        // Credit: Input VAT (acc_1104) -> reduces recoverable input VAT
        lines.push({
          id: `jvl_${Date.now()}_3`,
          accountId: 'acc_1104',
          accountCode: '1104',
          accountNameAr: 'ضريبة القيمة المضافة على المدخلات (مستردة)',
          debit: 0,
          credit: noteData.vatTotal,
          description: `تخفيض ضريبة المدخلات بإشعار مدين ${noteData.noteNumber}`,
        });
      } else {
        // Debit Note to Customer (إشعار مدين لعميل - زيادة رسوم أو فروقات أسعار)
        lines.push({
          id: `jvl_${Date.now()}_1`,
          accountId: 'acc_1102',
          accountCode: '1102',
          accountNameAr: 'المدينون والعملاء التجاريون',
          debit: noteData.totalAmount,
          credit: 0,
          description: `إشعار مدين للعميل ${noteData.partyName} - ${noteData.reasonTextAr || 'فروقات وفواتير إضافية'}`,
        });
        lines.push({
          id: `jvl_${Date.now()}_2`,
          accountId: 'acc_4101',
          accountCode: '4101',
          accountNameAr: 'إيرادات مبيعات السلع (خاضعة لضريبة 15%)',
          debit: 0,
          credit: noteData.taxableAmount,
          description: `إيرادات إشعار مدين ${noteData.noteNumber}`,
        });
        lines.push({
          id: `jvl_${Date.now()}_3`,
          accountId: 'acc_2102',
          accountCode: '2102',
          accountNameAr: 'ضريبة القيمة المضافة على المخرجات (مستحقة لهيئة الزكاة)',
          debit: 0,
          credit: noteData.vatTotal,
          description: `ضريبة مخرجات إشعار مدين ZATCA ${noteData.noteNumber}`,
        });
      }
    }

    const newJournalEntry: JournalEntry = {
      id: jvId,
      entryNumber: jvNumber,
      date: noteData.issueDate || issueDate,
      referenceType: noteData.type,
      referenceId: newId,
      referenceNumber: noteData.noteNumber,
      narrationAr: `إثبات ${noteData.type === 'credit_note' ? 'إشعار دائن (Credit Note)' : 'إشعار مدين (Debit Note)'} رقم ${noteData.noteNumber} - ${noteData.partyName}`,
      lines,
      totalDebit: noteData.totalAmount,
      totalCredit: noteData.totalAmount,
      isBalanced: true,
      createdAt: nowIso,
    };

    const newNote: DebitCreditNote = {
      ...noteData,
      id: newId,
      uuid,
      issueDate: noteData.issueDate || issueDate,
      issueTime: noteData.issueTime || issueTime,
      zatcaQrBase64: tlvBase64,
      journalEntryId: jvId,
    };

    // Update Inventory stock & movements if affectInventory is enabled
    const newStockMovements: StockMovement[] = [];
    let updatedInventory = [...inventory];

    if (noteData.affectInventory && noteData.items && noteData.items.length > 0) {
      updatedInventory = inventory.map((item) => {
        const lineItem = noteData.items.find((i) => i.itemId === item.id);
        if (lineItem) {
          const prev = item.currentStock;
          // Credit Note to Customer returns goods to warehouse (+ stock)
          // Debit Note to Supplier returns goods back to supplier (- stock)
          const isAddingToStock = (noteData.type === 'credit_note' && noteData.partyType === 'customer') ||
                                  (noteData.type === 'debit_note' && noteData.partyType === 'customer');
          const newQty = isAddingToStock ? prev + lineItem.quantity : Math.max(0, prev - lineItem.quantity);
          
          newStockMovements.push({
            id: `sm_${Date.now()}_${item.id}`,
            itemId: item.id,
            itemName: item.nameAr,
            date: noteData.issueDate || issueDate,
            type: isAddingToStock ? 'adjustment_in' : 'adjustment_out',
            quantity: lineItem.quantity,
            previousStock: prev,
            newStock: newQty,
            referenceNumber: noteData.noteNumber,
            notes: `${noteData.type === 'credit_note' ? 'إشعار دائن' : 'إشعار مدين'}: ${noteData.reasonTextAr || ''}`,
          });

          return { ...item, currentStock: newQty };
        }
        return item;
      });
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

    const updatedJournalEntries = [newJournalEntry, ...journalEntries];
    setJournalEntries(updatedJournalEntries);
    setDebitCreditNotes([newNote, ...debitCreditNotes]);
    if (noteData.affectInventory) {
      setInventory(updatedInventory);
      if (newStockMovements.length > 0) {
        setStockMovements((prev) => [...newStockMovements, ...prev]);
      }
    }

    setAccounts((prevAccs) => recalculateAccountBalances(updatedJournalEntries, prevAccs));
    return newNote;
  };

  const deleteDebitCreditNote = (id: string) => {
    setDebitCreditNotes((prev) => prev.filter((n) => n.id !== id));
  };

  // Create Receipt / Payment Voucher (سند قبض / سند صرف)
  const createVoucher = async (voucherData: Omit<Voucher, 'id' | 'amountInWordsAr' | 'journalEntryId' | 'createdAt'>): Promise<Voucher> => {
    const newId = `vch_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const [today] = nowIso.split('T');
    const amountInWords = tafqeetArabic(voucherData.amount);

    const jvId = `jv_${Date.now()}`;
    const jvNumber = `JV-2026-${(journalEntries.length + 1).toString().padStart(4, '0')}`;

    const lines = [
      {
        id: `jvl_${Date.now()}_1`,
        accountId: voucherData.debitAccountId,
        accountCode: voucherData.debitAccountCode,
        accountNameAr: voucherData.debitAccountNameAr,
        debit: voucherData.amount,
        credit: 0,
        description: `طرف مدين لسند ${voucherData.type === 'receipt' ? 'قبض' : 'صرف'} ${voucherData.voucherNumber} - ${voucherData.partyName}`,
      },
      {
        id: `jvl_${Date.now()}_2`,
        accountId: voucherData.creditAccountId,
        accountCode: voucherData.creditAccountCode,
        accountNameAr: voucherData.creditAccountNameAr,
        debit: 0,
        credit: voucherData.amount,
        description: `طرف دائن لسند ${voucherData.type === 'receipt' ? 'قبض' : 'صرف'} ${voucherData.voucherNumber} - ${voucherData.partyName}`,
      },
    ];

    const newJournalEntry: JournalEntry = {
      id: jvId,
      entryNumber: jvNumber,
      date: voucherData.date || today,
      referenceType: 'voucher',
      referenceId: newId,
      referenceNumber: voucherData.voucherNumber,
      narrationAr: `${voucherData.type === 'receipt' ? 'سند قبض مالي' : 'سند صرف مالي'} رقم ${voucherData.voucherNumber} - ${voucherData.partyName}: ${voucherData.description}`,
      lines,
      totalDebit: voucherData.amount,
      totalCredit: voucherData.amount,
      isBalanced: true,
      createdAt: nowIso,
    };

    const newVoucher: Voucher = {
      ...voucherData,
      id: newId,
      amountInWordsAr: amountInWords,
      journalEntryId: jvId,
      createdAt: nowIso,
    };

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

    const updatedJournalEntries = [newJournalEntry, ...journalEntries];
    setJournalEntries(updatedJournalEntries);
    setVouchers([newVoucher, ...vouchers]);
    setAccounts((prevAccs) => recalculateAccountBalances(updatedJournalEntries, prevAccs));

    return newVoucher;
  };

  const deleteVoucher = (id: string) => {
    setVouchers((prev) => prev.filter((v) => v.id !== id));
  };

  // Create Simple Expense Invoice (فاتورة مصروفات بسيطة / نثريات / كهرباء / وقود / صيانة...)
  const createSimpleExpense = async (
    expenseData: Omit<SimpleExpenseInvoice, 'id' | 'expenseNumber' | 'journalEntryId' | 'createdAt'>
  ): Promise<SimpleExpenseInvoice> => {
    const newId = `exp_${Date.now()}`;
    const expNumber = `EXP-2026-${(simpleExpenses.length + 1).toString().padStart(4, '0')}`;
    const nowIso = new Date().toISOString();
    const [today] = nowIso.split('T');

    const vatAmount = expenseData.vatRate > 0 ? Number((expenseData.amountBeforeVat * expenseData.vatRate).toFixed(2)) : 0;
    const totalAmount = Number((expenseData.amountBeforeVat + vatAmount).toFixed(2));

    const jvId = `jv_${Date.now()}`;
    const jvNumber = `JV-2026-${(journalEntries.length + 1).toString().padStart(4, '0')}`;

    // Auto Double-Entry lines:
    // 1. Debit: Expense Account (e.g. 520301 Electricity) -> amountBeforeVat
    // 2. Debit: Input VAT Recoverable (acc_1104 / 1104) -> vatAmount (if vat > 0)
    // 3. Credit: Payment Source Account (Cash 110101, Bank 110102, POS 110104, Petty Cash 110105) -> totalAmount
    const lines = [
      {
        id: `jvl_${Date.now()}_1`,
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
        id: `jvl_${Date.now()}_2`,
        accountId: 'acc_1104',
        accountCode: '1104',
        accountNameAr: 'ضريبة القيمة المضافة على المدخلات (مستردة)',
        debit: vatAmount,
        credit: 0,
        description: `ضريبة مدخلات 15% لفاتورة مصروف ${expNumber}`,
      });
    }

    lines.push({
      id: `jvl_${Date.now()}_3`,
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
      date: expenseData.date || today,
      referenceType: 'simple_expense',
      referenceId: newId,
      referenceNumber: expNumber,
      narrationAr: `فاتورة مصروفات ${expenseData.title} (${expenseData.vendorName}) - رقم: ${expNumber}`,
      lines,
      totalDebit: totalAmount,
      totalCredit: totalAmount,
      isBalanced: true,
      createdAt: nowIso,
    };

    const newExpense: SimpleExpenseInvoice = {
      ...expenseData,
      id: newId,
      expenseNumber: expNumber,
      vatAmount,
      totalAmount,
      journalEntryId: jvId,
      createdAt: nowIso,
    };

    const updatedJournalEntries = [newJournalEntry, ...journalEntries];
    setJournalEntries(updatedJournalEntries);
    setSimpleExpenses([newExpense, ...simpleExpenses]);
    setAccounts((prevAccs) => recalculateAccountBalances(updatedJournalEntries, prevAccs));

    return newExpense;
  };

  const deleteSimpleExpense = (id: string) => {
    const target = simpleExpenses.find((e) => e.id === id);
    if (!target) return;

    let updatedJournal = journalEntries;
    if (target.journalEntryId) {
      updatedJournal = journalEntries.filter((j) => j.id !== target.journalEntryId);
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
    return newApiKey;
  };

  const toggleApiKeyStatus = (id: string) => {
    setApiKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, isActive: !k.isActive } : k))
    );
  };

  const deleteApiKey = (id: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
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

    const jvId = `jv_${Date.now()}`;
    const jvNumber = `JV-2026-${(journalEntries.length + 1).toString().padStart(4, '0')}`;
    const [today] = new Date().toISOString().split('T');

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
    const newId = `jv_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const newEntry: JournalEntry = {
      ...entry,
      id: newId,
      createdAt: nowIso,
    };

    const updatedJournal = [newEntry, ...journalEntries];
    setJournalEntries(updatedJournal);
    setAccounts((prevAccs) => recalculateAccountBalances(updatedJournal, prevAccs));
  };

  // Customer Management
  const addCustomer = (data: Omit<Customer, 'id' | 'balance'>): Customer => {
    const newCust: Customer = {
      ...data,
      id: `cust_${Date.now()}`,
      balance: 0,
    };
    setCustomers((prev) => [...prev, newCust]);
    return newCust;
  };

  const updateCustomer = (id: string, data: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  // Supplier Management
  const addSupplier = (data: Omit<Supplier, 'id' | 'balance'>): Supplier => {
    const newSupp: Supplier = {
      ...data,
      id: `supp_${Date.now()}`,
      balance: 0,
    };
    setSuppliers((prev) => [...prev, newSupp]);
    return newSupp;
  };

  const updateSupplier = (id: string, data: Partial<Supplier>) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
  };

  const deleteSupplier = (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  };

  // Inventory Management
  const addInventoryItem = (data: Omit<InventoryItem, 'id'>): InventoryItem => {
    const newItem: InventoryItem = {
      ...data,
      id: `item_${Date.now()}`,
    };
    setInventory((prev) => [...prev, newItem]);
    return newItem;
  };

  const updateInventoryItem = (id: string, data: Partial<InventoryItem>) => {
    setInventory((prev) => prev.map((i) => (i.id === id ? { ...i, ...data } : i)));
  };

  const deleteInventoryItem = (id: string) => {
    setInventory((prev) => prev.filter((i) => i.id !== id));
  };

  const adjustInventoryStock = (itemId: string, newStock: number, reason: string) => {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;

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
        notes: reason || 'تسوية جردية يدوية',
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
    };
    setAccounts((prev) => [...prev, newAcc]);
    return newAcc;
  };

  const updateAccount = (id: string, data: Partial<Account>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
  };

  const deleteAccount = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const updateCompanySettings = (settings: CompanySettings) => {
    setCompanySettings(settings);
  };

  // Branch Management
  const addBranch = (data: Omit<Branch, 'id' | 'createdAt'>): Branch => {
    const newBranch: Branch = {
      ...data,
      id: `br_${Date.now()}`,
      createdAt: new Date().toISOString(),
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

  const deleteBranch = (id: string) => {
    setBranches((prev) => prev.filter((b) => b.id !== id));
  };

  // Cash Registers Management
  const addCashRegister = (data: Omit<CashRegister, 'id'>): CashRegister => {
    const newRegister: CashRegister = {
      ...data,
      id: `reg_${Date.now()}`,
      isActive: true,
      currentShiftId: null,
    };
    setCashRegisters((prev) => [...prev, newRegister]);
    return newRegister;
  };

  const updateCashRegister = (id: string, data: Partial<CashRegister>) => {
    setCashRegisters((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
  };

  const deleteCashRegister = (id: string) => {
    setCashRegisters((prev) => prev.filter((r) => r.id !== id));
  };

  // Shift Management (X / Z Reports)
  const startCashierShift = (registerId: string, cashierName: string, openingCash: number): CashierShift => {
    const register = cashRegisters.find((r) => r.id === registerId);
    const shiftCount = cashierShifts.length + 1;
    const shiftNumber = `SH-2026-${shiftCount.toString().padStart(4, '0')}`;
    const newShift: CashierShift = {
      id: `shift_${Date.now()}`,
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
    const zReportNum = `Z-2026-${Math.floor(1000 + Math.random() * 9000)}`;
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
    const orderNum = `HOLD-${(parkedOrders.length + 1).toString().padStart(2, '0')}`;
    const newParked: ParkedOrder = {
      ...orderData,
      id: `hold_${Date.now()}`,
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

    const invSeq = salesInvoices.length + 1;
    const invoiceNumber = `POS-${new Date().getFullYear()}-${invSeq.toString().padStart(5, '0')}`;
    const newId = `inv_pos_${Date.now()}`;
    const uuid = crypto.randomUUID ? crypto.randomUUID() : `uuid-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

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
    const jvId = `jv_${Date.now()}`;
    const jvNumber = `JV-POS-${(journalEntries.length + 1).toString().padStart(4, '0')}`;

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
      status: 'issued',
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
        const newStock = Math.max(0, prevStock - lineItem.quantity);
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
  };

  const exportDataJson = (): string => {
    return repo.exportDataJson();
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

    const sortedEntries = [...journalEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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

    // Factor in Credit Notes and Debit Notes (ZATCA VAT adjustments)
    debitCreditNotes.forEach((note) => {
      if (note.status === 'cancelled') return;
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
        activeTab,
        setActiveTab,
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
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        adjustInventoryStock,
        addAccount,
        updateAccount,
        deleteAccount,
        updateCompanySettings,
        resetToDemoData,
        exportDataJson,
        importDataJson,
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
        addCashRegister,
        updateCashRegister,
        deleteCashRegister,
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
