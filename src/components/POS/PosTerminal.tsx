import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAccounting } from '../../context/AccountingContext';
import { useLanguage } from '../../context/LanguageContext';
import { InventoryItem, Customer, SalesInvoice, Branch, CashRegister } from '../../types/accounting';
import { PosPaymentModal } from './PosPaymentModal';
import { PosReceiptModal } from './PosReceiptModal';
import { PosShiftModal } from './PosShiftModal';
import { PosParkedOrdersModal } from './PosParkedOrdersModal';
import { PosCashDropModal } from './PosCashDropModal';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  PauseCircle,
  PlayCircle,
  CreditCard,
  Banknote,
  Clock,
  Store,
  Layers,
  ShoppingBag,
  Percent,
  CheckCircle2,
  AlertCircle,
  Maximize,
  SlidersHorizontal,
  ArrowDownRight,
  UserPlus,
  RefreshCw,
  Tag,
  Building,
  Computer,
} from 'lucide-react';

interface CartItem {
  itemId: string;
  nameAr: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  vatRate: number;
  currentStock: number;
}

export const PosTerminal: React.FC = () => {
  const {
    inventory,
    customers,
    branches,
    cashRegisters,
    cashierShifts,
    parkedOrders,
    activeBranchId,
    setActiveBranchId,
    activeRegisterId,
    setActiveRegisterId,
    activeShift,
    startCashierShift,
    closeCashierShift,
    cashDropShift,
    parkOrder,
    resumeParkedOrder,
    deleteParkedOrder,
    processPosSale,
    companySettings,
    setActiveTab,
  } = useAccounting();

  // Local cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [cartDiscount, setCartDiscount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals state
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showShiftModal, setShowShiftModal] = useState<boolean>(false);
  const [shiftModalMode, setShiftModalMode] = useState<'start' | 'close'>('start');
  const [showParkedModal, setShowParkedModal] = useState<boolean>(false);
  const [showCashDropModal, setShowCashDropModal] = useState<boolean>(false);
  const [lastIssuedInvoice, setLastIssuedInvoice] = useState<SalesInvoice | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Active branch and register objects
  const currentBranch = branches.find((b) => b.id === activeBranchId) || branches[0];
  const currentRegister = cashRegisters.find((r) => r.id === activeRegisterId) || cashRegisters[0];
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null;

  // Categories list extracted from inventory
  const categories = useMemo(() => {
    const cats = new Set<string>();
    inventory.forEach((item) => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats);
  }, [inventory]);

  // Filtered inventory based on search and category
  const filteredProducts = useMemo(() => {
    return inventory.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.nameAr.toLowerCase().includes(query) ||
        (item.sku && item.sku.toLowerCase().includes(query)) ||
        (item.barcode && item.barcode.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [inventory, selectedCategory, searchQuery]);

  // Add Item to Cart (or increment if already in cart)
  const handleAddToCart = (product: InventoryItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.itemId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.itemId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          itemId: product.id,
          nameAr: product.nameAr,
          unit: product.unit || 'حبة',
          unitPrice: product.salePrice,
          quantity: 1,
          discount: 0,
          vatRate: 15,
          currentStock: product.currentStock,
        },
      ];
    });
  };

  const handleUpdateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.itemId === itemId ? { ...i, quantity: newQty } : i))
    );
  };

  const handleUpdateDiscount = (itemId: string, discountAmount: number) => {
    setCart((prev) =>
      prev.map((i) => (i.itemId === itemId ? { ...i, discount: Math.max(0, discountAmount) } : i))
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.itemId !== itemId));
  };

  const handleClearCart = () => {
    if (cart.length > 0) {
      if (confirm('هل أنت متأكد من تفريغ عناصر السلة الحالية؟')) {
        setCart([]);
        setCartDiscount(0);
      }
    }
  };

  // Calculations
  const subtotalBeforeDiscount = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const itemsDiscountTotal = cart.reduce((sum, item) => sum + item.discount, 0);
  const totalDiscount = itemsDiscountTotal + cartDiscount;
  const taxableBase = Math.max(0, subtotalBeforeDiscount - totalDiscount);
  const vatTotal = taxableBase * 0.15;
  const totalWithVat = taxableBase + vatTotal;

  // Hold / Park Cart
  const handleParkCurrentCart = () => {
    if (cart.length === 0) {
      alert('السلة فارغة! لا يمكن تعليق سلة بدون أصناف.');
      return;
    }

    const itemsForPark = cart.map((i) => {
      const lineSubtotal = Math.max(0, i.unitPrice * i.quantity - i.discount);
      const lineVat = lineSubtotal * 0.15;
      return {
        itemId: i.itemId,
        nameAr: i.nameAr,
        quantity: i.quantity,
        unit: i.unit,
        unitPrice: i.unitPrice,
        discount: i.discount,
        vatRate: 15,
        vatAmount: lineVat,
        subtotal: lineSubtotal,
        totalWithVat: lineSubtotal + lineVat,
      };
    });

    parkOrder({
      branchId: currentBranch?.id || 'br_1',
      registerId: currentRegister?.id || 'reg_1',
      cashierName: activeShift?.cashierName || 'كاشير مبيعات',
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.nameAr,
      items: itemsForPark,
      totalAmount: totalWithVat,
      note: 'معلق من شاشة الكاشير',
    });

    setCart([]);
    setCartDiscount(0);
    alert('تم تعليق وحفظ السلة بنجاح!');
  };

  // Resume Parked Order
  const handleResumeParkedOrder = (orderId: string) => {
    const resumed = resumeParkedOrder(orderId);
    if (resumed) {
      const loadedItems: CartItem[] = resumed.items.map((i) => {
        const itemInfo = inventory.find((p) => p.id === i.itemId);
        return {
          itemId: i.itemId || `item_${Date.now()}`,
          nameAr: i.nameAr,
          unit: i.unit || 'حبة',
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          discount: i.discount || 0,
          vatRate: i.vatRate || 15,
          currentStock: itemInfo?.currentStock || 100,
        };
      });
      setCart(loadedItems);
      if (resumed.customerId) {
        setSelectedCustomerId(resumed.customerId);
      }
    }
  };

  // Process POS Sale Completion
  const handleConfirmPayment = async (paymentDetails: any) => {
    if (!activeShift) {
      alert('تنبيه: يجب فتح وردية كاشير أولاً قبل إتمام عمليات البيع!');
      setShiftModalMode('start');
      setShowShiftModal(true);
      return;
    }

    try {
      const itemsPayload = cart.map((i) => {
        const lineSubtotal = Math.max(0, i.unitPrice * i.quantity - i.discount);
        const lineVat = lineSubtotal * 0.15;
        return {
          itemId: i.itemId,
          nameAr: i.nameAr,
          quantity: i.quantity,
          unit: i.unit,
          unitPrice: i.unitPrice,
          discount: i.discount,
          vatRate: 15,
          vatAmount: lineVat,
          subtotal: lineSubtotal,
          totalWithVat: lineSubtotal + lineVat,
        };
      });

      const invoice = await processPosSale({
        items: itemsPayload,
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.nameAr,
        customerVatNumber: selectedCustomer?.vatNumber,
        paymentMethod: paymentDetails.paymentMethod,
        paidAmount: paymentDetails.paidAmount,
        cashTendered: paymentDetails.cashTendered,
        changeReturned: paymentDetails.changeReturned,
        madaAuthCode: paymentDetails.madaAuthCode,
        splitPaymentDetails: paymentDetails.splitPaymentDetails,
        discountTotal: cartDiscount,
        notes: paymentDetails.notes,
      });

      // Clear cart
      setCart([]);
      setCartDiscount(0);
      setShowPaymentModal(false);

      // Open receipt modal
      setLastIssuedInvoice(invoice);
    } catch (error) {
      console.error('POS Checkout error:', error);
      alert('حدث خطأ أثناء معالجة عملية البيع.');
    }
  };

  // Keyboard shortcut listener for high speed POS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleParkCurrentCart();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) {
          setShowPaymentModal(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-100 overflow-hidden">
      {/* Top Header Bar: Branch, Register, Shift Indicator, Quick Actions */}
      <div className="bg-slate-900 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 border border-slate-700 rounded-xl">
            <Store className="w-4 h-4 text-emerald-400" />
            <select
              value={activeBranchId}
              onChange={(e) => {
                setActiveBranchId(e.target.value);
                // Switch register to the first register of the chosen branch
                const branchRegs = cashRegisters.filter((r) => r.branchId === e.target.value);
                if (branchRegs.length > 0) {
                  setActiveRegisterId(branchRegs[0].id);
                }
              }}
              className="bg-transparent text-xs font-bold text-slate-200 outline-hidden cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                  {b.nameAr}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 border border-slate-700 rounded-xl">
            <Computer className="w-4 h-4 text-teal-400" />
            <select
              value={activeRegisterId}
              onChange={(e) => setActiveRegisterId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-200 outline-hidden cursor-pointer"
            >
              {cashRegisters
                .filter((r) => r.branchId === activeBranchId)
                .map((r) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                    {r.nameAr} ({r.code})
                  </option>
                ))}
            </select>
          </div>

          {/* Shift Status Badge */}
          {activeShift ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>الوردية: {activeShift.shiftNumber} ({activeShift.cashierName})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>الصندوق مغلق - يلزم بدء وردية</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Parked Carts Counter Button */}
          <button
            onClick={() => setShowParkedModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <PauseCircle className="w-4 h-4" />
            <span>المعلقة ({parkedOrders.length})</span>
          </button>

          {/* Cash Drop Button */}
          {activeShift && (
            <button
              onClick={() => setShowCashDropModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition cursor-pointer"
              title="سحب وتوريد نقدية إلى الخزينة الرئيسية"
            >
              <ArrowDownRight className="w-4 h-4 text-amber-400" />
              <span>توريد نقدية</span>
            </button>
          )}

          {/* Shift Manager Button */}
          {activeShift ? (
            <button
              onClick={() => {
                setShiftModalMode('close');
                setShowShiftModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
            >
              <Clock className="w-4 h-4" />
              <span>إغلاق الوردية (تقرير Z)</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setShiftModalMode('start');
                setShowShiftModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
            >
              <Clock className="w-4 h-4" />
              <span>بدء وردية جديدة</span>
            </button>
          )}

          {/* Manage Branches & Registers Tab Link */}
          <button
            onClick={() => setActiveTab('pos_management')}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer"
            title="إدارة الفروع وصناديق الكاشير وسجل الورديات"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">إعداد الفروع</span>
          </button>
        </div>
      </div>

      {/* Main Terminal Viewport: 2 Columns */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-3 gap-3">
        {/* Left / Center: Catalog and Product Selector */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Search & Filter Header */}
          <div className="p-3.5 border-b border-slate-200 space-y-3 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="ابحث بالاسم، الباركود، أو رمز الصنف SKU (اختصار F2)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pr-10 pl-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                  >
                    مسح
                  </button>
                )}
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                جميع الأصناف ({inventory.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 p-3.5 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="py-20 text-center text-slate-400 space-y-2">
                <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
                <p className="text-sm font-medium">لم يتم العثور على أي أصناف مطابقة</p>
                <p className="text-xs text-slate-500">جرب البحث بكلمة أخرى أو إضافة أصناف في دليل المخزون</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {filteredProducts.map((product) => {
                  const cartItem = cart.find((i) => i.itemId === product.id);
                  const isOutOfStock = product.currentStock <= 0;

                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOutOfStock && handleAddToCart(product)}
                      className={`relative bg-white p-3 rounded-xl border transition-all text-right flex flex-col justify-between select-none ${
                        isOutOfStock
                          ? 'opacity-60 border-slate-200 bg-slate-50 cursor-not-allowed'
                          : 'hover:border-emerald-500 hover:shadow-md cursor-pointer border-slate-200 active:scale-98'
                      } ${cartItem ? 'ring-2 ring-emerald-500/40 border-emerald-500 bg-emerald-50/20' : ''}`}
                    >
                      {cartItem && (
                        <div className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                          {cartItem.quantity}
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                            {product.sku || 'SKU'}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              product.currentStock <= (product.minStockAlert || 5)
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            مخزون: {product.currentStock} {product.unit}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug pt-1">
                          {product.nameAr}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-black font-mono text-emerald-800">
                            {product.salePrice.toFixed(2)}{' '}
                            <span className="text-[10px] font-normal text-slate-500">ر.س</span>
                          </div>
                          <div className="text-[9px] text-slate-400">
                            شامل ضريبة 15%: {(product.salePrice * 1.15).toFixed(2)}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isOutOfStock}
                          className={`p-1.5 rounded-lg text-white transition ${
                            isOutOfStock ? 'bg-slate-300' : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart, Customer & Checkout Column */}
        <div className="w-full lg:w-[420px] xl:w-[460px] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
          {/* Cart Header & Customer Selector */}
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-xs text-slate-900">سلة المبيعات الحالية</h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  {cart.length} أصناف
                </span>
              </div>
              <button
                onClick={handleClearCart}
                disabled={cart.length === 0}
                className="text-[11px] text-slate-500 hover:text-rose-600 font-medium transition disabled:opacity-30 cursor-pointer"
              >
                تفريغ السلة
              </button>
            </div>

            {/* Customer Dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
              >
                <option value="">عميل نقدي / عام (نقاط البيع)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr} {c.phone ? `(${c.phone})` : ''} {c.vatNumber ? '• ضريبي' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cart Item Rows */}
          <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="py-20 text-center text-slate-400 space-y-2">
                <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
                <p className="text-xs font-bold text-slate-600">السلة فارغة</p>
                <p className="text-[11px] text-slate-400">انقر على الأصناف من القائمة لإضافتها للسلة</p>
              </div>
            ) : (
              cart.map((item) => {
                const lineTotal = Math.max(0, item.unitPrice * item.quantity - item.discount) * 1.15;

                return (
                  <div key={item.itemId} className="py-2.5 space-y-1.5 text-xs">
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-bold text-slate-800 leading-tight">
                        {item.nameAr}
                        <div className="text-[10px] font-normal text-slate-500 font-mono">
                          {item.unitPrice.toFixed(2)} ر.س / {item.unit}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="font-black font-mono text-emerald-800">
                          {lineTotal.toFixed(2)} <span className="text-[9px] font-normal text-slate-500">ر.س</span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity & Discount Controls */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                        <button
                          onClick={() => handleUpdateQuantity(item.itemId, item.quantity - 1)}
                          className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 transition"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateQuantity(item.itemId, parseInt(e.target.value) || 1)}
                          className="w-10 text-center text-xs font-bold font-mono bg-white outline-hidden py-1 border-x border-slate-200"
                        />
                        <button
                          onClick={() => handleUpdateQuantity(item.itemId, item.quantity + 1)}
                          className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 transition"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line Discount Input */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500">خصم:</span>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder="0"
                          value={item.discount || ''}
                          onChange={(e) => handleUpdateDiscount(item.itemId, parseFloat(e.target.value) || 0)}
                          className="w-12 text-center text-[11px] font-mono px-1 py-1 bg-slate-50 border border-slate-200 rounded outline-hidden"
                        />
                        <button
                          onClick={() => handleRemoveItem(item.itemId)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                          title="حذف من السلة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Totals & Summary */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>المجموع قبل الضريبة:</span>
              <span className="font-mono">{taxableBase.toFixed(2)} ر.س</span>
            </div>

            {totalDiscount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>إجمالي الخصم:</span>
                <span className="font-mono">-{totalDiscount.toFixed(2)} ر.س</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>ضريبة القيمة المضافة (15% ZATCA):</span>
              <span className="font-mono">{vatTotal.toFixed(2)} ر.س</span>
            </div>

            <div className="flex justify-between items-center text-slate-900 border-t border-slate-300 pt-2 font-black">
              <span className="text-sm">المبلغ الإجمالي المستحق:</span>
              <span className="text-xl font-mono text-emerald-800">
                {totalWithVat.toFixed(2)} <span className="text-xs font-normal">ر.س</span>
              </span>
            </div>

            {/* Quick Action Buttons: Hold Order & Big Checkout */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={handleParkCurrentCart}
                disabled={cart.length === 0}
                className="flex flex-col items-center justify-center py-2 px-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-[11px] font-bold transition disabled:opacity-40 cursor-pointer"
                title="تعليق السلة وحفظها مؤقتاً (F8)"
              >
                <PauseCircle className="w-4 h-4 mb-0.5 text-amber-600" />
                <span>تعليق (F8)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!activeShift) {
                    setShiftModalMode('start');
                    setShowShiftModal(true);
                    return;
                  }
                  if (cart.length > 0) {
                    setShowPaymentModal(true);
                  }
                }}
                disabled={cart.length === 0}
                className="col-span-2 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm transition shadow-md hover:shadow-lg disabled:opacity-40 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>دفع الفاتورة (F9)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Checkout Modal */}
      {showPaymentModal && (
        <PosPaymentModal
          totalAmount={totalWithVat}
          taxableAmount={taxableBase}
          vatTotal={vatTotal}
          discountTotal={totalDiscount}
          customers={customers}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={(c) => setSelectedCustomerId(c ? c.id : '')}
          branch={currentBranch}
          register={currentRegister}
          onConfirmPayment={handleConfirmPayment}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {/* Receipt Thermal Modal */}
      {lastIssuedInvoice && (
        <PosReceiptModal
          invoice={lastIssuedInvoice}
          companySettings={companySettings}
          branch={currentBranch}
          register={currentRegister}
          onClose={() => setLastIssuedInvoice(null)}
          onNewSale={() => {
            setLastIssuedInvoice(null);
            searchInputRef.current?.focus();
          }}
        />
      )}

      {/* Shift Modal (Start / Close & Z-Report) */}
      {showShiftModal && (
        <PosShiftModal
          mode={shiftModalMode}
          activeShift={activeShift}
          cashRegisters={cashRegisters}
          branches={branches}
          activeRegisterId={activeRegisterId}
          companySettings={companySettings}
          onStartShift={(regId, cashier, openCash) => {
            startCashierShift(regId, cashier, openCash);
            setShowShiftModal(false);
          }}
          onCloseShift={(shiftId, actualCash, notes) => {
            closeCashierShift(shiftId, actualCash, notes);
          }}
          onClose={() => setShowShiftModal(false)}
        />
      )}

      {/* Parked Orders Modal */}
      {showParkedModal && (
        <PosParkedOrdersModal
          parkedOrders={parkedOrders}
          onResumeOrder={handleResumeParkedOrder}
          onDeleteOrder={deleteParkedOrder}
          onClose={() => setShowParkedModal(false)}
        />
      )}

      {/* Cash Drop Modal */}
      {showCashDropModal && activeShift && (
        <PosCashDropModal
          activeShift={activeShift}
          onCashDrop={cashDropShift}
          onClose={() => setShowCashDropModal(false)}
        />
      )}
    </div>
  );
};
