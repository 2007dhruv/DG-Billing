import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, Plus, ArrowRightCircle, CheckCircle, 
  Clock, CheckCheck, Trash2 
} from 'lucide-react';

export function Quotations({ onRefreshDashboard, onViewInvoice }) {
  const [quotations, setQuotations] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [partiesList, setPartiesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('Valued Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [validTill, setValidTill] = useState('');
  const [notes, setNotes] = useState('Prices valid for 15 days from date of issue.');

  const [lineItems, setLineItems] = useState([
    { item_id: '', item_name: '', hsn_sac: '', unit: 'Pcs', quantity: 1, sale_price: 0, gst_rate: 18 }
  ]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [qRes, itRes, ptRes] = await Promise.all([
        fetch('/api/quotations'),
        fetch('/api/items'),
        fetch('/api/parties?type=CUSTOMER')
      ]);
      const qs = await qRes.json();
      const its = await itRes.json();
      const pts = await ptRes.json();
      setQuotations(Array.isArray(qs) ? qs : []);
      setItemsList(Array.isArray(its) ? its : []);
      setPartiesList(Array.isArray(pts) ? pts : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectCustomer = (pId) => {
    setCustomerId(pId);
    const p = partiesList.find(x => x.id === parseInt(pId));
    if (p) {
      setCustomerName(p.name);
      setCustomerPhone(p.phone || '');
    }
  };

  const handleItemSelect = (index, itemId) => {
    const item = itemsList.find(i => i.id === parseInt(itemId));
    const updated = [...lineItems];
    if (item) {
      updated[index] = {
        ...updated[index],
        item_id: item.id,
        item_name: item.name,
        hsn_sac: item.hsn_sac || '',
        unit: item.unit || 'Pcs',
        sale_price: item.sale_price || 0,
        gst_rate: item.gst_rate || 18
      };
    }
    setLineItems(updated);
  };

  const handleLineChange = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;
    setLineItems(updated);
  };

  const addLine = () => {
    setLineItems([...lineItems, { item_id: '', item_name: '', hsn_sac: '', unit: 'Pcs', quantity: 1, sale_price: 0, gst_rate: 18 }]);
  };

  const removeLine = (idx) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  let grandTotal = 0;
  lineItems.forEach(it => {
    const taxable = (parseFloat(it.quantity) || 0) * (parseFloat(it.sale_price) || 0);
    const gst = (taxable * (parseFloat(it.gst_rate) || 0)) / 100;
    grandTotal += taxable + gst;
  });

  const handleCreateQuotation = async (e) => {
    e.preventDefault();
    const valid = lineItems.filter(it => it.item_id && it.quantity > 0);
    if (valid.length === 0) {
      alert('Please add at least one valid item');
      return;
    }

    try {
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId ? parseInt(customerId) : null,
          customer_name: customerName,
          customer_phone: customerPhone,
          quotation_date: quoteDate,
          valid_till: validTill,
          items: valid,
          notes
        })
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchData();
        alert('Quotation generated! Note: Stock is NOT deducted until converted to Tax Invoice.');
      }
    } catch (err) {
      alert('Error creating quotation: ' + err.message);
    }
  };

  const handleConvert = async (qId, qNum) => {
    if (!confirm(`Convert Quotation #${qNum} to an official GST Tax Invoice?\n\nThis will generate an official Tax Invoice Number and DEDUCT items from warehouse stock.`)) return;

    try {
      const res = await fetch(`/api/quotations/${qId}/convert-to-invoice`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ Success! Quotation converted to ${data.invoice_number} and stock deducted.`);
        fetchData();
        if (onRefreshDashboard) onRefreshDashboard();
        if (onViewInvoice) onViewInvoice(data.invoice_id);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Failed to convert: ' + err.message);
    }
  };

  const handleDeleteQuotation = async (qId, qNum) => {
    if (!confirm(`Are you sure you want to delete Quotation #${qNum}?`)) return;
    try {
      const res = await fetch(`/api/quotations/${qId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert('Failed: ' + (data.error || 'Could not delete quotation'));
      }
    } catch (err) {
      alert('Error deleting: ' + err.message);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>Estimates & Quotations</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Provide non-binding pricing estimates to clients. 1-click convert into Tax Invoice when confirmed.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> + New Estimate / Quotation
        </button>
      </div>

      {/* Table */}
      <div className="card-panel">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quotation No</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Estimated Total</th>
                <th>Status</th>
                <th>Stock Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30 }}>Loading quotations...</td></tr>
              ) : quotations.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No quotations created yet.</td></tr>
              ) : (
                quotations.map(q => {
                  const isConverted = q.status === 'CONVERTED_TO_INVOICE';

                  return (
                    <tr key={q.id}>
                      <td style={{ fontWeight: 700, color: '#60A5FA' }}>{q.quotation_number}</td>
                      <td>{q.quotation_date}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{q.customer_name}</div>
                        {q.customer_phone && <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>{q.customer_phone}</div>}
                      </td>
                      <td style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>
                        ₹ {q.grand_total?.toLocaleString('en-IN')}
                      </td>
                      <td>
                        {isConverted ? (
                          <span className="badge badge-success">
                            <CheckCheck size={14} /> CONVERTED TO INVOICE
                          </span>
                        ) : (
                          <span className="badge badge-warning">
                            <Clock size={14} /> PENDING CLIENT APPROVAL
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {isConverted ? (
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => onViewInvoice(q.converted_invoice_id)}
                            >
                              View Final Invoice
                            </button>
                          ) : (
                            <button 
                              className="btn btn-success btn-sm"
                              onClick={() => handleConvert(q.id, q.quotation_number)}
                            >
                              <ArrowRightCircle size={14} /> Convert to Invoice (Deduct Stock)
                            </button>
                          )}
                          <button
                            className="btn btn-danger btn-sm"
                            title="Delete quotation"
                            onClick={() => handleDeleteQuotation(q.id, q.quotation_number)}
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

      {/* MODAL: ADD QUOTATION */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 860 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Create Client Estimate / Quotation</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreateQuotation}>
              <div className="modal-body">
                <div className="form-grid-3" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
                  <div className="form-group">
                    <label className="form-label">Client / Customer</label>
                    <select 
                      className="form-select"
                      value={customerId}
                      onChange={(e) => handleSelectCustomer(e.target.value)}
                    >
                      <option value="">-- Quick Walk-in Client --</option>
                      {partiesList.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.phone || p.state})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Customer Name *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Quote Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={quoteDate}
                      onChange={(e) => setQuoteDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Items */}
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 10, color: '#fff' }}>Quotation Items</h4>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40%' }}>Item Name</th>
                          <th style={{ width: '18%' }}>Quantity</th>
                          <th style={{ width: '20%' }}>Quote Price (₹)</th>
                          <th style={{ width: '14%' }}>GST Rate</th>
                          <th style={{ width: '8%' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((row, idx) => (
                          <tr key={idx}>
                            <td>
                              <select 
                                className="form-select"
                                value={row.item_id}
                                onChange={(e) => handleItemSelect(idx, e.target.value)}
                                required
                              >
                                <option value="">-- Select Product --</option>
                                {itemsList.map(it => (
                                  <option key={it.id} value={it.id}>{it.name} (₹{it.sale_price})</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input 
                                type="number" 
                                step="any"
                                min="1"
                                required
                                className="form-input"
                                value={row.quantity}
                                onChange={(e) => handleLineChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                step="any"
                                required
                                className="form-input"
                                value={row.sale_price}
                                onChange={(e) => handleLineChange(idx, 'sale_price', parseFloat(e.target.value) || 0)}
                              />
                            </td>
                            <td>
                              <select 
                                className="form-select"
                                value={row.gst_rate}
                                onChange={(e) => handleLineChange(idx, 'gst_rate', parseFloat(e.target.value) || 0)}
                              >
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                              </select>
                            </td>
                            <td>
                              <button 
                                type="button" 
                                className="btn btn-danger btn-sm"
                                onClick={() => removeLine(idx)}
                                disabled={lineItems.length === 1}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button type="button" className="btn btn-secondary btn-sm" onClick={addLine} style={{ marginTop: 10 }}>
                    <Plus size={14} /> + Add Line Item
                  </button>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    ℹ️ Inventory will remain untouched until you click "Convert to Tax Invoice".
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Estimated Grand Total: </span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34D399', marginLeft: 8 }}>
                      ₹ {Math.round(grandTotal).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Estimate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
