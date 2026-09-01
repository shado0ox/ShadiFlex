import { describe, it, expect, beforeEach } from 'vitest';
import { renderAccountingHook, act } from './testUtils';

describe('اختبارات حماية المخزون ومنع القيم السالبة (Inventory Safeguards & Non-Negative Tests)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('يجب رفض إضافة صنف بأسعار أو كميات سالبة ورمي استثناء صريح', () => {
    const { result } = renderAccountingHook();

    expect(() => {
      act(() => {
        result.current.addInventoryItem({
          nameAr: 'صنف سالب غير صالح',
          nameEn: 'Invalid Negative Item',
          sku: 'SKU-NEG-01',
          barcode: '1234567890',
          category: 'عام',
          unit: 'قطعة',
          purchasePrice: -50,
          salePrice: 100,
          currentStock: 10,
          minStockAlert: 2,
          vatRate: 0.15,
          isActive: true,
        });
      });
    }).toThrow(/سالب/);

    expect(() => {
      act(() => {
        result.current.addInventoryItem({
          nameAr: 'صنف برصيد سالب',
          nameEn: 'Invalid Stock Item',
          sku: 'SKU-NEG-02',
          barcode: '1234567891',
          category: 'عام',
          unit: 'قطعة',
          purchasePrice: 50,
          salePrice: 100,
          currentStock: -5,
          minStockAlert: 2,
          vatRate: 0.15,
          isActive: true,
        });
      });
    }).toThrow(/سالب/);
  });

  it('يجب منع تعديل الرصيد المخزني مباشرة عند وجود حركات سابقة وإلزام استخدام التسوية الجردية', () => {
    const { result } = renderAccountingHook();

    // 1. Add an item with initial stock (creates movement)
    let itemId = '';
    act(() => {
      const item = result.current.addInventoryItem({
        nameAr: 'صنف مراقب الحركات',
        nameEn: 'Tracked Item',
        sku: 'SKU-TRK-01',
        barcode: '9988776655',
        category: 'إلكترونيات',
        unit: 'قطعة',
        purchasePrice: 200,
        salePrice: 300,
        currentStock: 10,
        minStockAlert: 2,
        vatRate: 0.15,
        isActive: true,
      });
      itemId = item.id;
    });

    // Check direct stock edit validation
    const check = result.current.checkDirectStockEditAllowed(itemId);
    expect(check.canDirectlyEdit).toBe(false);
    expect(check.movementsCount).toBeGreaterThan(0);

    // Attempting direct edit should throw
    expect(() => {
      act(() => {
        result.current.updateInventoryItem(itemId, { currentStock: 50 });
      });
    }).toThrow(/تسوية المخزون/);

    // Using official inventory adjustment works properly
    act(() => {
      result.current.adjustInventoryStock(itemId, 15, 'تسوية جردية بعد العد الفعلي للمستودع');
    });

    const item = result.current.inventory.find((i) => i.id === itemId);
    expect(item?.currentStock).toBe(15);

    const adjMovement = result.current.stockMovements.find(
      (m) => m.itemId === itemId && m.documentType === 'inventory_adjustment'
    );
    expect(adjMovement).toBeDefined();
    expect(adjMovement?.newStock).toBe(15);
    expect(adjMovement?.quantity).toBe(5);
  });

  it('يجب رفض تسوية المخزون برصيد نهائي سالب', () => {
    const { result } = renderAccountingHook();
    const item = result.current.inventory[0];

    expect(() => {
      act(() => {
        result.current.adjustInventoryStock(item.id, -10, 'تسوية خاطئة');
      });
    }).toThrow(/سالب/);
  });
});
