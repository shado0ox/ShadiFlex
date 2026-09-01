import { describe, it, expect, beforeEach } from 'vitest';
import { renderAccountingHook, act } from './testUtils';

describe('اختبارات فواتير المبيعات (Sales Invoices Tests)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('يجب إنشاء فاتورة مبيعات وحساب الضريبة والإجمالي وتوليد القيد وحركة المخزون تلقائياً', async () => {
    const { result } = renderAccountingHook();

    const customer = result.current.customers[0];
    const item = result.current.inventory[0];

    expect(customer).toBeDefined();
    expect(item).toBeDefined();

    const initialStock = item.currentStock;
    let createdInvoiceId = '';

    await act(async () => {
      const invoice = await result.current.createSalesInvoice({
        invoiceNumber: '',
        type: 'tax_invoice',
        issueDate: '2026-06-15',
        issueTime: '10:30:00',
        customerId: customer.id,
        customerName: customer.nameAr,
        customerVatNumber: customer.vatNumber,
        items: [
          {
            id: 'item_line_1',
            itemId: item.id,
            nameAr: item.nameAr,
            quantity: 2,
            unit: item.unit,
            unitPrice: 200,
            discount: 0,
            vatRate: 0.15,
            vatAmount: 60,
            subtotal: 400,
            totalWithVat: 460,
          },
        ],
        subtotal: 400,
        discountTotal: 0,
        taxableAmount: 400,
        vatTotal: 60,
        totalAmount: 460,
        paidAmount: 0,
        remainingAmount: 460,
        paymentStatus: 'unpaid',
        paymentMethod: 'credit',
        status: 'posted',
      });
      createdInvoiceId = invoice.id;
    });

    // 1. Verify Sales Invoice state
    const invoice = result.current.salesInvoices.find((i) => i.id === createdInvoiceId);
    expect(invoice).toBeDefined();
    expect(invoice?.totalAmount).toBe(460);
    expect(invoice?.vatTotal).toBe(60);
    expect(invoice?.status).toBe('posted');
    expect(invoice?.invoiceNumber).toBeDefined();

    // 2. Verify Stock Movement and Stock deduction
    const updatedItem = result.current.inventory.find((i) => i.id === item.id);
    expect(updatedItem?.currentStock).toBe(initialStock - 2);

    const movement = result.current.stockMovements.find(
      (m) => m.referenceNumber === invoice?.invoiceNumber
    );
    expect(movement).toBeDefined();
    expect(movement?.quantity).toBe(2);

    // 3. Verify Journal Entry was created and is balanced
    const autoJournal = result.current.journalEntries.find(
      (j) => j.referenceNumber === invoice?.invoiceNumber
    );
    expect(autoJournal).toBeDefined();
    expect(autoJournal?.isBalanced).toBe(true);
    expect(autoJournal?.totalDebit).toBe(460);
    expect(autoJournal?.totalCredit).toBe(460);
  });
});
