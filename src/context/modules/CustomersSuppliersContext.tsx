import React, { createContext, useContext } from 'react';
import { Customer, Supplier, DependencyCheckResult } from '../../types/accounting';

export interface CustomersSuppliersContextType {
  customers: Customer[];
  suppliers: Supplier[];
  addCustomer: (customer: Omit<Customer, 'id' | 'balance'>) => Customer;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  toggleCustomerStatus: (id: string) => void;
  checkCustomerDependencies: (id: string) => DependencyCheckResult;

  addSupplier: (supplier: Omit<Supplier, 'id' | 'balance'>) => Supplier;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  toggleSupplierStatus: (id: string) => void;
  checkSupplierDependencies: (id: string) => DependencyCheckResult;
}

export const CustomersSuppliersContext = createContext<CustomersSuppliersContextType | undefined>(undefined);

export const CustomersSuppliersProvider: React.FC<{
  value: CustomersSuppliersContextType;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return <CustomersSuppliersContext.Provider value={value}>{children}</CustomersSuppliersContext.Provider>;
};

export const useCustomersSuppliers = (): CustomersSuppliersContextType => {
  const context = useContext(CustomersSuppliersContext);
  if (!context) {
    throw new Error('useCustomersSuppliers must be used within an AccountingProvider / CustomersSuppliersProvider');
  }
  return context;
};

// Alias for convenience
export const useParties = useCustomersSuppliers;
