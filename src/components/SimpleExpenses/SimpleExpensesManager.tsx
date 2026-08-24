import React, { useState, useMemo } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import {
  SimpleExpenseCategory,
  SimpleExpenseInvoice,
} from '../../types/accounting';
import { formatSAR } from '../../utils/currency';
import { SimpleExpenseFormModal } from './SimpleExpenseFormModal';
import { SimpleExpensePrintModal } from './SimpleExpensePrintModal';
import {
  Plus,
  Search,
  Zap,
  Droplet,
  Wifi,
  Fuel,
  Wrench,
  FileText,
  Coffee,
  Building2,
  Cloud,
  Layers,
  Filter,
  Download,
  Printer,
  Trash2,
  Receipt,
  TrendingDown,
  Percent,
  Calendar,
  CheckCircle2,
  ArrowUpDown,
  CreditCard,
  Building,
  Sparkles,
} from 'lucide-react';

const CATEGORY_META: Record<
  SimpleExpenseCategory,
  { label: string; icon: React.ElementType; color: string; badgeColor: string }
> = {
  electricity: {
    label: 'كهرباء وطاقة',
    icon: Zap,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    badgeColor: 'bg-amber-100 text-amber-800',
  },
  water: {
    label: 'مياه وخدمات',
    icon: Droplet,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
    badgeColor: 'bg-cyan-100 text-cyan-800',
  },
  internet_telecom: {
    label: 'اتصالات وإنترنت',
    icon: Wifi,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    badgeColor: 'bg-indigo-100 text-indigo-800',
  },
  fuel_petrol: {
    label: 'وقود ومحروقات',
    icon: Fuel,
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    badgeColor: 'bg-orange-100 text-orange-800',
  },
  maintenance_repair: {
    label: 'صيانة وإصلاح',
    icon: Wrench,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    badgeColor: 'bg-emerald-100 text-emerald-800',
  },
  office_stationery: {
    label: 'قرطاسية وأدوات',
    icon: FileText,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  hospitality_pantry: {
    label: 'ضيافة وبوفيه',
    icon: Coffee,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    badgeColor: 'bg-rose-100 text-rose-800',
  },
  software_tech: {
    label: 'برمجيات وسحابة',
    icon: Cloud,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    badgeColor: 'bg-purple-100 text-purple-800',
  },
  government_fees: {
    label: 'رسوم حكومية',
    icon: Building2,
    color: 'text-teal-600 bg-teal-50 border-teal-200',
    badgeColor: 'bg-teal-100 text-teal-800',
  },
  cleaning_facility: {
    label: 'نظافة ومرافق',
    icon: Sparkles,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
    badgeColor: 'bg-cyan-100 text-cyan-800',
  },
  rent: {
    label: 'إيجار مقرات',
    icon: Building,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    badgeColor: 'bg-amber-100 text-amber-800',
  },
  other: {
    label: 'مصروفات أخرى',
    icon: Layers,
    color: 'text-slate-600 bg-slate-50 border-slate-200',
    badgeColor: 'bg-slate-100 text-slate-800',
  },
};

const PAYMENT_BADGES: Record<string, string> = {
  cash: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  pos_card: 'bg-blue-50 text-blue-700 border border-blue-200',
  bank_transfer: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  petty_cash: 'bg-amber-50 text-amber-700 border border-amber-200',
};

const PAYMENT_TITLES: Record<string, string> = {
  cash: 'نقدًا (الصندوق)',
  pos_card: 'مدى / POS',
  bank_transfer: 'تحويل بنكي',
  petty_cash: 'عهدة موظف',
};

export const SimpleExpensesManager: React.FC = () => {
  const { simpleExpenses, companySettings, deleteSimpleExpense } = useAccounting();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [printingExpense, setPrintingExpense] = useState<SimpleExpenseInvoice | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return simpleExpenses.filter((item) => {
      // Category
      if (selectedCategoryFilter !== 'all' && item.category !== selectedCategoryFilter) {
        return false;
      }
      // Date range
      if (startDate && item.date < startDate) return false;
      if (endDate && item.date > endDate) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesVendor = item.vendorName.toLowerCase().includes(q);
        const matchesNum = item.expenseNumber.toLowerCase().includes(q);
        const matchesRef = item.vendorInvoiceRef?.toLowerCase().includes(q);
        const matchesAccount = item.expenseAccountNameAr.toLowerCase().includes(q);
        if (!matchesTitle && !matchesVendor && !matchesNum && !matchesRef && !matchesAccount) {
          return false;
        }
      }
      return true;
    });
  }, [simpleExpenses, selectedCategoryFilter, startDate, endDate, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalGross = simpleExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
    const totalNet = simpleExpenses.reduce((sum, e) => sum + e.amountBeforeVat, 0);
    const totalVat = simpleExpenses.reduce((sum, e) => sum + e.vatAmount, 0);

    // Group by category for top category
    const catMap: Record<string, number> = {};
    simpleExpenses.forEach((e) => {
      catMap[e.category] = (catMap[e.category] || 0) + e.totalAmount;
    });

    let topCategoryKey = 'electricity';
    let topCategoryAmount = 0;
    Object.entries(catMap).forEach(([k, v]) => {
      if (v > topCategoryAmount) {
        topCategoryAmount = v;
        topCategoryKey = k;
      }
    });

    return {
      count: simpleExpenses.length,
      totalGross,
      totalNet,
      totalVat,
      topCategory: CATEGORY_META[topCategoryKey as SimpleExpenseCategory]?.label || 'عام',
      topCategoryAmount,
    };
  }, [simpleExpenses]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) return;

    const headers = [
      'رقم الفاتورة',
      'التاريخ',
      'التصنيف',
      'البيان / الوصف',
      'المورد',
      'الرقم الضريبي للمورد',
      'رقم فاتورة المورد',
      'حساب المصروف',
      'المبلغ قبل الضريبة',
      'ضريبة المدخلات 15%',
      'الإجمالي شامل الضريبة',
      'طريقة السداد',
      'حساب الدفع',
      'الموظف/العهدة',
    ];

    const rows = filteredExpenses.map((e) => [
      e.expenseNumber,
      e.date,
      CATEGORY_META[e.category]?.label || e.category,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.vendorName.replace(/"/g, '""')}"`,
      e.vendorVatNumber || '',
      e.vendorInvoiceRef || '',
      `"${e.expenseAccountCode} - ${e.expenseAccountNameAr}"`,
      e.amountBeforeVat.toFixed(2),
      e.vatAmount.toFixed(2),
      e.totalAmount.toFixed(2),
      PAYMENT_TITLES[e.paymentMethod] || e.paymentMethod,
      `"${e.paidThroughAccountNameAr}"`,
      e.employeeName || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `كشف_المصروفات_التشغيلية_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-md shadow-indigo-600/20">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">سجل فواتير المصروفات البسيطة والنثريات</h1>
              <p className="text-xs text-slate-500">
                تسجيل ومتابعة فواتير الكهرباء، المياه، الاتصالات، الوقود، الصيانة، القرطاسية والضيافة مع توليد القيود واحتساب ضريبة المدخلات
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleExportCSV}
            disabled={filteredExpenses.length === 0}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>تصدير Excel (CSV)</span>
          </button>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex-1 sm:flex-initial px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/25"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل فاتورة مصروف جديدة</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Operational Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">إجمالي المصروفات التشغيلية</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">{formatSAR(stats.totalGross)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{stats.count} فاتورة مسجلة</div>
          </div>
        </div>

        {/* Recoverable Input VAT (15%) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 shrink-0">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">ضريبة المدخلات المستردة (15%)</div>
            <div className="text-xl font-black text-cyan-700 mt-0.5">{formatSAR(stats.totalVat)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">تُخصم من إقرار ZATCA</div>
          </div>
        </div>

        {/* Net Base Expense (Excluding VAT) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">صافي المصروفات قبل الضريبة</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">{formatSAR(stats.totalNet)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">الأثر في قائمة الدخل</div>
          </div>
        </div>

        {/* Top Expense Category */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">أعلى تصنيف في الاستهلاك</div>
            <div className="text-lg font-black text-slate-900 mt-0.5">{stats.topCategory}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{formatSAR(stats.topCategoryAmount)}</div>
          </div>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setSelectedCategoryFilter('all')}
          className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            selectedCategoryFilter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>كافة المصروفات ({simpleExpenses.length})</span>
        </button>

        {Object.entries(CATEGORY_META).map(([catKey, cat]) => {
          const Icon = cat.icon;
          const count = simpleExpenses.filter((e) => e.category === catKey).length;
          const isSelected = selectedCategoryFilter === catKey;
          return (
            <button
              key={catKey}
              onClick={() => setSelectedCategoryFilter(catKey)}
              className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-indigo-800 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالمورد، رقم الفاتورة، البيان، الحساب..."
            className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-2 text-slate-400 hover:text-slate-600 text-xs"
            >
              مسح
            </button>
          )}
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">من:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none text-xs p-0 text-slate-800 focus:ring-0"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-slate-500">إلى:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none text-xs p-0 text-slate-800 focus:ring-0"
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="px-2 py-1 text-slate-500 hover:text-slate-800 text-[11px] underline"
            >
              إعادة ضبط
            </button>
          )}
        </div>
      </div>

      {/* Main Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="p-3.5">رقم الفاتورة والتاريخ</th>
                <th className="p-3.5">التصنيف</th>
                <th className="p-3.5">البيان والمورد</th>
                <th className="p-3.5">حساب المصروف</th>
                <th className="p-3.5">طريقة السداد</th>
                <th className="p-3.5 text-left">قبل الضريبة</th>
                <th className="p-3.5 text-left">الضريبة 15%</th>
                <th className="p-3.5 text-left">الإجمالي</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <div className="font-bold text-slate-700 text-sm">لا توجد فواتير مصروفات مطابقة للبحث</div>
                    <div className="text-xs text-slate-400 mt-1">
                      انقر على "تسجيل فاتورة مصروف جديدة" لإضافة فاتورة كهرباء، مياه، بنزين أو صيانة
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => {
                  const catMeta = CATEGORY_META[expense.category] || CATEGORY_META.other;
                  const Icon = catMeta.icon;

                  return (
                    <tr key={expense.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Invoice No & Date */}
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-indigo-700">{expense.expenseNumber}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{expense.date}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${catMeta.badgeColor}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{catMeta.label}</span>
                        </span>
                      </td>

                      {/* Title & Vendor */}
                      <td className="p-3.5 max-w-xs">
                        <div className="font-bold text-slate-900 line-clamp-1">{expense.title}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-medium text-slate-700">{expense.vendorName}</span>
                          {expense.vendorInvoiceRef && (
                            <span className="font-mono text-slate-400">({expense.vendorInvoiceRef})</span>
                          )}
                        </div>
                      </td>

                      {/* Account */}
                      <td className="p-3.5">
                        <div className="text-slate-800 font-medium text-[11px]">
                          {expense.expenseAccountNameAr}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {expense.expenseAccountCode}
                        </div>
                      </td>

                      {/* Payment */}
                      <td className="p-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            PAYMENT_BADGES[expense.paymentMethod] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {PAYMENT_TITLES[expense.paymentMethod] || expense.paymentMethod}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                          {expense.paidThroughAccountNameAr}
                        </div>
                      </td>

                      {/* Net */}
                      <td className="p-3.5 text-left font-mono font-medium text-slate-700">
                        {formatSAR(expense.amountBeforeVat)}
                      </td>

                      {/* VAT */}
                      <td className="p-3.5 text-left font-mono font-medium text-cyan-700">
                        +{formatSAR(expense.vatAmount)}
                      </td>

                      {/* Total */}
                      <td className="p-3.5 text-left font-mono font-bold text-slate-900 text-sm">
                        {formatSAR(expense.totalAmount)}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setPrintingExpense(expense)}
                            title="طباعة سند وفاتورة المصروف"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeletingId(expense.id)}
                            title="حذف الفاتورة وإلغاء القيد"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Delete Confirmation Dialog */}
      {deletingId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-right space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">هل أنت متأكد من حذف فاتورة المصروف؟</h3>
              <p className="text-xs text-slate-500 mt-1">
                سيتم حذف الفاتورة وإلغاء القيد المحاسبي المزدوج المرتبط بها وتحديث أرصدة الحسابات تلقائياً.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  deleteSimpleExpense(deletingId);
                  setDeletingId(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
              >
                تأكيد الحذف وإلغاء القيد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      <SimpleExpenseFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={(created) => {
          // Open print view directly for convenience
          setPrintingExpense(created);
        }}
      />

      {/* Print / Export Modal */}
      <SimpleExpensePrintModal
        expense={printingExpense}
        companySettings={companySettings}
        onClose={() => setPrintingExpense(null)}
      />
    </div>
  );
};
