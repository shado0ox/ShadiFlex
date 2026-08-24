import React, { useState } from 'react';
import { PaymentMethod, Customer, Branch, CashRegister } from '../../types/accounting';
import { CreditCard, Banknote, Split, Wallet, Check, X, Calculator, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';

interface PosPaymentModalProps {
  totalAmount: number;
  taxableAmount: number;
  vatTotal: number;
  discountTotal: number;
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (cust: Customer | null) => void;
  branch?: Branch;
  register?: CashRegister;
  onConfirmPayment: (paymentDetails: {
    paymentMethod: PaymentMethod;
    paidAmount: number;
    cashTendered?: number;
    changeReturned?: number;
    madaAuthCode?: string;
    splitPaymentDetails?: {
      cashAmount: number;
      madaAmount: number;
    };
    notes?: string;
  }) => void;
  onClose: () => void;
}

export const PosPaymentModal: React.FC<PosPaymentModalProps> = ({
  totalAmount,
  taxableAmount,
  vatTotal,
  discountTotal,
  customers,
  selectedCustomer,
  onSelectCustomer,
  branch,
  register,
  onConfirmPayment,
  onClose,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [cashTenderedInput, setCashTenderedInput] = useState<string>(totalAmount.toFixed(2));
  const [madaAuthCode, setMadaAuthCode] = useState<string>('');
  const [splitCash, setSplitCash] = useState<number>(Math.floor(totalAmount / 2));
  const [notes, setNotes] = useState<string>('');

  const cashTendered = parseFloat(cashTenderedInput) || 0;
  const changeReturned = Math.max(0, cashTendered - totalAmount);

  // Split calculation
  const splitMada = Math.max(0, Number((totalAmount - splitCash).toFixed(2)));

  const handleQuickCash = (amount: number) => {
    setCashTenderedInput(amount.toString());
  };

  const handleAddCash = (amount: number) => {
    const current = parseFloat(cashTenderedInput) || 0;
    setCashTenderedInput((current + amount).toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedMethod === 'cash') {
      if (cashTendered < totalAmount) {
        alert('المبلغ النقدي المدفوع أقل من إجمالي الفاتورة المطلوبة!');
        return;
      }
      onConfirmPayment({
        paymentMethod: 'cash',
        paidAmount: totalAmount,
        cashTendered,
        changeReturned,
        notes,
      });
    } else if (selectedMethod === 'mada' || selectedMethod === 'pos_card') {
      onConfirmPayment({
        paymentMethod: 'mada',
        paidAmount: totalAmount,
        madaAuthCode: madaAuthCode.trim() || `AUTH-${Math.floor(100000 + Math.random() * 900000)}`,
        notes,
      });
    } else if (selectedMethod === 'credit_card') {
      onConfirmPayment({
        paymentMethod: 'credit_card',
        paidAmount: totalAmount,
        notes,
      });
    } else if (selectedMethod === 'credit') {
      if (!selectedCustomer || selectedCustomer.id === 'cust_walkin') {
        alert('يرجى تحديد عميل مسجل لإتمام عملية البيع الآجل!');
        return;
      }
      onConfirmPayment({
        paymentMethod: 'credit',
        paidAmount: 0,
        notes: `مبيعات آجلة على حساب العميل: ${selectedCustomer.nameAr}`,
      });
    } else {
      // Split payment
      onConfirmPayment({
        paymentMethod: 'cash',
        paidAmount: totalAmount,
        splitPaymentDetails: {
          cashAmount: splitCash,
          madaAmount: splitMada,
        },
        notes: `دفع مجزأ (نقدي: ${splitCash} ر.س | مدى: ${splitMada} ر.س)`,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">إتمام الدفع وإصدار الفاتورة</h2>
              <p className="text-xs text-slate-400">
                {branch?.nameAr || 'الفرع الرئيسي'} • {register?.nameAr || 'صندوق كاشير 1'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Top Amount Banner */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 rounded-xl shadow-inner flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-emerald-100 block">المبلغ الإجمالي المستحق</span>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight mt-0.5">
                {totalAmount.toFixed(2)} <span className="text-base font-normal text-emerald-200">ر.س</span>
              </div>
            </div>
            <div className="text-left text-xs space-y-0.5 text-emerald-100">
              <div>المبلغ قبل الضريبة: <span className="font-mono font-bold text-white">{taxableAmount.toFixed(2)}</span></div>
              <div>ضريبة 15%: <span className="font-mono font-bold text-white">{vatTotal.toFixed(2)}</span></div>
              {discountTotal > 0 && (
                <div className="text-amber-200">خصم: <span className="font-mono font-bold">-{discountTotal.toFixed(2)}</span></div>
              )}
            </div>
          </div>

          {/* Customer Selection Pill */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-slate-500" />
              <span className="font-medium text-slate-700">العميل المحدد:</span>
              <span className="font-bold text-slate-900">{selectedCustomer?.nameAr || 'عميل نقدي / عام'}</span>
              {selectedCustomer?.vatNumber && (
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                  ضريبي: {selectedCustomer.vatNumber}
                </span>
              )}
            </div>
            <select
              value={selectedCustomer?.id || ''}
              onChange={(e) => {
                const found = customers.find((c) => c.id === e.target.value);
                onSelectCustomer(found || null);
              }}
              className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white font-sans text-slate-700 outline-hidden"
            >
              <option value="">عميل نقدي / عام</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Methods Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">اختر طريقة السداد:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedMethod('cash')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition cursor-pointer ${
                  selectedMethod === 'cash'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Banknote className="w-6 h-6 mb-1 text-emerald-600" />
                <span className="text-xs">نقداً (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('mada')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition cursor-pointer ${
                  selectedMethod === 'mada' || selectedMethod === 'pos_card'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <CreditCard className="w-6 h-6 mb-1 text-teal-600" />
                <span className="text-xs">شبكة مدى (Mada)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('credit_card')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition cursor-pointer ${
                  selectedMethod === 'credit_card'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Wallet className="w-6 h-6 mb-1 text-indigo-600" />
                <span className="text-xs">فيزا / ماستر</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('bank_transfer')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition cursor-pointer ${
                  selectedMethod === 'bank_transfer'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Split className="w-6 h-6 mb-1 text-purple-600" />
                <span className="text-xs">دفع مجزأ (Split)</span>
              </button>
            </div>
          </div>

          {/* Conditional Method Input Sections */}
          {selectedMethod === 'cash' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">المبلغ المدفوع نقداً من العميل:</label>
                <span className="text-xs text-slate-500">حساب الباقي تلقائياً</span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashTenderedInput}
                  onChange={(e) => setCashTenderedInput(e.target.value)}
                  className="w-full text-xl font-bold font-mono text-slate-900 px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden pl-12"
                  autoFocus
                />
                <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-500">ر.س</span>
              </div>

              {/* Quick Cash Presets */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleQuickCash(totalAmount)}
                  className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  المبلغ بالضبط ({totalAmount.toFixed(2)})
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCash(Math.ceil(totalAmount / 10) * 10 || 10)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-mono font-bold transition cursor-pointer"
                >
                  {Math.ceil(totalAmount / 10) * 10} ر.س
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCash(50)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-mono font-bold transition cursor-pointer"
                >
                  50 ر.س
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCash(100)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-mono font-bold transition cursor-pointer"
                >
                  100 ر.س
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCash(200)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-mono font-bold transition cursor-pointer"
                >
                  200 ر.س
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCash(500)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-mono font-bold transition cursor-pointer"
                >
                  500 ر.س
                </button>
                <button
                  type="button"
                  onClick={() => handleAddCash(10)}
                  className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-mono font-bold transition cursor-pointer"
                >
                  +10
                </button>
                <button
                  type="button"
                  onClick={() => handleAddCash(50)}
                  className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-mono font-bold transition cursor-pointer"
                >
                  +50
                </button>
              </div>

              {/* Change Calculation Box */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">المتبقي للعميل (الفكة):</span>
                <span className={`text-lg font-mono font-black ${changeReturned > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                  {changeReturned.toFixed(2)} ر.س
                </span>
              </div>
            </div>
          )}

          {(selectedMethod === 'mada' || selectedMethod === 'pos_card') && (
            <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-200 space-y-3">
              <div className="flex items-center gap-2 text-teal-800 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                مرر بطاقة العميل على جهاز نقطة البيع (Mada Terminal)
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  رقم التفويض / العملية من الإيصال البنكي (اختياري):
                </label>
                <input
                  type="text"
                  placeholder="مثال: AUTH-982341 أو 004819"
                  value={madaAuthCode}
                  onChange={(e) => setMadaAuthCode(e.target.value)}
                  className="w-full text-sm font-mono px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                />
              </div>
            </div>
          )}

          {selectedMethod === 'bank_transfer' && (
            <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 space-y-3">
              <h4 className="text-xs font-bold text-purple-900">تقسيم الدفع بين النقد ومدى:</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1 font-medium">جزء نقدي (ر.س):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={totalAmount}
                    value={splitCash}
                    onChange={(e) => setSplitCash(parseFloat(e.target.value) || 0)}
                    className="w-full text-sm font-bold font-mono px-3 py-2 bg-white border border-slate-300 rounded-lg outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1 font-medium">جزء شبكة مدى (ر.س):</label>
                  <input
                    type="number"
                    step="0.01"
                    readOnly
                    value={splitMada}
                    className="w-full text-sm font-bold font-mono px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes / Remarks */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">ملاحظات على الفاتورة (اختياري):</label>
            <input
              type="text"
              placeholder="مثال: تسليم فوري، طاولة 4، سائق التوصيل..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-hidden focus:bg-white"
            />
          </div>

          {/* Submit Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer"
            >
              <Check className="w-5 h-5" />
              تأكيد الدفع وطباعة الفاتورة ({totalAmount.toFixed(2)} ر.س)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
