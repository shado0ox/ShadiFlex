import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Voucher,
  SimpleExpenseInvoice,
  JournalEntry,
  DocumentStatus,
} from '../../types/accounting';
import { getAccountingRepository } from '../../services/dataService';
import { useCompanySettings } from './CompanyContext';
import { useFiscalPeriods } from './FiscalPeriodsContext';
import { useAccounts } from './AccountsContext';
import { useCustomersSuppliers } from './CustomersSuppliersContext';
import { useJournal } from './JournalContext';
import { useInvoiceSequence } from './InvoiceSequenceContext';
import { useSalesInvoices } from './SalesInvoicesContext';
import { usePurchaseInvoices } from './PurchaseInvoicesContext';
import { generateEntityId } from '../../utils/uuid';
import { tafqeetArabic } from '../../utils/tafqeet';

export interface VouchersContextType {
  vouchers: Voucher[];
  createVoucher: (
    voucherData: Omit<Voucher, 'id' | 'amountInWordsAr' | 'journalEntryId' | 'createdAt'>
  ) => Promise<Voucher>;
  deleteVoucher: (id: string) => void;

  simpleExpenses: SimpleExpenseInvoice[];
  createSimpleExpense: (
    expenseData: Omit<SimpleExpenseInvoice, 'id' | 'expenseNumber' | 'journalEntryId' | 'createdAt'>
  ) => Promise<SimpleExpenseInvoice>;
  deleteSimpleExpense: (id: string) => void;

  setVouchers: React.Dispatch<React.SetStateAction<Voucher[]>>;
  setSimpleExpenses: React.Dispatch<React.SetStateAction<SimpleExpenseInvoice[]>>;
}

export const VouchersContext = createContext<VouchersContextType | undefined>(undefined);

export const VouchersProvider: React.FC<{
  children: React.ReactNode;
  value?: VouchersContextType;
}> = ({ children, value }) => {
  const repo = getAccountingRepository();
  const { logAuditEvent } = useCompanySettings();
  const { assertDateNotInClosedPeriod } = useFiscalPeriods();
  const { setAccounts, recalculateAccountBalances } = useAccounts();
  const { setCustomers, setSuppliers } = useCustomersSuppliers();
  const { journalEntries, setJournalEntries } = useJournal();
  const { getDocFiscalYear, getNextDocumentNumber } = useInvoiceSequence();
  const { salesInvoices, setSalesInvoices } = useSalesInvoices();
  const { purchaseInvoices, setPurchaseInvoices } = usePurchaseInvoices();

  const [vouchers, setVouchers] = useState<Voucher[]>(() => repo.loadVouchers());
  const [simpleExpenses, setSimpleExpenses] = useState<SimpleExpenseInvoice[]>(() => repo.loadSimpleExpenses());

  useEffect(() => {
    repo.saveVouchers(vouchers);
  }, [vouchers]);

  useEffect(() => {
    repo.saveSimpleExpenses(simpleExpenses);
  }, [simpleExpenses]);

  useEffect(() => {
    const handleReload = () => {
      setVouchers(repo.loadVouchers());
      setSimpleExpenses(repo.loadSimpleExpenses());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('shadi_flex_data_reloaded', handleReload);
      return () => window.removeEventListener('shadi_flex_data_reloaded', handleReload);
    }
  }, [repo]);

  // Create Voucher
  const createVoucher = useCallback(
    async (
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
              throw new Error(
                `لا يمكن سداد مبلغ (${voucherData.amount} ر.س) أكبر من المبلغ المتبقي على الفاتورة (${remaining} ر.س)`
              );
            }
          }
        } else if (voucherData.type === 'payment') {
          const pur = purchaseInvoices.find(
            (p) => p.id === voucherData.relatedInvoiceId || p.invoiceNumber === voucherData.relatedInvoiceNumber
          );
          if (pur) {
            const remaining = pur.totalAmount - (pur.paidAmount || 0);
            if (voucherData.amount > remaining + 0.001) {
              throw new Error(
                `لا يمكن صرف مبلغ (${voucherData.amount} ر.س) أكبر من المبلغ المتبقي على فاتورة المشتريات (${remaining} ر.س)`
              );
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
          : getNextDocumentNumber(
              seqType,
              fiscalYear,
              vouchers.filter((v) => v.type === voucherData.type).map((v) => v.voucherNumber)
            );

      const status: DocumentStatus = voucherData.status || 'posted';
      let jvId: string | undefined = undefined;
      let updatedJournalEntries = journalEntries;

      if (status === 'posted') {
        jvId = generateEntityId('jv');
        const jvNumber = getNextDocumentNumber(
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
    },
    [
      assertDateNotInClosedPeriod,
      getDocFiscalYear,
      getNextDocumentNumber,
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
    ]
  );

  const deleteVoucher = useCallback(
    (id: string) => {
      const target = vouchers.find((v) => v.id === id);
      if (!target) return;

      assertDateNotInClosedPeriod(target.date, 'سند مالي');

      if (target.status === 'posted') {
        throw new Error(
          'لا يمكن حذف سند قبض/صرف مُرحّل مباشرة حفاظاً على دقة القيود المحاسبية. يرجى استخدام القيد العكسي (Reverse).'
        );
      }

      let updatedJournal = journalEntries;
      if (target.journalEntryId) {
        updatedJournal = journalEntries.filter((j) => j.id !== target.journalEntryId && j.referenceId !== target.id);
        setJournalEntries(updatedJournal);
      }

      setVouchers((prev) => prev.filter((v) => v.id !== id));
      setAccounts((prevAccs) => recalculateAccountBalances(updatedJournal, prevAccs));
    },
    [assertDateNotInClosedPeriod, journalEntries, recalculateAccountBalances, setAccounts, setJournalEntries, vouchers]
  );

  // Create Simple Expense
  const createSimpleExpense = useCallback(
    async (
      expenseData: Omit<SimpleExpenseInvoice, 'id' | 'expenseNumber' | 'journalEntryId' | 'createdAt'>
    ): Promise<SimpleExpenseInvoice> => {
      const newId = generateEntityId('exp');
      const nowIso = new Date().toISOString();
      const [today] = nowIso.split('T');
      const effectiveDate = expenseData.date || today;
      assertDateNotInClosedPeriod(effectiveDate, 'فاتورة مصروف');

      const fiscalYear = getDocFiscalYear(effectiveDate);

      const expNumber = getNextDocumentNumber(
        'simple_expense',
        fiscalYear,
        simpleExpenses.map((e) => e.expenseNumber)
      );

      const vatAmount =
        expenseData.vatRate > 0 ? Number((expenseData.amountBeforeVat * expenseData.vatRate).toFixed(2)) : 0;
      const totalAmount = Number((expenseData.amountBeforeVat + vatAmount).toFixed(2));
      const status: DocumentStatus = expenseData.status || 'posted';

      let jvId: string | undefined = undefined;
      let updatedJournalEntries = journalEntries;

      if (status === 'posted') {
        jvId = generateEntityId('jv');
        const jvNumber = getNextDocumentNumber(
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
    },
    [
      assertDateNotInClosedPeriod,
      getDocFiscalYear,
      getNextDocumentNumber,
      journalEntries,
      logAuditEvent,
      recalculateAccountBalances,
      setAccounts,
      setJournalEntries,
      simpleExpenses,
    ]
  );

  const deleteSimpleExpense = useCallback(
    (id: string) => {
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
    },
    [assertDateNotInClosedPeriod, journalEntries, recalculateAccountBalances, setAccounts, setJournalEntries, simpleExpenses]
  );

  const contextValue: VouchersContextType = value || {
    vouchers,
    createVoucher,
    deleteVoucher,
    simpleExpenses,
    createSimpleExpense,
    deleteSimpleExpense,
    setVouchers,
    setSimpleExpenses,
  };

  return <VouchersContext.Provider value={contextValue}>{children}</VouchersContext.Provider>;
};

export const useVouchers = (): VouchersContextType => {
  const context = useContext(VouchersContext);
  if (!context) {
    throw new Error('useVouchers must be used within a VouchersProvider or AccountingProvider');
  }
  return context;
};
