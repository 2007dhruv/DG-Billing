import React, { useState, useEffect } from 'react';
import { Building2, User, Phone, MapPin, IndianRupee, ShieldCheck, CheckCircle2, X } from 'lucide-react';

export function BusinessSetupModal({ profile, isFirstTime, onClose, onSaveSuccess }) {
  const [formData, setFormData] = useState({
    business_name: '',
    owner_name: '',
    legal_name: '',
    gstin: '',
    phone: '',
    email: '',
    address: '',
    state: 'Gujarat',
    state_code: '24',
    pan: '',
    bank_name: '',
    account_number: '',
    ifsc: '',
    upi_id: '',
    terms_conditions: '1. Goods once sold will not be taken back without original bill.\n2. Interest @ 18% p.a. charged if bill unpaid after 15 days.\n3. Subject to local jurisdiction only.',
    invoice_prefix: 'INV-2026-'
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        business_name: profile.business_name || '',
        owner_name: profile.owner_name || '',
        legal_name: profile.legal_name || '',
        gstin: profile.gstin || '',
        phone: profile.phone || '',
        email: profile.email || '',
        address: profile.address || '',
        state: profile.state || 'Gujarat',
        state_code: profile.state_code || '24',
        pan: profile.pan || '',
        bank_name: profile.bank_name || '',
        account_number: profile.account_number || '',
        ifsc: profile.ifsc || '',
        upi_id: profile.upi_id || '',
        terms_conditions: profile.terms_conditions || '1. Goods once sold will not be taken back without original bill.\n2. Subject to local jurisdiction only.',
        invoice_prefix: profile.invoice_prefix || 'INV-2026-'
      });
    }
  }, [profile]);

  const stateList = [
    { name: 'Gujarat', code: '24' },
    { name: 'Maharashtra', code: '27' },
    { name: 'Gujarat', code: '24' },
    { name: 'Karnataka', code: '29' },
    { name: 'Delhi', code: '07' },
    { name: 'Rajasthan', code: '08' },
    { name: 'Uttar Pradesh', code: '09' },
    { name: 'Madhya Pradesh', code: '23' },
    { name: 'Tamil Nadu', code: '33' },
    { name: 'Telangana', code: '36' },
    { name: 'West Bengal', code: '19' },
    { name: 'Punjab', code: '03' },
    { name: 'Haryana', code: '06' },
    { name: 'Kerala', code: '32' },
    { name: 'Bihar', code: '10' }
  ];

  const handleStateChange = (stName) => {
    const found = stateList.find(s => s.name === stName);
    setFormData({
      ...formData,
      state: stName,
      state_code: found ? found.code : '27'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.business_name.trim()) {
      alert('Please enter your Business / Shop name.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        if (onSaveSuccess) onSaveSuccess(data);
        if (onClose) onClose();
      } else {
        alert('Error saving profile: ' + data.error);
      }
    } catch (err) {
      alert('Failed to save profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog" style={{ maxWidth: 780 }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Building2 size={24} color="#60A5FA" />
              {isFirstTime ? 'Setup Your Business Profile' : 'Business Settings & Profile'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
              {isFirstTime 
                ? '👋 Welcome! Enter your shop details to automatically brand all GST invoices, print slips & WhatsApp messages.'
                : 'Update your registered business details, GSTIN, and bank information.'}
            </p>
          </div>
          {!isFirstTime && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
          )}
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '72vh' }}>
            {/* 1. Basic Identity */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                1. Shop & Owner Identity
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Business / Shop Name *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    placeholder="e.g. Shree Ganesh Enterprises"
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Owner / Manager Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Ramesh Sharma"
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Contact Phone / Mobile *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="billing@mybusiness.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Shop / Office Full Address</label>
                <textarea 
                  className="form-textarea" 
                  rows={2}
                  placeholder="e.g. Shop 12, Ground Floor, Commercial Complex, Main Market"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>

            {/* 2. GST & Tax Slabs */}
            <div style={{ marginBottom: 20, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                2. GST & Place of Business
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">GSTIN (15 Digits)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. 27AABCS1429B1Z4 (or leave blank if unregistered)"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">State (Place of Supply) *</label>
                  <select 
                    className="form-select"
                    value={formData.state}
                    onChange={(e) => handleStateChange(e.target.value)}
                  >
                    {stateList.map(s => (
                      <option key={s.code} value={s.name}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">PAN Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. AABCS1429B"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
            </div>

            {/* 3. Bank & UPI (Printed on Bills) */}
            <div style={{ marginBottom: 20, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FBBF24', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                3. Bank & UPI Payment Details (Printed on Invoices)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Bank Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. State Bank of India / HDFC"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. 50100234567890"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">IFSC Code</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. SBIN0001234"
                    value={formData.ifsc}
                    onChange={(e) => setFormData({ ...formData, ifsc: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">UPI ID (For Quick QR Payments)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. yourbusiness@upi or 9876543210@paytm"
                    value={formData.upi_id}
                    onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bill Prefix</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="INV-2026-"
                    value={formData.invoice_prefix}
                    onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* 4. Terms & Conditions */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
              <div className="form-group">
                <label className="form-label">Invoice Terms & Conditions</label>
                <textarea 
                  className="form-textarea" 
                  rows={2}
                  value={formData.terms_conditions}
                  onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            {!isFirstTime && (
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }} disabled={saving}>
              <CheckCircle2 size={18} /> {saving ? 'Saving...' : 'Save & Set Up Business'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
