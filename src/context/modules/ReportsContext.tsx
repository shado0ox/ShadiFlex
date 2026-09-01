import React, { createContext, useContext } from 'react';
import { Account, VatReturnReport, CashFlowStatement } from '../../types/accounting';

export interface ReportsContextType {
  getAccountStatement: (accountId: string, startDate?: string, endDate?: string) => {
    account: Account | undefined;
    lines: Array<{
      date: string;
      entryNumber: string;
      narration: string;
      debit: number;
      credit: number;
      balance: number;
    }>;
    totalDebit: number;
    totalCredit: number;
    closingBalance: number;
  };
  getIncomeStatement: (startDate?: string, endDate?: string) => {
    totalRevenue: number;
    cogs: number;
    grossProfit: number;
    operatingExpenses: number;
    netOperatingProfit: number;
    otherIncomeExpense: number;
    netProfit: number;
    revenueBreakdown: Array<{ name: string; amount: number; code: string }>;
    expenseBreakdown: Array<{ name: string; amount: number; code: string }>;
  };
  getBalanceSheet: (asOfDate?: string) => {
    totalAssets: number;
    currentAssets: number;
    nonCurrentAssets: number;
    totalLiabilities: number;
    currentLiabilities: number;
    nonCurrentLiabilities: number;
    totalEquity: number;
    retainedEarningsWithCurrentProfit: number;
    isBalanced: boolean;
    difference: number;
    assetAccounts: Account[];
    liabilityAccounts: Account[];
    equityAccounts: Account[];
  };
  getTrialBalance: (startDate?: string, endDate?: string) => Array<{
    account: Account;
    debit: number;
    credit: number;
    netDebit: number;
    netCredit: number;
    openingBalance: number;
    closingBalance: number;
  }>;
  getCashFlowStatement: (startDate?: string, endDate?: string) => CashFlowStatement;
  getVatReturn: (startDate?: string, endDate?: string, period?: string) => VatReturnReport;
}

export const ReportsContext = createContext<ReportsContextType | undefined>(undefined);

export const ReportsProvider: React.FC<{
  value: ReportsContextType;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
};

export const useReports = (): ReportsContextType => {
  const context = useContext(ReportsContext);
  if (!context) {
    throw new Error('useReports must be used within an AccountingProvider / ReportsProvider');
  }
  return context;
};
