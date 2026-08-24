import React, { useState, useRef, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { formatSAR } from '../utils/currency';
import {
  Sparkles,
  Send,
  Bot,
  User,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Lightbulb,
  FileCheck,
  RefreshCw,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const AiAdvisor: React.FC = () => {
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'ai',
      text: `مرحباً بك! أنا **المستشار المالي والضريبي الذكي** لمنشأتك (${companySettings.nameAr}).\n\nأنا مطلع على كافة بياناتك المحاسبية اللحظية، مبيعاتك (${formatSAR(income.totalRevenue)})، مشترياتك ومصروفاتك (${formatSAR(income.cogs + income.operatingExpenses)})، رصيد الخزينة والبنوك، وإقرارك الضريبي لدى **هيئة الزكاة والضريبة والجمارك (ZATCA)**.\n\nكيف يمكنني مساعدتك اليوم في التحليل المالي، الامتثال للفوترة الإلكترونية، أو توجيه القيود؟`,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const quickPrompts = [
    'حلل الوضع المالي الحالي والسيولة النقدية واقترح توصيات لتحسين الربحية',
    'ما هي متطلبات الفاتورة الضريبية وفق اشتراطات ZATCA ومرحلة الربط والتكامل؟',
    'ما هو صافي ضريبة القيمة المضافة 15% المستحقة للإقرار الحالي وكيف أسددها؟',
    'كيف يتم احتساب وعاء الزكاة الشرعية التقديرية بناءً على حقوق الملكية؟',
  ];

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    // Build real financial snapshot
    const financialContext = {
      companyName: companySettings.nameAr,
      vatNumber: companySettings.vatNumber,
      totalSales: income.totalRevenue,
      grossProfit: income.grossProfit,
      netProfit: income.netProfit,
      totalAssets: balance.totalAssets,
      totalLiabilities: balance.totalLiabilities,
      totalEquity: balance.totalEquity,
      salesInvoicesCount: salesInvoices.length,
      purchaseInvoicesCount: purchaseInvoices.length,
      inventoryCount: inventory.length,
      outputVat: vat.standardRatedSalesVat,
      inputVat: vat.standardRatedPurchasesVat,
      netVatDue: vat.netVatDue,
    };

    try {
      const response = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          financialContext,
        }),
      });

      if (!response.ok) {
        throw new Error('فشل الاتصال بخدمة الذكاء الاصطناعي');
      }

      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: data.reply || 'تم استلام الاستفسار وسأقوم بالرد فوراً.',
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'ai',
        text: 'عذراً، حدث خطأ أثناء معالجة الطلب. يرجى التأكد من مفتاح API أو إعادة المحاولة.',
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-50 via-white to-white border border-purple-100 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-purple-100 text-purple-700 border border-purple-200 shadow-2xs">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">المستشار المحاسبي والضريبي الذكي (AI)</h2>
              <span className="bg-purple-100 text-purple-700 text-[11px] px-2.5 py-0.5 rounded-full font-bold border border-purple-200">
                Gemini 2.5 Flash
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              تحليل مالي متقدم، تدقيق فواتير ZATCA، حساب الزكاة الشرعية وضريبة 15%، وإرشادات محاسبية SOCPA فورية
            </p>
          </div>
        </div>

        {/* Live Metrics Pill */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs flex items-center gap-4 text-right shadow-2xs">
          <div>
            <span className="text-slate-500 block text-[10px]">صافي الربح اللحظي</span>
            <span className="font-mono font-bold text-emerald-700">{formatSAR(income.netProfit)}</span>
          </div>
          <div className="border-r border-slate-200 pr-4">
            <span className="text-slate-500 block text-[10px]">الضريبة المستحقة (ZATCA)</span>
            <span className="font-mono font-bold text-purple-700">{formatSAR(vat.netVatDue)}</span>
          </div>
        </div>
      </div>

      {/* Quick Questions Suggestions */}
      <div className="space-y-2">
        <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          تساؤلات محاسبية سريعة:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              disabled={loading}
              className="text-right p-2.5 rounded-xl bg-white hover:bg-purple-50/60 border border-slate-200 hover:border-purple-300 text-xs text-slate-700 hover:text-purple-900 transition disabled:opacity-50 shadow-2xs"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col h-[520px]">
        {/* Messages Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 text-right">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isUser
                      ? 'bg-emerald-600 text-white'
                      : 'bg-purple-100 text-purple-700 border border-purple-200'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none space-y-2'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans text-xs sm:text-[13px]">{m.text}</div>
                  <div
                    className={`text-[10px] mt-1 font-mono ${
                      isUser ? 'text-emerald-100 text-left' : 'text-slate-400 text-left'
                    }`}
                  >
                    {m.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-none p-3.5 text-xs text-purple-700 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>جاري استدعاء البيانات المالية وصياغة التحليل...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="اكتب استفسارك المحاسبي، الضريبي، أو استشر عن كيفية قيد حركة معينة..."
              disabled={loading}
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-right shadow-2xs"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition disabled:opacity-40 shadow-xs active:scale-95"
            >
              <Send className="w-4 h-4 rotate-180" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
