import { describe, it, expect, beforeEach } from 'vitest';
import { renderAccountingHook, act } from './testUtils';

describe('اختبارات فواتير المشتريات (Purchase Invoices Tests)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('يجب إنشاء فاتورة مشتريات وتحديث أرصدة المخزون وتوليد القيد المحاسبي المتوازن تلقائياً', async () => {
    const { result } = renderAccountingHook();

    const supplier = result.current.suppliers[0];
    const item = result.current.inventory[0];

    expect(supplier).toBeDefined();
    expect(item).toBeDefined();

    const initialStock = item.currentStock;
    let createdPurId = '';

    await act(async () => {
      const pur = await result.current.createPurchaseInvoice({
        invoiceNumber: '',
        issueDate: '2026-06-15',
        supplierId: supplier.id,
        supplierName: supplier.nameAr,
        supplierVatNumber: supplier.vatNumber,
        supplierInvoiceNumber: 'SUP-INV-9901',
        items: [
          {
            id: 'pur_line_1',
            itemId: item.id,
            nameAr: item.nameAr,
            quantity: 5,
            unit: item.unit,
            unitPrice: 100,
            discount: 0,
            vatRate: 0.15,
            vatAmount: 75,
            subtotal: 500,
            totalWithVat: 575,
          },
        ],
        subtotal: 500,
        taxableAmount: 500,
        vatTotal: 75,
        totalAmount: 575,
        paidAmount: 0,
        paymentStatus: 'unpaid',
        paymentMethod: 'credit',
        status: 'posted',
      });
      createdPurId = pur.id;
    });

    // 1. Verify Purchase Invoice
    const purchase = result.current.purchaseInvoices.find((p) => p.id === createdPurId);
    expect(purchase).toBeDefined();
    expect(purchase?.totalAmount).toBe(575);
    expect(purchase?.vatTotal).toBe(75);
    expect(purchase?.status).toBe('posted');

    // 2. Verify Stock added to inventory
    const updatedItem = result.current.inventory.find((i) => i.id === item.id);
    expect(updatedItem?.currentStock).toBe(initialStock + 5);

    // 3. Verify Journal Entry was created and is balanced
    const autoJournal = result.current.journalEntries.find(
      (j) => j.referenceNumber === purchase?.invoiceNumber
    );
    expect(autoJournal).toBeDefined();
    expect(autoJournal?.isBalanced).toBe(true);
    expect(autoJournal?.totalDebit).toBe(575);
    expect(autoJournal?.totalCredit).toBe(575);
  });
});
