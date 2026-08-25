import React, { useState, useEffect } from 'react';
import {
  DebitCreditNote,
  NoteType,
  NotePartyType,
  NoteReason,
  InvoiceItem,
  PaymentMethod,
} from '../../types/accounting';
import { useAccounting } from '../../context/AccountingContext';
import { formatSAR, tafqeetArabic } from '../../utils/currency';
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  FileCheck,
  Package,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  User,
  Building2,
  Calendar,
  DollarSign,
  Boxes,
} from 'lucide-react';

interface DebitCreditNoteModalProps {
  initialType?: NoteType;
  initialInvoiceId?: string;
  onClose: () => void;
  onSuccess?: (note: DebitCreditNote) => void;
}

export const DebitCreditNoteModal: React.FC<DebitCreditNoteModalProps> = ({
  initialType = 'credit_note',
  initialInvoiceId,
  onClose,
  onSuccess,
}) => {
  const {
    customers,
    suppliers,
    inventory,
    salesInvoices,
    purchaseInvoices,
    debitCreditNotes,
    createDebitCreditNote,
  } = useAccounting();

  const [type, setType] = useState<NoteType>(initialType);
  const [partyType, setPartyType] = useState<NotePartyType>(initialType === 'credit_note' ? 'customer' : 'supplier');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(initialInvoiceId || '');
  
  const [reason, setReason] = useState<NoteReason>('goods_return');
  const [customReasonText, setCustomReasonText] = useState<string>('مردودات بضاعة وإعادتها للمستودع');
  const [affectInventory, setAffectInventory] = useState<boolean>(true);
  const [refundMethod, setRefundMethod] = useState<PaymentMethod | 'account_balance'>('account_balance');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: `item_${Date.now()}_1`,
      nameAr: '',
      quantity: 1,
      unit: 'قطعة',
      unitPrice: 0,
      discount: 0,
      vatRate: 0.15,
      vatAmount: 0,
      subtotal: 0,
      totalWithVat: 0,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // When type changes, adjust default partyType and reason text
  useEffect(() => {
    if (type === 'credit_note') {
      setPartyType('customer');
      if (reason === 'goods_return') setCustomReasonText('مردودات مبيعات بضاعة وإعادتها للمستودع');
    } else {
      setPartyType('supplier');
      if (reason === 'goods_return') setCustomReasonText('مردودات مشتريات للمورد لوجود ملاحظات');
    }
  }, [type]);

  // Handle reason change
  const handleReasonChange = (r: NoteReason) => {
    setReason(r);
    switch (r) {
      case 'goods_return':
        setCustomReasonText(type === 'credit_note' ? 'مردودات مبيعات بضاعة وإعادتها للمستودع' : 'مردودات مشتريات للمورد');
        setAffectInventory(true);
        break;
      case 'post_sale_discount':
        setCustomReasonText('خصم تجاري وترويجي متفق عليه بعد إصدار الفاتورة');
        setAffectInventory(false);
        break;
      case 'invoice_correction':
        setCustomReasonText('تصحيح خطأ محاسبي أو احتساب زائد في الفاتورة الأصلية');
        setAffectInventory(false);
        break;
      case 'price_adjustment':
        setCustomReasonText('تسوية فرق أسعار متفق عليه بين الطرفين');
        setAffectInventory(false);
        break;
      case 'damaged_goods':
        setCustomReasonText('تعويض عن بضاعة تالفة أثناء النقل أو التخزين');
        setAffectInventory(false);
        break;
      case 'cancelled_service':
        setCustomReasonText('إلغاء جزء من الخدمة أو فسخ بند تعاقدي');
        setAffectInventory(false);
        break;
      default:
        setCustomReasonText('');
        break;
    }
  };

  // Populate from chosen original invoice
  useEffect(() => {
    if (!selectedInvoiceId) return;

    if (partyType === 'customer') {
      const inv = salesInvoices.find((i) => i.id === selectedInvoiceId);
      if (inv) {
        setSelectedPartyId(inv.customerId);
        if (inv.items && inv.items.length > 0) {
          setItems(
            inv.items.map((it, idx) => ({
              ...it,
              id: `cni_${Date.now()}_${idx}`,
              quantity: 1, // default to 1 for return
              subtotal: it.unitPrice,
              vatAmount: it.unitPrice * (it.vatRate || 0.15),
              totalWithVat: it.unitPrice * (1 + (it.vatRate || 0.15)),
            }))
          );
        }
      }
    } else {
      const pur = purchaseInvoices.find((p) => p.id === selectedInvoiceId);
      if (pur) {
        setSelectedPartyId(pur.supplierId);
        if (pur.items && pur.items.length > 0) {
          setItems(
            pur.items.map((it, idx) => ({
              ...it,
              id: `dni_${Date.now()}_${idx}`,
              quantity: 1,
              subtotal: it.unitPrice,
              vatAmount: it.unitPrice * (it.vatRate || 0.15),
              totalWithVat: it.unitPrice * (1 + (it.vatRate || 0.15)),
            }))
          );
        }
      }
    }
  }, [selectedInvoiceId, partyType, salesInvoices, purchaseInvoices]);

  // Recalculate item line values
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    // If item selected from inventory dropdown
    if (field === 'itemId') {
      const prod = inventory.find((p) => p.id === value);
      if (prod) {
        item.nameAr = prod.nameAr;
        item.nameEn = prod.nameEn;
        item.unit = prod.unit || 'قطعة';
        item.unitPrice = partyType === 'customer' ? prod.salePrice : prod.purchasePrice;
        item.vatRate = 0.15;
      }
    }

    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discount) || 0;
    const vatR = item.vatRate !== undefined ? Number(item.vatRate) : 0.15;

    const sub = Math.max(0, qty * price - disc);
    const vat = sub * vatR;
    const total = sub + vat;

    item.subtotal = Number(sub.toFixed(2));
    item.vatAmount = Number(vat.toFixed(2));
    item.totalWithVat = Number(total.toFixed(2));

    updated[index] = item;
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        id: `item_${Date.now()}_${items.length + 1}`,
        nameAr: '',
        quantity: 1,
        unit: 'قطعة',
        unitPrice: 0,
        discount: 0,
        vatRate: 0.15,
        vatAmount: 0,
        subtotal: 0,
        totalWithVat: 0,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Grand totals
  const subtotal = items.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unitPrice)), 0);
  const discountTotal = items.reduce((sum, i) => sum + Number(i.discount || 0), 0);
  const taxableAmount = items.reduce((sum, i) => sum + Number(i.subtotal || 0), 0);
  const vatTotal = items.reduce((sum, i) => sum + Number(i.vatAmount || 0), 0);
  const totalAmount = items.reduce((sum, i) => sum + Number(i.totalWithVat || 0), 0);

  const partyList = partyType === 'customer' ? customers : suppliers;
  const currentParty = partyList.find((p) => p.id === selectedPartyId);

  const originalInvoice =
    partyType === 'customer'
      ? salesInvoices.find((i) => i.id === selectedInvoiceId)
      : purchaseInvoices.find((p) => p.id === selectedInvoiceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedPartyId && !currentParty) {
      setErrorMsg('يرجى اختيار العميل أو المورد المستهدف لإصدار الإشعار');
      return;
    }

    if (items.length === 0 || totalAmount <= 0) {
      setErrorMsg('يرجى إدخال بند واحد على الأقل مع قيمة صالحة للإشعار');
      return;
    }

    const hasEmptyNames = items.some((it) => !it.nameAr || it.nameAr.trim() === '');
    if (hasEmptyNames) {
      setErrorMsg('يرجى تحديد وصف / اسم لجميع البنود المدرجة في الإشعار');
      return;
    }

    setIsSubmitting(true);
    try {
      // Generate Next Sequential Note Number
      const prefix = type === 'credit_note' ? 'CN' : 'DN';
      const count = debitCreditNotes.filter((n) => n.type === type).length + 1;
      const noteNumber = `${prefix}-2026-${count.toString().padStart(4, '0')}`;

      const newNote = await createDebitCreditNote({
        noteNumber,
        type,
        partyType,
        partyId: selectedPartyId,
        partyName: currentParty ? currentParty.nameAr : (partyType === 'customer' ? 'عميل عام' : 'مورد عام'),
        partyVatNumber: currentParty?.vatNumber,
        partyCrNumber: currentParty?.crNumber,
        issueDate,
        issueTime: new Date().toTimeString().split(' ')[0],
        originalInvoiceId: originalInvoice?.id,
        originalInvoiceNumber: originalInvoice?.invoiceNumber,
        originalInvoiceDate: originalInvoice?.issueDate,
        reason,
        reasonTextAr: customReasonText || 'تسوية محاسبية معتمدة',
        items,
        subtotal: Number(subtotal.toFixed(2)),
        discountTotal: Number(discountTotal.toFixed(2)),
        taxableAmount: Number(taxableAmount.toFixed(2)),
        vatTotal: Number(vatTotal.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2)),
        affectInventory,
        refundMethod,
        status: 'issued',
        notes: notes.trim() || undefined,
      });

      if (onSuccess) onSuccess(newNote);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'حدث خطأ أثناء حفظ الإشعار وتوليد القيد المحاسبي');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white border border-slate-200 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${type === 'credit_note' ? 'bg-rose-600/30 text-rose-400' : 'bg-amber-600/30 text-amber-400'}`}>
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg">
                {type === 'credit_note' ? 'إصدار إشعار دائن ضريبي (Credit Note)' : 'إصدار إشعار مدين ضريبي (Debit Note)'}
              </h2>
              <p className="text-xs text-slate-400">
                متوافق مع هيئة الزكاة والضريبة والجمارك (ZATCA) مع توليد القيود المزدوجة آلياً
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

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Type Toggle & Primary Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {/* Note Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع الإشعار:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('credit_note')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
                    type === 'credit_note'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>إشعار دائن (تخفيض)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('debit_note')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
                    type === 'debit_note'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>إشعار مدين (زيادة/مورد)</span>
                </button>
              </div>
            </div>

            {/* Target Party Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الطرف المعني:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPartyType('customer');
                    setSelectedPartyId('');
                    setSelectedInvoiceId('');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
                    partyType === 'customer'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>عميل (Customer)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPartyType('supplier');
                    setSelectedPartyId('');
                    setSelectedInvoiceId('');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition ${
                    partyType === 'supplier'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>مورد (Supplier)</span>
                </button>
              </div>
            </div>

            {/* Issue Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">تاريخ الإصدار:</label>
              <div className="relative">
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  required
                />
              </div>
            </div>
          </div>

          {/* Party and Linked Invoice Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Party Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {partyType === 'customer' ? 'اختيار العميل المستفيد:' : 'اختيار المورد المستفيد:'} *
              </label>
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                required
              >
                <option value="">-- اختر من القائمة --</option>
                {partyList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nameAr} {p.vatNumber ? `(ضريبي: ${p.vatNumber})` : ''} - الرصيد: {formatSAR(p.balance)}
                  </option>
                ))}
              </select>
            </div>

            {/* Original Invoice Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ربط بالفاتورة الأصلية (ZATCA Reference Invoice):
              </label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              >
                <option value="">-- اختياري: اختر فاتورة لتعبئة البنود تلقائياً --</option>
                {partyType === 'customer'
                  ? salesInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - {inv.customerName} ({inv.issueDate}) - الإجمالي: {formatSAR(inv.totalAmount)}
                      </option>
                    ))
                  : purchaseInvoices.map((pur) => (
                      <option key={pur.id} value={pur.id}>
                        {pur.invoiceNumber} - {pur.supplierName} ({pur.issueDate}) - الإجمالي: {formatSAR(pur.totalAmount)}
                      </option>
                    ))}
              </select>
            </div>
          </div>

          {/* Reason & ZATCA Settlement Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {/* Reason Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">سبب الإصدار (ZATCA):</label>
              <select
                value={reason}
                onChange={(e) => handleReasonChange(e.target.value as NoteReason)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              >
                <option value="goods_return">مردودات بضاعة تالفة أو غير مطابقة</option>
                <option value="post_sale_discount">خصم تجاري / ترويجي بعد البيع</option>
                <option value="invoice_correction">تصحيح خطأ أو مبالغ زائدة بالفاتورة</option>
                <option value="price_adjustment">تعديل في أسعار الأصناف المتفق عليها</option>
                <option value="damaged_goods">تعويض بضاعة تالفة</option>
                <option value="cancelled_service">إلغاء خدمة أو فسخ بند تعاقدي</option>
                <option value="other">أسباب أخرى</option>
              </select>
            </div>

            {/* Custom Reason Text */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">البيان والتفصيل بالعربية:</label>
              <input
                type="text"
                value={customReasonText}
                onChange={(e) => setCustomReasonText(e.target.value)}
                placeholder="أدخل نص البيان التوضيحي..."
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                required
              />
            </div>

            {/* Settlement / Refund Method */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">طريقة التسوية المالية:</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as any)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              >
                <option value="account_balance">تسوية على كشف الحساب (رصيد آجل)</option>
                <option value="cash">نقداً من الصندوق الرئيسي (الخزينة)</option>
                <option value="bank_transfer">تحويل بنكي - مصرف الراجحي</option>
                <option value="mada">بطاقة مدى / نقاط البيع POS</option>
              </select>
            </div>
          </div>

          {/* Inventory Effect Toggle */}
          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-200 rounded-lg text-slate-700">
                <Boxes className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">الأثر المباشر على المخزون والمستودع</p>
                <p className="text-[11px] text-slate-500">
                  {type === 'credit_note'
                    ? 'عند تفعيل الخيار، سيتم إعادة الكميات المرتجعة إلى رصيد المخزون تلقائياً وتسجيل حركة مستودع'
                    : 'عند تفعيل الخيار، سيتم خصم الكميات المرتجعة للمورد من رصيد المستودع'}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={affectInventory}
                onChange={(e) => setAffectInventory(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
            </label>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-700" />
                <span>أصناف وبنود الإشعار (Line Items):</span>
              </h3>
              <button
                type="button"
                onClick={addItemRow}
                className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة بند جديد</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 w-10 text-center">#</th>
                    <th className="p-2.5 min-w-[180px]">اسم الصنف / البيان</th>
                    <th className="p-2.5 w-20 text-center">الكمية</th>
                    <th className="p-2.5 w-20">الوحدة</th>
                    <th className="p-2.5 w-28">السعر غير شامل</th>
                    <th className="p-2.5 w-20">الخصم</th>
                    <th className="p-2.5 w-20 text-center">الضريبة</th>
                    <th className="p-2.5 w-24">مبلغ الضريبة</th>
                    <th className="p-2.5 w-28">الإجمالي</th>
                    <th className="p-2.5 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-2">
                        <div className="space-y-1">
                          <select
                            value={item.itemId || ''}
                            onChange={(e) => handleItemChange(idx, 'itemId', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 mb-1"
                          >
                            <option value="">-- صنف من المستودع --</option>
                            {inventory.map((inv) => (
                              <option key={inv.id} value={inv.id}>
                                {inv.nameAr} (مخزون: {inv.currentStock})
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={item.nameAr}
                            onChange={(e) => handleItemChange(idx, 'nameAr', e.target.value)}
                            placeholder="وصف البند أو الصنف..."
                            className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800"
                            required
                          />
                        </div>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-center font-mono"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discount || 0}
                          onChange={(e) => handleItemChange(idx, 'discount', parseFloat(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono text-slate-600"
                        />
                      </td>
                      <td className="p-2 text-center font-mono">15%</td>
                      <td className="p-2 font-mono text-slate-700">{formatSAR(item.vatAmount, false)}</td>
                      <td className="p-2 font-mono font-bold text-slate-900">{formatSAR(item.totalWithVat, false)}</td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          disabled={items.length <= 1}
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals & Summary Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900 text-white p-5 rounded-2xl">
            <div>
              <p className="text-xs text-slate-400 mb-1">تفقيط المبلغ الإجمالي بالعربية:</p>
              <p className="text-sm font-bold text-amber-300 leading-relaxed">
                {tafqeetArabic(totalAmount)}
              </p>
              <div className="mt-3 text-xs text-slate-400 space-y-1">
                <p>• سيتم قيد العملية تلقائياً في دفتر اليومية العامة وحسابات الأستاذ.</p>
                <p>• سيتم احتساب الأثر الضريبي في إقرار ضريبة القيمة المضافة لـ ZATCA.</p>
              </div>
            </div>

            <div className="space-y-2 text-xs border-t sm:border-t-0 sm:border-r sm:border-slate-800 pt-3 sm:pt-0 sm:pr-6">
              <div className="flex justify-between text-slate-400">
                <span>المجموع قبل الخصم والضريبة:</span>
                <span className="font-mono font-semibold text-white">{formatSAR(subtotal)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>إجمالي الخصم الممنوح:</span>
                  <span className="font-mono font-semibold">-{formatSAR(discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>المبلغ الخاضع للضريبة (15%):</span>
                <span className="font-mono font-semibold text-white">{formatSAR(taxableAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>مبلغ ضريبة القيمة المضافة (15%):</span>
                <span className="font-mono font-bold">{formatSAR(vatTotal)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-white border-t border-slate-800 pt-2">
                <span>الإجمالي الصافي للإشعار:</span>
                <span className="font-mono text-lg text-emerald-400">{formatSAR(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Notes textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات إضافية:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="أي تفاصيل أو ملاحظات تعاقدية..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            ></textarea>
          </div>

          {/* Form Actions */}
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
                type === 'credit_note' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الإصدار والحفظ...' : 'إصدار الإشعار وحفظ القيد المحاسبي'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
