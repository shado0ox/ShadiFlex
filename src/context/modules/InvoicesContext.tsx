import React, { createContext, useContext, useCallback } from 'react';
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
  PaymentMethod,
} from '../../types/accounting';
import { useCompanySettings } from './CompanyContext';
import { useFiscalPeriods } from './FiscalPeriodsContext';
import { useAccounts } from './AccountsContext';
import { useCustomersSuppliers } from './CustomersSuppliersContext';
import { useInventory } from './InventoryContext';
import { useJournal } from './JournalContext';
import { generateEntityId } from '../../utils/uuid';
import { assertSaleInventory } from '../../services/inventoryValidationService';

import {
  InvoiceSequenceProvider,
  useInvoiceSequence,
} from './InvoiceSequenceContext';
import {
  SalesInvoicesProvider,
  useSalesInvoices,
} from './SalesInvoicesContext';
import {
  PurchaseInvoicesProvider,
  usePurchaseInvoices,
} from './PurchaseInvoicesContext';
import {
  DebitCreditNotesProvider,
  useDebitCreditNotes,
} from './DebitCreditNotesContext';
import {
  VouchersProvider,
  useVouchers,
} from './VouchersContext';

export * from './InvoiceSequenceContext';
export * from './SalesInvoicesContext';
export * from './PurchaseInvoicesContext';
export * from './DebitCreditNotesContext';
export * from './VouchersContext';

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

const InvoicesComposerBridge: React.FC<{
  children: React.ReactNode;
  value?: InvoicesContextType;
}> = ({ children, value }) => {
  const { logAuditEvent } = useCompanySettings();
  const { assertDateNotInClosedPeriod } = useFiscalPeriods();
  const { setAccounts, recalculateAccountBalances } = useAccounts();
  const { setCustomers, setSuppliers } = useCustomersSuppliers();
  const { inventory, setInventory, setStockMovements } = useInventory();
  const { journalEntries, setJournalEntries } = useJournal();
  const { getDocFiscalYear, getNextDocumentNumber } = useInvoiceSequence();

  const {
    salesInvoices,
    createSalesInvoice,
    updateSalesInvoice,
    deleteSalesInvoice,
    recordInvoicePayment,
    setSalesInvoices,
  } = useSalesInvoices();

  const {
    purchaseInvoices,
    createPurchaseInvoice,
    updatePurchaseInvoice,
    deletePurchaseInvoice,
    setPurchaseInvoices,
  } = usePurchaseInvoices();

  const {
    debitCreditNotes,
    createDebitCreditNote,
    deleteDebitCreditNote,
    setDebitCreditNotes,
  } = useDebitCreditNotes();

  const {
    vouchers,
    createVoucher,
    deleteVoucher,
    simpleExpenses,
    createSimpleExpense,
    deleteSimpleExpense,
    setVouchers,
    setSimpleExpenses,
  } = useVouchers();

  // Document Lifecycle Management (postDocument, cancelDraftDocument, reversePostedDocument)
  const postDocument = useCallback(
    async (type: DocumentType, id: string): Promise<void> => {
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
        const jvNumber = getNextDocumentNumber(
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
        const jvNumber = getNextDocumentNumber(
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
    },
    [
      assertDateNotInClosedPeriod,
      getDocFiscalYear,
      getNextDocumentNumber,
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
    ]
  );

  const cancelDraftDocument = useCallback(
    async (type: DocumentType, id: string, cancellationReason: string): Promise<void> => {
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
    },
    [
      debitCreditNotes,
      logAuditEvent,
      purchaseInvoices,
      salesInvoices,
      setDebitCreditNotes,
      setPurchaseInvoices,
      setSalesInvoices,
      setSimpleExpenses,
      setVouchers,
      simpleExpenses,
      vouchers,
    ]
  );

  const reversePostedDocument = useCallback(
    async (
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
      const reversalJvNumber = getNextDocumentNumber(
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
              if (c.id !== target.partyId) return c;
              const updatedBal =
                target.type === 'credit_note'
                  ? c.balance + target.totalAmount
                  : Math.max(0, c.balance - target.totalAmount);
              return { ...c, balance: updatedBal };
            })
          );
        } else if (target.partyType === 'supplier' && target.partyId) {
          setSuppliers((prev) =>
            prev.map((s) => {
              if (s.id !== target.partyId) return s;
              if (noteTargetIsDebit(target.type)) {
                return { ...s, balance: Math.max(0, s.balance - target.totalAmount) };
              } else {
                return { ...s, balance: s.balance + target.totalAmount };
              }
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
    },
    [
      assertDateNotInClosedPeriod,
      debitCreditNotes,
      getDocFiscalYear,
      getNextDocumentNumber,
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
    ]
  );

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

function noteTargetIsDebit(type: string): boolean {
  return type === 'debit_note';
}

export const InvoicesProvider: React.FC<{
  children: React.ReactNode;
  value?: InvoicesContextType;
}> = ({ children, value }) => {
  return (
    <InvoiceSequenceProvider>
      <SalesInvoicesProvider>
        <PurchaseInvoicesProvider>
          <DebitCreditNotesProvider>
            <VouchersProvider>
              <InvoicesComposerBridge value={value}>{children}</InvoicesComposerBridge>
            </VouchersProvider>
          </DebitCreditNotesProvider>
        </PurchaseInvoicesProvider>
      </SalesInvoicesProvider>
    </InvoiceSequenceProvider>
  );
};

export const useInvoices = (): InvoicesContextType => {
  const context = useContext(InvoicesContext);
  if (!context) {
    throw new Error('useInvoices must be used within an InvoicesProvider or AccountingProvider');
  }
  return context;
};
