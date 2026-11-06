import { createClient } from '@libsql/client';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localDbPath = path.join(__dirname, 'vyapar.db');

export const client = createClient({
  url: process.env.TURSO_DATABASE_URL || `file:${localDbPath}`,
  authToken: process.env.TURSO_AUTH_TOKEN
});

function sanitizeArgs(args) {
  const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  return flat.map(a => a === undefined ? null : a);
}

export const db = {
  prepare(sql) {
    return {
      async all(...args) {
        const flatArgs = sanitizeArgs(args);
        const res = await client.execute({ sql, args: flatArgs });
        return res.rows;
      },
      async get(...args) {
        const flatArgs = sanitizeArgs(args);
        const res = await client.execute({ sql, args: flatArgs });
        return res.rows[0];
      },
      async run(...args) {
        const flatArgs = sanitizeArgs(args);
        const res = await client.execute({ sql, args: flatArgs });
        return {
          lastInsertRowid: res.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : undefined,
          changes: res.rowsAffected
        };
      }
    };
  },
  async exec(sql) {
    const stmts = sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const s of stmts) {
      await client.execute(s);
    }
  }
};

export function hashPassword(password) {
  return crypto.createHash('sha256').update(password + '_vyapar_auth_salt_2026').digest('hex');
}

export function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

export async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_name TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      gstin TEXT,
      pan TEXT,
      state TEXT DEFAULT 'Gujarat',
      state_code TEXT DEFAULT '24',
      address TEXT,
      bank_name TEXT,
      account_number TEXT,
      ifsc TEXT,
      upi_id TEXT,
      terms_conditions TEXT DEFAULT '1. Goods once sold will not be taken back.\\n2. Subject to local jurisdiction only.',
      invoice_prefix TEXT DEFAULT 'INV-2026-',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      role TEXT DEFAULT 'BUSINESS_ADMIN',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sku TEXT,
      barcode TEXT,
      hsn_sac TEXT,
      category TEXT DEFAULT 'General',
      unit TEXT DEFAULT 'Pcs',
      purchase_price REAL DEFAULT 0,
      sale_price REAL DEFAULT 0,
      mrp REAL DEFAULT 0,
      gst_rate REAL DEFAULT 18,
      opening_stock REAL DEFAULT 0,
      current_stock REAL DEFAULT 0,
      min_stock_alert REAL DEFAULT 5,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      track_serial_barcodes INTEGER DEFAULT 1,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stock_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      transaction_type TEXT NOT NULL,
      reference_id INTEGER,
      quantity_change REAL NOT NULL,
      remaining_stock REAL NOT NULL,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS parties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      party_type TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      gstin TEXT,
      pan TEXT,
      state TEXT,
      state_code TEXT,
      billing_address TEXT,
      shipping_address TEXT,
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      credit_limit REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      purchase_number TEXT NOT NULL,
      vendor_id INTEGER,
      bill_date TEXT NOT NULL,
      due_date TEXT,
      total_taxable REAL DEFAULT 0,
      cgst_total REAL DEFAULT 0,
      sgst_total REAL DEFAULT 0,
      igst_total REAL DEFAULT 0,
      grand_total REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      balance_due REAL DEFAULT 0,
      payment_mode TEXT DEFAULT 'CASH',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (vendor_id) REFERENCES parties(id)
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      purchase_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      hsn_sac TEXT,
      unit TEXT DEFAULT 'Pcs',
      quantity REAL NOT NULL,
      purchase_price REAL NOT NULL,
      gst_rate REAL DEFAULT 18,
      taxable_value REAL NOT NULL,
      cgst_amount REAL DEFAULT 0,
      sgst_amount REAL DEFAULT 0,
      igst_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      serial_barcode TEXT,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items(id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      invoice_number TEXT NOT NULL,
      invoice_type TEXT DEFAULT 'TAX_INVOICE',
      customer_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      customer_gstin TEXT,
      place_of_supply TEXT,
      invoice_date TEXT NOT NULL,
      due_date TEXT,
      total_taxable REAL DEFAULT 0,
      cgst_total REAL DEFAULT 0,
      sgst_total REAL DEFAULT 0,
      igst_total REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      round_off REAL DEFAULT 0,
      grand_total REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      balance_due REAL DEFAULT 0,
      payment_status TEXT DEFAULT 'PAID',
      payment_mode TEXT DEFAULT 'CASH',
      notes TEXT,
      converted_from_quotation_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES parties(id)
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      invoice_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      hsn_sac TEXT,
      unit TEXT DEFAULT 'Pcs',
      quantity REAL NOT NULL,
      sale_price REAL NOT NULL,
      purchase_price_snapshot REAL DEFAULT 0,
      discount_percent REAL DEFAULT 0,
      taxable_value REAL NOT NULL,
      gst_rate REAL DEFAULT 18,
      cgst_amount REAL DEFAULT 0,
      sgst_amount REAL DEFAULT 0,
      igst_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      serial_barcode TEXT,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items(id)
    );

    CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      quotation_number TEXT NOT NULL,
      customer_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      quotation_date TEXT NOT NULL,
      valid_till TEXT,
      grand_total REAL DEFAULT 0,
      status TEXT DEFAULT 'DRAFT',
      converted_invoice_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES parties(id)
    );

    CREATE TABLE IF NOT EXISTS quotation_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      quotation_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      hsn_sac TEXT,
      unit TEXT DEFAULT 'Pcs',
      quantity REAL NOT NULL,
      sale_price REAL NOT NULL,
      gst_rate REAL DEFAULT 18,
      taxable_value REAL NOT NULL,
      total_amount REAL NOT NULL,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items(id)
    );

    CREATE TABLE IF NOT EXISTS item_barcodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      barcode TEXT NOT NULL,
      status TEXT DEFAULT 'AVAILABLE',
      purchase_id INTEGER,
      invoice_id INTEGER,
      sold_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_item_barcodes_status ON item_barcodes(business_id, item_id, status);
    CREATE INDEX IF NOT EXISTS idx_item_barcodes_code ON item_barcodes(business_id, barcode);
  `);

  // Ensure Platform Super Admin account exists (Username: dg7, Password: @iamdhruv)
  const existingDgAdmin = await db.prepare('SELECT id FROM users WHERE username = ?').get('dg7');
  if (existingDgAdmin) {
    await db.prepare(`
      UPDATE users SET 
        password_hash = ?, full_name = 'DG Administrator', role = 'SUPER_ADMIN', business_id = NULL, is_active = 1
      WHERE username = 'dg7'
    `).run(hashPassword('@iamdhruv'));
  } else {
    await db.prepare(`
      INSERT INTO users (username, password_hash, full_name, email, role, business_id, is_active)
      VALUES ('dg7', ?, 'DG Administrator', 'admin@dgbilling.local', 'SUPER_ADMIN', NULL, 1)
    `).run(hashPassword('@iamdhruv'));
  }
}
