import React from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { formatSAR } from '../../utils/currency';
import { Landmark, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface VatReturnViewProps {
  startDate?: string;
  endDate?: string;
  periodLabel: string;
}

export const VatReturnView: React.FC<VatReturnViewProps> = ({
  startDate,
  endDate,
  periodLabel,
}) => {
  const { getVatReturn, companySettings } = useAccounting();
  const vatData = getVatReturn(startDate, endDate, periodLabel);

  const isRefund = vatData.netVatPayableOrRefundable < 0;

  return (
    <div className="space-y-6 text-right">
      {/* Official ZATCA Header Banner */}
      <div className="bg-emerald-900 text-white rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold mb-1">
            <Landmark className="w-4 h-4" />
            <span>هيئة الزكاة والضريبة والجمارك (ZATCA)</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold">
            نموذج إقرار ضريبة القيمة المضافة (VAT Return)
          </h3>
          <p className="text-xs text-emerald-200 mt-1">
            {companySettings.nameAr} | الرقم الضريبي (TRN): {companySettings.vatNumber}
          </p>
        </div>

        <div className="bg-emerald-800/80 border border-emerald-700/60 rounded-xl p-3 text-center min-w-[200px]">
          <div className="text-xs text-emerald-200 mb-0.5">
            {isRefund ? 'صافي الضريبة المستردة' : 'صافي الضريبة المستحقة للسداد'}
          </div>
          <div className="text-lg font-bold font-mono text-white">
            {formatSAR(Math.abs(vatData.netVatPayableOrRefundable))}
          </div>
        </div>
      </div>

      {/* Part 1: Sales / Output VAT */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="bg-slate-50 border-b border-slate-200 p-3.5 font-bold text-xs text-slate-800">
          أولاً: ضريبة القيمة المضافة على المبيعات (المخرجات) - VAT on Sales
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="p-3 w-16 text-center">البند</th>
                <th className="p-3">نوع التوريدات / المبيعات</th>
                <th className="p-3 text-left w-36">المبلغ الخاضع للضريبة (ر.س)</th>
                <th className="p-3 text-left w-36">مبلغ الضريبة (15%) (ر.س)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
              <tr className="hover:bg-slate-50/70 transition">
                <td className="p-3 text-center font-mono font-bold text-slate-400">1</td>
                <td className="p-3 font-medium text-slate-900">المبيعات الخاضعة للنسبة الأساسية (15%)</td>
                <td className="p-3 text-left font-mono text-slate-900">{formatSAR(vatData.standardRatedSales)}</td>
                <td className="p-3 text-left font-mono text-emerald-700 font-bold">{formatSAR(vatData.standardRatedSalesVat)}</td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition">
                <td className="p-3 text-center font-mono font-bold text-slate-400">2</td>
                <td className="p-3 text-slate-600">المبيعات الخاضعة للنسبة الصفرية (0%) - الصادرات</td>
                <td className="p-3 text-left font-mono text-slate-600">{formatSAR(vatData.zeroRatedSales)}</td>
                <td className="p-3 text-left font-mono text-slate-400">{formatSAR(0)}</td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition">
                <td className="p-3 text-center font-mono font-bold text-slate-400">3</td>
                <td className="p-3 text-slate-600">المبيعات المعفاة من الضريبة</td>
                <td className="p-3 text-left font-mono text-slate-600">{formatSAR(vatData.exemptSales)}</td>
                <td className="p-3 text-left font-mono text-slate-400">{formatSAR(0)}</td>
              </tr>
            </tbody>
            <tfoot className="bg-emerald-50 font-bold text-emerald-950 border-t border-emerald-200">
              <tr>
                <td colSpan={2} className="p-3 text-right">إجمالي المبيعات وضريبة المخرجات</td>
                <td className="p-3 text-left font-mono">{formatSAR(vatData.totalSales)}</td>
                <td className="p-3 text-left font-mono text-emerald-900 font-bold text-sm">{formatSAR(vatData.totalSalesVat)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Part 2: Purchases / Input VAT */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="bg-slate-50 border-b border-slate-200 p-3.5 font-bold text-xs text-slate-800">
          ثانياً: ضريبة القيمة المضافة على المشتريات (المدخلات) - VAT on Purchases
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="p-3 w-16 text-center">البند</th>
                <th className="p-3">نوع المشتريات والمصروفات</th>
                <th className="p-3 text-left w-36">المبلغ الخاضع للضريبة (ر.س)</th>
                <th className="p-3 text-left w-36">الضريبة القابلة للاسترداد (ر.س)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
              <tr className="hover:bg-slate-50/70 transition">
                <td className="p-3 text-center font-mono font-bold text-slate-400">4</td>
                <td className="p-3 font-medium text-slate-900">المشتريات الخاضعة للنسبة الأساسية (15%)</td>
                <td className="p-3 text-left font-mono text-slate-900">{formatSAR(vatData.standardRatedPurchases)}</td>
                <td className="p-3 text-left font-mono text-amber-700 font-bold">{formatSAR(vatData.standardRatedPurchasesVat)}</td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition">
                <td className="p-3 text-center font-mono font-bold text-slate-400">5</td>
                <td className="p-3 text-slate-600">المشتريات الخاضعة للنسبة الصفرية (0%) - الاستيراد</td>
                <td className="p-3 text-left font-mono text-slate-600">{formatSAR(vatData.zeroRatedPurchases)}</td>
                <td className="p-3 text-left font-mono text-slate-400">{formatSAR(0)}</td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition">
                <td className="p-3 text-center font-mono font-bold text-slate-400">6</td>
                <td className="p-3 text-slate-600">المشتريات المعفاة من الضريبة</td>
                <td className="p-3 text-left font-mono text-slate-600">{formatSAR(vatData.exemptPurchases)}</td>
                <td className="p-3 text-left font-mono text-slate-400">{formatSAR(0)}</td>
              </tr>
            </tbody>
            <tfoot className="bg-amber-50 font-bold text-amber-950 border-t border-amber-200">
              <tr>
                <td colSpan={2} className="p-3 text-right">إجمالي المشتريات وضريبة المدخلات القابلة للخصم</td>
                <td className="p-3 text-left font-mono">{formatSAR(vatData.totalPurchases)}</td>
                <td className="p-3 text-left font-mono text-amber-900 font-bold text-sm">{formatSAR(vatData.totalPurchasesVat)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Part 3: Net VAT Due / Refundable Calculation Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h4 className="font-bold text-xs text-slate-900">
            ثالثاً: صافي احتساب ضريبة القيمة المضافة المستحقة للفترة
          </h4>
          <span className="text-xs text-slate-500 font-mono">{periodLabel}</span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
            <span className="text-slate-700">إجمالي ضريبة المبيعات (المخرجات المستحقة):</span>
            <span className="font-mono font-bold text-slate-900">{formatSAR(vatData.totalSalesVat)}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
            <span className="text-slate-700">يخصم: إجمالي ضريبة المشتريات (المدخلات القابلة للخصم):</span>
            <span className="font-mono font-bold text-slate-900">({formatSAR(vatData.totalPurchasesVat)})</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-600 text-white font-bold text-sm mt-3">
            <span>{isRefund ? 'صافي الضريبة القابلة للاسترداد من ZATCA:' : 'صافي الضريبة الواجب سدادها لهيئة ZATCA:'}</span>
            <span className="font-mono text-base">{formatSAR(Math.abs(vatData.netVatPayableOrRefundable))}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
