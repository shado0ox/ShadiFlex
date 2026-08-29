import React, { useState, useMemo } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { AuditLogEntry, AuditLogAction, AuditLogEntityType } from '../../types/accounting';
import {
  ShieldAlert,
  Search,
  Filter,
  Trash2,
  Calendar,
  User,
  Clock,
  ArrowUpDown,
  FileText,
  Settings,
  Database,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  Layers,
  Key,
  Ban,
  RotateCcw,
  PlusCircle,
  Edit3,
} from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { auditLogs, clearAuditLogs } = useAccounting();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // Action filter
      if (selectedAction !== 'all' && log.action !== selectedAction) {
        return false;
      }
      // Entity type filter
      if (selectedEntity !== 'all' && log.entityType !== selectedEntity) {
        return false;
      }
      // Search text filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesId = log.id.toLowerCase().includes(term);
        const matchesEntityId = log.entityId.toLowerCase().includes(term);
        const matchesUser = log.user.toLowerCase().includes(term);
        const matchesReason = log.reason ? log.reason.toLowerCase().includes(term) : false;
        const matchesType = log.entityType.toLowerCase().includes(term);
        const matchesAction = log.action.toLowerCase().includes(term);

        if (!matchesId && !matchesEntityId && !matchesUser && !matchesReason && !matchesType && !matchesAction) {
          return false;
        }
      }
      return true;
    });
  }, [auditLogs, searchTerm, selectedAction, selectedEntity]);

  const getActionBadge = (action: AuditLogAction) => {
    switch (action) {
      case 'create':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <PlusCircle className="w-3 h-3" />
            إنشاء (Create)
          </span>
        );
      case 'update':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Edit3 className="w-3 h-3" />
            تعديل (Update)
          </span>
        );
      case 'post':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <FileCheck className="w-3 h-3" />
            ترحيل (Post)
          </span>
        );
      case 'cancel':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Ban className="w-3 h-3" />
            إلغاء (Cancel)
          </span>
        );
      case 'reverse':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <RotateCcw className="w-3 h-3" />
            عكس (Reverse)
          </span>
        );
      case 'import':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Database className="w-3 h-3" />
            استيراد (Import)
          </span>
        );
      case 'reset':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <RefreshCw className="w-3 h-3" />
            إعادة ضبط (Reset)
          </span>
        );
      case 'settings_update':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Settings className="w-3 h-3" />
            تعديل إعدادات
          </span>
        );
      case 'api_key_create':
      case 'api_key_toggle':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Key className="w-3 h-3" />
            مفتاح API
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {action}
          </span>
        );
    }
  };

  const getEntityLabel = (type: AuditLogEntityType) => {
    switch (type) {
      case 'sales_invoice':
        return 'فاتورة مبيعات';
      case 'purchase_invoice':
        return 'فاتورة مشتريات';
      case 'journal_entry':
        return 'قيد يومية';
      case 'voucher':
        return 'سند مالي';
      case 'debit_credit_note':
        return 'إشعار دائن/مدين';
      case 'simple_expense':
        return 'فاتورة مصروفات';
      case 'company_settings':
        return 'إعدادات المنشأة';
      case 'account':
        return 'شجرة الحسابات';
      case 'customer':
        return 'العملاء';
      case 'supplier':
        return 'الموردون';
      case 'inventory_item':
        return 'المخزون';
      case 'api_key':
        return 'مفاتيح API';
      case 'fiscal_closing':
        return 'إقفال السنة المالية';
      case 'backup_restore':
        return 'النسخ الاحتياطي';
      case 'system':
        return 'النظام';
      default:
        return type;
    }
  };

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString('ar-SA')} - ${d.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100 shadow-2xs">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">سجل التدقيق والرقابة المحلي (Audit Log)</h1>
              <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                تجريبي محلي مؤقت
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              تتبع زمني لجميع عمليات إنشاء وتعديل وترحيل وإلغاء وعكس المستندات وإعدادات النظام
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-end md:self-center">
          <button
            type="button"
            onClick={() => setShowConfirmClear(true)}
            disabled={auditLogs.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>مسح السجل المحلي</span>
          </button>
        </div>
      </div>

      {/* Critical Local Simulation Warning Notice */}
      <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 text-xs text-amber-950 flex flex-col sm:flex-row items-start gap-3.5 shadow-2xs">
        <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-sm text-amber-950">
            تنبيه الشفافية: سجل تدقيق محلي مؤقت (Demo Local Audit Log)
          </div>
          <p className="text-amber-800 text-xs leading-relaxed">
            هذا السجل يعمل حالياً في بيئة المتصفح المحلية المؤقتة باستخدام حساب تجريبي واضح باسم{' '}
            <strong className="font-semibold text-amber-950">"Demo Local User"</strong>. هذا السجل مخصص للمحاكاة والرقابة
            التشغيلية التجريبية، و<strong>لا يدّعي أنه نظام تدقيق مالي غير قابل للتغيير أو آمن محاسبياً بالكامل (Not Immutable / Not Tamper-proof)</strong>{' '}
            حتى يتم ربط النظام بخادم قاعدة بيانات سحابية موثقة وخادم سجلات دائم.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Field */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم المعرف (ID)، رقم المستند، نوع العملية، أو السبب..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Action Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 text-[11px]">العملية:</span>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="all">جميع العمليات ({auditLogs.length})</option>
              <option value="create">إنشاء (Create)</option>
              <option value="update">تعديل (Update)</option>
              <option value="post">ترحيل (Post)</option>
              <option value="cancel">إلغاء (Cancel)</option>
              <option value="reverse">عكس (Reverse)</option>
              <option value="import">استيراد (Import)</option>
              <option value="reset">إعادة ضبط (Reset)</option>
              <option value="settings_update">تعديل الإعدادات</option>
              <option value="api_key_create">إنشاء مفتاح API</option>
              <option value="api_key_toggle">تفعيل/تعطيل API</option>
            </select>
          </div>

          {/* Entity Type Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 text-[11px]">نوع العنصر:</span>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="all">الكل</option>
              <option value="sales_invoice">فواتير المبيعات</option>
              <option value="purchase_invoice">فواتير المشتريات</option>
              <option value="journal_entry">قيود اليومية</option>
              <option value="voucher">سندات القبض والصرف</option>
              <option value="debit_credit_note">إشعارات دائنة/مدينة</option>
              <option value="simple_expense">المصروفات</option>
              <option value="company_settings">إعدادات المنشأة</option>
              <option value="customer">العملاء</option>
              <option value="supplier">الموردون</option>
              <option value="inventory_item">المخزون</option>
              <option value="api_key">مفاتيح API</option>
              <option value="backup_restore">النسخ الاحتياطي</option>
              <option value="system">النظام</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3.5 px-4">رقم القيد (ID)</th>
                <th className="py-3.5 px-4">نوع العملية</th>
                <th className="py-3.5 px-4">العنصر المتأثر</th>
                <th className="py-3.5 px-4">معرف العنصر (Entity ID)</th>
                <th className="py-3.5 px-4">المستخدم</th>
                <th className="py-3.5 px-4">التاريخ والوقت</th>
                <th className="py-3.5 px-4">السبب / الملاحظات</th>
                <th className="py-3.5 px-4 text-center">التفاصيل (Diff)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="w-8 h-8 text-slate-300" />
                      <span className="text-sm font-medium">لا توجد سجلات تدقيق مطابقة للبحث</span>
                      <span className="text-xs text-slate-400">أي حركة محاسبية أو تغيير للإعدادات سيتم تتبعه وتسجيله تلقائياً هنا</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const hasChanges = log.before || log.after;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition group">
                      {/* ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700 text-[11px]">
                        {log.id}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4">{getActionBadge(log.action)}</td>

                      {/* Entity Type */}
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {getEntityLabel(log.entityType)}
                      </td>

                      {/* Entity ID */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200">
                          {log.entityId}
                        </span>
                      </td>

                      {/* User */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                          <User className="w-3 h-3 text-slate-400" />
                          {log.user}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {formatDateTime(log.timestamp)}
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 text-slate-600 max-w-[200px] truncate" title={log.reason}>
                        {log.reason || '—'}
                      </td>

                      {/* View Diff Button */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          disabled={!hasChanges && !log.reason}
                          className="px-2.5 py-1 text-[11px] rounded-lg font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition disabled:opacity-40"
                        >
                          معاينة الفروق
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Stats */}
        <div className="bg-slate-50/70 p-3.5 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            إجمالي السجلات المعروضة: <strong>{filteredLogs.length}</strong> من أصل{' '}
            <strong>{auditLogs.length}</strong> عملية مسجلة
          </span>
          <span className="font-mono text-[11px] text-slate-400">Source: Client Local Storage Snapshot</span>
        </div>
      </div>

      {/* Diff / Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">تفاصيل حركة التدقيق ({selectedLog.id})</h3>
                  <p className="text-xs text-slate-500">
                    {getEntityLabel(selectedLog.entityType)} • المعرف: {selectedLog.entityId}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="block text-[10px] text-slate-400">نوع العملية</span>
                  <div className="mt-0.5">{getActionBadge(selectedLog.action)}</div>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">المستخدم المسؤول</span>
                  <span className="font-semibold text-slate-800 block mt-1">{selectedLog.user}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">تاريخ ووقت الحركة</span>
                  <span className="font-mono text-slate-700 block mt-1 text-[11px]">
                    {formatDateTime(selectedLog.timestamp)}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">مصدر الطلب</span>
                  <span className="font-mono bg-slate-200 px-2 py-0.5 rounded text-[11px] text-slate-700 inline-block mt-1">
                    {selectedLog.source}
                  </span>
                </div>
              </div>

              {/* Reason */}
              {selectedLog.reason && (
                <div className="bg-indigo-50/70 border border-indigo-100 p-3.5 rounded-xl text-indigo-950">
                  <span className="font-bold block text-[11px] text-indigo-900">السبب المحاسبي / البيان:</span>
                  <p className="mt-0.5 text-xs text-indigo-800">{selectedLog.reason}</p>
                </div>
              )}

              {/* Before vs After Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Before */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 font-bold text-slate-700 flex items-center justify-between">
                    <span>الحالة السابقة (Before)</span>
                    <span className="text-[10px] font-normal text-slate-500">
                      {selectedLog.before ? 'بيانات سابقة' : 'لا يوجد (إنشاء جديد)'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900 text-slate-100 font-mono text-[11px] max-h-60 overflow-y-auto dir-ltr text-left">
                    <pre>{JSON.stringify(selectedLog.before || null, null, 2)}</pre>
                  </div>
                </div>

                {/* After */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 font-bold text-slate-700 flex items-center justify-between">
                    <span>الحالة اللاحقة (After)</span>
                    <span className="text-[10px] font-normal text-slate-500">
                      {selectedLog.after ? 'بيانات محدثة' : 'تم الحذف/الإلغاء'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900 text-slate-100 font-mono text-[11px] max-h-60 overflow-y-auto dir-ltr text-left">
                    <pre>{JSON.stringify(selectedLog.after || null, null, 2)}</pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-medium transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-50 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">مسح سجل التدقيق المحلي؟</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              هل أنت متأكد من رغبتك في مسح سجل التدقيق التجريبي المخزن محلياً في المتصفح؟ لن يؤثر هذا على الفواتير أو
              القيود المحاسبية، ولكنه سيفرغ تاريخ الحركات المسجلة في الـ Audit Log.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmClear(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAuditLogs();
                  setShowConfirmClear(false);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition shadow-xs"
              >
                تأكيد المسح
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
