import React, { useState, useEffect } from 'react';
import {
  Building2,
  Globe,
  Calendar,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { useAccounting } from '../../../context/AccountingContext';
import { CompanySettings } from '../../../types/accounting';

export const CompanyProfileTab: React.FC = () => {
  const { companySettings, updateCompanySettings } = useAccounting();

  // Company Profile State
  const [profileForm, setProfileForm] = useState<CompanySettings>(() => {
    const nat = companySettings.nationalAddress || companySettings.address || {
      city: 'الرياض',
      district: 'العليا',
      street: 'طريق الملك فهد الفرعي',
      buildingNumber: '7342',
      postalCode: '12214',
      additionalNumber: '3190',
      country: 'المملكة العربية السعودية',
    };
    return {
      ...companySettings,
      nationalAddress: nat,
      address: nat,
      fiscalYear: companySettings.fiscalYear || new Date().getFullYear(),
      fiscalYearStart: companySettings.fiscalYearStart || `${new Date().getFullYear()}-01-01`,
      fiscalYearEnd: companySettings.fiscalYearEnd || `${new Date().getFullYear()}-12-31`,
    };
  });
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);

  // Sync profile form if companySettings changes externally
  useEffect(() => {
    const nat = companySettings.nationalAddress || companySettings.address || {
      city: 'الرياض',
      district: 'العليا',
      street: 'طريق الملك فهد الفرعي',
      buildingNumber: '7342',
      postalCode: '12214',
      additionalNumber: '3190',
      country: 'المملكة العربية السعودية',
    };
    setProfileForm({
      ...companySettings,
      nationalAddress: nat,
      address: nat,
      fiscalYear: companySettings.fiscalYear || new Date().getFullYear(),
      fiscalYearStart: companySettings.fiscalYearStart || `${new Date().getFullYear()}-01-01`,
      fiscalYearEnd: companySettings.fiscalYearEnd || `${new Date().getFullYear()}-12-31`,
    });
  }, [companySettings]);

  // Handle Profile Save
  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanySettings(profileForm);
    setProfileSuccessMsg('تم حفظ إعدادات وبيانات المنشأة بنجاح.');
    setTimeout(() => setProfileSuccessMsg(null), 4000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
      {profileSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{profileSuccessMsg}</span>
        </div>
      )}

      <form onSubmit={handleProfileSave} className="space-y-6 text-slate-800 text-xs">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            المعلومات القانونية والاسم التجاري
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                اسم المنشأة الرسمي بالعربية <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={profileForm.nameAr}
                onChange={(e) => setProfileForm({ ...profileForm, nameAr: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                اسم المنشأة بالإنجليزية (English Legal Name) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={profileForm.nameEn}
                onChange={(e) => setProfileForm({ ...profileForm, nameEn: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                الرقم الضريبي للمنشأة (15 رقماً - ZATCA VAT Number) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={profileForm.vatNumber}
                onChange={(e) => setProfileForm({ ...profileForm, vatNumber: e.target.value })}
                maxLength={15}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">يجب أن يبدأ برقم 3 وينتهي برقم 3 ويتكون من 15 رقماً</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                رقم السجل التجاري (Commercial Registration - CR) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={profileForm.crNumber}
                onChange={(e) => setProfileForm({ ...profileForm, crNumber: e.target.value })}
                maxLength={10}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
          </div>
        </div>

        {/* National Address */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Globe className="w-4 h-4 text-indigo-600" />
            العنوان الوطني السعودي والاتصال
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">المدينة (City)</label>
              <input
                type="text"
                value={profileForm.nationalAddress?.city || profileForm.address?.city || ''}
                onChange={(e) => {
                  const updatedNat = {
                    ...(profileForm.nationalAddress || profileForm.address || {}),
                    city: e.target.value,
                  } as any;
                  setProfileForm({
                    ...profileForm,
                    nationalAddress: updatedNat,
                    address: updatedNat,
                  });
                }}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">الحي (District)</label>
              <input
                type="text"
                value={profileForm.nationalAddress?.district || profileForm.address?.district || ''}
                onChange={(e) => {
                  const updatedNat = {
                    ...(profileForm.nationalAddress || profileForm.address || {}),
                    district: e.target.value,
                  } as any;
                  setProfileForm({
                    ...profileForm,
                    nationalAddress: updatedNat,
                    address: updatedNat,
                  });
                }}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">اسم الشارع (Street)</label>
              <input
                type="text"
                value={profileForm.nationalAddress?.street || profileForm.address?.street || ''}
                onChange={(e) => {
                  const updatedNat = {
                    ...(profileForm.nationalAddress || profileForm.address || {}),
                    street: e.target.value,
                  } as any;
                  setProfileForm({
                    ...profileForm,
                    nationalAddress: updatedNat,
                    address: updatedNat,
                  });
                }}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">رقم المبنى (Building #)</label>
              <input
                type="text"
                value={profileForm.nationalAddress?.buildingNumber || profileForm.address?.buildingNumber || ''}
                onChange={(e) => {
                  const updatedNat = {
                    ...(profileForm.nationalAddress || profileForm.address || {}),
                    buildingNumber: e.target.value,
                  } as any;
                  setProfileForm({
                    ...profileForm,
                    nationalAddress: updatedNat,
                    address: updatedNat,
                  });
                }}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">الرمز البريدي (Postal Code)</label>
              <input
                type="text"
                value={profileForm.nationalAddress?.postalCode || profileForm.address?.postalCode || ''}
                onChange={(e) => {
                  const updatedNat = {
                    ...(profileForm.nationalAddress || profileForm.address || {}),
                    postalCode: e.target.value,
                  } as any;
                  setProfileForm({
                    ...profileForm,
                    nationalAddress: updatedNat,
                    address: updatedNat,
                  });
                }}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">الرقم الإضافي (Additional #)</label>
              <input
                type="text"
                value={profileForm.nationalAddress?.additionalNumber || profileForm.address?.additionalNumber || ''}
                onChange={(e) => {
                  const updatedNat = {
                    ...(profileForm.nationalAddress || profileForm.address || {}),
                    additionalNumber: e.target.value,
                  } as any;
                  setProfileForm({
                    ...profileForm,
                    nationalAddress: updatedNat,
                    address: updatedNat,
                  });
                }}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">رقم الهاتف / الجوال المعتمد</label>
              <input
                type="text"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">البريد الإلكتروني الرسمي</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Fiscal Year Settings */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            إعدادات السنة والعملة المحاسبية
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">السنة المالية المفتوحة</label>
              <input
                type="number"
                value={profileForm.fiscalYear}
                onChange={(e) => setProfileForm({ ...profileForm, fiscalYear: parseInt(e.target.value) || 2026 })}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-bold font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">بداية السنة المالية</label>
              <input
                type="date"
                value={profileForm.fiscalYearStart}
                onChange={(e) => setProfileForm({ ...profileForm, fiscalYearStart: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">نهاية السنة المالية</label>
              <input
                type="date"
                value={profileForm.fiscalYearEnd}
                onChange={(e) => setProfileForm({ ...profileForm, fiscalYearEnd: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>حفظ التعديلات وتحديث البيانات</span>
          </button>
        </div>
      </form>
    </div>
  );
};
