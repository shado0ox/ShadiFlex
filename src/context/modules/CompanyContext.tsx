import React, { createContext, useContext } from 'react';
import { CompanySettings, ApiKey, AuditLogEntry, AuditLogAction, AuditLogEntityType } from '../../types/accounting';
import { BackupValidationResult, EmergencyBackupRecord } from '../../services/dataValidationService';

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
  value: CompanyContextType;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
};

export const useCompanySettings = (): CompanyContextType => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompanySettings must be used within an AccountingProvider / CompanyProvider');
  }
  return context;
};

export const useCompany = useCompanySettings;
export const useAuditBackup = useCompanySettings;
