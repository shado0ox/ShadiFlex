import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Receipt, Wallet } from 'lucide-react';
import { formatSAR } from '../../utils/currency';

interface KpiCardsProps {
  totalSales: number;
  salesCount: number;
  totalPurchases: number;
  purchasesVat: number;
  netVatPayableOrRefundable: number;
  liquidCash: number;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  totalSales,
  salesCount,
  totalPurchases,
  purchasesVat,
  netVatPayableOrRefundable,
  liquidCash,
}) => {
  return (
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
            <span className="font-bold text-slate-700">{salesCount}</span>
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
            ضريبة مدخلات مستردة:{' '}
            <span className="font-mono text-slate-600 font-bold">{formatSAR(purchasesVat)}</span>
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
            {formatSAR(netVatPayableOrRefundable)}
          </h3>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            {netVatPayableOrRefundable >= 0 ? 'مستحقة السداد للهيئة' : 'رصيد ضريبي دائن مسترد'}
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
  );
};

export default KpiCards;
