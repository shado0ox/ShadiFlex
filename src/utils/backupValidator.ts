import { AccountingDataSnapshot } from '../repositories/AccountingRepository';
import {
  validateAccountingBackupJson,
  ValidationIssue,
  BackupValidationResult,
  getPreImportEmergencyBackup,
  clearPreImportEmergencyBackup,
  savePreImportEmergencyBackup,
  EmergencyBackupRecord,
} from '../services/dataValidationService';

export interface EmergencyBackupState {
  timestamp: string;
  reason?: string;
  data: AccountingDataSnapshot;
}

export function validateBackupStrict(rawContent: string | unknown): BackupValidationResult {
  return validateAccountingBackupJson(rawContent);
}

export function formatValidationErrorReport(errors: ValidationIssue[]): string {
  if (!errors || errors.length === 0) return 'لا توجد أخطاء.';
  return errors
    .map((err, idx) => `${idx + 1}. [${err.section}] ${err.path}: ${err.message}`)
    .join('\n');
}

export function downloadBackupAsJson(data: AccountingDataSnapshot, filename?: string): void {
  const dateStr = new Date().toISOString().split('T')[0];
  const defaultName = filename || `shadiflex_accounting_backup_${dateStr}.json`;
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = defaultName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export { getPreImportEmergencyBackup, clearPreImportEmergencyBackup, savePreImportEmergencyBackup };
