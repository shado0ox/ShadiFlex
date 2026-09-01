import React, { createContext, useContext } from 'react';
import { JournalEntry, JournalEntryLine } from '../../types/accounting';
import { JournalValidationResult } from '../../services/journalValidationService';

export interface JournalContextType {
  journalEntries: JournalEntry[];
  createManualJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void;
  deleteJournalEntry: (id: string) => void;
  validateJournalEntry: (entry: Partial<JournalEntry> & { lines?: Partial<JournalEntryLine>[] }) => JournalValidationResult;
}

export const JournalContext = createContext<JournalContextType | undefined>(undefined);

export const JournalProvider: React.FC<{
  value: JournalContextType;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return <JournalContext.Provider value={value}>{children}</JournalContext.Provider>;
};

export const useJournal = (): JournalContextType => {
  const context = useContext(JournalContext);
  if (!context) {
    throw new Error('useJournal must be used within an AccountingProvider / JournalProvider');
  }
  return context;
};
