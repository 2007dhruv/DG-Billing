import React, { useState } from 'react';
import { 
  Calendar, Filter, RotateCcw, TrendingUp, 
  ArrowUpRight, ArrowDownLeft, BarChart3, PieChart, 
  DollarSign, ShoppingCart, Layers, CreditCard, ShieldCheck
} from 'lucide-react';

// ====================================================
// 1. SLEEK SEGMENTED DATE FILTER BAR
// ====================================================
export function DateFilterBar({ filter, onChangeFilter, availableYears = [2026, 2025, 2024] }) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const todayStr = new Date().toISOString().split('T')[0];

  const period = filter?.period || 'all';

  const handlePeriodChange = (newPeriod) => {
    let nextFilter = { period: newPeriod };
    if (newPeriod === 'today') {
      nextFilter.date = todayStr;
    } else if (newPeriod === 'month') {
      nextFilter.month = filter.month || currentMonth;
    } else if (newPeriod === 'year') {
      nextFilter.year = filter.year || String(currentYear);
    } else if (newPeriod === 'custom') {
      nextFilter.start_date = filter.start_date || todayStr;
      nextFilter.end_date = filter.end_date || todayStr;
    }
    onChangeFilter(nextFilter);
  };

  const handleFieldChange = (field, value) => {
    onChangeFilter({ ...filter, [field]: value });
  };

  const handleClear = () => {
    onChangeFilter({ period: 'all' });
  };

  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.6)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: '12px 16px',
      marginBottom: 22,
      backdropFilter: 'blur(10px)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        
        {/* Preset Period Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, marginRight: 6 }}>
            <Calendar size={15} color="#60A5FA" />
            <span className="hide-mobile">Date Scope:</span>
          </div>

          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'month', label: 'This Month' },
            { id: 'year', label: 'This Year' },
            { id: 'custom', label: 'Custom' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handlePeriodChange(tab.id)}
              style={{
                background: period === tab.id ? 'linear-gradient(135deg, #2563EB, #1D4ED8)' : 'rgba(255, 255, 255, 0.05)',
                color: period === tab.id ? '#FFFFFF' : 'var(--text-muted)',
                border: period === tab.id ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid var(--border-subtle)',
                borderRadius: '999px',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: period === tab.id ? '0 2px 10px rgba(37, 99, 235, 0.35)' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Controls based on selected period */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {period === 'today' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.25)', padding: '3px 8px', borderRadius: 6 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date:</span>
              <input
                type="date"
                className="form-input"
                style={{ padding: '3px 6px', fontSize: '0.8rem', width: 135, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}
                value={filter.date || todayStr}
                onChange={(e) => handleFieldChange('date', e.target.value)}
              />
            </div>
          )}

          {period === 'month' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.25)', padding: '3px 8px', borderRadius: 6 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Month:</span>
              <input
                type="month"
                className="form-input"
                style={{ padding: '3px 6px', fontSize: '0.8rem', width: 140, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}
                value={filter.month || currentMonth}
                onChange={(e) => handleFieldChange('month', e.target.value)}
              />
            </div>
          )}

          {period === 'year' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.25)', padding: '3px 8px', borderRadius: 6 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Year:</span>
              <select
                className="form-select"
                style={{ padding: '3px 6px', fontSize: '0.8rem', width: 95, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}
                value={filter.year || String(currentYear)}
                onChange={(e) => handleFieldChange('year', e.target.value)}
              >
                {availableYears.map(y => (
                  <option key={y} value={String(y)} style={{ background: '#1E293B', color: '#fff' }}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {period === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <input
                type="date"
                className="form-input"
                style={{ padding: '3px 6px', fontSize: '0.8rem', width: 130 }}
                value={filter.start_date || todayStr}
                onChange={(e) => handleFieldChange('start_date', e.target.value)}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                className="form-input"
                style={{ padding: '3px 6px', fontSize: '0.8rem', width: 130 }}
                value={filter.end_date || todayStr}
                onChange={(e) => handleFieldChange('end_date', e.target.value)}
              />
            </div>
          )}

          {period !== 'all' && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleClear}
              title="Reset to All Time"
              style={{ padding: '4px 8px', color: '#F87171', borderRadius: '999px', fontSize: '0.74rem' }}
            >
              <RotateCcw size={12} /> Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ====================================================
// 2. HELPER: SMOOTH BEZIER SPLINE GENERATOR
// ====================================================
function createSmoothPath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

// ====================================================
// 3. MODERN EXECUTIVE BUSINESS GRAPH
// ====================================================
export function ExecutiveBusinessChart({ 
  trend = [], 
  salesTotal = 0, 
  profitTotal = 0, 
  marginPercent = 0,
  paymentModes = [],
  filterLabel = 'All Time'
}) {
  const [activeTab, setActiveTab] = useState('REVENUE_PROFIT'); // 'REVENUE_PROFIT' | 'CASHFLOW_BARS' | 'PAYMENT_MODES'
  const [hoverIndex, setHoverIndex] = useState(null);

  const hasData = trend && trend.length > 0;

  // Chart dimensions
  const chartHeight = 170;
  const chartWidth = 560;

  // Calculate maximum values for scale
  const maxVal = Math.max(
    ...trend.map(d => Math.max(d.sales || 0, d.purchases || 0, d.profit || 0)),
    1000
  );

  // Points for Revenue & Profit smooth curves
  const stepX = trend.length > 1 ? (chartWidth - 40) / (trend.length - 1) : chartWidth / 2;
  const revenuePoints = trend.map((d, idx) => {
    const x = 30 + idx * stepX;
    const y = chartHeight - ((d.sales || 0) / maxVal) * (chartHeight - 30) + 10;
    return { x, y, val: d.sales || 0, ...d };
  });

  const profitPoints = trend.map((d, idx) => {
    const x = 30 + idx * stepX;
    const y = chartHeight - (Math.max(0, d.profit || 0) / maxVal) * (chartHeight - 30) + 10;
    return { x, y, val: d.profit || 0, ...d };
  });

  const revenueLine = createSmoothPath(revenuePoints);
  const revenueArea = revenuePoints.length > 0
    ? `${revenueLine} L ${revenuePoints[revenuePoints.length - 1].x} ${chartHeight + 10} L ${revenuePoints[0].x} ${chartHeight + 10} Z`
    : '';

  const profitLine = createSmoothPath(profitPoints);

  // Bar chart dimensions for Cashflow view
  const barGroupWidth = trend.length > 0 ? (chartWidth - 40) / trend.length : 40;
  const barWidth = Math.max(8, Math.min(22, (barGroupWidth - 14) / 2));

  return (
    <div className="card-panel" style={{ 
      padding: '22px 24px', 
      marginBottom: 24,
      background: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
      position: 'relative'
    }}>
      {/* Top Bar with Live Headline & View Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#60A5FA' }}>
              Business Intelligence Radar
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>• {filterLabel}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              ₹{salesTotal?.toLocaleString('en-IN') || 0}
            </span>
            <span style={{ 
              fontSize: '0.82rem', 
              fontWeight: 800, 
              color: '#34D399', 
              background: 'rgba(16, 185, 129, 0.15)',
              padding: '2px 8px',
              borderRadius: 6,
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}>
              <ArrowUpRight size={14} /> +₹{profitTotal?.toLocaleString('en-IN') || 0} ({marginPercent}%)
            </span>
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div style={{ 
          display: 'flex', 
          background: 'rgba(0, 0, 0, 0.35)', 
          padding: 3, 
          borderRadius: 8, 
          border: '1px solid var(--border-subtle)',
          gap: 2 
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('REVENUE_PROFIT')}
            style={{
              background: activeTab === 'REVENUE_PROFIT' ? '#2563EB' : 'transparent',
              color: activeTab === 'REVENUE_PROFIT' ? '#fff' : 'var(--text-muted)',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <TrendingUp size={13} /> Revenue & Profit Trend
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CASHFLOW_BARS')}
            style={{
              background: activeTab === 'CASHFLOW_BARS' ? '#2563EB' : 'transparent',
              color: activeTab === 'CASHFLOW_BARS' ? '#fff' : 'var(--text-muted)',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <BarChart3 size={13} /> Sales vs Cost Bars
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PAYMENT_MODES')}
            style={{
              background: activeTab === 'PAYMENT_MODES' ? '#2563EB' : 'transparent',
              color: activeTab === 'PAYMENT_MODES' ? '#fff' : 'var(--text-muted)',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <CreditCard size={13} /> Payment Mix
          </button>
        </div>
      </div>

      {/* VIEW 1: REVENUE & PROFIT SMOOTH SPLINE CURVE */}
      {activeTab === 'REVENUE_PROFIT' && (
        <div>
          {!hasData ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <TrendingUp size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              <div style={{ fontWeight: 700 }}>No transaction data for this time period.</div>
              <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Invoices and sales activity will automatically render dynamic curves here.</div>
            </div>
          ) : (
            <>
              {/* Legend Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 10, fontSize: '0.75rem', fontWeight: 600 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 3, background: '#38BDF8', borderRadius: 2 }} />
                  <span style={{ color: '#7DD3FC' }}>Sales Invoiced</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 3, background: '#10B981', borderRadius: 2 }} />
                  <span style={{ color: '#6EE7B7' }}>Net Gross Profit</span>
                </div>
              </div>

              {/* Responsive SVG Canvas */}
              <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <svg 
                  viewBox={`0 0 ${chartWidth} ${chartHeight + 35}`}
                  style={{ width: '100%', minWidth: Math.max(340, trend.length * 36), height: 'auto', display: 'block' }}
                >
                  <defs>
                    <linearGradient id="curveAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0284C7" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guideline Grids */}
                  {[0, 0.5, 1].map((r, i) => {
                    const y = chartHeight - r * (chartHeight - 30) + 10;
                    return (
                      <line 
                        key={i} 
                        x1="20" 
                        y1={y} 
                        x2={chartWidth - 10} 
                        y2={y} 
                        stroke="rgba(255, 255, 255, 0.07)" 
                        strokeDasharray="4 4" 
                      />
                    );
                  })}

                  {/* Shaded Area Under Revenue Curve */}
                  <path d={revenueArea} fill="url(#curveAreaGrad)" />

                  {/* Sales Curve Line */}
                  <path d={revenueLine} fill="none" stroke="#38BDF8" strokeWidth="2.8" strokeLinecap="round" />

                  {/* Profit Curve Line */}
                  <path d={profitLine} fill="none" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="3 3" />

                  {/* Interactive Dot Markers */}
                  {revenuePoints.map((p, idx) => {
                    const isHovered = hoverIndex === idx;
                    return (
                      <g 
                        key={idx}
                        onMouseEnter={() => setHoverIndex(idx)}
                        onMouseLeave={() => setHoverIndex(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        {isHovered && (
                          <line
                            x1={p.x}
                            y1={10}
                            x2={p.x}
                            y2={chartHeight + 10}
                            stroke="rgba(255, 255, 255, 0.2)"
                            strokeDasharray="2 2"
                          />
                        )}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHovered ? 6 : 3.5}
                          fill={isHovered ? '#FFFFFF' : '#38BDF8'}
                          stroke="#0284C7"
                          strokeWidth="2"
                        />
                        <text
                          x={p.x}
                          y={chartHeight + 28}
                          textAnchor="middle"
                          fill={isHovered ? '#FFFFFF' : '#94A3B8'}
                          fontSize="10"
                          fontWeight={isHovered ? '800' : '500'}
                        >
                          {p.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Hover Tooltip Card */}
              {hoverIndex !== null && trend[hoverIndex] && (
                <div style={{
                  marginTop: 8,
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  borderRadius: 8,
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  fontSize: '0.82rem',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                }}>
                  <div style={{ fontWeight: 800, color: '#fff' }}>📅 {trend[hoverIndex].label}</div>
                  <div><span style={{ color: '#7DD3FC' }}>Sales Invoiced:</span> <strong style={{ color: '#fff' }}>₹{trend[hoverIndex].sales?.toLocaleString('en-IN')}</strong></div>
                  <div><span style={{ color: '#C4B5FD' }}>Purchases/Cost:</span> <strong style={{ color: '#fff' }}>₹{trend[hoverIndex].purchases?.toLocaleString('en-IN')}</strong></div>
                  <div><span style={{ color: '#6EE7B7' }}>Gross Profit:</span> <strong style={{ color: '#34D399' }}>+₹{trend[hoverIndex].profit?.toLocaleString('en-IN')}</strong></div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* VIEW 2: SALES VS PURCHASES COMPARATIVE BARS */}
      {activeTab === 'CASHFLOW_BARS' && (
        <div>
          {!hasData ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              No transactions recorded for this period.
            </div>
          ) : (
            <>
              {/* Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, fontSize: '0.75rem', fontWeight: 600 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#2563EB' }} />
                  <span style={{ color: '#93C5FD' }}>Invoiced Sales (Inflow)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#7C3AED' }} />
                  <span style={{ color: '#C4B5FD' }}>Inward Purchases (Cost Outflow)</span>
                </div>
              </div>

              <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <svg 
                  viewBox={`0 0 ${chartWidth} ${chartHeight + 35}`}
                  style={{ width: '100%', minWidth: Math.max(340, trend.length * 48), height: 'auto', display: 'block' }}
                >
                  {/* Grid Lines */}
                  {[0, 0.5, 1].map((r, i) => {
                    const y = chartHeight - r * (chartHeight - 30) + 10;
                    return (
                      <line 
                        key={i} 
                        x1="20" 
                        y1={y} 
                        x2={chartWidth - 10} 
                        y2={y} 
                        stroke="rgba(255, 255, 255, 0.07)" 
                        strokeDasharray="4 4" 
                      />
                    );
                  })}

                  {/* Bars */}
                  {trend.map((item, idx) => {
                    const groupX = 25 + idx * barGroupWidth;
                    const salesH = Math.max(3, ((item.sales || 0) / maxVal) * (chartHeight - 30));
                    const purchH = Math.max(3, ((item.purchases || 0) / maxVal) * (chartHeight - 30));
                    const isHovered = hoverIndex === idx;

                    return (
                      <g 
                        key={idx}
                        onMouseEnter={() => setHoverIndex(idx)}
                        onMouseLeave={() => setHoverIndex(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Sales Bar */}
                        <rect
                          x={groupX}
                          y={chartHeight - salesH + 10}
                          width={barWidth}
                          height={salesH}
                          fill="#3B82F6"
                          rx={3}
                        />

                        {/* Purchases Bar */}
                        <rect
                          x={groupX + barWidth + 3}
                          y={chartHeight - purchH + 10}
                          width={barWidth}
                          height={purchH}
                          fill="#8B5CF6"
                          rx={3}
                        />

                        {/* Label */}
                        <text
                          x={groupX + barWidth}
                          y={chartHeight + 28}
                          textAnchor="middle"
                          fill={isHovered ? '#FFFFFF' : '#94A3B8'}
                          fontSize="10"
                          fontWeight={isHovered ? '800' : '500'}
                        >
                          {item.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {hoverIndex !== null && trend[hoverIndex] && (
                <div style={{
                  marginTop: 8,
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  borderRadius: 8,
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  fontSize: '0.82rem'
                }}>
                  <div style={{ fontWeight: 800, color: '#fff' }}>📅 {trend[hoverIndex].label}</div>
                  <div><span style={{ color: '#93C5FD' }}>Sales:</span> <strong style={{ color: '#fff' }}>₹{trend[hoverIndex].sales?.toLocaleString('en-IN')}</strong></div>
                  <div><span style={{ color: '#C4B5FD' }}>Purchases:</span> <strong style={{ color: '#fff' }}>₹{trend[hoverIndex].purchases?.toLocaleString('en-IN')}</strong></div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* VIEW 3: PAYMENT MODES BREAKDOWN */}
      {activeTab === 'PAYMENT_MODES' && (
        <div style={{ padding: '10px 4px' }}>
          {paymentModes.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
              No payments recorded for this period.
            </div>
          ) : (
            <PaymentModeBreakdownView modes={paymentModes} />
          )}
        </div>
      )}
    </div>
  );
}

// Subcomponent for Payment Mode Details
function PaymentModeBreakdownView({ modes }) {
  const total = modes.reduce((sum, m) => sum + (m.total || 0), 0);

  const modeColors = {
    'CASH': '#10B981',
    'UPI': '#3B82F6',
    'BANK_TRANSFER': '#8B5CF6',
    'CHEQUE': '#F59E0B',
    'CREDIT': '#EF4444'
  };

  const modeNames = {
    'CASH': 'Cash Collections',
    'UPI': 'UPI / QR Payments',
    'BANK_TRANSFER': 'Bank NEFT / RTGS',
    'CHEQUE': 'Cheques',
    'CREDIT': 'Credit / Udhar Given'
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        {modes.map((m, idx) => {
          const pct = total > 0 ? ((m.total || 0) / total) * 100 : 0;
          const color = modeColors[m.payment_mode] || '#60A5FA';
          return (
            <div 
              key={idx}
              style={{
                background: 'rgba(0,0,0,0.25)',
                border: `1px solid ${color}40`,
                borderRadius: 8,
                padding: '12px 14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {modeNames[m.payment_mode] || m.payment_mode}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color }}>
                  {pct.toFixed(0)}%
                </span>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                ₹{Math.round(m.total || 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 2 }}>
                {m.count} Invoices
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Bar Stack */}
      <div style={{ height: 10, width: '100%', background: 'rgba(0,0,0,0.3)', borderRadius: 999, display: 'flex', overflow: 'hidden' }}>
        {modes.map((m, idx) => {
          const pct = total > 0 ? ((m.total || 0) / total) * 100 : 0;
          return (
            <div 
              key={idx}
              title={`${modeNames[m.payment_mode] || m.payment_mode}: ₹${Math.round(m.total)} (${pct.toFixed(1)}%)`}
              style={{ width: `${pct}%`, background: modeColors[m.payment_mode] || '#60A5FA' }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ====================================================
// 4. PROFIT MARGIN CURVE (FOR REPORTS PROFIT TAB)
// ====================================================
export function ProfitMarginTrendChart({ data = [], summary = {} }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="card-panel" style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
        <TrendingUp size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
        <div style={{ fontWeight: 600 }}>No invoice profit records found for this period.</div>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map(d => d.revenue || 0), 1000);
  const chartHeight = 150;
  const chartWidth = 540;

  const stepX = data.length > 1 ? (chartWidth - 40) / (data.length - 1) : chartWidth / 2;
  const points = data.map((d, idx) => {
    const x = 25 + idx * stepX;
    const y = chartHeight - ((d.profit || 0) / maxRevenue) * (chartHeight - 30) + 10;
    return { x, y, ...d };
  });

  const lineD = createSmoothPath(points);
  const areaD = points.length > 0
    ? `${lineD} L ${points[points.length - 1].x} ${chartHeight + 10} L ${points[0].x} ${chartHeight + 10} Z`
    : '';

  return (
    <div className="card-panel" style={{ padding: '20px 22px', background: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} color="#10B981" />
            Net Gross Profit & Margin Curve
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Real-time margin accumulation per invoice date
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg Margin</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#34D399' }}>
            {summary.margin_percent || 0}%
          </div>
        </div>
      </div>

      <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <svg 
          viewBox={`0 0 ${chartWidth} ${chartHeight + 35}`}
          style={{ width: '100%', minWidth: Math.max(340, data.length * 36), height: 'auto', display: 'block' }}
        >
          <defs>
            <linearGradient id="profitCurveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {[0, 0.5, 1].map((r, i) => {
            const y = chartHeight - r * (chartHeight - 30) + 10;
            return (
              <line key={i} x1="20" y1={y} x2={chartWidth - 10} y2={y} stroke="rgba(255, 255, 255, 0.07)" strokeDasharray="4 4" />
            );
          })}

          <path d={areaD} fill="url(#profitCurveGrad)" />
          <path d={lineD} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />

          {points.map((p, idx) => {
            const isHovered = hoverIndex === idx;
            return (
              <g 
                key={idx}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : 3.5}
                  fill={isHovered ? '#FFFFFF' : '#34D399'}
                  stroke="#059669"
                  strokeWidth="2"
                />
                <text
                  x={p.x}
                  y={chartHeight + 26}
                  textAnchor="middle"
                  fill={isHovered ? '#FFFFFF' : '#94A3B8'}
                  fontSize="10"
                  fontWeight={isHovered ? '800' : '400'}
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {hoverIndex !== null && data[hoverIndex] && (
        <div style={{
          marginTop: 8,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: 8,
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: '0.82rem'
        }}>
          <div>📅 Date: <strong>{data[hoverIndex].key}</strong></div>
          <div>Revenue: <strong>₹{data[hoverIndex].revenue?.toLocaleString('en-IN')}</strong></div>
          <div>Cost: <strong>₹{data[hoverIndex].cost?.toLocaleString('en-IN')}</strong></div>
          <div style={{ color: '#34D399', fontWeight: 800 }}>
            Gross Profit: +₹{data[hoverIndex].profit?.toLocaleString('en-IN')} ({data[hoverIndex].margin_percent}%)
          </div>
        </div>
      )}
    </div>
  );
}

// ====================================================
// 5. REVENUE VS COST VS PROFIT BAR CHART
// ====================================================
export function RevenueProfitBarChart({ data = [], title = "Comparison Bars", subtitle }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="card-panel" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
        No comparison data available for this period.
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => Math.max(d.sales || 0, d.purchases || 0, d.profit || 0)), 1000);
  const chartHeight = 150;
  const chartWidth = 540;
  const barGroupWidth = (chartWidth - 40) / data.length;
  const barWidth = Math.max(6, Math.min(18, (barGroupWidth - 12) / 3));

  return (
    <div className="card-panel" style={{ padding: '20px 22px', background: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>{title}</div>
          {subtitle && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{subtitle}</div>}
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: '0.75rem', fontWeight: 600 }}>
          <span style={{ color: '#60A5FA' }}>■ Revenue</span>
          <span style={{ color: '#A78BFA' }}>■ Cost</span>
          <span style={{ color: '#34D399' }}>■ Profit</span>
        </div>
      </div>

      <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 35}`} style={{ width: '100%', minWidth: Math.max(340, data.length * 44), height: 'auto', display: 'block' }}>
          {[0, 0.5, 1].map((r, i) => {
            const y = chartHeight - r * (chartHeight - 30) + 10;
            return <line key={i} x1="20" y1={y} x2={chartWidth - 10} y2={y} stroke="rgba(255,255,255,0.07)" strokeDasharray="4 4" />;
          })}
          {data.map((item, idx) => {
            const groupX = 25 + idx * barGroupWidth;
            const sH = Math.max(2, ((item.sales || 0) / maxVal) * (chartHeight - 30));
            const pH = Math.max(2, ((item.purchases || 0) / maxVal) * (chartHeight - 30));
            const prH = Math.max(2, (Math.max(0, item.profit || 0) / maxVal) * (chartHeight - 30));
            const isHov = hoverIndex === idx;

            return (
              <g key={idx} onMouseEnter={() => setHoverIndex(idx)} onMouseLeave={() => setHoverIndex(null)} style={{ cursor: 'pointer' }}>
                <rect x={groupX} y={chartHeight - sH + 10} width={barWidth} height={sH} fill="#3B82F6" rx={2} />
                <rect x={groupX + barWidth + 2} y={chartHeight - pH + 10} width={barWidth} height={pH} fill="#8B5CF6" rx={2} />
                <rect x={groupX + (barWidth + 2) * 2} y={chartHeight - prH + 10} width={barWidth} height={prH} fill="#10B981" rx={2} />
                <text x={groupX + barWidth * 1.5} y={chartHeight + 26} textAnchor="middle" fill={isHov ? '#fff' : '#94A3B8'} fontSize="10" fontWeight={isHov ? '800' : '400'}>
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {hoverIndex !== null && data[hoverIndex] && (
        <div style={{ marginTop: 8, background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
          <div>📅 {data[hoverIndex].label}</div>
          <div><span style={{ color: '#60A5FA' }}>Revenue:</span> ₹{data[hoverIndex].sales?.toLocaleString('en-IN')}</div>
          <div><span style={{ color: '#A78BFA' }}>Cost:</span> ₹{data[hoverIndex].purchases?.toLocaleString('en-IN')}</div>
          <div><span style={{ color: '#34D399' }}>Profit:</span> +₹{data[hoverIndex].profit?.toLocaleString('en-IN')}</div>
        </div>
      )}
    </div>
  );
}
