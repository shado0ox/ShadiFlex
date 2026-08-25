import React, { useState } from 'react';
import { AccountingProvider, useAccounting } from './context/AccountingContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { SalesInvoices } from './components/Invoices/SalesInvoices';
import { InvoiceFormModal } from './components/Invoices/InvoiceFormModal';
import { InvoicePrintModal } from './components/Invoices/InvoicePrintModal';
import { PurchaseInvoices, PurchaseFormModal } from './components/Purchases/PurchaseInvoices';
import { DebitCreditNotesView } from './components/DebitCreditNotes/DebitCreditNotesView';
import { VouchersManager } from './components/Vouchers/VouchersManager';
import { InventoryManager } from './components/Inventory/InventoryManager';
import { ChartOfAccountsView } from './components/Accounts/ChartOfAccountsView';
import { JournalEntriesView, NewJournalEntryModal } from './components/JournalEntries/JournalEntriesView';
import { FinancialReports } from './components/Reports/FinancialReports';
import { PartiesManager } from './components/Parties/PartiesManager';
import { SimpleExpensesManager } from './components/SimpleExpenses/SimpleExpensesManager';
import { CompanySettingsManager } from './components/Settings/CompanySettingsManager';
import { ZatcaPhase2Hub } from './components/ZatcaPhase2/ZatcaPhase2Hub';
import { AiAdvisor } from './components/AiAdvisor';
import { PosTerminal } from './components/POS/PosTerminal';
import { BranchesAndRegistersManager } from './components/POS/BranchesAndRegistersManager';
import { DesignerSignature } from './components/Signature/DesignerSignature';
import { SalesInvoice } from './types/accounting';

const MainLayout: React.FC = () => {
  const { activeTab, salesInvoices } = useAccounting();
  const { direction, isRtl } = useLanguage();
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

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 overflow-hidden font-sans" dir={direction}>
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-100">
        {/* Header */}
        <Header
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenNewSalesInvoice={() => setSalesModalOpen(true)}
          onOpenNewPurchaseInvoice={() => setPurchaseModalOpen(true)}
          onOpenNewJournalEntry={() => setJournalModalOpen(true)}
        />

        {/* Dynamic Page Views */}
        {activeTab === 'pos_sales' ? (
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

              {/* Ornate Signature Footer */}
              <DesignerSignature variant="footer" />
            </div>
          </main>
        )}
      </div>

      {/* Modals */}
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
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AccountingProvider>
        <MainLayout />
      </AccountingProvider>
    </LanguageProvider>
  );
}
