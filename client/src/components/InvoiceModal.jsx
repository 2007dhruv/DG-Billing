import React, { useState, useEffect } from 'react';
import { Printer, Share2, X, Download, FileText, CheckCircle } from 'lucide-react';

export function InvoiceModal({ invoiceId, onClose }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printFormat, setPrintFormat] = useState('A4'); // 'A4' or 'THERMAL'

  useEffect(() => {
    if (!invoiceId) return;
    const fetchInv = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/invoices/${invoiceId}`);
        const data = await res.json();
        setInvoice(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInv();
  }, [invoiceId]);

  // Set document title dynamically to "[CustomerName]_[InvoiceDate]" so that when saving/downloading as PDF,
  // the browser automatically names the file "[CustomerName]_[InvoiceDate].pdf" instead of a static generic name.
  useEffect(() => {
    if (invoice) {
      const cleanCustomer = (invoice.customer_name || 'Customer').trim().replace(/[\s/\\?%*:|"<>]+/g, '_');
      const cleanDate = (invoice.invoice_date || new Date().toISOString().split('T')[0]).trim();
      const prevTitle = document.title;
      document.title = `${cleanCustomer}_${cleanDate}`;
      return () => {
        document.title = prevTitle;
      };
    }
  }, [invoice]);

  if (!invoiceId) return null;

  const handlePrint = () => {
    const cleanCustomer = (invoice?.customer_name || 'Customer').trim().replace(/[\s/\\?%*:|"<>]+/g, '_');
    const cleanDate = (invoice?.invoice_date || new Date().toISOString().split('T')[0]).trim();
    const prevTitle = document.title;

    document.title = `${cleanCustomer}_${cleanDate}`;
    window.print();

    setTimeout(() => {
      document.title = prevTitle;
    }, 2500);
  };

  const handleWhatsAppShare = () => {
    if (!invoice) return;
    const phone = (invoice.customer_phone || '').replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Hello ${invoice.customer_name},\n\nHere is your Tax Invoice #${invoice.invoice_number} from ${invoice.business?.business_name || 'Shree Ganesh Enterprises'}.\n\nInvoice Date: ${invoice.invoice_date}\nGrand Total: Rs. ${invoice.grand_total}\nPayment Status: ${invoice.payment_status} (${invoice.payment_mode})\nBalance Due: Rs. ${invoice.balance_due}\n\nBank / UPI: ${invoice.business?.upi_id || ''}\n\nThank you for choosing us!`
    );
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog" style={{ maxWidth: printFormat === 'A4' ? 880 : 420 }}>
        {/* Modal Controls Header */}
        <div className="modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
              Tax Invoice #{invoice?.invoice_number || invoiceId}
            </h3>
            <div style={{ display: 'flex', gap: 6, background: 'rgba(0,0,0,0.3)', padding: 3, borderRadius: 6 }}>
              <button 
                className={`btn btn-sm ${printFormat === 'A4' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPrintFormat('A4')}
              >
                Standard A4
              </button>
              <button 
                className={`btn btn-sm ${printFormat === 'THERMAL' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPrintFormat('THERMAL')}
              >
                Thermal (3-inch POS)
              </button>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Modal Body / Printable Container */}
        <div className="modal-body" style={{ background: '#f8fafc', color: '#0f172a', padding: 0 }}>
          {loading || !invoice ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Generating invoice layout...</div>
          ) : printFormat === 'A4' ? (
            /* ======================================================= */
            /* STANDARD INDIAN GST TAX INVOICE (A4)                    */
            /* ======================================================= */
            <div className="print-container" style={{ background: '#ffffff', color: '#000', padding: 32, fontSize: '0.85rem' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: 16, marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', color: '#1e3a8a' }}>
                    {invoice.business?.business_name}
                  </h2>
                  <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: 4 }}>
                    {invoice.business?.address}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    GSTIN: <span style={{ fontFamily: 'monospace' }}>{invoice.business?.gstin}</span> | State: {invoice.business?.state} ({invoice.business?.state_code})
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                    Phone: {invoice.business?.phone} | Email: {invoice.business?.email}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#dc2626', letterSpacing: '0.05em' }}>
                    TAX INVOICE
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: 4 }}>
                    Invoice No: <span style={{ color: '#1d4ed8' }}>{invoice.invoice_number}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#475569' }}>Date: {invoice.invoice_date}</div>
                  <div style={{ fontSize: '0.85rem', color: '#475569' }}>Place of Supply: {invoice.place_of_supply}</div>
                </div>
              </div>

              {/* Bill To & Ship To */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #cbd5e1', padding: 12, marginBottom: 16, background: '#f8fafc' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Billed To:</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{invoice.customer_name}</div>
                  <div style={{ fontSize: '0.82rem' }}>Phone: {invoice.customer_phone || 'N/A'}</div>
                  {invoice.customer_gstin && (
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      GSTIN: <span style={{ fontFamily: 'monospace' }}>{invoice.customer_gstin}</span>
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Payment Terms:</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: invoice.payment_status === 'PAID' ? '#059669' : '#dc2626' }}>
                    Status: {invoice.payment_status}
                  </div>
                  <div style={{ fontSize: '0.82rem' }}>Mode: {invoice.payment_mode}</div>
                  {invoice.due_date && <div style={{ fontSize: '0.82rem' }}>Due Date: {invoice.due_date}</div>}
                </div>
              </div>

              {/* Items Table */}
              <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: 16 }}>
                <table style={{ width: '100%', minWidth: 540, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', textAlign: 'left', fontSize: '0.78rem' }}>
                      <th style={{ padding: '8px 10px' }}>#</th>
                      <th style={{ padding: '8px 10px' }}>Item Description</th>
                      <th style={{ padding: '8px 10px' }}>HSN/SAC</th>
                      <th style={{ padding: '8px 10px' }}>Qty</th>
                      <th style={{ padding: '8px 10px' }}>Rate (₹)</th>
                      <th style={{ padding: '8px 10px' }}>Taxable (₹)</th>
                      <th style={{ padding: '8px 10px' }}>GST %</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items?.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                        <td style={{ padding: '8px 10px' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ fontWeight: 700 }}>{it.item_name}</div>
                          {it.serial_barcode && (
                            <div style={{ fontSize: '0.74rem', color: '#1e40af', fontFamily: 'monospace', marginTop: 2, background: '#eff6ff', display: 'inline-block', padding: '1px 6px', borderRadius: 4, border: '1px solid #bfdbfe' }}>
                              Machine Series Number: {it.serial_barcode}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{it.hsn_sac || 'N/A'}</td>
                        <td style={{ padding: '8px 10px' }}>{it.quantity} {it.unit}</td>
                        <td style={{ padding: '8px 10px' }}>₹ {it.sale_price}</td>
                        <td style={{ padding: '8px 10px' }}>₹ {it.taxable_value.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px' }}>{it.gst_rate}%</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>
                          ₹ {Math.round(it.total_amount).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Tax Calculation Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 20 }}>
                {/* Bank Details & QR Info */}
                <div style={{ border: '1px solid #e2e8f0', padding: 12, borderRadius: 6, fontSize: '0.8rem' }}>
                  <div style={{ fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>Bank & Payment Details:</div>
                  <div>Bank Name: {invoice.business?.bank_name}</div>
                  <div>A/C Number: {invoice.business?.account_number}</div>
                  <div>IFSC Code: {invoice.business?.ifsc}</div>
                  <div style={{ fontWeight: 700, marginTop: 4, color: '#059669' }}>UPI ID: {invoice.business?.upi_id}</div>
                  <div style={{ marginTop: 8, fontSize: '0.72rem', color: '#64748b' }}>
                    {invoice.business?.terms_conditions}
                  </div>

                  {Array.isArray(invoice.payments) && invoice.payments.length > 0 && (
                    <div style={{ marginTop: 10, borderTop: '1px dashed #cbd5e1', paddingTop: 8 }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4, fontSize: '0.78rem' }}>
                        Payment Receipts / History:
                      </div>
                      {invoice.payments.map((p, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#334155', marginBottom: 2 }}>
                          <span>{p.payment_date} ({p.payment_mode}){p.reference_no ? ` • Ref: ${p.reference_no}` : ''}:</span>
                          <strong style={{ color: '#059669' }}>₹ {p.amount?.toLocaleString('en-IN')}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Calculation Summary */}
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: 12, borderRadius: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Total Taxable Amount:</span>
                    <span style={{ fontWeight: 600 }}>₹ {invoice.total_taxable?.toFixed(2)}</span>
                  </div>

                  {invoice.igst_total > 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Integrated GST (IGST):</span>
                      <span>₹ {invoice.igst_total?.toFixed(2)}</span>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>Central GST (CGST):</span>
                        <span>₹ {invoice.cgst_total?.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>State GST (SGST):</span>
                        <span>₹ {invoice.sgst_total?.toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  {invoice.discount_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#dc2626' }}>
                      <span>Discount:</span>
                      <span>-₹ {invoice.discount_amount?.toFixed(2)}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#64748b', fontSize: '0.75rem' }}>
                    <span>Round Off:</span>
                    <span>₹ {invoice.round_off}</span>
                  </div>

                  <div style={{ borderTop: '2px solid #000', paddingTop: 8, marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800 }}>
                    <span>Grand Total:</span>
                    <span style={{ color: '#1e3a8a' }}>₹ {invoice.grand_total?.toLocaleString('en-IN')}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.85rem' }}>
                    <span>Amount Paid:</span>
                    <span style={{ color: '#059669', fontWeight: 700 }}>₹ {invoice.paid_amount?.toLocaleString('en-IN')}</span>
                  </div>

                  {invoice.balance_due > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.85rem', color: '#dc2626', fontWeight: 800 }}>
                      <span>Balance Due:</span>
                      <span>₹ {invoice.balance_due?.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Signatory Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 20 }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  This is a computer-generated tax invoice.
                </div>
                <div style={{ textAlign: 'center', borderTop: '1px solid #000', width: 200, paddingTop: 6, fontSize: '0.8rem', fontWeight: 700 }}>
                  For {invoice.business?.business_name}<br />
                  <span style={{ fontSize: '0.72rem', fontWeight: 400 }}>(Authorized Signatory)</span>
                </div>
              </div>
            </div>
          ) : (
            /* ======================================================= */
            /* 3-INCH THERMAL POS RECEIPT FORMAT                       */
            /* ======================================================= */
            <div style={{ background: '#ffffff', color: '#000', padding: '16px 20px', fontFamily: 'monospace', fontSize: '0.8rem', maxWidth: 360, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: 10, marginBottom: 10 }}>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{invoice.business?.business_name}</div>
                <div>{invoice.business?.address}</div>
                <div>GSTIN: {invoice.business?.gstin}</div>
                <div>Tel: {invoice.business?.phone}</div>
              </div>

              <div style={{ borderBottom: '1px dashed #000', paddingBottom: 8, marginBottom: 8, fontSize: '0.75rem' }}>
                <div>Bill No: <strong>{invoice.invoice_number}</strong></div>
                <div>Date: {invoice.invoice_date}</div>
                <div>Customer: {invoice.customer_name}</div>
              </div>

              {/* Items */}
              <div style={{ borderBottom: '1px dashed #000', paddingBottom: 8, marginBottom: 8 }}>
                {invoice.items?.map((it, idx) => (
                  <div key={idx} style={{ marginBottom: 4 }}>
                    <div style={{ fontWeight: 700 }}>{it.item_name}</div>
                    {it.serial_barcode && (
                      <div style={{ fontSize: '0.7rem', color: '#334155', fontFamily: 'monospace' }}>
                        Series No: {it.serial_barcode}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span>{it.quantity} {it.unit} x ₹{it.sale_price}</span>
                      <span>₹ {Math.round(it.total_amount)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 8 }}>
                <span>TOTAL:</span>
                <span>₹ {invoice.grand_total?.toLocaleString('en-IN')}</span>
              </div>

              <div style={{ textAlign: 'center', fontSize: '0.75rem' }}>
                <div>Paid: ₹{invoice.paid_amount} ({invoice.payment_mode})</div>
                {invoice.balance_due > 0 && <div style={{ color: '#dc2626' }}>Due: ₹{invoice.balance_due}</div>}
                <div style={{ marginTop: 8 }}>*** THANK YOU! VISIT AGAIN ***</div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="modal-footer no-print">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-success" onClick={handleWhatsAppShare}>
            <Share2 size={16} /> Share on WhatsApp
          </button>
          <button className="btn btn-primary" onClick={handlePrint} title={`Will save PDF as: ${(invoice?.customer_name || 'Customer').trim().replace(/[\s/\\?%*:|"<>]+/g, '_')}_${(invoice?.invoice_date || '').trim()}.pdf`}>
            <Printer size={16} /> Print / Save as PDF
          </button>
        </div>
      </div>
    </div>
  );
}
