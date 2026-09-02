import React from 'react';
import { Scale, ChevronLeft } from 'lucide-react';
import { formatSAR } from '../../utils/currency';

interface ProfitabilityCardProps {
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  onNavigateToFinancialStatements: () => void;
}

export const ProfitabilityCard: React.FC<ProfitabilityCardProps> = ({
  grossProfit,
  operatingExpenses,
  netProfit,
  onNavigateToFinancialStatements,
}) => {
  return (
    <div
      onClick={onNavigateToFinancialStatements}
      className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition">
            <Scale className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">قائمة الدخل والربحية</h4>
        </div>
        <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
          <span>مجمل الربح (Gross Profit):</span>
          <span className="font-mono font-bold text-emerald-700">{formatSAR(grossProfit)}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
          <span>المصروفات التشغيلية:</span>
          <span className="font-mono font-bold text-slate-800">{formatSAR(operatingExpenses)}</span>
        </div>
        <div className="flex justify-between py-1 text-slate-600">
          <span>صافي ربح الفترة:</span>
          <span className={`font-mono font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {formatSAR(netProfit)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProfitabilityCard;
