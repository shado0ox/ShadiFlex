import React from 'react';
import { ParkedOrder } from '../../types/accounting';
import { PauseCircle, PlayCircle, Trash2, X, Clock, User, ShoppingBag } from 'lucide-react';

interface PosParkedOrdersModalProps {
  parkedOrders: ParkedOrder[];
  onResumeOrder: (orderId: string) => void;
  onDeleteOrder: (orderId: string) => void;
  onClose: () => void;
}

export const PosParkedOrdersModal: React.FC<PosParkedOrdersModalProps> = ({
  parkedOrders,
  onResumeOrder,
  onDeleteOrder,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col my-auto max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <PauseCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">الطلبات المعلقة / المحفوظة مؤقتاً</h2>
              <p className="text-xs text-slate-400">إجمالي الطلبات المعلقة: {parkedOrders.length}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 divide-y divide-slate-100">
          {parkedOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
              <p className="text-sm font-medium">لا توجد طلبات معلقة حالياً</p>
              <p className="text-xs text-slate-500">يمكنك تعليق أي سلة مبيعات عبر زر «تعليق السلة» لاستئنافها لاحقاً</p>
            </div>
          ) : (
            parkedOrders.map((order) => (
              <div key={order.id} className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50 p-2 rounded-xl transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-mono">
                      {order.orderNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{order.customerName || 'عميل نقدي'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(order.savedAt).toLocaleTimeString('ar-SA')}
                    </span>
                    <span>{order.items.length} أصناف</span>
                    {order.note && <span className="text-amber-800 font-medium">({order.note})</span>}
                  </div>
                  <div className="text-xs text-slate-600 truncate max-w-sm">
                    {order.items.map((i) => `${i.nameAr} × ${i.quantity}`).join('، ')}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <div className="text-left font-mono font-bold text-emerald-800 text-sm pl-2">
                    {order.totalAmount.toFixed(2)} ر.س
                  </div>
                  <button
                    onClick={() => {
                      onResumeOrder(order.id);
                      onClose();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    <PlayCircle className="w-4 h-4" />
                    استرجاع
                  </button>
                  <button
                    onClick={() => onDeleteOrder(order.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="حذف الطلب المعلق"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
