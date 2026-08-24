import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { Branch, CashRegister, CashierShift } from '../../types/accounting';
import { PosShiftModal } from './PosShiftModal';
import {
  Store,
  Computer,
  Clock,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  Printer,
  DollarSign,
  FileText,
  ShieldCheck,
  Search,
  Filter,
  Building,
  CreditCard,
  Lock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const BranchesAndRegistersManager: React.FC = () => {
  const {
    branches,
    cashRegisters,
    cashierShifts,
    accounts,
    salesInvoices,
    companySettings,
    activeBranchId,
    setActiveBranchId,
    activeRegisterId,
    setActiveRegisterId,
    addBranch,
    updateBranch,
    deleteBranch,
    addCashRegister,
    updateCashRegister,
    deleteCashRegister,
    setActiveTab,
  } = useAccounting();

  const [activeSubTab, setActiveSubTab] = useState<'branches' | 'registers' | 'shifts'>('branches');

  // Branch Form Modal State
  const [showBranchModal, setShowBranchModal] = useState<boolean>(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [branchForm, setBranchForm] = useState<Omit<Branch, 'id' | 'createdAt'>>({
    code: '',
    nameAr: '',
    nameEn: '',
    city: 'الرياض',
    district: 'العليا',
    street: 'طريق الملك فهد',
    postalCode: '12211',
    buildingNumber: '1001',
    phone: '0112345678',
    managerName: '',
    vatNumber: companySettings.vatNumber,
    crNumber: companySettings.crNumber,
    isMainBranch: false,
    isActive: true,
  });

  // Register Form Modal State
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [editingRegisterId, setEditingRegisterId] = useState<string | null>(null);
  const [registerForm, setRegisterForm] = useState<Omit<CashRegister, 'id'>>({
    branchId: branches[0]?.id || 'br_1',
    branchName: branches[0]?.nameAr || 'الفرع الرئيسي',
    code: '',
    nameAr: '',
    nameEn: '',
    deviceType: 'desktop',
    printerType: 'thermal_80mm',
    cashAccountId: 'acc_110101',
    cashAccountCode: '110101',
    posCardAccountId: 'acc_110104',
    posCardAccountCode: '110104',
    assignedCashierName: 'سعود المحاسب',
    isActive: true,
    currentShiftId: null,
  });

  // Shift report view modal
  const [selectedShiftForReport, setSelectedShiftForReport] = useState<CashierShift | null>(null);

  // Shift log filter state
  const [shiftBranchFilter, setShiftBranchFilter] = useState<string>('all');
  const [shiftStatusFilter, setShiftStatusFilter] = useState<string>('all');

  // Open Add Branch Modal
  const handleOpenAddBranch = () => {
    setEditingBranchId(null);
    const nextCode = `BR-${(branches.length + 1).toString().padStart(2, '0')}`;
    setBranchForm({
      code: nextCode,
      nameAr: '',
      nameEn: '',
      city: 'الرياض',
      district: '',
      street: '',
      postalCode: '12211',
      buildingNumber: '',
      phone: companySettings.phone || '',
      managerName: '',
      vatNumber: companySettings.vatNumber,
      crNumber: companySettings.crNumber,
      isMainBranch: branches.length === 0,
      isActive: true,
    });
    setShowBranchModal(true);
  };

  // Open Edit Branch Modal
  const handleOpenEditBranch = (branch: Branch) => {
    setEditingBranchId(branch.id);
    setBranchForm({
      code: branch.code,
      nameAr: branch.nameAr,
      nameEn: branch.nameEn || '',
      city: branch.city,
      district: branch.district || '',
      street: branch.street || '',
      postalCode: branch.postalCode || '',
      buildingNumber: branch.buildingNumber || '',
      phone: branch.phone || '',
      managerName: branch.managerName || '',
      vatNumber: branch.vatNumber || companySettings.vatNumber,
      crNumber: branch.crNumber || companySettings.crNumber,
      isMainBranch: branch.isMainBranch || false,
      isActive: branch.isActive !== false,
    });
    setShowBranchModal(true);
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.nameAr.trim()) {
      alert('يرجى إدخال اسم الفرع بالعربية!');
      return;
    }
    if (editingBranchId) {
      updateBranch(editingBranchId, branchForm);
    } else {
      addBranch(branchForm);
    }
    setShowBranchModal(false);
  };

  const handleDeleteBranch = (branchId: string, branchName: string) => {
    const assignedRegs = cashRegisters.filter((r) => r.branchId === branchId);
    if (assignedRegs.length > 0) {
      alert(`لا يمكن حذف هذا الفرع لوجود ${assignedRegs.length} صناديق كاشير مسجلة تابعة له! يرجى نقل أو حذف الصناديق أولاً.`);
      return;
    }
    if (confirm(`هل أنت متأكد من حذف فرع (${branchName}) نهائياً؟`)) {
      deleteBranch(branchId);
    }
  };

  // Open Add Register Modal
  const handleOpenAddRegister = () => {
    setEditingRegisterId(null);
    const targetBranch = branches.find((b) => b.id === activeBranchId) || branches[0];
    const nextCode = `POS-${(cashRegisters.length + 1).toString().padStart(2, '0')}`;
    setRegisterForm({
      branchId: targetBranch?.id || 'br_1',
      branchName: targetBranch?.nameAr || 'الفرع الرئيسي',
      code: nextCode,
      nameAr: `صندوق كاشير ${cashRegisters.length + 1}`,
      nameEn: `Cash Register ${cashRegisters.length + 1}`,
      deviceType: 'desktop',
      printerType: 'thermal_80mm',
      cashAccountId: 'acc_110101',
      cashAccountCode: '110101',
      posCardAccountId: 'acc_110104',
      posCardAccountCode: '110104',
      assignedCashierName: '',
      isActive: true,
      currentShiftId: null,
    });
    setShowRegisterModal(true);
  };

  // Open Edit Register Modal
  const handleOpenEditRegister = (reg: CashRegister) => {
    setEditingRegisterId(reg.id);
    setRegisterForm({
      branchId: reg.branchId,
      branchName: reg.branchName,
      code: reg.code,
      nameAr: reg.nameAr,
      nameEn: reg.nameEn || '',
      deviceType: reg.deviceType || 'desktop',
      printerType: reg.printerType || 'thermal_80mm',
      cashAccountId: reg.cashAccountId,
      cashAccountCode: reg.cashAccountCode,
      posCardAccountId: reg.posCardAccountId,
      posCardAccountCode: reg.posCardAccountCode,
      assignedCashierName: reg.assignedCashierName || '',
      isActive: reg.isActive !== false,
      currentShiftId: reg.currentShiftId || null,
    });
    setShowRegisterModal(true);
  };

  const handleSaveRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.nameAr.trim()) {
      alert('يرجى إدخال اسم صندوق الكاشير!');
      return;
    }
    const b = branches.find((br) => br.id === registerForm.branchId);
    const payload = {
      ...registerForm,
      branchName: b?.nameAr || registerForm.branchName,
    };

    if (editingRegisterId) {
      updateCashRegister(editingRegisterId, payload);
    } else {
      addCashRegister(payload);
    }
    setShowRegisterModal(false);
  };

  const handleDeleteRegister = (regId: string, regName: string) => {
    const hasShift = cashierShifts.some((s) => s.registerId === regId && s.status === 'open');
    if (hasShift) {
      alert('لا يمكن حذف الصندوق لوجود وردية مفتوحة حالياً فيه!');
      return;
    }
    if (confirm(`هل أنت متأكد من حذف صندوق الكاشير (${regName})؟`)) {
      deleteCashRegister(regId);
    }
  };

  // Filtered shifts
  const filteredShifts = cashierShifts.filter((s) => {
    const matchesBranch = shiftBranchFilter === 'all' || s.branchId === shiftBranchFilter;
    const matchesStatus = shiftStatusFilter === 'all' || s.status === shiftStatusFilter;
    return matchesBranch && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <span>نقاط البيع (POS)</span>
            <span>•</span>
            <span className="text-emerald-700 font-bold">إدارة الفروع وصناديق الكاشير</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            الفروع وصناديق الكاشير والورديات
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            إعداد وتوزيع الفروع الجغرافية، تخصيص أجهزة وصناديق الكاشير، ومتابعة سجلات الإغلاق (Z-Reports)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pos_sales')}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Computer className="w-4 h-4" />
            فتح شاشة الكاشير (POS Terminal)
          </button>
        </div>
      </div>

      {/* Navigation Sub Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('branches')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition cursor-pointer ${
            activeSubTab === 'branches'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>الفروع والمواقع ({branches.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('registers')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition cursor-pointer ${
            activeSubTab === 'registers'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Computer className="w-4 h-4" />
          <span>صناديق ونقاط البيع ({cashRegisters.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('shifts')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition cursor-pointer ${
            activeSubTab === 'shifts'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>سجل الورديات وتقارير Z ({cashierShifts.length})</span>
        </button>
      </div>

      {/* SUBTAB 1: BRANCHES MANAGEMENT */}
      {activeSubTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="font-bold text-sm text-slate-900">فروع المنشأة المسجلة</h3>
              <p className="text-xs text-slate-500">
                يمكن ربط كل فرع بأكثر من صندوق كاشير ومتابعة مبيعاته وضريبته بشكل مستقل
              </p>
            </div>
            <button
              onClick={handleOpenAddBranch}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إضافة فرع جديد
            </button>
          </div>

          {/* Branches Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((branch) => {
              const branchRegisters = cashRegisters.filter((r) => r.branchId === branch.id);
              const branchInvoices = salesInvoices.filter((inv) => inv.branchId === branch.id);
              const branchSalesTotal = branchInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

              return (
                <div
                  key={branch.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                          <Store className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900">{branch.nameAr}</h4>
                            {branch.isMainBranch && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                الرئيسي
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono text-slate-400">{branch.code}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditBranch(branch)}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                          title="تعديل بيانات الفرع"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!branch.isMainBranch && (
                          <button
                            onClick={() => handleDeleteBranch(branch.id, branch.nameAr)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="حذف الفرع"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Address & Contact Meta */}
                    <div className="text-xs text-slate-600 space-y-1.5 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {branch.city} - {branch.district || 'حي العليا'}، {branch.street || ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{branch.phone || '0112345678'}</span>
                      </div>
                      {branch.managerName && (
                        <div className="text-[11px] text-slate-500">
                          المدير المسؤول: <span className="font-semibold text-slate-700">{branch.managerName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Stats: Number of Registers & Total Sales */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50 -mx-5 -mb-5 p-4 rounded-b-2xl">
                    <div>
                      <span className="text-slate-500 block text-[10px]">صناديق الكاشير</span>
                      <span className="font-bold text-slate-800">{branchRegisters.length} صناديق</span>
                    </div>
                    <div className="text-left">
                      <span className="text-slate-500 block text-[10px]">إجمالي المبيعات</span>
                      <span className="font-bold font-mono text-emerald-700">{branchSalesTotal.toFixed(2)} ر.س</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 2: REGISTERS MANAGEMENT */}
      {activeSubTab === 'registers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="font-bold text-sm text-slate-900">صناديق ونقاط البيع (Cash Registers)</h3>
              <p className="text-xs text-slate-500">
                ربط كل نقطة بيع بفرع محدد وحسابات الصندوق النقدي وحساب مدى في دليل الحسابات
              </p>
            </div>
            <button
              onClick={handleOpenAddRegister}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إضافة صندوق كاشير
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cashRegisters.map((register) => {
              const isOpen = register.currentShiftId !== null;
              const activeShiftObj = cashierShifts.find((s) => s.id === register.currentShiftId);

              return (
                <div
                  key={register.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2.5 rounded-xl border ${isOpen ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          <Computer className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">{register.nameAr}</h4>
                          <span className="text-xs font-mono text-slate-400">{register.code}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditRegister(register)}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                          title="تعديل الصندوق"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRegister(register.id, register.nameAr)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="حذف الصندوق"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="text-xs text-slate-600 space-y-1.5 pt-1 border-t border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-slate-500">الفرع التابع له:</span>
                        <span className="font-bold text-slate-800">{register.branchName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">الكاشير الافتراضي:</span>
                        <span className="font-medium">{register.assignedCashierName || 'غير محدد'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">حساب الصندوق النقدي:</span>
                        <span className="font-mono text-emerald-800 font-bold">{register.cashAccountCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">حساب شبكة مدى:</span>
                        <span className="font-mono text-teal-800 font-bold">{register.posCardAccountCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">نوع الطابعة:</span>
                        <span className="font-medium text-slate-700">
                          {register.printerType === 'thermal_58mm' ? 'إيصالات حرارية 58mm' : 'إيصالات حرارية 80mm'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Banner */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50 -mx-5 -mb-5 p-4 rounded-b-2xl">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                      <span className={`font-bold ${isOpen ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {isOpen ? 'الوردية مفتوحة حالياً' : 'مغلق'}
                      </span>
                    </div>

                    {isOpen && activeShiftObj && (
                      <span className="font-mono text-[11px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {activeShiftObj.shiftNumber}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 3: SHIFTS & Z-REPORTS HISTORY */}
      {activeSubTab === 'shifts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="font-bold text-sm text-slate-900">سجل الورديات وتقارير الإغلاق (Z-Reports)</h3>
              <p className="text-xs text-slate-500">
                مراجعة إحصائيات المبيعات، ومطابقة النقدية، وفروقات الدرج لكل وردية كاشير
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2">
              <select
                value={shiftBranchFilter}
                onChange={(e) => setShiftBranchFilter(e.target.value)}
                className="text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
              >
                <option value="all">جميع الفروع</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nameAr}
                  </option>
                ))}
              </select>

              <select
                value={shiftStatusFilter}
                onChange={(e) => setShiftStatusFilter(e.target.value)}
                className="text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
              >
                <option value="all">جميع الحالات</option>
                <option value="open">مفتوحة حالياً</option>
                <option value="closed">مغلقة (تم إصدار تقرير Z)</option>
              </select>
            </div>
          </div>

          {/* Shifts Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="p-3.5">رقم الوردية / تقرير Z</th>
                    <th className="p-3.5">الفرع والصندوق</th>
                    <th className="p-3.5">الكاشير</th>
                    <th className="p-3.5">وقت البداية / الإغلاق</th>
                    <th className="p-3.5 text-left">مبيعات نقدية</th>
                    <th className="p-3.5 text-left">مبيعات مدى</th>
                    <th className="p-3.5 text-left">إجمالي المبيعات</th>
                    <th className="p-3.5 text-left">فارق الدرج</th>
                    <th className="p-3.5 text-center">الحالة</th>
                    <th className="p-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredShifts.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        لا توجد ورديات مطابقة لخيارات البحث
                      </td>
                    </tr>
                  ) : (
                    filteredShifts.map((shift) => (
                      <tr key={shift.id} className="hover:bg-slate-50 transition">
                        <td className="p-3.5">
                          <span className="font-mono font-bold text-slate-900 block">{shift.shiftNumber}</span>
                          {shift.zReportNumber && (
                            <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                              {shift.zReportNumber}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-800">{shift.branchName}</div>
                          <span className="text-[11px] text-slate-500">{shift.registerName}</span>
                        </td>
                        <td className="p-3.5 font-medium text-slate-800">{shift.cashierName}</td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-600">
                          <div>البداية: {new Date(shift.startTime).toLocaleTimeString('ar-SA')} ({new Date(shift.startTime).toLocaleDateString('ar-SA')})</div>
                          {shift.endTime ? (
                            <div>الإغلاق: {new Date(shift.endTime).toLocaleTimeString('ar-SA')}</div>
                          ) : (
                            <span className="text-emerald-700 font-bold">مستمرة الآن</span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-left font-bold text-slate-800">
                          {shift.cashSales.toFixed(2)} ر.س
                        </td>
                        <td className="p-3.5 font-mono text-left font-bold text-slate-800">
                          {shift.madaSales.toFixed(2)} ر.س
                        </td>
                        <td className="p-3.5 font-mono text-left font-black text-emerald-800 text-sm">
                          {shift.totalSales.toFixed(2)} ر.س
                        </td>
                        <td className="p-3.5 font-mono text-left">
                          {shift.cashDifference !== undefined ? (
                            <span
                              className={`px-2 py-0.5 rounded font-bold ${
                                shift.cashDifference === 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : shift.cashDifference > 0
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {shift.cashDifference > 0 ? `+${shift.cashDifference.toFixed(2)}` : shift.cashDifference.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          {shift.status === 'open' ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full">
                              مفتوحة
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-full">
                              مغلقة
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => setSelectedShiftForReport(shift)}
                            className="flex items-center gap-1 mx-auto px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-bold transition cursor-pointer shadow-xs"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            تقرير Z
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* BRANCH ADD/EDIT MODAL */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  {editingBranchId ? 'تعديل بيانات الفرع' : 'إضافة فرع جديد للمنشأة'}
                </h3>
              </div>
              <button
                onClick={() => setShowBranchModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رمز الفرع (Code):</label>
                  <input
                    type="text"
                    required
                    value={branchForm.code}
                    onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم الفرع بالعربية:</label>
                  <input
                    type="text"
                    required
                    value={branchForm.nameAr}
                    onChange={(e) => setBranchForm({ ...branchForm, nameAr: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-hidden"
                    placeholder="مثال: فرع الرياض - العليا"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">اسم الفرع بالإنجليزية (اختياري):</label>
                  <input
                    type="text"
                    value={branchForm.nameEn || ''}
                    onChange={(e) => setBranchForm({ ...branchForm, nameEn: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-hidden font-sans"
                    placeholder="e.g. Riyadh - Olaya Branch"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">اسم المدير المسؤول:</label>
                  <input
                    type="text"
                    value={branchForm.managerName || ''}
                    onChange={(e) => setBranchForm({ ...branchForm, managerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-hidden"
                    placeholder="مثال: م. أحمد السبيعي"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">المدينة:</label>
                  <input
                    type="text"
                    required
                    value={branchForm.city}
                    onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">الحي:</label>
                  <input
                    type="text"
                    value={branchForm.district || ''}
                    onChange={(e) => setBranchForm({ ...branchForm, district: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">الشارع:</label>
                  <input
                    type="text"
                    value={branchForm.street || ''}
                    onChange={(e) => setBranchForm({ ...branchForm, street: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">الرقم الضريبي VAT للفرع:</label>
                  <input
                    type="text"
                    value={branchForm.vatNumber || ''}
                    onChange={(e) => setBranchForm({ ...branchForm, vatNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">رقم الهاتف:</label>
                  <input
                    type="text"
                    value={branchForm.phone || ''}
                    onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isMainBranch"
                  checked={branchForm.isMainBranch || false}
                  onChange={(e) => setBranchForm({ ...branchForm, isMainBranch: e.target.checked })}
                  className="rounded text-emerald-600"
                />
                <label htmlFor="isMainBranch" className="text-xs text-slate-700 font-bold">
                  تعيين كفرع رئيسي وصالة العرض المركزية
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm"
                >
                  حفظ الفرع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REGISTER ADD/EDIT MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Computer className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  {editingRegisterId ? 'تعديل صندوق الكاشير' : 'إضافة صندوق كاشير جديد'}
                </h3>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRegister} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الفرع التابع له:</label>
                  <select
                    value={registerForm.branchId}
                    onChange={(e) => setRegisterForm({ ...registerForm, branchId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-hidden font-medium"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رمز الصندوق (Code):</label>
                  <input
                    type="text"
                    required
                    value={registerForm.code}
                    onChange={(e) => setRegisterForm({ ...registerForm, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم الصندوق بالعربية:</label>
                  <input
                    type="text"
                    required
                    value={registerForm.nameAr}
                    onChange={(e) => setRegisterForm({ ...registerForm, nameAr: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-hidden"
                    placeholder="مثال: صندوق كاشير 1"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">الكاشير الافتراضي المسؤول:</label>
                  <input
                    type="text"
                    value={registerForm.assignedCashierName || ''}
                    onChange={(e) => setRegisterForm({ ...registerForm, assignedCashierName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-hidden"
                    placeholder="مثال: سعود المحاسب"
                  />
                </div>
              </div>

              {/* Chart of Accounts Linkage */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800">ربط الحسابات المالية بدليل الحسابات المحاسبي:</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">حساب النقدية بالصندوق:</label>
                    <select
                      value={registerForm.cashAccountId}
                      onChange={(e) => {
                        const acc = accounts.find((a) => a.id === e.target.value);
                        setRegisterForm({
                          ...registerForm,
                          cashAccountId: e.target.value,
                          cashAccountCode: acc?.code || '110101',
                        });
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-hidden"
                    >
                      {accounts
                        .filter((a) => a.code.startsWith('1101') || a.accountType === 'current_asset')
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} - {a.nameAr}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">حساب مدى ونقاط البيع:</label>
                    <select
                      value={registerForm.posCardAccountId}
                      onChange={(e) => {
                        const acc = accounts.find((a) => a.id === e.target.value);
                        setRegisterForm({
                          ...registerForm,
                          posCardAccountId: e.target.value,
                          posCardAccountCode: acc?.code || '110104',
                        });
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-hidden"
                    >
                      {accounts
                        .filter((a) => a.code.startsWith('1101') || a.code.startsWith('1102') || a.accountType === 'current_asset')
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} - {a.nameAr}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Hardware / Printer selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">نوع الطابعة الحرارية:</label>
                  <select
                    value={registerForm.printerType}
                    onChange={(e) => setRegisterForm({ ...registerForm, printerType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-hidden"
                  >
                    <option value="thermal_80mm">طابعة إيصالات حرارية 80 ملم (القياسية)</option>
                    <option value="thermal_58mm">طابعة إيصالات حرارية 58 ملم (الصغيرة)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">نوع الجهاز:</label>
                  <select
                    value={registerForm.deviceType}
                    onChange={(e) => setRegisterForm({ ...registerForm, deviceType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-hidden"
                  >
                    <option value="desktop">شاشة كاشير مكتبية / كمبيوتر</option>
                    <option value="tablet">جهاز لوحي / تابلت كاشير</option>
                    <option value="mobile">جهاز محمول مدمج بنقاط البيع</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm"
                >
                  حفظ الصندوق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW Z-REPORT MODAL */}
      {selectedShiftForReport && (
        <PosShiftModal
          mode="view_z_report"
          selectedShiftForReport={selectedShiftForReport}
          cashRegisters={cashRegisters}
          branches={branches}
          activeRegisterId={activeRegisterId}
          companySettings={companySettings}
          onStartShift={() => {}}
          onCloseShift={() => {}}
          onClose={() => setSelectedShiftForReport(null)}
        />
      )}
    </div>
  );
};
