import React, { useState, useEffect } from 'react';
import { Calendar, Filter, Clock, ChevronDown, Check } from 'lucide-react';
import { ReportPeriodType } from '../../types/accounting';

export interface PeriodFilterState {
  type: ReportPeriodType;
  year: number;
  month: number; // 1 to 12
  quarter: number; // 1 to 4
  startDate: string;
  endDate: string;
  label: string;
}

interface PeriodFilterToolbarProps {
  onPeriodChange: (filter: PeriodFilterState) => void;
  initialFilter?: Partial<PeriodFilterState>;
}

const MONTH_NAMES = [
  'يناير (1)',
  'فبراير (2)',
  'مارس (3)',
  'أبريل (4)',
  'مايو (5)',
  'يونيو (6)',
  'يوليو (7)',
  'أغسطس (8)',
  'سبتمبر (9)',
  'أكتوبر (10)',
  'نوفمبر (11)',
  'ديسمبر (12)',
];

const QUARTERS = [
  { id: 1, label: 'الربع الأول Q1 (يناير - مارس)', startMonth: 1, endMonth: 3 },
  { id: 2, label: 'الربع الثاني Q2 (أبريل - يونيو)', startMonth: 4, endMonth: 6 },
  { id: 3, label: 'الربع الثالث Q3 (يوليو - سبتمبر)', startMonth: 7, endMonth: 9 },
  { id: 4, label: 'الربع الرابع Q4 (أكتوبر - ديسمبر)', startMonth: 10, endMonth: 12 },
];

export const PeriodFilterToolbar: React.FC<PeriodFilterToolbarProps> = ({
  onPeriodChange,
  initialFilter,
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);

  const [periodType, setPeriodType] = useState<ReportPeriodType>(initialFilter?.type || 'quarterly');
  const [selectedYear, setSelectedYear] = useState<number>(initialFilter?.year || 2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialFilter?.month || currentMonth);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(initialFilter?.quarter || 3);
  const [customStartDate, setCustomStartDate] = useState<string>(initialFilter?.startDate || '2026-01-01');
  const [customEndDate, setCustomEndDate] = useState<string>(initialFilter?.endDate || '2026-12-31');

  // Compute startDate, endDate, label whenever state changes
  useEffect(() => {
    let start = '';
    let end = '';
    let label = '';

    if (periodType === 'monthly') {
      const monthStr = String(selectedMonth).padStart(2, '0');
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      start = `${selectedYear}-${monthStr}-01`;
      end = `${selectedYear}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
      label = `شهر ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;
    } else if (periodType === 'quarterly') {
      const q = QUARTERS.find((item) => item.id === selectedQuarter) || QUARTERS[2];
      const startMonthStr = String(q.startMonth).padStart(2, '0');
      const endMonthStr = String(q.endMonth).padStart(2, '0');
      const lastDay = new Date(selectedYear, q.endMonth, 0).getDate();
      start = `${selectedYear}-${startMonthStr}-01`;
      end = `${selectedYear}-${endMonthStr}-${String(lastDay).padStart(2, '0')}`;
      label = `الربع ${selectedQuarter} (${q.startMonth === 1 ? 'يناير - مارس' : q.startMonth === 4 ? 'أبريل - يونيو' : q.startMonth === 7 ? 'يوليو - سبتمبر' : 'أكتوبر - ديسمبر'}) ${selectedYear}`;
    } else if (periodType === 'annual') {
      start = `${selectedYear}-01-01`;
      end = `${selectedYear}-12-31`;
      label = `السنة المالية ${selectedYear}`;
    } else {
      start = customStartDate;
      end = customEndDate;
      label = customStartDate && customEndDate ? `من ${customStartDate} إلى ${customEndDate}` : 'فترة مخصصة';
    }

    onPeriodChange({
      type: periodType,
      year: selectedYear,
      month: selectedMonth,
      quarter: selectedQuarter,
      startDate: start,
      endDate: end,
      label,
    });
  }, [periodType, selectedYear, selectedMonth, selectedQuarter, customStartDate, customEndDate]);

  const handleQuickPreset = (preset: 'this_month' | 'this_quarter' | 'this_year' | 'all_time') => {
    if (preset === 'this_month') {
      setPeriodType('monthly');
      setSelectedYear(2026);
      setSelectedMonth(8); // August 2026
    } else if (preset === 'this_quarter') {
      setPeriodType('quarterly');
      setSelectedYear(2026);
      setSelectedQuarter(3); // Q3 2026
    } else if (preset === 'this_year') {
      setPeriodType('annual');
      setSelectedYear(2026);
    } else if (preset === 'all_time') {
      setPeriodType('custom');
      setCustomStartDate('2025-01-01');
      setCustomEndDate('2026-12-31');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 text-right no-print">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Period Mode Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 ml-2">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span>نطاق الفترة:</span>
          </div>

          {[
            { id: 'quarterly', label: 'ربع سنوي (Q)' },
            { id: 'monthly', label: 'شهري' },
            { id: 'annual', label: 'سنوي (كامل العام)' },
            { id: 'custom', label: 'تاريخ مخصص' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setPeriodType(mode.id as ReportPeriodType)}
              className={`px-3 py-1.5 text-xs rounded-xl font-medium transition ${
                periodType === mode.id
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 text-[11px] ml-1">اختيار سريع:</span>
          <button
            onClick={() => handleQuickPreset('this_month')}
            className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition text-[11px]"
          >
            هذا الشهر
          </button>
          <button
            onClick={() => handleQuickPreset('this_quarter')}
            className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition text-[11px]"
          >
            الربع الحالي (Q3 2026)
          </button>
          <button
            onClick={() => handleQuickPreset('this_year')}
            className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition text-[11px]"
          >
            السنة الحالية 2026
          </button>
          <button
            onClick={() => handleQuickPreset('all_time')}
            className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition text-[11px]"
          >
            كل الفترات
          </button>
        </div>
      </div>

      {/* Dynamic Pickers based on Period Mode */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
        {/* Year Select (Common for monthly, quarterly, annual) */}
        {periodType !== 'custom' && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">السنة المالية:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value={2027}>2027 م</option>
              <option value={2026}>2026 م</option>
              <option value={2025}>2025 م</option>
              <option value={2024}>2024 م</option>
            </select>
          </div>
        )}

        {/* Monthly picker */}
        {periodType === 'monthly' && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">الشهر:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quarterly picker */}
        {periodType === 'quarterly' && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">الربع السنوي:</span>
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              {QUARTERS.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Custom Range picker */}
        {periodType === 'custom' && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">من تاريخ:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">إلى تاريخ:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Active Range Summary Badge */}
        <div className="mr-auto flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl text-xs">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            الفترة المحددة:{' '}
            <strong className="font-mono text-emerald-900">
              {periodType === 'monthly'
                ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
                : periodType === 'quarterly'
                ? `Q${selectedQuarter} ${selectedYear}`
                : periodType === 'annual'
                ? `كامل ${selectedYear}`
                : `${customStartDate} ➔ ${customEndDate}`}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};
