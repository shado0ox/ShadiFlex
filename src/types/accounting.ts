export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type AccountNature = 'debit' | 'credit';

export type DocumentStatus = 'draft' | 'posted' | 'cancelled' | 'reversed';
export type DocumentType =
  | 'sales_invoice'
  | 'purchase_invoice'
  | 'journal_entry'
  | 'voucher'
  | 'debit_credit_note'
  | 'simple_expense';

export interface DependencyCheckResult {
  canDelete: boolean;
  reason?: string;
  details?: Record<string, number | string | boolean>;
  dependenciesSummary?: Array<{ label: string; count: number }>;
}

export interface Account {
  id: string;
  code: string; // e.g. '1101', '1102'
  nameAr: string;
  nameEn: string;
  type: AccountType;
  nature: AccountNature;
  parentId?: string | null;
  level: number; // 1 = Main, 2 = Sub, 3 = Sub-sub, etc.
  isTransactional: boolean; // Can journal entries post directly to this account?
  balance: number; // Current balance in SAR
  description?: string;
  isActive?: boolean;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit' | 'pos_card' | 'mada' | 'cheque';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid';
export type InvoiceType = 'tax_invoice' | 'simplified_tax_invoice'; // فاتورة ضريبية (B2B) أو فاتورة ضريبية مبسطة (B2C)

export interface InvoiceItem {
  id: string;
  itemId?: string; // Link to inventory product if applicable
  nameAr: string;
  nameEn?: string;
  quantity: number;
  unit: string; // قطعة, كرتون, خدمة, متر, ساعة, إلخ
  unitPrice: number; // Excl. VAT
  discount: number; // Amount
  vatRate: number; // 0.15 (15%), 0.00 (0%), -1 (Exempt)
  vatAmount: number;
  subtotal: number; // (quantity * unitPrice) - discount
  totalWithVat: number; // subtotal + vatAmount
}

export interface Customer {
  id: string;
  nameAr: string;
  nameEn?: string;
  vatNumber?: string; // 15 digits Saudi VAT number (starts and ends with 3)
  crNumber?: string; // Commercial Registration السجل التجاري
  phone: string;
  email?: string;
  address?: {
    street?: string;
    district?: string;
    city: string;
    postalCode?: string;
    buildingNumber?: string;
    additionalNumber?: string;
  };
  balance: number; // Current accounts receivable balance
  isActive?: boolean;
}

export interface Supplier {
  id: string;
  nameAr: string;
  nameEn?: string;
  vatNumber?: string;
  crNumber?: string;
  phone: string;
  email?: string;
  city?: string;
  balance: number; // Current accounts payable balance
  isActive?: boolean;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string; // e.g. INV-2026-0001
  uuid: string; // ZATCA UUID
  issueDate: string; // YYYY-MM-DD
  issueTime: string; // HH:mm:ss
  dueDate?: string;
  type: InvoiceType;
  customerId: string;
  customerName: string;
  customerVatNumber?: string;
  customerCrNumber?: string;
  customerAddress?: string;
  items: InvoiceItem[];
  subtotal: number; // Total before discount & tax
  discountTotal: number;
  taxableAmount: number; // After discount, before VAT
  vatTotal: number; // 15%
  totalAmount: number; // Grand total including VAT
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  remainingAmount: number;
  notes?: string;
  zatcaQrBase64?: string;
  journalEntryId?: string;
  status: DocumentStatus;
  postedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  reversalReason?: string;
  reversalDate?: string;
  reversalJournalEntryId?: string;
  reversedAt?: string;
  // POS & Branch additions
  isPosSale?: boolean;
  branchId?: string;
  branchName?: string;
  registerId?: string;
  registerName?: string;
  shiftId?: string;
  cashierName?: string;
  cashTendered?: number; // المبلغ المدفوع نقداً
  changeReturned?: number; // الباقي المسترجع
  madaAuthCode?: string; // رقم تفويض مدى
  splitPaymentDetails?: {
    cashAmount: number;
    madaAmount: number;
  };
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string; // Internal purchase number
  supplierInvoiceNumber: string; // Supplier's invoice reference number
  issueDate: string;
  dueDate?: string;
  supplierId: string;
  supplierName: string;
  supplierVatNumber?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxableAmount: number;
  vatTotal: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  notes?: string;
  journalEntryId?: string;
  status: DocumentStatus;
  postedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  reversalReason?: string;
  reversalDate?: string;
  reversalJournalEntryId?: string;
  reversedAt?: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  barcode?: string;
  nameAr: string;
  nameEn?: string;
  category: string;
  unit: string;
  purchasePrice: number; // Cost excl. VAT
  salePrice: number; // Selling price excl. VAT
  currentStock: number;
  minStockAlert: number;
  vatRate: number; // standard 0.15
  accountId?: string; // Inventory asset account (e.g. 1104)
  cogsAccountId?: string; // COGS expense account (e.g. 5101)
  salesAccountId?: string; // Sales revenue account (e.g. 4101)
  isActive?: boolean;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  date: string;
  type:
    | 'sale'
    | 'purchase'
    | 'adjustment_in'
    | 'adjustment_out'
    | 'initial'
    | 'sale_reversal'
    | 'purchase_reversal'
    | 'return_in'
    | 'return_out';
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceNumber: string; // Invoice number or adjustment ref
  documentType?: string; // e.g. 'sales_invoice', 'purchase_invoice', 'credit_note', 'debit_note', 'pos_sale', 'inventory_adjustment', 'sales_invoice_reversal', 'purchase_invoice_reversal'
  documentId?: string; // ID of the related document
  notes?: string;
}

export type NoteType = 'credit_note' | 'debit_note';
export type NotePartyType = 'customer' | 'supplier';
export type NoteReason = 
  | 'goods_return' // مردودات بضاعة
  | 'post_sale_discount' // خصم تجاري بعد البيع
  | 'invoice_correction' // تصحيح خطأ أو زيادة في الفاتورة الأصلية
  | 'price_adjustment' // تعديل في الأسعار المتفق عليها
  | 'damaged_goods' // تعويض بضاعة تالفة
  | 'cancelled_service' // إلغاء خدمة أو جزء من العقد
  | 'other'; // أسباب أخرى

export interface DebitCreditNote {
  id: string;
  noteNumber: string; // e.g. CN-2026-0001 or DN-2026-0001
  uuid: string; // ZATCA UUID
  type: NoteType; // 'credit_note' | 'debit_note'
  partyType: NotePartyType; // 'customer' | 'supplier'
  partyId: string;
  partyName: string;
  partyVatNumber?: string;
  partyCrNumber?: string;
  issueDate: string; // YYYY-MM-DD
  issueTime: string; // HH:mm:ss
  originalInvoiceId?: string;
  originalInvoiceNumber?: string;
  originalInvoiceDate?: string;
  reason: NoteReason;
  reasonTextAr: string; // سبب الإصدار باللغة العربية
  items: InvoiceItem[];
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  vatTotal: number;
  totalAmount: number;
  affectInventory: boolean; // هل تعيد/تسحب الكميات من المخزون
  refundMethod: PaymentMethod | 'account_balance';
  zatcaQrBase64?: string;
  journalEntryId?: string;
  status: DocumentStatus;
  postedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  reversalReason?: string;
  reversalDate?: string;
  reversalJournalEntryId?: string;
  reversedAt?: string;
  notes?: string;
}

export type VoucherType = 'receipt' | 'payment'; // سند قبض أو سند صرف
export type VoucherPartyType = 'customer' | 'supplier' | 'expense' | 'employee' | 'partner' | 'other';

export interface Voucher {
  id: string;
  voucherNumber: string; // e.g. RV-2026-0001 (Receipt) or PV-2026-0001 (Payment)
  type: VoucherType;
  date: string;
  partyType: VoucherPartyType;
  partyId?: string;
  partyName: string;
  partyVatNumber?: string;
  amount: number;
  amountInWordsAr: string;
  paymentMethod: PaymentMethod;
  
  // Debit Account Details
  debitAccountId: string;
  debitAccountCode: string;
  debitAccountNameAr: string;

  // Credit Account Details
  creditAccountId: string;
  creditAccountCode: string;
  creditAccountNameAr: string;

  chequeOrTransferNumber?: string;
  chequeNumber?: string;
  chequeDueDate?: string;
  transferReference?: string;
  bankName?: string;
  description: string; // البيان / الغرض
  relatedInvoiceId?: string;
  relatedInvoiceNumber?: string;
  receivedBy?: string; // المستلم
  paidBy?: string; // المسلّم / المحاسب
  approvedBy?: string; // المعتمد
  journalEntryId?: string;
  status: DocumentStatus;
  postedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  reversalReason?: string;
  reversalDate?: string;
  reversalJournalEntryId?: string;
  reversedAt?: string;
  createdAt: string;
}

export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountNameAr: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string; // e.g. JV-2026-0001
  date: string;
  referenceType: 'manual' | 'sales_invoice' | 'purchase_invoice' | 'payment' | 'receipt' | 'inventory_adjustment' | 'credit_note' | 'debit_note' | 'voucher' | 'simple_expense' | 'year_closing';
  referenceId?: string;
  referenceNumber?: string;
  narrationAr: string; // Description / البيان
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  status?: DocumentStatus;
  isReversal?: boolean;
  reversedEntryId?: string; // المعرّف للقيد الأصلي إذا كان هذا قيداً عكسياً
  reversedEntryNumber?: string;
  reversalEntryId?: string; // المعرّف للقيد العكسي إذا تم عكس هذا القيد
  reversalEntryNumber?: string;
  reversalReason?: string;
  reversalDate?: string;
  reversedAt?: string;
  postedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
}

export interface CompanySettings {
  nameAr: string;
  nameEn: string;
  vatNumber: string; // 15-digit ZATCA VAT Number
  crNumber: string; // 10-digit Commercial Registration
  phone: string;
  email: string;
  website?: string;
  currency: string;
  currencySymbol: string;
  financialYearStart: string; // MM-DD, e.g., '01-01'
  fiscalYear?: number;
  fiscalYearStart?: string;
  fiscalYearEnd?: string;
  nationalAddress: {
    buildingNumber: string;
    street: string;
    district: string;
    city: string;
    postalCode: string;
    additionalNumber: string;
    country: string;
  };
  address?: {
    buildingNumber?: string;
    street?: string;
    district?: string;
    city?: string;
    postalCode?: string;
    additionalNumber?: string;
    country?: string;
  };
  bankDetails: {
    bankName: string;
    iban: string;
    accountHolder: string;
  };
  invoiceFooterNotesAr: string;
  invoiceFooterNotesEn: string;
}

export interface VatReturnReport {
  period: string;
  year: number;
  quarterOrMonth: string;
  standardRatedSales: number; // 15% sales base
  standardRatedSalesVat: number; // 15% sales vat
  zeroRatedSales: number;
  exemptSales: number;
  totalSales: number;
  totalSalesVat: number;
  
  standardRatedPurchases: number; // 15% purchases base
  standardRatedPurchasesVat: number; // 15% purchases vat
  zeroRatedPurchases: number;
  exemptPurchases: number;
  totalPurchases: number;
  totalPurchasesVat: number;
  
  netVatPayableOrRefundable: number; // Output VAT - Input VAT
}

export type ReportPeriodType = 'monthly' | 'quarterly' | 'annual' | 'custom';

export interface CashFlowActivityItem {
  name: string;
  amount: number;
  code?: string;
  notes?: string;
}

export interface CashFlowStatement {
  period: {
    startDate?: string;
    endDate?: string;
    label: string;
  };
  operatingActivities: {
    netProfit: number;
    depreciation: number;
    workingCapitalChanges: {
      receivablesChange: number;
      inventoryChange: number;
      payablesChange: number;
      vatLiabilityChange: number;
      otherCurrentLiabilitiesChange: number;
      totalWorkingCapitalChange: number;
    };
    netCashFromOperating: number;
    details: CashFlowActivityItem[];
  };
  investingActivities: {
    fixedAssetsAdditions: number;
    fixedAssetsDisposals: number;
    netCashFromInvesting: number;
    details: CashFlowActivityItem[];
  };
  financingActivities: {
    capitalAdditions: number;
    drawingsAndDividends: number;
    loansChange: number;
    netCashFromFinancing: number;
    details: CashFlowActivityItem[];
  };
  summary: {
    beginningCash: number;
    netCashChange: number;
    endingCash: number;
    cashAccountsBreakdown: Array<{ name: string; code: string; balance: number }>;
  };
}

export type SimpleExpenseCategory =
  | 'electricity' // كهرباء
  | 'water' // مياه
  | 'internet_telecom' // إنترنت واتصالات وهاتف
  | 'fuel_petrol' // بنزين ووقود ومحروقات
  | 'maintenance_repair' // صيانة وإصلاحات
  | 'office_stationery' // أدوات مكتبية وقرطاسية ومطبوعات
  | 'hospitality_pantry' // ضيافة وبوفيه ونثريات
  | 'government_fees' // رسوم حكومية وتراخيص
  | 'software_tech' // اشتراكات تقنية وسحابية
  | 'cleaning_facility' // نظافة وأمن ومرافق
  | 'rent' // إيجار فرعي أو مؤقت
  | 'other'; // أخرى

export interface SimpleExpenseInvoice {
  id: string;
  expenseNumber: string; // e.g. EXP-2026-0001
  category: SimpleExpenseCategory;
  title: string; // عنوان الفاتورة أو الوصف
  date: string; // YYYY-MM-DD
  vendorName: string; // اسم المورد أو الجهة
  vendorVatNumber?: string; // الرقم الضريبي للمورد إن وجد
  vendorInvoiceRef?: string; // رقم فاتورة المورد
  
  expenseAccountId: string; // حساب المصروف في شجرة الحسابات
  expenseAccountCode: string;
  expenseAccountNameAr: string;

  amountBeforeVat: number; // المبلغ قبل الضريبة (الأساس الخاضع)
  vatRate: number; // 0.15 أو 0 أو -1 (معفى)
  vatAmount: number; // قيمة ضريبة القيمة المضافة 15%
  totalAmount: number; // المبلغ الإجمالي شامل الضريبة

  paymentMethod: PaymentMethod | 'petty_cash';
  paidThroughAccountId: string; // حساب الدفع (الصندوق 110101، البنك 110102، مدى 110104، عهدة 110105)
  paidThroughAccountCode: string;
  paidThroughAccountNameAr: string;

  employeeName?: string; // الموظف المسؤول / صاحب العهدة
  notes?: string;
  attachmentName?: string;
  attachmentDataUrl?: string; // صورة الفاتورة إن وجدت
  journalEntryId?: string;
  status: DocumentStatus;
  postedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  reversalReason?: string;
  reversalDate?: string;
  reversalJournalEntryId?: string;
  reversedAt?: string;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string; // e.g. متجر سلة Salla, تطبيق نقاط البيع POS
  key: string; // sk_live_... or sk_test_...
  maskedKey: string;
  environment: 'production' | 'test';
  permissions: Array<'invoices:read' | 'invoices:write' | 'expenses:read' | 'expenses:write' | 'zatca:sync' | 'reports:read'>;
  createdAt: string;
  lastUsedAt?: string;
  isActive: boolean;
}

export interface FiscalYearClosing {
  id: string;
  year: number;
  closingDate: string;
  totalRevenue: number;
  totalExpense: number;
  netProfitOrLoss: number; // Revenue - Expense
  retainedEarningsAccountId: string;
  journalEntryId: string;
  journalEntryNumber: string;
  closedBy: string;
  status: 'closed' | 'reopened';
  notes?: string;
  createdAt: string;
}

export interface Branch {
  id: string;
  code: string; // e.g. 'BR-01', 'BR-02'
  nameAr: string;
  nameEn: string;
  phone: string;
  city: string;
  district?: string;
  street?: string;
  postalCode?: string;
  buildingNumber?: string;
  managerName?: string;
  crNumber?: string;
  vatNumber?: string;
  isMain?: boolean;
  isMainBranch?: boolean;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export interface CashRegister {
  id: string;
  code: string; // e.g. 'POS-01', 'POS-02'
  nameAr: string;
  nameEn: string;
  branchId: string;
  branchName: string;
  cashAccountId: string; // Link to account e.g. 110101
  cashAccountCode: string;
  posCardAccountId: string; // Link to account e.g. 110104
  posCardAccountCode: string;
  deviceType: 'desktop' | 'tablet' | 'mobile_pos' | 'self_service';
  printerType: 'thermal_80mm' | 'thermal_58mm' | 'a4';
  isActive: boolean;
  currentShiftId?: string | null;
  assignedCashierName?: string;
  lastActiveAt?: string;
}

export interface CashierShift {
  id: string;
  shiftNumber: string; // e.g. 'SH-2026-0001'
  branchId: string;
  branchName: string;
  registerId: string;
  registerName: string;
  cashierName: string;
  startTime: string; // ISO string
  endTime?: string | null;
  openingCash: number; // رصيد افتتاحي
  cashSales: number;
  madaSales: number;
  creditCardSales: number;
  otherSales: number;
  totalSales: number;
  totalVat: number;
  invoicesCount: number;
  refundsCount: number;
  refundsTotal: number;
  cashDropAmount: number; // مبالغ موردة أثناء الوردية للخزينة
  expectedCash: number; // openingCash + cashSales - refunds - cashDrop
  actualClosingCash?: number; // العد الفعلي عند الإغلاق
  cashDifference?: number; // actualClosingCash - expectedCash (عجز/زيادة)
  closingNotes?: string;
  status: 'open' | 'closed';
  zReportNumber?: string;
}

export interface ParkedOrder {
  id: string;
  orderNumber: string; // e.g. 'HOLD-01'
  title: string;
  branchId: string;
  registerId: string;
  cashierName: string;
  customerId: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  totalAmount: number;
  notes?: string;
  savedAt: string;
}


