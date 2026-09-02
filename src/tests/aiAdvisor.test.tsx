import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AccountingProvider } from '../context/AccountingContext';
import { useAiAdvisor } from '../hooks/useAiAdvisor';

describe('useAiAdvisor Hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AccountingProvider>{children}</AccountingProvider>
  );

  it('initializes with default state, welcome message, and quick prompts', () => {
    const { result } = renderHook(() => useAiAdvisor(), { wrapper });

    expect(result.current.messages.length).toBeGreaterThan(0);
    expect(result.current.messages[0].sender).toBe('ai');
    expect(result.current.quickPrompts.length).toBe(4);
    expect(result.current.loading).toBe(false);
    expect(result.current.includeFinancialContext).toBe(true);
    expect(result.current.consentOptions.shareIncome).toBe(true);
    expect(result.current.consentOptions.shareBalance).toBe(true);
    expect(result.current.consentOptions.shareVat).toBe(true);
  });

  it('allows updating input message and toggling consent options', () => {
    const { result } = renderHook(() => useAiAdvisor(), { wrapper });

    act(() => {
      result.current.setInputMessage('استفسار تجريبي');
    });
    expect(result.current.inputMessage).toBe('استفسار تجريبي');

    act(() => {
      result.current.setConsentOptions((prev) => ({
        ...prev,
        shareActivityCounts: true,
      }));
    });
    expect(result.current.consentOptions.shareActivityCounts).toBe(true);
  });

  it('handles cancelling an ongoing request gracefully', () => {
    const { result } = renderHook(() => useAiAdvisor(), { wrapper });

    act(() => {
      result.current.handleCancelRequest();
    });

    expect(result.current.loading).toBe(false);
    const lastMsg = result.current.messages[result.current.messages.length - 1];
    expect(lastMsg.text).toContain('تم إيقاف الطلب');
  });
});
