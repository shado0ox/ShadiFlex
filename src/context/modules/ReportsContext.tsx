import React, { createContext, useContext, useCallback } from 'react';
import {
  Account,
  CashFlowStatement,
  VatReturnReport,
  JournalEntry,
} from '../../types/accounting';
import { useAccounts } from './AccountsContext';
import { useJournal } from './JournalContext';
import { useInvoices } from './InvoicesContext';
import { isReportEligibleJournalEntry } from '../../utils/fiscalPeriodUtils';

export interface AccountStatementResult {
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
}

export interface IncomeStatementResult {
  totalRevenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  netOperatingProfit: number;
  otherIncomeExpense: number;
  netProfit: number;
  revenueBreakdown: Array<{ name: string; amount: number; code: string }>;
  expenseBreakdown: Array<{ name: string; amount: number; code: string }>;
}

export interface BalanceSheetResult {
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
}

export interface TrialBalanceItem {
  account: Account;
  debit: number;
  credit: number;
  netDebit: number;
  netCredit: number;
  openingBalance: number;
  closingBalance: number;
}

export interface ReportsContextType {
  getAccountStatement: (accountId: string, startDate?: string, endDate?: string) => AccountStatementResult;
  getIncomeStatement: (startDate?: string, endDate?: string) => IncomeStatementResult;
  getBalanceSheet: (asOfDate?: string) => BalanceSheetResult;
  getTrialBalance: (startDate?: string, endDate?: string) => TrialBalanceItem[];
  getCashFlowStatement: (startDate?: string, endDate?: string) => CashFlowStatement;
  getVatReturn: (startDate?: string, endDate?: string, period?: string) => VatReturnReport;
}

export const ReportsContext = createContext<ReportsContextType | undefined>(undefined);

export const ReportsProvider: React.FC<{
  children: React.ReactNode;
  value?: ReportsContextType;
}> = ({ children, value }) => {
  const { accounts } = useAccounts();
  const { journalEntries } = useJournal();
  const { salesInvoices, purchaseInvoices, debitCreditNotes, simpleExpenses } = useInvoices();

  const getAccountStatement = useCallback((accountId: string, startDate?: string, endDate?: string): AccountStatementResult => {
    const targetAccount = accounts.find((a) => a.id === accountId);
    let running = 0;

    const lines: Array<{
      date: string;
      entryNumber: string;
      narration: string;
      debit: number;
      credit: number;
      balance: number;
    }> = [];

    let totalDebit = 0;
    let totalCredit = 0;

    const sortedEntries = [...journalEntries]
      .filter(isReportEligibleJournalEntry)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedEntries.forEach((entry) => {
      if (startDate && entry.date < startDate) return;
      if (endDate && entry.date > endDate) return;

      entry.lines.forEach((line) => {
        if (line.accountId === accountId) {
          totalDebit += line.debit;
          totalCredit += line.credit;

          if (targetAccount?.nature === 'debit') {
            running += (line.debit - line.credit);
          } else {
            running += (line.credit - line.debit);
          }

          lines.push({
            date: entry.date,
            entryNumber: entry.entryNumber,
            narration: line.description || entry.narrationAr,
            debit: line.debit,
            credit: line.credit,
            balance: running,
          });
        }
      });
    });

    return {
      account: targetAccount,
      lines,
      totalDebit,
      totalCredit,
      closingBalance: running,
    };
  }, [accounts, journalEntries]);

  const getIncomeStatement = useCallback((startDate?: string, endDate?: string): IncomeStatementResult => {
    let totalRevenue = 0;
    let cogs = 0;
    let operatingExpenses = 0;
    let otherIncomeExpense = 0;

    const revenueBreakdown: Array<{ name: string; amount: number; code: string }> = [];
    const expenseBreakdown: Array<{ name: string; amount: number; code: string }> = [];

    accounts.forEach((acc) => {
      if (acc.type === 'revenue' && acc.isTransactional) {
        const stmt = getAccountStatement(acc.id, startDate, endDate);
        const net = stmt.totalCredit - stmt.totalDebit;
        if (net !== 0) {
          totalRevenue += net;
          revenueBreakdown.push({ name: acc.nameAr, amount: net, code: acc.code });
        }
      } else if (acc.type === 'expense' && acc.isTransactional) {
        const stmt = getAccountStatement(acc.id, startDate, endDate);
        const net = stmt.totalDebit - stmt.totalCredit;
        if (net !== 0) {
          if (acc.code.startsWith('51')) {
            cogs += net;
          } else {
            operatingExpenses += net;
          }
          expenseBreakdown.push({ name: acc.nameAr, amount: net, code: acc.code });
        }
      }
    });

    const grossProfit = totalRevenue - cogs;
    const netOperatingProfit = grossProfit - operatingExpenses;
    const netProfit = netOperatingProfit + otherIncomeExpense;

    return {
      totalRevenue,
      cogs,
      grossProfit,
      operatingExpenses,
      netOperatingProfit,
      otherIncomeExpense,
      netProfit,
      revenueBreakdown,
      expenseBreakdown,
    };
  }, [accounts, getAccountStatement]);

  const getBalanceSheet = useCallback((asOfDate?: string): BalanceSheetResult => {
    let currentAssets = 0;
    let nonCurrentAssets = 0;
    let currentLiabilities = 0;
    let nonCurrentLiabilities = 0;
    let totalEquity = 0;

    const assetAccounts: Account[] = [];
    const liabilityAccounts: Account[] = [];
    const equityAccounts: Account[] = [];

    accounts.forEach((acc) => {
      if (!acc.isTransactional) return;
      const stmt = getAccountStatement(acc.id, undefined, asOfDate);
      const bal = stmt.closingBalance;

      if (acc.type === 'asset') {
        assetAccounts.push({ ...acc, balance: bal });
        if (acc.code.startsWith('11')) {
          currentAssets += bal;
        } else {
          nonCurrentAssets += bal;
        }
      } else if (acc.type === 'liability') {
        liabilityAccounts.push({ ...acc, balance: bal });
        if (acc.code.startsWith('21')) {
          currentLiabilities += bal;
        } else {
          nonCurrentLiabilities += bal;
        }
      } else if (acc.type === 'equity') {
        equityAccounts.push({ ...acc, balance: bal });
        totalEquity += bal;
      }
    });

    const incomeStmt = getIncomeStatement(undefined, asOfDate);
    const retainedEarningsWithCurrentProfit = totalEquity + incomeStmt.netProfit;

    const totalAssets = currentAssets + nonCurrentAssets;
    const totalLiabilities = currentLiabilities + nonCurrentLiabilities;
    const totalLiabilitiesAndEquity = totalLiabilities + retainedEarningsWithCurrentProfit;

    const difference = Math.abs(totalAssets - totalLiabilitiesAndEquity);
    const isBalanced = difference < 0.05;

    return {
      totalAssets,
      currentAssets,
      nonCurrentAssets,
      totalLiabilities,
      currentLiabilities,
      nonCurrentLiabilities,
      totalEquity,
      retainedEarningsWithCurrentProfit,
      isBalanced,
      difference,
      assetAccounts,
      liabilityAccounts,
      equityAccounts,
    };
  }, [accounts, getAccountStatement, getIncomeStatement]);

  const getTrialBalance = useCallback((startDate?: string, endDate?: string): TrialBalanceItem[] => {
    return accounts
      .filter((a) => a.isTransactional)
      .map((acc) => {
        let openingBalance = 0;
        if (startDate) {
          const d = new Date(startDate);
          d.setDate(d.getDate() - 1);
          const dayBefore = d.toISOString().split('T')[0];
          const priorStmt = getAccountStatement(acc.id, undefined, dayBefore);
          openingBalance = priorStmt.closingBalance;
        }

        const stmt = getAccountStatement(acc.id, startDate, endDate);
        const closingBalance = startDate
          ? openingBalance + (acc.nature === 'debit' ? (stmt.totalDebit - stmt.totalCredit) : (stmt.totalCredit - stmt.totalDebit))
          : stmt.closingBalance;

        let netDebit = 0;
        let netCredit = 0;

        if (closingBalance >= 0) {
          if (acc.nature === 'debit') netDebit = closingBalance;
          else netCredit = closingBalance;
        } else {
          if (acc.nature === 'debit') netCredit = Math.abs(closingBalance);
          else netDebit = Math.abs(closingBalance);
        }

        return {
          account: acc,
          debit: stmt.totalDebit,
          credit: stmt.totalCredit,
          netDebit,
          netCredit,
          openingBalance,
          closingBalance,
        };
      });
  }, [accounts, getAccountStatement]);

  const getCashFlowStatement = useCallback((startDate?: string, endDate?: string): CashFlowStatement => {
    const incomeStmt = getIncomeStatement(startDate, endDate);
    const netProfit = incomeStmt.netProfit;

    let depreciation = 0;
    accounts.forEach((acc) => {
      if (acc.code.startsWith('5205') || acc.nameAr.includes('إهلاك') || acc.nameAr.includes('اهتلاك')) {
        const stmt = getAccountStatement(acc.id, startDate, endDate);
        depreciation += Math.max(0, stmt.totalDebit - stmt.totalCredit);
      }
    });

    const getDayBefore = (dateStr: string) => {
      const d = new Date(dateStr);
      d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0];
    };

    const getAccountDelta = (codePrefix: string, nature: 'debit' | 'credit') => {
      let startBal = 0;
      let endBal = 0;
      accounts.filter((a) => a.code.startsWith(codePrefix) && a.isTransactional).forEach((acc) => {
        const startStmt = startDate ? getAccountStatement(acc.id, undefined, getDayBefore(startDate)) : { closingBalance: 0 };
        const endStmt = getAccountStatement(acc.id, undefined, endDate);
        startBal += startStmt.closingBalance;
        endBal += endStmt.closingBalance;
      });
      return { startBal, endBal, delta: endBal - startBal };
    };

    const ar = getAccountDelta('1102', 'debit');
    const receivablesChange = -ar.delta;

    const inv = getAccountDelta('1104', 'debit');
    const inventoryChange = -inv.delta;

    const ap = getAccountDelta('2101', 'credit');
    const payablesChange = ap.delta;

    const vat = getAccountDelta('2102', 'credit');
    const vatLiabilityChange = vat.delta;

    const ocl = getAccountDelta('2103', 'credit');
    const otherCurrentLiabilitiesChange = ocl.delta;

    const totalWorkingCapitalChange =
      receivablesChange + inventoryChange + payablesChange + vatLiabilityChange + otherCurrentLiabilitiesChange;
    const netCashFromOperating = netProfit + depreciation + totalWorkingCapitalChange;

    const operatingDetails = [
      { name: 'صافي الربح للفترة المحاسبية', amount: netProfit, notes: 'من واقع قائمة الدخل الشامل' },
      { name: 'يضاف: مصروفات الإهلاك والإطفاء (غير نقدية)', amount: depreciation, notes: 'إهلاك الأصول الثابتة والمعدات' },
      {
        name: '(الزيادة) / النقص في حسابات المدينين والعملاء',
        amount: receivablesChange,
        code: '1102',
        notes: receivablesChange < 0 ? 'زيادة في الذمم المدينة (استخدام نقد)' : 'تحصيل من الذمم المدينة (توليد نقد)',
      },
      {
        name: '(الزيادة) / النقص في المخزون السلعي',
        amount: inventoryChange,
        code: '1104',
        notes: inventoryChange < 0 ? 'مشتريات مخزون إضافي' : 'انخفاض في بضاعة المخزون',
      },
      {
        name: 'الزيادة / (النقص) في حسابات الدائنين والموردين',
        amount: payablesChange,
        code: '2101',
        notes: payablesChange > 0 ? 'تسهيلات ائتمانية من الموردين' : 'سداد مستحقات الموردين',
      },
      {
        name: 'الزيادة / (النقص) في ضريبة القيمة المضافة ومستحقات ZATCA',
        amount: vatLiabilityChange,
        code: '2102',
        notes: 'أرصدة ضريبة المخرجات والمدخلات المعلقة',
      },
    ];

    let fixedAssetsAdditions = 0;
    let fixedAssetsDisposals = 0;
    const fixedAssets = accounts.filter(
      (a) => a.code.startsWith('12') && !a.nameAr.includes('مجمع') && a.isTransactional
    );
    fixedAssets.forEach((fa) => {
      const delta = getAccountDelta(fa.code, 'debit');
      if (delta.delta > 0) {
        fixedAssetsAdditions += delta.delta;
      } else if (delta.delta < 0) {
        fixedAssetsDisposals += Math.abs(delta.delta);
      }
    });
    const netCashFromInvesting = -fixedAssetsAdditions + fixedAssetsDisposals;

    const investingDetails = [];
    if (fixedAssetsAdditions > 0) {
      investingDetails.push({
        name: 'النقد المدفوع لشراء أصول ثابتة وتجهيزات',
        amount: -fixedAssetsAdditions,
        notes: 'استحواذات رأسمالية وتوسعات',
      });
    }
    if (fixedAssetsDisposals > 0) {
      investingDetails.push({
        name: 'المتحصلات النقدية من استبعاد وبيع أصول ثابتة',
        amount: fixedAssetsDisposals,
        notes: 'تدفق نقدي استثماري داخل',
      });
    }
    if (investingDetails.length === 0) {
      investingDetails.push({
        name: 'شراء وبيع أصول وممتلكات رأسمالية',
        amount: 0,
        notes: 'لا توجد حركات استثمارية رأسمالية خلال الفترة',
      });
    }

    const capDelta = getAccountDelta('3101', 'credit');
    const capitalAdditions = Math.max(0, capDelta.delta);

    const drawDelta = getAccountDelta('3103', 'debit');
    const drawingsAndDividends = Math.max(0, drawDelta.delta);

    const loanDelta = getAccountDelta('2201', 'credit');
    const loansChange = loanDelta.delta;

    const netCashFromFinancing = capitalAdditions - drawingsAndDividends + loansChange;

    const financingDetails = [];
    if (capitalAdditions > 0) {
      financingDetails.push({
        name: 'الزيادة في رأس المال وضخ مساهمات الشركاء',
        amount: capitalAdditions,
        code: '3101',
      });
    }
    if (drawingsAndDividends > 0) {
      financingDetails.push({
        name: 'المسحوبات النقدية وتوزيعات أرباح الشركاء',
        amount: -drawingsAndDividends,
        code: '3103',
      });
    }
    if (loansChange !== 0) {
      financingDetails.push({
        name: 'صافي التغير في القروض والتسهيلات البنكية طويلة الأجل',
        amount: loansChange,
        code: '2201',
      });
    }
    if (financingDetails.length === 0) {
      financingDetails.push({
        name: 'الأنشطة التمويلية ورأس المال',
        amount: 0,
        notes: 'لا توجد مسحوبات أو تمويلات إضافية خلال الفترة',
      });
    }

    const cashAccounts = accounts.filter((a) => a.code.startsWith('1101') && a.isTransactional);
    let beginningCash = 0;
    let endingCash = 0;
    const cashAccountsBreakdown: Array<{ name: string; code: string; balance: number }> = [];

    cashAccounts.forEach((acc) => {
      const startStmt = startDate
        ? getAccountStatement(acc.id, undefined, getDayBefore(startDate))
        : { closingBalance: 0 };
      const endStmt = getAccountStatement(acc.id, undefined, endDate);
      beginningCash += startStmt.closingBalance;
      endingCash += endStmt.closingBalance;
      cashAccountsBreakdown.push({ name: acc.nameAr, code: acc.code, balance: endStmt.closingBalance });
    });

    const netCashChange = endingCash - beginningCash;

    return {
      period: {
        startDate,
        endDate,
        label: startDate && endDate ? `من ${startDate} إلى ${endDate}` : 'كامل الفترة المالية',
      },
      operatingActivities: {
        netProfit,
        depreciation,
        workingCapitalChanges: {
          receivablesChange,
          inventoryChange,
          payablesChange,
          vatLiabilityChange,
          otherCurrentLiabilitiesChange,
          totalWorkingCapitalChange,
        },
        netCashFromOperating,
        details: operatingDetails,
      },
      investingActivities: {
        fixedAssetsAdditions,
        fixedAssetsDisposals,
        netCashFromInvesting,
        details: investingDetails,
      },
      financingActivities: {
        capitalAdditions,
        drawingsAndDividends,
        loansChange,
        netCashFromFinancing,
        details: financingDetails,
      },
      summary: {
        beginningCash,
        netCashChange,
        endingCash,
        cashAccountsBreakdown,
      },
    };
  }, [accounts, getAccountStatement, getIncomeStatement]);

  const getVatReturn = useCallback((startDate?: string, endDate?: string, period = 'الربع الحالي 2026'): VatReturnReport => {
    let standardRatedSales = 0;
    let standardRatedSalesVat = 0;
    let zeroRatedSales = 0;
    let exemptSales = 0;

    salesInvoices.forEach((inv) => {
      if (inv.status !== 'posted') return;
      if (startDate && inv.issueDate < startDate) return;
      if (endDate && inv.issueDate > endDate) return;

      inv.items.forEach((item) => {
        if (item.vatRate === 0.15) {
          standardRatedSales += item.subtotal;
          standardRatedSalesVat += item.vatAmount;
        } else if (item.vatRate === 0) {
          zeroRatedSales += item.subtotal;
        } else {
          exemptSales += item.subtotal;
        }
      });
    });

    let standardRatedPurchases = 0;
    let standardRatedPurchasesVat = 0;
    let zeroRatedPurchases = 0;
    let exemptPurchases = 0;

    purchaseInvoices.forEach((pur) => {
      if (pur.status !== 'posted') return;
      if (startDate && pur.issueDate < startDate) return;
      if (endDate && pur.issueDate > endDate) return;

      pur.items.forEach((item) => {
        if (item.vatRate === 0.15) {
          standardRatedPurchases += item.subtotal;
          standardRatedPurchasesVat += item.vatAmount;
        } else if (item.vatRate === 0) {
          zeroRatedPurchases += item.subtotal;
        } else {
          exemptPurchases += item.subtotal;
        }
      });
    });

    simpleExpenses.forEach((exp) => {
      if (exp.status !== 'posted') return;
      if (startDate && exp.date < startDate) return;
      if (endDate && exp.date > endDate) return;

      if (exp.vatAmount > 0) {
        standardRatedPurchases += exp.amountBeforeVat;
        standardRatedPurchasesVat += exp.vatAmount;
      } else {
        exemptPurchases += exp.amountBeforeVat;
      }
    });

    debitCreditNotes.forEach((note) => {
      if (note.status !== 'posted') return;
      if (startDate && note.issueDate < startDate) return;
      if (endDate && note.issueDate > endDate) return;

      if (note.type === 'credit_note' && note.partyType === 'customer') {
        standardRatedSales = Math.max(0, standardRatedSales - note.taxableAmount);
        standardRatedSalesVat = Math.max(0, standardRatedSalesVat - note.vatTotal);
      } else if (note.type === 'debit_note' && note.partyType === 'supplier') {
        standardRatedPurchases = Math.max(0, standardRatedPurchases - note.taxableAmount);
        standardRatedPurchasesVat = Math.max(0, standardRatedPurchasesVat - note.vatTotal);
      } else if (note.type === 'debit_note' && note.partyType === 'customer') {
        standardRatedSales += note.taxableAmount;
        standardRatedSalesVat += note.vatTotal;
      }
    });

    const totalSales = standardRatedSales + zeroRatedSales + exemptSales;
    const totalSalesVat = standardRatedSalesVat;

    const totalPurchases = standardRatedPurchases + zeroRatedPurchases + exemptPurchases;
    const totalPurchasesVat = standardRatedPurchasesVat;

    const netVatPayableOrRefundable = totalSalesVat - totalPurchasesVat;

    return {
      period,
      year: 2026,
      quarterOrMonth: period,
      standardRatedSales,
      standardRatedSalesVat,
      zeroRatedSales,
      exemptSales,
      totalSales,
      totalSalesVat,
      standardRatedPurchases,
      standardRatedPurchasesVat,
      zeroRatedPurchases,
      exemptPurchases,
      totalPurchases,
      totalPurchasesVat,
      netVatPayableOrRefundable,
    };
  }, [salesInvoices, purchaseInvoices, simpleExpenses, debitCreditNotes]);

  const contextValue: ReportsContextType = value || {
    getAccountStatement,
    getIncomeStatement,
    getBalanceSheet,
    getTrialBalance,
    getCashFlowStatement,
    getVatReturn,
  };

  return <ReportsContext.Provider value={contextValue}>{children}</ReportsContext.Provider>;
};

export const useReports = (): ReportsContextType => {
  const context = useContext(ReportsContext);
  if (!context) {
    throw new Error('useReports must be used within a ReportsProvider or AccountingProvider');
  }
  return context;
};
