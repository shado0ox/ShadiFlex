import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { formatSAR } from '../../utils/currency';
import { MonthlyChartPoint } from './types';

interface SalesPurchasesChartProps {
  data: MonthlyChartPoint[];
}

export const SalesPurchasesChart: React.FC<SalesPurchasesChartProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            مقارنة المبيعات والمشتريات الشهرية
          </h3>
          <p className="text-xs text-slate-500">متابعة نمو المبيعات وتدفق المصروفات بالريال السعودي</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            المبيعات
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            المشتريات
          </span>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                borderRadius: '12px',
                color: '#0f172a',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value: any) => [`${formatSAR(Number(value))}`, '']}
            />
            <Bar dataKey="sales" fill="#10b981" radius={[6, 6, 0, 0]} name="المبيعات" />
            <Bar dataKey="purchases" fill="#3b82f6" radius={[6, 6, 0, 0]} name="المشتريات" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SalesPurchasesChart;
