/**
 * Storage Constants for ShadiFlex ERP
 * Isolates storage keys and prevents circular dependencies between repositories and services.
 */

export const SHADIFLEX_STORAGE_PREFIX = 'shadiflex_erp_v2';
export const CURRENT_SCHEMA_VERSION = 2;
export const LEGACY_STORAGE_PREFIX_V1 = 'saudi_accounting_system_v1';
export const EMERGENCY_BACKUP_STORAGE_KEY = `${SHADIFLEX_STORAGE_PREFIX}_pre_import_emergency_backup`;
