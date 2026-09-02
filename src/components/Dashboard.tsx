import React from 'react';
import { useAccounting } from '../context/AccountingContext';
import { SalesInvoice } from '../types/accounting';
import {
  DashboardProps,
  MonthlyChartPoint,
  LowStockAlert,
  KpiCards,
  SalesPurchasesChart,
  RecentInvoicesTable,
  InventorySummaryCard,
  ProfitabilityCard,
  AiAdvisorCard,
} from './Dashboard/index';

export type { DashboardProps };

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenNewSalesInvoice,
  onOpenNewPurchaseInvoice: _onOpenNewPurchaseInvoice,
  onOpenNewJournalEntry: _onOpenNewJournalEntry,
  onViewInvoicePrint,
}) => {
  const {
    salesInvoices,
    purchaseInvoices,
    inventory,
    accounts,
    setActiveTab,
    getIncomeStatement,
    getVatReturn,
  } = useAccounting();

  const incomeStmt = getIncomeStatement();
  const vatReturn = getVatReturn();

  // Calculate Liquid Cash & Banks from 1101 accounts
  const liquidCash = accounts
    .filter((a) => a.code.startsWith('1101') && a.isTransactional)
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  // Total Inventory Valuation (Qty * Cost Price)
  const inventoryValuation = inventory.reduce(
    (sum, item) => sum + item.currentStock * item.purchasePrice,
    0
  );

  // Total Sales & Total Purchases
  const totalSales = salesInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPurchases = purchaseInvoices.reduce((sum, pur) => sum + pur.totalAmount, 0);

  // Low stock items
  const lowStockItems = inventory.filter((i) => i.currentStock <= i.minStockAlert);

  // Monthly Comparison Chart Data
  const chartData: MonthlyChartPoint[] = [
    { month: 'مايو', sales: 48000, purchases: 32000, profit: 16000 },
    { month: 'يونيو', sales: 62000, purchases: 39000, profit: 23000 },
    { month: 'يوليو', sales: 79000, purchases: 45000, profit: 34000 },
    {
      month: 'أغسطس (الحالي)',
      sales: Math.round(totalSales) || 85000,
      purchases: Math.round(totalPurchases) || 52000,
      profit: Math.round(incomeStmt.netProfit) || 33000,
    },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* 1. Low Stock Alert Banner */}
      <LowStockAlert
        lowStockItems={lowStockItems}
        onNavigateToInventory={() => setActiveTab('inventory')}
      />

      {/* 2. Top Row: 4 Main Bento KPI Cards */}
      <KpiCards
        totalSales={totalSales}
        salesCount={salesInvoices.length}
        totalPurchases={totalPurchases}
        purchasesVat={vatReturn.totalPurchasesVat}
        netVatPayableOrRefundable={vatReturn.netVatPayableOrRefundable}
        liquidCash={liquidCash}
      />

      {/* 3. Main Bento Grid Area (Chart + Recent Invoices Table) */}
      <div className="grid grid-cols-1 gap-5">
        <SalesPurchasesChart data={chartData} />

        <RecentInvoicesTable
          invoices={salesInvoices}
          onViewAllInvoices={() => setActiveTab('sales')}
          onOpenNewSalesInvoice={onOpenNewSalesInvoice}
          onViewInvoicePrint={onViewInvoicePrint}
        />
      </div>

      {/* 4. Bottom Bento Row: 3 Modular Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <InventorySummaryCard
          inventoryValuation={inventoryValuation}
          totalItemsCount={inventory.length}
          lowStockCount={lowStockItems.length}
          onNavigateToInventory={() => setActiveTab('inventory')}
        />

        <ProfitabilityCard
          grossProfit={incomeStmt.grossProfit}
          operatingExpenses={incomeStmt.operatingExpenses}
          netProfit={incomeStmt.netProfit}
          onNavigateToFinancialStatements={() => setActiveTab('financial_statements')}
        />

        <AiAdvisorCard
          onNavigateToAiAdvisor={() => setActiveTab('ai_advisor')}
        />
      </div>
    </div>
  );
};

export default Dashboard;
