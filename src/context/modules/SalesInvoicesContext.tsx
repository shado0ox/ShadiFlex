import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  SalesInvoice,
  JournalEntry,
  StockMovement,
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
import { useInvoiceSequence } from './InvoiceSequenceContext';
import { generateEntityId, generateUUID } from '../../utils/uuid';
import { generateZatcaTlvBase64 } from '../../utils/zatca';
import { assertSaleInventory } from '../../services/inventoryValidationService';

export interface SalesInvoicesContextType {
  salesInvoices: SalesInvoice[];
  createSalesInvoice: (
    invoiceData: Omit<SalesInvoice, 'id' | 'uuid' | 'zatcaQrBase64' | 'journalEntryId'>
  ) => Promise<SalesInvoice>;
  updateSalesInvoice: (id: string, invoice: Partial<SalesInvoice>) => void;
  deleteSalesInvoice: (id: string) => void;
  recordInvoicePayment: (invoiceId: string, amount: number, paymentMethod: PaymentMethod) => void;
  setSalesInvoices: React.Dispatch<React.SetStateAction<SalesInvoice[]>>;
}

export const SalesInvoicesContext = createContext<SalesInvoicesContextType | undefined>(undefined);

export const SalesInvoicesProvider: React.FC<{
  children: React.ReactNode;
  value?: SalesInvoicesContextType;
}> = ({ children, value }) => {
  const repo = getAccountingRepository();
  const { companySettings, logAuditEvent } = useCompanySettings();
  const { assertDateNotInClosedPeriod } = useFiscalPeriods();
  const { setAccounts, recalculateAccountBalances } = useAccounts();
  const { setCustomers } = useCustomersSuppliers();
  const { inventory, setInventory, setStockMovements, validateSaleInventory } = useInventory();
  const { journalEntries, setJournalEntries } = useJournal();
  const { getDocFiscalYear, getNextDocumentNumber } = useInvoiceSequence();

  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>(() => repo.loadSalesInvoices());

  useEffect(() => {
    repo.saveSalesInvoices(salesInvoices);
  }, [salesInvoices]);

  useEffect(() => {
    const handleReload = () => {
      setSalesInvoices(repo.loadSalesInvoices());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('shadi_flex_data_reloaded', handleReload);
      return () => window.removeEventListener('shadi_flex_data_reloaded', handleReload);
    }
  }, [repo]);

  // Create Sales Invoice
  const createSalesInvoice = useCallback(
    async (
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
          : getNextDocumentNumber(
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
        const jvNumber = getNextDocumentNumber(
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
    },
    [
      assertDateNotInClosedPeriod,
      companySettings,
      getDocFiscalYear,
      getNextDocumentNumber,
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
    ]
  );

  const updateSalesInvoice = useCallback(
    (id: string, invoiceUpdate: Partial<SalesInvoice>) => {
      const existing = salesInvoices.find((i) => i.id === id);
      if (!existing) return;

      assertDateNotInClosedPeriod(existing.issueDate, 'فاتورة مبيعات');
      if (invoiceUpdate.issueDate) {
        assertDateNotInClosedPeriod(invoiceUpdate.issueDate, 'فاتورة مبيعات');
      }

      if (existing.status === 'posted' || existing.status === 'reversed') {
        const financialKeys = ['totalAmount', 'taxableAmount', 'vatTotal', 'subtotal', 'items', 'customerId'];
        const hasFinancialChange = financialKeys.some(
          (k) => k in invoiceUpdate && (invoiceUpdate as any)[k] !== (existing as any)[k]
        );
        if (hasFinancialChange) {
          throw new Error(
            'لا يمكن تعديل القيم المالية أو أطراف فاتورة مبيعات مُرحّلة. يرجى استخدام القيد العكسي أو إصدار إشعار دائن/مدين.'
          );
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
    },
    [assertDateNotInClosedPeriod, logAuditEvent, salesInvoices]
  );

  const deleteSalesInvoice = useCallback(
    (id: string) => {
      const target = salesInvoices.find((i) => i.id === id);
      if (!target) return;

      assertDateNotInClosedPeriod(target.issueDate, 'فاتورة مبيعات');

      if (target.status === 'posted') {
        throw new Error(
          'لا يمكن حذف فاتورة ضريبية مُرحّلة مباشرة حفاظاً على التسلسل المحاسبي والضريبي ZATCA. يرجى استخدام الإلغاء العكسي (Reverse/Credit Note).'
        );
      }

      if (target.journalEntryId) {
        setJournalEntries((prev) => prev.filter((j) => j.id !== target.journalEntryId));
      }
      setSalesInvoices((prev) => prev.filter((i) => i.id !== id));
    },
    [assertDateNotInClosedPeriod, salesInvoices, setJournalEntries]
  );

  // Record payment on invoice
  const recordInvoicePayment = useCallback(
    (invoiceId: string, amount: number, paymentMethod: PaymentMethod) => {
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
      const jvNumber = getNextDocumentNumber(
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
    },
    [
      assertDateNotInClosedPeriod,
      getDocFiscalYear,
      getNextDocumentNumber,
      journalEntries,
      recalculateAccountBalances,
      salesInvoices,
      setAccounts,
      setCustomers,
      setJournalEntries,
    ]
  );

  const contextValue: SalesInvoicesContextType = value || {
    salesInvoices,
    createSalesInvoice,
    updateSalesInvoice,
    deleteSalesInvoice,
    recordInvoicePayment,
    setSalesInvoices,
  };

  return <SalesInvoicesContext.Provider value={contextValue}>{children}</SalesInvoicesContext.Provider>;
};

export const useSalesInvoices = (): SalesInvoicesContextType => {
  const context = useContext(SalesInvoicesContext);
  if (!context) {
    throw new Error('useSalesInvoices must be used within a SalesInvoicesProvider or AccountingProvider');
  }
  return context;
};
