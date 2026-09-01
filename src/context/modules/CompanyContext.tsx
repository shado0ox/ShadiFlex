import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CompanySettings, ApiKey, AuditLogEntry, AuditLogAction, AuditLogEntityType } from '../../types/accounting';
import { getAccountingRepository } from '../../services/dataService';
import { auditLogService } from '../../services/auditLogService';
import { generateEntityId } from '../../utils/uuid';
import {
  savePreImportEmergencyBackup,
  getPreImportEmergencyBackup,
  EmergencyBackupRecord,
  validateAccountingBackupJson,
  BackupValidationResult,
} from '../../services/dataValidationService';

export interface CompanyContextType {
  companySettings: CompanySettings;
  updateCompanySettings: (settings: CompanySettings) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;

  apiKeys: ApiKey[];
  createApiKey: (keyData: Omit<ApiKey, 'id' | 'key' | 'maskedKey' | 'createdAt' | 'isActive'>) => ApiKey;
  toggleApiKeyStatus: (id: string) => void;
  deleteApiKey: (id: string) => void;

  auditLogs: AuditLogEntry[];
  logAuditEvent: (params: {
    action: AuditLogAction;
    entityType: AuditLogEntityType;
    entityId: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    reason?: string;
    source?: 'web_ui' | 'pos_terminal' | 'import_file' | 'system_reset' | 'api_simulation';
    metadata?: Record<string, unknown>;
  }) => AuditLogEntry;
  clearAuditLogs: () => void;

  resetToDemoData: () => void;
  exportDataJson: () => string;
  importDataJson: (json: string) => boolean;
  validateBackupJson: (json: string) => BackupValidationResult;
  createPreImportEmergencyBackup: () => boolean;
  getEmergencyBackupRecord: () => EmergencyBackupRecord | null;
  restoreEmergencyBackup: () => boolean;
}

export const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{
  children: React.ReactNode;
  value?: CompanyContextType;
}> = ({ children, value }) => {
  const repo = getAccountingRepository();

  const [activeTab, setActiveTabState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('shadiflex_active_tab');
      return saved || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('shadiflex_active_tab', tab);
    } catch (e) {
      console.warn('Failed to persist active tab to localStorage', e);
    }
  }, []);

  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => repo.loadCompanySettings());
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(() => repo.loadApiKeys());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => auditLogService.getLogs());

  useEffect(() => {
    repo.saveCompanySettings(companySettings);
  }, [companySettings]);

  useEffect(() => {
    repo.saveApiKeys(apiKeys);
  }, [apiKeys]);

  const logAuditEvent = useCallback((params: {
    action: AuditLogAction;
    entityType: AuditLogEntityType;
    entityId: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    reason?: string;
    source?: 'web_ui' | 'pos_terminal' | 'import_file' | 'system_reset' | 'api_simulation';
    metadata?: Record<string, unknown>;
  }): AuditLogEntry => {
    const entry = auditLogService.logAction(params);
    setAuditLogs(auditLogService.getLogs());
    return entry;
  }, []);

  const clearAuditLogs = useCallback(() => {
    auditLogService.clearLogs();
    setAuditLogs([]);
  }, []);

  const updateCompanySettings = useCallback((settings: CompanySettings) => {
    const old = companySettings;
    setCompanySettings(settings);
    logAuditEvent({
      action: 'update',
      entityType: 'company_settings',
      entityId: 'settings',
      before: old as unknown as Record<string, unknown>,
      after: settings as unknown as Record<string, unknown>,
      reason: 'تعديل إعدادات المنشأة وبيانات هيئة الزكاة والضريبة والجمارك ZATCA',
      source: 'web_ui',
    });
  }, [companySettings, logAuditEvent]);

  const createApiKey = useCallback((keyData: Omit<ApiKey, 'id' | 'key' | 'maskedKey' | 'createdAt' | 'isActive'>): ApiKey => {
    const newId = generateEntityId('key');
    const nowIso = new Date().toISOString();
    const rawKey = `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    const maskedKey = `${rawKey.substring(0, 7)}...${rawKey.substring(rawKey.length - 4)}`;

    const newKey: ApiKey = {
      ...keyData,
      id: newId,
      key: rawKey,
      maskedKey,
      isActive: true,
      createdAt: nowIso,
    };

    setApiKeys((prev) => [newKey, ...prev]);

    logAuditEvent({
      action: 'create',
      entityType: 'api_key',
      entityId: newId,
      after: newKey as unknown as Record<string, unknown>,
      reason: `إنشاء مفتاح API جديد: ${newKey.name}`,
      source: 'web_ui',
    });

    return newKey;
  }, [logAuditEvent]);

  const toggleApiKeyStatus = useCallback((id: string) => {
    const target = apiKeys.find((k) => k.id === id);
    if (!target) return;
    const updated = { ...target, isActive: !target.isActive };
    setApiKeys((prev) => prev.map((k) => (k.id === id ? updated : k)));

    logAuditEvent({
      action: 'update',
      entityType: 'api_key',
      entityId: id,
      before: target as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
      reason: `تغيير حالة مفتاح API ${target.name} إلى ${updated.isActive ? 'نشط' : 'معطل'}`,
      source: 'web_ui',
    });
  }, [apiKeys, logAuditEvent]);

  const deleteApiKey = useCallback((id: string) => {
    const target = apiKeys.find((k) => k.id === id);
    if (!target) return;
    setApiKeys((prev) => prev.filter((k) => k.id !== id));

    logAuditEvent({
      action: 'delete',
      entityType: 'api_key',
      entityId: id,
      before: target as unknown as Record<string, unknown>,
      reason: `حذف مفتاح API: ${target.name}`,
      source: 'web_ui',
    });
  }, [apiKeys, logAuditEvent]);

  const resetToDemoData = useCallback(() => {
    repo.resetToDemoData();
    clearAuditLogs();
    setCompanySettings(repo.loadCompanySettings());
    setApiKeys(repo.loadApiKeys());
    logAuditEvent({
      action: 'reset',
      entityType: 'backup',
      entityId: 'system_reset',
      reason: 'إعادة تهيئة النظام واسترجاع البيانات التجريبية الافتراضية',
      source: 'system_reset',
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shadi_flex_data_reloaded'));
    }
  }, [repo, clearAuditLogs, logAuditEvent]);

  const exportDataJson = useCallback((): string => {
    const jsonString = repo.exportDataJson();
    logAuditEvent({
      action: 'create',
      entityType: 'backup',
      entityId: `export_${Date.now()}`,
      reason: 'تصدير نسخة احتياطية كاملة من قاعدة بيانات النظام',
      source: 'web_ui',
    });
    return jsonString;
  }, [repo, logAuditEvent]);

  const createPreImportEmergencyBackup = useCallback((): boolean => {
    try {
      const snapshot = repo.getAllDataSnapshot();
      savePreImportEmergencyBackup(snapshot);
      return true;
    } catch {
      return false;
    }
  }, [repo]);

  const getEmergencyBackupRecord = useCallback((): EmergencyBackupRecord | null => {
    return getPreImportEmergencyBackup();
  }, []);

  const restoreEmergencyBackup = useCallback((): boolean => {
    const record = getPreImportEmergencyBackup();
    if (!record || !record.data) return false;
    const ok = repo.importDataJson(JSON.stringify(record.data));
    if (ok) {
      setCompanySettings(repo.loadCompanySettings());
      setApiKeys(repo.loadApiKeys());
      logAuditEvent({
        action: 'import',
        entityType: 'backup',
        entityId: 'emergency_restore',
        reason: 'استعادة ناجحة للنسخة الاحتياطية الطارئة السابقة للاستيراد',
        source: 'web_ui',
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('shadi_flex_data_reloaded'));
      }
    }
    return ok;
  }, [repo, logAuditEvent]);

  const validateBackupJson = useCallback((json: string): BackupValidationResult => {
    return validateAccountingBackupJson(json);
  }, []);

  const importDataJson = useCallback((json: string): boolean => {
    try {
      const valResult = validateAccountingBackupJson(json);
      if (!valResult.isValid || !valResult.sanitizedData) {
        return false;
      }

      createPreImportEmergencyBackup();

      const ok = repo.importDataJson(json);
      if (ok) {
        setCompanySettings(repo.loadCompanySettings());
        setApiKeys(repo.loadApiKeys());
        logAuditEvent({
          action: 'import',
          entityType: 'backup',
          entityId: `import_${Date.now()}`,
          reason: 'استيراد ناجح لملف النسخ الاحتياطي لقاعدة البيانات',
          source: 'import_file',
          metadata: {
            importedEntitiesCount: Object.keys(valResult.summary || {}).length,
          },
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('shadi_flex_data_reloaded'));
        }
      }
      return ok;
    } catch {
      return false;
    }
  }, [createPreImportEmergencyBackup, repo, logAuditEvent]);

  const contextValue: CompanyContextType = value || {
    companySettings,
    updateCompanySettings,
    activeTab,
    setActiveTab,
    apiKeys,
    createApiKey,
    toggleApiKeyStatus,
    deleteApiKey,
    auditLogs,
    logAuditEvent,
    clearAuditLogs,
    resetToDemoData,
    exportDataJson,
    importDataJson,
    validateBackupJson,
    createPreImportEmergencyBackup,
    getEmergencyBackupRecord,
    restoreEmergencyBackup,
  };

  return <CompanyContext.Provider value={contextValue}>{children}</CompanyContext.Provider>;
};

export const useCompanySettings = (): CompanyContextType => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompanySettings must be used within a CompanyProvider or AccountingProvider');
  }
  return context;
};

export const useCompany = useCompanySettings;
export const useAuditBackup = useCompanySettings;
