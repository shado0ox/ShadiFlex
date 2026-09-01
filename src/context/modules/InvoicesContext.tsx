import React, { createContext, useContext } from 'react';
import {
  SalesInvoice,
  PurchaseInvoice,
  DebitCreditNote,
  Voucher,
  SimpleExpenseInvoice,
  PaymentMethod,
  DocumentType,
  JournalEntry,
} from '../../types/accounting';

export interface InvoicesContextType {
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  debitCreditNotes: DebitCreditNote[];
  vouchers: Voucher[];
  simpleExpenses: SimpleExpenseInvoice[];

  createSalesInvoice: (invoice: Omit<SalesInvoice, 'id' | 'uuid' | 'zatcaQrBase64' | 'journalEntryId'>) => Promise<SalesInvoice>;
  updateSalesInvoice: (id: string, invoice: Partial<SalesInvoice>) => void;
  deleteSalesInvoice: (id: string) => void;
  recordInvoicePayment: (invoiceId: string, amount: number, paymentMethod: PaymentMethod) => void;

  createPurchaseInvoice: (invoice: Omit<PurchaseInvoice, 'id' | 'journalEntryId'>) => Promise<PurchaseInvoice>;
  updatePurchaseInvoice: (id: string, invoice: Partial<PurchaseInvoice>) => void;
  deletePurchaseInvoice: (id: string) => void;

  createDebitCreditNote: (note: Omit<DebitCreditNote, 'id' | 'uuid' | 'zatcaQrBase64' | 'journalEntryId'>) => Promise<DebitCreditNote>;
  deleteDebitCreditNote: (id: string) => void;

  createVoucher: (voucher: Omit<Voucher, 'id' | 'amountInWordsAr' | 'journalEntryId' | 'createdAt'>) => Promise<Voucher>;
  deleteVoucher: (id: string) => void;

  createSimpleExpense: (expense: Omit<SimpleExpenseInvoice, 'id' | 'expenseNumber' | 'journalEntryId' | 'createdAt'>) => Promise<SimpleExpenseInvoice>;
  deleteSimpleExpense: (id: string) => void;

  postDocument: (type: DocumentType, id: string) => Promise<void>;
  cancelDraftDocument: (type: DocumentType, id: string, reason?: string) => Promise<void>;
  reversePostedDocument: (type: DocumentType, id: string, reversalReason: string, reversalDate?: string) => Promise<JournalEntry>;
}

export const InvoicesContext = createContext<InvoicesContextType | undefined>(undefined);

export const InvoicesProvider: React.FC<{
  value: InvoicesContextType;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return <InvoicesContext.Provider value={value}>{children}</InvoicesContext.Provider>;
};

export const useInvoices = (): InvoicesContextType => {
  const context = useContext(InvoicesContext);
  if (!context) {
    throw new Error('useInvoices must be used within an AccountingProvider / InvoicesProvider');
  }
  return context;
};
