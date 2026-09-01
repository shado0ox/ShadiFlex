import { describe, it, expect, beforeEach } from 'vitest';
import { renderAccountingHook, act } from './testUtils';

describe('اختبارات الإشعارات الدائنة والمدينة (Credit & Debit Notes Tests)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('يجب إصدار إشعار دائن لفاتورة مبيعات واسترجاع البضاعة وتوليد القيد المحاسبي المتوازن', async () => {
    const { result } = renderAccountingHook();

    const customer = result.current.customers[0];
    const item = result.current.inventory[0];
    const initialStock = item.currentStock;

    let invoiceId = '';

    await act(async () => {
      const inv = await result.current.createSalesInvoice({
        invoiceNumber: '',
        type: 'tax_invoice',
        issueDate: '2026-06-21',
        issueTime: '10:00:00',
        customerId: customer.id,
        customerName: customer.nameAr,
        items: [
          {
            id: 'cn_inv_item',
            itemId: item.id,
            nameAr: item.nameAr,
            quantity: 2,
            unit: item.unit,
            unitPrice: 300,
            discount: 0,
            vatRate: 0.15,
            vatAmount: 90,
            subtotal: 600,
            totalWithVat: 690,
          },
        ],
        subtotal: 600,
        discountTotal: 0,
        taxableAmount: 600,
        vatTotal: 90,
        totalAmount: 690,
        paidAmount: 0,
        remainingAmount: 690,
        paymentStatus: 'unpaid',
        paymentMethod: 'credit',
        status: 'posted',
      });
      invoiceId = inv.id;
    });

    const stockAfterSale = result.current.inventory.find((i) => i.id === item.id)?.currentStock!;
    expect(stockAfterSale).toBe(initialStock - 2);

    const inv = result.current.salesInvoices.find((i) => i.id === invoiceId)!;

    // Issue Credit Note for 1 returned item with affectInventory: true
    let noteId = '';
    await act(async () => {
      const note = await result.current.createDebitCreditNote({
        noteNumber: '',
        type: 'credit_note',
        issueDate: '2026-06-22',
        issueTime: '11:00:00',
        originalInvoiceId: inv.id,
        originalInvoiceNumber: inv.invoiceNumber,
        partyType: 'customer',
        partyId: customer.id,
        partyName: customer.nameAr,
        affectInventory: true,
        reason: 'damaged_goods',
        reasonTextAr: 'تعويض بضاعة تالفة',
        items: [
          {
            id: 'cn_item_1',
            itemId: item.id,
            nameAr: item.nameAr,
            quantity: 1,
            unit: item.unit,
            unitPrice: 300,
            discount: 0,
            vatRate: 0.15,
            vatAmount: 45,
            subtotal: 300,
            totalWithVat: 345,
          },
        ],
        subtotal: 300,
        discountTotal: 0,
        taxableAmount: 300,
        vatTotal: 45,
        totalAmount: 345,
        refundMethod: 'account_balance',
        status: 'posted',
      });
      noteId = note.id;
    });

    const creditNote = result.current.debitCreditNotes.find((n) => n.id === noteId);
    expect(creditNote).toBeDefined();
    expect(creditNote?.totalAmount).toBe(345);
    expect(creditNote?.type).toBe('credit_note');
    expect(creditNote?.status).toBe('posted');

    // Stock should increase by 1 (returned item)
    const stockAfterReturn = result.current.inventory.find((i) => i.id === item.id)?.currentStock;
    expect(stockAfterReturn).toBe(stockAfterSale + 1);

    // Journal Entry should be balanced
    const entry = result.current.journalEntries.find(
      (j) => j.referenceNumber === creditNote?.noteNumber || j.id === creditNote?.journalEntryId
    );
    expect(entry).toBeDefined();
    expect(entry?.isBalanced).toBe(true);
    expect(entry?.totalDebit).toBe(345);
    expect(entry?.totalCredit).toBe(345);
  });

  it('يجب إصدار إشعار مدين لفاتورة مشتريات وخصم البضاعة المرتجعة وتوليد قيد متوازن', async () => {
    const { result } = renderAccountingHook();

    const supplier = result.current.suppliers[0];
    const item = result.current.inventory[0];
    const initialStock = item.currentStock;

    let purchaseId = '';

    await act(async () => {
      const pur = await result.current.createPurchaseInvoice({
        invoiceNumber: '',
        issueDate: '2026-06-22',
        supplierId: supplier.id,
        supplierName: supplier.nameAr,
        supplierInvoiceNumber: 'SUP-INV-8821',
        items: [
          {
            id: 'dn_pur_item',
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
      purchaseId = pur.id;
    });

    const stockAfterPurchase = result.current.inventory.find((i) => i.id === item.id)?.currentStock!;
    expect(stockAfterPurchase).toBe(initialStock + 5);

    const pur = result.current.purchaseInvoices.find((p) => p.id === purchaseId)!;

    // Issue Debit Note for 2 items returned to supplier with affectInventory: true
    let noteId = '';
    await act(async () => {
      const note = await result.current.createDebitCreditNote({
        noteNumber: '',
        type: 'debit_note',
        issueDate: '2026-06-23',
        issueTime: '12:00:00',
        originalInvoiceId: pur.id,
        originalInvoiceNumber: pur.invoiceNumber,
        partyType: 'supplier',
        partyId: supplier.id,
        partyName: supplier.nameAr,
        affectInventory: true,
        reason: 'goods_return',
        reasonTextAr: 'مردودات مشتريات',
        items: [
          {
            id: 'dn_item_1',
            itemId: item.id,
            nameAr: item.nameAr,
            quantity: 2,
            unit: item.unit,
            unitPrice: 100,
            discount: 0,
            vatRate: 0.15,
            vatAmount: 30,
            subtotal: 200,
            totalWithVat: 230,
          },
        ],
        subtotal: 200,
        discountTotal: 0,
        taxableAmount: 200,
        vatTotal: 30,
        totalAmount: 230,
        refundMethod: 'account_balance',
        status: 'posted',
      });
      noteId = note.id;
    });

    const debitNote = result.current.debitCreditNotes.find((n) => n.id === noteId);
    expect(debitNote).toBeDefined();
    expect(debitNote?.totalAmount).toBe(230);
    expect(debitNote?.type).toBe('debit_note');
    expect(debitNote?.status).toBe('posted');

    // Stock should decrease by 2 (returned to supplier)
    const stockAfterReturn = result.current.inventory.find((i) => i.id === item.id)?.currentStock;
    expect(stockAfterReturn).toBe(stockAfterPurchase - 2);

    // Journal Entry
    const entry = result.current.journalEntries.find(
      (j) => j.referenceNumber === debitNote?.noteNumber || j.id === debitNote?.journalEntryId
    );
    expect(entry).toBeDefined();
    expect(entry?.isBalanced).toBe(true);
    expect(entry?.totalDebit).toBe(230);
  });
});
