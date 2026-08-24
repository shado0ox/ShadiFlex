import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { formatSAR } from '../../utils/currency';
import {
  Package,
  Boxes,
  TrendingUp,
  AlertTriangle,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  Percent,
} from 'lucide-react';

interface InventoryMovementViewProps {
  startDate?: string;
  endDate?: string;
  periodLabel: string;
}

export const InventoryMovementView: React.FC<InventoryMovementViewProps> = ({
  startDate,
  endDate,
  periodLabel,
}) => {
  const { inventory, stockMovements, salesInvoices, purchaseInvoices } = useAccounting();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Extract categories
  const categories = Array.from(new Set(inventory.map((i) => i.category || 'عام')));

  // Compute movement metrics for each item in the specified period
  const itemRows = inventory.map((item) => {
    // Filter stock movements for this item within date range
    const itemMovements = stockMovements.filter((m) => {
      if (m.itemId !== item.id) return false;
      if (startDate && m.date < startDate) return false;
      if (endDate && m.date > endDate) return false;
      return true;
    });

    // Inward from purchases or manual positive adjustments
    let inwardQty = 0;
    let outwardQty = 0;
    let adjustmentQty = 0;

    itemMovements.forEach((m) => {
      const q = Number(m.quantity) || 0;
      if (m.type === 'purchase') {
        inwardQty += q;
      } else if (m.type === 'sale') {
        outwardQty += q;
      } else if (m.type === 'adjustment_in') {
        adjustmentQty += q;
      } else if (m.type === 'adjustment_out') {
        adjustmentQty -= q;
      }
    });

    const currentQty = Number(item.currentStock) || 0;
    const costPrice = Number(item.purchasePrice) || 0;
    const sellingPrice = Number(item.salePrice) || 0;
    const minStockLevel = Number(item.minStockAlert) || 0;

    // Opening stock = current quantity minus all movements that occurred in/after period start
    const openingQty = startDate ? Math.max(0, currentQty - (inwardQty + adjustmentQty - outwardQty)) : currentQty;

    const totalCostValue = currentQty * costPrice;
    const totalRetailValue = currentQty * sellingPrice;
    const unrealizedProfit = totalRetailValue - totalCostValue;
    const profitMarginPct = totalRetailValue > 0 ? (unrealizedProfit / totalRetailValue) * 100 : 0;

    let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
    if (currentQty <= 0) {
      stockStatus = 'out_of_stock';
    } else if (currentQty <= minStockLevel) {
      stockStatus = 'low_stock';
    }

    return {
      item,
      openingQty,
      inwardQty,
      outwardQty,
      adjustmentQty,
      currentQty,
      costPrice,
      sellingPrice,
      minStockLevel,
      totalCostValue,
      totalRetailValue,
      unrealizedProfit,
      profitMarginPct,
      stockStatus,
    };
  });

  // Filter
  const filteredItems = itemRows.filter((row) => {
    if (selectedCategory !== 'all' && (row.item.category || 'عام') !== selectedCategory) return false;
    if (selectedStatus !== 'all' && row.stockStatus !== selectedStatus) return false;
    if (
      searchTerm &&
      !row.item.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !row.item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Summary totals
  const totalCostValuation = filteredItems.reduce((s, r) => s + r.totalCostValue, 0);
  const totalRetailValuation = filteredItems.reduce((s, r) => s + r.totalRetailValue, 0);
  const totalUnrealizedProfit = totalRetailValuation - totalCostValuation;
  const overallMarginPct = totalRetailValuation > 0 ? (totalUnrealizedProfit / totalRetailValuation) * 100 : 0;
  const lowStockCount = itemRows.filter((r) => r.stockStatus !== 'in_stock').length;

  return (
    <div className="space-y-6 text-right">
      {/* Bento Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 no-print">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>قيمة المخزون بالتكلفة (Valuation)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-slate-900">
            {formatSAR(totalCostValuation)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            حساب الأستاذ العام (1104)
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>القيمة بسعر البيع (Retail)</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-blue-900">
            {formatSAR(totalRetailValuation)}
          </div>
          <span className="text-[11px] text-blue-700 font-mono mt-1 block">
            هامش ربح تقديري: {overallMarginPct.toFixed(1)}%
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>الربح الكامن المتوقع</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-purple-900">
            {formatSAR(totalUnrealizedProfit)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            فارق البيع عن التكلفة
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>تنبيهات انخفاض المخزون</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-base sm:text-lg font-bold font-mono ${lowStockCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
            {lowStockCount} أصناف
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            أصناف بلغت حد الطلب الأدنى
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-bold ml-1">التصنيف:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="all">كافة التصنيفات</option>
              {categories.map((cat, idx) => (
                <option key={idx} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 mr-2">
            <span className="text-slate-600 font-bold ml-1">حالة المخزون:</span>
            {[
              { id: 'all', label: 'الكل' },
              { id: 'in_stock', label: 'متوفر' },
              { id: 'low_stock', label: 'منخفض (حد الطلب)' },
              { id: 'out_of_stock', label: 'نافد' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-2.5 py-1 rounded-lg border transition ${
                  selectedStatus === st.id
                    ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم الصنف أو SKU..."
            className="w-full bg-white border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3 w-20 text-center">SKU</th>
                <th className="p-3">اسم الصنف / البضاعة</th>
                <th className="p-3 text-center w-16">الوحدة</th>
                <th className="p-3 text-center w-20">رصيد أول المدة</th>
                <th className="p-3 text-center w-20 text-blue-700">وارد (مشتريات)</th>
                <th className="p-3 text-center w-20 text-rose-700">منصرف (مبيعات)</th>
                <th className="p-3 text-center w-24">الرصيد الحالي</th>
                <th className="p-3 text-left w-24">سعر التكلفة</th>
                <th className="p-3 text-left w-24">سعر البيع</th>
                <th className="p-3 text-left w-32">قيمة المخزون (بالتكلفة)</th>
                <th className="p-3 text-center w-24">الحالة</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    لا توجد أصناف مطابقة للتصفية.
                  </td>
                </tr>
              ) : (
                filteredItems.map((row) => (
                  <tr key={row.item.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3 text-center font-mono font-bold text-slate-600">{row.item.sku}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{row.item.nameAr}</div>
                      <div className="text-[10px] text-slate-400">{row.item.category || 'عام'}</div>
                    </td>
                    <td className="p-3 text-center text-slate-600">{row.item.unit}</td>
                    <td className="p-3 text-center font-mono text-slate-600">{row.openingQty}</td>
                    <td className="p-3 text-center font-mono font-medium text-blue-700">+{row.inwardQty}</td>
                    <td className="p-3 text-center font-mono font-medium text-rose-700">-{row.outwardQty}</td>
                    <td className="p-3 text-center font-mono font-bold text-slate-900">
                      {row.currentQty} {row.item.unit}
                    </td>
                    <td className="p-3 text-left font-mono text-slate-700">{formatSAR(row.costPrice)}</td>
                    <td className="p-3 text-left font-mono text-slate-700">{formatSAR(row.sellingPrice)}</td>
                    <td className="p-3 text-left font-mono font-bold text-emerald-800">
                      {formatSAR(row.totalCostValue)}
                    </td>
                    <td className="p-3 text-center">
                      {row.stockStatus === 'out_of_stock' ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          نافد
                        </span>
                      ) : row.stockStatus === 'low_stock' ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          منخفض ({row.minStockLevel})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          متوفر
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Total Valuation Footer */}
            <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
              <tr>
                <td colSpan={9} className="p-3 text-right">
                  إجمالي تقييم المخزون السلعي ({filteredItems.length} صنف)
                </td>
                <td className="p-3 text-left font-mono text-emerald-900 text-sm font-bold">
                  {formatSAR(totalCostValuation)}
                </td>
                <td className="p-3 text-center font-mono text-xs text-slate-500">
                  {totalRetailValuation > 0 ? `البيع: ${formatSAR(totalRetailValuation)}` : ''}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
