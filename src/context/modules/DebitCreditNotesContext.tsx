import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  DebitCreditNote,
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
import { generateEntityId, generateUUID } from '../../utils/uuid';
import { generateZatcaTlvBase64 } from '../../utils/zatca';
import { assertSaleInventory } from '../../services/inventoryValidationService';

export interface DebitCreditNotesContextType {
  debitCreditNotes: DebitCreditNote[];
  createDebitCreditNote: (
    noteData: Omit<DebitCreditNote, 'id' | 'uuid' | 'zatcaQrBase64' | 'journalEntryId'>
  ) => Promise<DebitCreditNote>;
  deleteDebitCreditNote: (id: string) => void;
  setDebitCreditNotes: React.Dispatch<React.SetStateAction<DebitCreditNote[]>>;
}

export const DebitCreditNotesContext = createContext<DebitCreditNotesContextType | undefined>(undefined);

export const DebitCreditNotesProvider: React.FC<{
  children: React.ReactNode;
  value?: DebitCreditNotesContextType;
}> = ({ children, value }) => {
  const repo = getAccountingRepository();
  const { companySettings, logAuditEvent } = useCompanySettings();
  const { assertDateNotInClosedPeriod } = useFiscalPeriods();
  const { accounts, setAccounts, recalculateAccountBalances } = useAccounts();
  const { setCustomers, setSuppliers } = useCustomersSuppliers();
  const { inventory, setInventory, setStockMovements, validatePurchaseInventory } = useInventory();
  const { journalEntries, setJournalEntries } = useJournal();
  const { getDocFiscalYear, getNextDocumentNumber } = useInvoiceSequence();

  const [debitCreditNotes, setDebitCreditNotes] = useState<DebitCreditNote[]>(() => repo.loadDebitCreditNotes());

  useEffect(() => {
    repo.saveDebitCreditNotes(debitCreditNotes);
  }, [debitCreditNotes]);

  useEffect(() => {
    const handleReload = () => {
      setDebitCreditNotes(repo.loadDebitCreditNotes());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('shadi_flex_data_reloaded', handleReload);
      return () => window.removeEventListener('shadi_flex_data_reloaded', handleReload);
    }
  }, [repo]);

  // Create Debit / Credit Note
  const createDebitCreditNote = useCallback(
    async (
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
          : getNextDocumentNumber(
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
        const jvNumber = getNextDocumentNumber(
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
    },
    [
      accounts,
      assertDateNotInClosedPeriod,
      companySettings,
      debitCreditNotes,
      getDocFiscalYear,
      getNextDocumentNumber,
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
    ]
  );

  const deleteDebitCreditNote = useCallback(
    (id: string) => {
      const target = debitCreditNotes.find((n) => n.id === id);
      if (!target) return;

      assertDateNotInClosedPeriod(target.issueDate, target.type === 'credit_note' ? 'إشعار دائن' : 'إشعار مدين');

      if (target.status === 'posted') {
        throw new Error(
          'لا يمكن حذف إشعار دائن/مدين مُرحّل مباشرة حفاظاً على التسلسل الضريبي ZATCA. يرجى استخدام الإلغاء العكسي.'
        );
      }

      if (target.journalEntryId) {
        setJournalEntries((prev) => prev.filter((j) => j.id !== target.journalEntryId));
      }
      setDebitCreditNotes((prev) => prev.filter((n) => n.id !== id));
    },
    [assertDateNotInClosedPeriod, debitCreditNotes, setJournalEntries]
  );

  const contextValue: DebitCreditNotesContextType = value || {
    debitCreditNotes,
    createDebitCreditNote,
    deleteDebitCreditNote,
    setDebitCreditNotes,
  };

  return <DebitCreditNotesContext.Provider value={contextValue}>{children}</DebitCreditNotesContext.Provider>;
};

export const useDebitCreditNotes = (): DebitCreditNotesContextType => {
  const context = useContext(DebitCreditNotesContext);
  if (!context) {
    throw new Error('useDebitCreditNotes must be used within a DebitCreditNotesProvider or AccountingProvider');
  }
  return context;
};
