import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Building, User, Phone, MapPin, IndianRupee, 
  Trash2, Edit2, Search, ArrowDownLeft, ArrowUpRight, CheckCircle, CreditCard 
} from 'lucide-react';

const STATE_CODE_MAP = {
  'Gujarat': '24', 'Maharashtra': '27', 'Rajasthan': '08', 'Madhya Pradesh': '23',
  'Delhi': '07', 'Karnataka': '29', 'Tamil Nadu': '33', 'Telangana': '36',
  'Uttar Pradesh': '09', 'Punjab': '03', 'Haryana': '06'
};

export function Parties({ businessProfile }) {
  const [allParties, setAllParties] = useState([]);
  const [activeTab, setActiveTab] = useState('CUSTOMER');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const homeState = businessProfile?.state || 'Gujarat';
  const homeCode = businessProfile?.state_code || '24';

  // Add form state
  const [newParty, setNewParty] = useState({
    name: '', party_type: 'CUSTOMER', phone: '', email: '',
    gstin: '', pan: '', state: homeState, state_code: homeCode,
    billing_address: '', opening_balance: 0, credit_limit: 0
  });

  // Edit form state
  const [editParty, setEditParty] = useState({
    id: null, name: '', party_type: 'CUSTOMER', phone: '', email: '',
    gstin: '', pan: '', state: homeState, state_code: homeCode,
    billing_address: '', credit_limit: 0
  });

  // Payment form state
  const [selectedPartyForPayment, setSelectedPartyForPayment] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    payment_mode: 'CASH',
    payment_date: new Date().toISOString().split('T')[0],
    reference_no: '',
    notes: ''
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const fetchParties = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/parties');
      const data = await res.json();
      setAllParties(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching parties:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, []);

  // Filter parties by active tab and search term
  const currentTabParties = allParties.filter(p => p.party_type === activeTab);
  const filteredParties = currentTabParties.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(term) ||
      (p.phone || '').toLowerCase().includes(term) ||
      (p.gstin || '').toLowerCase().includes(term) ||
      (p.state || '').toLowerCase().includes(term)
    );
  });

  // Financial calculations across all parties
  const totalReceivable = allParties
    .filter(p => p.party_type === 'CUSTOMER')
    .reduce((sum, p) => sum + (p.current_balance > 0 ? parseFloat(p.current_balance) : 0), 0);

  const totalPayable = allParties
    .filter(p => p.party_type === 'VENDOR')
    .reduce((sum, p) => sum + (p.current_balance < 0 ? Math.abs(parseFloat(p.current_balance)) : 0), 0);

  const netBalance = totalReceivable - totalPayable;

  // Save new party
  const handleSaveParty = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newParty, party_type: activeTab })
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewParty({
          name: '', party_type: 'CUSTOMER', phone: '', email: '',
          gstin: '', pan: '', state: homeState, state_code: homeCode,
          billing_address: '', opening_balance: 0, credit_limit: 0
        });
        fetchParties();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create party.');
      }
    } catch (err) {
      alert('Error creating party: ' + err.message);
    }
  };

  // Open edit modal
  const handleOpenEdit = (p) => {
    setEditParty({
      id: p.id,
      name: p.name || '',
      party_type: p.party_type,
      phone: p.phone || '',
      email: p.email || '',
      gstin: p.gstin || '',
      pan: p.pan || '',
      state: p.state || homeState,
      state_code: p.state_code || homeCode,
      billing_address: p.billing_address || '',
      credit_limit: p.credit_limit || 0
    });
    setShowEditModal(true);
  };

  // Update existing party
  const handleUpdateParty = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/parties/${editParty.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editParty)
      });
      if (res.ok) {
        setShowEditModal(false);
        fetchParties();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update party.');
      }
    } catch (err) {
      alert('Error updating party: ' + err.message);
    }
  };

  // Open payment modal
  const handleOpenPayment = (p) => {
    setSelectedPartyForPayment(p);
    const balance = Math.abs(parseFloat(p.current_balance) || 0);
    setPaymentFormData({
      amount: balance > 0 ? balance : '',
      payment_mode: 'CASH',
      payment_date: new Date().toISOString().split('T')[0],
      reference_no: '',
      notes: `${p.party_type === 'CUSTOMER' ? 'Udhar recovery from' : 'Payment made to'} ${p.name}`
    });
    setShowPaymentModal(true);
  };

  // Submit direct party payment
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!selectedPartyForPayment) return;
    setPaymentSubmitting(true);
    try {
      const res = await fetch(`/api/parties/${selectedPartyForPayment.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentFormData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');

      await fetchParties();
      setShowPaymentModal(false);
      setSelectedPartyForPayment(null);
      alert(data.message || 'Payment recorded successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Delete party
  const handleDeleteParty = async (pId, pName) => {
    if (!confirm(`Are you sure you want to delete ${activeTab === 'CUSTOMER' ? 'Customer' : 'Vendor'} "${pName}"?`)) return;
    try {
      const res = await fetch(`/api/parties/${pId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        fetchParties();
      } else {
        alert(data.error || 'Failed to delete party.');
      }
    } catch (err) {
      alert('Error deleting party: ' + err.message);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>Parties Directory & Ledgers</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Manage client accounts, vendors, GSTINs, and live outstanding balance ledgers
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> + Add New {activeTab === 'CUSTOMER' ? 'Customer' : 'Vendor'}
        </button>
      </div>

      {/* SUMMARY BANNER: Total Money Calculation */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: 16, 
        marginBottom: 24 
      }}>
        {/* Total to Receive (Customer Udhar) */}
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.2)', 
            color: '#F87171', 
            padding: 12, 
            borderRadius: 10 
          }}>
            <ArrowDownLeft size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Total Receivable (તમારે લેવાના બાકી)
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#F87171' }}>
              ₹ {Math.round(totalReceivable).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-faint)' }}>
              From {allParties.filter(p => p.party_type === 'CUSTOMER' && p.current_balance > 0).length} customers with pending Udhar
            </div>
          </div>
        </div>

        {/* Total to Pay (Suppliers / Vendors) */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div style={{ 
            background: 'rgba(245, 158, 11, 0.2)', 
            color: '#FBBF24', 
            padding: 12, 
            borderRadius: 10 
          }}>
            <ArrowUpRight size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Total Payable (તમારે ચૂકવવાના બાકી)
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FBBF24' }}>
              ₹ {Math.round(totalPayable).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-faint)' }}>
              To {allParties.filter(p => p.party_type === 'VENDOR' && p.current_balance < 0).length} suppliers for credit purchases
            </div>
          </div>
        </div>

        {/* Net Cashflow Ledger */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div style={{ 
            background: 'rgba(59, 130, 246, 0.2)', 
            color: '#60A5FA', 
            padding: 12, 
            borderRadius: 10 
          }}>
            <IndianRupee size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Net Balance Position
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: netBalance >= 0 ? '#34D399' : '#F87171' }}>
              {netBalance >= 0 ? '+' : '-'} ₹ {Math.abs(Math.round(netBalance)).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-faint)' }}>
              {netBalance >= 0 ? 'Net positive (more to collect than pay)' : 'Net payable (more to pay than collect)'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Search Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 14 }}>
        <div className="tab-pill-bar" style={{ display: 'flex', gap: 12 }}>
          <button 
            className={`btn ${activeTab === 'CUSTOMER' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('CUSTOMER')}
          >
            <User size={18} /> Customers ({allParties.filter(p => p.party_type === 'CUSTOMER').length})
          </button>
          <button 
            className={`btn ${activeTab === 'VENDOR' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('VENDOR')}
          >
            <Building size={18} /> Suppliers / Vendors ({allParties.filter(p => p.party_type === 'VENDOR').length})
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', width: 280 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-faint)' }} />
          <input 
            type="text" 
            className="form-input" 
            style={{ paddingLeft: 36 }}
            placeholder={`Search ${activeTab.toLowerCase()} by name, phone, GST...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card-panel">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Party Name</th>
                <th>Contact</th>
                <th>GSTIN & State</th>
                <th>Billing Address</th>
                <th>Current Balance (₹)</th>
                <th style={{ width: 170, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30 }}>Loading parties...</td></tr>
              ) : filteredParties.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                  {searchTerm ? 'No matching parties found.' : `No ${activeTab.toLowerCase()} accounts registered.`}
                </td></tr>
              ) : (
                filteredParties.map(p => {
                  const isReceivable = p.current_balance > 0;
                  const isPayable = p.current_balance < 0;

                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{p.name}</div>
                        <span className="badge badge-primary">{p.party_type}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.phone || 'N/A'}</div>
                        {p.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>{p.email}</div>}
                      </td>
                      <td>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                          {p.gstin || 'Unregistered / Retail'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {p.state} (Code: {p.state_code})
                        </div>
                      </td>
                      <td style={{ maxWidth: 240, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {p.billing_address || 'N/A'}
                      </td>
                      <td>
                        <div style={{ 
                          fontWeight: 800, 
                          fontSize: '1.05rem',
                          color: isReceivable ? '#F87171' : isPayable ? '#FBBF24' : '#34D399'
                        }}>
                          ₹ {Math.abs(p.current_balance).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontWeight: 600 }}>
                          {isReceivable ? 'You will receive (Udhar)' : isPayable ? 'You have to pay' : 'All Settled'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                          {/* Settle / Pay Button */}
                          {isReceivable && (
                            <button
                              className="btn btn-sm btn-success"
                              style={{ background: '#10B981', color: '#fff', fontWeight: 700, padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 3 }}
                              title="Receive Payment from Customer"
                              onClick={() => handleOpenPayment(p)}
                            >
                              <CreditCard size={12} /> Receive
                            </button>
                          )}
                          {isPayable && (
                            <button
                              className="btn btn-sm btn-warning"
                              style={{ background: '#F59E0B', color: '#000', fontWeight: 700, padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 3 }}
                              title="Pay Money to Supplier"
                              onClick={() => handleOpenPayment(p)}
                            >
                              <CreditCard size={12} /> Pay
                            </button>
                          )}

                          {/* Edit Button */}
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '6px 8px' }}
                            title="Edit Party Details"
                            onClick={() => handleOpenEdit(p)}
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* Delete Button */}
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ padding: '6px 8px' }}
                            title="Delete Party"
                            onClick={() => handleDeleteParty(p.id, p.name)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD PARTY */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                Add New {activeTab === 'CUSTOMER' ? 'Customer' : 'Supplier / Vendor'}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSaveParty}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{activeTab === 'CUSTOMER' ? 'Customer / Business Name' : 'Supplier Name'} *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    value={newParty.name}
                    onChange={(e) => setNewParty({ ...newParty, name: e.target.value })}
                    placeholder={activeTab === 'CUSTOMER' ? "e.g. Patel Agro Center / Rameshbhai" : "e.g. Shaktiman Agro Equipments Ltd."}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input 
                      type="text" 
                      required 
                      className="form-input" 
                      value={newParty.phone}
                      onChange={(e) => setNewParty({ ...newParty, phone: e.target.value })}
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={newParty.email}
                      onChange={(e) => setNewParty({ ...newParty, email: e.target.value })}
                      placeholder="optional@example.com"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">GSTIN (Optional for Retail / Farmers)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={newParty.gstin}
                      onChange={(e) => setNewParty({ ...newParty, gstin: e.target.value })}
                      placeholder="e.g. 24AABCS1429B1Z4"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State of Residence</label>
                    <select 
                      className="form-select"
                      value={newParty.state}
                      onChange={(e) => {
                        const st = e.target.value;
                        setNewParty({ ...newParty, state: st, state_code: STATE_CODE_MAP[st] || '24' });
                      }}
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
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Billing Address</label>
                  <textarea 
                    className="form-textarea" 
                    rows={2}
                    value={newParty.billing_address}
                    onChange={(e) => setNewParty({ ...newParty, billing_address: e.target.value })}
                    placeholder="Shop / Village address..."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Opening Balance (₹)</label>
                    <input 
                      type="number" 
                      step="any" 
                      className="form-input" 
                      value={newParty.opening_balance}
                      onChange={(e) => setNewParty({ ...newParty, opening_balance: e.target.value })}
                      placeholder="0"
                    />
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
                      Existing pending balance from past transactions before DG-Billing.
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Credit Limit (₹)</label>
                    <input 
                      type="number" 
                      step="any" 
                      className="form-input" 
                      value={newParty.credit_limit}
                      onChange={(e) => setNewParty({ ...newParty, credit_limit: e.target.value })}
                      placeholder="0 (Unlimited)"
                    />
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
                      Max Udhar allowed (0 for unlimited).
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Party Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT PARTY */}
      {showEditModal && editParty && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                Edit {editParty.party_type === 'CUSTOMER' ? 'Customer' : 'Supplier'} Details
              </h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleUpdateParty}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{editParty.party_type === 'CUSTOMER' ? 'Customer / Business Name' : 'Supplier Name'} *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    value={editParty.name}
                    onChange={(e) => setEditParty({ ...editParty, name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input 
                      type="text" 
                      required 
                      className="form-input" 
                      value={editParty.phone}
                      onChange={(e) => setEditParty({ ...editParty, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={editParty.email}
                      onChange={(e) => setEditParty({ ...editParty, email: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">GSTIN (15 Digits)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editParty.gstin}
                      onChange={(e) => setEditParty({ ...editParty, gstin: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State of Residence</label>
                    <select 
                      className="form-select"
                      value={editParty.state}
                      onChange={(e) => {
                        const st = e.target.value;
                        setEditParty({ ...editParty, state: st, state_code: STATE_CODE_MAP[st] || '24' });
                      }}
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
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Billing Address</label>
                  <textarea 
                    className="form-textarea" 
                    rows={2}
                    value={editParty.billing_address}
                    onChange={(e) => setEditParty({ ...editParty, billing_address: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Credit Limit (₹)</label>
                  <input 
                    type="number" 
                    step="any" 
                    className="form-input" 
                    value={editParty.credit_limit}
                    onChange={(e) => setEditParty({ ...editParty, credit_limit: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DIRECT PARTY PAYMENT (RECEIVE / PAY) */}
      {showPaymentModal && selectedPartyForPayment && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                  {selectedPartyForPayment.party_type === 'CUSTOMER' ? 'Receive Money (Payment In)' : 'Pay Supplier (Payment Out)'}
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#60A5FA' }}>
                  Party: {selectedPartyForPayment.name}
                </span>
              </div>
              <button onClick={() => setShowPaymentModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSubmitPayment}>
              <div className="modal-body">
                {/* Outstanding banner */}
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-highlight)',
                  padding: '14px 18px',
                  borderRadius: 10,
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Current Outstanding Balance:
                  </span>
                  <span style={{
                    fontWeight: 800,
                    fontSize: '1.2rem',
                    color: selectedPartyForPayment.current_balance > 0 ? '#F87171' : selectedPartyForPayment.current_balance < 0 ? '#FBBF24' : '#34D399'
                  }}>
                    ₹ {Math.abs(selectedPartyForPayment.current_balance).toLocaleString('en-IN')}
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, marginLeft: 6, color: 'var(--text-faint)' }}>
                      ({selectedPartyForPayment.current_balance > 0 ? 'Udhar to receive' : selectedPartyForPayment.current_balance < 0 ? 'To pay vendor' : 'Settled'})
                    </span>
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Payment Amount (₹) *
                  </label>
                  <input 
                    type="number" 
                    step="any" 
                    min="1" 
                    required 
                    className="form-input"
                    style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34D399' }}
                    value={paymentFormData.amount}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                    placeholder="Enter amount..."
                  />
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    💡 This payment will automatically update this party's Khata balance and mark linked pending bills as settled!
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select 
                      className="form-select"
                      value={paymentFormData.payment_mode}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_mode: e.target.value })}
                    >
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                      <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={paymentFormData.payment_date}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">Reference No / UTR / Cheque (Optional)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. UPI Ref / Cheque #12345"
                    value={paymentFormData.reference_no}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, reference_no: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes / Remarks (Optional)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Cash received at shop by Dhruvbhai"
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowPaymentModal(false)}
                  disabled={paymentSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ background: '#10B981', borderColor: '#10B981', fontWeight: 700 }}
                  disabled={paymentSubmitting}
                >
                  {paymentSubmitting ? 'Recording...' : `Record Payment of ₹${parseFloat(paymentFormData.amount || 0).toLocaleString('en-IN')}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
