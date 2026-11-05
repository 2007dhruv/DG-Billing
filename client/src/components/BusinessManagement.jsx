import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Search, ShieldCheck, ExternalLink, 
  Trash2, Power, CheckCircle2, AlertTriangle, Phone, MapPin 
} from 'lucide-react';

export function BusinessManagement({ onSelectBusiness }) {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newBiz, setNewBiz] = useState({
    business_name: '',
    owner_name: '',
    username: '',
    password: '',
    phone: '',
    email: '',
    state: 'Gujarat',
    gstin: '',
    address: ''
  });

  const getHeaders = () => {
    const token = localStorage.getItem('vyapar_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/businesses', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setBusinesses(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    if (newBiz.password.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    try {
      const res = await fetch('/api/admin/businesses', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(newBiz)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to create business');
        return;
      }

      setShowAddModal(false);
      setNewBiz({
        business_name: '', owner_name: '', username: '', password: '',
        phone: '', email: '', state: 'Gujarat', gstin: '', address: ''
      });
      fetchBusinesses();
      alert(`✅ Business "${data.business.business_name}" created! Login Username: ${data.login_username}`);
    } catch (err) {
      alert('Error creating business: ' + err.message);
    }
  };

  const handleToggleStatus = async (biz) => {
    const nextStatus = biz.is_active ? 0 : 1;
    const actionName = nextStatus ? 'activate' : 'deactivate';

    if (!confirm(`Are you sure you want to ${actionName} "${biz.business_name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/businesses/${biz.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ is_active: nextStatus })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update status');
        return;
      }
      // Refresh list
      fetchBusinesses();
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleDeleteBusiness = async (biz) => {
    if (!confirm(`🚨 DANGER: Are you sure you want to permanently delete "${biz.business_name}"?\n\nThis will delete all their items, invoices, customers, and user logins permanently!`)) return;

    try {
      const res = await fetch(`/api/admin/businesses/${biz.id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        fetchBusinesses();
        alert('Business deleted successfully.');
      }
    } catch (err) {
      alert('Error deleting business: ' + err.message);
    }
  };

  // Aggregated Stats
  const totalBusinesses = businesses.length;
  const totalPlatformRevenue = businesses.reduce((sum, b) => sum + (b.total_revenue || 0), 0);
  const totalPlatformInvoices = businesses.reduce((sum, b) => sum + (b.total_invoices || 0), 0);

  const filteredBusinesses = businesses.filter(b => 
    b.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.login_username && b.login_username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      {/* Super Admin Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(37, 99, 235, 0.15) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.4)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px',
        marginBottom: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span className="badge" style={{ background: '#7C3AED', color: '#fff' }}>SUPER ADMIN SAAS PORTAL</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Multi-Business Control</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
            Client Businesses & Tenant Accounts
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Create and manage independent business accounts. Each business gets its own isolated catalog, invoices, and login.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ padding: '12px 20px', fontSize: '0.95rem' }}>
          <Plus size={18} /> + Register New Business
        </button>
      </div>

      {/* KPI Stats */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Registered Businesses</span>
            <div className="metric-icon-box" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#C4B5FD' }}>
              <Building2 size={20} />
            </div>
          </div>
          <div className="metric-value">{totalBusinesses}</div>
          <div className="metric-subtext">Independent Business Workspaces</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Total Platform Turnover</span>
            <div className="metric-icon-box" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34D399' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="metric-value" style={{ color: '#34D399' }}>
            ₹ {Math.round(totalPlatformRevenue).toLocaleString('en-IN')}
          </div>
          <div className="metric-subtext">Across All Client Invoices</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Total Invoices Generated</span>
            <div className="metric-icon-box" style={{ background: 'rgba(37, 99, 235, 0.2)', color: '#60A5FA' }}>
              <ExternalLink size={20} />
            </div>
          </div>
          <div className="metric-value">{totalPlatformInvoices}</div>
          <div className="metric-subtext">Issued by Tenant Businesses</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card-panel" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-input" 
            style={{ paddingLeft: 38 }}
            placeholder="Search businesses by Company Name, Owner Name, or Username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Businesses Table */}
      <div className="card-panel">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Business Name & State</th>
                <th>Owner & Login Username</th>
                <th>GSTIN</th>
                <th>Catalog Items</th>
                <th>Invoices & Turnover</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30 }}>Loading registered businesses...</td></tr>
              ) : filteredBusinesses.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                    No client businesses registered yet. Click "+ Register New Business" to create one.
                  </td>
                </tr>
              ) : (
                filteredBusinesses.map(biz => (
                  <tr key={biz.id}>
                    <td>
                      <div style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>
                        {biz.business_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {biz.state} (Code: {biz.state_code})
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{biz.owner_name}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#93C5FD' }}>
                        Login: @{biz.login_username || 'N/A'}
                      </div>
                      {biz.phone && <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>{biz.phone}</div>}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                        {biz.gstin || 'Unregistered / Retail'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-primary">{biz.total_items} Items</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#34D399' }}>
                        ₹ {Math.round(biz.total_revenue || 0).toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {biz.total_invoices} Invoices
                      </div>
                    </td>
                    <td>
                      {biz.is_active ? (
                        <span className="badge badge-success">ACTIVE</span>
                      ) : (
                        <span className="badge badge-danger">SUSPENDED</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button 
                          className="btn btn-primary btn-sm"
                          title="Open this business's workspace"
                          onClick={() => onSelectBusiness(biz)}
                        >
                          <ExternalLink size={14} /> Workspace
                        </button>
                        <button 
                          className={`btn btn-sm ${biz.is_active ? 'btn-danger' : 'btn-success'}`}
                          title={biz.is_active ? 'Click to Deactivate Business' : 'Click to Activate Business'}
                          onClick={() => handleToggleStatus(biz)}
                        >
                          {biz.is_active ? (
                            <><Power size={13} /> Deactivate</>
                          ) : (
                            <><CheckCircle2 size={13} /> Activate</>
                          )}
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#F87171' }}
                          title="Delete Business"
                          onClick={() => handleDeleteBusiness(biz)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: REGISTER NEW CLIENT BUSINESS */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={22} color="#A78BFA" /> Register New Client Business Account
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleCreateBusiness}>
              <div className="modal-body">
                {/* Business Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Business / Company Name *</label>
                    <input 
                      type="text" 
                      required 
                      className="form-input" 
                      placeholder="e.g. Sharma Electronics & Appliances"
                      value={newBiz.business_name}
                      onChange={(e) => setNewBiz({ ...newBiz, business_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Business Owner Name *</label>
                    <input 
                      type="text" 
                      required 
                      className="form-input" 
                      placeholder="e.g. Ramesh Sharma"
                      value={newBiz.owner_name}
                      onChange={(e) => setNewBiz({ ...newBiz, owner_name: e.target.value })}
                    />
                  </div>
                </div>

                {/* Login Credentials for this business */}
                <div style={{ background: 'rgba(37,99,235,0.1)', padding: 16, borderRadius: 8, border: '1px solid rgba(59,130,246,0.25)', marginBottom: 16 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#93C5FD', marginBottom: 10 }}>
                    🔐 Login Credentials For This Business Owner:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label className="form-label">Login Username *</label>
                      <input 
                        type="text" 
                        required 
                        className="form-input" 
                        placeholder="e.g. sharma_elec"
                        value={newBiz.username}
                        onChange={(e) => setNewBiz({ ...newBiz, username: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Login Password * (Min 6 chars)</label>
                      <input 
                        type="password" 
                        required 
                        className="form-input" 
                        placeholder="••••••••"
                        value={newBiz.password}
                        onChange={(e) => setNewBiz({ ...newBiz, password: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Contact & GST */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Contact Phone</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="+91..."
                      value={newBiz.phone}
                      onChange={(e) => setNewBiz({ ...newBiz, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      placeholder="owner@business.com"
                      value={newBiz.email}
                      onChange={(e) => setNewBiz({ ...newBiz, email: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">GSTIN (Optional)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. 27AAACS1234A1Z5"
                      value={newBiz.gstin}
                      onChange={(e) => setNewBiz({ ...newBiz, gstin: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Operating State (GST Home State)</label>
                    <select 
                      className="form-select"
                      value={newBiz.state}
                      onChange={(e) => setNewBiz({ ...newBiz, state: e.target.value })}
                    >
                      <option value="Gujarat">Gujarat (24)</option>
                      <option value="Maharashtra">Maharashtra (27)</option>
                      <option value="Rajasthan">Rajasthan (08)</option>
                      <option value="Madhya Pradesh">Madhya Pradesh (23)</option>
                      <option value="Delhi">Delhi (07)</option>
                      <option value="Karnataka">Karnataka (29)</option>
                      <option value="Tamil Nadu">Tamil Nadu (33)</option>
                      <option value="Telangana">Telangana (36)</option>
                      <option value="Uttar Pradesh">Uttar Pradesh (09)</option>
                      <option value="Punjab">Punjab (03)</option>
                      <option value="Haryana">Haryana (06)</option>
                      <option value="West Bengal">West Bengal (19)</option>
                      <option value="Bihar">Bihar (10)</option>
                      <option value="Kerala">Kerala (32)</option>
                      <option value="Andhra Pradesh">Andhra Pradesh (37)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Shop / Office Address</label>
                  <textarea 
                    className="form-textarea" 
                    rows={2}
                    value={newBiz.address}
                    onChange={(e) => setNewBiz({ ...newBiz, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }}>
                  Register Business & Create Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
