import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  SalesInvoice,
  PurchaseInvoice,
  DebitCreditNote,
  Voucher,
  SimpleExpenseInvoice,
  JournalEntry,
  JournalEntryLine,
  StockMovement,
  DocumentType,
  DocumentStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../types/accounting';
import { getAccountingRepository } from '../../services/dataService';
import { useCompanySettings } from './CompanyContext';
import { useFiscalPeriods } from './FiscalPeriodsContext';
import { useAccounts } from './AccountsContext';
import { useCustomersSuppliers } from './CustomersSuppliersContext';
import { useInventory } from './InventoryContext';
import { useJournal } from './JournalContext';
import { generateEntityId, generateUUID } from '../../utils/uuid';
import { documentSequenceService } from '../../services/documentSequenceService';
import { generateZatcaTlvBase64 } from '../../utils/zatca';
import { tafqeetArabic } from '../../utils/tafqeet';
import { assertSaleInventory } from '../../services/inventoryValidationService';

export interface InvoicesContextType {
  salesInvoices: SalesInvoice[];
  createSalesInvoice: (invoiceData: Omit<SalesInvoice, 'id' | 'uuid' | 'zatcaQrBase64' | 'journalEntryId'>) => Promise<SalesInvoice>;
  updateSalesInvoice: (id: string, invoice: Partial<SalesInvoice>) => void;
  deleteSalesInvoice: (id: string) => void;
  recordInvoicePayment: (invoiceId: string, amount: number, paymentMethod: PaymentMethod) => void;

  purchaseInvoices: PurchaseInvoice[];
  createPurchaseInvoice: (purchaseData: Omit<PurchaseInvoice, 'id' | 'journalEntryId'>) => Promise<PurchaseInvoice>;
  updatePurchaseInvoice: (id: string, invoice: Partial<PurchaseInvoice>) => void;
  deletePurchaseInvoice: (id: string) => void;

  debitCreditNotes: DebitCreditNote[];
  createDebitCreditNote: (noteData: Omit<DebitCreditNote, 'id' | 'uuid' | 'zatcaQrBase64' | 'journalEntryId'>) => Promise<DebitCreditNote>;
  deleteDebitCreditNote: (id: string) => void;

  vouchers: Voucher[];
  createVoucher: (voucherData: Omit<Voucher, 'id' | 'amountInWordsAr' | 'journalEntryId' | 'createdAt'>) => Promise<Voucher>;
  deleteVoucher: (id: string) => void;

  simpleExpenses: SimpleExpenseInvoice[];
  createSimpleExpense: (expenseData: Omit<SimpleExpenseInvoice, 'id' | 'expenseNumber' | 'journalEntryId' | 'createdAt'>) => Promise<SimpleExpenseInvoice>;
  deleteSimpleExpense: (id: string) => void;

  postDocument: (type: DocumentType, id: string) => Promise<void>;
  cancelDraftDocument: (type: DocumentType, id: string, cancellationReason: string) => Promise<void>;
  reversePostedDocument: (type: DocumentType, id: string, reversalReason: string, reversalDate?: string) => Promise<JournalEntry>;

  setSalesInvoices: React.Dispatch<React.SetStateAction<SalesInvoice[]>>;
  setPurchaseInvoices: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
  setDebitCreditNotes: React.Dispatch<React.SetStateAction<DebitCreditNote[]>>;
  setVouchers: React.Dispatch<React.SetStateAction<Voucher[]>>;
  setSimpleExpenses: React.Dispatch<React.SetStateAction<SimpleExpenseInvoice[]>>;
}

export const InvoicesContext = createContext<InvoicesContextType | undefined>(undefined);

export const InvoicesProvider: React.FC<{
  children: React.ReactNode;
  value?: InvoicesContextType;
}> = ({ children, value }) => {
  const repo = getAccountingRepository();
  const { companySettings, logAuditEvent } = useCompanySettings();
  const { assertDateNotInClosedPeriod } = useFiscalPeriods();
  const { accounts, setAccounts, recalculateAccountBalances } = useAccounts();
  const { customers, setCustomers, suppliers, setSuppliers } = useCustomersSuppliers();
  const { inventory, setInventory, setStockMovements, validateSaleInventory, validatePurchaseInventory } = useInventory();
  const { journalEntries, setJournalEntries } = useJournal();

  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>(() => repo.loadSalesInvoices());
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>(() => repo.loadPurchaseInvoices());
  const [debitCreditNotes, setDebitCreditNotes] = useState<DebitCreditNote[]>(() => repo.loadDebitCreditNotes());
  const [vouchers, setVouchers] = useState<Voucher[]>(() => repo.loadVouchers());
  const [simpleExpenses, setSimpleExpenses] = useState<SimpleExpenseInvoice[]>(() => repo.loadSimpleExpenses());

  useEffect(() => {
    repo.saveSalesInvoices(salesInvoices);
  }, [salesInvoices]);

  useEffect(() => {
    repo.savePurchaseInvoices(purchaseInvoices);
  }, [purchaseInvoices]);

  useEffect(() => {
    repo.saveDebitCreditNotes(debitCreditNotes);
  }, [debitCreditNotes]);

  useEffect(() => {
    repo.saveVouchers(vouchers);
  }, [vouchers]);

  useEffect(() => {
    repo.saveSimpleExpenses(simpleExpenses);
  }, [simpleExpenses]);

  useEffect(() => {
    const handleReload = () => {
      setSalesInvoices(repo.loadSalesInvoices());
      setPurchaseInvoices(repo.loadPurchaseInvoices());
      setDebitCreditNotes(repo.loadDebitCreditNotes());
      setVouchers(repo.loadVouchers());
      setSimpleExpenses(repo.loadSimpleExpenses());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('shadi_flex_data_reloaded', handleReload);
      return () => window.removeEventListener('shadi_flex_data_reloaded', handleReload);
    }
  }, [repo]);

  const getDocFiscalYear = (dateStr?: string): number => {
    if (dateStr) {
      const parsed = parseInt(dateStr.split('-')[0], 10);
      if (!isNaN(parsed) && parsed > 2000) return parsed;
    }
    return companySettings.fiscalYear || new Date().getFullYear();
  };

  // Create Sales Invoice
  const createSalesInvoice = useCallback(async (
    invoiceData: Omit<SalesInvoice, 'id' | 'uuid' | 'zatcaQrBase64' | 'journalEntryId'>
  ): Promise<SalesInvoice> => {
    const newId = generateEntityId('inv');
    const uuid = generateUUID();
    const nowIso = new Date().toISOString();
    const [issueDate, issueTimePart] = nowIso.split('T');
    const issueTime = issueTimePart ? issueTimePart.substring(0, 8) : '12:00:00';
    const effectiveDate = invoiceData.issueDate || issueDate;
    assertDateNotInClosedPeriod(effectiveDate, 'فاتورة مبيعات');

    const fiscalYear = getDocFiscalYear(effectiveDate);

    const invoiceNumber =
      invoiceData.invoiceNumber && !invoiceData.invoiceNumber.startsWith('INV-AUTO')
        ? invoiceData.invoiceNumber
        : documentSequenceService.getNextNumber(
            'sales_invoice',
            fiscalYear,
            salesInvoices.map((s) => s.invoiceNumber)
          );

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

    if (status === 'posted' || (status as string) === 'issued') {
      assertSaleInventory(invoiceData.items, inventory);
    } else {
      const vResult = validateSaleInventory(invoiceData.items, inventory);
      if (!vResult.isValid && vResult.invalidLines.length > 0) {
        throw new Error(vResult.errors[0]);
      }
    }

    if (status === 'posted') {
      let paymentAccId = 'acc_1102';
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
      const jvNumber = documentSequenceService.getNextNumber(
        'journal_entry',
        fiscalYear,
        journalEntries.map((j) => j.entryNumber)
      );

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

      if (invoiceData.remainingAmount > 0 && invoiceData.customerId) {
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === invoiceData.customerId ? { ...c, balance: c.balance + invoiceData.remainingAmount } : c
          )
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

    setSalesInvoices((prev) => [newInvoice, ...prev]);

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
  }, [
    assertDateNotInClosedPeriod,
    companySettings,
    inventory,
    journalEntries,
    logAuditEvent,
    recalculateAccountBalances,
    salesInvoices,
    setAccounts,
    setCustomers,
    setInventory,
    setJournalEntries,
    setStockMovements,
    validateSaleInventory,
  ]);

  const updateSalesInvoice = useCallback((id: string, invoiceUpdate: Partial<SalesInvoice>) => {
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
  }, [assertDateNotInClosedPeriod, logAuditEvent, salesInvoices]);

  const deleteSalesInvoice = useCallback((id: string) => {
    const target = salesInvoices.find((i) => i.id === id);
    if (!target) return;

    assertDateNotInClosedPeriod(target.issueDate, 'فاتورة مبيعات');

    if (target.status === 'posted') {
      throw new Error('لا يمكن حذف فاتورة ضريبية مُرحّلة مباشرة حفاظاً على التسلسل المحاسبي والضريبي ZATCA. يرجى استخدام الإلغاء العكسي (Reverse/Credit Note).');
    }

    if (target.journalEntryId) {
      setJournalEntries((prev) => prev.filter((j) => j.id !== target.journalEntryId));
    }
    setSalesInvoices((prev) => prev.filter((i) => i.id !== id));
  }, [assertDateNotInClosedPeriod, salesInvoices, setJournalEntries]);

  // Record payment on invoice
  const recordInvoicePayment = useCallback((invoiceId: string, amount: number, paymentMethod: PaymentMethod) => {
    const inv = salesInvoices.find((i) => i.id === invoiceId);
    if (!inv) return;

    const [today] = new Date().toISOString().split('T');
    assertDateNotInClosedPeriod(today, 'تحصيل دفعة فاتورة');

    const newPaidAmount = inv.paidAmount + amount;
    const newRemaining = Math.max(0, inv.totalAmount - newPaidAmount);
    const newStatus: PaymentStatus = newRemaining === 0 ? 'paid' : 'partial';

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
  }, [assertDateNotInClosedPeriod, companySettings, journalEntries, recalculateAccountBalances, salesInvoices, setAccounts, setCustomers, setJournalEntries]);

  // Create Purchase Invoice
  const createPurchaseInvoice = useCallback(async (
    purchaseData: Omit<PurchaseInvoice, 'id' | 'journalEntryId'>
  ): Promise<PurchaseInvoice> => {
    const newId = generateEntityId('pur');
    const nowIso = new Date().toISOString();
    const [today] = nowIso.split('T');
    const effectiveDate = purchaseData.issueDate || today;
    assertDateNotInClosedPeriod(effectiveDate, 'فاتورة مشتريات');

    const fiscalYear = getDocFiscalYear(effectiveDate);

    const invoiceNumber =
      purchaseData.invoiceNumber && !purchaseData.invoiceNumber.startsWith('PUR-AUTO')
        ? purchaseData.invoiceNumber
        : documentSequenceService.getNextNumber(
            'purchase_invoice',
            fiscalYear,
            purchaseInvoices.map((p) => p.invoiceNumber)
          );

    const status: DocumentStatus = purchaseData.status || 'posted';
    let jvId: string | undefined = undefined;
    let updatedJournalEntries = journalEntries;
    let updatedInventory = inventory;
    const newStockMovements: StockMovement[] = [];

    const purVal = validatePurchaseInventory(purchaseData.items);
    if (!purVal.isValid) {
      throw new Error(purVal.errors[0] || 'بيانات بنود فاتورة المشتريات غير صالحة');
    }

    if (status === 'posted') {
      jvId = generateEntityId('jv');
      const jvNumber = documentSequenceService.getNextNumber(
        'journal_entry',
        fiscalYear,
        journalEntries.map((j) => j.entryNumber)
      );

      let creditAccId = 'acc_2101';
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
          accountId: 'acc_1103',
          accountCode: '1103',
          accountNameAr: 'المخزون السلعي (بضاعة بالمستودع)',
          debit: purchaseData.taxableAmount,
          credit: 0,
          description: `شراء بضاعة فاتورة مورد ${purchaseData.supplierInvoiceNumber}`,
        },
        {
          id: generateEntityId('jvl'),
          accountId: 'acc_1104',
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

      if (purchaseData.paymentStatus !== 'paid' && purchaseData.supplierId) {
        setSuppliers((prev) =>
          prev.map((s) =>
            s.id === purchaseData.supplierId
              ? { ...s, balance: s.balance + (purchaseData.totalAmount - (purchaseData.paidAmount || 0)) }
              : s
          )
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

    setPurchaseInvoices((prev) => [newPurchase, ...prev]);

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
  }, [
    assertDateNotInClosedPeriod,
    companySettings,
    inventory,
    journalEntries,
    logAuditEvent,
    purchaseInvoices,
    recalculateAccountBalances,
    setAccounts,
    setInventory,
    setJournalEntries,
    setStockMovements,
    setSuppliers,
    validatePurchaseInventory,
  ]);

  const updatePurchaseInvoice = useCallback((id: string, invoiceUpdate: Partial<PurchaseInvoice>) => {
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
  }, [assertDateNotInClosedPeriod, logAuditEvent, purchaseInvoices]);

  const deletePurchaseInvoice = useCallback((id: string) => {
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
  }, [assertDateNotInClosedPeriod, purchaseInvoices, setJournalEntries]);

  // Create Debit / Credit Note
  const createDebitCreditNote = useCallback(async (
    noteData: Omit<DebitCreditNote, 'id' | 'uuid' | 'zatcaQrBase64' | 'journalEntryId'>
  ): Promise<DebitCreditNote> => {
    const newId = generateEntityId('note');
    const uuid = generateUUID();
    const nowIso = new Date().toISOString();
    const [issueDate, issueTimePart] = nowIso.split('T');
    const issueTime = issueTimePart ? issueTimePart.substring(0, 8) : '12:00:00';
    const effectiveDate = noteData.issueDate || issueDate;
    assertDateNotInClosedPeriod(effectiveDate, noteData.type === 'credit_note' ? 'إشعار دائن' : 'إشعار مدين');

    const fiscalYear = getDocFiscalYear(effectiveDate);

    const noteNumber =
      noteData.noteNumber && !noteData.noteNumber.startsWith('NOTE-AUTO')
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

    if (noteData.affectInventory && noteData.items && noteData.items.length > 0) {
      if (noteData.type === 'debit_note' && noteData.partyType === 'supplier') {
        assertSaleInventory(noteData.items, inventory);
      } else {
        const pVal = validatePurchaseInventory(noteData.items);
        if (!pVal.isValid) throw new Error(pVal.errors[0]);
      }
    }

    if (status === 'posted') {
      jvId = generateEntityId('jv');
      const jvNumber = documentSequenceService.getNextNumber(
        'journal_entry',
        fiscalYear,
        journalEntries.map((j) => j.entryNumber)
      );
      const lines: Array<{
        id: string;
        accountId: string;
        accountCode: string;
        accountNameAr: string;
        debit: number;
        credit: number;
        description?: string;
      }> = [];

      if (noteData.type === 'credit_note') {
        if (noteData.partyType === 'customer') {
          const returnAcc = accounts.find((a) => a.code === '4102') || {
            id: 'acc_4101',
            code: '4101',
            nameAr: 'إيرادات مبيعات السلع (خاضعة لضريبة 15%)',
          };
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
        if (noteData.partyType === 'supplier') {
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

      if (noteData.affectInventory && noteData.items && noteData.items.length > 0) {
        updatedInventory = inventory.map((item) => {
          const lineItem = noteData.items.find((i) => i.itemId === item.id);
          if (lineItem) {
            const prev = item.currentStock;
            const isAddingToStock =
              (noteData.type === 'credit_note' && noteData.partyType === 'customer') ||
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

    setDebitCreditNotes((prev) => [newNote, ...prev]);

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
  }, [
    accounts,
    assertDateNotInClosedPeriod,
    companySettings,
    debitCreditNotes,
    inventory,
    journalEntries,
    logAuditEvent,
    recalculateAccountBalances,
    setAccounts,
    setCustomers,
    setInventory,
    setJournalEntries,
    setStockMovements,
    setSuppliers,
    validatePurchaseInventory,
  ]);

  const deleteDebitCreditNote = useCallback((id: string) => {
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
  }, [assertDateNotInClosedPeriod, debitCreditNotes, setJournalEntries]);

  // Create Voucher
  const createVoucher = useCallback(async (
    voucherData: Omit<Voucher, 'id' | 'amountInWordsAr' | 'journalEntryId' | 'createdAt'>
  ): Promise<Voucher> => {
    const nowIso = new Date().toISOString();
    const [today] = nowIso.split('T');
    const effectiveDate = voucherData.date || today;
    assertDateNotInClosedPeriod(effectiveDate, voucherData.type === 'receipt' ? 'سند قبض' : 'سند صرف');

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
    const voucherNumber =
      voucherData.voucherNumber && !voucherData.voucherNumber.startsWith('VCH-AUTO')
        ? voucherData.voucherNumber
        : documentSequenceService.getNextNumber(
            seqType,
            fiscalYear,
            vouchers.filter((v) => v.type === voucherData.type).map((v) => v.voucherNumber)
          );

    const status: DocumentStatus = voucherData.status || 'posted';
    let jvId: string | undefined = undefined;
    let updatedJournalEntries = journalEntries;

    if (status === 'posted') {
      jvId = generateEntityId('jv');
      const jvNumber = documentSequenceService.getNextNumber(
        'journal_entry',
        fiscalYear,
        journalEntries.map((j) => j.entryNumber)
      );

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

    setVouchers((prev) => [newVoucher, ...prev]);

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
  }, [
    assertDateNotInClosedPeriod,
    companySettings,
    journalEntries,
    logAuditEvent,
    purchaseInvoices,
    recalculateAccountBalances,
    salesInvoices,
    setAccounts,
    setCustomers,
    setJournalEntries,
    setPurchaseInvoices,
    setSalesInvoices,
    setSuppliers,
    vouchers,
  ]);

  const deleteVoucher = useCallback((id: string) => {
    const target = vouchers.find((v) => v.id === id);
    if (!target) return;

    assertDateNotInClosedPeriod(target.date, 'سند مالي');

    if (target.status === 'posted') {
      throw new Error('لا يمكن حذف سند قبض/صرف مُرحّل مباشرة حفاظاً على دقة القيود المحاسبية. يرجى استخدام القيد العكسي (Reverse).');
    }

    let updatedJournal = journalEntries;
    if (target.journalEntryId) {
      updatedJournal = journalEntries.filter((j) => j.id !== target.journalEntryId && j.referenceId !== target.id);
      setJournalEntries(updatedJournal);
    }

    setVouchers((prev) => prev.filter((v) => v.id !== id));
    setAccounts((prevAccs) => recalculateAccountBalances(updatedJournal, prevAccs));
  }, [assertDateNotInClosedPeriod, journalEntries, recalculateAccountBalances, setAccounts, setJournalEntries, vouchers]);

  // Create Simple Expense
  const createSimpleExpense = useCallback(async (
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
      const jvNumber = documentSequenceService.getNextNumber(
        'journal_entry',
        fiscalYear,
        journalEntries.map((j) => j.entryNumber)
      );

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

    setSimpleExpenses((prev) => [newExpense, ...prev]);

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
  }, [
    assertDateNotInClosedPeriod,
    companySettings,
    journalEntries,
    logAuditEvent,
    recalculateAccountBalances,
    setAccounts,
    setJournalEntries,
    simpleExpenses,
  ]);

  const deleteSimpleExpense = useCallback((id: string) => {
    const target = simpleExpenses.find((e) => e.id === id);
    if (!target) return;

    assertDateNotInClosedPeriod(target.date, 'فاتورة مصروف');

    if (target.status === 'posted') {
      throw new Error('لا يمكن حذف فاتورة مصروفات مرحّلة مباشرة. يرجى استخدام القيد العكسي (Reverse).');
    }

    let updatedJournal = journalEntries;
    if (target.journalEntryId) {
      updatedJournal = journalEntries.filter((j) => j.id !== target.journalEntryId && j.referenceId !== target.id);
      setJournalEntries(updatedJournal);
    }

    setSimpleExpenses((prev) => prev.filter((e) => e.id !== id));
    setAccounts((prevAccs) => recalculateAccountBalances(updatedJournal, prevAccs));
  }, [assertDateNotInClosedPeriod, journalEntries, recalculateAccountBalances, setAccounts, setJournalEntries, simpleExpenses]);

  // Document Lifecycle Management (postDocument, cancelDraftDocument, reversePostedDocument)
  const postDocument = useCallback(async (type: DocumentType, id: string): Promise<void> => {
    const nowIso = new Date().toISOString();
    const [today] = nowIso.split('T');

    if (type === 'sales_invoice') {
      const inv = salesInvoices.find((i) => i.id === id);
      if (!inv) throw new Error('فاتورة المبيعات غير موجودة');
      if (inv.status !== 'draft') throw new Error('فقط الفواتير بحالة مسودة (draft) يمكن ترحيلها');

      const effectiveDate = inv.issueDate || today;
      assertDateNotInClosedPeriod(effectiveDate, 'فاتورة مبيعات');

      assertSaleInventory(inv.items, inventory);

      const fiscalYear = getDocFiscalYear(effectiveDate);
      const jvId = generateEntityId('jv');
      const jvNumber = documentSequenceService.getNextNumber(
        'journal_entry',
        fiscalYear,
        journalEntries.map((j) => j.entryNumber)
      );

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

      if (inv.remainingAmount > 0 && inv.customerId) {
        setCustomers((prev) =>
          prev.map((c) => (c.id === inv.customerId ? { ...c, balance: c.balance + inv.remainingAmount } : c))
        );
      }

      setSalesInvoices((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: 'posted', postedAt: nowIso, journalEntryId: jvId } : i))
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
      const jvNumber = documentSequenceService.getNextNumber(
        'journal_entry',
        fiscalYear,
        journalEntries.map((j) => j.entryNumber)
      );

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
    }
  }, [
    assertDateNotInClosedPeriod,
    companySettings,
    inventory,
    journalEntries,
    purchaseInvoices,
    recalculateAccountBalances,
    salesInvoices,
    setAccounts,
    setCustomers,
    setInventory,
    setJournalEntries,
    setPurchaseInvoices,
    setSalesInvoices,
    setStockMovements,
    setSuppliers,
  ]);

  const cancelDraftDocument = useCallback(async (type: DocumentType, id: string, cancellationReason: string): Promise<void> => {
    if (!cancellationReason || cancellationReason.trim().length === 0) {
      throw new Error('يجب كتابة سبب الإلغاء');
    }

    if (type === 'sales_invoice') {
      const inv = salesInvoices.find((i) => i.id === id);
      if (!inv) throw new Error('فاتورة المبيعات غير موجودة');
      if (inv.status !== 'draft') throw new Error('فقط الفواتير بحالة مسودة يمكن إلغاؤها');
      setSalesInvoices((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: 'cancelled', cancellationReason } : i))
      );
    } else if (type === 'purchase_invoice') {
      const pur = purchaseInvoices.find((p) => p.id === id);
      if (!pur) throw new Error('فاتورة المشتريات غير موجودة');
      if (pur.status !== 'draft') throw new Error('فقط فواتير المشتريات بحالة مسودة يمكن إلغاؤها');
      setPurchaseInvoices((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'cancelled', cancellationReason } : p))
      );
    } else if (type === 'debit_credit_note') {
      const note = debitCreditNotes.find((n) => n.id === id);
      if (!note) throw new Error('الإشعار غير موجود');
      if (note.status !== 'draft') throw new Error('فقط الإشعارات بحالة مسودة يمكن إلغاؤها');
      setDebitCreditNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'cancelled', cancellationReason } : n))
      );
    } else if (type === 'voucher') {
      const v = vouchers.find((vo) => vo.id === id);
      if (!v) throw new Error('السند غير موجود');
      if (v.status !== 'draft') throw new Error('فقط السندات بحالة مسودة يمكن إلغاؤها');
      setVouchers((prev) =>
        prev.map((vo) => (vo.id === id ? { ...vo, status: 'cancelled', cancellationReason } : vo))
      );
    } else if (type === 'simple_expense') {
      const exp = simpleExpenses.find((e) => e.id === id);
      if (!exp) throw new Error('فاتورة المصروف غير موجودة');
      if (exp.status !== 'draft') throw new Error('فقط فواتير المصروفات بحالة مسودة يمكن إلغاؤها');
      setSimpleExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: 'cancelled', cancellationReason } : e))
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
  }, [debitCreditNotes, logAuditEvent, purchaseInvoices, salesInvoices, simpleExpenses, vouchers]);

  const reversePostedDocument = useCallback(async (
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

    let origJv: JournalEntry | undefined = undefined;
    let docRefNumber = '';

    if (type === 'sales_invoice') {
      const target = salesInvoices.find((i) => i.id === id);
      if (!target) throw new Error('فاتورة المبيعات غير موجودة');
      if (target.status !== 'posted') {
        throw new Error('فقط الفواتير المرحلة (posted) يمكن عكسها محاسبياً.');
      }
      docRefNumber = target.invoiceNumber;
      origJv = journalEntries.find((j) => j.id === target.journalEntryId || j.referenceId === id);

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

      if (target.remainingAmount > 0 && target.customerId) {
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === target.customerId ? { ...c, balance: Math.max(0, c.balance - target.remainingAmount) } : c
          )
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
      if (target.status !== 'posted') {
        throw new Error('فقط الإشعارات المرحلة يمكن عكسها.');
      }
      docRefNumber = target.noteNumber;
      origJv = journalEntries.find((j) => j.id === target.journalEntryId || j.referenceId === id);

      if (target.affectInventory && target.items && target.items.length > 0) {
        if (target.type === 'credit_note') {
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
              const updatedBal =
                target.type === 'credit_note'
                  ? c.balance + target.totalAmount
                  : Math.max(0, c.balance - target.totalAmount);
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

      if (target.type === 'receipt' && target.partyType === 'customer' && target.partyId) {
        setCustomers((prev) =>
          prev.map((c) => (c.id === target.partyId ? { ...c, balance: c.balance + target.amount } : c))
        );
      } else if (target.type === 'payment' && target.partyType === 'supplier' && target.partyId) {
        setSuppliers((prev) =>
          prev.map((s) => (s.id === target.partyId ? { ...s, balance: s.balance + target.amount } : s))
        );
      }

      if (target.relatedInvoiceId) {
        if (target.type === 'receipt') {
          setSalesInvoices((prev) =>
            prev.map((inv) => {
              if (inv.id === target.relatedInvoiceId) {
                const newPaid = Math.max(0, (inv.paidAmount || 0) - target.amount);
                const newRem = inv.totalAmount - newPaid;
                const newStatus = newRem <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
                return { ...inv, paidAmount: newPaid, remainingAmount: newRem, paymentStatus: newStatus };
              }
              return inv;
            })
          );
        } else if (target.type === 'payment') {
          setPurchaseInvoices((prev) =>
            prev.map((inv) => {
              if (inv.id === target.relatedInvoiceId) {
                const newPaid = Math.max(0, (inv.paidAmount || 0) - target.amount);
                const newRem = inv.totalAmount - newPaid;
                const newStatus = newRem <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
                return { ...inv, paidAmount: newPaid, remainingAmount: newRem, paymentStatus: newStatus };
              }
              return inv;
            })
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
      if (!target) throw new Error('فاتورة المصروف غير موجودة');
      if (target.status !== 'posted') {
        throw new Error('فقط فواتير المصروفات المرحلة يمكن عكسها.');
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
    }

    if (!origJv) {
      throw new Error('تعذر العثور على القيد المحاسبي الأصلي للمستند المراد عكسه.');
    }

    const reversalLines: JournalEntryLine[] = origJv.lines.map((l) => ({
      id: generateEntityId('jvl'),
      accountId: l.accountId,
      accountCode: l.accountCode,
      accountNameAr: l.accountNameAr,
      debit: l.credit,
      credit: l.debit,
      description: `عكس قيد: ${l.description || origJv?.narrationAr || ''}`,
    }));

    const reversalEntry: JournalEntry = {
      id: reversalJvId,
      entryNumber: reversalJvNumber,
      date: revDate,
      referenceType: `${type}_reversal` as any,
      referenceId: id,
      referenceNumber: docRefNumber,
      narrationAr: `قيد عكسي للمستند ${docRefNumber} - سبب العكس: ${reversalReason}`,
      lines: reversalLines,
      totalDebit: origJv.totalCredit,
      totalCredit: origJv.totalDebit,
      isBalanced: true,
      isReversal: true,
      reversalReason: reversalReason,
      reversedEntryId: origJv.id,
      status: 'posted',
      postedAt: nowIso,
      createdAt: nowIso,
    };

    const updatedJournal = [reversalEntry, ...journalEntries];
    setJournalEntries(updatedJournal);
    setAccounts((prevAccs) => recalculateAccountBalances(updatedJournal, prevAccs));

    logAuditEvent({
      action: 'reverse',
      entityType: type === 'simple_expense' ? 'simple_expense' : (type as any),
      entityId: id,
      reason: reversalReason,
      source: 'web_ui',
      metadata: { reversalEntryNumber: reversalJvNumber, documentType: type, documentId: id },
    });

    return reversalEntry;
  }, [
    assertDateNotInClosedPeriod,
    companySettings,
    debitCreditNotes,
    inventory,
    journalEntries,
    logAuditEvent,
    purchaseInvoices,
    recalculateAccountBalances,
    salesInvoices,
    setAccounts,
    setCustomers,
    setDebitCreditNotes,
    setInventory,
    setJournalEntries,
    setPurchaseInvoices,
    setSalesInvoices,
    setSimpleExpenses,
    setStockMovements,
    setSuppliers,
    setVouchers,
    simpleExpenses,
    vouchers,
  ]);

  const contextValue: InvoicesContextType = value || {
    salesInvoices,
    createSalesInvoice,
    updateSalesInvoice,
    deleteSalesInvoice,
    recordInvoicePayment,
    purchaseInvoices,
    createPurchaseInvoice,
    updatePurchaseInvoice,
    deletePurchaseInvoice,
    debitCreditNotes,
    createDebitCreditNote,
    deleteDebitCreditNote,
    vouchers,
    createVoucher,
    deleteVoucher,
    simpleExpenses,
    createSimpleExpense,
    deleteSimpleExpense,
    postDocument,
    cancelDraftDocument,
    reversePostedDocument,
    setSalesInvoices,
    setPurchaseInvoices,
    setDebitCreditNotes,
    setVouchers,
    setSimpleExpenses,
  };

  return <InvoicesContext.Provider value={contextValue}>{children}</InvoicesContext.Provider>;
};

export const useInvoices = (): InvoicesContextType => {
  const context = useContext(InvoicesContext);
  if (!context) {
    throw new Error('useInvoices must be used within an InvoicesProvider or AccountingProvider');
  }
  return context;
};
