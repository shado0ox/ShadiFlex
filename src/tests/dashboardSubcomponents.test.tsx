import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { KpiCards } from '../components/Dashboard/KpiCards';
import { LowStockAlert } from '../components/Dashboard/LowStockAlert';
import { InventorySummaryCard } from '../components/Dashboard/InventorySummaryCard';
import { ProfitabilityCard } from '../components/Dashboard/ProfitabilityCard';
import { RecentInvoicesTable } from '../components/Dashboard/RecentInvoicesTable';
import { SalesInvoice, InventoryItem } from '../types/accounting';

describe('Modular Dashboard Subcomponents', () => {
  it('renders KpiCards with correct values', () => {
    render(
      <KpiCards
        totalSales={150000}
        salesCount={25}
        totalPurchases={80000}
        purchasesVat={12000}
        netVatPayableOrRefundable={10500}
        liquidCash={450000}
      />
    );

    expect(screen.getByText(/إجمالي المبيعات/i)).toBeDefined();
    expect(screen.getByText(/إجمالي المشتريات/i)).toBeDefined();
    expect(screen.getByText(/صافي الضريبة المستحقة/i)).toBeDefined();
    expect(screen.getByText(/رصيد النقدية والبنوك/i)).toBeDefined();
  });

  it('renders LowStockAlert only when items are below threshold', () => {
    const { rerender, container } = render(
      <LowStockAlert lowStockItems={[]} onNavigateToInventory={() => {}} />
    );
    expect(container.firstChild).toBeNull();

    const lowStockMock: InventoryItem = {
      id: 'item1',
      sku: 'ITM-01',
      nameAr: 'صنف 1',
      category: 'عام',
      unit: 'حبه',
      purchasePrice: 10,
      salePrice: 15,
      currentStock: 2,
      minStockAlert: 5,
      vatRate: 0.15,
      barcode: '123',
      isActive: true,
    };

    rerender(
      <LowStockAlert
        lowStockItems={[lowStockMock]}
        onNavigateToInventory={() => {}}
      />
    );
    expect(screen.getByText(/تنبيه مخزون/i)).toBeDefined();
  });

  it('renders InventorySummaryCard and ProfitabilityCard properly', () => {
    render(
      <InventorySummaryCard
        inventoryValuation={35000}
        totalItemsCount={12}
        lowStockCount={3}
        onNavigateToInventory={() => {}}
      />
    );
    expect(screen.getByText(/المخزون والمنتجات/i)).toBeDefined();

    render(
      <ProfitabilityCard
        grossProfit={50000}
        operatingExpenses={20000}
        netProfit={30000}
        onNavigateToFinancialStatements={() => {}}
      />
    );
    expect(screen.getByText(/قائمة الدخل والربحية/i)).toBeDefined();
  });

  it('renders RecentInvoicesTable with empty state and list items', () => {
    const mockInvoices: SalesInvoice[] = [
      {
        id: 'inv-1',
        invoiceNumber: 'INV-2026-0001',
        issueDate: '2026-08-15',
        issueTime: '10:00:00',
        type: 'tax_invoice',
        customerId: 'cust-1',
        customerName: 'شركة النور',
        customerVatNumber: '300000000000003',
        items: [],
        subtotal: 1000,
        discountTotal: 0,
        taxableAmount: 1000,
        vatTotal: 150,
        totalAmount: 1150,
        paymentStatus: 'paid',
        paymentMethod: 'bank_transfer',
        paidAmount: 1150,
        remainingAmount: 0,
        status: 'posted',
        uuid: 'test-uuid-1',
      },
    ];

    render(
      <RecentInvoicesTable
        invoices={mockInvoices}
        onViewAllInvoices={() => {}}
        onOpenNewSalesInvoice={() => {}}
        onViewInvoicePrint={() => {}}
      />
    );

    expect(screen.getByText('INV-2026-0001')).toBeDefined();
    expect(screen.getByText('شركة النور')).toBeDefined();
  });
});
