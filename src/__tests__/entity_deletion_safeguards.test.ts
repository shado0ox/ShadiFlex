import { describe, it, expect, beforeEach } from 'vitest';
import { renderAccountingHook, act } from './testUtils';

describe('اختبارات منع حذف الحسابات والعملاء المرتبطين (Entity Deletion Safeguards Tests)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('يجب منع حذف حساب مالي مستخدم في قيود يومية أو ذو رصيد مالي', () => {
    const { result } = renderAccountingHook();

    // Cash account has transactions
    const cashAccount = result.current.accounts.find((a) => a.code === '1101')!;
    const check = result.current.checkAccountDependencies(cashAccount.id);

    expect(check.canDelete).toBe(false);
    expect(check.reason).toBeDefined();
    expect(check.details?.isSystemPrimary || check.details?.childrenCount || check.details?.entriesCount).toBeTruthy();

    expect(() => {
      act(() => {
        result.current.deleteAccount(cashAccount.id);
      });
    }).toThrow(/لا يمكن حذف/);
  });

  it('يجب منع حذف حساب رئيسي يمتلك حسابات فرعية (Parent Account)', () => {
    const { result } = renderAccountingHook();

    // Assets parent account (1 - الأصول)
    const parentAccount = result.current.accounts.find((a) => a.code === '1')!;
    const check = result.current.checkAccountDependencies(parentAccount.id);

    expect(check.canDelete).toBe(false);
    expect(check.reason).toBeDefined();
    expect(check.details?.childrenCount).toBeGreaterThan(0);

    expect(() => {
      act(() => {
        result.current.deleteAccount(parentAccount.id);
      });
    }).toThrow(/لا يمكن حذف/);
  });

  it('يجب السماح بحذف حساب مالي جديد غير مستخدم وبدون قيود أو حسابات فرعية', () => {
    const { result } = renderAccountingHook();

    const parentExpense = result.current.accounts.find((a) => a.code === '5') || result.current.accounts.find((a) => a.type === 'expense')!;

    let newAccId = '';
    act(() => {
      const acc = result.current.addAccount({
        code: '5999',
        nameAr: 'حساب مصروفات متفرقة للاختبار',
        nameEn: 'Miscellaneous Test Expense',
        type: 'expense',
        nature: 'debit',
        level: 3,
        parentId: parentExpense.id,
        isTransactional: true,
        description: 'حساب مؤقت للاختبار',
        isActive: true,
      });
      newAccId = acc.id;
    });

    expect(result.current.accounts.some((a) => a.id === newAccId)).toBe(true);

    const check = result.current.checkAccountDependencies(newAccId);
    expect(check.canDelete).toBe(true);

    act(() => {
      result.current.deleteAccount(newAccId);
    });

    expect(result.current.accounts.some((a) => a.id === newAccId)).toBe(false);
  });

  it('يجب منع حذف عميل مرتبط بفواتير مبيعات أو سندات قبض', () => {
    const { result } = renderAccountingHook();

    // Customer with existing invoices
    const customer = result.current.customers[0];
    const check = result.current.checkCustomerDependencies(customer.id);

    expect(check.canDelete).toBe(false);
    expect(check.reason).toBeDefined();
    expect(check.details?.invoicesCount || check.details?.vouchersCount || check.details?.hasBalance).toBeTruthy();

    expect(() => {
      act(() => {
        result.current.deleteCustomer(customer.id);
      });
    }).toThrow(/لا يمكن حذف/);
  });

  it('يجب السماح بحذف عميل جديد غير مرتبط بأي فواتير أو حركات مالية', () => {
    const { result } = renderAccountingHook();

    let newCustId = '';
    act(() => {
      const cust = result.current.addCustomer({
        nameAr: 'عميل جديد تجريبي غير مرتبط',
        nameEn: 'Unlinked Test Customer',
        phone: '0501112233',
        email: 'test.customer@example.com',
        vatNumber: '300000000000003',
        crNumber: '1010101010',
        address: {
          city: 'الرياض',
          district: 'الملز',
          street: 'شارع الجامعة',
          buildingNumber: '1234',
          postalCode: '12345',
        },
        isActive: true,
      });
      newCustId = cust.id;
    });

    const check = result.current.checkCustomerDependencies(newCustId);
    expect(check.canDelete).toBe(true);

    act(() => {
      result.current.deleteCustomer(newCustId);
    });

    expect(result.current.customers.some((c) => c.id === newCustId)).toBe(false);
  });
});
