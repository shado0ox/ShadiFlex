import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AccountingProvider, useAccounting } from '../context/AccountingContext';

export function renderAccountingHook() {
  localStorage.clear();
  return renderHook(() => useAccounting(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <AccountingProvider>{children}</AccountingProvider>
    ),
  });
}

export { act };
