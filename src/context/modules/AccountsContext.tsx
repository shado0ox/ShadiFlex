import React, { createContext, useContext } from 'react';
import { Account, DependencyCheckResult } from '../../types/accounting';

export interface AccountsContextType {
  accounts: Account[];
  addAccount: (account: Omit<Account, 'id' | 'balance'>) => Account;
  updateAccount: (id: string, account: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  toggleAccountStatus: (id: string) => void;
  checkAccountDependencies: (id: string) => DependencyCheckResult;
  validateAccountForPosting: (accountIdentifier: string) => { isValid: boolean; error?: string; account?: Account };
}

export const AccountsContext = createContext<AccountsContextType | undefined>(undefined);

export const AccountsProvider: React.FC<{
  value: AccountsContextType;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return <AccountsContext.Provider value={value}>{children}</AccountsContext.Provider>;
};

export const useAccounts = (): AccountsContextType => {
  const context = useContext(AccountsContext);
  if (!context) {
    throw new Error('useAccounts must be used within an AccountingProvider / AccountsProvider');
  }
  return context;
};
