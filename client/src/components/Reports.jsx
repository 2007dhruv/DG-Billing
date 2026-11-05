import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Package, FileText, TrendingUp, Download, 
  ArrowUpRight, ArrowDownLeft, DollarSign, Calendar 
} from 'lucide-react';
import { DateFilterBar, ProfitMarginTrendChart, RevenueProfitBarChart } from './AnalyticsCharts';

export function Reports() {
  const [activeTab, setActiveTab] = useState('STOCK');
  const [stockReport, setStockReport] = useState([]);
  const [gstr1Report, setGstr1Report] = useState([]);
  
  // Profit & Loss Report State
  const [profitFilter, setProfitFilter] = useState({ period: 'all' });
  const [profitData, setProfitData] = useState({
    summary: { total_revenue: 0, total_cost: 0, gross_profit: 0, margin_percent: 0, invoice_count: 0 },
    invoices: [],
    trend: [],
    filter: { period: 'all', label: 'All Time' }
  });
  const [profitChartType, setProfitChartType] = useState('TREND'); // 'TREND' or 'BARS'

  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      if (activeTab === 'STOCK') {
        const res = await fetch('/api/reports/stock-summary');
        setStockReport(await res.json());
      } else if (activeTab === 'GSTR1') {
        const res = await fetch('/api/reports/gstr1');
        setGstr1Report(await res.json());
      } else if (activeTab === 'PROFIT') {
        fetchProfitReport(profitFilter);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (activeTab !== 'PROFIT') setLoading(false);
    }
  };

  const fetchProfitReport = async (filterObj) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterObj.period) params.append('period', filterObj.period);
      if (filterObj.date) params.append('date', filterObj.date);
      if (filterObj.month) params.append('month', filterObj.month);
      if (filterObj.year) params.append('year', filterObj.year);
      if (filterObj.start_date) params.append('start_date', filterObj.start_date);
      if (filterObj.end_date) params.append('end_date', filterObj.end_date);

      const res = await fetch(`/api/reports/profit-loss?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // Support both object and legacy array returns
        if (Array.isArray(data)) {
          setProfitData({
            summary: { total_revenue: 0, total_cost: 0, gross_profit: 0, margin_percent: 0 },
            invoices: data,
            trend: []
          });
        } else {
          setProfitData(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch profit report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfitFilterChange = (newFilter) => {
    setProfitFilter(newFilter);
    fetchProfitReport(newFilter);
  };

  useEffect(() => {
    fetchReports();
  }, [activeTab]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>Business Intelligence & Tax Reports</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Audit-ready stock valuation, GSTR-1 summaries, and profit margin analysis
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="reports-tabs-bar" style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <button 
          className={`btn ${activeTab === 'STOCK' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('STOCK')}
        >
          <Package size={18} /> Stock Valuation Summary
        </button>
        <button 
          className={`btn ${activeTab === 'GSTR1' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('GSTR1')}
        >
          <FileText size={18} /> GSTR-1 Tax Summary (Slabs)
        </button>
        <button 
          className={`btn ${activeTab === 'PROFIT' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('PROFIT')}
        >
          <TrendingUp size={18} /> Invoice Profit & Margin
        </button>
      </div>

      {/* TAB 1: STOCK VALUATION SUMMARY */}
      {activeTab === 'STOCK' && (
        <div className="card-panel">
          <div className="panel-header">
            <h3 className="panel-title">Current Warehouse Inventory Valuation</h3>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>In Stock</th>
                  <th>Purchase Cost (₹)</th>
                  <th>Sale Value (₹)</th>
                  <th>Total Asset Valuation (₹)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30 }}>Calculating valuation...</td></tr>
                ) : stockReport.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No items in stock.</td></tr>
                ) : (
                  stockReport.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 700, color: '#fff' }}>{item.name}</td>
                      <td><span className="badge badge-primary">{item.category}</span></td>
                      <td style={{ fontWeight: 700 }}>{item.current_stock} {item.unit}</td>
                      <td>₹ {item.purchase_price}</td>
                      <td style={{ color: '#60A5FA' }}>₹ {item.sale_price}</td>
                      <td style={{ fontWeight: 800, color: '#34D399', fontSize: '0.95rem' }}>
                        ₹ {Math.round(item.stock_valuation || 0).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <span className={`badge ${item.stock_status === 'NORMAL' ? 'badge-success' : 'badge-danger'}`}>
                          {item.stock_status === 'NORMAL' ? 'HEALTHY' : 'REORDER NOW'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: GSTR-1 TAX SUMMARY */}
      {activeTab === 'GSTR1' && (
        <div className="card-panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">GSTR-1 Outward Supplies Summary (By GST Slab)</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4 }}>
                Ready for GST Portal filing with exact CGST, SGST, and IGST breakdowns.
              </p>
            </div>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>GST Rate Slab</th>
                  <th>Invoices Count</th>
                  <th>Net Taxable Value</th>
                  <th>Central GST (CGST)</th>
                  <th>State GST (SGST)</th>
                  <th>Integrated GST (IGST)</th>
                  <th>Gross Invoiced Value</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30 }}>Loading tax data...</td></tr>
                ) : gstr1Report.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No sales recorded.</td></tr>
                ) : (
                  gstr1Report.map((row, idx) => (
                    <tr key={idx}>
                      <td><span className="badge badge-primary" style={{ fontSize: '0.85rem' }}>{row.gst_rate}% GST</span></td>
                      <td style={{ fontWeight: 600 }}>{row.invoice_count} Bills</td>
                      <td style={{ fontWeight: 700 }}>₹ {Math.round(row.total_taxable).toLocaleString('en-IN')}</td>
                      <td style={{ color: 'var(--text-muted)' }}>₹ {Math.round(row.total_cgst || 0).toLocaleString('en-IN')}</td>
                      <td style={{ color: 'var(--text-muted)' }}>₹ {Math.round(row.total_sgst || 0).toLocaleString('en-IN')}</td>
                      <td style={{ color: '#60A5FA' }}>₹ {Math.round(row.total_igst || 0).toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 800, color: '#34D399', fontSize: '1rem' }}>
                        ₹ {Math.round(row.total_invoice_value).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PROFIT & LOSS PER INVOICE WITH DATE FILTERS & GRAPHS */}
      {activeTab === 'PROFIT' && (
        <div>
          {/* Date / Month / Year Filter Toolbar */}
          <DateFilterBar 
            filter={profitFilter} 
            onChangeFilter={handleProfitFilterChange} 
          />

          {/* Profit Summary Metrics */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-label">Total Revenue</span>
                <div className="metric-icon-box" style={{ background: 'rgba(59,130,246,0.15)', color: '#60A5FA' }}>
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="metric-value" style={{ color: '#60A5FA' }}>
                ₹ {(profitData.summary?.total_revenue || 0).toLocaleString('en-IN')}
              </div>
              <div className="metric-subtext">{profitData.summary?.invoice_count || 0} Invoices Billed</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-label">Cost of Goods (COGS)</span>
                <div className="metric-icon-box" style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }}>
                  <Package size={20} />
                </div>
              </div>
              <div className="metric-value" style={{ color: '#A78BFA' }}>
                ₹ {(profitData.summary?.total_cost || 0).toLocaleString('en-IN')}
              </div>
              <div className="metric-subtext">Original Wholesale Cost</div>
            </div>

            <div className="metric-card" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(16,185,129,0.08))' }}>
              <div className="metric-header">
                <span className="metric-label" style={{ color: '#34D399' }}>Gross Net Profit</span>
                <div className="metric-icon-box" style={{ background: 'rgba(16,185,129,0.2)', color: '#34D399' }}>
                  <ArrowUpRight size={20} />
                </div>
              </div>
              <div className="metric-value" style={{ color: '#34D399' }}>
                +₹ {(profitData.summary?.gross_profit || 0).toLocaleString('en-IN')}
              </div>
              <div className="metric-subtext" style={{ color: '#6EE7B7' }}>Net Invoiced Margin</div>
            </div>

            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-label">Overall Profit Margin</span>
                <div className="metric-icon-box" style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                  <DollarSign size={20} />
                </div>
              </div>
              <div className="metric-value" style={{ color: '#34D399' }}>
                {profitData.summary?.margin_percent || 0}%
              </div>
              <div className="metric-subtext">Average Profit Ratio</div>
            </div>
          </div>

          {/* Visual Profit Graph with Toggle */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button 
                type="button"
                className={`btn btn-sm ${profitChartType === 'TREND' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setProfitChartType('TREND')}
              >
                📈 Profit Margin Curve
              </button>
              <button 
                type="button"
                className={`btn btn-sm ${profitChartType === 'BARS' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setProfitChartType('BARS')}
              >
                📊 Revenue vs Cost vs Profit Bars
              </button>
            </div>

            {profitChartType === 'TREND' ? (
              <ProfitMarginTrendChart 
                data={profitData.trend} 
                summary={profitData.summary} 
              />
            ) : (
              <RevenueProfitBarChart 
                data={profitData.trend.map(t => ({
                  label: t.label,
                  sales: t.revenue,
                  purchases: t.cost,
                  profit: t.profit
                }))}
                title="Revenue, Cost & Profit Comparison"
                subtitle={`Filtered Period: ${profitData.filter?.label || 'All Time'}`}
              />
            )}
          </div>

          {/* Detailed Invoice Profit Table */}
          <div className="card-panel">
            <div className="panel-header">
              <h3 className="panel-title">
                Sales Invoice Profit & Margin Breakdown ({profitData.invoices?.length || 0} Bills)
              </h3>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Date</th>
                    <th>Customer Name</th>
                    <th>Total Revenue</th>
                    <th>Cost of Goods (COGS)</th>
                    <th>Gross Profit (₹)</th>
                    <th>Gross Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30 }}>Calculating margins...</td></tr>
                  ) : !profitData.invoices || profitData.invoices.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No invoices found for this filtered period.</td></tr>
                  ) : (
                    profitData.invoices.map((p, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700, color: '#60A5FA' }}>{p.invoice_number}</td>
                        <td>{p.invoice_date}</td>
                        <td style={{ fontWeight: 600 }}>{p.customer_name}</td>
                        <td>₹ {Math.round(p.total_revenue || 0).toLocaleString('en-IN')}</td>
                        <td style={{ color: 'var(--text-muted)' }}>₹ {Math.round(p.total_cost || 0).toLocaleString('en-IN')}</td>
                        <td style={{ fontWeight: 800, color: '#34D399', fontSize: '0.95rem' }}>
                          +₹ {Math.round(p.gross_profit || 0).toLocaleString('en-IN')}
                        </td>
                        <td>
                          <span className="badge badge-success" style={{ fontWeight: 800 }}>
                            <ArrowUpRight size={14} /> {p.margin_percent}% Margin
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
