import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentSequenceService } from '../services/documentSequenceService';

describe('اختبارات تسلسل أرقام المستندات المالية (Document Numbering Sequences Tests)', () => {
  let sequenceService: DocumentSequenceService;

  beforeEach(() => {
    localStorage.clear();
    sequenceService = DocumentSequenceService.getInstance();
    sequenceService.resetSequences();
  });

  it('يجب توليد أرقام مستندات بتنسيق قياسي وبادئات مستقلة لكل نوع مستند', () => {
    const year = 2026;

    const inv1 = sequenceService.peekNextNumber('sales_invoice', year, []);
    const pur1 = sequenceService.peekNextNumber('purchase_invoice', year, []);
    const jv1 = sequenceService.peekNextNumber('journal_entry', year, []);
    const rv1 = sequenceService.peekNextNumber('receipt_voucher', year, []);
    const pv1 = sequenceService.peekNextNumber('payment_voucher', year, []);
    const cn1 = sequenceService.peekNextNumber('credit_note', year, []);
    const dn1 = sequenceService.peekNextNumber('debit_note', year, []);

    expect(inv1).toBe('INV-2026-0001');
    expect(pur1).toBe('PUR-2026-0001');
    expect(jv1).toBe('JV-2026-0001');
    expect(rv1).toBe('RV-2026-0001');
    expect(pv1).toBe('PV-2026-0001');
    expect(cn1).toBe('CN-2026-0001');
    expect(dn1).toBe('DN-2026-0001');
  });

  it('يجب زيادة التسلسل تصاعدياً وبشكل أحادي ومستقل', () => {
    const year = 2026;

    const inv1 = sequenceService.getNextNumber('sales_invoice', year, []);
    const inv2 = sequenceService.getNextNumber('sales_invoice', year, [inv1]);
    const inv3 = sequenceService.getNextNumber('sales_invoice', year, [inv1, inv2]);

    expect(inv1).toBe('INV-2026-0001');
    expect(inv2).toBe('INV-2026-0002');
    expect(inv3).toBe('INV-2026-0003');

    // Purchase invoice sequence should remain at 1
    const pur1 = sequenceService.peekNextNumber('purchase_invoice', year, []);
    expect(pur1).toBe('PUR-2026-0001');
  });

  it('يجب استخراج أعلى رقم موجود وتجاوزه حتى لو كانت هناك فجوات في البيانات', () => {
    const year = 2026;
    const existingInvoices = ['INV-2026-0001', 'INV-2026-0005', 'INV-2026-0012'];

    const nextInv = sequenceService.peekNextNumber('sales_invoice', year, existingInvoices);
    expect(nextInv).toBe('INV-2026-0013');
  });
});
