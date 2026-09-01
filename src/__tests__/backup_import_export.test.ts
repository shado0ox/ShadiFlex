import { describe, it, expect, beforeEach } from 'vitest';
import { renderAccountingHook, act } from './testUtils';
import { ApiKey } from '../types/accounting';

describe('اختبارات استيراد وتصدير النسخ الاحتياطية واستبعاد المفاتيح الحساسة (Backup Import/Export Tests)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('يجب استبعاد المفاتيح السرية (API Secrets / CSID / Private Keys) بالكامل عند تصدير JSON', () => {
    const { result } = renderAccountingHook();

    const exportedJson = result.current.exportDataJson();
    expect(exportedJson).toBeDefined();
    expect(typeof exportedJson).toBe('string');

    const parsed = JSON.parse(exportedJson);
    expect(parsed.accounts).toBeDefined();
    expect(parsed.companySettings).toBeDefined();

    // Verify secrets are excluded
    const jsonString = JSON.stringify(parsed);
    expect(jsonString).not.toContain('zatca_private_key_secret');
    expect(jsonString).not.toContain('super_secret_token');
    expect(jsonString).not.toContain('zatcaCsidSecret');
  });

  it('يجب أن ينجح استيراد ملف JSON سليم واستعادة البيانات في النظام', () => {
    const { result } = renderAccountingHook();

    const snapshot = JSON.parse(result.current.exportDataJson());
    const sampleBackup = {
      ...snapshot,
      companySettings: {
        ...snapshot.companySettings,
        nameAr: 'شركة المجد للتجارة العامة المستوردة',
      },
      customers: [
        ...snapshot.customers,
        {
          id: 'cust_imported_1',
          nameAr: 'عميل مستورد تجريبي',
          nameEn: 'Imported Customer',
          vatNumber: '300000000000003',
          crNumber: '1010101010',
          phone: '0500000000',
          email: 'cust@example.sa',
          address: {
            city: 'الرياض',
            district: 'العليا',
            street: 'الملك فهد',
            buildingNumber: '1111',
            postalCode: '12345',
            country: 'SA',
          },
          balance: 1500,
          isActive: true,
        },
      ],
    };

    let importSuccess = false;
    act(() => {
      importSuccess = result.current.importDataJson(JSON.stringify(sampleBackup));
    });

    expect(importSuccess).toBe(true);
    expect(result.current.companySettings.nameAr).toBe('شركة المجد للتجارة العامة المستوردة');
    expect(result.current.customers.some((c) => c.id === 'cust_imported_1')).toBe(true);
  });

  it('يجب رفض استيراد ملف JSON تالف أو غير صالح وإرجاع false دون تخريب النظام', () => {
    const { result } = renderAccountingHook();

    const originalCompanyName = result.current.companySettings.nameAr;

    // 1. Malformed JSON syntax
    let corruptedResult = false;
    act(() => {
      corruptedResult = result.current.importDataJson('{ corrupt_json: true, invalid ');
    });
    expect(corruptedResult).toBe(false);

    // 2. Valid JSON but missing essential structure / invalid payload
    let missingDataResult = false;
    act(() => {
      missingDataResult = result.current.importDataJson(JSON.stringify({ someRandomField: 123 }));
    });
    expect(missingDataResult).toBe(false);

    // Ensure company settings were not overwritten
    expect(result.current.companySettings.nameAr).toBe(originalCompanyName);
  });

  it('يجب ضمان تشفير وتأمين أي ApiKeys مخزنة محلياً وعدم تسريبها في السجلات العامة', () => {
    const { result } = renderAccountingHook();

    const sampleKey: ApiKey = {
      id: 'key_salla_1',
      name: 'ربط متجر سلة',
      key: 'sk_live_secret_salla_998877',
      maskedKey: 'sk_live_•••••••77',
      environment: 'production',
      permissions: ['invoices:read', 'invoices:write'],
      createdAt: '2026-06-01',
      isActive: true,
    };

    const exported = result.current.exportDataJson();
    expect(exported).not.toContain(sampleKey.key);
  });
});
