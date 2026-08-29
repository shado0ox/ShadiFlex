import { FinancialPeriod, JournalEntry } from '../types/accounting';

export const isLeapYear = (year: number): boolean => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};

export const MONTH_NAMES = [
  { num: 1, ar: 'يناير', en: 'January', quarter: 1, endDay: 31 },
  { num: 2, ar: 'فبراير', en: 'February', quarter: 1, endDay: 28 },
  { num: 3, ar: 'مارس', en: 'March', quarter: 1, endDay: 31 },
  { num: 4, ar: 'أبريل', en: 'April', quarter: 2, endDay: 30 },
  { num: 5, ar: 'مايو', en: 'May', quarter: 2, endDay: 31 },
  { num: 6, ar: 'يونيو', en: 'June', quarter: 2, endDay: 30 },
  { num: 7, ar: 'يوليو', en: 'July', quarter: 3, endDay: 31 },
  { num: 8, ar: 'أغسطس', en: 'August', quarter: 3, endDay: 31 },
  { num: 9, ar: 'سبتمبر', en: 'September', quarter: 3, endDay: 30 },
  { num: 10, ar: 'أكتوبر', en: 'October', quarter: 4, endDay: 31 },
  { num: 11, ar: 'نوفمبر', en: 'November', quarter: 4, endDay: 30 },
  { num: 12, ar: 'ديسمبر', en: 'December', quarter: 4, endDay: 31 },
];

/**
 * Generate 12 standard monthly periods for a given fiscal year.
 */
export const generateDefaultFinancialPeriods = (fiscalYear: number): FinancialPeriod[] => {
  return MONTH_NAMES.map((m) => {
    const padNum = m.num.toString().padStart(2, '0');
    const endDay = m.num === 2 && isLeapYear(fiscalYear) ? 29 : m.endDay;
    const padEndDay = endDay.toString().padStart(2, '0');

    return {
      id: `fp_${fiscalYear}_${padNum}`,
      nameAr: `${m.ar} ${fiscalYear}`,
      nameEn: `${m.en} ${fiscalYear}`,
      year: fiscalYear,
      periodNumber: m.num,
      quarter: m.quarter,
      startDate: `${fiscalYear}-${padNum}-01`,
      endDate: `${fiscalYear}-${padNum}-${padEndDay}`,
      status: 'open',
    };
  });
};

/**
 * Find matching financial period for a given ISO date (YYYY-MM-DD).
 */
export const getPeriodForDate = (
  dateStr: string,
  periods: FinancialPeriod[]
): FinancialPeriod | undefined => {
  if (!dateStr) return undefined;
  const cleanDate = dateStr.split('T')[0];
  return periods.find((p) => cleanDate >= p.startDate && cleanDate <= p.endDate);
};

/**
 * Check whether a given date falls inside a closed financial period.
 */
export const isDateInClosedPeriod = (
  dateStr: string,
  periods: FinancialPeriod[]
): { isClosed: boolean; period?: FinancialPeriod } => {
  const period = getPeriodForDate(dateStr, periods);
  if (period && period.status === 'closed') {
    return { isClosed: true, period };
  }
  return { isClosed: false, period };
};

/**
 * Validate if a document date falls within the defined company fiscal year bounds.
 */
export const checkDateInFiscalYear = (
  dateStr: string,
  fiscalYearStart: string,
  fiscalYearEnd: string,
  fiscalYear: number
): { isWithinYear: boolean; warningMessage?: string } => {
  if (!dateStr) return { isWithinYear: true };
  const cleanDate = dateStr.split('T')[0];

  const start = fiscalYearStart || `${fiscalYear}-01-01`;
  const end = fiscalYearEnd || `${fiscalYear}-12-31`;

  if (cleanDate < start || cleanDate > end) {
    return {
      isWithinYear: false,
      warningMessage: `تنبيه: تاريخ المستند (${cleanDate}) يقع خارج نطاق السنة المالية المحددة (${fiscalYear}: من ${start} إلى ${end}).`,
    };
  }

  return { isWithinYear: true };
};

/**
 * Filter journal entries for financial reports.
 * Strictly includes posted and non-reversed journal entries.
 */
export const isReportEligibleJournalEntry = (entry: JournalEntry): boolean => {
  // Must have posted status
  if (entry.status && entry.status !== 'posted') {
    return false;
  }
  // Exclude drafts, cancelled, and explicitly reversed entries
  if (entry.status === 'cancelled' || entry.status === 'draft' || entry.status === 'reversed') {
    return false;
  }
  // Exclude entries that are reversal entries or have been reversed
  if (entry.isReversal || entry.reversalEntryId || entry.reversedEntryId) {
    return false;
  }
  return true;
};
