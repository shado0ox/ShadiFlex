import { describe, it, expect, beforeEach } from 'vitest';
import { renderAccountingHook, act } from './testUtils';

describe('اختبارات سندات القبض والصرف وعكس السندات (Vouchers & Reversal Tests)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('يجب إنشاء سند قبض مرتبط بفاتورة مبيعات وتحديث حالة السداد وتوليد قيد القبض', async () => {
    const { result } = renderAccountingHook();

    const customer = result.current.customers[0];
    const item = result.current.inventory[0];
    let invoiceId = '';

    await act(async () => {
      const inv = await result.current.createSalesInvoice({
        invoiceNumber: '',
        type: 'tax_invoice',
        issueDate: '2026-06-15',
        issueTime: '12:00:00',
        customerId: customer.id,
        customerName: customer.nameAr,
        items: [
          {
            id: 'item_1',
            itemId: item.id,
            nameAr: item.nameAr,
            quantity: 1,
            unit: item.unit,
            unitPrice: 1000,
            discount: 0,
            vatRate: 0.15,
            vatAmount: 150,
            subtotal: 1000,
            totalWithVat: 1150,
          },
        ],
        subtotal: 1000,
        discountTotal: 0,
        taxableAmount: 1000,
        vatTotal: 150,
        totalAmount: 1150,
        paidAmount: 0,
        remainingAmount: 1150,
        paymentStatus: 'unpaid',
        paymentMethod: 'credit',
        status: 'posted',
      });
      invoiceId = inv.id;
    });

    const targetInvoice = result.current.salesInvoices.find((i) => i.id === invoiceId)!;
    expect(targetInvoice).toBeDefined();
    expect(targetInvoice.remainingAmount).toBe(1150);

    const cashAccount = result.current.accounts.find((a) => a.code === '110101')!;
    const receivablesAccount = result.current.accounts.find((a) => a.code === '110201') || result.current.accounts.find((a) => a.type === 'asset' && a.isTransactional)!;

    // 2. Issue a Receipt Voucher for partial amount 600
    let voucherId = '';
    await act(async () => {
      const vch = await result.current.createVoucher({
        voucherNumber: '',
        type: 'receipt',
        date: '2026-06-16',
        amount: 600,
        paymentMethod: 'bank_transfer',
        partyType: 'customer',
        partyId: customer.id,
        partyName: customer.nameAr,
        debitAccountId: cashAccount.id,
        debitAccountCode: cashAccount.code,
        debitAccountNameAr: cashAccount.nameAr,
        creditAccountId: receivablesAccount.id,
        creditAccountCode: receivablesAccount.code,
        creditAccountNameAr: receivablesAccount.nameAr,
        relatedInvoiceId: targetInvoice.id,
        relatedInvoiceNumber: targetInvoice.invoiceNumber,
        description: 'دفعة أولى من الحساب',
        status: 'posted',
      });
      voucherId = vch.id;
    });

    const createdVoucher = result.current.vouchers.find((v) => v.id === voucherId);
    expect(createdVoucher).toBeDefined();
    expect(createdVoucher?.amount).toBe(600);
    expect(createdVoucher?.status).toBe('posted');

    // 3. Verify Invoice status updated to partial
    const updatedInvoice = result.current.salesInvoices.find((i) => i.id === invoiceId);
    expect(updatedInvoice?.paidAmount).toBe(600);
    expect(updatedInvoice?.remainingAmount).toBe(550);
    expect(updatedInvoice?.paymentStatus).toBe('partial');

    // 4. Verify balanced journal entry created
    const journalEntry = result.current.journalEntries.find(
      (j) => j.referenceNumber === createdVoucher?.voucherNumber || j.id === createdVoucher?.journalEntryId
    );
    expect(journalEntry).toBeDefined();
    expect(journalEntry?.isBalanced).toBe(true);
    expect(journalEntry?.totalDebit).toBe(600);
  });

  it('يجب إنشاء سند صرف مرتبط بفاتورة مشتريات وتحديث حالة السداد', async () => {
    const { result } = renderAccountingHook();

    const supplier = result.current.suppliers[0];
    const item = result.current.inventory[0];
    let purchaseId = '';

    await act(async () => {
      const pur = await result.current.createPurchaseInvoice({
        invoiceNumber: '',
        issueDate: '2026-06-16',
        supplierId: supplier.id,
        supplierName: supplier.nameAr,
        supplierInvoiceNumber: 'SUP-4412',
        items: [
          {
            id: 'pur_item_1',
            itemId: item.id,
            nameAr: item.nameAr,
            quantity: 2,
            unit: item.unit,
            unitPrice: 400,
            discount: 0,
            vatRate: 0.15,
            vatAmount: 120,
            subtotal: 800,
            totalWithVat: 920,
          },
        ],
        subtotal: 800,
        taxableAmount: 800,
        vatTotal: 120,
        totalAmount: 920,
        paidAmount: 0,
        paymentStatus: 'unpaid',
        paymentMethod: 'credit',
        status: 'posted',
      });
      purchaseId = pur.id;
    });

    const targetPur = result.current.purchaseInvoices.find((p) => p.id === purchaseId)!;
    expect(targetPur).toBeDefined();

    const cashAccount = result.current.accounts.find((a) => a.code === '110101')!;
    const payableAccount = result.current.accounts.find((a) => a.code === '210101') || result.current.accounts.find((a) => a.type === 'liability' && a.isTransactional)!;

    // Issue Payment Voucher for full amount 920
    let voucherId = '';
    await act(async () => {
      const vch = await result.current.createVoucher({
        voucherNumber: '',
        type: 'payment',
        date: '2026-06-17',
        amount: 920,
        paymentMethod: 'cash',
        partyType: 'supplier',
        partyId: supplier.id,
        partyName: supplier.nameAr,
        debitAccountId: payableAccount.id,
        debitAccountCode: payableAccount.code,
        debitAccountNameAr: payableAccount.nameAr,
        creditAccountId: cashAccount.id,
        creditAccountCode: cashAccount.code,
        creditAccountNameAr: cashAccount.nameAr,
        relatedInvoiceId: targetPur.id,
        relatedInvoiceNumber: targetPur.invoiceNumber,
        description: 'سداد كامل قيمة الفاتورة',
        status: 'posted',
      });
      voucherId = vch.id;
    });

    const updatedPur = result.current.purchaseInvoices.find((p) => p.id === purchaseId);
    expect(updatedPur?.paidAmount).toBe(920);
    expect(updatedPur?.paymentStatus).toBe('paid');
  });

  it('يجب أن ينجح عكس سند مقبوض مرحّل وتوليد قيد عكسي متوازن واسترجاع رصيد الفاتورة', async () => {
    const { result } = renderAccountingHook();

    const customer = result.current.customers[0];
    const item = result.current.inventory[0];
    let invoiceId = '';

    await act(async () => {
      const inv = await result.current.createSalesInvoice({
        invoiceNumber: '',
        type: 'tax_invoice',
        issueDate: '2026-06-18',
        issueTime: '11:00:00',
        customerId: customer.id,
        customerName: customer.nameAr,
        items: [
          {
            id: 'it_1',
            itemId: item.id,
            nameAr: item.nameAr,
            quantity: 1,
            unit: item.unit,
            unitPrice: 500,
            discount: 0,
            vatRate: 0.15,
            vatAmount: 75,
            subtotal: 500,
            totalWithVat: 575,
          },
        ],
        subtotal: 500,
        discountTotal: 0,
        taxableAmount: 500,
        vatTotal: 75,
        totalAmount: 575,
        paidAmount: 0,
        remainingAmount: 575,
        paymentStatus: 'unpaid',
        paymentMethod: 'credit',
        status: 'posted',
      });
      invoiceId = inv.id;
    });

    const targetInvoice = result.current.salesInvoices.find((i) => i.id === invoiceId)!;
    const cashAccount = result.current.accounts.find((a) => a.code === '110101')!;
    const receivablesAccount = result.current.accounts.find((a) => a.code === '110201') || result.current.accounts.find((a) => a.type === 'asset' && a.isTransactional)!;

    let voucherId = '';
    await act(async () => {
      const vch = await result.current.createVoucher({
        voucherNumber: '',
        type: 'receipt',
        date: '2026-06-18',
        amount: 575,
        paymentMethod: 'bank_transfer',
        partyType: 'customer',
        partyId: customer.id,
        partyName: customer.nameAr,
        debitAccountId: cashAccount.id,
        debitAccountCode: cashAccount.code,
        debitAccountNameAr: cashAccount.nameAr,
        creditAccountId: receivablesAccount.id,
        creditAccountCode: receivablesAccount.code,
        creditAccountNameAr: receivablesAccount.nameAr,
        relatedInvoiceId: targetInvoice.id,
        relatedInvoiceNumber: targetInvoice.invoiceNumber,
        description: 'سداد كامل الفاتورة',
        status: 'posted',
      });
      voucherId = vch.id;
    });

    expect(result.current.salesInvoices.find((i) => i.id === invoiceId)?.paymentStatus).toBe('paid');

    // Perform Reversal of the Voucher
    await act(async () => {
      await result.current.reversePostedDocument('voucher', voucherId, 'عكس السند لخطأ في تسجيل الإيداع البنكي');
    });

    const reversedVoucher = result.current.vouchers.find((v) => v.id === voucherId);
    expect(reversedVoucher?.status).toBe('reversed');
    expect(reversedVoucher?.reversalReason).toBe('عكس السند لخطأ في تسجيل الإيداع البنكي');

    // Invoice status should revert back to unpaid and remainingAmount restored
    const invAfterReversal = result.current.salesInvoices.find((i) => i.id === invoiceId);
    expect(invAfterReversal?.paidAmount).toBe(0);
    expect(invAfterReversal?.remainingAmount).toBe(575);
    expect(invAfterReversal?.paymentStatus).toBe('unpaid');

    // Reversal Journal Entry check
    const revEntry = result.current.journalEntries.find(
      (j) => j.referenceNumber === reversedVoucher?.voucherNumber && j.isReversal
    );
    expect(revEntry).toBeDefined();
    expect(revEntry?.isBalanced).toBe(true);
  });
});
