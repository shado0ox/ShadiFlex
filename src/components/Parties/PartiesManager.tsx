import React, { useState } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { Customer, Supplier } from '../../types/accounting';
import { formatSAR } from '../../utils/currency';
import {
  Users,
  Truck,
  Plus,
  Search,
  Phone,
  Building,
  FileText,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
} from 'lucide-react';

export const PartiesManager: React.FC = () => {
  const {
    customers,
    suppliers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addSupplier,
    updateSupplier,
    deleteSupplier,
  } = useAccounting();

  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Customer | Supplier | null>(null);

  // Form Fields
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [crNumber, setCrNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('الرياض');
  const [street, setStreet] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const handleOpenAdd = () => {
    setEditingItem(null);
    setNameAr('');
    setNameEn('');
    setVatNumber('');
    setCrNumber('');
    setPhone('05');
    setEmail('');
    setCity('الرياض');
    setStreet('');
    setPostalCode('');
    setModalOpen(true);
  };

  const handleOpenEdit = (item: Customer | Supplier) => {
    setEditingItem(item);
    setNameAr(item.nameAr);
    setNameEn(item.nameEn || '');
    setVatNumber(item.vatNumber || '');
    setCrNumber(item.crNumber || '');
    setPhone(item.phone || '');
    setEmail(item.email || '');
    if (activeTab === 'customers') {
      const c = item as Customer;
      setCity(c.address?.city || 'الرياض');
      setStreet(c.address?.street || '');
      setPostalCode(c.address?.postalCode || '');
    } else {
      const s = item as Supplier;
      setCity(s.city || 'الرياض');
    }
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) return;

    if (activeTab === 'customers') {
      if (editingItem) {
        updateCustomer(editingItem.id, {
          nameAr,
          nameEn,
          vatNumber,
          crNumber,
          phone,
          email,
          address: {
            street,
            city,
            postalCode,
            country: 'SA',
          },
        });
      } else {
        addCustomer({
          nameAr,
          nameEn,
          vatNumber,
          crNumber,
          phone,
          email,
          address: {
            street,
            city,
            postalCode,
            country: 'SA',
          },
        });
      }
    } else {
      if (editingItem) {
        updateSupplier(editingItem.id, {
          nameAr,
          nameEn,
          vatNumber,
          crNumber,
          phone,
          email,
          city,
        });
      } else {
        addSupplier({
          nameAr,
          nameEn,
          vatNumber,
          crNumber,
          phone,
          email,
          city,
        });
      }
    }
    setModalOpen(false);
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.vatNumber && c.vatNumber.includes(searchTerm)) ||
      (c.phone && c.phone.includes(searchTerm))
  );

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.vatNumber && s.vatNumber.includes(searchTerm)) ||
      (s.phone && s.phone.includes(searchTerm))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">العملاء والموردون</h2>
            <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
              {activeTab === 'customers' ? `${customers.length} عميل` : `${suppliers.length} مورد`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إدارة سجلات وبيانات العملاء والموردين، الأرقام الضريبية، السجلات التجارية، والأرصدة المدينة والدائنة
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition shadow-xs active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{activeTab === 'customers' ? '+ إضافة عميل جديد' : '+ إضافة مورد جديد'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('customers')}
          className={`pb-3 flex items-center gap-2 transition ${
            activeTab === 'customers'
              ? 'border-b-2 border-emerald-600 text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>العملاء ({customers.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`pb-3 flex items-center gap-2 transition ${
            activeTab === 'suppliers'
              ? 'border-b-2 border-emerald-600 text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>الموردون ({suppliers.length})</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`بحث في ${activeTab === 'customers' ? 'العملاء' : 'الموردين'} بالاسم، الرقم الضريبي، أو الهاتف...`}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">الاسم التجاري / العميل</th>
                <th className="p-3.5">الرقم الضريبي (15 رقماً)</th>
                <th className="p-3.5">السجل التجاري</th>
                <th className="p-3.5">الهاتف والتواصل</th>
                <th className="p-3.5">المدينة</th>
                <th className="p-3.5">الرصيد القائم</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {activeTab === 'customers' ? (
                filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      لا يوجد عملاء مطابقين.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{cust.nameAr}</div>
                        {cust.nameEn && <div className="text-[11px] text-slate-400 font-sans">{cust.nameEn}</div>}
                      </td>
                      <td className="p-3.5 font-mono text-emerald-700 font-semibold">{cust.vatNumber || '-'}</td>
                      <td className="p-3.5 font-mono text-slate-500">{cust.crNumber || '-'}</td>
                      <td className="p-3.5 font-mono text-slate-600">{cust.phone || '-'}</td>
                      <td className="p-3.5 text-slate-500">{cust.address?.city || 'الرياض'}</td>
                      <td className="p-3.5 font-mono font-bold text-slate-900">{formatSAR(cust.currentBalance)}</td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(cust)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition"
                            title="تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف (${cust.nameAr})؟`)) {
                                deleteCustomer(cust.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )
              ) : (
                filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      لا يوجد موردون مطابقون.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supp) => (
                    <tr key={supp.id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{supp.nameAr}</div>
                        {supp.nameEn && <div className="text-[11px] text-slate-400 font-sans">{supp.nameEn}</div>}
                      </td>
                      <td className="p-3.5 font-mono text-blue-700 font-semibold">{supp.vatNumber || '-'}</td>
                      <td className="p-3.5 font-mono text-slate-500">{supp.crNumber || '-'}</td>
                      <td className="p-3.5 font-mono text-slate-600">{supp.phone || '-'}</td>
                      <td className="p-3.5 text-slate-500">{supp.city || 'الرياض'}</td>
                      <td className="p-3.5 font-mono font-bold text-slate-900">{formatSAR(supp.currentBalance)}</td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(supp)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 transition"
                            title="تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف (${supp.nameAr})؟`)) {
                                deleteSupplier(supp.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-xl p-6 text-right space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                {editingItem
                  ? `تعديل بيانات ${activeTab === 'customers' ? 'العميل' : 'المورد'}`
                  : `إضافة ${activeTab === 'customers' ? 'عميل' : 'مورد'} جديد`}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">الاسم بالعربي *</label>
                <input
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="مثال: شركة المدار للتجارة"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">الاسم بالإنجليزية</label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="Example: Al-Madar Trading LLC"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">الرقم الضريبي (15 رقماً ZATCA)</label>
                  <input
                    type="text"
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    placeholder="300XXXXXXXXX003"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">رقم السجل التجاري (CR)</label>
                  <input
                    type="text"
                    value={crNumber}
                    onChange={(e) => setCrNumber(e.target.value)}
                    placeholder="1010XXXXXX"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">رقم الهاتف / الجوال</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">المدينة</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {activeTab === 'customers' && (
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">الشارع / العنوان</label>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition"
                >
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
