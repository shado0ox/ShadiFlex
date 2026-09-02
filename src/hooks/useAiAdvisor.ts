import { useState, useRef, useEffect, useCallback } from 'react';
import { useAccounting } from '../context/AccountingContext';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  isWarning?: boolean;
}

export interface ConsentOptions {
  shareCompanyName: boolean;
  shareIncome: boolean;
  shareBalance: boolean;
  shareVat: boolean;
  shareActivityCounts: boolean;
}

export const QUICK_PROMPTS = [
  'حلل الوضع المالي والسيولة النقدية الحالية وقدم توصيات لرفع كفاءة رأس المال العامل',
  'ما هي اشتراطات الفوترة الإلكترونية (المرحلة الثانية - الربط والتكامل) للفواتير الضريبية والمبسطة؟',
  'ما هو صافي ضريبة القيمة المضافة 15% المستحقة للإقرار الحالي وكيف أسددها نظامياً؟',
  'كيف يتم احتساب وعاء الزكاة الشرعية التقديرية بناءً على حقوق الملكية والأصول الثابتة؟',
];

export function useAiAdvisor() {
  const {
    companySettings,
    salesInvoices,
    purchaseInvoices,
    inventory,
    getIncomeStatement,
    getBalanceSheet,
    getVatReturn,
  } = useAccounting();

  const income = getIncomeStatement();
  const balance = getBalanceSheet();
  const vat = getVatReturn();

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isApiKeyMissing, setIsApiKeyMissing] = useState(false);

  // Privacy & Consent Master & Granular Settings
  const [includeFinancialContext, setIncludeFinancialContext] = useState(true);
  const [showCustomConsent, setShowCustomConsent] = useState(false);
  const [showDataPreview, setShowDataPreview] = useState(false);
  const [consentOptions, setConsentOptions] = useState<ConsentOptions>({
    shareCompanyName: true,
    shareIncome: true,
    shareBalance: true,
    shareVat: true,
    shareActivityCounts: false,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'ai',
      text: `مرحباً بك! أنا **المستشار المالي والضريبي الذكي** لمنشأتك (${companySettings.nameAr || 'المنشأة'}).\n\nأنا جاهز لتقديم التحليلات المالية، وتفسير متطلبات **هيئة الزكاة والضريبة والجمارك (ZATCA)**، وإرشادك في إعداد القيود المحاسبية وقوائم الدخل.\n\n🛡️ **الخصوصية أولاً:** لا يتم إرسال أي أسماء عملاء أو موردين أو مفاتيح سرية، وتستطيع تخصيص البيانات المشاركة في أي وقت.`,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  // Clean up any pending abort controllers or timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Build strictly sanitized and filtered payload based on user's granular consent
  const buildSanitizedPayload = useCallback(() => {
    if (!includeFinancialContext) {
      return undefined;
    }

    const payload: Record<string, unknown> = {};

    if (consentOptions.shareCompanyName && companySettings.nameAr) {
      payload.companyName = companySettings.nameAr;
    }

    if (consentOptions.shareIncome) {
      payload.totalSales = income.totalRevenue;
      payload.grossProfit = income.grossProfit;
      payload.netProfit = income.netProfit;
    }

    if (consentOptions.shareBalance) {
      payload.totalAssets = balance.totalAssets;
      payload.totalLiabilities = balance.totalLiabilities;
      payload.totalEquity = balance.totalEquity;
      payload.cashAndBankBalance = balance.currentAssets;
    }

    if (consentOptions.shareVat) {
      payload.outputVat = vat.standardRatedSalesVat;
      payload.inputVat = vat.standardRatedPurchasesVat;
      payload.netVatDue = vat.netVatPayableOrRefundable;
    }

    if (consentOptions.shareActivityCounts) {
      payload.salesInvoicesCount = salesInvoices.length;
      payload.purchaseInvoicesCount = purchaseInvoices.length;
      payload.inventoryCount = inventory.length;
    }

    return Object.keys(payload).length > 0 ? payload : undefined;
  }, [
    includeFinancialContext,
    consentOptions,
    companySettings.nameAr,
    income.totalRevenue,
    income.grossProfit,
    income.netProfit,
    balance.totalAssets,
    balance.totalLiabilities,
    balance.totalEquity,
    balance.currentAssets,
    vat.standardRatedSalesVat,
    vat.standardRatedPurchasesVat,
    vat.netVatPayableOrRefundable,
    salesInvoices.length,
    purchaseInvoices.length,
    inventory.length,
  ]);

  const currentPayloadPreview = buildSanitizedPayload();

  // Cancel currently running request
  const handleCancelRequest = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setMessages((prev) => [
      ...prev,
      {
        id: `cancelled_${Date.now()}`,
        sender: 'ai',
        text: 'تم إيقاف الطلب بناءً على رغبتك.',
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, []);

  const handleSendMessage = useCallback(async (customPrompt?: string) => {
    // Prevent duplicate or overlapping requests while active
    if (loading) return;

    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim()) return;

    if (textToSend.length > 4000) {
      setMessages((prev) => [
        ...prev,
        {
          id: `warn_${Date.now()}`,
          sender: 'ai',
          text: 'تنبيه: نص الاستفسار طويل جداً (الحد الأقصى 4000 حرف). يرجى اختصار النص.',
          timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          isWarning: true,
        },
      ]);
      return;
    }

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    // Setup AbortController and 22-second frontend timeout
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    timeoutIdRef.current = setTimeout(() => {
      controller.abort('timeout');
    }, 22000);

    try {
      const sanitizedPayload = buildSanitizedPayload();

      const response = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: textToSend,
          financialContext: sanitizedPayload,
        }),
      });

      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        if (response.status === 429) {
          throw new Error('تم تجاوز الحد الأقصى للطلبات مؤقتاً. يرجى الانتظار دقيقة والمحاولة مجدداً.');
        }
        throw new Error('تعذر استلام رد من خادم المستشار الذكي حالياً.');
      }

      // Check if API key is not configured on server
      if (data.isConfigured === false) {
        setIsApiKeyMissing(true);
      } else {
        setIsApiKeyMissing(false);
      }

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: data.reply || 'تم استلام الاستفسار بنجاح.',
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err_timeout_${Date.now()}`,
            sender: 'ai',
            text: 'استغرقت معالجة الاستفسار وقتاً أطول من المتوقع (Timeout). يمكنك المحاولة مرة أخرى أو اختصار السؤال.',
            timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        // Safe, clean Arabic error without technical stack traces
        const userFriendlyMsg =
          err?.message && !err.message.includes('fetch') && !err.message.includes('object')
            ? err.message
            : 'تعذر إتمام الاستشارة في الوقت الحالي. يرجى التحقق من اتصالك وإعادة المحاولة.';

        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sender: 'ai',
            text: userFriendlyMsg,
            timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } finally {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      abortControllerRef.current = null;
      setLoading(false);
    }
  }, [loading, inputMessage, buildSanitizedPayload]);

  return {
    income,
    balance,
    vat,
    inputMessage,
    setInputMessage,
    loading,
    isApiKeyMissing,
    includeFinancialContext,
    setIncludeFinancialContext,
    showCustomConsent,
    setShowCustomConsent,
    showDataPreview,
    setShowDataPreview,
    consentOptions,
    setConsentOptions,
    messages,
    setMessages,
    messagesEndRef,
    quickPrompts: QUICK_PROMPTS,
    currentPayloadPreview,
    handleCancelRequest,
    handleSendMessage,
  };
}

export default useAiAdvisor;
