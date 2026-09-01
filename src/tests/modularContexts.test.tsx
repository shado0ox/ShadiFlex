import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import {
  AccountingProvider,
  useAccounting,
  useAccounts,
  useJournal,
  useInvoices,
  useInventory,
  useCustomersSuppliers,
  useParties,
  usePOS,
  useFiscalPeriods,
  useCompanySettings,
  useReports,
} from '../context/AccountingContext';

describe('Modular Contexts and Sub-Hooks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AccountingProvider>{children}</AccountingProvider>
  );

  it('provides useAccounts hook correctly', () => {
    const { result } = renderHook(() => useAccounts(), { wrapper });
    expect(result.current.accounts).toBeDefined();
    expect(Array.isArray(result.current.accounts)).toBe(true);
    expect(typeof result.current.addAccount).toBe('function');
    expect(typeof result.current.updateAccount).toBe('function');
    expect(typeof result.current.deleteAccount).toBe('function');
  });

  it('provides useJournal hook correctly', () => {
    const { result } = renderHook(() => useJournal(), { wrapper });
    expect(result.current.journalEntries).toBeDefined();
    expect(Array.isArray(result.current.journalEntries)).toBe(true);
    expect(typeof result.current.createManualJournalEntry).toBe('function');
    expect(typeof result.current.validateJournalEntry).toBe('function');
  });

  it('provides useInvoices hook correctly', () => {
    const { result } = renderHook(() => useInvoices(), { wrapper });
    expect(result.current.salesInvoices).toBeDefined();
    expect(result.current.purchaseInvoices).toBeDefined();
    expect(typeof result.current.createSalesInvoice).toBe('function');
    expect(typeof result.current.reversePostedDocument).toBe('function');
  });

  it('provides useInventory hook correctly', () => {
    const { result } = renderHook(() => useInventory(), { wrapper });
    expect(result.current.inventory).toBeDefined();
    expect(result.current.stockMovements).toBeDefined();
    expect(typeof result.current.addInventoryItem).toBe('function');
    expect(typeof result.current.validateSaleInventory).toBe('function');
  });

  it('provides useCustomersSuppliers and useParties hook correctly', () => {
    const { result: csResult } = renderHook(() => useCustomersSuppliers(), { wrapper });
    const { result: partiesResult } = renderHook(() => useParties(), { wrapper });
    expect(csResult.current.customers).toBeDefined();
    expect(csResult.current.suppliers).toBeDefined();
    expect(partiesResult.current.customers).toBeDefined();
    expect(partiesResult.current.suppliers).toBeDefined();
    expect(typeof csResult.current.addCustomer).toBe('function');
    expect(typeof csResult.current.addSupplier).toBe('function');
  });

  it('provides usePOS hook correctly', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });
    expect(result.current.branches).toBeDefined();
    expect(result.current.cashRegisters).toBeDefined();
    expect(typeof result.current.addBranch).toBe('function');
    expect(typeof result.current.startCashierShift).toBe('function');
    expect(typeof result.current.processPosSale).toBe('function');
  });

  it('provides useFiscalPeriods hook correctly', () => {
    const { result } = renderHook(() => useFiscalPeriods(), { wrapper });
    expect(result.current.financialPeriods).toBeDefined();
    expect(typeof result.current.closeFinancialPeriod).toBe('function');
    expect(typeof result.current.reopenFinancialPeriod).toBe('function');
    expect(typeof result.current.checkDateInFiscalPeriod).toBe('function');
  });

  it('provides useCompanySettings hook correctly', () => {
    const { result } = renderHook(() => useCompanySettings(), { wrapper });
    expect(result.current.companySettings).toBeDefined();
    expect(result.current.auditLogs).toBeDefined();
    expect(typeof result.current.updateCompanySettings).toBe('function');
    expect(typeof result.current.exportDataJson).toBe('function');
    expect(typeof result.current.validateBackupJson).toBe('function');
  });

  it('provides useReports hook correctly', () => {
    const { result } = renderHook(() => useReports(), { wrapper });
    expect(typeof result.current.getIncomeStatement).toBe('function');
    expect(typeof result.current.getBalanceSheet).toBe('function');
    expect(typeof result.current.getTrialBalance).toBe('function');
    expect(typeof result.current.getCashFlowStatement).toBe('function');
    expect(typeof result.current.getVatReturn).toBe('function');

    const incomeStatement = result.current.getIncomeStatement();
    expect(incomeStatement).toBeDefined();
    expect(typeof incomeStatement.totalRevenue).toBe('number');
  });

  it('maintains unified useAccounting compatibility', () => {
    const { result } = renderHook(() => useAccounting(), { wrapper });
    expect(result.current.accounts).toBeDefined();
    expect(result.current.salesInvoices).toBeDefined();
    expect(result.current.inventory).toBeDefined();
    expect(result.current.companySettings).toBeDefined();
  });
});
