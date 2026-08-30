import { InventoryItem, StockMovement, InvoiceItem } from '../types/accounting';

export interface InventoryCheckResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates that all sold items are present and have sufficient quantity.
 */
export function validateSaleInventory(
  items: InvoiceItem[],
  inventory: InventoryItem[]
): InventoryCheckResult {
  const errors: string[] = [];

  for (const item of items) {
    if (!item.itemId) continue;
    const inv = inventory.find((i) => i.id === item.itemId);
    if (!inv) {
      errors.push(`الصنف (${item.nameAr || item.nameEn || item.itemId}) غير موجود في سجل المستودع.`);
      continue;
    }

    if (inv.currentStock < item.quantity) {
      errors.push(
        `الكمية المطلوبة للصنف (${inv.nameAr}) هي ${item.quantity} ولكن الرصيد المتوفر بالمستودع هو ${inv.currentStock} فقط.`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculates new weighted average unit cost when incoming goods arrive.
 */
export function calculateWeightedAverageCost(
  currentQty: number,
  currentUnitCost: number,
  incomingQty: number,
  incomingUnitCost: number
): number {
  const totalQty = currentQty + incomingQty;
  if (totalQty <= 0) return incomingUnitCost > 0 ? incomingUnitCost : currentUnitCost;

  const currentTotalVal = Math.max(0, currentQty) * currentUnitCost;
  const incomingTotalVal = Math.max(0, incomingQty) * incomingUnitCost;
  const newAvgCost = (currentTotalVal + incomingTotalVal) / totalQty;

  return Number(newAvgCost.toFixed(4));
}

/**
 * Builds stock movements and calculates updated inventory records.
 */
export function processSaleInventoryDeduction(params: {
  items: InvoiceItem[];
  currentInventory: InventoryItem[];
  referenceType: 'sale' | 'purchase' | 'adjustment_in' | 'adjustment_out' | 'initial' | 'sale_reversal' | 'purchase_reversal' | 'return_in' | 'return_out';
  referenceId: string;
  referenceNumber: string;
  notesAr: string;
  nowIso: string;
}): {
  updatedInventory: InventoryItem[];
  createdMovements: StockMovement[];
  totalCogs: number;
} {
  const {
    items,
    currentInventory,
    referenceType,
    referenceId,
    referenceNumber,
    notesAr,
    nowIso,
  } = params;

  let updatedInventory = [...currentInventory];
  const createdMovements: StockMovement[] = [];
  let totalCogs = 0;

  for (const item of items) {
    if (!item.itemId) continue;
    const invIndex = updatedInventory.findIndex((i) => i.id === item.itemId);
    if (invIndex === -1) continue;

    const currentItem = updatedInventory[invIndex];
    const prevQty = currentItem.currentStock;
    const newQty = prevQty - item.quantity;
    const unitCost = currentItem.purchasePrice || currentItem.salePrice * 0.7;
    const itemCogs = Number((unitCost * item.quantity).toFixed(2));
    totalCogs += itemCogs;

    const movement: StockMovement = {
      id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      itemId: currentItem.id,
      itemName: currentItem.nameAr,
      date: nowIso.split('T')[0] || new Date().toISOString().split('T')[0],
      type: referenceType,
      quantity: item.quantity,
      previousStock: prevQty,
      newStock: newQty,
      referenceNumber,
      documentId: referenceId,
      documentType: 'sales_invoice',
      notes: notesAr,
    };

    createdMovements.push(movement);
    updatedInventory[invIndex] = {
      ...currentItem,
      currentStock: newQty,
    };
  }

  return {
    updatedInventory,
    createdMovements,
    totalCogs: Number(totalCogs.toFixed(2)),
  };
}

/**
 * Returns inventory items that are at or below minimum stock level threshold.
 */
export function getLowStockAlerts(inventory: InventoryItem[]): InventoryItem[] {
  return inventory.filter(
    (item) => item.minStockAlert && item.currentStock <= item.minStockAlert
  );
}

/**
 * Calculates total inventory valuation at cost price.
 */
export function calculateTotalInventoryValue(inventory: InventoryItem[]): number {
  return Number(
    inventory
      .reduce((sum, item) => sum + item.currentStock * (item.purchasePrice || 0), 0)
      .toFixed(2)
  );
}
