import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import {
  InvoiceType,
  PaymentMethod,
  PaymentStatus,
  InvoiceItem,
} from '../../types/accounting';
import { formatSAR, tafqeetArabic } from '../../utils/currency';
import { X, Plus, Trash2, CheckCircle2, ShieldCheck, Sparkles, Building, User } from 'lucide-react';
import confetti from 'canvas-confetti';

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newInvoiceNumber: string) => void;
}

export const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { customers, inventory, salesInvoices, createSalesInvoice } = useAccounting();

  // Generate default next invoice number
  const nextInvoiceNumber = `INV-2026-${(salesInvoices.length + 1).toString().padStart(4, '0')}`;

  const [invoiceNumber, setInvoiceNumber] = useState(nextInvoiceNumber);
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('simplified_tax_invoice');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Customer
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('عميل نقدي');
  const [customerVatNumber, setCustomerVatNumber] = useState('');
  const [customerCrNumber, setCustomerCrNumber] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mada');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Line Items
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: `row_${Date.now()}`,
      itemId: inventory[0]?.id || '',
      nameAr: inventory[0]?.nameAr || 'صنف جديد',
      quantity: 1,
      unit: inventory[0]?.unit || 'قطعة',
      unitPrice: inventory[0]?.salePrice || 100,
      discount: 0,
      vatRate: 0.15,
      subtotal: inventory[0]?.salePrice || 100,
      vatAmount: (inventory[0]?.salePrice || 100) * 0.15,
      totalWithVat: (inventory[0]?.salePrice || 100) * 1.15,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Handle Customer Selection
  const handleCustomerChange = (custId: string) => {
    setSelectedCustomerId(custId);
    const found = customers.find((c) => c.id === custId);
    if (found) {
      setCustomerName(found.nameAr);
      setCustomerVatNumber(found.vatNumber || '');
      setCustomerCrNumber(found.crNumber || '');
      setCustomerAddress(
        found.address ? `${found.address.street || ''}، ${found.address.city || ''}` : ''
      );
      if (found.vatNumber) {
        setInvoiceType('tax_invoice'); // Automatically switch to B2B tax invoice if VAT number exists
      }
    }
  };

  // Line Item Update
  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };

    if (field === 'itemId') {
      const selectedInv = inventory.find((i) => i.id === value);
      if (selectedInv) {
        current.nameAr = selectedInv.nameAr;
        current.unit = selectedInv.unit;
        current.unitPrice = selectedInv.salePrice;
      }
    }

    const qty = Number(current.quantity) || 0;
    const price = Number(current.unitPrice) || 0;
    const disc = Number(current.discount) || 0;
    const rate = Number(current.vatRate);

    const sub = Math.max(0, qty * price - disc);
    const vat = rate > 0 ? sub * rate : 0;
    const tot = sub + vat;

    current.subtotal = sub;
    current.vatAmount = vat;
    current.totalWithVat = tot;

    updated[index] = current;
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        id: `row_${Date.now()}_${items.length}`,
        itemId: '',
        nameAr: '',
        quantity: 1,
        unit: 'قطعة',
        unitPrice: 0,
        discount: 0,
        vatRate: 0.15,
        subtotal: 0,
        vatAmount: 0,
        totalWithVat: 0,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Totals Calculations
  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
  const discountTotal = items.reduce((sum, item) => sum + Number(item.discount || 0), 0);
  const taxableAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
  const vatTotal = items.reduce((sum, item) => sum + item.vatAmount, 0);
  const totalAmount = taxableAmount + vatTotal;

  const currentPaid = paymentStatus === 'paid' ? totalAmount : paymentStatus === 'unpaid' ? 0 : paidAmount;
  const remainingAmount = Math.max(0, totalAmount - currentPaid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!customerName.trim()) {
      alert('يرجى إدخال اسم العميل');
      return;
    }

    if (items.length === 0 || totalAmount <= 0) {
      alert('يرجى إضافة بنود للفاتورة وقيم صحيحة');
      return;
    }

    setIsSubmitting(true);
    try {
      await createSalesInvoice({
        invoiceNumber,
        issueDate,
        issueTime: new Date().toTimeString().split(' ')[0],
        dueDate,
        type: invoiceType,
        customerId: selectedCustomerId,
        customerName,
        customerVatNumber,
        customerCrNumber,
        customerAddress,
        items,
        subtotal,
        discountTotal,
        taxableAmount,
        vatTotal,
        totalAmount,
        paymentMethod,
        paymentStatus,
        paidAmount: currentPaid,
        remainingAmount,
        notes,
        status: 'issued',
      });

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });

      onSuccess(invoiceNumber);
      onClose();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إصدار الفاتورة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white border border-slate-200 w-full max-w-5xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">إصدار فاتورة مبيعات إلكترونية معتمدة (ZATCA)</h3>
              <p className="text-xs text-slate-500">إنشاء فاتورة ضريبية أو مبسطة مع تشفير فوري لرمز الاستجابة السريع TLV</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-right">
          {/* Invoice Type & Meta Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                نوع الفاتورة *
              </label>
              <select
                value={invoiceType}
                onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="simplified_tax_invoice">فاتورة ضريبية مبسطة (B2C أفراد)</option>
                <option value="tax_invoice">فاتورة ضريبية (B2B شركات ومنشآت)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                رقم الفاتورة *
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                تاريخ الإصدار *
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                تاريخ الاستحقاق
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Customer Selection & Details */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-600" />
              بيانات العميل (المشتري)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  اختر من قائمة العملاء
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">-- عميل نقدي / إدخال يدوي --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr} {c.vatNumber ? `(ضريبي: ${c.vatNumber})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  اسم العميل *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  الرقم الضريبي للعميل (15 رقماً) {invoiceType === 'tax_invoice' && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="text"
                  value={customerVatNumber}
                  onChange={(e) => setCustomerVatNumber(e.target.value)}
                  placeholder="300XXXXXXXXX003"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800">بنود الفاتورة والسلع / الخدمات</h4>
              <button
                type="button"
                onClick={addItemRow}
                className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة بند جديد</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 w-1/4">الصنف / الخدمة</th>
                    <th className="p-2.5 w-20">الكمية</th>
                    <th className="p-2.5 w-24">الوحدة</th>
                    <th className="p-2.5 w-28">السعر (غير شامل الضريبة)</th>
                    <th className="p-2.5 w-24">الخصم</th>
                    <th className="p-2.5 w-28">المبلغ الخاضع</th>
                    <th className="p-2.5 w-24">الضريبة (15%)</th>
                    <th className="p-2.5 w-32">الإجمالي</th>
                    <th className="p-2.5 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-2">
                        <div className="space-y-1">
                          <select
                            value={item.itemId || ''}
                            onChange={(e) => handleItemChange(index, 'itemId', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800"
                          >
                            <option value="">-- اختر من المخزون --</option>
                            {inventory.map((inv) => (
                              <option key={inv.id} value={inv.id}>
                                {inv.nameAr} ({inv.salePrice} ر.س | متوفر: {inv.currentStock})
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={item.nameAr}
                            onChange={(e) => handleItemChange(index, 'nameAr', e.target.value)}
                            placeholder="وصف البند بالعربي"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900"
                            required
                          />
                        </div>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 text-center font-mono"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 text-center"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 font-mono"
                          required
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discount}
                          onChange={(e) => handleItemChange(index, 'discount', Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 font-mono"
                        />
                      </td>
                      <td className="p-2 font-mono text-slate-700">
                        {formatSAR(item.subtotal)}
                      </td>
                      <td className="p-2 font-mono text-purple-700">
                        {formatSAR(item.vatAmount)}
                      </td>
                      <td className="p-2 font-mono font-bold text-slate-900">
                        {formatSAR(item.totalWithVat)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          className="p-1 rounded text-rose-500 hover:bg-rose-50 transition disabled:opacity-30"
                          disabled={items.length <= 1}
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

          {/* Payment & Totals Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {/* Payment Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800">طريقة وحالة الدفع</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">طريقة السداد</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="mada">مدى / نقاط بيع POS</option>
                    <option value="bank_transfer">تحويل بنكي (الراجحي / الأهلي)</option>
                    <option value="cash">نقداً (الصندوق)</option>
                    <option value="credit">آجل (استحقاق عميل)</option>
                    <option value="pos_card">بطاقة ائتمانية Visa/Master</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">حالة السداد</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="paid">مدفوعة بالكامل</option>
                    <option value="unpaid">غير مدفوعة (آجل)</option>
                    <option value="partial">مدفوعة جزئياً</option>
                  </select>
                </div>
              </div>

              {paymentStatus === 'partial' && (
                <div>
                  <label className="block text-xs text-slate-600 mb-1">المبلغ المدفوع الآن</label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    max={totalAmount}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-600 mb-1">ملاحظات الفاتورة</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="ملاحظات وشروط خاصة بالفاتورة..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-xs shadow-2xs">
              <div className="flex justify-between text-slate-600">
                <span>الإجمالي قبل الخصم:</span>
                <span className="font-mono">{formatSAR(subtotal)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>إجمالي الخصم:</span>
                  <span className="font-mono">- {formatSAR(discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-700 font-medium">
                <span>المبلغ الخاضع للضريبة:</span>
                <span className="font-mono">{formatSAR(taxableAmount)}</span>
              </div>
              <div className="flex justify-between text-purple-700 font-bold">
                <span>ضريبة القيمة المضافة (15%):</span>
                <span className="font-mono">{formatSAR(vatTotal)}</span>
              </div>

              <div className="border-t border-slate-100 pt-2 flex justify-between text-base font-extrabold text-slate-900">
                <span>الإجمالي شامل الضريبة:</span>
                <span className="font-mono text-emerald-600">{formatSAR(totalAmount)}</span>
              </div>

              {/* Tafqeet in Arabic */}
              <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-700 leading-relaxed font-sans">
                <span className="text-slate-400 block text-[10px]">المبلغ بالحروف العربية:</span>
                {tafqeetArabic(totalAmount)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl transition shadow-xs disabled:opacity-50 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الإصدار...' : 'حفظ وإصدار الفاتورة ZATCA'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
