import React, { useState } from 'react';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Code2,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { useAccounting } from '../../../context/AccountingContext';
import { ApiKey } from '../../../types/accounting';

export const ApiKeysTab: React.FC = () => {
  const {
    apiKeys,
    createApiKey,
    toggleApiKeyStatus,
    deleteApiKey,
  } = useAccounting();

  // API Key Form State
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [keyEnv, setKeyEnv] = useState<'production' | 'test'>('production');
  const [keyPermissions, setKeyPermissions] = useState<string[]>([
    'invoices:read',
    'invoices:write',
    'customers:read',
    'reports:read',
  ]);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [revealedKeyId, setRevealedKeyId] = useState<string | null>(null);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKey | null>(null);

  // Handle Copy Key to Clipboard
  const handleCopyKey = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2500);
  };

  // Handle Create API Key
  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    const newKey = createApiKey({
      name: keyName.trim(),
      permissions: keyPermissions,
      environment: keyEnv,
    });

    setNewlyCreatedKey(newKey);
    setIsApiKeyModalOpen(false);
    setKeyName('');
    setKeyPermissions(['invoices:read', 'invoices:write', 'customers:read', 'reports:read']);
  };

  return (
    <div className="space-y-6">
      {/* Newly Created Key Alert Modal */}
      {newlyCreatedKey && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-slate-900 text-xs space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>تم إنشاء مفتاح API الجديد بنجاح!</span>
            </div>
            <button
              onClick={() => setNewlyCreatedKey(null)}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              إغلاق
            </button>
          </div>

          <p className="text-slate-600 text-[11px]">
            يرجى نسخ هذا المفتاح الآن وحفظه في مكان آمن. لن تتمكن من رؤية المفتاح السري الكامل مرة أخرى لأسباب أمنية.
          </p>

          <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-emerald-300">
            <code className="flex-1 font-mono text-xs font-bold text-indigo-900 select-all overflow-x-auto">
              {newlyCreatedKey.key}
            </code>
            <button
              onClick={() => handleCopyKey(newlyCreatedKey.key, newlyCreatedKey.id)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              {copiedKeyId === newlyCreatedKey.id ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ المفتاح</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* API Header & Key Manager */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
        {/* Demo Notice Warning Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-bold text-amber-900">
              تنبيه أمان بيئة العرض التجريبية (Demo Mode Security)
            </div>
            <p className="text-amber-800 leading-relaxed">
              مفاتيح الـ API المعروضة هنا هي مفاتيح توضيحية لغرض تجربة الواجهة فقط. لا يتم تخزين مفاتيح سرية حقيقية داخل التخزين المحلي (LocalStorage)، ولا تُستخدم هذه المفاتيح للمصادقة الإنتاجية الحقيقية.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-600" />
              مفاتيح الربط والواجهات البرمجية (REST API Keys)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              استخدم هذه المفاتيح لربط برنامج المحاسبة مع متجرك على سلة (Salla)، زد (Zid)، شوبيفاي، أو أنظمة نقاط البيع POS
            </p>
          </div>

          <button
            onClick={() => setIsApiKeyModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md shadow-indigo-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء مفتاح API جديد</span>
          </button>
        </div>

        {/* API Keys Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="p-3.5">اسم المفتاح / التطبيق</th>
                <th className="p-3.5">البيئة</th>
                <th className="p-3.5">المفتاح السري (API Key)</th>
                <th className="p-3.5">الصلاحيات</th>
                <th className="p-3.5">تاريخ الإنشاء</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {apiKeys.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    لا توجد مفاتيح API حالياً. انقر على "إنشاء مفتاح API جديد" للبدء بالربط مع التطبيقات الخارجية.
                  </td>
                </tr>
              ) : (
                apiKeys.map((key) => {
                  const isRevealed = revealedKeyId === key.id;
                  return (
                    <tr key={key.id} className="hover:bg-slate-50/60">
                      <td className="p-3.5 font-bold text-slate-900">{key.name}</td>
                      <td className="p-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            key.environment === 'production'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {key.environment === 'production' ? 'بيئة الإنتاج Live' : 'بيئة الاختبار Sandbox'}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-700 select-all">
                            {isRevealed ? key.key : key.maskedKey}
                          </span>
                          <button
                            onClick={() => setRevealedKeyId(isRevealed ? null : key.id)}
                            className="text-slate-400 hover:text-slate-600 p-1"
                            title={isRevealed ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleCopyKey(key.key, key.id)}
                            className="text-slate-400 hover:text-indigo-600 p-1"
                            title="نسخ المفتاح"
                          >
                            {copiedKeyId === key.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {key.permissions.map((p) => (
                            <span
                              key={p}
                              className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {new Date(key.createdAt).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => toggleApiKeyStatus(key.id)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                            key.isActive
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {key.isActive ? 'نشط ومفعل' : 'معطل مؤقتاً'}
                        </button>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => deleteApiKey(key.id)}
                          title="حذف المفتاح نهائياً"
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Integration Examples & Webhook Docs */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-indigo-400" />
            <h4 className="font-bold text-white text-sm">أمثلة الربط والتكامل البرمجي (Integration Guides)</h4>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">REST API v1 / JSON</span>
        </div>

        <p className="text-xs text-slate-300">
          يمكنك تمرير مفتاح الـ API في ترويسة الطلب <code className="bg-slate-800 px-2 py-0.5 rounded text-indigo-300 font-mono">Authorization: Bearer sk_live_...</code> لمزامنة فواتير المبيعات، تسجيل المدفوعات، وإصدار الفواتير الإلكترونية ZATCA فورياً.
        </p>

        <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-slate-300 space-y-2 overflow-x-auto border border-slate-800">
          <div className="text-slate-500"># مثال طلب إنشاء فاتورة مبيعات إلكترونية عبر cURL:</div>
          <div className="text-indigo-300">curl -X POST https://api.accounting.sa/v1/invoices \</div>
          <div className="pl-4 text-emerald-400">-H "Authorization: Bearer sk_live_your_api_key" \</div>
          <div className="pl-4 text-emerald-400">-H "Content-Type: application/json" \</div>
          <div className="pl-4 text-slate-300">-d &#39;&#123;</div>
          <div className="pl-8 text-slate-300">"customer_id": "cust_123",</div>
          <div className="pl-8 text-slate-300">"issue_date": "2026-08-24",</div>
          <div className="pl-8 text-slate-300">"items": [&#123; "name": "خدمة استشارية", "qty": 1, "unit_price": 500, "vat_rate": 0.15 &#125;],</div>
          <div className="pl-8 text-slate-300">"payment_method": "bank_transfer"</div>
          <div className="pl-4 text-slate-300">&#125;&#39;</div>
        </div>
      </div>

      {/* Create API Key Modal */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-right space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                  <Key className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">توليد مفتاح API جديد</h3>
              </div>
              <button onClick={() => setIsApiKeyModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateApiKey} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  اسم المفتاح / اسم المنصة المرتبطة <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="مثال: متجر سلة Salla / منصة زد Zid / نظام نقاط البيع"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">بيئة الاستخدام (Demo Reference)</label>
                <select
                  value={keyEnv}
                  onChange={(e) => setKeyEnv(e.target.value as 'production' | 'test')}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900"
                >
                  <option value="production">نموذج بيئة الإنتاج التجريبي (Demo Live - demo_live_...)</option>
                  <option value="test">نموذج بيئة الاختبار التجريبي (Demo Sandbox - demo_test_...)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-2">صلاحيات المفتاح (Permissions)</label>
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {[
                    { id: 'invoices:read', label: 'قراءة واستعلام الفواتير' },
                    { id: 'invoices:write', label: 'إصدار وتعديل فواتير المبيعات' },
                    { id: 'customers:read', label: 'قراءة بيانات وسجلات العملاء' },
                    { id: 'customers:write', label: 'إضافة وتحديث العملاء' },
                    { id: 'vouchers:write', label: 'إنشاء سندات القبض والصرف' },
                    { id: 'reports:read', label: 'استخراج التقارير المالية والإقرارات' },
                  ].map((perm) => (
                    <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={keyPermissions.includes(perm.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setKeyPermissions([...keyPermissions, perm.id]);
                          } else {
                            setKeyPermissions(keyPermissions.filter((p) => p !== perm.id));
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-slate-700">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsApiKeyModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md"
                >
                  توليد المفتاح الآن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
