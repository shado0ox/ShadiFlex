import React from 'react';
import { useAiAdvisor, ChatMessage, ConsentOptions } from '../hooks/useAiAdvisor';
import { formatSAR } from '../utils/currency';
import {
  Sparkles,
  Send,
  Bot,
  User,
  ShieldCheck,
  AlertCircle,
  Lightbulb,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  XCircle,
  KeyRound,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export type { ChatMessage, ConsentOptions };

export const AiAdvisor: React.FC = () => {
  const {
    income,
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
    messagesEndRef,
    quickPrompts,
    currentPayloadPreview,
    handleCancelRequest,
    handleSendMessage,
  } = useAiAdvisor();

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
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
              استشارات محاسبية فورية، فحص اشتراطات ZATCA، حساب الزكاة والضريبة، وتوجيه القيود طبقاً لمعايير SOCPA
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
            <span className="font-mono font-bold text-purple-700">{formatSAR(vat.netVatPayableOrRefundable)}</span>
          </div>
        </div>
      </div>

      {/* Notice when GEMINI_API_KEY is not configured */}
      {isApiKeyMissing && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3 shadow-xs">
          <KeyRound className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-amber-950 text-sm">مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير مسجل حالياً</div>
            <p className="text-amber-800 leading-relaxed text-xs">
              جميع وظائف النظام المحاسبي (الفواتير، قيود اليومية، المخزون، ونظام ضريبة القيمة المضافة) تعمل محلياً بنسبة 100% دون الحاجة لأي مفتاح. لتفعيل المستشار الذكي، يمكنك إضافة مفتاح <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono text-[11px]">GEMINI_API_KEY</code> في إعدادات البيئة.
            </p>
          </div>
        </div>
      )}

      {/* Privacy Notice & Granular Context Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex-shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-xs">سياسة الخصوصية وأمان البيانات المالية:</span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  أرقام مجهولة ومجردة
                </span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">
                لا يتم إرسال أي أسماء عملاء أو موردين، ويتم حجب الأرقام الضريبية والمفاتيح السرية افتراضياً.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center flex-wrap">
            {/* Master Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 font-medium transition shadow-2xs">
              <input
                type="checkbox"
                checked={includeFinancialContext}
                onChange={(e) => setIncludeFinancialContext(e.target.checked)}
                className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
              />
              <span>تضمين السياق المالي</span>
            </label>

            {/* Custom Consent Expand Button */}
            {includeFinancialContext && (
              <button
                type="button"
                onClick={() => setShowCustomConsent(!showCustomConsent)}
                className="flex items-center gap-1 text-xs text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-xl transition shadow-2xs font-medium"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>تحديد البيانات المشاركة</span>
                {showCustomConsent ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Preview Button */}
            {includeFinancialContext && (
              <button
                type="button"
                onClick={() => setShowDataPreview(!showDataPreview)}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-xl border border-transparent hover:border-slate-200 transition"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showDataPreview ? 'إخفاء المعاينة' : 'معاينة'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Granular Consent Controls Box */}
        {includeFinancialContext && showCustomConsent && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 animate-in fade-in duration-200 text-xs">
            <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-purple-200 cursor-pointer">
              <input
                type="checkbox"
                checked={consentOptions.shareIncome}
                onChange={(e) => setConsentOptions((prev) => ({ ...prev, shareIncome: e.target.checked }))}
                className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
              />
              <div>
                <span className="font-semibold text-slate-800 block text-[11px]">قائمة الدخل والأرباح</span>
                <span className="text-[10px] text-slate-500">المبيعات، تكلفة البضاعة، وصافي الربح</span>
              </div>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-purple-200 cursor-pointer">
              <input
                type="checkbox"
                checked={consentOptions.shareBalance}
                onChange={(e) => setConsentOptions((prev) => ({ ...prev, shareBalance: e.target.checked }))}
                className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
              />
              <div>
                <span className="font-semibold text-slate-800 block text-[11px]">المركز المالي والسيولة</span>
                <span className="text-[10px] text-slate-500">الأصول، الخصوم، حقوق الملكية، والنقدية</span>
              </div>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-purple-200 cursor-pointer">
              <input
                type="checkbox"
                checked={consentOptions.shareVat}
                onChange={(e) => setConsentOptions((prev) => ({ ...prev, shareVat: e.target.checked }))}
                className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
              />
              <div>
                <span className="font-semibold text-slate-800 block text-[11px]">ملخص ضريبة ZATCA</span>
                <span className="text-[10px] text-slate-500">ضريبة المبيعات والمشتريات وصافي المستحق</span>
              </div>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-purple-200 cursor-pointer">
              <input
                type="checkbox"
                checked={consentOptions.shareActivityCounts}
                onChange={(e) => setConsentOptions((prev) => ({ ...prev, shareActivityCounts: e.target.checked }))}
                className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
              />
              <div>
                <span className="font-semibold text-slate-800 block text-[11px]">إحصاءات حجم العمليات</span>
                <span className="text-[10px] text-slate-500">أعداد الفواتير وعدد أصناف المخزون</span>
              </div>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-purple-200 cursor-pointer">
              <input
                type="checkbox"
                checked={consentOptions.shareCompanyName}
                onChange={(e) => setConsentOptions((prev) => ({ ...prev, shareCompanyName: e.target.checked }))}
                className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
              />
              <div>
                <span className="font-semibold text-slate-800 block text-[11px]">اسم المنشأة التجاري</span>
                <span className="text-[10px] text-slate-500">لمخاطبتك باسم المنشأة في التحليل</span>
              </div>
            </label>
          </div>
        )}

        {/* Data Preview Box */}
        {includeFinancialContext && showDataPreview && (
          <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl text-xs font-mono border border-slate-800 shadow-inner animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <span className="text-emerald-400 font-bold text-[11px]">البيانات الفعلية التي سيتم مشاركتها في هذا الطلب:</span>
              <span className="text-slate-400 text-[10px]">مفصولة ومعزولة عن أي تفاصيل سرية</span>
            </div>
            <pre className="overflow-x-auto text-[11px] text-slate-300 dir-ltr text-left">
              {JSON.stringify(currentPayloadPreview || { message: 'لا توجد بيانات مشاركة' }, null, 2)}
            </pre>
          </div>
        )}
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
              className="text-right p-2.5 rounded-xl bg-white hover:bg-purple-50/60 border border-slate-200 hover:border-purple-300 text-xs text-slate-700 hover:text-purple-900 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
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
                      : m.isWarning
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-purple-100 text-purple-700 border border-purple-200'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : m.isWarning ? <AlertCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : m.isWarning
                      ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-tl-none space-y-2'
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
              <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-none p-3.5 text-xs text-purple-700 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري استدعاء البيانات المالية وصياغة التحليل الآمن...</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelRequest}
                  className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 border border-red-200 rounded-lg text-[11px] font-medium transition shadow-2xs"
                  title="إلغاء الطلب"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>إلغاء</span>
                </button>
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
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputMessage}
                maxLength={4000}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={
                  loading
                    ? 'جاري معالجة الاستفسار السابق...'
                    : 'اكتب استفسارك المحاسبي، الضريبي، أو استشر عن كيفية قيد حركة معينة...'
                }
                disabled={loading}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-right shadow-2xs pl-16 disabled:bg-slate-100 disabled:text-slate-400"
              />
              {inputMessage.length > 2000 && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                  {inputMessage.length}/4000
                </span>
              )}
            </div>

            {loading ? (
              <button
                type="button"
                onClick={handleCancelRequest}
                className="px-3.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white transition text-xs font-medium flex items-center gap-1 shadow-xs flex-shrink-0"
                title="إلغاء الطلب الحالي"
              >
                <XCircle className="w-4 h-4" />
                <span>إلغاء</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition disabled:opacity-40 shadow-xs active:scale-95 flex-shrink-0"
                title="إرسال"
              >
                <Send className="w-4 h-4 rotate-180" />
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default AiAdvisor;
