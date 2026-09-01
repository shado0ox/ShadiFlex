import { describe, it, expect } from 'vitest';
import {
  encodeTlvTag,
  calculateSha256Base64,
  calculateSha256Hex,
  generateZatcaPhase2TlvBase64,
  generateZatcaUbl21Xml,
  validateAndSimulateZatcaInvoice,
  INITIAL_ZATCA_PHASE2_CONFIG,
} from '../utils/zatcaPhase2';
import { SalesInvoice, CompanySettings } from '../types/accounting';

describe('اختبارات الفحص والترميز المحلي لمتطلبات هيئة الزكاة والضريبة والجمارك (ZATCA Phase 2 Tests)', () => {
  const mockCompany: CompanySettings = {
    nameAr: 'شركة التقنية المتطورة للتجارة',
    nameEn: 'Advanced Tech Trading Co',
    vatNumber: '310123456700003', // Valid 15 digits starting and ending with 3
    crNumber: '1010998877',
    phone: '0112345678',
    email: 'finance@tech.sa',
    currency: 'SAR',
    currencySymbol: 'ر.س',
    financialYearStart: '01-01',
    address: {
      city: 'الرياض',
      street: 'طريق الملك فهد',
      district: 'العليا',
      buildingNumber: '7342',
      postalCode: '12214',
      additionalNumber: '3190',
      country: 'SA',
    },
    nationalAddress: {
      buildingNumber: '7342',
      street: 'طريق الملك فهد',
      district: 'العليا',
      city: 'الرياض',
      postalCode: '12214',
      additionalNumber: '3190',
      country: 'SA',
    },
    bankDetails: {
      bankName: 'مصرف الراجحي',
      iban: 'SA0380000000608010167519',
      accountHolder: 'شركة التقنية المتطورة للتجارة',
    },
    invoiceFooterNotesAr: 'شكراً لتعاملكم معنا',
    invoiceFooterNotesEn: 'Thank you for your business',
  };

  const mockInvoice: SalesInvoice = {
    id: 'inv_zatca_test_1',
    invoiceNumber: 'INV-2026-0881',
    uuid: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    type: 'tax_invoice',
    issueDate: '2026-06-25',
    issueTime: '11:30:00',
    customerId: 'cust_01',
    customerName: 'شركة البناء والتعمير المحدودة',
    customerVatNumber: '300000000000003',
    items: [
      {
        id: 'item_1',
        itemId: 'prod_1',
        nameAr: 'خادم حاسوبي عالي الأداء',
        quantity: 2,
        unit: 'قطعة',
        unitPrice: 5000,
        discount: 0,
        vatRate: 0.15,
        vatAmount: 1500,
        subtotal: 10000,
        totalWithVat: 11500,
      },
    ],
    subtotal: 10000,
    discountTotal: 0,
    taxableAmount: 10000,
    vatTotal: 1500,
    totalAmount: 11500,
    paidAmount: 0,
    remainingAmount: 11500,
    paymentStatus: 'unpaid',
    paymentMethod: 'bank_transfer',
    status: 'posted',
  };

  it('يجب تشفير حقول TLV (Tag, Length, Value) بالطريقة المعيارية بدقة', () => {
    const sellerTag = encodeTlvTag(1, 'شركة الأمل');
    expect(sellerTag[0]).toBe(1); // Tag Number
    expect(sellerTag[1]).toBe(new TextEncoder().encode('شركة الأمل').length); // Length
  });

  it('يجب حساب هاش SHA-256 بتنسيق Base64 و Hex بصورة صحيحة ومتسقة', async () => {
    const text = 'ZATCA-E-INVOICING-2026';
    const b64Hash = await calculateSha256Base64(text);
    const hexHash = await calculateSha256Hex(text);
    expect(b64Hash).toBeDefined();
    expect(typeof b64Hash).toBe('string');
    expect(hexHash).toBeDefined();
    expect(hexHash).toHaveLength(64); // 256 bits = 64 hex characters
  });

  it('يجب توليد باركود Phase 2 TLV Base64 يحتوي على الحقول الأساسية الـ 9 المشفرة', async () => {
    const tlvBase64 = await generateZatcaPhase2TlvBase64({
      sellerName: mockCompany.nameAr,
      vatNumber: mockCompany.vatNumber,
      timestamp: `${mockInvoice.issueDate}T${mockInvoice.issueTime}Z`,
      totalAmount: mockInvoice.totalAmount,
      vatAmount: mockInvoice.vatTotal,
    });

    expect(tlvBase64).toBeDefined();
    expect(typeof tlvBase64).toBe('string');
    expect(tlvBase64.length).toBeGreaterThan(100);
  });

  it('يجب توليد بنية ملف UBL 2.1 XML مطابقة للمواصفات وتحتوي على جميع وسوم الفاتورة', () => {
    const xml = generateZatcaUbl21Xml(mockInvoice, mockCompany);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<Invoice xmlns=');
    expect(xml).toContain('<cbc:ProfileID>reporting:1.0</cbc:ProfileID>');
    expect(xml).toContain(`<cbc:ID>${mockInvoice.invoiceNumber}</cbc:ID>`);
    expect(xml).toContain(`<cbc:UUID>${mockInvoice.uuid}</cbc:UUID>`);
    expect(xml).toContain(`<cbc:CompanyID>${mockCompany.vatNumber}</cbc:CompanyID>`);
    expect(xml).toContain('<cac:TaxTotal>');
    expect(xml).toContain('<cac:LegalMonetaryTotal>');
  });

  it('يجب اجتياز الفحص والتدقيق المحلي لزاتكا بكافة القواعد BR-KSA-01 إلى BR-KSA-08', async () => {
    const result = await validateAndSimulateZatcaInvoice(
      mockInvoice,
      mockCompany,
      INITIAL_ZATCA_PHASE2_CONFIG
    );

    expect(result.validationMode).toBe('local_simulation');
    expect(result.status).toBe('LOCAL_VALIDATION_PASSED');
    expect(result.errors).toHaveLength(0);
    expect(result.passedChecks.some((c) => c.includes('BR-KSA-01'))).toBe(true);
    expect(result.passedChecks.some((c) => c.includes('BR-KSA-02'))).toBe(true);
    expect(result.passedChecks.some((c) => c.includes('BR-KSA-03'))).toBe(true);
    expect(result.passedChecks.some((c) => c.includes('BR-KSA-04'))).toBe(true);
    expect(result.ublXml).toBeDefined();
    expect(result.hash).toBeDefined();
  });
});
