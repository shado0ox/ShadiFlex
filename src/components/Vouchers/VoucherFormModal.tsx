import React, { useState, useEffect } from 'react';
import {
  Voucher,
  VoucherType,
  VoucherPartyType,
  PaymentMethod,
  Account,
} from '../../types/accounting';
import { useAccounting } from '../../context/AccountingContext';
import { formatSAR, tafqeetArabic } from '../../utils/currency';
import {
  X,
  Plus,
  AlertCircle,
  FileCheck,
  Receipt,
  DollarSign,
  User,
  Building2,
  Calendar,
  CreditCard,
  Building,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

interface VoucherFormModalProps {
  initialType?: VoucherType;
  initialPartyType?: VoucherPartyType;
  initialPartyId?: string;
  initialInvoiceId?: string;
  onClose: () => void;
  onSuccess?: (voucher: Voucher) => void;
}

export const VoucherFormModal: React.FC<VoucherFormModalProps> = ({
  initialType = 'receipt',
  initialPartyType,
  initialPartyId,
  initialInvoiceId,
  onClose,
  onSuccess,
}) => {
  const {
    accounts,
    customers,
    suppliers,
    salesInvoices,
    purchaseInvoices,
    vouchers,
    createVoucher,
    checkDateInFiscalYear,
    checkDateInFiscalPeriod,
  } = useAccounting();

  const [type, setType] = useState<VoucherType>(initialType);
  const [partyType, setPartyType] = useState<VoucherPartyType>(
    initialPartyType || (initialType === 'receipt' ? 'customer' : 'supplier')
  );
  const [selectedPartyId, setSelectedPartyId] = useState<string>(initialPartyId || '');
  const [partyName, setPartyName] = useState<string>('');
  
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [description, setDescription] = useState<string>('');

  // Bank & Cheque details
  const [bankName, setBankName] = useState<string>('مصرف الراجحي');
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [chequeDueDate, setChequeDueDate] = useState<string>('');
  const [transferReference, setTransferReference] = useState<string>('');

  // Link to existing unpaid invoice
  const [relatedInvoiceId, setRelatedInvoiceId] = useState<string>(initialInvoiceId || '');

  // Account mappings
  const [debitAccountId, setDebitAccountId] = useState<string>('');
  const [creditAccountId, setCreditAccountId] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cash and Bank accounts
  const cashAndBankAccounts = accounts.filter(
    (a) => a.code.startsWith('1101') || a.id.startsWith('acc_1101')
  );

  // Set default accounts based on type, paymentMethod, and partyType
  useEffect(() => {
    // Determine cash/bank account
    let cashBankAcc = accounts.find((a) => a.code === '110102'); // Default Rajhi Bank
    if (paymentMethod === 'cash') {
      cashBankAcc = accounts.find((a) => a.code === '110101') || accounts[0]; // Cash
    } else if (paymentMethod === 'mada' || paymentMethod === 'pos_card') {
      cashBankAcc = accounts.find((a) => a.code === '110104') || accounts[0]; // POS
    }

    if (type === 'receipt') {
      // Receipt: Debit is Cash/Bank
      if (cashBankAcc) setDebitAccountId(cashBankAcc.id);

      // Credit is Customer / Other
      if (partyType === 'customer') {
        const custAcc = accounts.find((a) => a.code === '1102');
        if (custAcc) setCreditAccountId(custAcc.id);
      } else {
        const revAcc = accounts.find((a) => a.code === '4101') || accounts[0];
        if (revAcc) setCreditAccountId(revAcc.id);
      }
    } else {
      // Payment: Credit is Cash/Bank
      if (cashBankAcc) setCreditAccountId(cashBankAcc.id);

      // Debit is Supplier / Expense
      if (partyType === 'supplier') {
        const suppAcc = accounts.find((a) => a.code === '2101');
        if (suppAcc) setDebitAccountId(suppAcc.id);
      } else {
        const expAcc = accounts.find((a) => a.code === '5101' || a.category === 'expense') || accounts[0];
        if (expAcc) setDebitAccountId(expAcc.id);
      }
    }
  }, [type, paymentMethod, partyType, accounts]);

  // When party changes, auto-set party name and prefill description
  useEffect(() => {
    if (partyType === 'customer' && selectedPartyId) {
      const cust = customers.find((c) => c.id === selectedPartyId);
      if (cust) {
        setPartyName(cust.nameAr);
        if (!description) {
          setDescription(`تحصيل دفعة مالية من العميل ${cust.nameAr}`);
        }
      }
    } else if (partyType === 'supplier' && selectedPartyId) {
      const supp = suppliers.find((s) => s.id === selectedPartyId);
      if (supp) {
        setPartyName(supp.nameAr);
        if (!description) {
          setDescription(`صرف مستحقات للمورد ${supp.nameAr}`);
        }
      }
    }
  }, [selectedPartyId, partyType, customers, suppliers]);

  // Handle unpaid invoice selection
  useEffect(() => {
    if (relatedInvoiceId) {
      if (type === 'receipt') {
        const inv = salesInvoices.find((i) => i.id === relatedInvoiceId);
        if (inv) {
          setSelectedPartyId(inv.customerId);
          setPartyName(inv.customerName);
          setAmount(inv.remainingAmount || (inv.totalAmount - inv.paidAmount));
          setDescription(`سداد فاتورة مبيعات رقم ${inv.invoiceNumber} للعميل ${inv.customerName}`);
        }
      } else {
        const pur = purchaseInvoices.find((p) => p.id === relatedInvoiceId);
        if (pur) {
          setSelectedPartyId(pur.supplierId);
          setPartyName(pur.supplierName);
          setAmount(pur.totalAmount - (pur.paidAmount || 0));
          setDescription(`سداد فاتورة مشتريات رقم ${pur.invoiceNumber} للمورد ${pur.supplierName}`);
        }
      }
    }
  }, [relatedInvoiceId, type, salesInvoices, purchaseInvoices]);

  const unpaidSalesInvoices = salesInvoices.filter((i) => i.paymentStatus !== 'paid');
  const unpaidPurchaseInvoices = purchaseInvoices.filter((p) => p.paymentStatus !== 'paid');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (amount <= 0) {
      setErrorMsg('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    if (!partyName.trim()) {
      setErrorMsg('يرجى تحديد اسم الطرف (المستلم منه أو المصروف له)');
      return;
    }

    const debitAcc = accounts.find((a) => a.id === debitAccountId);
    const creditAcc = accounts.find((a) => a.id === creditAccountId);

    if (!debitAcc || !creditAcc) {
      setErrorMsg('يرجى تحديد أطراف القيد المحاسبي (المدين والدائن)');
      return;
    }

    if (debitAcc.id === creditAcc.id) {
      setErrorMsg('لا يمكن أن يكون الحساب المدين والحساب الدائن متطابقين');
      return;
    }

    setIsSubmitting(true);
    try {
      const prefix = type === 'receipt' ? 'RV' : 'PV';
      const count = vouchers.filter((v) => v.type === type).length + 1;
      const voucherNumber = `${prefix}-2026-${count.toString().padStart(4, '0')}`;

      const relInvoice = type === 'receipt'
        ? salesInvoices.find((i) => i.id === relatedInvoiceId)
        : purchaseInvoices.find((p) => p.id === relatedInvoiceId);

      const created = await createVoucher({
        voucherNumber,
        type,
        date,
        amount: Number(amount),
        partyType,
        partyId: selectedPartyId || undefined,
        partyName: partyName.trim(),
        paymentMethod,
        bankName: paymentMethod === 'cash' ? undefined : bankName,
        chequeNumber: paymentMethod === 'cheque' ? chequeNumber : undefined,
        chequeDueDate: paymentMethod === 'cheque' ? chequeDueDate : undefined,
        transferReference: paymentMethod === 'bank_transfer' ? transferReference : undefined,
        description: description.trim() || (type === 'receipt' ? 'سند قبض مالي' : 'سند صرف مالي'),
        relatedInvoiceId: relInvoice?.id,
        relatedInvoiceNumber: relInvoice?.invoiceNumber,
        debitAccountId: debitAcc.id,
        debitAccountCode: debitAcc.code,
        debitAccountNameAr: debitAcc.nameAr,
        creditAccountId: creditAcc.id,
        creditAccountCode: creditAcc.code,
        creditAccountNameAr: creditAcc.nameAr,
        status: 'posted',
      });

      if (onSuccess) onSuccess(created);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'حدث خطأ أثناء حفظ السند المالي');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${type === 'receipt' ? 'bg-emerald-600/30 text-emerald-400' : 'bg-amber-600/30 text-amber-400'}`}>
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg">
                {type === 'receipt' ? 'إنشاء سند قبض مالي (Receipt Voucher)' : 'إنشاء سند صرف مالي (Payment Voucher)'}
              </h2>
              <p className="text-xs text-slate-400">
                تسجيل الحركات النقدية والبنكية وتحديث كشوف الحسابات والقيود آلياً
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Type Toggle & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {/* Voucher Type */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع السند المالي:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setType('receipt');
                    setPartyType('customer');
                    setSelectedPartyId('');
                    setRelatedInvoiceId('');
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition ${
                    type === 'receipt'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>سند قبض (استلام نقدية / تحصيل)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('payment');
                    setPartyType('supplier');
                    setSelectedPartyId('');
                    setRelatedInvoiceId('');
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition ${
                    type === 'payment'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>سند صرف (دفع لمورد / مصروفات)</span>
                </button>
              </div>
            </div>

            {/* Voucher Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">تاريخ السند:</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                required
              />
            </div>
          </div>

          {/* Fiscal Period & Year Warning Alert */}
          {(() => {
            const pCheck = checkDateInFiscalPeriod(date);
            const yCheck = checkDateInFiscalYear(date);

            if (pCheck.isClosed) {
              return (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">تحذير رقابي حاسم: </span>
                    الفترة المالية ({pCheck.period?.nameAr || date}) مقفلة تماماً. يمنع النظام إنشاء أو ترحيل السندات المالية ضمن فترات مقفلة.
                  </div>
                </div>
              );
            }

            if (!yCheck.isWithinYear) {
              return (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">تنبيه السنة المالية: </span>
                    {yCheck.warningMessage}
                  </div>
                </div>
              );
            }

            return null;
          })()}

          {/* Amount & Realtime Tafqeet Section */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>مبلغ السند الإجمالي بالريال السعودي (SAR):</span>
              </label>
              <div className="relative w-full sm:w-64">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-slate-800 border border-slate-700 text-white font-mono font-black text-lg rounded-xl px-3 py-2 text-left focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  ر.س
                </span>
              </div>
            </div>

            {/* Tafqeet in Arabic */}
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 text-xs">
              <span className="text-slate-400 font-semibold block mb-1">المبلغ بالحروف كتابةً (تفقيط عربي رسمي):</span>
              <span className="font-bold text-amber-300 text-sm leading-relaxed">
                {amount > 0 ? tafqeetArabic(amount) : 'صفر ريال سعودي'}
              </span>
            </div>
          </div>

          {/* Party Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Party Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">فئة الطرف:</label>
              <select
                value={partyType}
                onChange={(e) => {
                  setPartyType(e.target.value as VoucherPartyType);
                  setSelectedPartyId('');
                  setPartyName('');
                }}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              >
                <option value="customer">عميل (Customer)</option>
                <option value="supplier">مورد (Supplier)</option>
                <option value="employee">موظف / عهدة (Employee)</option>
                <option value="other">طرف آخر / حساب عام (Other)</option>
              </select>
            </div>

            {/* Party Dropdown or Name Input */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {type === 'receipt' ? 'استلمنا من المكرم / السادة:' : 'صرفنا إلى المكرم / السادة:'} *
              </label>
              {partyType === 'customer' ? (
                <select
                  value={selectedPartyId}
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  required
                >
                  <option value="">-- اختر العميل --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr} - الرصيد الحالي: {formatSAR(c.balance)}
                    </option>
                  ))}
                </select>
              ) : partyType === 'supplier' ? (
                <select
                  value={selectedPartyId}
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  required
                >
                  <option value="">-- اختر المورد --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameAr} - الرصيد المستحق: {formatSAR(s.balance)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="أدخل اسم الشخص أو الجهة..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  required
                />
              )}
            </div>
          </div>

          {/* Optional: Link to Unpaid Invoice */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ربط بفاتورة غير مسددة (لتسوية الفاتورة آلياً):
            </label>
            <select
              value={relatedInvoiceId}
              onChange={(e) => setRelatedInvoiceId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            >
              <option value="">-- اختياري: اختر فاتورة لسدادها مباشرة --</option>
              {type === 'receipt'
                ? unpaidSalesInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      فاتورة مبيعات {inv.invoiceNumber} - {inv.customerName} (المتبقي: {formatSAR(inv.remainingAmount || (inv.totalAmount - inv.paidAmount))})
                    </option>
                  ))
                : unpaidPurchaseInvoices.map((pur) => (
                    <option key={pur.id} value={pur.id}>
                      فاتورة مشتريات {pur.invoiceNumber} - {pur.supplierName} (المتبقي: {formatSAR(pur.totalAmount - (pur.paidAmount || 0))})
                    </option>
                  ))}
            </select>
          </div>

          {/* Payment Method Details */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-700" />
              <span>تفاصيل الدفع وطريقة السداد:</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'bank_transfer', label: 'تحويل بنكي / سريع' },
                { id: 'cash', label: 'نقداً (الصندوق)' },
                { id: 'cheque', label: 'شيك مصرفي' },
                { id: 'mada', label: 'بطاقة مدى / POS' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                    paymentMethod === m.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Bank / Cheque / Transfer specific fields */}
            {paymentMethod === 'bank_transfer' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">اسم المصرف / البنك:</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="مثال: مصرف الراجحي، البنك الأهلي..."
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">الرقم المرجعي للتحويل:</label>
                  <input
                    type="text"
                    value={transferReference}
                    onChange={(e) => setTransferReference(e.target.value)}
                    placeholder="مثال: TRF-982341..."
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-2 font-mono"
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'cheque' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">رقم الشيك:</label>
                  <input
                    type="text"
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    placeholder="CHQ-00123"
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-2 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">مسحوب على بنك:</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="اسم البنك..."
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">تاريخ استحقاق الشيك:</label>
                  <input
                    type="date"
                    value={chequeDueDate}
                    onChange={(e) => setChequeDueDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-2"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Double-Entry Ledger Mapping */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-700" />
              <span>التوجيه المحاسبي المزدوج (القيد الآلي):</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الطرف المدين (Debit Account):
                </label>
                <select
                  value={debitAccountId}
                  onChange={(e) => setDebitAccountId(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-2"
                  required
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الطرف الدائن (Credit Account):
                </label>
                <select
                  value={creditAccountId}
                  onChange={(e) => setCreditAccountId(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-2"
                  required
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.nameAr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Description & Narration */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              البيان والسبب (وذلك مقابل): *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="شرح وتفاصيل سبب القبض أو الصرف..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              required
            ></textarea>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-bold transition shadow-md active:scale-95 ${
                type === 'receipt' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ السند وترحيل القيد المحاسبي'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
