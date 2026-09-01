import React, { createContext, useContext } from 'react';
import {
  Branch,
  CashRegister,
  CashierShift,
  ParkedOrder,
  DependencyCheckResult,
  PaymentMethod,
  SalesInvoice,
} from '../../types/accounting';

export interface POSContextType {
  branches: Branch[];
  cashRegisters: CashRegister[];
  cashierShifts: CashierShift[];
  parkedOrders: ParkedOrder[];
  activeBranchId: string;
  setActiveBranchId: (id: string) => void;
  activeRegisterId: string;
  setActiveRegisterId: (id: string) => void;
  activeShift: CashierShift | undefined;

  addBranch: (data: Omit<Branch, 'id' | 'createdAt'>) => Branch;
  updateBranch: (id: string, data: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;
  toggleBranchStatus: (id: string) => void;
  checkBranchDependencies: (id: string) => DependencyCheckResult;

  addCashRegister: (data: Omit<CashRegister, 'id'>) => CashRegister;
  updateCashRegister: (id: string, data: Partial<CashRegister>) => void;
  deleteCashRegister: (id: string) => void;
  toggleCashRegisterStatus: (id: string) => void;
  checkCashRegisterDependencies: (id: string) => DependencyCheckResult;

  startCashierShift: (registerId: string, cashierName: string, openingCash: number) => CashierShift;
  closeCashierShift: (shiftId: string, actualCash: number, closingNotes?: string) => CashierShift;
  cashDropShift: (shiftId: string, amount: number, notes?: string) => void;

  parkOrder: (order: Omit<ParkedOrder, 'id' | 'savedAt' | 'orderNumber'>) => ParkedOrder;
  resumeParkedOrder: (orderId: string) => ParkedOrder | undefined;
  deleteParkedOrder: (orderId: string) => void;

  processPosSale: (saleData: {
    items: Array<{
      itemId?: string;
      nameAr: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      discount: number;
      vatRate: number;
      vatAmount: number;
      subtotal: number;
      totalWithVat: number;
    }>;
    customerId?: string;
    customerName?: string;
    customerVatNumber?: string;
    paymentMethod: PaymentMethod;
    paidAmount: number;
    cashTendered?: number;
    changeReturned?: number;
    madaAuthCode?: string;
    splitPaymentDetails?: {
      cashAmount: number;
      madaAmount: number;
    };
    discountTotal?: number;
    notes?: string;
  }) => Promise<SalesInvoice>;
}

export const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider: React.FC<{
  value: POSContextType;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return <POSContext.Provider value={value}>{children}</POSContext.Provider>;
};

export const usePOS = (): POSContextType => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within an AccountingProvider / POSProvider');
  }
  return context;
};
