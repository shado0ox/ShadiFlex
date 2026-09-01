import { describe, it, expect, beforeEach } from 'vitest';
import { renderAccountingHook, act } from './testUtils';

describe('اختبارات إقفال وإعادة فتح الفترات المالية والتحقق الزمني (Fiscal Periods Closing & Reopen Tests)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('يجب منع إنشاء فواتير أو قيود في فترة مالية مقفلة', async () => {
    const { result } = renderAccountingHook();

    const customer = result.current.customers[0];
    const item = result.current.inventory[0];

    // Find May period (index 4 or month 5)
    const mayPeriod = result.current.financialPeriods.find((p) => p.periodNumber === 5 || p.startDate === '2026-05-01')!;
    expect(mayPeriod).toBeDefined();

    // 1. Close fiscal period for May 2026
    await act(async () => {
      await result.current.closeFinancialPeriod(mayPeriod.id, 'المدير المالي', 'إقفال شهري رسمي');
    });

    const updatedMay = result.current.financialPeriods.find((p) => p.id === mayPeriod.id);
    expect(updatedMay?.status).toBe('closed');
    expect(updatedMay?.closedBy).toBe('المدير المالي');

    // 2. Attempt to create a sales invoice in May 2026 -> MUST THROW
    await expect(
      act(async () => {
        await result.current.createSalesInvoice({
          invoiceNumber: '',
          type: 'tax_invoice',
          issueDate: '2026-05-15',
          issueTime: '10:00:00',
          customerId: customer.id,
          customerName: customer.nameAr,
          items: [
            {
              id: 'it_closed_1',
              itemId: item.id,
              nameAr: item.nameAr,
              quantity: 1,
              unit: item.unit,
              unitPrice: 100,
              discount: 0,
              vatRate: 0.15,
              vatAmount: 15,
              subtotal: 100,
              totalWithVat: 115,
            },
          ],
          subtotal: 100,
          discountTotal: 0,
          taxableAmount: 100,
          vatTotal: 15,
          totalAmount: 115,
          paidAmount: 0,
          remainingAmount: 115,
          paymentStatus: 'unpaid',
          paymentMethod: 'credit',
          status: 'posted',
        });
      })
    ).rejects.toThrow(/مقفل/);

    // 3. Attempt to create manual journal entry in May 2026 -> MUST THROW
    const cashAcc = result.current.accounts.find((a) => a.code === '110101')!;
    const capitalAcc = result.current.accounts.find((a) => a.code === '3101')!;

    await expect(
      act(async () => {
        await result.current.createManualJournalEntry({
          entryNumber: '',
          referenceType: 'manual',
          date: '2026-05-20',
          narrationAr: 'قيد إثبات في فترة مقفلة',
          lines: [
            {
              id: 'line_1',
              accountId: cashAcc.id,
              accountCode: cashAcc.code,
              accountNameAr: cashAcc.nameAr,
              debit: 500,
              credit: 0,
              description: 'حساب الصندوق',
            },
            {
              id: 'line_2',
              accountId: capitalAcc.id,
              accountCode: capitalAcc.code,
              accountNameAr: capitalAcc.nameAr,
              debit: 0,
              credit: 500,
              description: 'رأس المال',
            },
          ],
          totalDebit: 500,
          totalCredit: 500,
          isBalanced: true,
          status: 'posted',
        });
      })
    ).rejects.toThrow(/مقفل/);
  });

  it('يجب السماح بالترحيل بعد إعادة فتح الفترة المالية المقفلة', async () => {
    const { result } = renderAccountingHook();

    const junePeriod = result.current.financialPeriods.find((p) => p.periodNumber === 6 || p.startDate === '2026-06-01')!;
    expect(junePeriod).toBeDefined();

    // 1. Close period
    await act(async () => {
      await result.current.closeFinancialPeriod(junePeriod.id, 'المدير المالي');
    });

    expect(result.current.financialPeriods.find((p) => p.id === junePeriod.id)?.status).toBe('closed');

    // 2. Reopen period
    await act(async () => {
      await result.current.reopenFinancialPeriod(junePeriod.id, 'إعادة فتح لمراجعة قيود التدقيق الخارجي');
    });

    expect(result.current.financialPeriods.find((p) => p.id === junePeriod.id)?.status).toBe('open');

    // 3. Create journal entry in June 2026 -> SHOULD SUCCEED
    const cashAcc = result.current.accounts.find((a) => a.code === '110101')!;
    const capitalAcc = result.current.accounts.find((a) => a.code === '3101')!;

    await act(async () => {
      await result.current.createManualJournalEntry({
        entryNumber: '',
        referenceType: 'manual',
        date: '2026-06-10',
        narrationAr: 'قيد مسموح بعد فتح الفترة',
        lines: [
          {
            id: 'l1',
            accountId: cashAcc.id,
            accountCode: cashAcc.code,
            accountNameAr: cashAcc.nameAr,
            debit: 1000,
            credit: 0,
            description: 'نقدية بالصندوق',
          },
          {
            id: 'l2',
            accountId: capitalAcc.id,
            accountCode: capitalAcc.code,
            accountNameAr: capitalAcc.nameAr,
            debit: 0,
            credit: 1000,
            description: 'حساب رأس المال',
          },
        ],
        totalDebit: 1000,
        totalCredit: 1000,
        isBalanced: true,
        status: 'posted',
      });
    });

    const jv = result.current.journalEntries.find((j) => j.narrationAr === 'قيد مسموح بعد فتح الفترة');
    expect(jv).toBeDefined();
  });
});
