import { describe, it, expect, beforeEach } from 'vitest';
import { renderAccountingHook, act } from './testUtils';

describe('اختبارات عكس الفواتير والمستندات المرحّلة (Document Reversals Tests)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('يجب عكس فاتورة مبيعات مرحّلة بنجاح واسترجاع المخزون وتوليد قيد عكسي متوازن', async () => {
    const { result } = renderAccountingHook();

    const customer = result.current.customers[0];
    const item = result.current.inventory[0];
    const initialStock = item.currentStock;

    let invoiceId = '';

    await act(async () => {
      const inv = await result.current.createSalesInvoice({
        invoiceNumber: '',
        type: 'tax_invoice',
        issueDate: '2026-06-20',
        issueTime: '14:00:00',
        customerId: customer.id,
        customerName: customer.nameAr,
        items: [
          {
            id: 'it_rev_1',
            itemId: item.id,
            nameAr: item.nameAr,
            quantity: 3,
            unit: item.unit,
            unitPrice: 150,
            discount: 0,
            vatRate: 0.15,
            vatAmount: 67.5,
            subtotal: 450,
            totalWithVat: 517.5,
          },
        ],
        subtotal: 450,
        discountTotal: 0,
        taxableAmount: 450,
        vatTotal: 67.5,
        totalAmount: 517.5,
        paidAmount: 0,
        remainingAmount: 517.5,
        paymentStatus: 'unpaid',
        paymentMethod: 'credit',
        status: 'posted',
      });
      invoiceId = inv.id;
    });

    // Verify stock deducted
    expect(result.current.inventory.find((i) => i.id === item.id)?.currentStock).toBe(initialStock - 3);

    // Perform Reversal
    await act(async () => {
      await result.current.reversePostedDocument('sales_invoice', invoiceId, 'عكس الفاتورة لخطأ في بيانات العميل');
    });

    const reversedInvoice = result.current.salesInvoices.find((i) => i.id === invoiceId);
    expect(reversedInvoice?.status).toBe('reversed');

    // Verify stock returned back to original
    expect(result.current.inventory.find((i) => i.id === item.id)?.currentStock).toBe(initialStock);

    // Verify reversal journal entry exists and is balanced
    const revEntry = result.current.journalEntries.find(
      (j) => j.referenceNumber === reversedInvoice?.invoiceNumber && j.isReversal
    );
    expect(revEntry).toBeDefined();
    expect(revEntry?.isBalanced).toBe(true);
    expect(revEntry?.totalDebit).toBe(517.5);
    expect(revEntry?.totalCredit).toBe(517.5);
  });

  it('يجب عكس فاتورة مشتريات مرحّلة بنجاح وخصم المخزون المسترجع وتوليد قيد عكسي', async () => {
    const { result } = renderAccountingHook();

    const supplier = result.current.suppliers[0];
    const item = result.current.inventory[0];
    const initialStock = item.currentStock;

    let purchaseId = '';

    await act(async () => {
      const pur = await result.current.createPurchaseInvoice({
        invoiceNumber: '',
        issueDate: '2026-06-20',
        supplierId: supplier.id,
        supplierName: supplier.nameAr,
        supplierInvoiceNumber: 'SUP-9923',
        items: [
          {
            id: 'it_pur_rev_1',
            itemId: item.id,
            nameAr: item.nameAr,
            quantity: 4,
            unit: item.unit,
            unitPrice: 80,
            discount: 0,
            vatRate: 0.15,
            vatAmount: 48,
            subtotal: 320,
            totalWithVat: 368,
          },
        ],
        subtotal: 320,
        taxableAmount: 320,
        vatTotal: 48,
        totalAmount: 368,
        paidAmount: 0,
        paymentStatus: 'unpaid',
        paymentMethod: 'credit',
        status: 'posted',
      });
      purchaseId = pur.id;
    });

    expect(result.current.inventory.find((i) => i.id === item.id)?.currentStock).toBe(initialStock + 4);

    // Reverse Purchase Invoice
    await act(async () => {
      await result.current.reversePostedDocument('purchase_invoice', purchaseId, 'إلغاء أمر التوريد مع المورد');
    });

    const reversedPur = result.current.purchaseInvoices.find((p) => p.id === purchaseId);
    expect(reversedPur?.status).toBe('reversed');

    // Stock returns to initial
    expect(result.current.inventory.find((i) => i.id === item.id)?.currentStock).toBe(initialStock);

    // Reversal entry
    const revEntry = result.current.journalEntries.find(
      (j) => j.referenceNumber === reversedPur?.invoiceNumber && j.isReversal
    );
    expect(revEntry).toBeDefined();
    expect(revEntry?.isBalanced).toBe(true);
    expect(revEntry?.totalDebit).toBe(368);
  });
});
