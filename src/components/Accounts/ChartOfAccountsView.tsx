import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { useToast } from '../../context/ToastContext';
import { Account, AccountType, AccountNature, DependencyCheckResult } from '../../types/accounting';
import { formatSAR } from '../../utils/currency';
import { AccountStatementModal } from './AccountStatementModal';
import { DependencyCheckModal } from '../Common/DependencyCheckModal';
import { EmptyState } from '../Common/EmptyState';
import {
  FolderTree,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Folder,
  FileSpreadsheet,
  Layers,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  Power,
} from 'lucide-react';

export const ChartOfAccountsView: React.FC = () => {
  const {
    accounts,
    addAccount,
    updateAccount,
    deleteAccount,
    toggleAccountStatus,
    checkAccountDependencies,
  } = useAccounting();
  const { toast, confirmModal } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | AccountType>('all');
  const [statementAccount, setStatementAccount] = useState<Account | null>(null);

  // Add / Edit Account Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Dependency Modal State
  const [depModalOpen, setDepModalOpen] = useState(false);
  const [depTargetAccount, setDepTargetAccount] = useState<Account | null>(null);
  const [depCheckResult, setDepCheckResult] = useState<DependencyCheckResult | null>(null);

  const [code, setCode] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [type, setType] = useState<AccountType>('asset');
  const [nature, setNature] = useState<AccountNature>('debit');
  const [parentId, setParentId] = useState<string>('');
  const [isTransactional, setIsTransactional] = useState(true);

  // Expand / collapse tracking
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({
    '1': true,
    '11': true,
    '2': true,
    '21': true,
    '3': true,
    '4': true,
    '5': true,
  });

  const toggleExpand = (accountCode: string) => {
    setExpandedCodes((prev) => ({
      ...prev,
      [accountCode]: !prev[accountCode],
    }));
  };

  const handleOpenAdd = (parent?: Account) => {
    setEditingAccount(null);
    if (parent) {
      setParentId(parent.id);
      setType(parent.type);
      setNature(parent.nature);
      // propose next code
      const subAccounts = accounts.filter((a) => a.parentId === parent.id);
      const nextNum = (subAccounts.length + 1).toString().padStart(2, '0');
      setCode(`${parent.code}${nextNum}`);
    } else {
      setParentId('');
      setCode('1199');
      setType('asset');
      setNature('debit');
    }
    setNameAr('');
    setNameEn('');
    setIsTransactional(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (acc: Account) => {
    setEditingAccount(acc);
    setCode(acc.code);
    setNameAr(acc.nameAr);
    setNameEn(acc.nameEn || '');
    setType(acc.type);
    setNature(acc.nature);
    setParentId(acc.parentId || '');
    setIsTransactional(acc.isTransactional);
    setModalOpen(true);
  };

  const handleDeleteAccount = async (acc: Account) => {
    const check = checkAccountDependencies(acc.id);
    if (!check.canDelete) {
      setDepTargetAccount(acc);
      setDepCheckResult(check);
      setDepModalOpen(true);
      return;
    }

    const ok = await confirmModal({
      title: 'حذف الحساب المالي',
      message: `هل أنت متأكد من حذف الحساب (${acc.code} - ${acc.nameAr}) نهائياً؟`,
      severity: 'danger',
      confirmLabel: 'حذف الحساب',
    });

    if (ok) {
      deleteAccount(acc.id);
      toast.success(`تم حذف الحساب "${acc.nameAr}" بنجاح`);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim() || !code.trim()) {
      toast.error('يرجى تعبئة رمز الحساب والاسم بالعربية');
      return;
    }

    const parent = accounts.find((a) => a.id === parentId);
    const level = parent ? parent.level + 1 : 1;

    if (editingAccount) {
      updateAccount(editingAccount.id, {
        code,
        nameAr,
        nameEn,
        type,
        nature,
        parentId: parentId || null,
        isTransactional,
      });
      toast.success(`تم تحديث الحساب (${code} - ${nameAr}) بنجاح`);
    } else {
      addAccount({
        code,
        nameAr,
        nameEn,
        type,
        nature,
        parentId: parentId || null,
        level,
        isTransactional,
      });
      toast.success(`تمت إضافة الحساب (${code} - ${nameAr}) بنجاح`);
    }
    setModalOpen(false);
  };

  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.code.includes(searchTerm) ||
      (acc.nameEn && acc.nameEn.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'all' || acc.type === typeFilter;

    return matchesSearch && matchesType;
  });

  // Organize accounts by tree structure
  const rootAccounts = accounts.filter((a) => !a.parentId && (typeFilter === 'all' || a.type === typeFilter));

  const renderAccountNode = (acc: Account, depth = 0) => {
    const children = accounts.filter((a) => a.parentId === acc.id);
    const hasChildren = children.length > 0;
    const isExpanded = !!expandedCodes[acc.code];
    const isAccActive = acc.isActive !== false;

    return (
      <div key={acc.id} className="text-xs">
        <div
          className={`flex items-center justify-between p-3 rounded-xl transition hover:bg-slate-50 border ${
            !isAccActive ? 'bg-slate-50/60 opacity-75' : ''
          } ${
            acc.level === 1
              ? 'bg-slate-100/90 border-slate-200 font-bold text-slate-900 mb-2 shadow-2xs'
              : acc.level === 2
              ? 'bg-slate-50/80 border-slate-200/80 font-semibold text-slate-800 mb-1'
              : 'border-slate-100 text-slate-700 mb-1 bg-white'
          }`}
          style={{ marginRight: `${depth * 20}px` }}
        >
          <div className="flex items-center gap-2.5">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(acc.code)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <span className="w-6" />
            )}

            <span className="font-mono px-2 py-0.5 rounded-lg bg-white text-slate-700 border border-slate-200 font-medium">
              {acc.code}
            </span>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-slate-900">{acc.nameAr}</span>
                {!isAccActive && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-600 font-normal">معطل</span>
                )}
              </div>
              {acc.nameEn && <span className="text-[10px] text-slate-400 font-sans">({acc.nameEn})</span>}
            </div>

            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                acc.nature === 'debit' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {acc.nature === 'debit' ? 'مدين' : 'دائن'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {acc.isTransactional ? (
              <span className="font-mono font-bold text-slate-900 text-sm">{formatSAR(acc.balance)}</span>
            ) : (
              <span className="text-[10px] text-slate-400 font-medium">حساب رئيسي مجمع</span>
            )}

            {/* Status toggle */}
            <button
              type="button"
              onClick={() => toggleAccountStatus(acc.id)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition ${
                isAccActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
              }`}
              title="تغيير حالة تفعيل الحساب"
            >
              <Power className="w-2.5 h-2.5" />
              <span>{isAccActive ? 'نشط' : 'معطل'}</span>
            </button>

            <div className="flex items-center gap-1">
              {acc.isTransactional && (
                <button
                  onClick={() => setStatementAccount(acc)}
                  className="px-2 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 text-[11px] font-bold transition"
                  title="كشف حساب"
                >
                  كشف حساب
                </button>
              )}

              <button
                onClick={() => handleOpenAdd(acc)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition"
                title="إضافة حساب فرعي تحته"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleOpenEdit(acc)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 transition"
                title="تعديل الحساب"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleDeleteAccount(acc)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 transition"
                title="حذف الحساب"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-1 my-1">
            {children.map((child) => renderAccountNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">دليل وشجرة الحسابات المعيارية</h2>
            <span className="bg-purple-50 text-purple-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-purple-200">
              {accounts.length} حساب
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            دليل الحسابات المحاسبي السعودي الشامل (الأصول، الالتزامات، حقوق الملكية، الإيرادات، المصروفات)
          </p>
        </div>

        <button
          onClick={() => handleOpenAdd()}
          className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition shadow-xs active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ إضافة حساب جديد</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { id: 'all', label: 'كافة الحسابات' },
          { id: 'asset', label: '1. الأصول (Assets)' },
          { id: 'liability', label: '2. الالتزامات (Liabilities)' },
          { id: 'equity', label: '3. حقوق الملكية (Equity)' },
          { id: 'revenue', label: '4. الإيرادات (Revenue)' },
          { id: 'expense', label: '5. المصروفات (Expenses)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTypeFilter(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl font-medium transition ${
              typeFilter === tab.id
                ? 'bg-purple-600 text-white font-bold shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Account Tree View */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-xs">
        {rootAccounts.map((root) => renderAccountNode(root))}
      </div>

      {/* Statement Modal */}
      {statementAccount && (
        <AccountStatementModal
          account={statementAccount}
          onClose={() => setStatementAccount(null)}
        />
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-xl p-6 text-right space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                {editingAccount ? 'تعديل الحساب' : 'إضافة حساب محاسبي جديد'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">رقم / رمز الحساب *</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-medium">طبيعة الحساب</label>
                  <select
                    value={nature}
                    onChange={(e) => setNature(e.target.value as AccountNature)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="debit">مدين (Debit)</option>
                    <option value="credit">دائن (Credit)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">اسم الحساب بالعربي *</label>
                <input
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">الاسم بالإنجليزية (اختياري)</label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-sans focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">الحساب الرئيسي التابع له</label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="">-- حساب مستوى أول رئيسي --</option>
                  {accounts
                    .filter((a) => !a.isTransactional)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.nameAr}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="transCheck"
                  checked={isTransactional}
                  onChange={(e) => setIsTransactional(e.target.checked)}
                  className="rounded bg-white border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="transCheck" className="text-slate-700 cursor-pointer font-medium">
                  حساب تحليلي يقبل الترحيل والقيود المباشرة (Sub-Account)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition shadow-xs active:scale-95"
                >
                  حفظ الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Dependency Check Modal */}
      {depModalOpen && depTargetAccount && depCheckResult && (
        <DependencyCheckModal
          isOpen={depModalOpen}
          onClose={() => {
            setDepModalOpen(false);
            setDepTargetAccount(null);
            setDepCheckResult(null);
          }}
          title={`تعذر حذف الحساب المحاسبي: ${depTargetAccount.code} - ${depTargetAccount.nameAr}`}
          entityName={`${depTargetAccount.code} - ${depTargetAccount.nameAr}`}
          entityType="الحساب المحاسبي"
          checkResult={depCheckResult}
          onToggleDeactivate={() => {
            toggleAccountStatus(depTargetAccount.id);
          }}
          isCurrentlyActive={depTargetAccount.isActive !== false}
        />
      )}
    </div>
  );
};
