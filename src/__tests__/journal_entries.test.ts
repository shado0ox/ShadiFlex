import { describe, it, expect, beforeEach } from 'vitest';
import { renderAccountingHook, act } from './testUtils';

describe('اختبارات قيود اليومية وتوازن الحسابات (Journal Entries & Balancing Tests)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('يجب أن ينجح إنشاء قيد يدوي متوازن بدقة وتحديث أرصدة الحسابات', async () => {
    const { result } = renderAccountingHook();

    const cashAccount = result.current.accounts.find((a) => a.code === '110101')!;
    const capitalAccount = result.current.accounts.find((a) => a.code === '3101')!;

    await act(async () => {
      await result.current.createManualJournalEntry({
        entryNumber: '',
        referenceType: 'manual',
        date: '2026-06-01',
        narrationAr: 'إيداع زيادة رأس المال نقداً بالخزينة',
        lines: [
          {
            id: 'line_1',
            accountId: cashAccount.id,
            accountCode: cashAccount.code,
            accountNameAr: cashAccount.nameAr,
            debit: 50000,
            credit: 0,
            description: 'إيداع الصندوق',
          },
          {
            id: 'line_2',
            accountId: capitalAccount.id,
            accountCode: capitalAccount.code,
            accountNameAr: capitalAccount.nameAr,
            debit: 0,
            credit: 50000,
            description: 'زيادة رأس مال الشركاء',
          },
        ],
        totalDebit: 50000,
        totalCredit: 50000,
        isBalanced: true,
        status: 'posted',
      });
    });

    const entryInState = result.current.journalEntries.find((e) => e.narrationAr === 'إيداع زيادة رأس المال نقداً بالخزينة');
    expect(entryInState).toBeDefined();
    expect(entryInState?.isBalanced).toBe(true);
    expect(entryInState?.totalDebit).toBe(50000);
    expect(entryInState?.totalCredit).toBe(50000);

    // Verify account balances updated
    const updatedCash = result.current.accounts.find((a) => a.id === cashAccount.id);
    const updatedCapital = result.current.accounts.find((a) => a.id === capitalAccount.id);

    expect(updatedCash?.balance).toBe(100000); // 50,000 initial + 50,000 new
    expect(updatedCapital?.balance).toBe(350000); // 300,000 initial + 50,000 new
  });

  it('يجب رفض إنشاء قيد غير متوازن وإطلاق خطأ عدم التوازن', async () => {
    const { result } = renderAccountingHook();

    const cashAccount = result.current.accounts.find((a) => a.code === '110101')!;
    const capitalAccount = result.current.accounts.find((a) => a.code === '3101')!;

    await expect(
      act(async () => {
        await result.current.createManualJournalEntry({
          entryNumber: '',
          referenceType: 'manual',
          date: '2026-06-01',
          narrationAr: 'قيد غير متوازن متعمد للاختبار',
          lines: [
            {
              id: 'line_1',
              accountId: cashAccount.id,
              accountCode: cashAccount.code,
              accountNameAr: cashAccount.nameAr,
              debit: 10000,
              credit: 0,
              description: 'إيداع غير مطابق',
            },
            {
              id: 'line_2',
              accountId: capitalAccount.id,
              accountCode: capitalAccount.code,
              accountNameAr: capitalAccount.nameAr,
              debit: 0,
              credit: 8000, // Unequal credit
              description: 'رأس مال',
            },
          ],
          totalDebit: 10000,
          totalCredit: 8000,
          isBalanced: false,
          status: 'posted',
        });
      })
    ).rejects.toThrow();
  });

  it('يجب رفض إنشاء قيد يحتوي على أطراف فارغة أو حسابات غير ترحيلية', async () => {
    const { result } = renderAccountingHook();

    // Main header account (e.g. 1000 or 1 - non transactional)
    const headerAccount = result.current.accounts.find((a) => !a.isTransactional) || {
      id: 'acc_header_1',
      code: '1',
      nameAr: 'الأصول (حساب رئيسي)',
      isTransactional: false,
      type: 'asset',
    };

    const cashAccount = result.current.accounts.find((a) => a.code === '1101') || result.current.accounts.find((a) => a.type === 'asset' && a.isTransactional)!;

    await expect(
      act(async () => {
        await result.current.createManualJournalEntry({
          entryNumber: '',
          referenceType: 'manual',
          date: '2026-06-01',
          narrationAr: 'قيد على حساب رئيسي غير مسموح بالترحيل عليه',
          lines: [
            {
              id: 'line_1',
              accountId: headerAccount.id,
              accountCode: headerAccount.code,
              accountNameAr: headerAccount.nameAr,
              debit: 2000,
              credit: 0,
              description: 'محاولة الترحيل على حساب رئيسي',
            },
            {
              id: 'line_2',
              accountId: cashAccount.id,
              accountCode: cashAccount.code,
              accountNameAr: cashAccount.nameAr,
              debit: 0,
              credit: 2000,
              description: 'صندوق',
            },
          ],
          totalDebit: 2000,
          totalCredit: 2000,
          isBalanced: true,
          status: 'posted',
        });
      })
    ).rejects.toThrow();
  });
});
