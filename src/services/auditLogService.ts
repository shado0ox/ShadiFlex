import { AuditLogEntry, AuditLogAction, AuditLogEntityType } from '../types/accounting';
import { generateEntityId } from '../utils/uuid';
import { SHADIFLEX_STORAGE_PREFIX } from '../constants/storage';

export const AUDIT_STORAGE_KEY = `${SHADIFLEX_STORAGE_PREFIX}_audit_logs`;
export const DEMO_LOCAL_USER = 'Demo Local User';
export const MAX_AUDIT_LOGS_LIMIT = 500; // Keep up to 500 records in local storage to respect quota

/**
 * Service for managing temporary, local client-side audit logs.
 * NOTE: This is a client-side temporary simulation and NOT a tamper-proof or immutable server-side audit log.
 */
class AuditLogService {
  private cache: AuditLogEntry[] | null = null;

  public getLogs(): AuditLogEntry[] {
    if (this.cache) {
      return this.cache;
    }
    try {
      const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.cache = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[AuditLogService] Failed to load local audit logs from storage:', e);
    }
    this.cache = [];
    return [];
  }

  public logAction(params: {
    action: AuditLogAction;
    entityType: AuditLogEntityType;
    entityId: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    reason?: string;
    source?: 'web_ui' | 'pos_terminal' | 'import_file' | 'system_reset' | 'api_simulation';
    metadata?: Record<string, unknown>;
  }): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: generateEntityId('AUDIT'),
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      timestamp: new Date().toISOString(),
      user: DEMO_LOCAL_USER,
      before: params.before ? this.sanitizeRecord(params.before) : null,
      after: params.after ? this.sanitizeRecord(params.after) : null,
      reason: params.reason,
      source: params.source || 'web_ui',
      metadata: params.metadata,
    };

    const current = this.getLogs();
    // Prepend new entry and cap limit
    const updated = [entry, ...current].slice(0, MAX_AUDIT_LOGS_LIMIT);
    this.cache = updated;

    try {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('[AuditLogService] Failed to persist audit log into localStorage:', e);
    }

    return entry;
  }

  public clearLogs(): void {
    this.cache = [];
    try {
      localStorage.removeItem(AUDIT_STORAGE_KEY);
    } catch (e) {
      console.warn('[AuditLogService] Failed to clear local audit logs:', e);
    }
  }

  /**
   * Helper to sanitize nested objects and prevent storing unbounded binary or sensitive raw tokens
   */
  private sanitizeRecord(obj: Record<string, unknown>): Record<string, unknown> {
    try {
      const copy: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        // Exclude raw long strings like huge base64 images or QR data if desired
        if (typeof value === 'string' && value.length > 500) {
          copy[key] = `${value.slice(0, 80)}... [${value.length} chars]`;
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          copy[key] = this.sanitizeRecord(value as Record<string, unknown>);
        } else {
          copy[key] = value;
        }
      }
      return copy;
    } catch {
      return { summary: 'Recorded entity' };
    }
  }
}

export const auditLogService = new AuditLogService();
