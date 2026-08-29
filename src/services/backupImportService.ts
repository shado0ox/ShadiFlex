import { AccountingDataSnapshot } from '../repositories/AccountingRepository';
import { validateBackupPayload } from './dataValidationService';

export interface BackupValidationResult {
  isValid: boolean;
  messageAr: string;
  messageEn: string;
  itemCounts?: {
    accounts: number;
    salesInvoices: number;
    purchaseInvoices: number;
    journalEntries: number;
    inventory: number;
  };
  errors?: string[];
}

/**
 * Validates raw JSON string or parsed object before executing import.
 */
export function validateImportJson(rawContent: string): {
  success: boolean;
  data?: AccountingDataSnapshot;
  error?: string;
} {
  try {
    const parsed = JSON.parse(rawContent);

    // Use our validation service
    const validation = validateBackupPayload(parsed);
    if (!validation.isValid) {
      return {
        success: false,
        error: `ملف النسخة الاحتياطية غير متوافق: ${validation.errors.join(' | ')}`,
      };
    }

    return {
      success: true,
      data: parsed as AccountingDataSnapshot,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `فشل قراءة ملف JSON: ${message}`,
    };
  }
}

/**
 * Generates and triggers browser download of the complete JSON backup snapshot.
 */
export function triggerBackupDownload(data: AccountingDataSnapshot, companyNameAr?: string): void {
  const cleanName = (companyNameAr || 'accounting_system').replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `Backup_${cleanName}_${timestamp}.json`;

  const payload: AccountingDataSnapshot = {
    ...data,
    exportedAt: new Date().toISOString(),
    schemaVersion: 2,
    version: '2.0.0',
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Utility to convert an array of objects into standard CSV text.
 */
export function convertToCsv<T extends Record<string, unknown>>(
  items: T[],
  columnHeaders: { key: keyof T; headerAr: string }[]
): string {
  if (!items || items.length === 0) return '';

  const headerRow = columnHeaders.map((c) => `"${c.headerAr}"`).join(',');
  const dataRows = items.map((item) =>
    columnHeaders
      .map((c) => {
        const val = item[c.key];
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',')
  );

  return '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
}

/**
 * Downloads a generated CSV file.
 */
export function triggerCsvDownload(csvContent: string, fileName: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
