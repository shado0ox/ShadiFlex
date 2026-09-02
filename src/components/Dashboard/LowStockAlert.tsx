import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { InventoryItem } from '../../types/accounting';

interface LowStockAlertProps {
  lowStockItems: InventoryItem[];
  onNavigateToInventory: () => void;
}

export const LowStockAlert: React.FC<LowStockAlertProps> = ({
  lowStockItems,
  onNavigateToInventory,
}) => {
  if (lowStockItems.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-xs sm:text-sm text-amber-900">
            تنبيه مخزون: هناك {lowStockItems.length} صنف وصل إلى حد إعادة الطلب أو أقل!
          </h4>
          <p className="text-xs text-amber-700">
            يرجى مراجعة إدارة المخزون وإصدار فواتير مشتريات لتفادي نفاد الكميات.
          </p>
        </div>
      </div>
      <button
        onClick={onNavigateToInventory}
        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition shadow-xs self-end sm:self-auto"
      >
        عرض أصناف المخزون
      </button>
    </div>
  );
};

export default LowStockAlert;
