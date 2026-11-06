import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Search, Filter, AlertTriangle, 
  History, ArrowUp, ArrowDown, SlidersHorizontal, CheckCircle2,
  Barcode, Tag, Trash2
} from 'lucide-react';

export function Inventory({ onRefreshDashboard }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showBarcodesModal, setShowBarcodesModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemHistory, setItemHistory] = useState([]);
  const [itemBarcodesList, setItemBarcodesList] = useState([]);
  const [newBarcodeCode, setNewBarcodeCode] = useState('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);

  // Form states
  const [newItem, setNewItem] = useState({
    name: '', sku: '', barcode: '', hsn_sac: '', category: 'General',
    unit: 'Pcs', purchase_price: 0, sale_price: 0, mrp: 0,
    gst_rate: 18, opening_stock: 0, min_stock_alert: 5,
    initial_barcodes: ''
  });

  const [adjustData, setAdjustData] = useState({
    adjustment_type: 'ADD',
    quantity: 1,
    reason: 'Stock Audit / Count Correction'
  });

  const fetchItems = async () => {
    try {
      setLoading(true);
      let url = '/api/items?';
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
      if (categoryFilter !== 'All') url += `category=${encodeURIComponent(categoryFilter)}&`;
      if (onlyLowStock) url += `low_stock=true&`;

      const res = await fetch(url);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [searchTerm, categoryFilter, onlyLowStock]);

  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      const barcodesArray = newItem.initial_barcodes
        ? newItem.initial_barcodes.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
        : [];

      const parsedOpeningStock = parseFloat(newItem.opening_stock) || 0;
      const finalOpeningStock = barcodesArray.length > 0 ? Math.max(parsedOpeningStock, barcodesArray.length) : parsedOpeningStock;

      const payload = {
        ...newItem,
        opening_stock: finalOpeningStock,
        initial_barcodes: barcodesArray
      };

      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewItem({
          name: '', sku: '', barcode: '', hsn_sac: '', category: 'General',
          unit: 'Pcs', purchase_price: 0, sale_price: 0, mrp: 0,
          gst_rate: 18, opening_stock: 0, min_stock_alert: 5,
          initial_barcodes: ''
        });
        fetchItems();
        if (onRefreshDashboard) onRefreshDashboard();
      } else {
        const err = await res.json();
        alert('Error saving item: ' + (err.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error saving item: ' + err.message);
    }
  };

  const handleOpenBarcodes = async (item) => {
    setSelectedItem(item);
    setShowBarcodesModal(true);
    setNewBarcodeCode('');
    fetchBarcodes(item.id);
  };

  const fetchBarcodes = async (itemId) => {
    try {
      setBarcodeLoading(true);
      const res = await fetch(`/api/items/${itemId}/barcodes`);
      const data = await res.json();
      setItemBarcodesList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setBarcodeLoading(false);
    }
  };

  const handleAddBarcode = async (e) => {
    e.preventDefault();
    if (!newBarcodeCode.trim() || !selectedItem) return;
    try {
      const res = await fetch(`/api/items/${selectedItem.id}/barcodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: newBarcodeCode.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setNewBarcodeCode('');
        fetchBarcodes(selectedItem.id);
        fetchItems();
        if (onRefreshDashboard) onRefreshDashboard();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Failed to add barcode: ' + err.message);
    }
  };

  const handleDeleteBarcode = async (barcodeId, code) => {
    if (!confirm(`Are you sure you want to remove machine barcode "${code}" from warehouse stock?`)) return;
    try {
      const res = await fetch(`/api/items/${selectedItem.id}/barcodes/${barcodeId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchBarcodes(selectedItem.id);
        fetchItems();
        if (onRefreshDashboard) onRefreshDashboard();
      } else {
        const data = await res.json();
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Failed to remove barcode: ' + err.message);
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      const res = await fetch(`/api/items/${selectedItem.id}/adjust-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adjustData)
      });
      if (res.ok) {
        setShowAdjustModal(false);
        fetchItems();
        if (onRefreshDashboard) onRefreshDashboard();
      }
    } catch (err) {
      alert('Error adjusting stock: ' + err.message);
    }
  };

  const handleOpenHistory = async (item) => {
    setSelectedItem(item);
    setShowHistoryModal(true);
    try {
      const res = await fetch(`/api/items/${item.id}/history`);
      const data = await res.json();
      setItemHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  const categories = ['All', 'Electronics', 'Mobile Accessories', 'Computer Peripherals', 'Stationery', 'Security', 'General'];

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>Item Inventory & Warehouse Stock</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Real-time stock ledger, HSN codes, tax slabs, and automated reorder alerts
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> Add New Item
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-panel" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-input" 
              style={{ paddingLeft: 38 }}
              placeholder="Search by Item name, Barcode, SKU, or HSN code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ width: 200 }}>
            <select 
              className="form-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map(c => (
                <option key={c} value={c}>Category: {c}</option>
              ))}
            </select>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: onlyLowStock ? '#FBBF24' : 'var(--text-muted)' }}>
            <input 
              type="checkbox" 
              checked={onlyLowStock} 
              onChange={(e) => setOnlyLowStock(e.target.checked)} 
              style={{ width: 16, height: 16, accentColor: '#F59E0B' }}
            />
            Show Low Stock Only
          </label>
        </div>
      </div>

      {/* Items Table */}
      <div className="card-panel">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item & Details</th>
                <th>HSN / SKU</th>
                <th>Category</th>
                <th>Purchase Rate</th>
                <th>Sale Price</th>
                <th>GST Rate</th>
                <th>Current Stock</th>
                <th>Stock Value</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 30 }}>Loading stock catalog...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                    No items found matching criteria.
                  </td>
                </tr>
              ) : (
                items.map(item => {
                  const isLow = item.current_stock <= item.min_stock_alert;
                  const isOut = item.current_stock <= 0;
                  const stockValue = item.current_stock * item.purchase_price;

                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span>{item.name}</span>
                          {(item.available_barcodes?.length > 0 || (item.barcodes_count && item.barcodes_count > 0)) && (
                            <span 
                              className="badge" 
                              style={{ 
                                background: 'rgba(59, 130, 246, 0.2)', 
                                color: '#93C5FD', 
                                border: '1px solid rgba(59, 130, 246, 0.4)',
                                fontSize: '0.7rem',
                                padding: '2px 6px'
                              }}
                            >
                              <Barcode size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                              {item.available_barcodes?.length || item.barcodes_count || 0} Series Tracked
                            </span>
                          )}
                        </div>
                        {item.barcode && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                            SKU Barcode: {item.barcode}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                          HSN: {item.hsn_sac || 'N/A'}
                        </div>
                        {item.sku && <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>{item.sku}</div>}
                      </td>
                      <td><span className="badge badge-primary">{item.category}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>₹ {item.purchase_price}</td>
                      <td style={{ fontWeight: 700, color: '#60A5FA' }}>₹ {item.sale_price}</td>
                      <td><span className="badge" style={{ background: 'rgba(255,255,255,0.06)' }}>{item.gst_rate}%</span></td>
                      <td>
                        <span className={`badge ${isOut ? 'badge-danger' : isLow ? 'badge-warning' : 'badge-success'}`}>
                          {item.current_stock} {item.unit}
                        </span>
                        {isLow && !isOut && (
                          <div style={{ fontSize: '0.7rem', color: '#FBBF24', marginTop: 3 }}>
                            Reorder (Min: {item.min_stock_alert})
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>₹ {Math.round(stockValue).toLocaleString('en-IN')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            title="Manage Individual Machine Series Numbers"
                            onClick={() => handleOpenBarcodes(item)}
                            style={{ background: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)', color: '#93c5fd' }}
                          >
                            <Barcode size={14} /> Series Nos
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm"
                            title="Adjust Stock (+/-)"
                            onClick={() => {
                              setSelectedItem(item);
                              setShowAdjustModal(true);
                            }}
                          >
                            <SlidersHorizontal size={14} /> Adjust
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm"
                            title="View Stock Audit Trail"
                            onClick={() => handleOpenHistory(item)}
                          >
                            <History size={14} />
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

      {/* MODAL 1: ADD NEW ITEM */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add New Item to Inventory</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
              >✕</button>
            </div>
            <form onSubmit={handleSaveItem}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Item / Product Name *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      placeholder="e.g. Rotavator 6 Feet Heavy Duty"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">HSN / SAC Code</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={newItem.hsn_sac}
                      onChange={(e) => setNewItem({ ...newItem, hsn_sac: e.target.value })}
                      placeholder="e.g. 8432"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Item Short Code (SKU)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={newItem.sku}
                      onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                      placeholder="e.g. ROTA-6FT"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit of Measure</label>
                    <select 
                      className="form-select"
                      value={newItem.unit}
                      onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    >
                      <option value="Pcs">Pcs (Pieces)</option>
                      <option value="Box">Box</option>
                      <option value="Kg">Kg (Kilograms)</option>
                      <option value="Ltr">Ltr (Liters)</option>
                      <option value="Mtr">Mtr (Meters)</option>
                      <option value="Set">Set</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Purchase Price (₹)</label>
                    <input 
                      type="number" 
                      step="any"
                      className="form-input" 
                      value={newItem.purchase_price}
                      onChange={(e) => setNewItem({ ...newItem, purchase_price: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Selling Price (₹) *</label>
                    <input 
                      type="number" 
                      step="any"
                      required
                      className="form-input" 
                      value={newItem.sale_price}
                      onChange={(e) => setNewItem({ ...newItem, sale_price: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">MRP (₹)</label>
                    <input 
                      type="number" 
                      step="any"
                      className="form-input" 
                      value={newItem.mrp}
                      onChange={(e) => setNewItem({ ...newItem, mrp: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GST Tax Slab</label>
                    <select 
                      className="form-select"
                      value={newItem.gst_rate}
                      onChange={(e) => setNewItem({ ...newItem, gst_rate: e.target.value })}
                    >
                      <option value="0">0% (Exempted)</option>
                      <option value="5">5% GST</option>
                      <option value="12">12% GST</option>
                      <option value="18">18% GST (Standard)</option>
                      <option value="28">28% GST</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Opening Stock Quantity</label>
                    <input 
                      type="number" 
                      step="any"
                      className="form-input" 
                      value={newItem.opening_stock}
                      onChange={(e) => setNewItem({ ...newItem, opening_stock: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Low Stock Alert Level</label>
                    <input 
                      type="number" 
                      step="any"
                      className="form-input" 
                      value={newItem.min_stock_alert}
                      onChange={(e) => setNewItem({ ...newItem, min_stock_alert: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Package Barcode / EAN</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={newItem.barcode}
                      onChange={(e) => setNewItem({ ...newItem, barcode: e.target.value })}
                      placeholder="e.g. 8901234567890"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 14 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Barcode size={15} style={{ color: '#60A5FA' }} />
                    Machine Series Numbers (Optional - for Rotavator machines, motors, serialized equipment)
                  </label>
                  <textarea 
                    className="form-input" 
                    rows="3"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                    value={newItem.initial_barcodes}
                    onChange={(e) => setNewItem({ ...newItem, initial_barcodes: e.target.value })}
                    placeholder="Enter unique series numbers for each physical unit (one per line or comma-separated, e.g.&#10;ROTA-2024-001&#10;ROTA-2024-002&#10;ROTA-2024-003)"
                  />
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    💡 Each machine will be tracked individually with its own unique series number. When sold on an invoice, that specific machine's series number will be removed from available stock.
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Item & Add to Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADJUST STOCK */}
      {showAdjustModal && selectedItem && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                Adjust Stock: {selectedItem.name}
              </h3>
              <button onClick={() => setShowAdjustModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleAdjustStock}>
              <div className="modal-body">
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: 8, marginBottom: 16 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Current Warehouse Stock: </span>
                  <span style={{ fontWeight: 800, color: '#34D399', fontSize: '1.1rem' }}>
                    {selectedItem.current_stock} {selectedItem.unit}
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Action</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="adjType" 
                        value="ADD" 
                        checked={adjustData.adjustment_type === 'ADD'} 
                        onChange={() => setAdjustData({ ...adjustData, adjustment_type: 'ADD' })} 
                      />
                      <span style={{ color: '#34D399', fontWeight: 700 }}>+ Add Stock (Found / Returned)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="adjType" 
                        value="DEDUCT" 
                        checked={adjustData.adjustment_type === 'DEDUCT'} 
                        onChange={() => setAdjustData({ ...adjustData, adjustment_type: 'DEDUCT' })} 
                      />
                      <span style={{ color: '#F87171', fontWeight: 700 }}>- Deduct Stock (Damaged / Lost)</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity to Adjust ({selectedItem.unit})</label>
                  <input 
                    type="number" 
                    step="any" 
                    min="0.1" 
                    required 
                    className="form-input"
                    value={adjustData.quantity}
                    onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reason for Adjustment</label>
                  <select 
                    className="form-select"
                    value={adjustData.reason}
                    onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  >
                    <option value="Damaged Goods">Damaged Goods</option>
                    <option value="Expired / Obsolete">Expired / Obsolete</option>
                    <option value="Physical Audit / Stock Count Correction">Physical Audit / Stock Count Correction</option>
                    <option value="Lost / Missing Items">Lost / Missing Items</option>
                    <option value="Sample / Promotional Display">Sample / Promotional Display</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdjustModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: STOCK AUDIT TRAIL / HISTORY */}
      {showHistoryModal && selectedItem && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                Stock Movement Log: {selectedItem.name}
              </h3>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Qty Change</th>
                      <th>Balance Stock</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>No transaction logs recorded yet.</td>
                      </tr>
                    ) : (
                      itemHistory.map(tx => (
                        <tr key={tx.id}>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {new Date(tx.created_at).toLocaleString()}
                          </td>
                          <td>
                            <span className={`badge ${
                              tx.transaction_type === 'SALE' ? 'badge-danger' : 
                              tx.transaction_type === 'PURCHASE' ? 'badge-success' : 'badge-primary'
                            }`}>
                              {tx.transaction_type}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: tx.quantity_change > 0 ? '#34D399' : '#F87171' }}>
                            {tx.quantity_change > 0 ? `+${tx.quantity_change}` : tx.quantity_change} {selectedItem.unit}
                          </td>
                          <td style={{ fontWeight: 600 }}>{tx.remaining_stock} {selectedItem.unit}</td>
                          <td style={{ fontSize: '0.85rem' }}>{tx.reason}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowHistoryModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: MANAGE INDIVIDUAL MACHINE BARCODES / SERIAL NUMBERS */}
      {showBarcodesModal && selectedItem && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 750 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Barcode size={22} style={{ color: '#60A5FA' }} />
                  Machine Series Numbers Inventory
                </h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {selectedItem.name} {selectedItem.sku ? `(SKU: ${selectedItem.sku})` : ''} — Current Stock: <strong style={{ color: '#34D399' }}>{selectedItem.current_stock} {selectedItem.unit}</strong>
                </div>
              </div>
              <button onClick={() => setShowBarcodesModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="modal-body">
              {/* Add New Machine Series Number Form */}
              <div className="card-panel" style={{ padding: '14px 16px', marginBottom: 18, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 8, color: '#93C5FD' }}>
                  + Add Machine Series Number into Stock
                </div>
                <form onSubmit={handleAddBarcode} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    placeholder="Scan or enter machine series number (e.g. ROTA-9021)..." 
                    value={newBarcodeCode}
                    onChange={(e) => setNewBarcodeCode(e.target.value)}
                    style={{ flex: 1, fontFamily: 'var(--font-mono)' }}
                  />
                  <button type="submit" className="btn btn-primary">
                    <Plus size={16} /> Add to Stock
                  </button>
                </form>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-faint)', marginTop: 6 }}>
                  ⚡ Adding a new machine series number automatically increments this item's warehouse stock by +1.
                </div>
              </div>

              {/* Series Numbers list */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Registered Units ({itemBarcodesList.length} total: {itemBarcodesList.filter(b => b.status === 'AVAILABLE').length} Available in Stock, {itemBarcodesList.filter(b => b.status === 'SOLD').length} Sold)
                </span>
              </div>

              <div className="table-responsive" style={{ maxHeight: 340, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Series Number</th>
                      <th>Status</th>
                      <th>Sold In Invoice</th>
                      <th>Sold Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {barcodeLoading ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>Loading series numbers...</td></tr>
                    ) : itemBarcodesList.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: 25, color: 'var(--text-muted)' }}>
                          No individual machine series numbers registered yet. Add one above or during billing.
                        </td>
                      </tr>
                    ) : (
                      itemBarcodesList.map(bc => {
                        const isAvail = bc.status === 'AVAILABLE';
                        return (
                          <tr key={bc.id}>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>
                              {bc.barcode}
                            </td>
                            <td>
                              <span className={`badge ${isAvail ? 'badge-success' : 'badge-danger'}`}>
                                {bc.status}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.82rem', color: isAvail ? 'var(--text-muted)' : '#60A5FA', fontWeight: isAvail ? 400 : 700 }}>
                              {bc.invoice_number ? bc.invoice_number : isAvail ? '—' : `Invoice #${bc.invoice_id}`}
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {bc.sold_at ? new Date(bc.sold_at).toLocaleString() : '—'}
                            </td>
                            <td>
                              {isAvail ? (
                                <button 
                                  className="btn btn-danger btn-sm" 
                                  title="Remove from stock"
                                  onClick={() => handleDeleteBarcode(bc.id, bc.barcode)}
                                >
                                  <Trash2 size={13} />
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Sold Out</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowBarcodesModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
