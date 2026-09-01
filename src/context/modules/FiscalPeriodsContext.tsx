import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { FinancialPeriod, FiscalYearClosing, Account, JournalEntry } from '../../types/accounting';
import { getAccountingRepository } from '../../services/dataService';
import { isDateInClosedPeriod, checkDateInFiscalYear } from '../../utils/fiscalPeriodUtils';
import { useCompanySettings } from './CompanyContext';

export interface FiscalPeriodsContextType {
  financialPeriods: FinancialPeriod[];
  fiscalClosings: FiscalYearClosing[];
  closeFinancialPeriod: (periodId: string, closedBy?: string, notes?: string) => Promise<FinancialPeriod>;
  reopenFinancialPeriod: (periodId: string, reason: string, reopenedBy?: string) => Promise<FinancialPeriod>;
  checkDateInFiscalPeriod: (dateStr: string) => { isClosed: boolean; period?: FinancialPeriod };
  checkDateInFiscalYear: (dateStr: string) => { isWithinYear: boolean; warningMessage?: string };
  assertDateNotInClosedPeriod: (dateStr?: string, docName?: string) => void;
  closeFiscalYear: (year: number, closingDate: string, closedBy: string, notes?: string) => Promise<FiscalYearClosing>;
  reopenFiscalYear: (closingId: string) => Promise<void>;
  setFinancialPeriods: React.Dispatch<React.SetStateAction<FinancialPeriod[]>>;
  setFiscalClosings: React.Dispatch<React.SetStateAction<FiscalYearClosing[]>>;
}

export const FiscalPeriodsContext = createContext<FiscalPeriodsContextType | undefined>(undefined);

export const FiscalPeriodsProvider: React.FC<{
  children: React.ReactNode;
  value?: FiscalPeriodsContextType;
}> = ({ children, value }) => {
  const repo = getAccountingRepository();
  const { companySettings, logAuditEvent } = useCompanySettings();

  const [financialPeriods, setFinancialPeriods] = useState<FinancialPeriod[]>(() => repo.loadFinancialPeriods());
  const [fiscalClosings, setFiscalClosings] = useState<FiscalYearClosing[]>(() => repo.loadFiscalClosings());

  useEffect(() => {
    repo.saveFinancialPeriods(financialPeriods);
  }, [financialPeriods]);

  useEffect(() => {
    repo.saveFiscalClosings(fiscalClosings);
  }, [fiscalClosings]);

  useEffect(() => {
    const handleReload = () => {
      setFinancialPeriods(repo.loadFinancialPeriods());
      setFiscalClosings(repo.loadFiscalClosings());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('shadi_flex_data_reloaded', handleReload);
      return () => window.removeEventListener('shadi_flex_data_reloaded', handleReload);
    }
  }, [repo]);

  const checkDateInFiscalPeriod = useCallback((dateStr: string): { isClosed: boolean; period?: FinancialPeriod } => {
    return isDateInClosedPeriod(dateStr, financialPeriods);
  }, [financialPeriods]);

  const checkDateInFiscalYearWrapper = useCallback((dateStr: string): { isWithinYear: boolean; warningMessage?: string } => {
    return checkDateInFiscalYear(
      dateStr,
      companySettings.fiscalYearStart,
      companySettings.fiscalYearEnd,
      companySettings.fiscalYear
    );
  }, [companySettings]);

  const assertDateNotInClosedPeriod = useCallback((dateStr?: string, docName: string = 'المستند') => {
    if (!dateStr) return;
    const { isClosed, period } = isDateInClosedPeriod(dateStr, financialPeriods);
    if (isClosed && period) {
      throw new Error(
        `لا يمكن إنشاء أو تعديل أو حذف أو ترحيل ${docName} بتاريخ (${dateStr.split('T')[0]}) لأنه يقع ضمن فترة مالية مقفلة (${period.nameAr}). يرجى إعادة فتح الفترة أولاً.`
      );
    }
  }, [financialPeriods]);

  const closeFinancialPeriod = useCallback(async (
    periodId: string,
    closedBy: string = 'المدير المالي المعتمد',
    notes?: string
  ): Promise<FinancialPeriod> => {
    const period = financialPeriods.find((p) => p.id === periodId);
    if (!period) throw new Error('الفترة المالية غير موجودة');
    if (period.status === 'closed') throw new Error('الفترة المالية مقفلة بالفعل');

    const nowIso = new Date().toISOString();
    const updatedPeriod: FinancialPeriod = {
      ...period,
      status: 'closed',
      closedAt: nowIso,
      closedBy,
      notes: notes || `تم إقفال الفترة المالية ${period.nameAr} محلياً.`,
    };

    const updatedPeriods = financialPeriods.map((p) => (p.id === periodId ? updatedPeriod : p));
    setFinancialPeriods(updatedPeriods);

    logAuditEvent({
      action: 'period_close',
      entityType: 'fiscal_period',
      entityId: periodId,
      before: period as unknown as Record<string, unknown>,
      after: updatedPeriod as unknown as Record<string, unknown>,
      reason: `إقفال الفترة المالية: ${period.nameAr} (${period.startDate} إلى ${period.endDate})`,
      source: 'web_ui',
      metadata: { periodName: period.nameAr, year: period.year, closedBy },
    });

    return updatedPeriod;
  }, [financialPeriods, logAuditEvent]);

  const reopenFinancialPeriod = useCallback(async (
    periodId: string,
    reason: string,
    reopenedBy: string = 'المدير المالي المعتمد'
  ): Promise<FinancialPeriod> => {
    if (!reason || !reason.trim()) {
      throw new Error('لا يمكن إعادة فتح الفترة المالية دون إدخال سبب واضح ومبرر يسجل في سجل التدقيق (Audit Log).');
    }

    const period = financialPeriods.find((p) => p.id === periodId);
    if (!period) throw new Error('الفترة المالية غير موجودة');
    if (period.status === 'open') throw new Error('الفترة المالية مفتوحة بالفعل');

    const nowIso = new Date().toISOString();
    const updatedPeriod: FinancialPeriod = {
      ...period,
      status: 'open',
      reopenedAt: nowIso,
      reopenedBy,
      reopenReason: reason.trim(),
    };

    const updatedPeriods = financialPeriods.map((p) => (p.id === periodId ? updatedPeriod : p));
    setFinancialPeriods(updatedPeriods);

    logAuditEvent({
      action: 'period_reopen',
      entityType: 'fiscal_period',
      entityId: periodId,
      before: period as unknown as Record<string, unknown>,
      after: updatedPeriod as unknown as Record<string, unknown>,
      reason: `إعادة فتح الفترة المالية ${period.nameAr} - السبب: ${reason.trim()}`,
      source: 'web_ui',
      metadata: { periodName: period.nameAr, year: period.year, reopenedBy, reopenReason: reason.trim() },
    });

    return updatedPeriod;
  }, [financialPeriods, logAuditEvent]);

  const closeFiscalYear = useCallback(async (
    year: number,
    closingDate: string,
    closedBy: string,
    notes?: string
  ): Promise<FiscalYearClosing> => {
    const nowIso = new Date().toISOString();
    const jvId = `jv_close_${year}_${Date.now()}`;
    const jvNumber = `JV-CLOSE-${year}-0001`;

    const closingRecord: FiscalYearClosing = {
      id: `close_${year}`,
      year,
      closingDate,
      totalRevenue: 0,
      totalExpense: 0,
      netProfitOrLoss: 0,
      retainedEarningsAccountId: 'acc_3102',
      journalEntryId: jvId,
      journalEntryNumber: jvNumber,
      closedBy: closedBy || 'المدير المالي المعتمد',
      status: 'closed',
      notes: notes || `تم إقفال السنة المالية ${year} بنجاح`,
      createdAt: nowIso,
    };

    setFiscalClosings((prev) => [closingRecord, ...prev.filter((c) => c.year !== year)]);

    logAuditEvent({
      action: 'period_close',
      entityType: 'fiscal_period',
      entityId: `close_${year}`,
      reason: `إقفال السنة المالية ${year}`,
      source: 'web_ui',
    });

    return closingRecord;
  }, [logAuditEvent]);

  const reopenFiscalYear = useCallback(async (closingId: string) => {
    const closing = fiscalClosings.find((c) => c.id === closingId);
    if (!closing) return;

    setFiscalClosings((prev) => prev.filter((c) => c.id !== closingId));

    logAuditEvent({
      action: 'period_reopen',
      entityType: 'fiscal_period',
      entityId: closingId,
      reason: `إلغاء إقفال السنة المالية ${closing.year}`,
      source: 'web_ui',
    });
  }, [fiscalClosings, logAuditEvent]);

  const contextValue: FiscalPeriodsContextType = value || {
    financialPeriods,
    fiscalClosings,
    closeFinancialPeriod,
    reopenFinancialPeriod,
    checkDateInFiscalPeriod,
    checkDateInFiscalYear: checkDateInFiscalYearWrapper,
    assertDateNotInClosedPeriod,
    closeFiscalYear,
    reopenFiscalYear,
    setFinancialPeriods,
    setFiscalClosings,
  };

  return <FiscalPeriodsContext.Provider value={contextValue}>{children}</FiscalPeriodsContext.Provider>;
};

export const useFiscalPeriods = (): FiscalPeriodsContextType => {
  const context = useContext(FiscalPeriodsContext);
  if (!context) {
    throw new Error('useFiscalPeriods must be used within a FiscalPeriodsProvider or AccountingProvider');
  }
  return context;
};
