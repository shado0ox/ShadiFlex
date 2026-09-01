import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { JournalEntry, DocumentStatus } from '../../types/accounting';
import { getAccountingRepository } from '../../services/dataService';
import { useAccounts } from './AccountsContext';
import { useFiscalPeriods } from './FiscalPeriodsContext';
import { useCompanySettings } from './CompanyContext';
import { generateEntityId } from '../../utils/uuid';
import { documentSequenceService } from '../../services/documentSequenceService';
import {
  assertValidJournalEntry,
  validateJournalEntry as validateJv,
  JournalValidationResult,
} from '../../services/journalValidationService';

export interface JournalContextType {
  journalEntries: JournalEntry[];
  createManualJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void;
  deleteJournalEntry: (id: string) => void;
  validateJournalEntry: (entry: Partial<JournalEntry>) => JournalValidationResult;
  setJournalEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
}

export const JournalContext = createContext<JournalContextType | undefined>(undefined);

export const JournalProvider: React.FC<{
  children: React.ReactNode;
  value?: JournalContextType;
}> = ({ children, value }) => {
  const repo = getAccountingRepository();
  const { accounts, setAccounts, recalculateAccountBalances } = useAccounts();
  const { assertDateNotInClosedPeriod } = useFiscalPeriods();
  const { companySettings, logAuditEvent } = useCompanySettings();

  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => repo.loadJournalEntries());

  useEffect(() => {
    repo.saveJournalEntries(journalEntries);
  }, [journalEntries]);

  useEffect(() => {
    const handleReload = () => {
      setJournalEntries(repo.loadJournalEntries());
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

  const createManualJournalEntry = useCallback((entry: Omit<JournalEntry, 'id' | 'createdAt'>) => {
    const newId = generateEntityId('jv');
    const nowIso = new Date().toISOString();
    const [today] = nowIso.split('T');
    const effectiveDate = entry.date || today;
    assertDateNotInClosedPeriod(effectiveDate, 'قيد يومية');

    const fiscalYear = getDocFiscalYear(effectiveDate);

    const entryNumber =
      entry.entryNumber && !entry.entryNumber.startsWith('JV-AUTO')
        ? entry.entryNumber
        : documentSequenceService.getNextNumber(
            'journal_entry',
            fiscalYear,
            journalEntries.map((j) => j.entryNumber)
          );

    const status: DocumentStatus = entry.status || 'posted';

    const { sanitizedEntry } = assertValidJournalEntry(
      {
        ...entry,
        id: newId,
        entryNumber,
        status,
        postedAt: status === 'posted' ? entry.postedAt || nowIso : undefined,
      },
      accounts
    );

    const updatedJournal = [sanitizedEntry, ...journalEntries];
    setJournalEntries(updatedJournal);
    setAccounts((prevAccs) => recalculateAccountBalances(updatedJournal, prevAccs));

    logAuditEvent({
      action: status === 'posted' ? 'post' : 'create',
      entityType: 'journal_entry',
      entityId: sanitizedEntry.id,
      after: sanitizedEntry as unknown as Record<string, unknown>,
      reason: `إنشاء قيد يومية يدوي ${sanitizedEntry.entryNumber} (${sanitizedEntry.narrationAr || ''})`,
      source: 'web_ui',
      metadata: { entryNumber: sanitizedEntry.entryNumber, totalDebit: sanitizedEntry.totalDebit },
    });
  }, [accounts, assertDateNotInClosedPeriod, companySettings, journalEntries, logAuditEvent, recalculateAccountBalances, setAccounts]);

  const deleteJournalEntry = useCallback((id: string) => {
    const target = journalEntries.find((j) => j.id === id);
    if (!target) return;

    assertDateNotInClosedPeriod(target.date, 'قيد يومية');

    if (target.status === 'posted') {
      throw new Error('لا يمكن حذف قيد يومية مُرحّل مباشرة حفاظاً على التسلسل المحاسبي. يرجى استخدام القيد العكسي.');
    }

    const updatedJournal = journalEntries.filter((j) => j.id !== id);
    setJournalEntries(updatedJournal);
    setAccounts((prevAccs) => recalculateAccountBalances(updatedJournal, prevAccs));

    logAuditEvent({
      action: 'delete',
      entityType: 'journal_entry',
      entityId: id,
      before: target as unknown as Record<string, unknown>,
      reason: `حذف مسودة قيد يومية ${target.entryNumber}`,
      source: 'web_ui',
    });
  }, [assertDateNotInClosedPeriod, journalEntries, logAuditEvent, recalculateAccountBalances, setAccounts]);

  const validateJournalEntryCallback = useCallback((entry: Partial<JournalEntry>) => {
    return validateJv(entry, accounts);
  }, [accounts]);

  const contextValue: JournalContextType = value || {
    journalEntries,
    createManualJournalEntry,
    deleteJournalEntry,
    validateJournalEntry: validateJournalEntryCallback,
    setJournalEntries,
  };

  return <JournalContext.Provider value={contextValue}>{children}</JournalContext.Provider>;
};

export const useJournal = (): JournalContextType => {
  const context = useContext(JournalContext);
  if (!context) {
    throw new Error('useJournal must be used within a JournalProvider or AccountingProvider');
  }
  return context;
};
