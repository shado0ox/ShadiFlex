import React from 'react';
import { SimpleExpenseInvoice, CompanySettings } from '../../types/accounting';
import { formatSAR, tafqeetArabic } from '../../utils/currency';
import {
  X,
  Printer,
  FileText,
  Zap,
  Droplet,
  Wifi,
  Fuel,
  Wrench,
  Coffee,
  Building2,
  Cloud,
  Layers,
  CheckCircle2,
  Building,
} from 'lucide-react';

interface SimpleExpensePrintModalProps {
  expense: SimpleExpenseInvoice | null;
  companySettings: CompanySettings;
  onClose: () => void;
}

const CATEGORY_NAMES: Record<string, { label: string; icon: React.ElementType }> = {
  electricity: { label: 'فاتورة كهرباء وطاقة', icon: Zap },
  water: { label: 'فاتورة مياه وخدمات', icon: Droplet },
  internet_telecom: { label: 'فاتورة اتصالات وإنترنت', icon: Wifi },
  fuel_petrol: { label: 'مصروف وقود وبنزين', icon: Fuel },
  maintenance_repair: { label: 'فاتورة صيانة وإصلاحات', icon: Wrench },
  office_stationery: { label: 'أدوات مكتبية وقرطاسية', icon: FileText },
  hospitality_pantry: { label: 'ضيافة وبوفيه ونثريات', icon: Coffee },
  software_tech: { label: 'اشتراكات برمجيات وسحابة', icon: Cloud },
  government_fees: { label: 'رسوم واشتراكات حكومية', icon: Building2 },
  other: { label: 'مصروفات تشغيلية متنوعة', icon: Layers },
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'نقداً (الصندوق الرئيسي)',
  pos_card: 'بطاقة مدى / نقاط البيع',
  bank_transfer: 'تحويل بنكي مباشر',
  petty_cash: 'عهدة موظف نقدية',
};

export const SimpleExpensePrintModal: React.FC<SimpleExpensePrintModalProps> = ({
  expense,
  companySettings,
  onClose,
}) => {
  if (!expense) return null;

  const catMeta = CATEGORY_NAMES[expense.category] || { label: 'مصروف تشغيلي', icon: Layers };
  const CategoryIcon = catMeta.icon;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Toolbar (Non-printable) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">سند صرف وفاتورة مصروفات تشغيلية</h3>
              <p className="text-xs text-slate-300">رقم الفاتورة: {expense.expenseNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / تصدير PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 overflow-y-auto flex-1 space-y-6 text-slate-900 bg-white" id="printable-expense">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
            <div className="space-y-1">
              <h1 className="text-xl font-black text-slate-900">{companySettings.nameAr}</h1>
              <p className="text-xs text-slate-500">{companySettings.nameEn}</p>
              <div className="text-xs text-slate-600 space-y-0.5 pt-1">
                <div>الرقم الضريبي للمنشأة: <span className="font-mono font-bold text-slate-900">{companySettings.vatNumber}</span></div>
                <div>السجل التجاري: <span className="font-mono text-slate-800">{companySettings.crNumber}</span></div>
                <div>العنوان: {companySettings.nationalAddress?.city || companySettings.address?.city || 'الرياض'} - {companySettings.nationalAddress?.street || companySettings.address?.street || ''}</div>
              </div>
            </div>

            <div className="text-left space-y-1">
              <div className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-black rounded-md uppercase tracking-wider">
                سند إثبات وسداد مصروف
              </div>
              <div className="text-xs text-slate-500 font-mono pt-1">EXPENSE VOUCHER</div>
              <div className="text-sm font-bold font-mono text-indigo-700">{expense.expenseNumber}</div>
              <div className="text-xs text-slate-600">التاريخ: <span className="font-medium">{expense.date}</span></div>
            </div>
          </div>

          {/* Badge & Category summary */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-white border border-slate-200 text-indigo-700 shadow-xs">
                <CategoryIcon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 block">التصنيف المحاسبي للمصروف</span>
                <span className="text-sm font-bold text-slate-900">{catMeta.label}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              <span>تم السداد والقيد محاسبياً</span>
            </div>
          </div>

          {/* Expense & Vendor Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 text-xs">
                بيانات المورد / الجهة المستفيدة
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-slate-500">اسم المورد:</span>
                <span className="col-span-2 font-bold text-slate-800">{expense.vendorName}</span>
              </div>
              {expense.vendorVatNumber && (
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">الرقم الضريبي:</span>
                  <span className="col-span-2 font-mono font-bold text-slate-800">{expense.vendorVatNumber}</span>
                </div>
              )}
              {expense.vendorInvoiceRef && (
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">رقم الفاتورة:</span>
                  <span className="col-span-2 font-mono text-slate-800">{expense.vendorInvoiceRef}</span>
                </div>
              )}
            </div>

            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 text-xs">
                بيانات السداد والمحاسبة
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-slate-500">وسيلة الدفع:</span>
                <span className="col-span-2 font-bold text-slate-800">{PAYMENT_LABELS[expense.paymentMethod] || expense.paymentMethod}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-slate-500">حساب السداد:</span>
                <span className="col-span-2 font-medium text-slate-800">{expense.paidThroughAccountNameAr}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-slate-500">حساب المصروف:</span>
                <span className="col-span-2 font-medium text-slate-800">{expense.expenseAccountCode} - {expense.expenseAccountNameAr}</span>
              </div>
              {expense.employeeName && (
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500">الموظف/العهدة:</span>
                  <span className="col-span-2 font-medium text-slate-800">{expense.employeeName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Line Item Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">بيان وتفاصيل المصروف</th>
                  <th className="p-3 text-left">المبلغ قبل الضريبة</th>
                  <th className="p-3 text-left">ضريبة القيمة المضافة (15%)</th>
                  <th className="p-3 text-left">الإجمالي شامل الضريبة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-3 text-center font-mono text-slate-500">1</td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{expense.title}</div>
                    <div className="text-[11px] text-slate-500">
                      تصنيف: {catMeta.label} | المورد: {expense.vendorName}
                    </div>
                  </td>
                  <td className="p-3 text-left font-mono font-medium text-slate-800">
                    {formatSAR(expense.amountBeforeVat)}
                  </td>
                  <td className="p-3 text-left font-mono font-medium text-indigo-700">
                    {formatSAR(expense.vatAmount)}
                  </td>
                  <td className="p-3 text-left font-mono font-bold text-slate-900">
                    {formatSAR(expense.totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount Totals Box */}
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-700">المبلغ الإجمالي كتابةً:</div>
              <div className="text-slate-900 font-medium">{tafqeetArabic(expense.totalAmount)}</div>
              {expense.notes && (
                <div className="pt-2 text-slate-500 border-t border-slate-200 mt-2">
                  <span className="font-bold">ملاحظات: </span>
                  {expense.notes}
                </div>
              )}
            </div>

            <div className="w-72 bg-slate-900 text-white p-4 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>المبلغ قبل الضريبة:</span>
                <span className="font-mono">{formatSAR(expense.amountBeforeVat)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>ضريبة المدخلات 15%:</span>
                <span className="font-mono text-cyan-300">+{formatSAR(expense.vatAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-700">
                <span>الإجمالي الصافي:</span>
                <span className="font-mono text-emerald-400">{formatSAR(expense.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Attachment Preview if exists */}
          {expense.attachmentDataUrl && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>المستند المرفق مع المصروف: {expense.attachmentName || 'صورة الفاتورة'}</span>
              </div>
              <div className="max-h-48 overflow-hidden rounded-lg border border-slate-200 bg-white flex items-center justify-center p-2">
                <img
                  src={expense.attachmentDataUrl}
                  alt="مرفق الفاتورة"
                  className="max-h-44 object-contain"
                />
              </div>
            </div>
          )}

          {/* Signatures */}
          <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs border-t border-slate-200">
            <div className="space-y-12">
              <div className="font-bold text-slate-700">إعداد / طالب المصروف</div>
              <div className="border-b border-dashed border-slate-300 w-3/4 mx-auto"></div>
              <div className="text-slate-500">{expense.employeeName || 'المحاسب المسؤول'}</div>
            </div>
            <div className="space-y-12">
              <div className="font-bold text-slate-700">المراجعة والتدقيق المالي</div>
              <div className="border-b border-dashed border-slate-300 w-3/4 mx-auto"></div>
              <div className="text-slate-500">رئيس الحسابات</div>
            </div>
            <div className="space-y-12">
              <div className="font-bold text-slate-700">الاعتماد والصرف النهائي</div>
              <div className="border-b border-dashed border-slate-300 w-3/4 mx-auto"></div>
              <div className="text-slate-500">المدير المالي / المفوض</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
