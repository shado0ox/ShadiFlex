import React, { useState, Suspense, lazy } from 'react';
import { AccountingProvider, useAccounting } from './context/AccountingContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { DesignerSignature } from './components/Signature/DesignerSignature';
import { DemoBanner } from './components/DemoBanner';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { LoadingFallback } from './components/Common/LoadingFallback';
import { NotFoundTab } from './components/Common/NotFoundTab';
import { SalesInvoice } from './types/accounting';

// Lazy Loaded Pages and Heavy Components
const PosTerminal = lazy(() =>
  import('./components/POS/PosTerminal').then((m) => ({ default: m.PosTerminal }))
);
const BranchesAndRegistersManager = lazy(() =>
  import('./components/POS/BranchesAndRegistersManager').then((m) => ({ default: m.BranchesAndRegistersManager }))
);
const SalesInvoices = lazy(() =>
  import('./components/Invoices/SalesInvoices').then((m) => ({ default: m.SalesInvoices }))
);
const PurchaseInvoices = lazy(() =>
  import('./components/Purchases/PurchaseInvoices').then((m) => ({ default: m.PurchaseInvoices }))
);
const SimpleExpensesManager = lazy(() =>
  import('./components/SimpleExpenses/SimpleExpensesManager').then((m) => ({ default: m.SimpleExpensesManager }))
);
const DebitCreditNotesView = lazy(() =>
  import('./components/DebitCreditNotes/DebitCreditNotesView').then((m) => ({ default: m.DebitCreditNotesView }))
);
const VouchersManager = lazy(() =>
  import('./components/Vouchers/VouchersManager').then((m) => ({ default: m.VouchersManager }))
);
const PartiesManager = lazy(() =>
  import('./components/Parties/PartiesManager').then((m) => ({ default: m.PartiesManager }))
);
const InventoryManager = lazy(() =>
  import('./components/Inventory/InventoryManager').then((m) => ({ default: m.InventoryManager }))
);
const ChartOfAccountsView = lazy(() =>
  import('./components/Accounts/ChartOfAccountsView').then((m) => ({ default: m.ChartOfAccountsView }))
);
const JournalEntriesView = lazy(() =>
  import('./components/JournalEntries/JournalEntriesView').then((m) => ({ default: m.JournalEntriesView }))
);
const FinancialReports = lazy(() =>
  import('./components/Reports/FinancialReports').then((m) => ({ default: m.FinancialReports }))
);
const CompanySettingsManager = lazy(() =>
  import('./components/Settings/CompanySettingsManager').then((m) => ({ default: m.CompanySettingsManager }))
);
const ZatcaPhase2Hub = lazy(() =>
  import('./components/ZatcaPhase2/ZatcaPhase2Hub').then((m) => ({ default: m.ZatcaPhase2Hub }))
);
const AiAdvisor = lazy(() =>
  import('./components/AiAdvisor').then((m) => ({ default: m.AiAdvisor }))
);
const AuditLogsView = lazy(() =>
  import('./components/AuditLogs/AuditLogsView').then((m) => ({ default: m.AuditLogsView }))
);

// Lazy Loaded Modals
const InvoiceFormModal = lazy(() =>
  import('./components/Invoices/InvoiceFormModal').then((m) => ({ default: m.InvoiceFormModal }))
);
const InvoicePrintModal = lazy(() =>
  import('./components/Invoices/InvoicePrintModal').then((m) => ({ default: m.InvoicePrintModal }))
);
const PurchaseFormModal = lazy(() =>
  import('./components/Purchases/PurchaseInvoices').then((m) => ({ default: m.PurchaseFormModal }))
);
const NewJournalEntryModal = lazy(() =>
  import('./components/JournalEntries/JournalEntriesView').then((m) => ({ default: m.NewJournalEntryModal }))
);

const VALID_TABS = [
  'dashboard',
  'pos_sales',
  'pos_management',
  'sales',
  'purchases',
  'expenses',
  'debit_credit_notes',
  'vouchers',
  'parties',
  'inventory',
  'accounts',
  'journal',
  'financial_statements',
  'vat_return',
  'reports',
  'settings',
  'zatca_phase2',
  'ai_advisor',
  'audit_logs',
];

const MainLayout: React.FC = () => {
  const { activeTab, setActiveTab, salesInvoices } = useAccounting();
  const { direction } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modals state
  const [salesModalOpen, setSalesModalOpen] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [printInvoice, setPrintInvoice] = useState<SalesInvoice | null>(null);

  const handleOpenPrintByNumber = (invoiceNumber: string) => {
    const found = salesInvoices.find((i) => i.invoiceNumber === invoiceNumber);
    if (found) {
      setPrintInvoice(found);
    }
  };

  const isKnownTab = VALID_TABS.includes(activeTab);

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 overflow-hidden font-sans" dir={direction}>
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-100">
        {/* Demo Mode Notice Banner */}
        <DemoBanner />

        {/* Header */}
        <Header
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenNewSalesInvoice={() => setSalesModalOpen(true)}
          onOpenNewPurchaseInvoice={() => setPurchaseModalOpen(true)}
          onOpenNewJournalEntry={() => setJournalModalOpen(true)}
        />

        {/* Dynamic Page Views Wrapped in ErrorBoundary and Suspense */}
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback message="جاري تحميل الصفحة..." />}>
            {!isKnownTab ? (
              <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-100">
                <div className="max-w-4xl mx-auto space-y-6">
                  <NotFoundTab
                    currentTab={activeTab}
                    onNavigateHome={() => setActiveTab('dashboard')}
                    onNavigatePos={() => setActiveTab('pos_sales')}
                  />
                  <DesignerSignature variant="footer" />
                </div>
              </main>
            ) : activeTab === 'pos_sales' ? (
              <main className="flex-1 overflow-hidden bg-slate-100">
                <PosTerminal />
              </main>
            ) : (
              <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-100">
                <div className="max-w-7xl mx-auto space-y-6">
                  {activeTab === 'pos_management' && <BranchesAndRegistersManager />}

                  {activeTab === 'dashboard' && (
                    <Dashboard
                      onOpenNewSalesInvoice={() => setSalesModalOpen(true)}
                      onOpenNewPurchaseInvoice={() => setPurchaseModalOpen(true)}
                      onOpenNewJournalEntry={() => setJournalModalOpen(true)}
                      onViewInvoicePrint={(inv) => setPrintInvoice(inv)}
                    />
                  )}

                  {activeTab === 'sales' && (
                    <SalesInvoices
                      onOpenNewInvoice={() => setSalesModalOpen(true)}
                      onViewInvoicePrint={(inv) => setPrintInvoice(inv)}
                    />
                  )}

                  {activeTab === 'purchases' && (
                    <PurchaseInvoices
                      onOpenNewPurchase={() => setPurchaseModalOpen(true)}
                    />
                  )}

                  {activeTab === 'expenses' && <SimpleExpensesManager />}

                  {activeTab === 'debit_credit_notes' && <DebitCreditNotesView />}

                  {activeTab === 'vouchers' && <VouchersManager />}

                  {activeTab === 'parties' && <PartiesManager />}

                  {activeTab === 'inventory' && <InventoryManager />}

                  {activeTab === 'accounts' && <ChartOfAccountsView />}

                  {activeTab === 'journal' && (
                    <JournalEntriesView
                      onOpenNewEntry={() => setJournalModalOpen(true)}
                    />
                  )}

                  {(activeTab === 'financial_statements' || activeTab === 'vat_return' || activeTab === 'reports') && (
                    <FinancialReports />
                  )}

                  {activeTab === 'settings' && <CompanySettingsManager />}

                  {activeTab === 'zatca_phase2' && <ZatcaPhase2Hub />}

                  {activeTab === 'ai_advisor' && <AiAdvisor />}

                  {activeTab === 'audit_logs' && <AuditLogsView />}

                  {/* Ornate Signature Footer */}
                  <DesignerSignature variant="footer" />
                </div>
              </main>
            )}
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Modals wrapped in Suspense */}
      <Suspense fallback={null}>
        {salesModalOpen && (
          <InvoiceFormModal
            isOpen={salesModalOpen}
            onClose={() => setSalesModalOpen(false)}
            onSuccess={(invNumber) => {
              handleOpenPrintByNumber(invNumber);
            }}
          />
        )}

        {purchaseModalOpen && (
          <PurchaseFormModal
            isOpen={purchaseModalOpen}
            onClose={() => setPurchaseModalOpen(false)}
            onSuccess={() => {}}
          />
        )}

        {journalModalOpen && (
          <NewJournalEntryModal
            isOpen={journalModalOpen}
            onClose={() => setJournalModalOpen(false)}
            onSuccess={() => {}}
          />
        )}

        {printInvoice && (
          <InvoicePrintModal
            invoice={printInvoice}
            onClose={() => setPrintInvoice(null)}
          />
        )}
      </Suspense>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ToastProvider>
          <AccountingProvider>
            <MainLayout />
          </AccountingProvider>
        </ToastProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
