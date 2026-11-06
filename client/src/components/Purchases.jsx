import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Plus, Trash2, Search, 
  CheckCircle2, ArrowDownLeft, Building2 
} from 'lucide-react';

export function Purchases({ onRefreshDashboard }) {
  const [purchases, setPurchases] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form
  const [vendorId, setVendorId] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');

  const [lineItems, setLineItems] = useState([
    { item_id: '', item_name: '', hsn_sac: '', unit: 'Pcs', quantity: 10, purchase_price: 0, gst_rate: 18 }
  ]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [purRes, venRes, itRes] = await Promise.all([
        fetch('/api/purchases'),
        fetch('/api/parties?type=VENDOR'),
        fetch('/api/items')
      ]);
      const purs = await purRes.json();
      const vens = await venRes.json();
      const its = await itRes.json();
      setPurchases(Array.isArray(purs) ? purs : []);
      setVendorsList(Array.isArray(vens) ? vens : []);
      setItemsList(Array.isArray(its) ? its : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
        purchase_price: item.purchase_price || 0,
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
    setLineItems([...lineItems, { item_id: '', item_name: '', hsn_sac: '', unit: 'Pcs', quantity: 10, purchase_price: 0, gst_rate: 18 }]);
  };

  const removeLine = (idx) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  let grandTotal = 0;
  lineItems.forEach(it => {
    const taxable = (parseFloat(it.quantity) || 0) * (parseFloat(it.purchase_price) || 0);
    const gst = (taxable * (parseFloat(it.gst_rate) || 0)) / 100;
    grandTotal += taxable + gst;
  });

  const handleSavePurchase = async (e) => {
    e.preventDefault();
    const validItems = lineItems.filter(it => it.item_id && it.quantity > 0);
    if (validItems.length === 0) {
      alert('Please select at least one valid inventory item.');
      return;
    }

    try {
      const payload = {
        vendor_id: vendorId ? parseInt(vendorId) : null,
        bill_date: billDate,
        items: validItems,
        payment_mode: paymentMode,
        paid_amount: paidAmount === '' ? grandTotal : parseFloat(paidAmount),
        notes
      };

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchData();
        if (onRefreshDashboard) onRefreshDashboard();
        alert('✅ Purchase bill saved! Warehouse stock has been incremented successfully.');
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch (err) {
      alert('Failed to record purchase: ' + err.message);
    }
  };

  const handleDeletePurchase = async (pId, pNum) => {
    if (!confirm(`Are you sure you want to delete Purchase Bill #${pNum}?\n\nThis will REVERT the added stock and remove associated barcodes.`)) return;
    try {
      const res = await fetch(`/api/purchases/${pId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        fetchData();
        if (onRefreshDashboard) onRefreshDashboard();
      } else {
        alert(data.error || 'Failed to delete purchase.');
      }
    } catch (err) {
      alert('Error deleting purchase: ' + err.message);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>Purchase Bills & Stock In</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Record inventory inwards from suppliers. Automatically adds stock to warehouse.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> + Record Purchase (Stock In)
        </button>
      </div>

      {/* Table */}
      <div className="card-panel">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bill No</th>
                <th>Date</th>
                <th>Supplier / Vendor</th>
                <th>Taxable Amount</th>
                <th>Input GST (ITC)</th>
                <th>Grand Total</th>
                <th>Payment Status</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30 }}>Loading purchases...</td></tr>
              ) : purchases.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No purchase bills recorded yet.</td></tr>
              ) : (
                purchases.map(p => {
                  const totalTax = (p.cgst_total || 0) + (p.sgst_total || 0) + (p.igst_total || 0);

                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700, color: '#60A5FA' }}>{p.purchase_number}</td>
                      <td>{p.bill_date}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{p.vendor_name || 'Standard Supplier'}</div>
                        {p.vendor_phone && <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>{p.vendor_phone}</div>}
                      </td>
                      <td>₹ {p.total_taxable?.toLocaleString('en-IN')}</td>
                      <td style={{ color: '#34D399' }}>₹ {Math.round(totalTax).toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>
                        ₹ {p.grand_total?.toLocaleString('en-IN')}
                      </td>
                      <td>
                        <span className={`badge ${p.balance_due === 0 ? 'badge-success' : 'badge-warning'}`}>
                          {p.balance_due === 0 ? 'FULLY PAID' : `DUE: ₹${p.balance_due}`} ({p.payment_mode})
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          title="Delete purchase bill & revert stock"
                          onClick={() => handleDeletePurchase(p.id, p.purchase_number)}
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

      {/* MODAL: ADD PURCHASE BILL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 900 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>Record Purchase Bill (Stock In)</h3>
                <span style={{ fontSize: '0.8rem', color: '#34D399' }}>
                  📦 Entering this bill will instantly increase warehouse stock.
                </span>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSavePurchase}>
              <div className="modal-body">
                <div className="form-grid-3" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
                  <div className="form-group">
                    <label className="form-label">Vendor / Supplier</label>
                    <select 
                      className="form-select"
                      value={vendorId}
                      onChange={(e) => setVendorId(e.target.value)}
                    >
                      <option value="">-- Cash / Direct Vendor --</option>
                      {vendorsList.map(v => (
                        <option key={v.id} value={v.id}>{v.name} ({v.phone || v.state})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bill Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select 
                      className="form-select"
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                    >
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank / NEFT</option>
                      <option value="UPI">UPI</option>
                      <option value="CREDIT">Vendor Credit (Pay Later)</option>
                    </select>
                  </div>
                </div>

                {/* Items */}
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 10, color: '#fff' }}>Stock Inward Items</h4>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40%' }}>Item Name</th>
                          <th style={{ width: '18%' }}>Quantity (Stock In)</th>
                          <th style={{ width: '20%' }}>Unit Cost (₹)</th>
                          <th style={{ width: '14%' }}>GST Slab</th>
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
                                <option value="">-- Select Product Item --</option>
                                {itemsList.map(it => (
                                  <option key={it.id} value={it.id}>
                                    {it.name} (Current: {it.current_stock} {it.unit})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <input 
                                  type="number" 
                                  step="any"
                                  min="1"
                                  required
                                  className="form-input"
                                  value={row.quantity}
                                  onChange={(e) => handleLineChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                />
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.unit}</span>
                              </div>
                            </td>
                            <td>
                              <input 
                                type="number" 
                                step="any"
                                required
                                className="form-input"
                                value={row.purchase_price}
                                onChange={(e) => handleLineChange(idx, 'purchase_price', parseFloat(e.target.value) || 0)}
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
                    <Plus size={14} /> + Add Another Item
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8 }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Amount Paid to Vendor (₹): </span>
                    <input 
                      type="number" 
                      step="any"
                      style={{ width: 140, display: 'inline-block', marginLeft: 10 }}
                      className="form-input"
                      placeholder={`Full (₹${Math.round(grandTotal)})`}
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Bill Grand Total: </span>
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
                <button type="submit" className="btn btn-success">
                  <CheckCircle2 size={18} /> Confirm Stock-In & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
