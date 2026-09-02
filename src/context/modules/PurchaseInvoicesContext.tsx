import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  PurchaseInvoice,
  JournalEntry,
  StockMovement,
  DocumentStatus,
} from '../../types/accounting';
import { getAccountingRepository } from '../../services/dataService';
import { useCompanySettings } from './CompanyContext';
import { useFiscalPeriods } from './FiscalPeriodsContext';
import { useAccounts } from './AccountsContext';
import { useCustomersSuppliers } from './CustomersSuppliersContext';
import { useInventory } from './InventoryContext';
import { useJournal } from './JournalContext';
import { useInvoiceSequence } from './InvoiceSequenceContext';
import { generateEntityId } from '../../utils/uuid';

export interface PurchaseInvoicesContextType {
  purchaseInvoices: PurchaseInvoice[];
  createPurchaseInvoice: (
    purchaseData: Omit<PurchaseInvoice, 'id' | 'journalEntryId'>
  ) => Promise<PurchaseInvoice>;
  updatePurchaseInvoice: (id: string, invoice: Partial<PurchaseInvoice>) => void;
  deletePurchaseInvoice: (id: string) => void;
  setPurchaseInvoices: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
}

export const PurchaseInvoicesContext = createContext<PurchaseInvoicesContextType | undefined>(undefined);

export const PurchaseInvoicesProvider: React.FC<{
  children: React.ReactNode;
  value?: PurchaseInvoicesContextType;
}> = ({ children, value }) => {
  const repo = getAccountingRepository();
  const { logAuditEvent } = useCompanySettings();
  const { assertDateNotInClosedPeriod } = useFiscalPeriods();
  const { setAccounts, recalculateAccountBalances } = useAccounts();
  const { setSuppliers } = useCustomersSuppliers();
  const { inventory, setInventory, setStockMovements, validatePurchaseInventory } = useInventory();
  const { journalEntries, setJournalEntries } = useJournal();
  const { getDocFiscalYear, getNextDocumentNumber } = useInvoiceSequence();

  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>(() => repo.loadPurchaseInvoices());

  useEffect(() => {
    repo.savePurchaseInvoices(purchaseInvoices);
  }, [purchaseInvoices]);

  useEffect(() => {
    const handleReload = () => {
      setPurchaseInvoices(repo.loadPurchaseInvoices());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('shadi_flex_data_reloaded', handleReload);
      return () => window.removeEventListener('shadi_flex_data_reloaded', handleReload);
    }
  }, [repo]);

  // Create Purchase Invoice
  const createPurchaseInvoice = useCallback(
    async (
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
          : getNextDocumentNumber(
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
        const jvNumber = getNextDocumentNumber(
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
    },
    [
      assertDateNotInClosedPeriod,
      getDocFiscalYear,
      getNextDocumentNumber,
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
    ]
  );

  const updatePurchaseInvoice = useCallback(
    (id: string, invoiceUpdate: Partial<PurchaseInvoice>) => {
      const existing = purchaseInvoices.find((p) => p.id === id);
      if (!existing) return;

      assertDateNotInClosedPeriod(existing.issueDate, 'فاتورة مشتريات');
      if (invoiceUpdate.issueDate) {
        assertDateNotInClosedPeriod(invoiceUpdate.issueDate, 'فاتورة مشتريات');
      }

      if (existing.status === 'posted' || existing.status === 'reversed') {
        const financialKeys = ['totalAmount', 'taxableAmount', 'vatTotal', 'subtotal', 'items', 'supplierId'];
        const hasFinancialChange = financialKeys.some(
          (k) => k in invoiceUpdate && (invoiceUpdate as any)[k] !== (existing as any)[k]
        );
        if (hasFinancialChange) {
          throw new Error(
            'لا يمكن تعديل القيم المالية أو أطراف فاتورة مشتريات مُرحّلة. يرجى استخدام القيد العكسي أو إصدار إشعار مدين.'
          );
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
    },
    [assertDateNotInClosedPeriod, logAuditEvent, purchaseInvoices]
  );

  const deletePurchaseInvoice = useCallback(
    (id: string) => {
      const target = purchaseInvoices.find((p) => p.id === id);
      if (!target) return;

      assertDateNotInClosedPeriod(target.issueDate, 'فاتورة مشتريات');

      if (target.status === 'posted') {
        throw new Error(
          'لا يمكن حذف فاتورة مشتريات مُرحّلة مباشرة حفاظاً على التسلسل المحاسبي. يرجى استخدام الإلغاء العكسي.'
        );
      }

      if (target.journalEntryId) {
        setJournalEntries((prev) => prev.filter((j) => j.id !== target.journalEntryId));
      }
      setPurchaseInvoices((prev) => prev.filter((p) => p.id !== id));
    },
    [assertDateNotInClosedPeriod, purchaseInvoices, setJournalEntries]
  );

  const contextValue: PurchaseInvoicesContextType = value || {
    purchaseInvoices,
    createPurchaseInvoice,
    updatePurchaseInvoice,
    deletePurchaseInvoice,
    setPurchaseInvoices,
  };

  return <PurchaseInvoicesContext.Provider value={contextValue}>{children}</PurchaseInvoicesContext.Provider>;
};

export const usePurchaseInvoices = (): PurchaseInvoicesContextType => {
  const context = useContext(PurchaseInvoicesContext);
  if (!context) {
    throw new Error('usePurchaseInvoices must be used within a PurchaseInvoicesProvider or AccountingProvider');
  }
  return context;
};
