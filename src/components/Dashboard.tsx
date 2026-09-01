import React from 'react';
import { useAccounting } from '../context/AccountingContext';
import { formatSAR } from '../utils/currency';
import {
  TrendingUp,
  FileText,
  DollarSign,
  Wallet,
  Package,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  Printer,
  Sparkles,
  Scale,
  ChevronLeft,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { SalesInvoice } from '../types/accounting';

interface DashboardProps {
  onOpenNewSalesInvoice: () => void;
  onOpenNewPurchaseInvoice: () => void;
  onOpenNewJournalEntry?: () => void;
  onViewInvoicePrint: (invoice: SalesInvoice) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenNewSalesInvoice,
  onOpenNewPurchaseInvoice,
  onOpenNewJournalEntry,
  onViewInvoicePrint,
}) => {
  const {
    salesInvoices,
    purchaseInvoices,
    inventory,
    accounts,
    setActiveTab,
    getIncomeStatement,
    getVatReturn,
  } = useAccounting();

  const incomeStmt = getIncomeStatement();
  const vatReturn = getVatReturn();

  // Calculate Liquid Cash & Banks from 1101 accounts
  const liquidCash = accounts
    .filter((a) => a.code.startsWith('1101') && a.isTransactional)
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  // Total Inventory Valuation (Qty * Cost Price)
  const inventoryValuation = inventory.reduce(
    (sum, item) => sum + item.currentStock * item.purchasePrice,
    0
  );

  // Total Sales & Total Purchases
  const totalSales = salesInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPurchases = purchaseInvoices.reduce((sum, pur) => sum + pur.totalAmount, 0);

  // Low stock items
  const lowStockItems = inventory.filter((i) => i.currentStock <= i.minStockAlert);

  // Monthly Comparison Chart Data
  const chartData = [
    { month: 'مايو', sales: 48000, purchases: 32000, profit: 16000 },
    { month: 'يونيو', sales: 62000, purchases: 39000, profit: 23000 },
    { month: 'يوليو', sales: 79000, purchases: 45000, profit: 34000 },
    {
      month: 'أغسطس (الحالي)',
      sales: Math.round(totalSales) || 85000,
      purchases: Math.round(totalPurchases) || 52000,
      profit: Math.round(incomeStmt.netProfit) || 33000,
    },
  ];

  // Expenses Breakdown for Pie Chart
  const expensePieData = [
    { name: 'تكلفة بضاعة مباعة', value: incomeStmt.cogs || 56000, color: '#10b981' },
    { name: 'رواتب وأجور وبدلات', value: 24000, color: '#3b82f6' },
    { name: 'إيجار المكاتب', value: 10000, color: '#f59e0b' },
    { name: 'تسويق ومبيعات', value: 4200, color: '#8b5cf6' },
    { name: 'عمومية وإدارية', value: 7700, color: '#ec4899' },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Banner Alert for Low Stock if any */}
      {lowStockItems.length > 0 && (
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
            onClick={() => setActiveTab('inventory')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition shadow-xs self-end sm:self-auto"
          >
            عرض أصناف المخزون
          </button>
        </div>
      )}

      {/* Top Row: 4 Main Bento Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sales */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              +12.4% شهرياً
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-500">إجمالي المبيعات (شامل الضريبة)</p>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1">
              {formatSAR(totalSales)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>عدد الفواتير المصدرة:</span>
              <span className="font-bold text-slate-700">{salesInvoices.length}</span>
            </p>
          </div>
        </div>

        {/* Card 2: Total Purchases */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              مشتريات معتمدة
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-500">إجمالي المشتريات والمصروفات</p>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1">
              {formatSAR(totalPurchases)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              ضريبة مدخلات مستردة: <span className="font-mono text-slate-600 font-bold">{formatSAR(vatReturn.totalPurchasesVat)}</span>
            </p>
          </div>
        </div>

        {/* Card 3: Net VAT Due */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              ضريبة 15% ZATCA
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-500">صافي الضريبة المستحقة للإقرار</p>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1">
              {formatSAR(vatReturn.netVatPayableOrRefundable)}
            </h3>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">
              {vatReturn.netVatPayableOrRefundable >= 0 ? 'مستحقة السداد للهيئة' : 'رصيد ضريبي دائن مسترد'}
            </p>
          </div>
        </div>

        {/* Card 4: Liquid Cash & Banks */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              سيولة نقدية
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-500">رصيد النقدية والبنوك والخزينة</p>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-1">
              {formatSAR(liquidCash)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              مصرف الراجحي + البنك الأهلي + الصندوق
            </p>
          </div>
        </div>
      </div>

      {/* Main Bento Grid Area */}
      <div className="grid grid-cols-1 gap-5">
        {/* Bento Card: Sales vs Purchases Monthly Bar Chart */}
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
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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

        {/* Bento Card: Recent Invoices Table */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  أحدث فواتير المبيعات الإلكترونية (ZATCA)
                </h3>
                <p className="text-xs text-slate-500">الفواتير الضريبية والمبسطة المتوافقة مع هيئة الزكاة</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('sales')}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-bold px-3 py-1.5 rounded-xl hover:bg-emerald-50 transition"
                >
                  جميع الفواتير &larr;
                </button>
                <button
                  onClick={onOpenNewSalesInvoice}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-xl transition shadow-xs"
                >
                  + إنشاء فاتورة
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="p-2.5">رقم الفاتورة</th>
                    <th className="p-2.5">النوع</th>
                    <th className="p-2.5">العميل</th>
                    <th className="p-2.5">التاريخ</th>
                    <th className="p-2.5">المبلغ شامل الضريبة</th>
                    <th className="p-2.5">الحالة</th>
                    <th className="p-2.5 text-center">طباعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {salesInvoices.slice(0, 4).map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-2.5 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            inv.type === 'tax_invoice'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-teal-50 text-teal-700 border-teal-200'
                          }`}
                        >
                          {inv.type === 'tax_invoice' ? 'ضريبية B2B' : 'مبسطة B2C'}
                        </span>
                      </td>
                      <td className="p-2.5 font-medium text-slate-800">{inv.customerName}</td>
                      <td className="p-2.5 text-slate-500">{inv.issueDate}</td>
                      <td className="p-2.5 font-mono font-bold text-slate-900">{formatSAR(inv.totalAmount)}</td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            inv.paymentStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : inv.paymentStatus === 'partial'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {inv.paymentStatus === 'paid' ? 'مدفوعة' : inv.paymentStatus === 'partial' ? 'جزئية' : 'آجل'}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => onViewInvoicePrint(inv)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition"
                          title="عرض وطباعة فاتورة ZATCA الرسمية"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bento Row: 3 Modular Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Bento 1: Inventory & Stock Status */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                <Package className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">المخزون والمنتجات</h4>
            </div>
            <button
              onClick={() => setActiveTab('inventory')}
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
              <span className="font-bold text-slate-900">{inventory.length} صنف</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span>أصناف دون حد الأمان:</span>
              <span className={`font-bold ${lowStockItems.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {lowStockItems.length} أصناف
              </span>
            </div>
          </div>
        </div>

        {/* Bento 2: Net Profit & Income Statement Quick Access */}
        <div
          onClick={() => setActiveTab('financial_statements')}
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
              <span className="font-mono font-bold text-emerald-700">{formatSAR(incomeStmt.grossProfit)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
              <span>المصروفات التشغيلية:</span>
              <span className="font-mono font-bold text-slate-800">{formatSAR(incomeStmt.operatingExpenses)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span>صافي ربح الفترة:</span>
              <span className={`font-mono font-bold ${incomeStmt.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {formatSAR(incomeStmt.netProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* Bento 3: AI Financial Advisor Quick Prompt */}
        <div
          onClick={() => setActiveTab('ai_advisor')}
          className="bg-purple-50/70 border border-purple-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-purple-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-600 text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-purple-900">المستشار المالي الذكي</h4>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200/80 text-purple-800">
              مدعوم بالذكاء الاصطناعي
            </span>
          </div>

          <p className="text-xs text-purple-800 leading-relaxed">
            احصل على تحليل فوري للتدفقات النقدية، نصائح لتحسين هوامش الربح، وفحص مدى التوافق مع ضريبة القيمة المضافة.
          </p>

          <div className="pt-2 text-xs font-bold text-purple-900 flex items-center gap-1">
            <span>بدء محادثة استشارية</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
