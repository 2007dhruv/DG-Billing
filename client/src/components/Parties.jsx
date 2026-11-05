import React, { useState, useEffect } from 'react';
import { Users, Plus, Building, User, Phone, MapPin, IndianRupee, Trash2 } from 'lucide-react';

export function Parties({ businessProfile }) {
  const [parties, setParties] = useState([]);
  const [activeTab, setActiveTab] = useState('CUSTOMER');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const homeState = businessProfile?.state || 'Gujarat';
  const homeCode = businessProfile?.state_code || '24';

  const [newParty, setNewParty] = useState({
    name: '', party_type: 'CUSTOMER', phone: '', email: '',
    gstin: '', pan: '', state: homeState, state_code: homeCode,
    billing_address: '', opening_balance: 0
  });

  const fetchParties = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/parties?type=${activeTab}`);
      const data = await res.json();
      setParties(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, [activeTab]);

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
          billing_address: '', opening_balance: 0
        });
        fetchParties();
      }
    } catch (err) {
      alert('Error creating party: ' + err.message);
    }
  };

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>Parties Directory & Ledgers</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Manage client accounts, vendors, GSTINs, and outstanding balance ledgers
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> + Add New {activeTab === 'CUSTOMER' ? 'Customer' : 'Vendor'}
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-pill-bar" style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <button 
          className={`btn ${activeTab === 'CUSTOMER' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('CUSTOMER')}
        >
          <User size={18} /> Customers ({activeTab === 'CUSTOMER' ? parties.length : '...'})
        </button>
        <button 
          className={`btn ${activeTab === 'VENDOR' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('VENDOR')}
        >
          <Building size={18} /> Suppliers / Vendors ({activeTab === 'VENDOR' ? parties.length : '...'})
        </button>
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
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30 }}>Loading parties...</td></tr>
              ) : parties.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No {activeTab.toLowerCase()} accounts registered.</td></tr>
              ) : (
                parties.map(p => {
                  const isReceivable = p.current_balance > 0;
                  const isPayable = p.current_balance < 0;

                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{p.name}</div>
                        <span className="badge badge-primary">{p.party_type}</span>
                      </td>
                      <td>
                        <div>{p.phone || 'N/A'}</div>
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
                      <td style={{ maxWidth: 260, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {p.billing_address || 'N/A'}
                      </td>
                      <td>
                        <div style={{ 
                          fontWeight: 800, 
                          fontSize: '1rem',
                          color: isReceivable ? '#F87171' : isPayable ? '#FBBF24' : '#34D399'
                        }}>
                          ₹ {Math.abs(p.current_balance).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                          {isReceivable ? 'You will receive (Udhar)' : isPayable ? 'You have to pay' : 'All Settled'}
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          title="Delete party"
                          onClick={() => handleDeleteParty(p.id, p.name)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD PARTY */}
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
                    placeholder="e.g. Mahavir Trading Co."
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
                      placeholder="+91..."
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={newParty.email}
                      onChange={(e) => setNewParty({ ...newParty, email: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">GSTIN (15 Digits)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={newParty.gstin}
                      onChange={(e) => setNewParty({ ...newParty, gstin: e.target.value })}
                      placeholder="e.g. 27AABCS1429B1Z4"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State of Residence</label>
                    <select 
                      className="form-select"
                      value={newParty.state}
                      onChange={(e) => {
                        const st = e.target.value;
                        const codeMap = {
                          'Gujarat': '24', 'Maharashtra': '27', 'Rajasthan': '08', 'Madhya Pradesh': '23',
                          'Delhi': '07', 'Karnataka': '29', 'Tamil Nadu': '33', 'Telangana': '36',
                          'Uttar Pradesh': '09', 'Punjab': '03', 'Haryana': '06'
                        };
                        setNewParty({ ...newParty, state: st, state_code: codeMap[st] || '24' });
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
                  />
                </div>

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
    </div>
  );
}
