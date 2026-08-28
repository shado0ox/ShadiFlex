import { InventoryItem, StockMovement, InvoiceItem } from '../types/accounting';

export interface InventoryShortage {
  itemId: string;
  nameAr: string;
  sku: string;
  requestedQuantity: number;
  availableQuantity: number;
  shortageQuantity: number;
}

export interface InventoryValidationResult {
  isValid: boolean;
  errors: string[];
  shortages: InventoryShortage[];
  invalidLines: Array<{
    index: number;
    nameAr: string;
    reason: string;
  }>;
}

export class InventoryValidationError extends Error {
  shortages: InventoryShortage[];
  errors: string[];

  constructor(message: string, errors: string[] = [], shortages: InventoryShortage[] = []) {
    super(message);
    this.name = 'InventoryValidationError';
    this.errors = errors;
    this.shortages = shortages;
  }
}

/**
 * Validates inventory availability, positive quantities, and non-negative prices for sales transactions (Invoices, POS).
 * Aggregates duplicate item rows to ensure total requested quantity doesn't exceed available stock.
 */
export function validateSaleInventory(
  items: Array<{
    itemId?: string;
    nameAr?: string;
    quantity: number | string;
    unitPrice?: number | string;
    discount?: number | string;
  }>,
  inventory: InventoryItem[]
): InventoryValidationResult {
  const errors: string[] = [];
  const shortages: InventoryShortage[] = [];
  const invalidLines: Array<{ index: number; nameAr: string; reason: string }> = [];

  if (!items || items.length === 0) {
    return {
      isValid: false,
      errors: ['يجب إضافة بند واحد على الأقل في الفاتورة'],
      shortages: [],
      invalidLines: [],
    };
  }

  // 1. Line-by-line validations: quantity > 0, unitPrice >= 0
  items.forEach((item, index) => {
    const qty = Number(item.quantity);
    const price = Number(item.unitPrice);
    const name = item.nameAr || `بند #${index + 1}`;

    if (isNaN(qty) || qty <= 0) {
      const msg = `البند (${name}): الكمية غير صالحة (${item.quantity}). لا يُسمح بالكميات الصفرية أو السالبة.`;
      errors.push(msg);
      invalidLines.push({ index, nameAr: name, reason: 'كمية صفرية أو سالبة' });
    }

    if (isNaN(price) || price < 0) {
      const msg = `البند (${name}): السعر غير صالح (${item.unitPrice}). لا يُسمح بالأسعار السالبة.`;
      errors.push(msg);
      invalidLines.push({ index, nameAr: name, reason: 'سعر سالب' });
    }
  });

  // 2. Aggregate quantities by itemId to check total stock consumption
  const aggregatedQuantities: Record<string, number> = {};
  items.forEach((item) => {
    if (item.itemId) {
      const qty = Number(item.quantity) || 0;
      if (qty > 0) {
        aggregatedQuantities[item.itemId] = (aggregatedQuantities[item.itemId] || 0) + qty;
      }
    }
  });

  // 3. Compare with actual available stock
  Object.entries(aggregatedQuantities).forEach(([itemId, totalRequested]) => {
    const invItem = inventory.find((i) => i.id === itemId);
    if (!invItem) {
      errors.push(`الصنف المحدد (معرف: ${itemId}) غير موجود في سجل المخزون.`);
      return;
    }

    if (invItem.isActive === false) {
      errors.push(`الصنف "${invItem.nameAr}" معطل حالياً ولا يمكن البيع منه.`);
      return;
    }

    const available = Number(invItem.currentStock) || 0;
    if (totalRequested > available) {
      const shortage = totalRequested - available;
      const errorMsg = `نقص في المخزون: الصنف "${invItem.nameAr}" (الرمز: ${invItem.sku}) - الكمية المطلوبة: ${totalRequested} ${invItem.unit} | الرصيد المتاح: ${available} ${invItem.unit} (العجز: ${shortage} ${invItem.unit})`;
      errors.push(errorMsg);
      shortages.push({
        itemId: invItem.id,
        nameAr: invItem.nameAr,
        sku: invItem.sku,
        requestedQuantity: totalRequested,
        availableQuantity: available,
        shortageQuantity: shortage,
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    shortages,
    invalidLines,
  };
}

/**
 * Asserts that the sale items are valid and have sufficient stock. Throws InventoryValidationError if not.
 */
export function assertSaleInventory(
  items: Array<{
    itemId?: string;
    nameAr?: string;
    quantity: number | string;
    unitPrice?: number | string;
    discount?: number | string;
  }>,
  inventory: InventoryItem[]
): void {
  const result = validateSaleInventory(items, inventory);
  if (!result.isValid) {
    throw new InventoryValidationError(
      result.errors[0] || 'تعذر إتمام العملية لوجود نقص في المخزون أو قيم غير صالحة',
      result.errors,
      result.shortages
    );
  }
}

/**
 * Validates purchase items: positive quantity and non-negative unit cost.
 */
export function validatePurchaseInventory(
  items: Array<{
    itemId?: string;
    nameAr?: string;
    quantity: number | string;
    unitPrice?: number | string;
  }>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!items || items.length === 0) {
    return { isValid: false, errors: ['يجب إضافة بند واحد على الأقل في فاتورة المشتريات'] };
  }

  items.forEach((item, index) => {
    const qty = Number(item.quantity);
    const price = Number(item.unitPrice);
    const name = item.nameAr || `بند #${index + 1}`;

    if (isNaN(qty) || qty <= 0) {
      errors.push(`البند (${name}): الكمية غير صالحة (${item.quantity}). لا يُسمح بالكميات الصفرية أو السالبة.`);
    }

    if (isNaN(price) || price < 0) {
      errors.push(`البند (${name}): سعر الشراء غير صالح (${item.unitPrice}). لا يُسمح بالأسعار السالبة.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Checks if an inventory item's stock can be directly edited or if it must be adjusted via Inventory Adjustment.
 * Directly modifying currentStock is forbidden if there are existing stock movements.
 */
export function checkDirectStockEditAllowed(
  itemId: string,
  stockMovements: StockMovement[]
): {
  canDirectlyEdit: boolean;
  movementsCount: number;
  message?: string;
} {
  const movements = stockMovements.filter((m) => m.itemId === itemId);
  const movementsCount = movements.length;

  if (movementsCount > 0) {
    return {
      canDirectlyEdit: false,
      movementsCount,
      message: `لا يمكن تعديل الرصيد الحالي مباشرة لوجود (${movementsCount}) حركة مخزنية سابقة على هذا الصنف. يرجى استخدام حركة تسوية المخزون (Inventory Adjustment) لتوثيق الفارق محاسبياً.`,
    };
  }

  return {
    canDirectlyEdit: true,
    movementsCount: 0,
  };
}
