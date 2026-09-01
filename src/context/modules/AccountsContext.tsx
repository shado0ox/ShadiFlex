import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Account, JournalEntry, DependencyCheckResult } from '../../types/accounting';
import { getAccountingRepository } from '../../services/dataService';
import { useCompanySettings } from './CompanyContext';
import { roundMoney, moneyAdd, moneySub } from '../../utils/money';
import { isReportEligibleJournalEntry } from '../../utils/fiscalPeriodUtils';
import { validateAccountForPosting as validatePostingAccount } from '../../services/journalValidationService';

export interface AccountsContextType {
  accounts: Account[];
  addAccount: (data: Omit<Account, 'id' | 'balance'>) => Account;
  updateAccount: (id: string, data: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  toggleAccountStatus: (id: string) => void;
  checkAccountDependencies: (id: string) => DependencyCheckResult;
  validateAccountForPosting: (accountIdentifier: string) => { isValid: boolean; error?: string; account?: Account };
  recalculateAccountBalances: (entries: JournalEntry[], baseAccounts: Account[]) => Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
}

export const AccountsContext = createContext<AccountsContextType | undefined>(undefined);

export const recalculateBalances = (entries: JournalEntry[], baseAccounts: Account[]): Account[] => {
  const balances: Record<string, number> = {};

  entries.forEach((entry) => {
    if (!isReportEligibleJournalEntry(entry)) return;

    entry.lines.forEach((line) => {
      if (balances[line.accountId] === undefined) balances[line.accountId] = 0;
      const targetAcc = baseAccounts.find((a) => a.id === line.accountId);
      if (targetAcc) {
        const debitAmt = roundMoney(line.debit);
        const creditAmt = roundMoney(line.credit);
        if (targetAcc.nature === 'debit') {
          balances[line.accountId] = moneyAdd(balances[line.accountId], moneySub(debitAmt, creditAmt));
        } else {
          balances[line.accountId] = moneyAdd(balances[line.accountId], moneySub(creditAmt, debitAmt));
        }
      }
    });
  });

  return baseAccounts.map((acc) => {
    if (balances[acc.id] !== undefined) {
      return { ...acc, balance: roundMoney(balances[acc.id]) };
    }
    return acc;
  });
};

export const AccountsProvider: React.FC<{
  children: React.ReactNode;
  value?: AccountsContextType;
}> = ({ children, value }) => {
  const repo = getAccountingRepository();
  const { logAuditEvent } = useCompanySettings();

  const [accounts, setAccounts] = useState<Account[]>(() => repo.loadAccounts());

  useEffect(() => {
    repo.saveAccounts(accounts);
  }, [accounts]);

  useEffect(() => {
    const handleReload = () => {
      setAccounts(repo.loadAccounts());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('shadi_flex_data_reloaded', handleReload);
      return () => window.removeEventListener('shadi_flex_data_reloaded', handleReload);
    }
  }, [repo]);

  const addAccount = useCallback((data: Omit<Account, 'id' | 'balance'>): Account => {
    const newAcc: Account = {
      ...data,
      id: `acc_${Date.now()}`,
      balance: 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
    };
    setAccounts((prev) => [...prev, newAcc]);

    logAuditEvent({
      action: 'create',
      entityType: 'account',
      entityId: newAcc.id,
      after: newAcc as unknown as Record<string, unknown>,
      reason: `إضافة حساب جديد في الدليل المحاسبي: ${newAcc.nameAr} (${newAcc.code})`,
      source: 'web_ui',
      metadata: { code: newAcc.code, nameAr: newAcc.nameAr, type: newAcc.type },
    });

    return newAcc;
  }, [logAuditEvent]);

  const updateAccount = useCallback((id: string, data: Partial<Account>) => {
    const existing = accounts.find((a) => a.id === id);
    if (!existing) return;
    const updated = { ...existing, ...data };
    setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));

    logAuditEvent({
      action: 'update',
      entityType: 'account',
      entityId: id,
      before: existing as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
      reason: `تعديل الحساب المحاسبي: ${existing.nameAr} (${existing.code})`,
      source: 'web_ui',
    });
  }, [accounts, logAuditEvent]);

  const toggleAccountStatus = useCallback((id: string) => {
    const existing = accounts.find((a) => a.id === id);
    if (!existing) return;
    const updated = { ...existing, isActive: existing.isActive === false ? true : false };
    setAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));

    logAuditEvent({
      action: 'update',
      entityType: 'account',
      entityId: id,
      before: existing as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
      reason: `تغيير حالة الحساب ${existing.nameAr} (${existing.code}) إلى ${updated.isActive ? 'نشط' : 'معطل'}`,
      source: 'web_ui',
    });
  }, [accounts, logAuditEvent]);

  const checkAccountDependencies = useCallback((id: string): DependencyCheckResult => {
    const acc = accounts.find((a) => a.id === id);
    if (!acc) return { canDelete: false, reason: 'الحساب غير موجود' };

    const isSystemPrimary =
      acc.level === 1 ||
      ['1', '2', '3', '4', '5', '11', '21', '31', '41', '51', '1101', '1102', '1104', '2101', '2102', '3101', '3102', '4101', '5101'].includes(acc.code);
    const childrenCount = accounts.filter((a) => a.parentId === id).length;
    const hasBalance = Math.abs(acc.balance || 0) > 0.001;

    const summary: Array<{ label: string; count: number }> = [];
    if (isSystemPrimary) summary.push({ label: 'حساب رئيسي في الدليل المحاسبي', count: 1 });
    if (childrenCount > 0) summary.push({ label: 'حسابات فرعية تابعة', count: childrenCount });
    if (hasBalance) summary.push({ label: `رصيد مالي (${acc.balance.toFixed(2)} ر.س)`, count: 1 });

    const canDelete = summary.length === 0;
    const reason = !canDelete
      ? `لا يمكن حذف هذا الحساب لوجود ${summary.map((s) => `${s.label}${s.count > 1 ? ` (${s.count})` : ''}`).join('، ')}. استخدم التعطيل بدلاً من الحذف.`
      : undefined;

    return {
      canDelete,
      reason,
      details: {
        isSystemPrimary,
        childrenCount,
        hasBalance,
      },
      dependenciesSummary: summary,
    };
  }, [accounts]);

  const deleteAccount = useCallback((id: string) => {
    const check = checkAccountDependencies(id);
    if (!check.canDelete) {
      throw new Error(check.reason || 'لا يمكن حذف الحساب لوجود قيود أو أرصدة أو حسابات فرعية');
    }
    const acc = accounts.find((a) => a.id === id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));

    if (acc) {
      logAuditEvent({
        action: 'delete',
        entityType: 'account',
        entityId: id,
        before: acc as unknown as Record<string, unknown>,
        reason: `حذف الحساب المحاسبي: ${acc.nameAr} (${acc.code})`,
        source: 'web_ui',
      });
    }
  }, [accounts, checkAccountDependencies, logAuditEvent]);

  const validateAccountForPostingCallback = useCallback((accountIdentifier: string) => {
    return validatePostingAccount(accountIdentifier, accounts);
  }, [accounts]);

  const contextValue: AccountsContextType = value || {
    accounts,
    addAccount,
    updateAccount,
    deleteAccount,
    toggleAccountStatus,
    checkAccountDependencies,
    validateAccountForPosting: validateAccountForPostingCallback,
    recalculateAccountBalances: recalculateBalances,
    setAccounts,
  };

  return <AccountsContext.Provider value={contextValue}>{children}</AccountsContext.Provider>;
};

export const useAccounts = (): AccountsContextType => {
  const context = useContext(AccountsContext);
  if (!context) {
    throw new Error('useAccounts must be used within an AccountsProvider or AccountingProvider');
  }
  return context;
};
