import React, { createContext, useContext } from 'react';
import { FinancialPeriod, FiscalYearClosing } from '../../types/accounting';

export interface FiscalPeriodsContextType {
  financialPeriods: FinancialPeriod[];
  fiscalClosings: FiscalYearClosing[];
  closeFinancialPeriod: (periodId: string, closedBy?: string, notes?: string) => Promise<FinancialPeriod>;
  reopenFinancialPeriod: (periodId: string, reason: string, reopenedBy?: string) => Promise<FinancialPeriod>;
  checkDateInFiscalPeriod: (dateStr: string) => { isClosed: boolean; period?: FinancialPeriod };
  checkDateInFiscalYear: (dateStr: string) => { isWithinYear: boolean; warningMessage?: string };
  closeFiscalYear: (year: number, closingDate: string, closedBy: string, notes?: string) => Promise<FiscalYearClosing>;
  reopenFiscalYear: (closingId: string) => Promise<void>;
}

export const FiscalPeriodsContext = createContext<FiscalPeriodsContextType | undefined>(undefined);

export const FiscalPeriodsProvider: React.FC<{
  value: FiscalPeriodsContextType;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return <FiscalPeriodsContext.Provider value={value}>{children}</FiscalPeriodsContext.Provider>;
};

export const useFiscalPeriods = (): FiscalPeriodsContextType => {
  const context = useContext(FiscalPeriodsContext);
  if (!context) {
    throw new Error('useFiscalPeriods must be used within an AccountingProvider / FiscalPeriodsProvider');
  }
  return context;
};
