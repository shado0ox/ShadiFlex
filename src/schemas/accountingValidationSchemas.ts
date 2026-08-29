import { z } from 'zod';
import { isValidMoneyNumber } from '../utils/money';

/**
 * Saudi ZATCA VAT Number Validator:
 * Standard 15-digit number starting and ending with 3 (e.g. 300000000000003)
 */
export const zatcaVatNumberRegex = /^3[0-9]{13}3$/;

/**
 * Saudi Commercial Registration (CR) Number Validator:
 * 10-digit number (e.g. 1010123456)
 */
export const saudiCrNumberRegex = /^[0-9]{10}$/;

/**
 * Date Validator: YYYY-MM-DD or valid ISO 8601 String
 */
export const dateStringSchema = z
  .string()
  .min(1, 'حقل التاريخ مطلوب')
  .refine(
    (val) => {
      const parsed = Date.parse(val);
      if (isNaN(parsed)) return false;
      const year = new Date(parsed).getFullYear();
      return year >= 1990 && year <= 2150;
    },
    { message: 'تنسيق التاريخ غير صالح أو يقع خارج النطاق المقبول (1990-2150)' }
  );

/**
 * Positive number validator (strictly > 0)
 */
export const strictlyPositiveNumberSchema = z
  .number({ message: 'يجب أن تكون القيمة رقماً' })
  .refine((val) => !isNaN(val) && isFinite(val) && val > 0, {
    message: 'يجب أن تكون القيمة رقماً موجباً أكبر من الصفر',
  });

/**
 * Non-negative number validator (>= 0)
 */
export const nonNegativeNumberSchema = z
  .number({ message: 'يجب أن تكون القيمة رقماً' })
  .refine((val) => !isNaN(val) && isFinite(val) && val >= 0, {
    message: 'يجب ألا تكون القيمة سالبة (يجب أن تكون 0 أو أكبر)',
  });

/**
 * Money number validator
 */
export const moneyNumberSchema = z
  .number({ message: 'يجب أن تكون القيمة المالية رقماً صحيحاً' })
  .refine((val) => isValidMoneyNumber(val), {
    message: 'قيمة مالية غير صالحة (NaN أو Infinity)',
  });

/**
 * National Address Schema
 */
export const nationalAddressSchema = z.object({
  buildingNumber: z.string().min(1, 'رقم المبنى مطلوب'),
  street: z.string().min(1, 'اسم الشارع مطلوب'),
  district: z.string().min(1, 'اسم الحي مطلوب'),
  city: z.string().min(1, 'اسم المدينة مطلوب'),
  postalCode: z.string().min(1, 'الرمز البريدي مطلوب'),
  additionalNumber: z.string().default(''),
  country: z.string().min(1, 'اسم الدولة مطلوب').default('المملكة العربية السعودية'),
});

/**
 * Bank Details Schema
 */
export const bankDetailsSchema = z.object({
  bankName: z.string().min(1, 'اسم البنك مطلوب'),
  iban: z.string().min(1, 'رقم الآيبان IBAN مطلوب'),
  accountHolder: z.string().min(1, 'اسم صاحب الحساب مطلوب'),
});

/**
 * Company Settings Schema
 */
export const companySettingsSchema = z.object({
  nameAr: z.string().min(2, 'اسم المنشأة بالعربية مطلوب ويجب ألا يقل عن حرفين'),
  nameEn: z.string().default(''),
  vatNumber: z
    .string()
    .min(1, 'الرقم الضريبي للمنشأة مطلوب')
    .refine((val) => zatcaVatNumberRegex.test(val.replace(/\s+/g, '')), {
      message: 'الرقم الضريبي للمنشأة غير مطابق لمعايير هيئة الزكاة (يجب أن يتكون من 15 رقماً يبدأ وينتهي بالرقم 3)',
    }),
  crNumber: z
    .string()
    .min(1, 'رقم السجل التجاري مطلوب')
    .refine((val) => /^[0-9]{10}$/.test(val.replace(/\s+/g, '')), {
      message: 'رقم السجل التجاري يجب أن يتكون من 10 أرقام',
    }),
  phone: z.string().min(1, 'رقم الهاتف مطلوب'),
  email: z.string().email('صيغة البريد الإلكتروني للمنشأة غير صالحة').or(z.literal('')),
  website: z.string().optional(),
  currency: z.string().default('SAR'),
  currencySymbol: z.string().default('ر.س'),
  financialYearStart: z.string().default('01-01'),
  fiscalYear: z.number().int().min(2000).max(2100).default(2026),
  fiscalYearStart: dateStringSchema.default('2026-01-01'),
  fiscalYearEnd: dateStringSchema.default('2026-12-31'),
  nationalAddress: nationalAddressSchema,
  address: nationalAddressSchema.optional(),
  bankDetails: bankDetailsSchema,
  invoiceFooterNotesAr: z.string().default(''),
  invoiceFooterNotesEn: z.string().default(''),
});

/**
 * Account (Chart of Accounts) Schema
 */
export const accountSchema = z.object({
  id: z.string().min(1, 'معرف الحساب مطلوب'),
  code: z.string().min(1, 'رمز الحساب المحاسبي مطلوب'),
  nameAr: z.string().min(1, 'اسم الحساب بالعربية مطلوب'),
  nameEn: z.string().default(''),
  type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense'], {
    message: 'نوع الحساب يجب أن يكون: أصول، خصوم، حقوق ملكية، إيرادات، أو مصروفات',
  }),
  nature: z.enum(['debit', 'credit'], {
    message: 'طبيعة الحساب يجب أن تكون مدين أو دائن',
  }),
  parentId: z.string().nullable().optional(),
  level: z.number().int().min(1, 'مستوى الحساب يجب أن يكون 1 على الأقل'),
  isTransactional: z.boolean().default(true),
  balance: moneyNumberSchema.default(0),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

/**
 * Invoice Item Line Schema
 */
export const invoiceItemSchema = z.object({
  id: z.string().min(1, 'معرف بند الفاتورة مطلوب'),
  itemId: z.string().optional(),
  nameAr: z.string().min(1, 'اسم الصنف أو الخدمة مطلوب'),
  nameEn: z.string().optional(),
  quantity: strictlyPositiveNumberSchema,
  unit: z.string().default('قطعة'),
  unitPrice: nonNegativeNumberSchema,
  discount: nonNegativeNumberSchema.default(0),
  vatRate: z.number().refine((val) => val === 0.15 || val === 0 || val === -1, {
    message: 'نسبة الضريبة يجب أن تكون 15% (0.15) أو 0% أو معفى (-1)',
  }),
  vatAmount: nonNegativeNumberSchema,
  subtotal: nonNegativeNumberSchema,
  totalWithVat: nonNegativeNumberSchema,
});

/**
 * Customer Schema
 */
export const customerSchema = z.object({
  id: z.string().min(1, 'معرف العميل مطلوب'),
  nameAr: z.string().min(1, 'اسم العميل بالعربية مطلوب'),
  nameEn: z.string().optional(),
  vatNumber: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === '' || zatcaVatNumberRegex.test(val.replace(/\s+/g, '')),
      { message: 'الرقم الضريبي للعميل يجب أن يتكون من 15 رقماً ويبدأ وينتهي بالرقم 3' }
    ),
  crNumber: z
    .string()
    .optional()
    .refine((val) => !val || val.trim() === '' || /^[0-9]{10}$/.test(val.replace(/\s+/g, '')), {
      message: 'السجل التجاري للعميل يجب أن يتكون من 10 أرقام',
    }),
  phone: z.string().min(1, 'رقم هاتف العميل مطلوب'),
  email: z.string().email('البريد الإلكتروني للعميل غير صالح').or(z.literal('')).optional(),
  address: z
    .object({
      street: z.string().optional(),
      district: z.string().optional(),
      city: z.string().default('الرياض'),
      postalCode: z.string().optional(),
      buildingNumber: z.string().optional(),
      additionalNumber: z.string().optional(),
    })
    .optional(),
  balance: moneyNumberSchema.default(0),
  isActive: z.boolean().default(true),
});

/**
 * Supplier Schema
 */
export const supplierSchema = z.object({
  id: z.string().min(1, 'معرف المورد مطلوب'),
  nameAr: z.string().min(1, 'اسم المورد بالعربية مطلوب'),
  nameEn: z.string().optional(),
  vatNumber: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === '' || zatcaVatNumberRegex.test(val.replace(/\s+/g, '')),
      { message: 'الرقم الضريبي للمورد يجب أن يتكون من 15 رقماً ويبدأ وينتهي بالرقم 3' }
    ),
  crNumber: z
    .string()
    .optional()
    .refine((val) => !val || val.trim() === '' || /^[0-9]{10}$/.test(val.replace(/\s+/g, '')), {
      message: 'السجل التجاري للمورد يجب أن يتكون من 10 أرقام',
    }),
  phone: z.string().min(1, 'رقم هاتف المورد مطلوب'),
  email: z.string().email('البريد الإلكتروني للمورد غير صالح').or(z.literal('')).optional(),
  city: z.string().optional(),
  balance: moneyNumberSchema.default(0),
  isActive: z.boolean().default(true),
});

/**
 * Inventory Item Schema
 */
export const inventoryItemSchema = z.object({
  id: z.string().min(1, 'معرف الصنف مطلوب'),
  sku: z.string().min(1, 'رمز الصنف (SKU) مطلوب'),
  barcode: z.string().optional(),
  nameAr: z.string().min(1, 'اسم الصنف بالعربية مطلوب'),
  nameEn: z.string().optional(),
  category: z.string().min(1, 'تصنيف الصنف مطلوب'),
  unit: z.string().min(1, 'وحدة القياس مطلوبة'),
  purchasePrice: nonNegativeNumberSchema,
  salePrice: nonNegativeNumberSchema,
  currentStock: z.number().refine((val) => !isNaN(val) && isFinite(val), {
    message: 'الرصيد الحالي يجب أن يكون رقماً صحيحاً',
  }),
  minStockAlert: nonNegativeNumberSchema.default(5),
  vatRate: z.number().default(0.15),
  accountId: z.string().optional(),
  cogsAccountId: z.string().optional(),
  salesAccountId: z.string().optional(),
  isActive: z.boolean().default(true),
});

/**
 * Stock Movement Schema
 */
export const stockMovementSchema = z.object({
  id: z.string().min(1, 'معرف حركة المخزون مطلوب'),
  itemId: z.string().min(1, 'معرف الصنف في الحركة مطلوب'),
  itemName: z.string().min(1, 'اسم الصنف في الحركة مطلوب'),
  date: dateStringSchema,
  type: z.enum([
    'sale',
    'purchase',
    'adjustment_in',
    'adjustment_out',
    'initial',
    'sale_reversal',
    'purchase_reversal',
    'return_in',
    'return_out',
  ]),
  quantity: strictlyPositiveNumberSchema,
  previousStock: z.number(),
  newStock: z.number(),
  referenceNumber: z.string().min(1, 'رقم المرجع أو المستند مطلوب'),
  documentType: z.string().optional(),
  documentId: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Sales Invoice Schema
 */
export const salesInvoiceSchema = z.object({
  id: z.string().min(1, 'معرف الفاتورة مطلوب'),
  invoiceNumber: z.string().min(1, 'رقم فاتورة المبيعات مطلوب'),
  uuid: z.string().min(1, 'رمز ZATCA UUID للفاتورة مطلوب'),
  issueDate: dateStringSchema,
  issueTime: z.string().min(1, 'وقت إصدار الفاتورة مطلوب'),
  dueDate: dateStringSchema.optional(),
  type: z.enum(['tax_invoice', 'simplified_tax_invoice'], {
    message: 'نوع الفاتورة يجب أن يكون فاتورة ضريبية أو فاتورة ضريبية مبسطة',
  }),
  customerId: z.string().min(1, 'معرف العميل مطلوب'),
  customerName: z.string().min(1, 'اسم العميل مطلوب'),
  customerVatNumber: z.string().optional(),
  customerCrNumber: z.string().optional(),
  customerAddress: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'يجب أن تحتوي الفاتورة على بند واحد على الأقل'),
  subtotal: nonNegativeNumberSchema,
  discountTotal: nonNegativeNumberSchema.default(0),
  taxableAmount: nonNegativeNumberSchema,
  vatTotal: nonNegativeNumberSchema,
  totalAmount: nonNegativeNumberSchema,
  paymentMethod: z.enum(['cash', 'bank_transfer', 'credit', 'pos_card', 'mada', 'cheque']),
  paymentStatus: z.enum(['paid', 'partial', 'unpaid']),
  paidAmount: nonNegativeNumberSchema.default(0),
  remainingAmount: nonNegativeNumberSchema.default(0),
  notes: z.string().optional(),
  zatcaQrBase64: z.string().optional(),
  journalEntryId: z.string().optional(),
  status: z.enum(['draft', 'posted', 'cancelled', 'reversed']).default('posted'),
  postedAt: z.string().optional(),
  cancelledAt: z.string().optional(),
  cancellationReason: z.string().optional(),
  reversalReason: z.string().optional(),
  reversalDate: z.string().optional(),
  reversalJournalEntryId: z.string().optional(),
  reversedAt: z.string().optional(),
  isPosSale: z.boolean().optional(),
  branchId: z.string().optional(),
  branchName: z.string().optional(),
  registerId: z.string().optional(),
  registerName: z.string().optional(),
  shiftId: z.string().optional(),
  cashierName: z.string().optional(),
});

/**
 * Purchase Invoice Schema
 */
export const purchaseInvoiceSchema = z.object({
  id: z.string().min(1, 'معرف فاتورة المشتريات مطلوب'),
  invoiceNumber: z.string().min(1, 'رقم فاتورة المشتريات مطلوب'),
  supplierInvoiceNumber: z.string().min(1, 'رقم فاتورة المورد مطلوب'),
  issueDate: dateStringSchema,
  dueDate: dateStringSchema.optional(),
  supplierId: z.string().min(1, 'معرف المورد مطلوب'),
  supplierName: z.string().min(1, 'اسم المورد مطلوب'),
  supplierVatNumber: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'يجب أن تحتوي فاتورة المشتريات على بند واحد على الأقل'),
  subtotal: nonNegativeNumberSchema,
  taxableAmount: nonNegativeNumberSchema,
  vatTotal: nonNegativeNumberSchema,
  totalAmount: nonNegativeNumberSchema,
  paymentMethod: z.enum(['cash', 'bank_transfer', 'credit', 'pos_card', 'mada', 'cheque']),
  paymentStatus: z.enum(['paid', 'partial', 'unpaid']),
  paidAmount: nonNegativeNumberSchema.default(0),
  notes: z.string().optional(),
  journalEntryId: z.string().optional(),
  status: z.enum(['draft', 'posted', 'cancelled', 'reversed']).default('posted'),
  postedAt: z.string().optional(),
  cancelledAt: z.string().optional(),
  cancellationReason: z.string().optional(),
  reversalReason: z.string().optional(),
  reversalDate: z.string().optional(),
  reversalJournalEntryId: z.string().optional(),
  reversedAt: z.string().optional(),
});

/**
 * Debit/Credit Note Schema
 */
export const debitCreditNoteSchema = z.object({
  id: z.string().min(1, 'معرف الإشعار مطلوب'),
  noteNumber: z.string().min(1, 'رقم الإشعار الدائن/المدين مطلوب'),
  uuid: z.string().min(1, 'رمز ZATCA UUID مطلوب'),
  type: z.enum(['credit_note', 'debit_note']),
  partyType: z.enum(['customer', 'supplier']),
  partyId: z.string().min(1, 'معرف الطرف مطلوب'),
  partyName: z.string().min(1, 'اسم الطرف مطلوب'),
  partyVatNumber: z.string().optional(),
  partyCrNumber: z.string().optional(),
  issueDate: dateStringSchema,
  issueTime: z.string().min(1, 'وقت الإصدار مطلوب'),
  originalInvoiceId: z.string().optional(),
  originalInvoiceNumber: z.string().optional(),
  originalInvoiceDate: z.string().optional(),
  reason: z.enum([
    'goods_return',
    'post_sale_discount',
    'invoice_correction',
    'price_adjustment',
    'damaged_goods',
    'cancelled_service',
    'other',
  ]),
  reasonTextAr: z.string().min(1, 'سبب إصدار الإشعار بالعربية مطلوب'),
  items: z.array(invoiceItemSchema).min(1, 'يجب أن يحتوي الإشعار على بند واحد على الأقل'),
  subtotal: nonNegativeNumberSchema,
  discountTotal: nonNegativeNumberSchema.default(0),
  taxableAmount: nonNegativeNumberSchema,
  vatTotal: nonNegativeNumberSchema,
  totalAmount: nonNegativeNumberSchema,
  affectInventory: z.boolean().default(true),
  refundMethod: z.enum(['cash', 'bank_transfer', 'credit', 'pos_card', 'mada', 'cheque', 'account_balance']),
  zatcaQrBase64: z.string().optional(),
  journalEntryId: z.string().optional(),
  status: z.enum(['draft', 'posted', 'cancelled', 'reversed']).default('posted'),
  notes: z.string().optional(),
});

/**
 * Voucher Schema
 */
export const voucherSchema = z.object({
  id: z.string().min(1, 'معرف السند مطلوب'),
  voucherNumber: z.string().min(1, 'رقم السند مطلوب'),
  type: z.enum(['receipt', 'payment']),
  date: dateStringSchema,
  partyType: z.enum(['customer', 'supplier', 'expense', 'employee', 'partner', 'other']),
  partyId: z.string().optional(),
  partyName: z.string().min(1, 'اسم الطرف المستلم/المسدد مطلوب'),
  partyVatNumber: z.string().optional(),
  amount: strictlyPositiveNumberSchema,
  amountInWordsAr: z.string().default(''),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'credit', 'pos_card', 'mada', 'cheque']),
  debitAccountId: z.string().min(1, 'حساب المدين مطلوب'),
  debitAccountCode: z.string().min(1, 'رمز حساب المدين مطلوب'),
  debitAccountNameAr: z.string().min(1, 'اسم حساب المدين مطلوب'),
  creditAccountId: z.string().min(1, 'حساب الدائن مطلوب'),
  creditAccountCode: z.string().min(1, 'رمز حساب الدائن مطلوب'),
  creditAccountNameAr: z.string().min(1, 'اسم حساب الدائن مطلوب'),
  description: z.string().min(1, 'بيان السند مطلوب'),
  status: z.enum(['draft', 'posted', 'cancelled', 'reversed']).default('posted'),
  createdAt: z.string().default(new Date().toISOString()),
});

/**
 * Simple Expense Schema
 */
export const simpleExpenseInvoiceSchema = z.object({
  id: z.string().min(1, 'معرف المصروف مطلوب'),
  expenseNumber: z.string().min(1, 'رقم فاتورة المصروف مطلوب'),
  category: z.enum([
    'electricity',
    'water',
    'internet_telecom',
    'fuel_petrol',
    'maintenance_repair',
    'office_stationery',
    'hospitality_pantry',
    'government_fees',
    'software_tech',
    'cleaning_facility',
    'rent',
    'other',
  ]),
  title: z.string().min(1, 'عنوان المصروف مطلوب'),
  date: dateStringSchema,
  vendorName: z.string().min(1, 'اسم المورد/الجهة مطلوب'),
  vendorVatNumber: z.string().optional(),
  vendorInvoiceRef: z.string().optional(),
  expenseAccountId: z.string().min(1, 'حساب المصروف مطلوب'),
  expenseAccountCode: z.string().min(1, 'رمز حساب المصروف مطلوب'),
  expenseAccountNameAr: z.string().min(1, 'اسم حساب المصروف مطلوب'),
  amountBeforeVat: nonNegativeNumberSchema,
  vatRate: z.number().refine((val) => val === 0.15 || val === 0 || val === -1, {
    message: 'نسبة الضريبة يجب أن تكون 15% أو 0% أو معفى',
  }),
  vatAmount: nonNegativeNumberSchema,
  totalAmount: strictlyPositiveNumberSchema,
  paymentMethod: z.enum(['cash', 'bank_transfer', 'credit', 'pos_card', 'mada', 'cheque', 'petty_cash']),
  paidThroughAccountId: z.string().min(1, 'حساب وسيلة الدفع مطلوب'),
  paidThroughAccountCode: z.string().min(1, 'رمز حساب وسيلة الدفع مطلوب'),
  paidThroughAccountNameAr: z.string().min(1, 'اسم حساب وسيلة الدفع مطلوب'),
  employeeName: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'posted', 'cancelled', 'reversed']).default('posted'),
  createdAt: z.string().default(new Date().toISOString()),
});

/**
 * Journal Entry Line Schema
 */
export const journalEntryLineSchema = z.object({
  id: z.string().min(1, 'معرف طرف القيد مطلوب'),
  accountId: z.string().min(1, 'معرف الحساب المحاسبي مطلوب'),
  accountCode: z.string().min(1, 'رمز الحساب المحاسبي مطلوب'),
  accountNameAr: z.string().min(1, 'اسم الحساب بالعربية مطلوب'),
  debit: nonNegativeNumberSchema.default(0),
  credit: nonNegativeNumberSchema.default(0),
  description: z.string().optional(),
});

/**
 * Journal Entry Schema
 */
export const journalEntrySchema = z.object({
  id: z.string().min(1, 'معرف قيد اليومية مطلوب'),
  entryNumber: z.string().min(1, 'رقم قيد اليومية مطلوب'),
  date: dateStringSchema,
  referenceType: z.enum([
    'manual',
    'sales_invoice',
    'purchase_invoice',
    'payment',
    'receipt',
    'inventory_adjustment',
    'credit_note',
    'debit_note',
    'voucher',
    'simple_expense',
    'year_closing',
  ]),
  referenceId: z.string().optional(),
  referenceNumber: z.string().optional(),
  narrationAr: z.string().min(1, 'شرح وبيان القيد المحاسبي مطلوب'),
  lines: z.array(journalEntryLineSchema).min(2, 'يجب أن يحتوي القيد على طرفين على الأقل (مدين ودائن)'),
  totalDebit: nonNegativeNumberSchema,
  totalCredit: nonNegativeNumberSchema,
  isBalanced: z.boolean().default(true),
  status: z.enum(['draft', 'posted', 'cancelled', 'reversed']).default('posted'),
  isReversal: z.boolean().optional(),
  createdAt: z.string().default(new Date().toISOString()),
});

/**
 * API Key (Sanitized) Schema - Secrets strictly excluded
 */
export const apiKeySchema = z.object({
  id: z.string().min(1, 'معرف مفتاح API مطلوب'),
  name: z.string().min(1, 'اسم المفتاح مطلوب'),
  key: z.string().default('demo_key_not_active'),
  maskedKey: z.string().default('demo_••••••••2371'),
  environment: z.enum(['production', 'test']).default('production'),
  permissions: z.array(z.string()).default([]),
  createdAt: z.string().default(new Date().toISOString()),
  lastUsedAt: z.string().optional(),
  isActive: z.boolean().default(true),
});

/**
 * Fiscal Year Closing Schema
 */
export const fiscalYearClosingSchema = z.object({
  id: z.string().min(1, 'معرف إقفال السنة مطلوب'),
  year: z.number().int().min(2000).max(2100),
  closingDate: dateStringSchema,
  totalRevenue: moneyNumberSchema,
  totalExpense: moneyNumberSchema,
  netProfitOrLoss: moneyNumberSchema,
  retainedEarningsAccountId: z.string().min(1, 'حساب الأرباح المبقاة مطلوب'),
  journalEntryId: z.string().min(1, 'معرف قيد الإقفال مطلوب'),
  journalEntryNumber: z.string().min(1, 'رقم قيد الإقفال مطلوب'),
  closedBy: z.string().min(1, 'اسم مقفل السنة مطلوب'),
  status: z.enum(['closed', 'reopened']),
  notes: z.string().optional(),
  createdAt: z.string().default(new Date().toISOString()),
});

/**
 * Branch Schema
 */
export const branchSchema = z.object({
  id: z.string().min(1, 'معرف الفرع مطلوب'),
  code: z.string().min(1, 'رمز الفرع مطلوب'),
  nameAr: z.string().min(1, 'اسم الفرع بالعربية مطلوب'),
  nameEn: z.string().default(''),
  phone: z.string().min(1, 'رقم هاتف الفرع مطلوب'),
  city: z.string().min(1, 'مدينة الفرع مطلوبة'),
  district: z.string().optional(),
  street: z.string().optional(),
  postalCode: z.string().optional(),
  buildingNumber: z.string().optional(),
  managerName: z.string().optional(),
  crNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  isMain: z.boolean().optional(),
  isMainBranch: z.boolean().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
  createdAt: z.string().default(new Date().toISOString()),
});

/**
 * Cash Register Schema
 */
export const cashRegisterSchema = z.object({
  id: z.string().min(1, 'معرف نقطة البيع مطلوب'),
  code: z.string().min(1, 'رمز نقطة البيع مطلوب'),
  nameAr: z.string().min(1, 'اسم نقطة البيع مطلوب'),
  nameEn: z.string().default(''),
  branchId: z.string().min(1, 'معرف الفرع التابع له الكاشير مطلوب'),
  branchName: z.string().default(''),
  cashAccountId: z.string().min(1, 'حساب الصندوق المالي مطلوب'),
  cashAccountCode: z.string().min(1, 'رمز حساب الصندوق مطلوب'),
  posCardAccountId: z.string().min(1, 'حساب نقاط البيع / مدى مطلوب'),
  posCardAccountCode: z.string().min(1, 'رمز حساب نقاط البيع مطلوب'),
  deviceType: z.enum(['desktop', 'tablet', 'mobile_pos', 'self_service']),
  printerType: z.enum(['thermal_80mm', 'thermal_58mm', 'a4']),
  isActive: z.boolean().default(true),
  currentShiftId: z.string().nullable().optional(),
  assignedCashierName: z.string().optional(),
  lastActiveAt: z.string().optional(),
});

/**
 * Cashier Shift Schema
 */
export const cashierShiftSchema = z.object({
  id: z.string().min(1, 'معرف الوردية مطلوب'),
  shiftNumber: z.string().min(1, 'رقم الوردية مطلوب'),
  branchId: z.string().min(1, 'معرف الفرع مطلوب'),
  branchName: z.string().default(''),
  registerId: z.string().min(1, 'معرف نقطة البيع مطلوب'),
  registerName: z.string().default(''),
  cashierName: z.string().min(1, 'اسم الكاشير مطلوب'),
  startTime: z.string().min(1, 'وقت فتح الوردية مطلوب'),
  endTime: z.string().nullable().optional(),
  openingCash: nonNegativeNumberSchema.default(0),
  cashSales: nonNegativeNumberSchema.default(0),
  madaSales: nonNegativeNumberSchema.default(0),
  creditCardSales: nonNegativeNumberSchema.default(0),
  otherSales: nonNegativeNumberSchema.default(0),
  totalSales: nonNegativeNumberSchema.default(0),
  totalVat: nonNegativeNumberSchema.default(0),
  invoicesCount: z.number().int().min(0).default(0),
  refundsCount: z.number().int().min(0).default(0),
  refundsTotal: nonNegativeNumberSchema.default(0),
  cashDropAmount: nonNegativeNumberSchema.default(0),
  expectedCash: moneyNumberSchema.default(0),
  actualClosingCash: moneyNumberSchema.optional(),
  cashDifference: moneyNumberSchema.optional(),
  closingNotes: z.string().optional(),
  status: z.enum(['open', 'closed']).default('open'),
  zReportNumber: z.string().optional(),
});

/**
 * Parked Order Schema
 */
export const parkedOrderSchema = z.object({
  id: z.string().min(1, 'معرف الطلب المعلق مطلوب'),
  orderNumber: z.string().min(1, 'رقم الطلب المعلق مطلوب'),
  title: z.string().min(1, 'عنوان الطلب المعلق مطلوب'),
  branchId: z.string().min(1, 'معرف الفرع مطلوب'),
  registerId: z.string().min(1, 'معرف نقطة البيع مطلوب'),
  cashierName: z.string().min(1, 'اسم الكاشير مطلوب'),
  customerId: z.string().min(1, 'معرف العميل مطلوب'),
  customerName: z.string().min(1, 'اسم العميل مطلوب'),
  items: z.array(invoiceItemSchema).min(1, 'يجب أن يحتوي الطلب المعلق على بند واحد على الأقل'),
  subtotal: nonNegativeNumberSchema,
  discountTotal: nonNegativeNumberSchema.default(0),
  vatTotal: nonNegativeNumberSchema,
  totalAmount: nonNegativeNumberSchema,
  notes: z.string().optional(),
  savedAt: z.string().default(new Date().toISOString()),
});

/**
 * Financial Period Schema
 */
export const financialPeriodSchema = z.object({
  id: z.string().min(1, 'معرف الفترة المالية مطلوب'),
  nameAr: z.string().min(1, 'اسم الفترة المالية بالعربية مطلوب'),
  nameEn: z.string().min(1, 'اسم الفترة المالية بالإنجليزية مطلوب'),
  year: z.number().int().min(2000, 'السنة المالية غير صالحة'),
  periodNumber: z.number().int().min(1).max(12),
  quarter: z.number().int().min(1).max(4),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  status: z.enum(['open', 'closed']).default('open'),
  closedAt: z.string().optional(),
  closedBy: z.string().optional(),
  reopenedAt: z.string().optional(),
  reopenedBy: z.string().optional(),
  reopenReason: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Complete Accounting Backup Snapshot Schema
 */
export const accountingBackupDataSchema = z.object({
  companySettings: companySettingsSchema,
  accounts: z.array(accountSchema).min(1, 'شجرة الحسابات يجب ألا تكون فارغة'),
  customers: z.array(customerSchema).default([]),
  suppliers: z.array(supplierSchema).default([]),
  inventory: z.array(inventoryItemSchema).default([]),
  stockMovements: z.array(stockMovementSchema).default([]),
  salesInvoices: z.array(salesInvoiceSchema).default([]),
  purchaseInvoices: z.array(purchaseInvoiceSchema).default([]),
  debitCreditNotes: z.array(debitCreditNoteSchema).default([]),
  vouchers: z.array(voucherSchema).default([]),
  simpleExpenses: z.array(simpleExpenseInvoiceSchema).default([]),
  journalEntries: z.array(journalEntrySchema).default([]),
  apiKeys: z.array(apiKeySchema).default([]),
  fiscalClosings: z.array(fiscalYearClosingSchema).default([]),
  financialPeriods: z.array(financialPeriodSchema).default([]),
  branches: z.array(branchSchema).default([]),
  cashRegisters: z.array(cashRegisterSchema).default([]),
  cashierShifts: z.array(cashierShiftSchema).default([]),
  parkedOrders: z.array(parkedOrderSchema).default([]),
  activeBranchId: z.string().default('br_1'),
  activeRegisterId: z.string().default('reg_1'),
  exportedAt: z.string().optional(),
  schemaVersion: z.number().int().min(1, 'إصدار بنية البيانات غير صالح (يجب أن يكون 1 أو أعلى)').default(2),
  version: z.string().default('2.0.0'),
});

export type ValidatedAccountingDataSnapshot = z.infer<typeof accountingBackupDataSchema>;
