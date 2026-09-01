import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Branch,
  CashRegister,
  CashierShift,
  ParkedOrder,
  SalesInvoice,
  InvoiceItem,
  InvoiceType,
  PaymentMethod,
  JournalEntry,
  JournalEntryLine,
  StockMovement,
  DependencyCheckResult,
} from '../../types/accounting';
import { getAccountingRepository } from '../../services/dataService';
import { useCompanySettings } from './CompanyContext';
import { useFiscalPeriods } from './FiscalPeriodsContext';
import { useAccounts } from './AccountsContext';
import { useInventory } from './InventoryContext';
import { useJournal } from './JournalContext';
import { useInvoices } from './InvoicesContext';
import { generateEntityId, generateUUID } from '../../utils/uuid';
import { documentSequenceService } from '../../services/documentSequenceService';
import { generateZatcaTlvBase64 } from '../../utils/zatca';
import { assertSaleInventory } from '../../services/inventoryValidationService';

export interface POSContextType {
  branches: Branch[];
  cashRegisters: CashRegister[];
  cashierShifts: CashierShift[];
  parkedOrders: ParkedOrder[];
  activeBranchId: string;
  activeRegisterId: string;
  activeShift: CashierShift | undefined;

  setActiveBranchId: (id: string) => void;
  setActiveRegisterId: (id: string) => void;

  addBranch: (data: Omit<Branch, 'id' | 'createdAt'>) => Branch;
  updateBranch: (id: string, data: Partial<Branch>) => void;
  toggleBranchStatus: (id: string) => void;
  deleteBranch: (id: string) => void;
  checkBranchDependencies: (id: string) => DependencyCheckResult;

  addCashRegister: (data: Omit<CashRegister, 'id'>) => CashRegister;
  updateCashRegister: (id: string, data: Partial<CashRegister>) => void;
  toggleCashRegisterStatus: (id: string) => void;
  deleteCashRegister: (id: string) => void;
  checkCashRegisterDependencies: (id: string) => DependencyCheckResult;

  startCashierShift: (registerId: string, cashierName: string, openingCash: number) => CashierShift;
  closeCashierShift: (shiftId: string, actualCash: number, closingNotes?: string) => CashierShift;
  cashDropShift: (shiftId: string, amount: number, notes?: string) => void;

  parkOrder: (orderData: Omit<ParkedOrder, 'id' | 'savedAt' | 'orderNumber'>) => ParkedOrder;
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

  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  setCashRegisters: React.Dispatch<React.SetStateAction<CashRegister[]>>;
  setCashierShifts: React.Dispatch<React.SetStateAction<CashierShift[]>>;
  setParkedOrders: React.Dispatch<React.SetStateAction<ParkedOrder[]>>;
}

export const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider: React.FC<{
  children: React.ReactNode;
  value?: POSContextType;
}> = ({ children, value }) => {
  const repo = getAccountingRepository();
  const { companySettings } = useCompanySettings();
  const { assertDateNotInClosedPeriod } = useFiscalPeriods();
  const { accounts, setAccounts, recalculateAccountBalances } = useAccounts();
  const { inventory, setInventory, setStockMovements } = useInventory();
  const { journalEntries, setJournalEntries } = useJournal();
  const { salesInvoices, setSalesInvoices } = useInvoices();

  const [branches, setBranches] = useState<Branch[]>(() => repo.loadBranches());
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>(() => repo.loadCashRegisters());
  const [cashierShifts, setCashierShifts] = useState<CashierShift[]>(() => repo.loadCashierShifts());
  const [parkedOrders, setParkedOrders] = useState<ParkedOrder[]>(() => repo.loadParkedOrders());
  const [activeBranchId, setActiveBranchIdState] = useState<string>(() => repo.loadActiveBranchId());
  const [activeRegisterId, setActiveRegisterIdState] = useState<string>(() => repo.loadActiveRegisterId());

  useEffect(() => {
    repo.saveBranches(branches);
  }, [branches]);

  useEffect(() => {
    repo.saveCashRegisters(cashRegisters);
  }, [cashRegisters]);

  useEffect(() => {
    repo.saveCashierShifts(cashierShifts);
  }, [cashierShifts]);

  useEffect(() => {
    repo.saveParkedOrders(parkedOrders);
  }, [parkedOrders]);

  useEffect(() => {
    const handleReload = () => {
      setBranches(repo.loadBranches());
      setCashRegisters(repo.loadCashRegisters());
      setCashierShifts(repo.loadCashierShifts());
      setParkedOrders(repo.loadParkedOrders());
      setActiveBranchIdState(repo.loadActiveBranchId());
      setActiveRegisterIdState(repo.loadActiveRegisterId());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('shadi_flex_data_reloaded', handleReload);
      return () => window.removeEventListener('shadi_flex_data_reloaded', handleReload);
    }
  }, [repo]);

  const setActiveBranchId = useCallback((id: string) => {
    setActiveBranchIdState(id);
    repo.saveActiveBranchId(id);
  }, [repo]);

  const setActiveRegisterId = useCallback((id: string) => {
    setActiveRegisterIdState(id);
    repo.saveActiveRegisterId(id);
  }, [repo]);

  const activeShift = useMemo(() => {
    return cashierShifts.find((s) => s.registerId === activeRegisterId && s.status === 'open');
  }, [cashierShifts, activeRegisterId]);

  const getDocFiscalYear = (dateStr?: string): number => {
    if (dateStr) {
      const parsed = parseInt(dateStr.split('-')[0], 10);
      if (!isNaN(parsed) && parsed > 2000) return parsed;
    }
    return companySettings.fiscalYear || new Date().getFullYear();
  };

  const checkBranchDependencies = useCallback((id: string): DependencyCheckResult => {
    const branch = branches.find((b) => b.id === id);
    if (!branch) return { canDelete: false, reason: 'الفرع غير موجود' };

    const isMainBranch = branch.isMain || (branch as any).isMainBranch || false;
    const registersCount = cashRegisters.filter((r) => r.branchId === id).length;
    const shiftsCount = cashierShifts.filter((s) => s.branchId === id).length;
    const salesInvoicesCount = salesInvoices.filter((i) => i.branchId === id).length;

    const summary: Array<{ label: string; count: number }> = [];
    if (isMainBranch) summary.push({ label: 'الفرع الرئيسي للمنشأة', count: 1 });
    if (registersCount > 0) summary.push({ label: 'صناديق كاشير', count: registersCount });
    if (shiftsCount > 0) summary.push({ label: 'ورديات كاشير', count: shiftsCount });
    if (salesInvoicesCount > 0) summary.push({ label: 'فواتير مبيعات مسجلة', count: salesInvoicesCount });

    const canDelete = summary.length === 0;
    const reason = !canDelete
      ? `لا يمكن حذف هذا الفرع لوجود ${summary.map((s) => `${s.label}${s.count > 1 ? ` (${s.count})` : ''}`).join('، ')}. يرجى نقل الصناديق والعمليات أو تعطيل الفرع.`
      : undefined;

    return {
      canDelete,
      reason,
      details: {
        isMainBranch,
        registersCount,
        shiftsCount,
        salesInvoicesCount,
      },
      dependenciesSummary: summary,
    };
  }, [branches, cashRegisters, cashierShifts, salesInvoices]);

  const addBranch = useCallback((data: Omit<Branch, 'id' | 'createdAt'>): Branch => {
    const newBranch: Branch = {
      ...data,
      id: `br_${Date.now()}`,
      createdAt: new Date().toISOString(),
      isActive: data.isActive !== undefined ? data.isActive : true,
    };
    setBranches((prev) => [...prev, newBranch]);
    return newBranch;
  }, []);

  const updateBranch = useCallback((id: string, data: Partial<Branch>) => {
    setBranches((prev) => prev.map((b) => (b.id === id ? { ...b, ...data } : b)));
    if (data.nameAr) {
      setCashRegisters((prev) =>
        prev.map((r) => (r.branchId === id ? { ...r, branchName: data.nameAr! } : r))
      );
    }
  }, []);

  const toggleBranchStatus = useCallback((id: string) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isActive: b.isActive === false ? true : false } : b))
    );
  }, []);

  const deleteBranch = useCallback((id: string) => {
    const check = checkBranchDependencies(id);
    if (!check.canDelete) {
      throw new Error(check.reason || 'لا يمكن حذف الفرع لوجود صناديق أو ورديات أو مستندات');
    }
    setBranches((prev) => prev.filter((b) => b.id !== id));
  }, [checkBranchDependencies]);

  const checkCashRegisterDependencies = useCallback((id: string): DependencyCheckResult => {
    const reg = cashRegisters.find((r) => r.id === id);
    if (!reg) return { canDelete: false, reason: 'الصندوق غير موجود' };

    const openShiftsCount = cashierShifts.filter((s) => s.registerId === id && s.status === 'open').length;
    const shiftsCount = cashierShifts.filter((s) => s.registerId === id).length;
    const salesInvoicesCount = salesInvoices.filter((i) => i.registerId === id).length;
    const parkedCount = parkedOrders.filter((p) => p.registerId === id).length;

    const summary: Array<{ label: string; count: number }> = [];
    if (openShiftsCount > 0) summary.push({ label: 'وردية مفتوحة حالياً', count: openShiftsCount });
    if (shiftsCount > 0) summary.push({ label: 'سجلات ورديات سابقة', count: shiftsCount });
    if (salesInvoicesCount > 0) summary.push({ label: 'فواتير كاشير مصدرة', count: salesInvoicesCount });
    if (parkedCount > 0) summary.push({ label: 'فواتير معلقة', count: parkedCount });

    const canDelete = summary.length === 0;
    const reason = !canDelete
      ? `لا يمكن حذف هذا الصندوق لوجود ${summary.map((s) => `${s.label}${s.count > 1 ? ` (${s.count})` : ''}`).join('، ')}. يمكنك تعطيل الصندوق بدلاً من الحذف.`
      : undefined;

    return {
      canDelete,
      reason,
      details: {
        openShiftsCount,
        shiftsCount,
        salesInvoicesCount,
        parkedCount,
      },
      dependenciesSummary: summary,
    };
  }, [cashRegisters, cashierShifts, parkedOrders, salesInvoices]);

  const addCashRegister = useCallback((data: Omit<CashRegister, 'id'>): CashRegister => {
    const newRegister: CashRegister = {
      ...data,
      id: `reg_${Date.now()}`,
      isActive: data.isActive !== undefined ? data.isActive : true,
      currentShiftId: null,
    };
    setCashRegisters((prev) => [...prev, newRegister]);
    return newRegister;
  }, []);

  const updateCashRegister = useCallback((id: string, data: Partial<CashRegister>) => {
    setCashRegisters((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
  }, []);

  const toggleCashRegisterStatus = useCallback((id: string) => {
    setCashRegisters((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: r.isActive === false ? true : false } : r))
    );
  }, []);

  const deleteCashRegister = useCallback((id: string) => {
    const check = checkCashRegisterDependencies(id);
    if (!check.canDelete) {
      throw new Error(check.reason || 'لا يمكن حذف صندوق الكاشير لوجود ورديات أو فواتير مرتبطة');
    }
    setCashRegisters((prev) => prev.filter((r) => r.id !== id));
  }, [checkCashRegisterDependencies]);

  const startCashierShift = useCallback((registerId: string, cashierName: string, openingCash: number): CashierShift => {
    const register = cashRegisters.find((r) => r.id === registerId);
    const fiscalYear = getDocFiscalYear();
    const shiftNumber = documentSequenceService.getNextNumber(
      'cashier_shift',
      fiscalYear,
      cashierShifts.map((s) => s.shiftNumber)
    );
    const newShift: CashierShift = {
      id: generateEntityId('shift'),
      shiftNumber,
      branchId: register?.branchId || activeBranchId,
      branchName: register?.branchName || 'الفرع الرئيسي وصالة العرض (الرياض)',
      registerId,
      registerName: register?.nameAr || 'صندوق كاشير',
      cashierName: cashierName.trim() || 'كاشير مبيعات',
      startTime: new Date().toISOString(),
      openingCash: Number(openingCash) || 0,
      cashSales: 0,
      madaSales: 0,
      creditCardSales: 0,
      otherSales: 0,
      totalSales: 0,
      totalVat: 0,
      invoicesCount: 0,
      refundsCount: 0,
      refundsTotal: 0,
      cashDropAmount: 0,
      expectedCash: Number(openingCash) || 0,
      status: 'open',
    };

    setCashierShifts((prev) => [newShift, ...prev]);
    setCashRegisters((prev) =>
      prev.map((r) =>
        r.id === registerId
          ? {
              ...r,
              currentShiftId: newShift.id,
              assignedCashierName: cashierName,
              lastActiveAt: new Date().toISOString(),
            }
          : r
      )
    );
    return newShift;
  }, [activeBranchId, cashRegisters, cashierShifts]);

  const closeCashierShift = useCallback((shiftId: string, actualCash: number, closingNotes?: string): CashierShift => {
    const shift = cashierShifts.find((s) => s.id === shiftId);
    const fiscalYear = getDocFiscalYear();
    const zReportNum = `Z-${fiscalYear}-${Math.floor(1000 + Math.random() * 9000)}`;
    const endTime = new Date().toISOString();
    const expected = shift ? shift.expectedCash : actualCash;
    const diff = actualCash - expected;

    const updatedShift: CashierShift = {
      ...(shift || ({} as CashierShift)),
      endTime,
      actualClosingCash: actualCash,
      cashDifference: diff,
      closingNotes: closingNotes || '',
      status: 'closed',
      zReportNumber: zReportNum,
    };

    setCashierShifts((prev) => prev.map((s) => (s.id === shiftId ? updatedShift : s)));
    if (shift) {
      setCashRegisters((prev) =>
        prev.map((r) =>
          r.id === shift.registerId ? { ...r, currentShiftId: null, lastActiveAt: endTime } : r
        )
      );
    }
    return updatedShift;
  }, [cashierShifts]);

  const cashDropShift = useCallback((shiftId: string, amount: number, notes?: string) => {
    setCashierShifts((prev) =>
      prev.map((s) => {
        if (s.id === shiftId) {
          const newDrop = (s.cashDropAmount || 0) + amount;
          const newExpected = s.openingCash + s.cashSales - s.refundsTotal - newDrop;
          return {
            ...s,
            cashDropAmount: newDrop,
            expectedCash: newExpected,
            closingNotes: s.closingNotes
              ? `${s.closingNotes} | توريد للخزينة: ${amount} ر.س (${notes || ''})`
              : `توريد نقدية للخزينة: ${amount} ر.س (${notes || ''})`,
          };
        }
        return s;
      })
    );
  }, []);

  const parkOrder = useCallback((orderData: Omit<ParkedOrder, 'id' | 'savedAt' | 'orderNumber'>): ParkedOrder => {
    const orderNum = documentSequenceService.getNextNumber(
      'parked_order',
      undefined,
      parkedOrders.map((o) => o.orderNumber)
    );
    const newParked: ParkedOrder = {
      ...orderData,
      id: generateEntityId('hold'),
      orderNumber: orderNum,
      savedAt: new Date().toISOString(),
    };
    setParkedOrders((prev) => [newParked, ...prev]);
    return newParked;
  }, [parkedOrders]);

  const resumeParkedOrder = useCallback((orderId: string): ParkedOrder | undefined => {
    const found = parkedOrders.find((o) => o.id === orderId);
    if (found) {
      setParkedOrders((prev) => prev.filter((o) => o.id !== orderId));
    }
    return found;
  }, [parkedOrders]);

  const deleteParkedOrder = useCallback((orderId: string) => {
    setParkedOrders((prev) => prev.filter((o) => o.id !== orderId));
  }, []);

  const processPosSale = useCallback(async (saleData: {
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
  }): Promise<SalesInvoice> => {
    const nowIso = new Date().toISOString();
    const [issueDate, issueTimePart] = nowIso.split('T');
    const issueTime = issueTimePart ? issueTimePart.substring(0, 8) : '12:00:00';
    assertDateNotInClosedPeriod(issueDate, 'فاتورة مبيعات نقاط البيع (POS)');
    const fiscalYear = getDocFiscalYear(issueDate);

    assertSaleInventory(saleData.items, inventory);

    const branch = branches.find((b) => b.id === activeBranchId) || branches[0];
    const register = cashRegisters.find((r) => r.id === activeRegisterId) || cashRegisters[0];
    const currentShift = cashierShifts.find((s) => s.registerId === register?.id && s.status === 'open');

    const totalSubtotal = saleData.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const lineDiscounts = saleData.items.reduce((sum, i) => sum + (i.discount || 0), 0);
    const orderDiscount = saleData.discountTotal || 0;
    const totalDiscount = lineDiscounts + orderDiscount;
    const taxableAmount = saleData.items.reduce((sum, i) => sum + i.subtotal, 0) - orderDiscount;
    const totalVat = saleData.items.reduce((sum, i) => sum + i.vatAmount, 0);
    const totalAmount = taxableAmount + totalVat;

    const invoiceNumber = documentSequenceService.getNextNumber(
      'sales_invoice',
      fiscalYear,
      salesInvoices.map((s) => s.invoiceNumber)
    );
    const newId = generateEntityId('pos_inv');
    const uuid = generateUUID();

    const tlvBase64 = generateZatcaTlvBase64({
      sellerName: branch?.nameAr || companySettings.nameAr,
      vatNumber: branch?.vatNumber || companySettings.vatNumber,
      timestamp: `${issueDate}T${issueTime}Z`,
      totalAmount: totalAmount,
      vatAmount: totalVat,
    });

    const isB2B = Boolean(saleData.customerVatNumber && saleData.customerVatNumber.length === 15);
    const invoiceType: InvoiceType = isB2B ? 'tax_invoice' : 'simplified_tax_invoice';

    const jvId = generateEntityId('jv');
    const jvNumber = documentSequenceService.getNextNumber(
      'journal_entry',
      fiscalYear,
      journalEntries.map((j) => j.entryNumber)
    );

    const journalLines: JournalEntryLine[] = [];

    if (saleData.paymentMethod === 'cash') {
      journalLines.push({
        id: `jvl_${Date.now()}_cash`,
        accountId: register?.cashAccountId || 'acc_110101',
        accountCode: register?.cashAccountCode || '110101',
        accountNameAr: `صندوق نقطة البيع (${register?.nameAr || 'الكاشير'})`,
        debit: totalAmount,
        credit: 0,
        description: `مبيعات نقدية فاتورة ${invoiceNumber} - ${branch?.nameAr}`,
      });
    } else if (saleData.paymentMethod === 'mada' || saleData.paymentMethod === 'pos_card') {
      journalLines.push({
        id: `jvl_${Date.now()}_mada`,
        accountId: register?.posCardAccountId || 'acc_110104',
        accountCode: register?.posCardAccountCode || '110104',
        accountNameAr: `حساب مدى لنقاط البيع (${register?.nameAr || 'POS'})`,
        debit: totalAmount,
        credit: 0,
        description: `مبيعات بطاقة مدى/POS فاتورة ${invoiceNumber} - تفويض: ${saleData.madaAuthCode || 'إلكتروني'}`,
      });
    } else if (saleData.splitPaymentDetails) {
      if (saleData.splitPaymentDetails.cashAmount > 0) {
        journalLines.push({
          id: `jvl_${Date.now()}_split_cash`,
          accountId: register?.cashAccountId || 'acc_110101',
          accountCode: register?.cashAccountCode || '110101',
          accountNameAr: `صندوق نقطة البيع (${register?.nameAr || 'الكاشير'})`,
          debit: saleData.splitPaymentDetails.cashAmount,
          credit: 0,
          description: `جزء نقدي فاتورة ${invoiceNumber}`,
        });
      }
      if (saleData.splitPaymentDetails.madaAmount > 0) {
        journalLines.push({
          id: `jvl_${Date.now()}_split_mada`,
          accountId: register?.posCardAccountId || 'acc_110104',
          accountCode: register?.posCardAccountCode || '110104',
          accountNameAr: `حساب مدى لنقاط البيع (${register?.nameAr || 'POS'})`,
          debit: saleData.splitPaymentDetails.madaAmount,
          credit: 0,
          description: `جزء مدى فاتورة ${invoiceNumber}`,
        });
      }
    } else {
      journalLines.push({
        id: `jvl_${Date.now()}_other`,
        accountId: saleData.paymentMethod === 'credit' ? 'acc_1102' : register?.cashAccountId || 'acc_110101',
        accountCode: saleData.paymentMethod === 'credit' ? '1102' : register?.cashAccountCode || '110101',
        accountNameAr:
          saleData.paymentMethod === 'credit' ? 'العملاء والمدينون' : `صندوق نقطة البيع (${register?.nameAr})`,
        debit: totalAmount,
        credit: 0,
        description: `مبيعات نقطة بيع ${invoiceNumber}`,
      });
    }

    journalLines.push({
      id: `jvl_${Date.now()}_rev`,
      accountId: 'acc_4101',
      accountCode: '4101',
      accountNameAr: 'إيرادات مبيعات السلع (خاضعة لضريبة 15%)',
      debit: 0,
      credit: taxableAmount,
      description: `إيراد مبيعات فاتورة كاشير ${invoiceNumber}`,
    });

    journalLines.push({
      id: `jvl_${Date.now()}_vat`,
      accountId: 'acc_2102',
      accountCode: '2102',
      accountNameAr: 'ضريبة القيمة المضافة على المخرجات (مستحقة لهيئة الزكاة)',
      debit: 0,
      credit: totalVat,
      description: `ضريبة مخرجات 15% ZATCA - ${invoiceNumber}`,
    });

    const newJournalEntry: JournalEntry = {
      id: jvId,
      entryNumber: jvNumber,
      date: issueDate,
      referenceType: 'sales_invoice',
      referenceId: newId,
      referenceNumber: invoiceNumber,
      narrationAr: `مبيعات نقطة بيع ${invoiceNumber} - ${branch?.nameAr} (${register?.nameAr}) - الكاشير: ${currentShift?.cashierName || 'سعود'}`,
      lines: journalLines,
      totalDebit: totalAmount,
      totalCredit: totalAmount,
      isBalanced: true,
      createdAt: nowIso,
    };

    const invoiceItemsFormatted: InvoiceItem[] = saleData.items.map((i, idx) => ({
      id: `pos_item_${Date.now()}_${idx}`,
      itemId: i.itemId,
      nameAr: i.nameAr,
      quantity: i.quantity,
      unit: i.unit || 'قطعة',
      unitPrice: i.unitPrice,
      discount: i.discount || 0,
      vatRate: i.vatRate,
      vatAmount: i.vatAmount,
      subtotal: i.subtotal,
      totalWithVat: i.totalWithVat,
    }));

    const newInvoice: SalesInvoice = {
      id: newId,
      invoiceNumber,
      uuid,
      issueDate,
      issueTime,
      type: invoiceType,
      customerId: saleData.customerId || 'cust_walkin',
      customerName: saleData.customerName || 'عميل نقدي / عام',
      customerVatNumber: saleData.customerVatNumber,
      items: invoiceItemsFormatted,
      subtotal: totalSubtotal,
      discountTotal: totalDiscount,
      taxableAmount,
      vatTotal: totalVat,
      totalAmount,
      paymentMethod: saleData.paymentMethod,
      paymentStatus: saleData.paidAmount >= totalAmount ? 'paid' : saleData.paidAmount > 0 ? 'partial' : 'unpaid',
      paidAmount: saleData.paidAmount,
      remainingAmount: Math.max(0, totalAmount - saleData.paidAmount),
      notes: saleData.notes,
      zatcaQrBase64: tlvBase64,
      journalEntryId: jvId,
      status: 'posted',
      postedAt: nowIso,
      isPosSale: true,
      branchId: branch?.id,
      branchName: branch?.nameAr,
      registerId: register?.id,
      registerName: register?.nameAr,
      shiftId: currentShift?.id,
      cashierName: currentShift?.cashierName || register?.assignedCashierName || 'الكاشير',
      cashTendered: saleData.cashTendered,
      changeReturned: saleData.changeReturned,
      madaAuthCode: saleData.madaAuthCode,
      splitPaymentDetails: saleData.splitPaymentDetails,
    };

    if (currentShift) {
      setCashierShifts((prev) =>
        prev.map((s) => {
          if (s.id === currentShift.id) {
            let addCash = 0;
            let addMada = 0;
            let addCc = 0;

            if (saleData.paymentMethod === 'cash') addCash = totalAmount;
            else if (saleData.paymentMethod === 'mada' || saleData.paymentMethod === 'pos_card') addMada = totalAmount;
            else if ((saleData.paymentMethod as string) === 'credit_card') addCc = totalAmount;
            else if (saleData.splitPaymentDetails) {
              addCash = saleData.splitPaymentDetails.cashAmount;
              addMada = saleData.splitPaymentDetails.madaAmount;
            }

            const newCashSales = s.cashSales + addCash;
            const newMadaSales = s.madaSales + addMada;
            const newCcSales = s.creditCardSales + addCc;
            const newTotalSales = s.totalSales + totalAmount;
            const newTotalVat = s.totalVat + totalVat;
            const newExpectedCash = s.openingCash + newCashSales - s.refundsTotal - s.cashDropAmount;

            return {
              ...s,
              cashSales: newCashSales,
              madaSales: newMadaSales,
              creditCardSales: newCcSales,
              totalSales: newTotalSales,
              totalVat: newTotalVat,
              invoicesCount: s.invoicesCount + 1,
              expectedCash: newExpectedCash,
            };
          }
          return s;
        })
      );
    }

    const newStockMovements: StockMovement[] = [];
    const updatedInventory = inventory.map((item) => {
      const lineItem = saleData.items.find((i) => i.itemId === item.id);
      if (lineItem) {
        const prevStock = item.currentStock;
        const newStock = prevStock - lineItem.quantity;
        newStockMovements.push({
          id: `sm_pos_${Date.now()}_${item.id}`,
          itemId: item.id,
          itemName: item.nameAr,
          date: issueDate,
          type: 'sale',
          quantity: lineItem.quantity,
          previousStock: prevStock,
          newStock: newStock,
          referenceNumber: invoiceNumber,
          documentType: 'pos_sale',
          documentId: newId,
          notes: `مبيعات كاشير POS - ${branch?.nameAr || ''} (${register?.nameAr || ''})`,
        });
        return { ...item, currentStock: newStock };
      }
      return item;
    });

    setInventory(updatedInventory);
    if (newStockMovements.length > 0) {
      setStockMovements((prev) => [...newStockMovements, ...prev]);
    }

    const updatedJournalEntries = [newJournalEntry, ...journalEntries];
    setJournalEntries(updatedJournalEntries);
    setSalesInvoices((prev) => [newInvoice, ...prev]);

    setAccounts((prevAccs) => recalculateAccountBalances(updatedJournalEntries, prevAccs));

    return newInvoice;
  }, [
    activeBranchId,
    activeRegisterId,
    assertDateNotInClosedPeriod,
    branches,
    cashRegisters,
    cashierShifts,
    companySettings,
    inventory,
    journalEntries,
    recalculateAccountBalances,
    salesInvoices,
    setAccounts,
    setCashierShifts,
    setInventory,
    setJournalEntries,
    setSalesInvoices,
    setStockMovements,
  ]);

  const contextValue: POSContextType = value || {
    branches,
    cashRegisters,
    cashierShifts,
    parkedOrders,
    activeBranchId,
    activeRegisterId,
    activeShift,
    setActiveBranchId,
    setActiveRegisterId,
    addBranch,
    updateBranch,
    toggleBranchStatus,
    deleteBranch,
    checkBranchDependencies,
    addCashRegister,
    updateCashRegister,
    toggleCashRegisterStatus,
    deleteCashRegister,
    checkCashRegisterDependencies,
    startCashierShift,
    closeCashierShift,
    cashDropShift,
    parkOrder,
    resumeParkedOrder,
    deleteParkedOrder,
    processPosSale,
    setBranches,
    setCashRegisters,
    setCashierShifts,
    setParkedOrders,
  };

  return <POSContext.Provider value={contextValue}>{children}</POSContext.Provider>;
};

export const usePOS = (): POSContextType => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider or AccountingProvider');
  }
  return context;
};
