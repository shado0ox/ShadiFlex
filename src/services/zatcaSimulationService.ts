import { SalesInvoice, CompanySettings } from '../types/accounting';

export interface ZatcaQrCodeParams {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  totalWithVat: number | string;
  vatAmount: number | string;
  invoiceHash?: string;
  digitalSignature?: string;
  publicKey?: string;
}

/**
 * Converts a tag-length-value (TLV) triplet to Uint8Array according to ZATCA specs.
 */
function createTlvTag(tagNum: number, value: string): Uint8Array {
  const encoder = new TextEncoder();
  const valueBytes = encoder.encode(value);
  const tagBytes = new Uint8Array(2 + valueBytes.length);
  tagBytes[0] = tagNum;
  tagBytes[1] = valueBytes.length;
  tagBytes.set(valueBytes, 2);
  return tagBytes;
}

/**
 * Generates official ZATCA TLV Base64 QR code string.
 */
export function generateZatcaQrBase64(params: ZatcaQrCodeParams): string {
  const {
    sellerName,
    vatNumber,
    timestamp,
    totalWithVat,
    vatAmount,
    invoiceHash = '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=',
    digitalSignature = 'MEQCIA5+5L9k6b0+...ZATCASignatureSimulated...',
  } = params;

  const totalStr = Number(totalWithVat).toFixed(2);
  const vatStr = Number(vatAmount).toFixed(2);

  const tlv1 = createTlvTag(1, sellerName || 'شركة الأفق التجارية');
  const tlv2 = createTlvTag(2, vatNumber || '300000000000003');
  const tlv3 = createTlvTag(3, timestamp || new Date().toISOString());
  const tlv4 = createTlvTag(4, totalStr);
  const tlv5 = createTlvTag(5, vatStr);
  const tlv6 = createTlvTag(6, invoiceHash);
  const tlv7 = createTlvTag(7, digitalSignature);

  const totalLen =
    tlv1.length +
    tlv2.length +
    tlv3.length +
    tlv4.length +
    tlv5.length +
    tlv6.length +
    tlv7.length;

  const combined = new Uint8Array(totalLen);
  let offset = 0;
  for (const tlv of [tlv1, tlv2, tlv3, tlv4, tlv5, tlv6, tlv7]) {
    combined.set(tlv, offset);
    offset += tlv.length;
  }

  // Convert binary bytes to base64
  let binary = '';
  for (let i = 0; i < combined.byteLength; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

/**
 * Computes a pseudo-cryptographic SHA-256 invoice hash representation.
 */
export function computeSimulatedInvoiceHash(
  invoice: Partial<SalesInvoice>,
  previousHash: string = 'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMjRiNWVhODlkODNmGU='
): string {
  const rawString = `${invoice.invoiceNumber || ''}|${invoice.issueDate || ''}|${invoice.totalAmount || 0}|${invoice.vatTotal || 0}|${previousHash}`;
  
  // Fast hashing simulation
  let hash = 0;
  for (let i = 0; i < rawString.length; i++) {
    const char = rawString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(16, '0') + Date.now().toString(16);
  return btoa(hex).substring(0, 44);
}

/**
 * Generates simulated UBL 2.1 XML Invoice structure for ZATCA Phase 2 clearance/reporting.
 */
export function generateSimulatedUblXml(
  invoice: SalesInvoice,
  companySettings: CompanySettings
): string {
  const isSimplified = invoice.invoiceType === 'simplified';
  const profileId = isSimplified
    ? 'reporting:1.0'
    : 'clearance:1.0';

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
    <cbc:ProfileID>${profileId}</cbc:ProfileID>
    <cbc:ID>${invoice.invoiceNumber}</cbc:ID>
    <cbc:UUID>${invoice.id || 'uuid-zatca-simulated'}</cbc:UUID>
    <cbc:IssueDate>${invoice.issueDate}</cbc:IssueDate>
    <cbc:IssueTime>${invoice.issueTime || '12:00:00'}</cbc:IssueTime>
    <cbc:InvoiceTypeCode name="0100000">${isSimplified ? '388' : '388'}</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="CRN">${companySettings.commercialRegister || '1010000000'}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${companySettings.vatNumber || '300000000000003'}</cbc:CompanyID>
                <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${companySettings.nameAr || 'الشركة'}</cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${invoice.customerName || 'عميل نقدي'}</cbc:RegistrationName>
            </cac:PartyLegalEntity>
            ${invoice.customerVatNumber ? `
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${invoice.customerVatNumber}</cbc:CompanyID>
                <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
            </cac:PartyTaxScheme>` : ''}
        </cac:Party>
    </cac:AccountingCustomerParty>
    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="SAR">${invoice.taxableAmount.toFixed(2)}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="SAR">${invoice.taxableAmount.toFixed(2)}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="SAR">${invoice.totalAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="SAR">${invoice.totalAmount.toFixed(2)}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
</Invoice>`;
}
