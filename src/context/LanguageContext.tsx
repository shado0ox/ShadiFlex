import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';

interface LanguageContextType {
  language: Language;
  direction: Direction;
  isRtl: boolean;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
  formatCurrency: (amount: number) => string;
  formatNumber: (num: number) => string;
  formatDate: (dateStr: string | Date) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // App Branding & Navigation
    'app.title': 'محاسب - النظام المحاسبي ونقاط البيع',
    'app.subtitle': 'متوافق مع هيئة الزكاة والضريبة والجمارك ZATCA',
    'nav.main_menu': 'القائمة الرئيسية',
    'nav.dashboard': 'لوحة المؤشرات والتحليلات',
    'nav.pos_sales': 'شاشة الكاشير ونقاط البيع (POS)',
    'nav.pos_management': 'إدارة الفروع وصناديق الكاشير',
    'nav.sales': 'فواتير المبيعات (ZATCA)',
    'nav.purchases': 'فواتير المشتريات والموردين',
    'nav.debit_credit_notes': 'الإشعارات المدينة والدائنة',
    'nav.vouchers': 'سندات القبض والصرف',
    'nav.expenses': 'فواتير المصروفات والنثريات',
    'nav.accounts': 'شجرة ودليل الحسابات',
    'nav.journal': 'القيود اليومية العامة',
    'nav.inventory': 'المستودعات والمخزون',
    'nav.customers': 'دليل العملاء',
    'nav.suppliers': 'دليل الموردين',
    'nav.reports': 'التقارير المالية والميزانية',
    'nav.vat_return': 'إقرار ضريبة القيمة المضافة',
    'nav.ai_advisor': 'المستشار المالي الذكي (AI)',
    'nav.settings': 'إعدادات المنشأة وإقفال السنة و API',

    // Header & Actions
    'header.zatca_certified': 'معتمد ZATCA',
    'header.vat_no': 'الرقم الضريبي',
    'header.cr_no': 'السجل التجاري',
    'header.quick_action': 'إجراء سريع',
    'header.pos_shortcut': 'نقطة البيع (POS)',
    'header.ai_advisor': 'المستشار الذكي',
    'header.new_sales_invoice': 'فاتورة مبيعات جديدة (ZATCA)',
    'header.new_purchase_invoice': 'فاتورة مشتريات جديدة',
    'header.new_expense': 'فاتورة مصروفات / كهرباء / وقود',
    'header.new_journal': 'إضافة قيد يومية عام',
    'header.new_item': 'إضافة صنف مخزون',
    'header.lang_toggle': 'English',

    // Common Buttons & Labels
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.view': 'عرض',
    'common.print': 'طباعة',
    'common.close': 'إغلاق',
    'common.search': 'بحث...',
    'common.filter': 'تصفية',
    'common.all': 'الكل',
    'common.status': 'الحالة',
    'common.date': 'التاريخ',
    'common.actions': 'الإجراءات',
    'common.total': 'الإجمالي',
    'common.subtotal': 'المجموع الفرعي',
    'common.vat': 'ضريبة القيمة المضافة',
    'common.currency': 'ر.س',
    'common.currency_full': 'ريال سعودي',
    'common.notes': 'ملاحظات',
    'common.description': 'الوصف / البيان',
    'common.code': 'الرمز / الكود',
    'common.name': 'الاسم',
    'common.phone': 'رقم الهاتف',
    'common.address': 'العنوان',
    'common.active': 'نشط',
    'common.inactive': 'غير نشط',
    'common.confirm': 'تأكيد',
    'common.export': 'تصدير',
    'common.import': 'استيراد',
    'common.qty': 'الكمية',
    'common.unit_price': 'سعر الوحدة',
    'common.discount': 'الخصم',
    'common.amount': 'المبلغ',
    'common.paid': 'مدفوع',
    'common.unpaid': 'غير مدفوع',
    'common.partial': 'مدفوع جزئياً',

    // POS Specific
    'pos.terminal_title': 'شاشة الكاشير السريعة',
    'pos.select_branch': 'اختر الفرع',
    'pos.select_register': 'اختر الصندوق',
    'pos.shift': 'الوردية',
    'pos.shift_closed': 'الصندوق مغلق - يلزم بدء وردية',
    'pos.parked_orders': 'المعلقة',
    'pos.cash_drop': 'توريد نقدية',
    'pos.close_shift': 'إغلاق الوردية (تقرير Z)',
    'pos.start_shift': 'بدء وردية جديدة',
    'pos.branch_settings': 'إعداد الفروع',
    'pos.search_placeholder': 'ابحث بالاسم، الباركود، أو رمز الصنف SKU (اختصار F2)...',
    'pos.all_items': 'جميع الأصناف',
    'pos.cart_title': 'سلة المبيعات الحالية',
    'pos.clear_cart': 'تفريغ السلة',
    'pos.cash_customer': 'عميل نقدي / عام (نقاط البيع)',
    'pos.empty_cart': 'السلة فارغة',
    'pos.empty_cart_hint': 'انقر على الأصناف من القائمة لإضافتها للسلة',
    'pos.subtotal_before_tax': 'المجموع قبل الضريبة:',
    'pos.total_discount': 'إجمالي الخصم:',
    'pos.vat_15': 'ضريبة القيمة المضافة (15% ZATCA):',
    'pos.total_due': 'المبلغ الإجمالي المستحق:',
    'pos.hold_order_btn': 'تعليق (F8)',
    'pos.checkout_btn': 'دفع الفاتورة (F9)',
    'pos.stock': 'مخزون',
    'pos.incl_vat': 'شامل ضريبة 15%',
    'pos.resume': 'استرجاع',

    // Payment Methods
    'payment.cash': 'نقدي',
    'payment.mada': 'مدى / نقاط بيع',
    'payment.bank_transfer': 'تحويل بنكي',
    'payment.credit_card': 'بطاقة ائتمان',
    'payment.cheque': 'شيك',
    'payment.credit': 'آجل (ذمم)',
    'payment.split': 'دفع مجزأ (نقد + شبكة)',

    // Designer Signature
    'signature.title': 'تصميم وبرمجة الأستاذ / شادي ناصف',
    'signature.subtitle': 'نظام محاسبي ونقاط بيع متكامل بأعلى معايير الإتقان والفخامة',
    'signature.badge': 'MR. SHADY NASSEF',
    'signature.craftsmanship': 'تصميم استثنائي ومتقن',
  },
  en: {
    // App Branding & Navigation
    'app.title': 'Muhasib - Accounting & POS ERP',
    'app.subtitle': 'Fully Compliant with ZATCA E-Invoicing Standards',
    'nav.main_menu': 'Main Menu',
    'nav.dashboard': 'Dashboard & Analytics',
    'nav.pos_sales': 'POS Cashier Terminal',
    'nav.pos_management': 'Branches & Cash Registers',
    'nav.sales': 'Sales Invoices (ZATCA)',
    'nav.purchases': 'Purchase Invoices & Vendors',
    'nav.debit_credit_notes': 'Debit & Credit Notes',
    'nav.vouchers': 'Receipt & Payment Vouchers',
    'nav.expenses': 'Operating Expenses & Petty Cash',
    'nav.accounts': 'Chart of Accounts',
    'nav.journal': 'General Journal Entries',
    'nav.inventory': 'Inventory & Warehouses',
    'nav.customers': 'Customers Directory',
    'nav.suppliers': 'Suppliers Directory',
    'nav.reports': 'Financial Reports & Balance Sheet',
    'nav.vat_return': 'VAT Return (15%)',
    'nav.ai_advisor': 'Smart Financial AI Advisor',
    'nav.settings': 'Settings, Fiscal Closing & API',

    // Header & Actions
    'header.zatca_certified': 'ZATCA Certified',
    'header.vat_no': 'VAT No',
    'header.cr_no': 'CR No',
    'header.quick_action': 'Quick Action',
    'header.pos_shortcut': 'POS Terminal',
    'header.ai_advisor': 'AI Advisor',
    'header.new_sales_invoice': 'New Sales Invoice (ZATCA)',
    'header.new_purchase_invoice': 'New Purchase Invoice',
    'header.new_expense': 'New Expense / Utilities',
    'header.new_journal': 'New Journal Entry',
    'header.new_item': 'Add Inventory Item',
    'header.lang_toggle': 'العربية',

    // Common Buttons & Labels
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.print': 'Print',
    'common.close': 'Close',
    'common.search': 'Search...',
    'common.filter': 'Filter',
    'common.all': 'All',
    'common.status': 'Status',
    'common.date': 'Date',
    'common.actions': 'Actions',
    'common.total': 'Total',
    'common.subtotal': 'Subtotal',
    'common.vat': 'VAT',
    'common.currency': 'SAR',
    'common.currency_full': 'Saudi Riyal',
    'common.notes': 'Notes',
    'common.description': 'Description / Narration',
    'common.code': 'Code',
    'common.name': 'Name',
    'common.phone': 'Phone',
    'common.address': 'Address',
    'common.active': 'Active',
    'common.inactive': 'Inactive',
    'common.confirm': 'Confirm',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.qty': 'Qty',
    'common.unit_price': 'Unit Price',
    'common.discount': 'Discount',
    'common.amount': 'Amount',
    'common.paid': 'Paid',
    'common.unpaid': 'Unpaid',
    'common.partial': 'Partially Paid',

    // POS Specific
    'pos.terminal_title': 'Fast POS Terminal',
    'pos.select_branch': 'Select Branch',
    'pos.select_register': 'Select Register',
    'pos.shift': 'Shift',
    'pos.shift_closed': 'Register Closed - Start Shift Required',
    'pos.parked_orders': 'Parked',
    'pos.cash_drop': 'Cash Drop',
    'pos.close_shift': 'Close Shift (Z-Report)',
    'pos.start_shift': 'Start New Shift',
    'pos.branch_settings': 'Branch Setup',
    'pos.search_placeholder': 'Search by name, barcode, or SKU (shortcut F2)...',
    'pos.all_items': 'All Products',
    'pos.cart_title': 'Current Sales Cart',
    'pos.clear_cart': 'Clear Cart',
    'pos.cash_customer': 'Cash / Walk-in Customer',
    'pos.empty_cart': 'Cart is empty',
    'pos.empty_cart_hint': 'Click products from catalog to add to cart',
    'pos.subtotal_before_tax': 'Subtotal Excl. Tax:',
    'pos.total_discount': 'Total Discount:',
    'pos.vat_15': 'Value Added Tax (15% ZATCA):',
    'pos.total_due': 'Total Amount Due:',
    'pos.hold_order_btn': 'Hold (F8)',
    'pos.checkout_btn': 'Checkout (F9)',
    'pos.stock': 'Stock',
    'pos.incl_vat': 'Incl. 15% VAT',
    'pos.resume': 'Resume',

    // Payment Methods
    'payment.cash': 'Cash',
    'payment.mada': 'Mada / POS Card',
    'payment.bank_transfer': 'Bank Transfer',
    'payment.credit_card': 'Credit Card',
    'payment.cheque': 'Cheque',
    'payment.credit': 'On Account (Credit)',
    'payment.split': 'Split (Cash + Mada)',

    // Designer Signature
    'signature.title': 'Designed & Developed by Mr. Shady Nassef',
    'signature.subtitle': 'Comprehensive Accounting & POS ERP engineered with high precision and luxury craftsmanship',
    'signature.badge': 'MR. SHADY NASSEF',
    'signature.craftsmanship': 'Masterpiece Craftsmanship',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return saved === 'en' ? 'en' : 'ar';
  });

  const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';
  const isRtl = direction === 'rtl';

  useEffect(() => {
    localStorage.setItem('app_language', language);
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
  }, [language, direction]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  const t = (key: string, fallback?: string): string => {
    if (translations[language]?.[key]) {
      return translations[language][key];
    }
    if (translations.ar[key]) {
      return translations.ar[key];
    }
    return fallback || key;
  };

  const formatCurrency = (amount: number): string => {
    const formatted = amount.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formatted} ${language === 'ar' ? 'ر.س' : 'SAR'}`;
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US');
  };

  const formatDate = (dateStr: string | Date): string => {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        direction,
        isRtl,
        setLanguage,
        toggleLanguage,
        t,
        formatCurrency,
        formatNumber,
        formatDate,
      }}
    >
      <div dir={direction} className={direction === 'rtl' ? 'font-sans' : 'font-sans'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
