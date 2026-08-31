import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { useToast } from '../../context/ToastContext';
import { InventoryItem, DependencyCheckResult } from '../../types/accounting';
import { formatSAR } from '../../utils/currency';
import { DependencyCheckModal } from '../Common/DependencyCheckModal';
import { EmptyState } from '../Common/EmptyState';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Layers,
  TrendingUp,
  Sliders,
  History,
  X,
  CheckCircle2,
  Trash2,
  Edit2,
  Power,
} from 'lucide-react';

export const InventoryManager: React.FC<{ onOpenNewItemModal?: () => void }> = () => {
  const {
    inventory,
    stockMovements,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    toggleInventoryItemStatus,
    checkInventoryItemDependencies,
    adjustInventoryStock,
    checkDirectStockEditAllowed,
  } = useAccounting();
  const { toast, confirmModal } = useToast();

  const [activeTab, setActiveTab] = useState<'items' | 'movements'>('items');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State for Add / Edit
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Dependency Modal State
  const [depModalOpen, setDepModalOpen] = useState(false);
  const [depTargetItem, setDepTargetItem] = useState<InventoryItem | null>(null);
  const [depCheckResult, setDepCheckResult] = useState<DependencyCheckResult | null>(null);

  // Form State
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [category, setCategory] = useState('عام');
  const [unit, setUnit] = useState('قطعة');
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [currentStock, setCurrentStock] = useState(0);
  const [minStockAlert, setMinStockAlert] = useState(5);

  // Stock Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustTargetItem, setAdjustTargetItem] = useState<InventoryItem | null>(null);
  const [newStockVal, setNewStockVal] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('جرد دوري للمستودع');

  const categories = Array.from(new Set(inventory.map((i) => i.category)));

  const filteredItems = inventory.filter((item) => {
    const matchesSearch =
      item.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.barcode && item.barcode.includes(searchTerm));

    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;

    if (!matchesSearch || !matchesCat) return false;
    if (statusFilter === 'active') return item.isActive !== false;
    if (statusFilter === 'inactive') return item.isActive === false;

    return true;
  });

  const totalValuationCost = inventory.reduce((sum, i) => sum + i.currentStock * i.purchasePrice, 0);
  const totalValuationSale = inventory.reduce((sum, i) => sum + i.currentStock * i.salePrice, 0);
  const lowStockCount = inventory.filter((i) => i.currentStock <= i.minStockAlert).length;

  const handleOpenAdd = () => {
    setEditingItem(null);
    setSku(`SKU-${Date.now().toString().slice(-4)}`);
    setBarcode(`628${Math.floor(100000000 + Math.random() * 900000000)}`);
    setNameAr('');
    setNameEn('');
    setCategory('منتجات');
    setUnit('قطعة');
    setPurchasePrice(100);
    setSalePrice(150);
    setCurrentStock(10);
    setMinStockAlert(5);
    setItemModalOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setSku(item.sku);
    setBarcode(item.barcode || '');
    setNameAr(item.nameAr);
    setNameEn(item.nameEn || '');
    setCategory(item.category);
    setUnit(item.unit);
    setPurchasePrice(item.purchasePrice);
    setSalePrice(item.salePrice);
    setCurrentStock(item.currentStock);
    setMinStockAlert(item.minStockAlert);
    setItemModalOpen(true);
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    const check = checkInventoryItemDependencies(item.id);
    if (!check.canDelete) {
      setDepTargetItem(item);
      setDepCheckResult(check);
      setDepModalOpen(true);
      return;
    }

    const ok = await confirmModal({
      title: 'حذف صنف من المخزون',
      message: `هل أنت متأكد من حذف الصنف (${item.nameAr}) نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.`,
      severity: 'danger',
      confirmLabel: 'حذف الصنف',
    });

    if (ok) {
      deleteInventoryItem(item.id);
      toast.success(`تم حذف الصنف "${item.nameAr}" بنجاح`);
    }
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) {
      toast.error('يرجى إدخال اسم الصنف بالعربية');
      return;
    }

    try {
      if (editingItem) {
        updateInventoryItem(editingItem.id, {
          sku,
          barcode,
          nameAr,
          nameEn,
          category,
          unit,
          purchasePrice,
          salePrice,
          currentStock,
          minStockAlert,
        });
        toast.success(`تم تحديث بيانات الصنف "${nameAr}" بنجاح`);
      } else {
        addInventoryItem({
          sku,
          barcode,
          nameAr,
          nameEn,
          category,
          unit,
          purchasePrice,
          salePrice,
          currentStock,
          minStockAlert,
          vatRate: 0.15,
        });
        toast.success(`تمت إضافة الصنف "${nameAr}" إلى المستودع بنجاح`);
      }
      setItemModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'حدث خطأ أثناء حفظ الصنف');
    }
  };

  const handleOpenAdjust = (item: InventoryItem) => {
    setAdjustTargetItem(item);
    setNewStockVal(item.currentStock);
    setAdjustReason('تسوية جردية دورية');
    setAdjustModalOpen(true);
  };

  const handleConfirmAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetItem) return;
    try {
      adjustInventoryStock(adjustTargetItem.id, newStockVal, adjustReason);
      toast.success(`تم تعديل رصيد المخزون للصنف "${adjustTargetItem.nameAr}" إلى ${newStockVal} ${adjustTargetItem.unit}`);
      setAdjustModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'حدث خطأ أثناء تسوية المخزون');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">إدارة المخزون والمستودعات</h2>
            <span className="bg-amber-50 text-amber-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-amber-200">
              {inventory.length} صنف
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            متابعة أرصدة الأصناف، أسعار التكلفة والبيع، حدود إعادة الطلب وسجل الحركات المخزنية
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition shadow-xs active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ إضافة صنف جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <span className="text-xs text-slate-500 font-medium">قيمة المخزون بسعر التكلفة</span>
          <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1">{formatSAR(totalValuationCost)}</div>
          <span className="text-[11px] text-slate-400">أساس تقييم الميزانية العمومية</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <span className="text-xs text-slate-500 font-medium">القيمة المتوقعة بسعر البيع</span>
          <div className="text-lg sm:text-xl font-bold text-emerald-600 mt-1">{formatSAR(totalValuationSale)}</div>
          <span className="text-[11px] text-emerald-600/80">ربح متوقع: {formatSAR(totalValuationSale - totalValuationCost)}</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <span className="text-xs text-slate-500 font-medium">إجمالي الأصناف المعرفة</span>
          <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1">{inventory.length} صنف</div>
          <span className="text-[11px] text-slate-400">{categories.length} تصنيفات رئيسية</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <span className="text-xs text-slate-500 font-medium">أصناف منخفضة المخزون</span>
          <div className={`text-lg sm:text-xl font-bold mt-1 ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
            {lowStockCount} أصناف
          </div>
          <span className="text-[11px] text-amber-600/80">تحت حد إعادة الطلب</span>
        </div>
      </div>

      {/* Tabs Switcher: Products vs Movement History */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('items')}
          className={`pb-3 flex items-center gap-2 transition ${
            activeTab === 'items'
              ? 'border-b-2 border-emerald-600 text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>قائمة الأصناف والمستودع</span>
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`pb-3 flex items-center gap-2 transition ${
            activeTab === 'movements'
              ? 'border-b-2 border-emerald-600 text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>سجل حركات المخزون ({stockMovements.length})</span>
        </button>
      </div>

      {activeTab === 'items' ? (
        <>
          {/* Filters Bar */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث باسم الصنف، الباركود، أو رمز SKU..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">جميع التصنيفات</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition font-medium ${
                    statusFilter === 'all' ? 'bg-white shadow-xs font-bold text-slate-900' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`px-2.5 py-1 rounded-lg transition font-medium ${
                    statusFilter === 'active' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  النشطة
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-2.5 py-1 rounded-lg transition font-medium ${
                    statusFilter === 'inactive' ? 'bg-rose-50 text-rose-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  المعطلة
                </button>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">الرمز / SKU</th>
                    <th className="p-3.5">اسم الصنف</th>
                    <th className="p-3.5">التصنيف</th>
                    <th className="p-3.5">الوحدة</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5">سعر التكلفة</th>
                    <th className="p-3.5">سعر البيع</th>
                    <th className="p-3.5">الكمية المتوفرة</th>
                    <th className="p-3.5">حالة المخزون</th>
                    <th className="p-3.5 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center">
                        <EmptyState
                          icon={Package}
                          title="لا توجد أصناف في المستودع"
                          description={searchTerm ? "لم يتم العثور على أي أصناف تطابق معايير البحث الحالية." : "لم يتم تسجيل أصناف مخزون حتى الآن. أضف أول صنف لتتبع المخزون والأسعار."}
                          actionLabel="إضافة صنف جديد"
                          onAction={() => handleOpenAdd()}
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const isLow = item.currentStock <= item.minStockAlert;
                      const isItemActive = item.isActive !== false;
                      return (
                        <tr key={item.id} className={`hover:bg-slate-50 transition ${!isItemActive ? 'bg-slate-50/60 opacity-75' : ''}`}>
                          <td className="p-3.5 font-mono text-slate-500 font-bold">{item.sku}</td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{item.nameAr}</span>
                              {!isItemActive && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-600 font-normal">معطل</span>
                              )}
                            </div>
                            {item.barcode && <div className="text-[10px] text-slate-400 font-mono">باركود: {item.barcode}</div>}
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                              {item.category}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-500">{item.unit}</td>
                          <td className="p-3.5">
                            <button
                              type="button"
                              onClick={() => toggleInventoryItemStatus(item.id)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition ${
                                isItemActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                              }`}
                              title="انقر لتغيير حالة التنشيط"
                            >
                              <Power className="w-3 h-3" />
                              <span>{isItemActive ? 'نشط' : 'معطل'}</span>
                            </button>
                          </td>
                          <td className="p-3.5 font-mono text-slate-700">{formatSAR(item.purchasePrice)}</td>
                          <td className="p-3.5 font-mono font-bold text-emerald-600">{formatSAR(item.salePrice)}</td>
                          <td className="p-3.5 font-mono font-bold text-base text-slate-900">{item.currentStock}</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border inline-block ${
                                item.currentStock === 0
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : isLow
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {item.currentStock === 0 ? 'نفد من المخزون' : isLow ? 'منخفض' : 'متوفر'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenAdjust(item)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-700 border border-slate-200 transition text-[11px] flex items-center gap-1"
                                title="تسوية جردية"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                                <span>تسوية</span>
                              </button>
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 transition"
                                title="تعديل"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 transition"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Stock Movement Log */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">التاريخ</th>
                  <th className="p-3.5">الصنف</th>
                  <th className="p-3.5">نوع الحركة</th>
                  <th className="p-3.5">الكمية</th>
                  <th className="p-3.5">الرصيد السابق</th>
                  <th className="p-3.5">الرصيد الجديد</th>
                  <th className="p-3.5">رقم المرجع</th>
                  <th className="p-3.5">البيان والملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {stockMovements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      لا توجد حركات مخزنية مسجلة بعد.
                    </td>
                  </tr>
                ) : (
                  stockMovements.map((sm) => (
                    <tr key={sm.id} className="hover:bg-slate-50">
                      <td className="p-3.5 text-slate-500 font-mono">{sm.date}</td>
                      <td className="p-3.5 font-bold text-slate-900">{sm.itemName}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            sm.type === 'sale'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : sm.type === 'purchase'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : sm.type === 'sale_reversal'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : sm.type === 'purchase_reversal'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : sm.type === 'return_in'
                              ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                              : sm.type === 'return_out'
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : sm.type === 'initial'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : sm.type === 'adjustment_in'
                              ? 'bg-teal-50 text-teal-700 border-teal-200'
                              : sm.type === 'adjustment_out'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {sm.type === 'sale'
                            ? 'صرف مبيعات (-)'
                            : sm.type === 'purchase'
                            ? 'توريد مشتريات (+)'
                            : sm.type === 'sale_reversal'
                            ? 'عكس مبيعات (+)'
                            : sm.type === 'purchase_reversal'
                            ? 'عكس مشتريات (-)'
                            : sm.type === 'return_in'
                            ? 'مردودات مبيعات (+)'
                            : sm.type === 'return_out'
                            ? 'مردودات مشتريات (-)'
                            : sm.type === 'initial'
                            ? 'رصيد افتتاحي (●)'
                            : sm.type === 'adjustment_in'
                            ? 'تسوية إضافة (+)'
                            : sm.type === 'adjustment_out'
                            ? 'تسوية عجز (-)'
                            : 'تسوية جردية'}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-900">{sm.quantity}</td>
                      <td className="p-3.5 font-mono text-slate-500">{sm.previousStock}</td>
                      <td className="p-3.5 font-mono font-bold text-slate-900">{sm.newStock}</td>
                      <td className="p-3.5 font-mono text-blue-600 font-medium">{sm.referenceNumber}</td>
                      <td className="p-3.5 text-slate-600">{sm.notes}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Item Modal */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-xl p-6 text-right space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                {editingItem ? 'تعديل بيانات الصنف' : 'إضافة صنف مخزون جديد'}
              </h3>
              <button onClick={() => setItemModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">رمز الصنف (SKU) *</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">الباركود Barcode</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">اسم الصنف بالعربي *</label>
                <input
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="مثال: جهاز راوتر شبكات"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">التصنيف</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">الوحدة</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">سعر التكلفة (غير شامل الضريبة) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">سعر البيع (غير شامل الضريبة) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-600 font-medium">
                      {editingItem ? 'الرصيد الحالي بالمخزن' : 'الرصيد الافتتاحي'}
                    </label>
                    {editingItem && !checkDirectStockEditAllowed(editingItem.id).canDirectlyEdit && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold border border-amber-200">
                        مقفل لوجود حركات
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={currentStock}
                    disabled={Boolean(editingItem && !checkDirectStockEditAllowed(editingItem.id).canDirectlyEdit)}
                    onChange={(e) => setCurrentStock(Number(e.target.value))}
                    className={`w-full border rounded-xl p-2 font-mono focus:outline-none ${
                      editingItem && !checkDirectStockEditAllowed(editingItem.id).canDirectlyEdit
                        ? 'bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500'
                    }`}
                  />
                  {editingItem && !checkDirectStockEditAllowed(editingItem.id).canDirectlyEdit && (
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      لتعديل الرصيد بعد بدء العمليات، يرجى استخدام حركة{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setItemModalOpen(false);
                          handleOpenAdjust(editingItem);
                        }}
                        className="text-emerald-700 font-bold underline"
                      >
                        تسوية المخزون
                      </button>
                      .
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">حد تنبيه انخفاض المخزون</label>
                  <input
                    type="number"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-xs active:scale-95"
                >
                  حفظ الصنف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustModalOpen && adjustTargetItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-xl p-6 text-right space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">تسوية جردية للمخزون</h3>
              <button onClick={() => setAdjustModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>الصنف:</span>
                <span className="font-bold text-slate-900">{adjustTargetItem.nameAr}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>الرصيد الفعلي الحالي بالنظام:</span>
                <span className="font-mono font-bold text-amber-700">{adjustTargetItem.currentStock}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmAdjust} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">الرصيد الفعلي الجديد بعد الجرد *</label>
                <input
                  type="number"
                  min="0"
                  value={newStockVal}
                  onChange={(e) => setNewStockVal(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">سبب التسوية الجردية</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition shadow-xs active:scale-95"
                >
                  تحديث وتوثيق التسوية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Dependency Check Modal */}
      {depModalOpen && depTargetItem && depCheckResult && (
        <DependencyCheckModal
          isOpen={depModalOpen}
          onClose={() => {
            setDepModalOpen(false);
            setDepTargetItem(null);
            setDepCheckResult(null);
          }}
          title={`تعذر حذف الصنف المخزني: ${depTargetItem.nameAr}`}
          entityName={depTargetItem.nameAr}
          entityType="الصنف المخزني"
          checkResult={depCheckResult}
          onToggleDeactivate={() => {
            toggleInventoryItemStatus(depTargetItem.id);
          }}
          isCurrentlyActive={depTargetItem.isActive !== false}
        />
      )}
    </div>
  );
};
