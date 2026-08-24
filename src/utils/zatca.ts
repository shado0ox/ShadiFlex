import QRCode from 'qrcode';

export interface ZatcaQrFields {
  sellerName: string;
  vatNumber: string;
  timestamp: string; // ISO 8601 (e.g. 2026-08-23T14:30:00Z)
  totalAmount: number; // Including VAT
  vatAmount: number;
}

/**
 * Encodes a string field into ZATCA TLV format (Tag, Length, Value)
 */
function encodeTlvTag(tagNumber: number, tagValue: string): Uint8Array {
  const encoder = new TextEncoder();
  const valueBytes = encoder.encode(tagValue);
  const length = valueBytes.length;

  const result = new Uint8Array(2 + length);
  result[0] = tagNumber;
  result[1] = length;
  result.set(valueBytes, 2);
  return result;
}

/**
 * Generates ZATCA TLV Base64 String according to FATOORA specifications
 */
export function generateZatcaTlvBase64(fields: ZatcaQrFields): string {
  const tag1 = encodeTlvTag(1, fields.sellerName.trim());
  const tag2 = encodeTlvTag(2, fields.vatNumber.trim());
  const tag3 = encodeTlvTag(3, fields.timestamp);
  const tag4 = encodeTlvTag(4, fields.totalAmount.toFixed(2));
  const tag5 = encodeTlvTag(5, fields.vatAmount.toFixed(2));

  const totalLength = tag1.length + tag2.length + tag3.length + tag4.length + tag5.length;
  const combined = new Uint8Array(totalLength);

  let offset = 0;
  [tag1, tag2, tag3, tag4, tag5].forEach((tag) => {
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
 * Generates a QR Code Data URL from ZATCA TLV Base64
 */
export async function generateZatcaQrDataUrl(fields: ZatcaQrFields): Promise<string> {
  try {
    const tlvBase64 = generateZatcaTlvBase64(fields);
    const qrDataUrl = await QRCode.toDataURL(tlvBase64, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    return qrDataUrl;
  } catch (err) {
    console.error('Error generating ZATCA QR code:', err);
    return '';
  }
}
