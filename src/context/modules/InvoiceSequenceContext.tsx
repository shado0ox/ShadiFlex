import React, { createContext, useContext, useCallback } from 'react';
import { documentSequenceService, DocumentSequenceType } from '../../services/documentSequenceService';
import { useCompanySettings } from './CompanyContext';

export interface InvoiceSequenceContextType {
  getDocFiscalYear: (dateStr?: string) => number;
  getNextDocumentNumber: (type: DocumentSequenceType, fiscalYear: number, existingNumbers: string[]) => string;
  getNextNumberForDate: (type: DocumentSequenceType, dateStr?: string, existingNumbers?: string[]) => string;
}

export const InvoiceSequenceContext = createContext<InvoiceSequenceContextType | undefined>(undefined);

export const InvoiceSequenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { companySettings } = useCompanySettings();

  const getDocFiscalYear = useCallback((dateStr?: string): number => {
    if (dateStr) {
      const parsed = parseInt(dateStr.split('-')[0], 10);
      if (!isNaN(parsed) && parsed > 2000) return parsed;
    }
    return companySettings.fiscalYear || new Date().getFullYear();
  }, [companySettings.fiscalYear]);

  const getNextDocumentNumber = useCallback((
    type: DocumentSequenceType,
    fiscalYear: number,
    existingNumbers: string[]
  ): string => {
    return documentSequenceService.getNextNumber(type, fiscalYear, existingNumbers);
  }, []);

  const getNextNumberForDate = useCallback((
    type: DocumentSequenceType,
    dateStr?: string,
    existingNumbers: string[] = []
  ): string => {
    const fiscalYear = getDocFiscalYear(dateStr);
    return documentSequenceService.getNextNumber(type, fiscalYear, existingNumbers);
  }, [getDocFiscalYear]);

  return (
    <InvoiceSequenceContext.Provider
      value={{
        getDocFiscalYear,
        getNextDocumentNumber,
        getNextNumberForDate,
      }}
    >
      {children}
    </InvoiceSequenceContext.Provider>
  );
};

export const useInvoiceSequence = (): InvoiceSequenceContextType => {
  const context = useContext(InvoiceSequenceContext);
  if (!context) {
    throw new Error('useInvoiceSequence must be used within an InvoiceSequenceProvider or AccountingProvider');
  }
  return context;
};
