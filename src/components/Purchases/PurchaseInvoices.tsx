import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { PaymentMethod, PaymentStatus, InvoiceItem } from '../../types/accounting';
import { formatSAR, tafqeetArabic } from '../../utils/currency';
import { X, Plus, Trash2, CheckCircle2, ShoppingCart, Truck } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PurchaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (purchaseNumber: string) => void;
}

export const PurchaseFormModal: React.FC<PurchaseFormModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { suppliers, inventory, purchaseInvoices, createPurchaseInvoice } = useAccounting();

  const nextPurchaseNumber = `PUR-2026-${(purchaseInvoices.length + 1).toString().padStart(4, '0')}`;

  const [invoiceNumber, setInvoiceNumber] = useState(nextPurchaseNumber);
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);

  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierVatNumber, setSupplierVatNumber] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: `pur_row_${Date.now()}`,
      itemId: inventory[0]?.id || '',
      nameAr: inventory[0]?.nameAr || 'صنف مشتريات',
      quantity: 5,
      unit: inventory[0]?.unit || 'قطعة',
      unitPrice: inventory[0]?.purchasePrice || 100,
      discount: 0,
      vatRate: 0.15,
      subtotal: (inventory[0]?.purchasePrice || 100) * 5,
      vatAmount: (inventory[0]?.purchasePrice || 100) * 5 * 0.15,
      totalWithVat: (inventory[0]?.purchasePrice || 100) * 5 * 1.15,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSupplierChange = (suppId: string) => {
    setSelectedSupplierId(suppId);
    const found = suppliers.find((s) => s.id === suppId);
    if (found) {
      setSupplierName(found.nameAr);
      setSupplierVatNumber(found.vatNumber || '');
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };

    if (field === 'itemId') {
      const selectedInv = inventory.find((i) => i.id === value);
      if (selectedInv) {
        current.nameAr = selectedInv.nameAr;
        current.unit = selectedInv.unit;
        current.unitPrice = selectedInv.purchasePrice;
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
        id: `pur_row_${Date.now()}_${items.length}`,
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

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const vatTotal = items.reduce((sum, item) => sum + item.vatAmount, 0);
  const totalAmount = subtotal + vatTotal;

  const currentPaid = paymentStatus === 'paid' ? totalAmount : paymentStatus === 'unpaid' ? 0 : paidAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!supplierName.trim()) {
      alert('يرجى تحديد أو إدخال اسم المورد');
      return;
    }

    setIsSubmitting(true);
    try {
      await createPurchaseInvoice({
        invoiceNumber,
        supplierInvoiceNumber: supplierInvoiceNumber || `SUPP-${invoiceNumber}`,
        issueDate,
        dueDate,
        supplierId: selectedSupplierId,
        supplierName,
        supplierVatNumber,
        items,
        subtotal,
        taxableAmount: subtotal,
        vatTotal,
        totalAmount,
        paymentMethod,
        paymentStatus,
        paidAmount: currentPaid,
        notes,
      });

      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.6 },
      });

      onSuccess(invoiceNumber);
      onClose();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ فاتورة المشتريات');
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
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">تسجيل فاتورة مشتريات وتوريد مخزون</h3>
              <p className="text-xs text-slate-500">إثبات مشتريات المواد والسلع، قيد ضريبة المدخلات 15%، وتحديث كميات وأسعار المخزون تلقائياً</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-right">
          {/* Top Meta */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">رقم الفاتورة الداخلي *</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">رقم فاتورة المورد *</label>
              <input
                type="text"
                value={supplierInvoiceNumber}
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                placeholder="مثال: SUP-88910"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">تاريخ الفاتورة *</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">تاريخ الاستحقاق</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Supplier Info */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-blue-600" />
              بيانات المورد
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">اختر من قائمة الموردين</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- مورد جديد / إدخال يدوي --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameAr} ({s.vatNumber ? `ضريبي: ${s.vatNumber}` : s.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">اسم المورد *</label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">الرقم الضريبي للمورد (15 رقماً)</label>
                <input
                  type="text"
                  value={supplierVatNumber}
                  onChange={(e) => setSupplierVatNumber(e.target.value)}
                  placeholder="300XXXXXXXXX003"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800">أصناف ومواد المشتريات</h4>
              <button
                type="button"
                onClick={addItemRow}
                className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800 font-bold bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة صنف</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 w-1/4">الصنف في المخزون</th>
                    <th className="p-2.5 w-20">الكمية</th>
                    <th className="p-2.5 w-24">الوحدة</th>
                    <th className="p-2.5 w-28">سعر التكلفة (قبل الضريبة)</th>
                    <th className="p-2.5 w-28">المبلغ الخاضع</th>
                    <th className="p-2.5 w-24">ضريبة المدخلات (15%)</th>
                    <th className="p-2.5 w-32">الإجمالي</th>
                    <th className="p-2.5 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="p-2">
                        <select
                          value={item.itemId || ''}
                          onChange={(e) => handleItemChange(index, 'itemId', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900"
                        >
                          <option value="">-- ربط بصنف مخزون --</option>
                          {inventory.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.nameAr} (متاح حالياً: {inv.currentStock})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
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
                      <td className="p-2 font-mono text-slate-700">{formatSAR(item.subtotal)}</td>
                      <td className="p-2 font-mono text-purple-700">{formatSAR(item.vatAmount)}</td>
                      <td className="p-2 font-mono font-bold text-slate-900">{formatSAR(item.totalWithVat)}</td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          className="p-1 rounded text-rose-500 hover:bg-rose-50"
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

          {/* Payment & Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800">سداد الفاتورة</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">طريقة السداد</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  >
                    <option value="bank_transfer">تحويل بنكي من حساب الشركة</option>
                    <option value="cash">نقداً من الخزينة</option>
                    <option value="credit">آجل (استحقاق مورد)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">حالة السداد</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  >
                    <option value="paid">مدفوعة بالكامل</option>
                    <option value="unpaid">غير مدفوعة (آجل)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-xs shadow-2xs">
              <div className="flex justify-between text-slate-600">
                <span>المبلغ الخاضع للضريبة:</span>
                <span className="font-mono">{formatSAR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-purple-700 font-bold">
                <span>ضريبة المدخلات المستردة (15%):</span>
                <span className="font-mono">{formatSAR(vatTotal)}</span>
              </div>
              <div className="border-t border-slate-100 pt-2 flex justify-between text-base font-extrabold text-slate-900">
                <span>إجمالي الفاتورة:</span>
                <span className="font-mono text-blue-600">{formatSAR(totalAmount)}</span>
              </div>
              <p className="text-[11px] text-slate-500">{tafqeetArabic(totalAmount)}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl transition shadow-xs disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ فاتورة المشتريات وإيداع المخزون'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const PurchaseInvoices: React.FC<{ onOpenNewPurchase: () => void }> = ({ onOpenNewPurchase }) => {
  const { purchaseInvoices } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = purchaseInvoices.filter(
    (p) =>
      p.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplierInvoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">فواتير المشتريات والتوريد</h2>
            <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-blue-200">
              {purchaseInvoices.length} فاتورة
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إدارة وتوثيق مشتريات المنشأة وضريبة المدخلات القابلة للاسترداد وتحديث المخزون
          </p>
        </div>

        <button
          onClick={onOpenNewPurchase}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition shadow-xs active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ تسجيل فاتورة مشتريات جديدة</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم الفاتورة، اسم المورد، رقم فاتورة المورد..."
            className="w-full sm:w-80 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">رقم الفاتورة</th>
                <th className="p-3.5">رقم فاتورة المورد</th>
                <th className="p-3.5">المورد</th>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5">المبلغ قبل الضريبة</th>
                <th className="p-3.5">ضريبة المدخلات (15%)</th>
                <th className="p-3.5">الإجمالي</th>
                <th className="p-3.5">حالة السداد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    لا توجد فواتير مشتريات مسجلة.
                  </td>
                </tr>
              ) : (
                filtered.map((pur) => (
                  <tr key={pur.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 font-mono font-bold text-slate-900">{pur.invoiceNumber}</td>
                    <td className="p-3.5 font-mono text-slate-500">{pur.supplierInvoiceNumber}</td>
                    <td className="p-3.5 font-bold text-slate-900">{pur.supplierName}</td>
                    <td className="p-3.5 text-slate-500">{pur.issueDate}</td>
                    <td className="p-3.5 font-mono">{formatSAR(pur.taxableAmount)}</td>
                    <td className="p-3.5 font-mono text-purple-700">{formatSAR(pur.vatTotal)}</td>
                    <td className="p-3.5 font-mono font-bold text-slate-900">{formatSAR(pur.totalAmount)}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          pur.paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {pur.paymentStatus === 'paid' ? 'مدفوعة' : 'غير مدفوعة (آجل)'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
