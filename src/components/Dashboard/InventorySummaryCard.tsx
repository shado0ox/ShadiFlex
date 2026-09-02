import React from 'react';
import { Package } from 'lucide-react';
import { formatSAR } from '../../utils/currency';

interface InventorySummaryCardProps {
  inventoryValuation: number;
  totalItemsCount: number;
  lowStockCount: number;
  onNavigateToInventory: () => void;
}

export const InventorySummaryCard: React.FC<InventorySummaryCardProps> = ({
  inventoryValuation,
  totalItemsCount,
  lowStockCount,
  onNavigateToInventory,
}) => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
            <Package className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">المخزون والمنتجات</h4>
        </div>
        <button
          onClick={onNavigateToInventory}
          className="text-xs text-teal-700 font-bold hover:underline"
        >
          عرض الكل
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
          <span>إجمالي قيمة المخزون بالتكلفة:</span>
          <span className="font-mono font-bold text-slate-900">{formatSAR(inventoryValuation)}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
          <span>عدد الأصناف المعرفة:</span>
          <span className="font-bold text-slate-900">{totalItemsCount} صنف</span>
        </div>
        <div className="flex justify-between py-1 text-slate-600">
          <span>أصناف دون حد الأمان:</span>
          <span className={`font-bold ${lowStockCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {lowStockCount} أصناف
          </span>
        </div>
      </div>
    </div>
  );
};

export default InventorySummaryCard;
