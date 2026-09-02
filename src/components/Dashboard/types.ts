import { SalesInvoice } from '../../types/accounting';

export interface DashboardProps {
  onOpenNewSalesInvoice: () => void;
  onOpenNewPurchaseInvoice: () => void;
  onOpenNewJournalEntry?: () => void;
  onViewInvoicePrint: (invoice: SalesInvoice) => void;
}

export interface KpiData {
  totalSales: number;
  salesCount: number;
  totalPurchases: number;
  inputVat: number;
  netVatDue: number;
  liquidCash: number;
}

export interface MonthlyChartPoint {
  month: string;
  sales: number;
  purchases: number;
  profit: number;
}
