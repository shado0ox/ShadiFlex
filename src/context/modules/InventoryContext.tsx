import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { InventoryItem, StockMovement, DependencyCheckResult } from '../../types/accounting';
import { getAccountingRepository } from '../../services/dataService';
import { useCompanySettings } from './CompanyContext';
import {
  validateSaleInventory as validateSaleStock,
  validatePurchaseInventory as validatePurStock,
  assertSaleInventory as assertSaleStock,
  checkDirectStockEditAllowed as checkStockEditAllowed,
  InventoryValidationResult,
} from '../../services/inventoryValidationService';
import { generateEntityId } from '../../utils/uuid';

export interface InventoryContextType {
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  addInventoryItem: (data: Omit<InventoryItem, 'id'>) => InventoryItem;
  updateInventoryItem: (id: string, data: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  toggleInventoryItemStatus: (id: string) => void;
  checkInventoryItemDependencies: (id: string) => DependencyCheckResult;
  adjustInventoryStock: (itemId: string, newStock: number, reason: string, adjustedBy?: string) => void;
  validateSaleInventory: (items: any[], currentInventory?: InventoryItem[]) => InventoryValidationResult;
  validatePurchaseInventory: (items: any[]) => { isValid: boolean; errors: string[] };
  checkDirectStockEditAllowed: (itemId: string) => { canDirectlyEdit: boolean; movementsCount: number; message?: string };
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  setStockMovements: React.Dispatch<React.SetStateAction<StockMovement[]>>;
}

export const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{
  children: React.ReactNode;
  value?: InventoryContextType;
}> = ({ children, value }) => {
  const repo = getAccountingRepository();
  const { logAuditEvent } = useCompanySettings();

  const [inventory, setInventory] = useState<InventoryItem[]>(() => repo.loadInventory());
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => repo.loadStockMovements());

  useEffect(() => {
    repo.saveInventory(inventory);
  }, [inventory]);

  useEffect(() => {
    repo.saveStockMovements(stockMovements);
  }, [stockMovements]);

  useEffect(() => {
    const handleReload = () => {
      setInventory(repo.loadInventory());
      setStockMovements(repo.loadStockMovements());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('shadi_flex_data_reloaded', handleReload);
      return () => window.removeEventListener('shadi_flex_data_reloaded', handleReload);
    }
  }, [repo]);

  const addInventoryItem = useCallback((data: Omit<InventoryItem, 'id'>): InventoryItem => {
    if (data.purchasePrice < 0 || data.salePrice < 0 || (data.currentStock !== undefined && data.currentStock < 0)) {
      throw new Error('لا يُسمح بالقيم السالبة لأسعار أو كميات المخزون');
    }

    const newItem: InventoryItem = {
      ...data,
      id: `item_${Date.now()}`,
      isActive: data.isActive !== undefined ? data.isActive : true,
      currentStock: data.currentStock || 0,
      minStockAlert: data.minStockAlert || 0,
    };

    setInventory((prev) => [...prev, newItem]);

    if (newItem.currentStock > 0) {
      const [today] = new Date().toISOString().split('T');
      setStockMovements((prev) => [
        {
          id: generateEntityId('sm'),
          itemId: newItem.id,
          itemName: newItem.nameAr,
          date: today,
          type: 'initial',
          quantity: newItem.currentStock,
          previousStock: 0,
          newStock: newItem.currentStock,
          referenceNumber: 'INITIAL-STOCK',
          documentType: 'initial_balance',
          notes: 'رصيد افتتاحي أولي للصنف',
        },
        ...prev,
      ]);
    }

    logAuditEvent({
      action: 'create',
      entityType: 'inventory_item',
      entityId: newItem.id,
      after: newItem as unknown as Record<string, unknown>,
      reason: `إضافة صنف جديد بالمخزون: ${newItem.nameAr} (${newItem.sku})`,
      source: 'web_ui',
      metadata: { sku: newItem.sku, nameAr: newItem.nameAr, stock: newItem.currentStock },
    });

    return newItem;
  }, [logAuditEvent]);

  const updateInventoryItem = useCallback((id: string, data: Partial<InventoryItem>) => {
    const existing = inventory.find((i) => i.id === id);
    if (!existing) return;

    if (
      (data.purchasePrice !== undefined && data.purchasePrice < 0) ||
      (data.salePrice !== undefined && data.salePrice < 0) ||
      (data.currentStock !== undefined && data.currentStock < 0)
    ) {
      throw new Error('لا يُسمح بالقيم السالبة لأسعار أو كميات المخزون');
    }

    if (data.currentStock !== undefined && data.currentStock !== existing.currentStock) {
      const check = checkStockEditAllowed(id, stockMovements);
      if (!check.canDirectlyEdit) {
        throw new Error(check.message || 'لا يمكن تعديل الرصيد لوجود حركات سابقة');
      }
    }

    const updated = { ...existing, ...data };
    setInventory((prev) => prev.map((i) => (i.id === id ? updated : i)));

    logAuditEvent({
      action: 'update',
      entityType: 'inventory_item',
      entityId: id,
      before: existing as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
      reason: `تعديل بيانات الصنف: ${existing.nameAr}`,
      source: 'web_ui',
    });
  }, [inventory, stockMovements, logAuditEvent]);

  const toggleInventoryItemStatus = useCallback((id: string) => {
    const existing = inventory.find((i) => i.id === id);
    if (!existing) return;
    const updated = { ...existing, isActive: existing.isActive === false ? true : false };
    setInventory((prev) => prev.map((i) => (i.id === id ? updated : i)));

    logAuditEvent({
      action: 'update',
      entityType: 'inventory_item',
      entityId: id,
      before: existing as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
      reason: `تغيير حالة الصنف ${existing.nameAr} إلى ${updated.isActive ? 'نشط' : 'معطل'}`,
      source: 'web_ui',
    });
  }, [inventory, logAuditEvent]);

  const checkInventoryItemDependencies = useCallback((id: string): DependencyCheckResult => {
    const item = inventory.find((i) => i.id === id);
    if (!item) return { canDelete: false, reason: 'الصنف غير موجود' };

    const movementsCount = stockMovements.filter((m) => m.itemId === id).length;
    const summary: Array<{ label: string; count: number }> = [];
    if (movementsCount > 0) summary.push({ label: 'حركات مخزنية', count: movementsCount });

    const canDelete = summary.length === 0;
    const reason = !canDelete
      ? `لا يمكن حذف هذا الصنف لوجود ${summary.map((s) => `${s.count} ${s.label}`).join('، ')}. يرجى تعطيل الصنف بدلاً من الحذف لضمان سلامة تقارير المخزون والأرباح.`
      : undefined;

    return {
      canDelete,
      reason,
      details: {
        movementsCount,
      },
      dependenciesSummary: summary,
    };
  }, [inventory, stockMovements]);

  const deleteInventoryItem = useCallback((id: string) => {
    const check = checkInventoryItemDependencies(id);
    if (!check.canDelete) {
      throw new Error(check.reason || 'لا يمكن حذف الصنف لوجود حركات مخزنية مرتبطة');
    }
    const item = inventory.find((i) => i.id === id);
    setInventory((prev) => prev.filter((i) => i.id !== id));

    if (item) {
      logAuditEvent({
        action: 'delete',
        entityType: 'inventory_item',
        entityId: id,
        before: item as unknown as Record<string, unknown>,
        reason: `حذف صنف المخزون: ${item.nameAr}`,
        source: 'web_ui',
      });
    }
  }, [inventory, checkInventoryItemDependencies, logAuditEvent]);

  const adjustInventoryStock = useCallback((itemId: string, newStock: number, reason: string, adjustedBy?: string) => {
    if (newStock < 0) throw new Error('لا يمكن أن يكون رصيد المخزون سالباً');
    const item = inventory.find((i) => i.id === itemId);
    if (!item) throw new Error('الصنف غير موجود');

    const prevStock = item.currentStock;
    const diff = newStock - prevStock;
    if (diff === 0) return;

    const [today] = new Date().toISOString().split('T');
    setInventory((prev) => prev.map((i) => (i.id === itemId ? { ...i, currentStock: newStock } : i)));

    setStockMovements((prev) => [
      {
        id: generateEntityId('sm'),
        itemId,
        itemName: item.nameAr,
        date: today,
        type: diff > 0 ? 'adjustment_in' : 'adjustment_out',
        quantity: Math.abs(diff),
        previousStock: prevStock,
        newStock: newStock,
        referenceNumber: 'ADJ-MANUAL',
        documentType: 'inventory_adjustment',
        notes: reason || 'تسوية جردية يدوية موثقة',
      },
      ...prev,
    ]);

    logAuditEvent({
      action: 'update',
      entityType: 'inventory_item',
      entityId: itemId,
      before: { currentStock: prevStock },
      after: { currentStock: newStock },
      reason: `تسوية رصيد مخزني للصنف ${item.nameAr} من (${prevStock}) إلى (${newStock}) - السبب: ${reason}`,
      source: 'web_ui',
      metadata: { previousStock: prevStock, newStock, difference: diff, adjustedBy },
    });
  }, [inventory, logAuditEvent]);

  const validateSaleInventoryCallback = useCallback((items: any[], currentInventory?: InventoryItem[]) => {
    return validateSaleStock(items, currentInventory || inventory);
  }, [inventory]);

  const validatePurchaseInventoryCallback = useCallback((items: any[]) => {
    return validatePurStock(items);
  }, []);

  const checkDirectStockEditAllowedCallback = useCallback((itemId: string) => {
    return checkStockEditAllowed(itemId, stockMovements);
  }, [stockMovements]);

  const contextValue: InventoryContextType = value || {
    inventory,
    stockMovements,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    toggleInventoryItemStatus,
    checkInventoryItemDependencies,
    adjustInventoryStock,
    validateSaleInventory: validateSaleInventoryCallback,
    validatePurchaseInventory: validatePurchaseInventoryCallback,
    checkDirectStockEditAllowed: checkDirectStockEditAllowedCallback,
    setInventory,
    setStockMovements,
  };

  return <InventoryContext.Provider value={contextValue}>{children}</InventoryContext.Provider>;
};

export const useInventory = (): InventoryContextType => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider or AccountingProvider');
  }
  return context;
};
