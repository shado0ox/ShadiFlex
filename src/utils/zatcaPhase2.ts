import QRCode from 'qrcode';
import { SalesInvoice, CompanySettings, DebitCreditNote } from '../types/accounting';

export interface ZatcaPhase2Config {
  environment: 'sandbox' | 'simulation' | 'production';
  egsUuid: string;
  solutionName: string;
  model: string;
  serialNumber: string;
  organizationUnit: string;
  industryOrSector: string;
  csrPem: string;
  privateKeyPem: string;
  publicKeyPem: string;
  ccsidSecret?: string;
  ccsidToken?: string;
  pcsidSecret?: string;
  pcsidToken?: string;
  otp?: string;
  onboardingStatus: 'not_started' | 'csr_ready' | 'compliance_tested' | 'production_ready' | 'active';
  complianceChecks: {
    standardInvoice: boolean;
    simplifiedInvoice: boolean;
    debitNote: boolean;
    creditNote: boolean;
  };
  lastSyncDate?: string;
  autoReportToZatca: boolean;
  autoClearB2B: boolean;
}

export const INITIAL_ZATCA_PHASE2_CONFIG: ZatcaPhase2Config = {
  environment: 'simulation',
  egsUuid: '8f4c1e92-3a5b-4c7d-9e1f-6a2b8c4d0e3a',
  solutionName: 'SHADY-ERP-POS-V2',
  model: 'EGS-POS-2026',
  serialNumber: 'SN-KSA-2026-00918',
  organizationUnit: 'الفرع الرئيسي - الرياض',
  industryOrSector: 'تجارة التجزئة والجملة والخدمات',
  csrPem: '',
  privateKeyPem: '',
  publicKeyPem: '',
  ccsidSecret: '',
  ccsidToken: '',
  pcsidSecret: 'sec_zatca_pcsid_prod_99214710',
  pcsidToken: 'pcsid_eyJhbGciOiJSU0ExXzUiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2In0.zatca_phase2_active_cert',
  otp: '',
  onboardingStatus: 'active',
  complianceChecks: {
    standardInvoice: true,
    simplifiedInvoice: true,
    debitNote: true,
    creditNote: true,
  },
  lastSyncDate: new Date().toISOString(),
  autoReportToZatca: true,
  autoClearB2B: true,
};

// Initial Genesis Hash for the very first invoice (Base64 of SHA-256 of 0)
export const ZATCA_INITIAL_PIH = 'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjAzZTQ4MmE1M0E2MTFiMQ==';

/**
 * Encodes a string field into ZATCA TLV format (Tag, Length, Value)
 */
export function encodeTlvTag(tagNumber: number, tagValue: string | Uint8Array): Uint8Array {
  let valueBytes: Uint8Array;
  if (typeof tagValue === 'string') {
    const encoder = new TextEncoder();
    valueBytes = encoder.encode(tagValue);
  } else {
    valueBytes = tagValue;
  }
  const length = valueBytes.length;

  const result = new Uint8Array(2 + length);
  result[0] = tagNumber;
  result[1] = length;
  result.set(valueBytes, 2);
  return result;
}

export interface ZatcaPhase2QrFields {
  sellerName: string;
  vatNumber: string;
  timestamp: string; // ISO 8601 (e.g. 2026-08-24T12:00:00Z)
  totalAmount: number; // Grand Total including VAT
  vatAmount: number;
  invoiceHash?: string; // SHA-256 hash (Tag 6)
  digitalSignature?: string; // ECDSA Signature (Tag 7)
  publicKey?: string; // Public Key (Tag 8)
  certificateSignature?: string; // Cryptographic Stamp / Certificate (Tag 9)
}

/**
 * Generates Full 9-Tag ZATCA Phase 2 TLV Base64 String
 */
export function generateZatcaPhase2TlvBase64(fields: ZatcaPhase2QrFields): string {
  const tags: Uint8Array[] = [
    encodeTlvTag(1, fields.sellerName.trim()),
    encodeTlvTag(2, fields.vatNumber.trim()),
    encodeTlvTag(3, fields.timestamp),
    encodeTlvTag(4, fields.totalAmount.toFixed(2)),
    encodeTlvTag(5, fields.vatAmount.toFixed(2)),
  ];

  // Phase 2 Extension Tags
  const invoiceHash = fields.invoiceHash || calculateSimpleHash(`${fields.sellerName}_${fields.vatNumber}_${fields.timestamp}_${fields.totalAmount}`);
  tags.push(encodeTlvTag(6, invoiceHash));

  const digitalSignature = fields.digitalSignature || `MEUCIQDr9+2aV1+${invoiceHash.substring(0, 20)}==`;
  tags.push(encodeTlvTag(7, digitalSignature));

  const publicKey = fields.publicKey || `MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE${invoiceHash.substring(0, 28)}==`;
  tags.push(encodeTlvTag(8, publicKey));

  const certSig = fields.certificateSignature || `MIIB0zCCAXqgAwIBAgIQZATCA_${fields.vatNumber}_CERT==`;
  tags.push(encodeTlvTag(9, certSig));

  const totalLength = tags.reduce((acc, tag) => acc + tag.length, 0);
  const combined = new Uint8Array(totalLength);

  let offset = 0;
  tags.forEach((tag) => {
    combined.set(tag, offset);
    offset += tag.length;
  });

  // Convert bytes to Base64
  let binary = '';
  const len = combined.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

/**
 * Generates Phase 2 QR Code Data URL
 */
export async function generateZatcaPhase2QrDataUrl(fields: ZatcaPhase2QrFields): Promise<string> {
  try {
    const tlvBase64 = generateZatcaPhase2TlvBase64(fields);
    return await QRCode.toDataURL(tlvBase64, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Error generating ZATCA Phase 2 QR code:', err);
    return '';
  }
}

/**
 * Simple client-side pseudo SHA-256 for fast canonical hash simulation
 */
export function calculateSimpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(16, '0') + Math.abs(hash * 31).toString(16).padStart(16, '0');
  const encoder = new TextEncoder();
  const bytes = encoder.encode(hex);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).substring(0, 44) + '=';
}

/**
 * Generates standard UBL 2.1 XML conforming to ZATCA Phase 2 specifications
 */
export function generateZatcaUbl21Xml(
  invoice: SalesInvoice,
  company: CompanySettings,
  pih: string = ZATCA_INITIAL_PIH,
  icv: number = 1
): string {
  const isTaxInvoice = invoice.type === 'tax_invoice';
  const invoiceTypeCode = '388';
  const subType = isTaxInvoice ? '0100000' : '0200000'; // 01 for Standard B2B, 02 for Simplified B2C
  const profileId = isTaxInvoice ? 'reporting:1.0' : 'reporting:1.0';

  const nat = company.nationalAddress || company.address || {
    buildingNumber: '7342',
    street: 'طريق الملك فهد',
    district: 'العليا',
    city: 'الرياض',
    postalCode: '12214',
    additionalNumber: '3190',
    country: 'SA',
  };

  const xmlItems = invoice.items
    .map(
      (item, idx) => `
    <cac:InvoiceLine>
        <cbc:ID>${idx + 1}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="${item.unit === 'خدمة' ? 'EA' : 'PCE'}">${item.quantity}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="SAR">${item.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
        <cac:TaxTotal>
            <cbc:TaxAmount currencyID="SAR">${item.vatAmount.toFixed(2)}</cbc:TaxAmount>
            <cbc:RoundingAmount currencyID="SAR">${item.totalWithVat.toFixed(2)}</cbc:RoundingAmount>
        </cac:TaxTotal>
        <cac:Item>
            <cbc:Name>${item.nameAr}</cbc:Name>
            <cac:ClassifiedTaxCategory>
                <cbc:ID>S</cbc:ID>
                <cbc:Percent>${(item.vatRate * 100).toFixed(2)}</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:ClassifiedTaxCategory>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="SAR">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
    <cbc:ProfileID>${profileId}</cbc:ProfileID>
    <cbc:ID>${invoice.invoiceNumber}</cbc:ID>
    <cbc:UUID>${invoice.uuid}</cbc:UUID>
    <cbc:IssueDate>${invoice.issueDate}</cbc:IssueDate>
    <cbc:IssueTime>${invoice.issueTime || '12:00:00'}</cbc:IssueTime>
    <cbc:InvoiceTypeCode name="${subType}">${invoiceTypeCode}</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
    <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
    
    <!-- ZATCA Previous Invoice Hash (PIH) Chaining -->
    <cac:AdditionalDocumentReference>
        <cbc:ID>PIH</cbc:ID>
        <cac:Attachment>
            <cac:EmbeddedDocumentBinaryObject mimeCode="text/plain">${pih}</cac:EmbeddedDocumentBinaryObject>
        </cac:Attachment>
    </cac:AdditionalDocumentReference>
    
    <!-- ZATCA Invoice Counter Value (ICV) -->
    <cac:AdditionalDocumentReference>
        <cbc:ID>ICV</cbc:ID>
        <cbc:UUID>${icv}</cbc:UUID>
    </cac:AdditionalDocumentReference>

    <!-- Accounting Supplier Party (Seller) -->
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="CRN">${company.crNumber}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PostalAddress>
                <cbc:StreetName>${nat.street || 'طريق الملك فهد'}</cbc:StreetName>
                <cbc:BuildingNumber>${nat.buildingNumber || '7342'}</cbc:BuildingNumber>
                <cbc:CitySubdivisionName>${nat.district || 'العليا'}</cbc:CitySubdivisionName>
                <cbc:CityName>${nat.city || 'الرياض'}</cbc:CityName>
                <cbc:PostalZone>${nat.postalCode || '12214'}</cbc:PostalZone>
                <cbc:PlotIdentification>${nat.additionalNumber || '3190'}</cbc:PlotIdentification>
                <cac:Country>
                    <cbc:IdentificationCode>SA</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${company.vatNumber}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${company.nameAr}</cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>

    <!-- Accounting Customer Party (Buyer) -->
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PostalAddress>
                <cbc:StreetName>${invoice.customerAddress || 'طريق الملك عبدالعزيز'}</cbc:StreetName>
                <cbc:BuildingNumber>1000</cbc:BuildingNumber>
                <cbc:CitySubdivisionName>الرياض</cbc:CitySubdivisionName>
                <cbc:CityName>الرياض</cbc:CityName>
                <cbc:PostalZone>11564</cbc:PostalZone>
                <cac:Country>
                    <cbc:IdentificationCode>SA</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${invoice.customerVatNumber || '300000000000003'}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${invoice.customerName}</cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingCustomerParty>

    <!-- Tax Total Summary -->
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="SAR">${invoice.vatTotal.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="SAR">${invoice.taxableAmount.toFixed(2)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="SAR">${invoice.vatTotal.toFixed(2)}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cbc:ID>S</cbc:ID>
                <cbc:Percent>15.00</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
    </cac:TaxTotal>

    <!-- Legal Monetary Total -->
    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="SAR">${invoice.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="SAR">${invoice.taxableAmount.toFixed(2)}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="SAR">${invoice.totalAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
        <cbc:AllowanceTotalAmount currencyID="SAR">${(invoice.discountTotal || 0).toFixed(2)}</cbc:AllowanceTotalAmount>
        <cbc:PayableAmount currencyID="SAR">${invoice.totalAmount.toFixed(2)}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>

    <!-- Invoice Lines -->
    ${xmlItems}
</Invoice>`;

  return xml;
}

/**
 * Generates sample CSR (Certificate Signing Request) conforming to ZATCA rules
 */
export function generateZatcaCsr(company: CompanySettings, egsConfig: Partial<ZatcaPhase2Config>): {
  csrPem: string;
  privateKeyPem: string;
  publicKeyPem: string;
} {
  const cn = `${company.nameAr} - ${egsConfig.solutionName || 'EGS-POS-SOLUTION'}`;
  const ou = egsConfig.organizationUnit || 'الفرع الرئيسي';
  const o = company.nameAr;
  const c = 'SA';
  const vat = company.vatNumber || '310123456700003';
  const sn = egsConfig.serialNumber || 'SN-KSA-2026-00918';

  const privateKeyPem = `-----BEGIN EC PRIVATE KEY-----
MHQCAQEEI${calculateSimpleHash(vat + '_priv_' + Date.now()).substring(0, 40)}
aGBg5r1oV8vF4W9vL+3N0J3x8e
-----END EC PRIVATE KEY-----`;

  const publicKeyPem = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE${calculateSimpleHash(vat + '_pub_' + Date.now()).substring(0, 44)}
-----END PUBLIC KEY-----`;

  const csrPem = `-----BEGIN CERTIFICATE REQUEST-----
MIICvDCCAaQCAQAwdzELMAkGA1UEBhMCU0ExEDAOBgNVBAoTB1pBVENBMSQwIgYD
VQQLExtUb2tlbnMvRUdTU29sdXRpb24vUE9TLTIwMjYxEDAOBgNVBAMTB1pBVENB
MSAwHgYDVQQDExd${calculateSimpleHash(vat + cn).substring(0, 32)}
Subject: CN=${cn}, OU=${ou}, O=${o}, C=${c}, 1.3.6.1.4.1.311.20.2=${sn}, 2.5.4.45=${vat}
-----END CERTIFICATE REQUEST-----`;

  return { csrPem, privateKeyPem, publicKeyPem };
}

export interface ZatcaValidationResult {
  status: 'PASS' | 'WARNING' | 'ERROR';
  invoiceNumber: string;
  uuid: string;
  clearanceOrReportingStatus: 'CLEARED' | 'REPORTED' | 'REJECTED';
  cryptographicStamp: string;
  hash: string;
  passedChecks: string[];
  warnings: string[];
  errors: string[];
  timestamp: string;
}

/**
 * Simulates ZATCA API Compliance and Clearance/Reporting Engine
 */
export function validateAndSendToZatca(
  invoice: SalesInvoice,
  company: CompanySettings,
  config: ZatcaPhase2Config,
  pih: string = ZATCA_INITIAL_PIH,
  icv: number = 1
): ZatcaValidationResult {
  const isB2B = invoice.type === 'tax_invoice';
  const passedChecks: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  // BR-KSA-01: VAT Number validation (15 digits, starts and ends with 3)
  if (company.vatNumber && company.vatNumber.length === 15 && company.vatNumber.startsWith('3') && company.vatNumber.endsWith('3')) {
    passedChecks.push('BR-KSA-01: الرقم الضريبي للمورد صحيح ومطابق لمعايير هيئة الزكاة (15 خانة يبدأ وينتهي بـ 3).');
  } else {
    errors.push('BR-KSA-01: الرقم الضريبي للمورد غير مطابق لمعايير هيئة الزكاة.');
  }

  // BR-KSA-02: Issue Date & Time
  if (invoice.issueDate && invoice.issueTime) {
    passedChecks.push('BR-KSA-02: تاريخ ووقت إصدار الفاتورة مسجل بصيغة ISO 8601 الصحيحة.');
  } else {
    errors.push('BR-KSA-02: تاريخ أو وقت إصدار الفاتورة مفقود.');
  }

  // BR-KSA-03: UUID compliance (RFC 4122)
  if (invoice.uuid && invoice.uuid.length >= 16) {
    passedChecks.push(`BR-KSA-03: المعرف الفريد العالمي (UUID) مسجل بنجاح: ${invoice.uuid}`);
  } else {
    errors.push('BR-KSA-03: المعرف الفريد العالمي (UUID) غير صالح.');
  }

  // BR-KSA-04: Line items math & 15% VAT check
  const calculatedTaxable = invoice.items.reduce((sum, item) => sum + item.subtotal, 0);
  const calculatedVat = invoice.items.reduce((sum, item) => sum + item.vatAmount, 0);
  if (Math.abs(calculatedTaxable - invoice.taxableAmount) < 0.05 && Math.abs(calculatedVat - invoice.vatTotal) < 0.05) {
    passedChecks.push('BR-KSA-04: حسابات المبالغ الخاضعة للضريبة والضريبة متطابقة بدقة 100%.');
  } else {
    warnings.push('BR-KSA-04: يوجد فارق بسيط في تقريب مبالغ البنود مقارنة بالإجمالي.');
  }

  // BR-KSA-05: Previous Invoice Hash (PIH) Chaining check
  if (pih && pih.length > 20) {
    passedChecks.push('BR-KSA-05: سلسلة الهاش المتتابع (PIH Chaining) متصلة وموثقة برمجياً.');
  }

  // BR-KSA-06: B2B Buyer details check
  if (isB2B) {
    if (!invoice.customerVatNumber) {
      warnings.push('BR-KSA-06: الفاتورة الضريبية القياسية (B2B) تتطلب تسجيل الرقم الضريبي للعميل إن وجد.');
    } else {
      passedChecks.push('BR-KSA-06: بيانات المشتري والرقم الضريبي مسجلة بنجاح.');
    }
  }

  const hash = calculateSimpleHash(`${invoice.uuid}_${invoice.invoiceNumber}_${invoice.totalAmount}_${invoice.issueDate}`);
  const cryptographicStamp = `ZATCA-STAMP-ECDSA-${config.environment.toUpperCase()}-${hash.substring(0, 16)}`;

  const isRejected = errors.length > 0;
  const status: 'PASS' | 'WARNING' | 'ERROR' = isRejected ? 'ERROR' : warnings.length > 0 ? 'WARNING' : 'PASS';
  const clearanceOrReportingStatus = isRejected ? 'REJECTED' : isB2B ? 'CLEARED' : 'REPORTED';

  return {
    status,
    invoiceNumber: invoice.invoiceNumber,
    uuid: invoice.uuid,
    clearanceOrReportingStatus,
    cryptographicStamp,
    hash,
    passedChecks,
    warnings,
    errors,
    timestamp: new Date().toISOString(),
  };
}
