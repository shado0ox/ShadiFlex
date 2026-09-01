import React, { createContext, useContext } from 'react';
import { InventoryItem, StockMovement, DependencyCheckResult } from '../../types/accounting';
import { InventoryValidationResult } from '../../services/inventoryValidationService';

export interface InventoryContextType {
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => InventoryItem;
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  toggleInventoryItemStatus: (id: string) => void;
  checkInventoryItemDependencies: (id: string) => DependencyCheckResult;
  adjustInventoryStock: (itemId: string, newStock: number, reason: string) => void;
  validateSaleInventory: (
    items: Array<{ itemId?: string; nameAr?: string; quantity: number | string; unitPrice?: number | string; discount?: number | string }>
  ) => InventoryValidationResult;
  validatePurchaseInventory: (
    items: Array<{ itemId?: string; nameAr?: string; quantity: number | string; unitPrice?: number | string }>
  ) => { isValid: boolean; errors: string[] };
  checkDirectStockEditAllowed: (itemId: string) => { canDirectlyEdit: boolean; movementsCount: number; message?: string };
}

export const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{
  value: InventoryContextType;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
};

export const useInventory = (): InventoryContextType => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an AccountingProvider / InventoryProvider');
  }
  return context;
};
