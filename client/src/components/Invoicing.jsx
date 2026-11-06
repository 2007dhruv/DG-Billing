import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Trash2, Printer, Search, 
  AlertCircle, CheckCircle, ArrowRight, Share2,
  Barcode, Scan, CreditCard
} from 'lucide-react';

const INDIAN_STATES = [
  { name: 'Gujarat', code: '24' },
  { name: 'Maharashtra', code: '27' },
  { name: 'Rajasthan', code: '08' },
  { name: 'Madhya Pradesh', code: '23' },
  { name: 'Delhi', code: '07' },
  { name: 'Karnataka', code: '29' },
  { name: 'Tamil Nadu', code: '33' },
  { name: 'Telangana', code: '36' },
  { name: 'Uttar Pradesh', code: '09' },
  { name: 'Punjab', code: '03' },
  { name: 'Haryana', code: '06' },
  { name: 'Andhra Pradesh', code: '37' },
  { name: 'Bihar', code: '10' },
  { name: 'West Bengal', code: '19' },
  { name: 'Kerala', code: '32' },
  { name: 'Odisha', code: '21' },
  { name: 'Assam', code: '18' },
  { name: 'Chhattisgarh', code: '22' },
  { name: 'Jharkhand', code: '20' },
  { name: 'Uttarakhand', code: '05' },
  { name: 'Himachal Pradesh', code: '02' },
  { name: 'Goa', code: '30' },
  { name: 'Jammu & Kashmir', code: '01' }
];

const toCodeStr = (b) => {
  if (!b) return '';
  if (typeof b === 'string') return b.trim();
  if (typeof b === 'object') return (b.barcode || b.code || '').trim();
  return String(b).trim();
};

export function Invoicing({ onViewInvoice, onRefreshDashboard, businessProfile }) {
  const [invoices, setInvoices] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [partiesList, setPartiesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Business Profile & Operating Home State
  const homeState = businessProfile?.state?.trim() || 'Gujarat';

  // Barcode Scanner in Invoicing
  const [quickBarcode, setQuickBarcode] = useState('');
  const [barcodeScanMsg, setBarcodeScanMsg] = useState(null);

  // Invoice Form State
  const [customerType, setCustomerType] = useState('WALK_IN'); // 'PARTY' or 'WALK_IN'
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState(homeState);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [paidAmount, setPaidAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState('Thank you for your business!');

  // Sync place of supply when business home state changes
  useEffect(() => {
    if (homeState) {
      setPlaceOfSupply(homeState);
    }
  }, [homeState]);

  // Record Payment / Settle Balance Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    payment_mode: 'CASH',
    payment_date: new Date().toISOString().split('T')[0],
    reference_no: '',
    notes: ''
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const handleOpenPaymentModal = (inv) => {
    setSelectedInvoiceForPayment(inv);
    setPaymentFormData({
      amount: inv.balance_due || '',
      payment_mode: 'CASH',
      payment_date: new Date().toISOString().split('T')[0],
      reference_no: '',
      notes: `Settlement for ${inv.invoice_number}`
    });
    setShowPaymentModal(true);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment) return;
    setPaymentSubmitting(true);
    try {
      const res = await fetch(`/api/invoices/${selectedInvoiceForPayment.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentFormData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');
      
      await fetchInvoices();
      if (onRefreshDashboard) onRefreshDashboard();
      setShowPaymentModal(false);
      setSelectedInvoiceForPayment(null);
      alert(data.message || 'Payment recorded successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Line items
  const [lineItems, setLineItems] = useState([
    { item_id: '', item_name: '', hsn_sac: '', unit: 'Pcs', quantity: 1, sale_price: 0, gst_rate: 18, discount_percent: 0, available_stock: 0, serial_barcode: '', available_barcodes: [] }
  ]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/invoices');
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [itRes, ptRes] = await Promise.all([
        fetch('/api/items'),
        fetch('/api/parties?type=CUSTOMER')
      ]);
      const items = await itRes.json();
      const parties = await ptRes.json();
      setItemsList(Array.isArray(items) ? items : []);
      setPartiesList(Array.isArray(parties) ? parties : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchDependencies();
  }, []);

  const handleSelectCustomer = (partyId) => {
    setSelectedCustomerId(partyId);
    if (!partyId) {
      setCustomerType('WALK_IN');
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setCustomerGstin('');
      setPlaceOfSupply(homeState);
      return;
    }
    const party = partiesList.find(p => p.id === parseInt(partyId));
    if (party) {
      setCustomerType('PARTY');
      setCustomerName(party.name);
      setCustomerPhone(party.phone || '');
      setCustomerGstin(party.gstin || '');
      setPlaceOfSupply(party.state?.trim() || homeState);
    }
  };

  const handleItemSelect = (index, itemId) => {
    const item = itemsList.find(i => i.id === parseInt(itemId));
    const updated = [...lineItems];
    if (item) {
      const rawBcs = item.available_barcodes || [];
      const normalizedBcs = rawBcs.map(toCodeStr).filter(Boolean);

      // Exclude barcodes already picked in other line items
      const selectedInOtherRows = lineItems
        .filter((_, i) => i !== index)
        .map(r => toCodeStr(r.serial_barcode))
        .filter(Boolean);
      const avail = normalizedBcs.filter(bc => !selectedInOtherRows.includes(bc));

      updated[index] = {
        ...updated[index],
        item_id: item.id,
        item_name: item.name,
        hsn_sac: item.hsn_sac || '',
        unit: item.unit || 'Pcs',
        sale_price: item.sale_price || 0,
        gst_rate: item.gst_rate || 18,
        available_stock: item.current_stock || 0,
        available_barcodes: normalizedBcs,
        serial_barcode: (avail.length === 1 ? avail[0] : '')
      };
    } else {
      updated[index] = {
        item_id: '', item_name: '', hsn_sac: '', unit: 'Pcs', quantity: 1, sale_price: 0, gst_rate: 18, discount_percent: 0, available_stock: 0, serial_barcode: '', available_barcodes: []
      };
    }
    setLineItems(updated);
  };

  const handleScanBarcode = async (e) => {
    if (e) e.preventDefault();
    const code = quickBarcode.trim();
    if (!code) return;

    try {
      setBarcodeScanMsg({ type: 'loading', text: `Scanning series number "${code}"...` });
      const res = await fetch(`/api/barcodes/lookup?barcode=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok || !data.found || !data.item) {
        setBarcodeScanMsg({ type: 'error', text: data.error || `Series number "${code}" not found in stock catalog.` });
        return;
      }

      const it = data.item;
      const scannedCode = toCodeStr(data.barcode) || code;

      // Check if this series number is already added in the invoice
      if (data.is_serialized) {
        const alreadyInList = lineItems.some(row => toCodeStr(row.serial_barcode) === scannedCode);
        if (alreadyInList) {
          setBarcodeScanMsg({ type: 'error', text: `Machine Series Number "${scannedCode}" is already added to this invoice!` });
          return;
        }
      }

      // Look up item in itemsList to get its full barcodes array
      const fullItem = itemsList.find(i => i.id === it.id);
      const rawBcs = fullItem?.available_barcodes || [];
      const availableBcs = rawBcs.map(toCodeStr).filter(Boolean);
      if (data.is_serialized && !availableBcs.includes(scannedCode)) {
        availableBcs.push(scannedCode);
      }

      const newLine = {
        item_id: it.id,
        item_name: it.name,
        hsn_sac: it.hsn_sac || '',
        unit: it.unit || 'Pcs',
        quantity: 1,
        sale_price: it.sale_price || 0,
        gst_rate: it.gst_rate || 18,
        discount_percent: 0,
        available_stock: it.current_stock || 0,
        serial_barcode: data.is_serialized ? scannedCode : '',
        available_barcodes: availableBcs
      };

      const emptyIndex = lineItems.findIndex(row => !row.item_id);
      if (emptyIndex !== -1) {
        const updated = [...lineItems];
        updated[emptyIndex] = newLine;
        setLineItems(updated);
      } else {
        setLineItems([...lineItems, newLine]);
      }

      setQuickBarcode('');
      setBarcodeScanMsg({ 
        type: 'success', 
        text: `✅ Added: "${it.name}" ${data.is_serialized ? `[Machine Series No: ${scannedCode}]` : ''}` 
      });
      setTimeout(() => setBarcodeScanMsg(null), 4000);
    } catch (err) {
      setBarcodeScanMsg({ type: 'error', text: 'Scan error: ' + err.message });
    }
  };

  const handleLineChange = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { item_id: '', item_name: '', hsn_sac: '', unit: 'Pcs', quantity: 1, sale_price: 0, gst_rate: 18, discount_percent: 0, available_stock: 0, serial_barcode: '', available_barcodes: [] }
    ]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Live Invoice Totals Calculation (Intra-State if Place of Supply == Home State)
  const isInterState = placeOfSupply && homeState 
    ? placeOfSupply.trim().toLowerCase() !== homeState.trim().toLowerCase()
    : false;

  let totalTaxable = 0;
  let totalGst = 0;

  lineItems.forEach(it => {
    const qty = parseFloat(it.quantity) || 0;
    const rate = parseFloat(it.sale_price) || 0;
    const disc = parseFloat(it.discount_percent) || 0;
    const gstRate = parseFloat(it.gst_rate) || 0;

    const baseAmount = qty * rate;
    const discAmount = (baseAmount * disc) / 100;
    const taxable = baseAmount - discAmount;
    const gst = (taxable * gstRate) / 100;

    totalTaxable += taxable;
    totalGst += gst;
  });

  const subTotal = totalTaxable + totalGst;
  const overallDisc = parseFloat(discountAmount) || 0;
  const netAmount = Math.max(0, subTotal - overallDisc);
  const roundedGrandTotal = Math.round(netAmount);
  const roundOff = +(roundedGrandTotal - netAmount).toFixed(2);

  const handleCreateInvoice = async (e) => {
    e.preventDefault();

    // Validate items
    const validItems = lineItems.filter(it => it.item_id && it.quantity > 0);
    if (validItems.length === 0) {
      alert('Please add at least one valid product item.');
      return;
    }

    try {
      const payload = {
        customer_id: customerType === 'PARTY' ? parseInt(selectedCustomerId) : null,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_gstin: customerGstin,
        place_of_supply: placeOfSupply,
        invoice_date: invoiceDate,
        items: validItems.map(it => ({
          ...it,
          serial_barcode: toCodeStr(it.serial_barcode) || null
        })),
        discount_amount: overallDisc,
        payment_mode: paymentMode,
        paid_amount: paidAmount === '' ? roundedGrandTotal : parseFloat(paidAmount),
        notes
      };

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setShowCreateModal(false);
        fetchInvoices();
        fetchDependencies(); // refresh stock numbers
        if (onRefreshDashboard) onRefreshDashboard();
        // Immediately open the invoice for printing
        if (onViewInvoice) onViewInvoice(data.id);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Failed to generate invoice: ' + err.message);
    }
  };

  const handleCancelInvoice = async (id, num) => {
    if (!confirm(`Are you sure you want to cancel Invoice #${num}? This will automatically RESTORE all items back into warehouse stock.`)) return;

    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchInvoices();
        fetchDependencies();
        if (onRefreshDashboard) onRefreshDashboard();
      }
    } catch (err) {
      alert('Error cancelling invoice: ' + err.message);
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>Sales Invoices & Stock Out</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            GST-compliant invoicing with automatic real-time inventory deduction & tax calculations
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => {
            setLineItems([{ item_id: '', item_name: '', hsn_sac: '', unit: 'Pcs', quantity: 1, sale_price: 0, gst_rate: 18, discount_percent: 0, available_stock: 0 }]);
            setShowCreateModal(true);
          }}
        >
          <Plus size={18} /> + Create New GST Invoice
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-panel" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-input" 
              style={{ paddingLeft: 38 }}
              placeholder="Search by Invoice Number or Customer Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="card-panel">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Date</th>
                <th>Customer Name</th>
                <th>State (Supply)</th>
                <th>Taxable Value</th>
                <th>GST (CGST/SGST/IGST)</th>
                <th>Grand Total</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 30 }}>Loading sales invoices...</td></tr>
              ) : filteredInvoices.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No invoices found.</td></tr>
              ) : (
                filteredInvoices.map(inv => {
                  const totalTax = (inv.cgst_total || 0) + (inv.sgst_total || 0) + (inv.igst_total || 0);

                  return (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 700, color: '#60A5FA' }}>{inv.invoice_number}</td>
                      <td>{inv.invoice_date}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{inv.customer_name}</div>
                        {inv.customer_gstin && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>GSTIN: {inv.customer_gstin}</div>
                        )}
                      </td>
                      <td><span className="badge badge-primary">{inv.place_of_supply}</span></td>
                      <td>₹ {inv.total_taxable?.toLocaleString('en-IN')}</td>
                      <td style={{ color: 'var(--text-muted)' }}>₹ {Math.round(totalTax).toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 800, color: '#34D399', fontSize: '1rem' }}>
                        ₹ {inv.grand_total?.toLocaleString('en-IN')}
                      </td>
                      <td>
                        <span className={`badge ${
                          inv.payment_status === 'PAID' ? 'badge-success' : 
                          inv.payment_status === 'PARTIAL' ? 'badge-warning' : 'badge-danger'
                        }`}>
                          {inv.payment_status} ({inv.payment_mode})
                        </span>
                        {inv.balance_due > 0 && (
                          <div style={{ fontSize: '0.72rem', color: '#F87171', marginTop: 2 }}>
                            Due: ₹{inv.balance_due}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {inv.balance_due > 0 && (
                            <button 
                              className="btn btn-warning btn-sm"
                              style={{ background: '#F59E0B', color: '#000', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                              title="Collect Due Payment / Settle Balance"
                              onClick={() => handleOpenPaymentModal(inv)}
                            >
                              <CreditCard size={14} /> Settle ₹{inv.balance_due}
                            </button>
                          )}
                          <button 
                            className="btn btn-primary btn-sm"
                            title="View & Print Invoice"
                            onClick={() => onViewInvoice(inv.id)}
                          >
                            <Printer size={14} /> View
                          </button>
                          <button 
                            className="btn btn-danger btn-sm"
                            title="Cancel Invoice & Restore Stock"
                            onClick={() => handleCancelInvoice(inv.id, inv.invoice_number)}
                          >
                            <Trash2 size={14} />
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

      {/* MODAL: CREATE GST INVOICE */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 980 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>New GST Tax Invoice</h3>
                <span style={{ fontSize: '0.8rem', color: '#60A5FA' }}>
                  ⚡ Live Stock Sync: Saving this bill will automatically deduct warehouse stock.
                </span>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreateInvoice}>
              <div className="modal-body">
                {/* Customer Details Row */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label className="form-label">Select Customer / Party</label>
                      <select 
                        className="form-select"
                        value={selectedCustomerId}
                        onChange={(e) => handleSelectCustomer(e.target.value)}
                      >
                        <option value="">-- Quick Walk-in Customer --</option>
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
                      <label className="form-label">Phone Number</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="+91..."
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Invoice Date</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 10 }}>
                    <div className="form-group">
                      <label className="form-label">Customer GSTIN (Optional)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. 27AABCS1429B1Z4"
                        value={customerGstin}
                        onChange={(e) => setCustomerGstin(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Place of Supply (State) *</label>
                      <select 
                        className="form-select"
                        value={placeOfSupply}
                        onChange={(e) => setPlaceOfSupply(e.target.value)}
                      >
                        {INDIAN_STATES.map(s => {
                          const isHome = s.name.trim().toLowerCase() === homeState.trim().toLowerCase();
                          return (
                            <option key={s.name} value={s.name}>
                              {s.name} ({s.code}) — {isHome ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Products / Items Table */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Items & Inventory Deduction</h4>
                    <span className="badge badge-primary">
                      Tax Rule: {isInterState ? `IGST (Inter-State: ${placeOfSupply} outside ${homeState})` : `CGST (50%) + SGST (50%) (Intra-State: within ${homeState})`}
                    </span>
                  </div>

                  {/* Quick Barcode Scanner Bar */}
                  <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                    <div className="scanner-bar-row" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <Scan size={18} style={{ color: '#60A5FA' }} />
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Scan or type Machine Series Number (e.g. ROTA-SN-001) and hit Enter..."
                        value={quickBarcode}
                        onChange={(e) => setQuickBarcode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleScanBarcode();
                          }
                        }}
                        style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.88rem', background: 'rgba(0,0,0,0.3)' }}
                      />
                      <button type="button" onClick={handleScanBarcode} className="btn btn-primary scanner-btn" style={{ whiteSpace: 'nowrap' }}>
                        <Barcode size={15} /> Add Series Unit
                      </button>
                    </div>
                    {barcodeScanMsg && (
                      <div style={{ 
                        marginTop: 6, 
                        fontSize: '0.8rem', 
                        fontWeight: 600,
                        color: barcodeScanMsg.type === 'error' ? '#F87171' : barcodeScanMsg.type === 'success' ? '#34D399' : '#60A5FA' 
                      }}>
                        {barcodeScanMsg.text}
                      </div>
                    )}
                  </div>

                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '32%' }}>Item Name & Stock</th>
                          <th style={{ width: '10%' }}>HSN</th>
                          <th style={{ width: '12%' }}>Quantity</th>
                          <th style={{ width: '14%' }}>Sale Rate (₹)</th>
                          <th style={{ width: '10%' }}>GST %</th>
                          <th style={{ width: '14%' }}>Total (₹)</th>
                          <th style={{ width: '8%' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((row, idx) => {
                          const isLowStock = row.item_id && row.quantity > row.available_stock;
                          const lineTaxable = (row.quantity * row.sale_price) * (1 - (row.discount_percent || 0) / 100);
                          const lineTotal = lineTaxable * (1 + (row.gst_rate || 0) / 100);

                          return (
                            <tr key={idx}>
                              <td>
                                <select 
                                  className="form-select"
                                  value={row.item_id}
                                  onChange={(e) => handleItemSelect(idx, e.target.value)}
                                  required
                                >
                                  <option value="">-- Choose Item from Stock --</option>
                                  {itemsList.map(it => (
                                    <option key={it.id} value={it.id}>
                                      {it.name} (Stock: {it.current_stock} {it.unit}) - ₹{it.sale_price}
                                    </option>
                                  ))}
                                </select>
                                {row.item_id && (
                                  <div>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                      <span style={{ fontSize: '0.72rem', color: isLowStock ? '#F87171' : '#34D399', fontWeight: 700 }}>
                                        Warehouse Stock: {row.available_stock} {row.unit}
                                      </span>
                                      {isLowStock && (
                                        <span style={{ fontSize: '0.72rem', color: '#F87171' }}>
                                          ⚠️ Exceeds current stock!
                                        </span>
                                      )}
                                    </div>

                                    {/* Machine Series Number Selector */}
                                    {(row.available_barcodes?.length > 0 || row.serial_barcode) && (
                                      <div style={{ marginTop: 6, background: 'rgba(0,0,0,0.25)', padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <div style={{ fontSize: '0.72rem', color: '#93C5FD', fontWeight: 700, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                                          <Barcode size={12} /> Machine Series Number:
                                        </div>
                                        <select
                                          className="form-select"
                                          style={{ fontSize: '0.78rem', padding: '3px 6px', borderColor: row.serial_barcode ? '#10B981' : '#F59E0B' }}
                                          value={toCodeStr(row.serial_barcode)}
                                          onChange={(e) => handleLineChange(idx, 'serial_barcode', e.target.value)}
                                        >
                                          <option value="">-- Choose Machine Series Number --</option>
                                          {row.available_barcodes?.map((bc, bIdx) => {
                                            const code = toCodeStr(bc);
                                            if (!code) return null;
                                            return (
                                              <option key={`${code}-${bIdx}`} value={code}>
                                                Series No: {code} (In Stock)
                                              </option>
                                            );
                                          })}
                                          {row.serial_barcode && !row.available_barcodes?.map(toCodeStr).includes(toCodeStr(row.serial_barcode)) && (
                                            <option key={`selected-${toCodeStr(row.serial_barcode)}`} value={toCodeStr(row.serial_barcode)}>
                                              Series No: {toCodeStr(row.serial_barcode)} (Selected)
                                            </option>
                                          )}
                                        </select>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td>
                                <input 
                                  type="text" 
                                  className="form-input" 
                                  value={row.hsn_sac} 
                                  readOnly 
                                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }} 
                                />
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
                              <td style={{ fontWeight: 700, color: '#fff' }}>
                                ₹ {Math.round(lineTotal).toLocaleString('en-IN')}
                              </td>
                              <td>
                                <button 
                                  type="button" 
                                  className="btn btn-danger btn-sm"
                                  onClick={() => removeLineItem(idx)}
                                  disabled={lineItems.length === 1}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <button type="button" className="btn btn-secondary btn-sm" onClick={addLineItem} style={{ marginTop: 10 }}>
                    <Plus size={14} /> + Add Another Item
                  </button>
                </div>

                {/* Billing Summary Box */}
                <div className="billing-summary-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, background: 'rgba(0,0,0,0.25)', padding: 20, borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div className="form-group">
                      <label className="form-label">Payment Mode</label>
                      <select 
                        className="form-select"
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                      >
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI / QR Code</option>
                        <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="CREDIT">Credit (Udhar)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Customer Paid Amount (₹)</label>
                      <input 
                        type="number" 
                        step="any"
                        className="form-input"
                        placeholder={`Leave empty for full payment (₹${roundedGrandTotal})`}
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Invoice Notes</label>
                      <input 
                        type="text" 
                        className="form-input"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="billing-summary-tax-col" style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>Taxable Value:</span>
                      <span>₹ {totalTaxable.toFixed(2)}</span>
                    </div>

                    {isInterState ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                        <span>IGST Tax:</span>
                        <span>₹ {totalGst.toFixed(2)}</span>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                          <span>CGST Tax:</span>
                          <span>₹ {(totalGst / 2).toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                          <span>SGST Tax:</span>
                          <span>₹ {(totalGst / 2).toFixed(2)}</span>
                        </div>
                      </>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Special Discount (₹):</span>
                      <input 
                        type="number" 
                        step="any" 
                        style={{ width: 100, textAlign: 'right' }} 
                        className="form-input" 
                        value={discountAmount} 
                        onChange={(e) => setDiscountAmount(e.target.value)} 
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-faint)', fontSize: '0.8rem' }}>
                      <span>Round Off:</span>
                      <span>₹ {roundOff}</span>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-highlight)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>Grand Total:</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34D399' }}>
                        ₹ {roundedGrandTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" style={{ padding: '10px 24px' }}>
                  <CheckCircle size={18} /> Save Invoice & Deduct Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COLLECT PAYMENT / SETTLE BALANCE */}
      {showPaymentModal && selectedInvoiceForPayment && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                  Record Payment / Settle Balance
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#60A5FA' }}>
                  Invoice #{selectedInvoiceForPayment.invoice_number} • {selectedInvoiceForPayment.customer_name}
                </span>
              </div>
              <button 
                onClick={() => setShowPaymentModal(false)} 
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
              >✕</button>
            </div>

            <form onSubmit={handleSubmitPayment}>
              <div className="modal-body">
                {/* Summary banner */}
                <div style={{ 
                  background: 'rgba(96, 165, 250, 0.1)', 
                  border: '1px solid rgba(96, 165, 250, 0.3)', 
                  padding: '14px 18px', 
                  borderRadius: 10, 
                  marginBottom: 18,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 12,
                  textAlign: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Invoice</div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>
                      ₹ {selectedInvoiceForPayment.grand_total?.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Already Paid</div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#34D399' }}>
                      ₹ {selectedInvoiceForPayment.paid_amount?.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Balance Due (Udhar)</div>
                    <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#F87171' }}>
                      ₹ {selectedInvoiceForPayment.balance_due?.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Payment Amount Received Now (₹) *
                  </label>
                  <input 
                    type="number" 
                    step="any" 
                    min="1" 
                    max={selectedInvoiceForPayment.balance_due}
                    required 
                    className="form-input"
                    style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34D399' }}
                    value={paymentFormData.amount}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                    placeholder={`Enter amount up to ₹${selectedInvoiceForPayment.balance_due}`}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    💡 When the customer pays the full remaining balance (₹{selectedInvoiceForPayment.balance_due}), this invoice will be marked 100% PAID and their customer Udhar balance will automatically clear to ₹0!
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
                      <option value="UPI">UPI / QR Code (GPay, PhonePe, Paytm)</option>
                      <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
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
                  <label className="form-label">Reference / UTR / Cheque No. (Optional)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. UPI Ref / Cheque #502148"
                    value={paymentFormData.reference_no}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, reference_no: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes / Remarks (Optional)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Partial recovery from customer"
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
                  {paymentSubmitting ? 'Recording...' : `Confirm & Record ₹${parseFloat(paymentFormData.amount || 0).toLocaleString('en-IN')}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
