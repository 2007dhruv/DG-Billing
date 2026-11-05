import React, { useState, useEffect } from 'react';
import { 
  Package, ShoppingCart, TrendingUp, AlertTriangle, 
  ArrowUpRight, ArrowDownLeft, Plus, FileText, CheckCircle2,
  DollarSign, BarChart3, RefreshCw, AlertCircle, Eye, CreditCard
} from 'lucide-react';
import { DateFilterBar, ExecutiveBusinessChart } from './AnalyticsCharts';

export function Dashboard({ data: initialData, onNavigate, onOpenNewInvoice, onOpenNewItem, onViewInvoice }) {
  const [filter, setFilter] = useState({ period: 'all' });
  const [dashboardData, setDashboardData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  // Sync when initialData changes from App.jsx
  useEffect(() => {
    if (initialData && filter.period === 'all') {
      setDashboardData(initialData);
    }
  }, [initialData]);

  // Fetch filtered dashboard data whenever date filter changes
  const fetchFilteredData = async (activeFilter) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeFilter.period) params.append('period', activeFilter.period);
      if (activeFilter.date) params.append('date', activeFilter.date);
      if (activeFilter.month) params.append('month', activeFilter.month);
      if (activeFilter.year) params.append('year', activeFilter.year);
      if (activeFilter.start_date) params.append('start_date', activeFilter.start_date);
      if (activeFilter.end_date) params.append('end_date', activeFilter.end_date);

      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error('Failed to fetch filtered dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    fetchFilteredData(newFilter);
  };

  const currentData = dashboardData || initialData;
  if (!currentData) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading DG Billing Dashboard...</div>;
  }

  const { 
    stock = {}, 
    sales = {}, 
    purchases = {}, 
    profit = {}, 
    recentInvoices = [], 
    lowStockItems = [],
    trend = [],
    payment_modes = [],
    filter: activeFilterMeta = {}
  } = currentData;

  return (
    <div>
      {/* Top Banner Quick Actions */}
      <div className="dashboard-banner" style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 'var(--radius-lg)',
        padding: '22px 26px',
        marginBottom: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
      }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: 4, color: '#fff', letterSpacing: '-0.02em' }}>
            DG Billing Command Center
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Real-time GST invoicing, machine serial tracking & live inventory sync
          </p>
        </div>
        <div className="dashboard-action-btns" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={onOpenNewInvoice}>
            <Plus size={16} /> + New GST Invoice
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('purchases')}>
            <ShoppingCart size={16} /> + Inward Bill
          </button>
          <button className="btn btn-secondary" onClick={onOpenNewItem}>
            <Package size={16} /> + Add Item / Machine
          </button>
        </div>
      </div>

      {/* Date / Month / Year Filter Toolbar */}
      <DateFilterBar 
        filter={filter} 
        onChangeFilter={handleFilterChange} 
      />

      {/* Loading Indicator for Filter Updates */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '6px 0', marginBottom: 12, color: '#60A5FA', fontSize: '0.82rem', fontWeight: 600 }}>
          ⚡ Updating analytics for {activeFilterMeta.label || filter.period}...
        </div>
      )}

      {/* Modern High-Impact Executive Financial KPI Cards */}
      <div className="metrics-grid" style={{ marginBottom: 20 }}>
        {/* Total Invoiced Sales Revenue */}
        <div className="metric-card" style={{ borderLeft: '4px solid #3B82F6' }}>
          <div className="metric-header">
            <span className="metric-label">Invoiced Sales</span>
            <div className="metric-icon-box" style={{ background: 'rgba(59,130,246,0.15)', color: '#60A5FA' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="metric-value" style={{ color: '#60A5FA' }}>
            ₹{(sales.totalRevenue || 0).toLocaleString('en-IN')}
          </div>
          <div className="metric-subtext">
            {sales.totalInvoices || 0} Bills Generated ({activeFilterMeta.label || 'All'})
          </div>
        </div>

        {/* Net Gross Profit */}
        <div className="metric-card" style={{ borderLeft: '4px solid #10B981', background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(16,185,129,0.06))' }}>
          <div className="metric-header">
            <span className="metric-label" style={{ color: '#34D399' }}>Gross Net Profit</span>
            <div className="metric-icon-box" style={{ background: 'rgba(16,185,129,0.18)', color: '#34D399' }}>
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="metric-value" style={{ color: '#34D399' }}>
            +₹{(profit.grossProfit || 0).toLocaleString('en-IN')}
          </div>
          <div className="metric-subtext" style={{ color: '#6EE7B7', fontWeight: 700 }}>
            {profit.marginPercent || 0}% Profit Margin
          </div>
        </div>

        {/* Customer Receivables (Udhar) */}
        <div className="metric-card" style={{ borderLeft: '4px solid #EF4444' }}>
          <div className="metric-header">
            <span className="metric-label" style={{ color: '#F87171' }}>Customer Udhar (Due)</span>
            <div className="metric-icon-box" style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171' }}>
              <ArrowDownLeft size={18} />
            </div>
          </div>
          <div className="metric-value" style={{ color: (sales.totalReceivable || 0) > 0 ? '#F87171' : '#fff' }}>
            ₹{(sales.totalReceivable || 0).toLocaleString('en-IN')}
          </div>
          <div className="metric-subtext">
            {(sales.totalReceivable || 0) > 0 ? 'Pending Market Collections' : 'All Invoices Fully Paid ✅'}
          </div>
        </div>

        {/* Live Warehouse Stock Valuation */}
        <div className="metric-card" style={{ borderLeft: '4px solid #8B5CF6' }}>
          <div className="metric-header">
            <span className="metric-label">Warehouse Asset Value</span>
            <div className="metric-icon-box" style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }}>
              <Package size={18} />
            </div>
          </div>
          <div className="metric-value" style={{ color: '#A78BFA' }}>
            ₹{(stock.totalValue || 0).toLocaleString('en-IN')}
          </div>
          <div className="metric-subtext">
            {stock.totalItems || 0} Products & Machinery in Stock
          </div>
        </div>
      </div>

      {/* NEW: Executive Business Intelligence Radar & Chart */}
      <ExecutiveBusinessChart 
        trend={trend}
        salesTotal={sales.totalRevenue}
        profitTotal={profit.grossProfit}
        marginPercent={profit.marginPercent}
        paymentModes={payment_modes}
        filterLabel={activeFilterMeta.label}
      />

      {/* Two Column Layout: Recent Invoices & Low Stock Items */}
      <div className="dashboard-sections-grid">
        {/* Recent Invoices */}
        <div className="card-panel dashboard-panel">
          <div className="panel-header">
            <h3 className="panel-title">
              <FileText size={18} color="var(--primary-500)" /> Recent Sales Invoices
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('invoices')}>
              View All Invoices
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Grand Total</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                      No invoices recorded for this filtered period.
                    </td>
                  </tr>
                ) : (
                  recentInvoices.map(inv => (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 700, color: '#60A5FA' }}>{inv.invoice_number}</td>
                      <td style={{ fontWeight: 600 }}>{inv.customer_name}</td>
                      <td>{inv.invoice_date}</td>
                      <td style={{ fontWeight: 800 }}>₹{inv.grand_total?.toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`badge ${
                          inv.payment_status === 'PAID' ? 'badge-success' : 
                          inv.payment_status === 'PARTIAL' ? 'badge-warning' : 'badge-danger'
                        }`}>
                          {inv.payment_status}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => onViewInvoice(inv.id)}>
                          View & Print
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Watchlist */}
        <div className="card-panel dashboard-panel">
          <div className="panel-header">
            <h3 className="panel-title" style={{ color: '#FBBF24' }}>
              <AlertTriangle size={18} /> Low Stock Watchlist
            </h3>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('inventory')}>
              Go to Inventory
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item / Machine Name</th>
                  <th>Category</th>
                  <th>Stock Left</th>
                  <th>Min Alert</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: '#34D399', padding: 24 }}>
                      <CheckCircle2 size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                      All machines and catalog items are safely stocked.
                    </td>
                  </tr>
                ) : (
                  lowStockItems.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td><span className="badge badge-primary">{item.category}</span></td>
                      <td>
                        <span className="badge badge-danger">
                          {item.current_stock} {item.unit}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{item.min_stock_alert} {item.unit}</td>
                      <td>
                        <button className="btn btn-success btn-sm" onClick={() => onNavigate('purchases')}>
                          + Restock
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
