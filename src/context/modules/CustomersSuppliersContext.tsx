import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Customer, Supplier, DependencyCheckResult } from '../../types/accounting';
import { getAccountingRepository } from '../../services/dataService';
import { useCompanySettings } from './CompanyContext';

export interface CustomersSuppliersContextType {
  customers: Customer[];
  addCustomer: (data: Omit<Customer, 'id' | 'balance'>) => Customer;
  updateCustomer: (id: string, data: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  toggleCustomerStatus: (id: string) => void;
  checkCustomerDependencies: (id: string) => DependencyCheckResult;
  updateCustomerBalance: (id: string, delta: number) => void;

  suppliers: Supplier[];
  addSupplier: (data: Omit<Supplier, 'id' | 'balance'>) => Supplier;
  updateSupplier: (id: string, data: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  toggleSupplierStatus: (id: string) => void;
  checkSupplierDependencies: (id: string) => DependencyCheckResult;
  updateSupplierBalance: (id: string, delta: number) => void;

  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
}

export const CustomersSuppliersContext = createContext<CustomersSuppliersContextType | undefined>(undefined);

export const CustomersSuppliersProvider: React.FC<{
  children: React.ReactNode;
  value?: CustomersSuppliersContextType;
}> = ({ children, value }) => {
  const repo = getAccountingRepository();
  const { logAuditEvent } = useCompanySettings();

  const [customers, setCustomers] = useState<Customer[]>(() => repo.loadCustomers());
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => repo.loadSuppliers());

  useEffect(() => {
    repo.saveCustomers(customers);
  }, [customers]);

  useEffect(() => {
    repo.saveSuppliers(suppliers);
  }, [suppliers]);

  useEffect(() => {
    const handleReload = () => {
      setCustomers(repo.loadCustomers());
      setSuppliers(repo.loadSuppliers());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('shadi_flex_data_reloaded', handleReload);
      return () => window.removeEventListener('shadi_flex_data_reloaded', handleReload);
    }
  }, [repo]);

  // Customer Management
  const addCustomer = useCallback((data: Omit<Customer, 'id' | 'balance'>): Customer => {
    const newCust: Customer = {
      ...data,
      id: `cust_${Date.now()}`,
      balance: 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
    };
    setCustomers((prev) => [...prev, newCust]);

    logAuditEvent({
      action: 'create',
      entityType: 'customer',
      entityId: newCust.id,
      after: newCust as unknown as Record<string, unknown>,
      reason: `إضافة عميل جديد: ${newCust.nameAr}`,
      source: 'web_ui',
      metadata: { nameAr: newCust.nameAr, phone: newCust.phone, vatNumber: newCust.vatNumber },
    });

    return newCust;
  }, [logAuditEvent]);

  const updateCustomer = useCallback((id: string, data: Partial<Customer>) => {
    const existing = customers.find((c) => c.id === id);
    if (!existing) return;
    const updated = { ...existing, ...data };
    setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)));

    logAuditEvent({
      action: 'update',
      entityType: 'customer',
      entityId: id,
      before: existing as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
      reason: `تعديل بيانات العميل: ${existing.nameAr}`,
      source: 'web_ui',
    });
  }, [customers, logAuditEvent]);

  const toggleCustomerStatus = useCallback((id: string) => {
    const existing = customers.find((c) => c.id === id);
    if (!existing) return;
    const updated = { ...existing, isActive: existing.isActive === false ? true : false };
    setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)));

    logAuditEvent({
      action: 'update',
      entityType: 'customer',
      entityId: id,
      before: existing as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
      reason: `تغيير حالة العميل ${existing.nameAr} إلى ${updated.isActive ? 'نشط' : 'معطل'}`,
      source: 'web_ui',
    });
  }, [customers, logAuditEvent]);

  const checkCustomerDependencies = useCallback((id: string): DependencyCheckResult => {
    const cust = customers.find((c) => c.id === id);
    if (!cust) return { canDelete: false, reason: 'العميل غير موجود' };

    const hasBalance = Math.abs(cust.balance || 0) > 0.001;
    const summary: Array<{ label: string; count: number }> = [];
    if (hasBalance) summary.push({ label: `رصيد مالي مستحق (${cust.balance.toFixed(2)} ر.س)`, count: 1 });

    const canDelete = summary.length === 0;
    const reason = !canDelete
      ? `لا يمكن حذف هذا العميل لوجود ${summary.map((s) => `${s.label}`).join('، ')}. يرجى تعطيل العميل لحفظ العمليات المحاسبية.`
      : undefined;

    return {
      canDelete,
      reason,
      details: {
        hasBalance,
      },
      dependenciesSummary: summary,
    };
  }, [customers]);

  const deleteCustomer = useCallback((id: string) => {
    const check = checkCustomerDependencies(id);
    if (!check.canDelete) {
      throw new Error(check.reason || 'لا يمكن حذف العميل لوجود ارتباطات محاسبية');
    }
    const cust = customers.find((c) => c.id === id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));

    if (cust) {
      logAuditEvent({
        action: 'delete',
        entityType: 'customer',
        entityId: id,
        before: cust as unknown as Record<string, unknown>,
        reason: `حذف العميل: ${cust.nameAr}`,
        source: 'web_ui',
      });
    }
  }, [customers, checkCustomerDependencies, logAuditEvent]);

  const updateCustomerBalance = useCallback((id: string, delta: number) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, balance: Math.max(0, c.balance + delta) } : c))
    );
  }, []);

  // Supplier Management
  const addSupplier = useCallback((data: Omit<Supplier, 'id' | 'balance'>): Supplier => {
    const newSupp: Supplier = {
      ...data,
      id: `supp_${Date.now()}`,
      balance: 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
    };
    setSuppliers((prev) => [...prev, newSupp]);

    logAuditEvent({
      action: 'create',
      entityType: 'supplier',
      entityId: newSupp.id,
      after: newSupp as unknown as Record<string, unknown>,
      reason: `إضافة مورد جديد: ${newSupp.nameAr}`,
      source: 'web_ui',
      metadata: { nameAr: newSupp.nameAr, phone: newSupp.phone, vatNumber: newSupp.vatNumber },
    });

    return newSupp;
  }, [logAuditEvent]);

  const updateSupplier = useCallback((id: string, data: Partial<Supplier>) => {
    const existing = suppliers.find((s) => s.id === id);
    if (!existing) return;
    const updated = { ...existing, ...data };
    setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)));

    logAuditEvent({
      action: 'update',
      entityType: 'supplier',
      entityId: id,
      before: existing as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
      reason: `تعديل بيانات المورد: ${existing.nameAr}`,
      source: 'web_ui',
    });
  }, [suppliers, logAuditEvent]);

  const toggleSupplierStatus = useCallback((id: string) => {
    const existing = suppliers.find((s) => s.id === id);
    if (!existing) return;
    const updated = { ...existing, isActive: existing.isActive === false ? true : false };
    setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)));

    logAuditEvent({
      action: 'update',
      entityType: 'supplier',
      entityId: id,
      before: existing as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
      reason: `تغيير حالة المورد ${existing.nameAr} إلى ${updated.isActive ? 'نشط' : 'معطل'}`,
      source: 'web_ui',
    });
  }, [suppliers, logAuditEvent]);

  const checkSupplierDependencies = useCallback((id: string): DependencyCheckResult => {
    const supp = suppliers.find((s) => s.id === id);
    if (!supp) return { canDelete: false, reason: 'المورد غير موجود' };

    const hasBalance = Math.abs(supp.balance || 0) > 0.001;
    const summary: Array<{ label: string; count: number }> = [];
    if (hasBalance) summary.push({ label: `رصيد مالي مستحق (${supp.balance.toFixed(2)} ر.س)`, count: 1 });

    const canDelete = summary.length === 0;
    const reason = !canDelete
      ? `لا يمكن حذف هذا المورد لوجود ${summary.map((s) => `${s.label}`).join('، ')}. يرجى تعطيل المورد لحفظ العمليات المحاسبية.`
      : undefined;

    return {
      canDelete,
      reason,
      details: {
        hasBalance,
      },
      dependenciesSummary: summary,
    };
  }, [suppliers]);

  const deleteSupplier = useCallback((id: string) => {
    const check = checkSupplierDependencies(id);
    if (!check.canDelete) {
      throw new Error(check.reason || 'لا يمكن حذف المورد لوجود ارتباطات محاسبية');
    }
    const supp = suppliers.find((s) => s.id === id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));

    if (supp) {
      logAuditEvent({
        action: 'delete',
        entityType: 'supplier',
        entityId: id,
        before: supp as unknown as Record<string, unknown>,
        reason: `حذف المورد: ${supp.nameAr}`,
        source: 'web_ui',
      });
    }
  }, [suppliers, checkSupplierDependencies, logAuditEvent]);

  const updateSupplierBalance = useCallback((id: string, delta: number) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, balance: Math.max(0, s.balance + delta) } : s))
    );
  }, []);

  const contextValue: CustomersSuppliersContextType = value || {
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    toggleCustomerStatus,
    checkCustomerDependencies,
    updateCustomerBalance,
    suppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    toggleSupplierStatus,
    checkSupplierDependencies,
    updateSupplierBalance,
    setCustomers,
    setSuppliers,
  };

  return (
    <CustomersSuppliersContext.Provider value={contextValue}>
      {children}
    </CustomersSuppliersContext.Provider>
  );
};

export const useCustomersSuppliers = (): CustomersSuppliersContextType => {
  const context = useContext(CustomersSuppliersContext);
  if (!context) {
    throw new Error('useCustomersSuppliers must be used within a CustomersSuppliersProvider or AccountingProvider');
  }
  return context;
};

export const useParties = useCustomersSuppliers;
