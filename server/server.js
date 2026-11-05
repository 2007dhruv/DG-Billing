import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { db, initDatabase, hashPassword, verifyPassword } from './database.js';

await initDatabase();

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

// ----------------------------------------------------
// INDIAN GST STATE CODE MAPPING
// ----------------------------------------------------
function getStateCode(state) {
  if (!state) return '24';
  const clean = state.trim().toLowerCase();
  const map = {
    'gujarat': '24',
    'maharashtra': '27',
    'rajasthan': '08',
    'madhya pradesh': '23',
    'delhi': '07',
    'karnataka': '29',
    'tamil nadu': '33',
    'telangana': '36',
    'uttar pradesh': '09',
    'punjab': '03',
    'haryana': '06',
    'andhra pradesh': '37',
    'bihar': '10',
    'west bengal': '19',
    'kerala': '32',
    'odisha': '21',
    'assam': '18',
    'chhattisgarh': '22',
    'jharkhand': '20',
    'uttarakhand': '05',
    'himachal pradesh': '02',
    'goa': '30',
    'jammu & kashmir': '01',
    'chandigarh': '04',
    'puducherry': '34'
  };
  return map[clean] || '24';
}

// ----------------------------------------------------
// AUTHENTICATION MIDDLEWARE & MULTI-TENANT CONTEXT
// ----------------------------------------------------
async function getAuthContext(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  if (!token) return null;

  const session = await db.prepare(`
    SELECT u.id, u.username, u.full_name, u.email, u.role, u.business_id, u.is_active
    FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND u.is_active = 1
  `).get(token);

  if (!session) return null;

  // Determine effective business ID:
  let effectiveBusinessId = session.business_id;

  // If Super Admin, allow impersonating / selecting a client business via header or query
  if (session.role === 'SUPER_ADMIN') {
    const overrideId = req.headers['x-business-id'] || req.query.business_id;
    if (overrideId) {
      effectiveBusinessId = parseInt(overrideId);
    }
  }

  // Fetch business profile if bound to a business
  let business = null;
  if (effectiveBusinessId) {
    business = await db.prepare('SELECT * FROM businesses WHERE id = ?').get(effectiveBusinessId);
  }

  return {
    user: session,
    businessId: effectiveBusinessId,
    business
  };
}

// ----------------------------------------------------
// 1. AUTHENTICATION & LOGIN APIS
// ----------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const cleanUser = username.trim().toLowerCase();
    const user = await db.prepare(`
      SELECT * FROM users 
      WHERE LOWER(username) = ? OR LOWER(email) = ?
    `).get(cleanUser, cleanUser);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account is deactivated. Contact platform administrator.' });
    }

    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // If business user, check if business is active
    let business = null;
    if (user.business_id) {
      business = await db.prepare('SELECT * FROM businesses WHERE id = ?').get(user.business_id);
      if (!business || !business.is_active) {
        return res.status(403).json({ error: 'This business account has been suspended. Please contact platform admin.' });
      }
    }

    // Generate secure 64-char token
    const token = crypto.randomBytes(32).toString('hex');
    await db.prepare('INSERT INTO user_sessions (token, user_id) VALUES (?, ?)').run(token, user.id);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        business_id: user.business_id
      },
      business
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx) {
      return res.status(401).json({ error: 'Unauthorized or session expired.' });
    }
    res.json({
      user: ctx.user,
      business: ctx.business
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      await db.prepare('DELETE FROM user_sessions WHERE token = ?').run(token);
    }
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 2. SUPER ADMIN: CLIENT BUSINESSES MANAGEMENT
// ----------------------------------------------------
app.get('/api/admin/businesses', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx || ctx.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Forbidden. Super Admin access required.' });
    }

    const businesses = await db.prepare(`
      SELECT 
        b.*,
        u.username as login_username,
        COALESCE((SELECT COUNT(*) FROM items i WHERE i.business_id = b.id), 0) as total_items,
        COALESCE((SELECT COUNT(*) FROM invoices inv WHERE inv.business_id = b.id), 0) as total_invoices,
        COALESCE((SELECT SUM(inv.grand_total) FROM invoices inv WHERE inv.business_id = b.id), 0) as total_revenue
      FROM businesses b
      LEFT JOIN users u ON u.business_id = b.id AND u.role = 'BUSINESS_ADMIN'
      ORDER BY b.id DESC
    `).all();

    res.json(businesses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/businesses', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx || ctx.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Forbidden. Super Admin access required.' });
    }

    const {
      business_name, owner_name, username, password,
      phone, email, state, gstin, pan, address,
      bank_name, account_number, ifsc, upi_id, invoice_prefix
    } = req.body;

    if (!business_name || !owner_name || !username || !password) {
      return res.status(400).json({ error: 'Business name, owner name, username, and password are required.' });
    }

    const cleanUser = username.trim().toLowerCase();
    if (cleanUser.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check if username is already taken
    const existing = await db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(cleanUser);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken by another account.' });
    }

    // 1. Insert Business Record
    const bizState = state || 'Gujarat';
    const bizStateCode = getStateCode(bizState);

    const bizRes = await db.prepare(`
      INSERT INTO businesses (
        business_name, owner_name, email, phone, gstin, pan,
        state, state_code, address, bank_name, account_number, ifsc, upi_id, invoice_prefix, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      business_name.trim(), owner_name.trim(), email || '', phone || '', gstin || '', pan || '',
      bizState, bizStateCode,
      address || '', bank_name || '', account_number || '', ifsc || '', upi_id || '', invoice_prefix || 'INV-2026-'
    );

    const businessId = bizRes.lastInsertRowid;

    // 2. Insert Dedicated Business Admin User Login
    const pwdHash = hashPassword(password);
    await db.prepare(`
      INSERT INTO users (business_id, username, password_hash, full_name, email, role, is_active)
      VALUES (?, ?, ?, ?, ?, 'BUSINESS_ADMIN', 1)
    `).run(businessId, cleanUser, pwdHash, owner_name.trim(), email || '');

    const createdBiz = await db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId);
    res.status(201).json({
      message: 'Business account and credentials created successfully.',
      business: createdBiz,
      login_username: cleanUser
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/businesses/:id', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx || ctx.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Forbidden. Super Admin access required.' });
    }

    const targetId = parseInt(req.params.id);
    const currentBiz = await db.prepare('SELECT * FROM businesses WHERE id = ?').get(targetId);
    if (!currentBiz) {
      return res.status(404).json({ error: 'Business not found.' });
    }

    const { business_name, owner_name, phone, email, state, gstin, address, is_active } = req.body;

    const newActive = (is_active !== undefined) ? (is_active ? 1 : 0) : currentBiz.is_active;
    const newState = state !== undefined ? state : currentBiz.state;
    const newStateCode = getStateCode(newState);

    await db.prepare(`
      UPDATE businesses SET
        business_name = ?,
        owner_name = ?,
        phone = ?,
        email = ?,
        state = ?,
        state_code = ?,
        gstin = ?,
        address = ?,
        is_active = ?
      WHERE id = ?
    `).run(
      business_name !== undefined ? business_name : currentBiz.business_name,
      owner_name !== undefined ? owner_name : currentBiz.owner_name,
      phone !== undefined ? phone : currentBiz.phone,
      email !== undefined ? email : currentBiz.email,
      newState,
      newStateCode,
      gstin !== undefined ? gstin : currentBiz.gstin,
      address !== undefined ? address : currentBiz.address,
      newActive,
      targetId
    );

    // Update is_active for all user accounts belonging to this business
    await db.prepare('UPDATE users SET is_active = ? WHERE business_id = ?').run(newActive, targetId);

    // If deactivated, revoke all active sessions for that business
    if (newActive === 0) {
      await db.prepare(`
        DELETE FROM user_sessions 
        WHERE user_id IN (SELECT id FROM users WHERE business_id = ?)
      `).run(targetId);
    }

    const updated = await db.prepare('SELECT * FROM businesses WHERE id = ?').get(targetId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/businesses/:id', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx || ctx.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Forbidden. Super Admin access required.' });
    }

    const targetId = parseInt(req.params.id);

    // 1. Delete all user sessions belonging to this business
    await db.prepare(`
      DELETE FROM user_sessions 
      WHERE user_id IN (SELECT id FROM users WHERE business_id = ?)
    `).run(targetId);

    // 2. Delete all users belonging to this business
    await db.prepare('DELETE FROM users WHERE business_id = ?').run(targetId);

    // 3. Delete invoice items and invoices
    await db.prepare('DELETE FROM invoice_items WHERE business_id = ?').run(targetId);
    await db.prepare('DELETE FROM invoices WHERE business_id = ?').run(targetId);

    // 4. Delete purchase items and purchases
    await db.prepare('DELETE FROM purchase_items WHERE business_id = ?').run(targetId);
    await db.prepare('DELETE FROM purchases WHERE business_id = ?').run(targetId);

    // 5. Delete quotation items and quotations
    await db.prepare('DELETE FROM quotation_items WHERE business_id = ?').run(targetId);
    await db.prepare('DELETE FROM quotations WHERE business_id = ?').run(targetId);

    // 6. Delete item barcodes/series numbers, stock transactions, and items
    await db.prepare('DELETE FROM item_barcodes WHERE business_id = ?').run(targetId);
    await db.prepare('DELETE FROM stock_transactions WHERE business_id = ?').run(targetId);
    await db.prepare('DELETE FROM items WHERE business_id = ?').run(targetId);

    // 7. Delete parties (customers & vendors)
    await db.prepare('DELETE FROM parties WHERE business_id = ?').run(targetId);

    // 8. Delete the business record itself
    await db.prepare('DELETE FROM businesses WHERE id = ?').run(targetId);

    res.json({ message: 'Business account, user login, and all associated tenant data deleted completely.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'Unauthorized.' });

    const targetUserId = parseInt(req.params.id);
    if (ctx.user.id === targetUserId) {
      return res.status(400).json({ error: 'You cannot delete your own logged-in user account.' });
    }

    if (ctx.user.role !== 'SUPER_ADMIN' && ctx.user.role !== 'BUSINESS_ADMIN') {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    const targetUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (ctx.user.role === 'BUSINESS_ADMIN' && targetUser.business_id !== ctx.businessId) {
      return res.status(403).json({ error: 'Cannot delete user from another business.' });
    }

    if (targetUser.username === 'dg7' || (targetUser.role === 'SUPER_ADMIN' && ctx.user.username !== 'dg7')) {
      return res.status(400).json({ error: 'Cannot delete primary Super Admin.' });
    }

    await db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(targetUserId);
    await db.prepare('DELETE FROM users WHERE id = ?').run(targetUserId);

    res.json({ message: `User @${targetUser.username} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 3. TENANT BUSINESS PROFILE (Own Business Details)
// ----------------------------------------------------
app.get('/api/profile', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx || !ctx.businessId) {
      return res.json({});
    }
    res.json(ctx.business || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/profile', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    if (!ctx || !ctx.businessId) {
      return res.status(400).json({ error: 'No active business context.' });
    }

    const {
      business_name, owner_name, gstin, phone, email, address, state, state_code,
      pan, bank_name, account_number, ifsc, upi_id, terms_conditions, invoice_prefix
    } = req.body;

    const finalState = state || ctx.business?.state || 'Gujarat';
    const finalStateCode = state_code || getStateCode(finalState);

    await db.prepare(`
      UPDATE businesses SET
        business_name = ?, owner_name = ?, gstin = ?, phone = ?, email = ?,
        address = ?, state = ?, state_code = ?, pan = ?, bank_name = ?,
        account_number = ?, ifsc = ?, upi_id = ?, terms_conditions = ?, invoice_prefix = ?
      WHERE id = ?
    `).run(
      business_name || '', owner_name || '', gstin || '', phone || '', email || '',
      address || '', finalState, finalStateCode,
      pan || '', bank_name || '', account_number || '', ifsc || '', upi_id || '', terms_conditions || '',
      invoice_prefix || 'INV-2026-', ctx.businessId
    );

    const updated = await db.prepare('SELECT * FROM businesses WHERE id = ?').get(ctx.businessId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. TENANT DASHBOARD METRICS & ANALYTICS
// ----------------------------------------------------
function buildDateFilter(dateCol, query = {}) {
  const { period = 'all', date, month, year, start_date, end_date } = query;
  if (period === 'today') {
    const d = (date && date.trim()) || new Date().toISOString().split('T')[0];
    return { clause: ` AND ${dateCol} = ?`, params: [d], label: `Today (${d})` };
  }
  if (period === 'month') {
    const m = (month && month.trim()) || new Date().toISOString().slice(0, 7);
    return { clause: ` AND ${dateCol} LIKE ?`, params: [`${m}%`], label: `Month: ${m}` };
  }
  if (period === 'year') {
    const y = (year && year.trim()) || new Date().toISOString().slice(0, 4);
    return { clause: ` AND ${dateCol} LIKE ?`, params: [`${y}%`], label: `Year: ${y}` };
  }
  if (period === 'custom' || start_date || end_date) {
    if (start_date && end_date) {
      return { clause: ` AND ${dateCol} BETWEEN ? AND ?`, params: [start_date, end_date], label: `${start_date} to ${end_date}` };
    }
    if (start_date) {
      return { clause: ` AND ${dateCol} >= ?`, params: [start_date], label: `From ${start_date}` };
    }
    if (end_date) {
      return { clause: ` AND ${dateCol} <= ?`, params: [end_date], label: `Until ${end_date}` };
    }
  }
  return { clause: '', params: [], label: 'All Time' };
}

app.get('/api/dashboard', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;

    if (!bId) {
      return res.json({
        stock: { totalItems: 0, totalValue: 0, lowStockCount: 0 },
        sales: { totalInvoices: 0, totalRevenue: 0, totalReceivable: 0 },
        purchases: { totalBills: 0, totalPurchases: 0, totalPayable: 0 },
        profit: { totalRevenue: 0, totalCost: 0, grossProfit: 0, marginPercent: 0 },
        recentInvoices: [],
        lowStockItems: [],
        trend: [],
        payment_modes: [],
        filter: { period: 'all', label: 'All Time' }
      });
    }

    const invFilter = buildDateFilter('invoice_date', req.query);
    const purFilter = buildDateFilter('bill_date', req.query);
    const invItemClause = invFilter.clause.replace(/invoice_date/g, 'i.invoice_date');

    // 1. Current Warehouse Stock (Asset valuation is real-time inventory state)
    const stockStats = await db.prepare(`
      SELECT 
        COUNT(*) as total_items,
        SUM(current_stock * purchase_price) as total_stock_value,
        SUM(CASE WHEN current_stock <= min_stock_alert THEN 1 ELSE 0 END) as low_stock_count
      FROM items WHERE business_id = ? AND is_active = 1
    `).get(bId);

    // 2. Sales Invoices (Filtered by selected Date / Month / Year)
    const salesStats = await db.prepare(`
      SELECT 
        COUNT(*) as total_invoices,
        COALESCE(SUM(grand_total), 0) as total_sales,
        COALESCE(SUM(balance_due), 0) as total_receivable
      FROM invoices WHERE business_id = ? ${invFilter.clause}
    `).get(bId, ...invFilter.params);

    // 3. Purchases Bills (Filtered by selected Date / Month / Year)
    const purchaseStats = await db.prepare(`
      SELECT 
        COUNT(*) as total_bills,
        COALESCE(SUM(grand_total), 0) as total_purchases,
        COALESCE(SUM(balance_due), 0) as total_payable
      FROM purchases WHERE business_id = ? ${purFilter.clause}
    `).get(bId, ...purFilter.params);

    // 4. Gross Profit & Margin Calculation for filtered period
    const profitStats = await db.prepare(`
      SELECT 
        COALESCE(SUM(ii.taxable_value), 0) as total_revenue,
        COALESCE(SUM(ii.quantity * ii.purchase_price_snapshot), 0) as total_cost,
        COALESCE(SUM(ii.taxable_value - (ii.quantity * ii.purchase_price_snapshot)), 0) as gross_profit
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      WHERE ii.business_id = ? ${invItemClause}
    `).get(bId, ...invFilter.params);

    const grossProfit = Math.round(profitStats?.gross_profit || 0);
    const totalRev = Math.round(profitStats?.total_revenue || 0);
    const marginPercent = totalRev > 0 ? parseFloat(((grossProfit / totalRev) * 100).toFixed(1)) : 0;

    // 5. Recent Invoices
    const recentInvoices = await db.prepare(`
      SELECT * FROM invoices 
      WHERE business_id = ? ${invFilter.clause}
      ORDER BY invoice_date DESC, id DESC 
      LIMIT 6
    `).all(bId, ...invFilter.params);

    // 6. Low Stock Catalog Alerts
    const lowStockItems = await db.prepare(`
      SELECT * FROM items 
      WHERE business_id = ? AND is_active = 1 AND current_stock <= min_stock_alert 
      ORDER BY current_stock ASC 
      LIMIT 6
    `).all(bId);

    // 7. Payment Mode Breakdown
    const paymentModes = await db.prepare(`
      SELECT payment_mode, COUNT(*) as count, COALESCE(SUM(grand_total), 0) as total
      FROM invoices
      WHERE business_id = ? ${invFilter.clause}
      GROUP BY payment_mode
    `).all(bId, ...invFilter.params);

    // 8. Trend Breakdown for Visual Graph
    let trend = [];
    const period = req.query.period || 'all';
    const isMonthlyGroupBy = period === 'all' || period === 'year';

    if (isMonthlyGroupBy) {
      // Group by Month (YYYY-MM)
      const salesByMonth = await db.prepare(`
        SELECT strftime('%Y-%m', invoice_date) as m, COALESCE(SUM(grand_total), 0) as sales
        FROM invoices WHERE business_id = ? ${invFilter.clause}
        GROUP BY m ORDER BY m ASC
      `).all(bId, ...invFilter.params);

      const purchasesByMonth = await db.prepare(`
        SELECT strftime('%Y-%m', bill_date) as m, COALESCE(SUM(grand_total), 0) as purchases
        FROM purchases WHERE business_id = ? ${purFilter.clause}
        GROUP BY m ORDER BY m ASC
      `).all(bId, ...purFilter.params);

      const profitByMonth = await db.prepare(`
        SELECT 
          strftime('%Y-%m', i.invoice_date) as m,
          COALESCE(SUM(ii.taxable_value - (ii.quantity * ii.purchase_price_snapshot)), 0) as profit
        FROM invoice_items ii
        JOIN invoices i ON ii.invoice_id = i.id
        WHERE ii.business_id = ? ${invItemClause}
        GROUP BY m ORDER BY m ASC
      `).all(bId, ...invFilter.params);

      const allMonths = Array.from(new Set([
        ...salesByMonth.map(s => s.m),
        ...purchasesByMonth.map(p => p.m),
        ...profitByMonth.map(pr => pr.m)
      ])).filter(Boolean).sort();

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      trend = allMonths.map(m => {
        const parts = m.split('-');
        const yearStr = parts[0] ? `'${parts[0].slice(2)}` : '';
        const monthNum = parseInt(parts[1], 10);
        const label = `${monthNames[monthNum - 1] || m} ${yearStr}`;
        const s = salesByMonth.find(x => x.m === m)?.sales || 0;
        const p = purchasesByMonth.find(x => x.m === m)?.purchases || 0;
        const pr = profitByMonth.find(x => x.m === m)?.profit || 0;
        return {
          key: m,
          label,
          sales: Math.round(s),
          purchases: Math.round(p),
          profit: Math.round(pr)
        };
      });
    } else {
      // Group by Day (YYYY-MM-DD)
      const salesByDay = await db.prepare(`
        SELECT invoice_date as d, COALESCE(SUM(grand_total), 0) as sales
        FROM invoices WHERE business_id = ? ${invFilter.clause}
        GROUP BY d ORDER BY d ASC
      `).all(bId, ...invFilter.params);

      const purchasesByDay = await db.prepare(`
        SELECT bill_date as d, COALESCE(SUM(grand_total), 0) as purchases
        FROM purchases WHERE business_id = ? ${purFilter.clause}
        GROUP BY d ORDER BY d ASC
      `).all(bId, ...purFilter.params);

      const profitByDay = await db.prepare(`
        SELECT 
          i.invoice_date as d,
          COALESCE(SUM(ii.taxable_value - (ii.quantity * ii.purchase_price_snapshot)), 0) as profit
        FROM invoice_items ii
        JOIN invoices i ON ii.invoice_id = i.id
        WHERE ii.business_id = ? ${invItemClause}
        GROUP BY d ORDER BY d ASC
      `).all(bId, ...invFilter.params);

      const allDays = Array.from(new Set([
        ...salesByDay.map(s => s.d),
        ...purchasesByDay.map(p => p.d),
        ...profitByDay.map(pr => pr.d)
      ])).filter(Boolean).sort();

      trend = allDays.map(d => {
        const parts = d.split('-');
        const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
        const s = salesByDay.find(x => x.d === d)?.sales || 0;
        const p = purchasesByDay.find(x => x.d === d)?.purchases || 0;
        const pr = profitByDay.find(x => x.d === d)?.profit || 0;
        return {
          key: d,
          label,
          sales: Math.round(s),
          purchases: Math.round(p),
          profit: Math.round(pr)
        };
      });
    }

    res.json({
      stock: {
        totalItems: stockStats.total_items || 0,
        totalValue: Math.round(stockStats.total_stock_value || 0),
        lowStockCount: stockStats.low_stock_count || 0
      },
      sales: {
        totalInvoices: salesStats.total_invoices || 0,
        totalRevenue: Math.round(salesStats.total_sales || 0),
        totalReceivable: Math.round(salesStats.total_receivable || 0)
      },
      purchases: {
        totalBills: purchaseStats.total_bills || 0,
        totalPurchases: Math.round(purchaseStats.total_purchases || 0),
        totalPayable: Math.round(purchaseStats.total_payable || 0)
      },
      profit: {
        totalRevenue: totalRev,
        totalCost: Math.round(profitStats?.total_cost || 0),
        grossProfit: grossProfit,
        marginPercent: marginPercent
      },
      recentInvoices,
      lowStockItems,
      payment_modes: paymentModes,
      trend,
      filter: {
        period,
        label: invFilter.label
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 5. TENANT ITEMS (STOCK INVENTORY)
// ----------------------------------------------------
app.get('/api/items', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    if (!bId) return res.json([]);

    const { search, category, low_stock } = req.query;
    let query = 'SELECT * FROM items WHERE business_id = ? AND is_active = 1';
    const params = [bId];

    if (search) {
      query += ' AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ? OR hsn_sac LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }
    if (low_stock === 'true') {
      query += ' AND current_stock <= min_stock_alert';
    }

    query += ' ORDER BY name ASC';
    const items = await db.prepare(query).all(...params);

    const getAvailableBarcodes = await db.prepare(`
      SELECT id, barcode, status FROM item_barcodes 
      WHERE item_id = ? AND business_id = ? AND status = 'AVAILABLE' 
      ORDER BY id ASC
    `);

    for (const it of items) {
      const bcs = getAvailableBarcodes.all(it.id, bId);
      it.available_barcodes = bcs.map(b => b.barcode);
      it.barcodes_count = bcs.length;
      if (bcs.length > 0) {
        it.current_stock = bcs.length;
      }
    }

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/items', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    if (!bId) return res.status(400).json({ error: 'No active business context.' });

    const {
      name, sku, barcode, hsn_sac, category, unit,
      purchase_price, sale_price, mrp, gst_rate,
      opening_stock, min_stock_alert,
      initial_barcodes
    } = req.body;

    // Parse any individual machine barcode numbers entered on creation
    const barcodeList = initial_barcodes
      ? (Array.isArray(initial_barcodes) ? initial_barcodes : initial_barcodes.split(/[\n,]+/).map(s => s.trim()).filter(Boolean))
      : [];

    const opStock = barcodeList.length > 0 ? barcodeList.length : (parseFloat(opening_stock) || 0);

    const result = await db.prepare(`
      INSERT INTO items (
        business_id, name, sku, barcode, hsn_sac, category, unit,
        purchase_price, sale_price, mrp, gst_rate,
        opening_stock, current_stock, min_stock_alert, track_serial_barcodes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      bId, name, sku || '', barcode || '', hsn_sac || '', category || 'General', unit || 'Pcs',
      parseFloat(purchase_price) || 0, parseFloat(sale_price) || 0, parseFloat(mrp) || 0,
      parseFloat(gst_rate) || 18, opStock, opStock, parseFloat(min_stock_alert) || 5,
      barcodeList.length > 0 ? 1 : 1
    );

    const itemId = result.lastInsertRowid;

    // If machine barcodes were provided, insert each unit with status 'AVAILABLE'
    if (barcodeList.length > 0) {
      const insertBc = await db.prepare(`
        INSERT INTO item_barcodes (business_id, item_id, barcode, status)
        VALUES (?, ?, ?, 'AVAILABLE')
      `);
      for (const code of barcodeList) {
        insertBc.run(bId, itemId, code);
      }
    }

    if (opStock > 0) {
      await db.prepare(`
        INSERT INTO stock_transactions (business_id, item_id, transaction_type, reference_id, quantity_change, remaining_stock, reason)
        VALUES (?, ?, 'OPENING', NULL, ?, ?, 'Initial Opening Stock with Serialized Barcodes')
      `).run(bId, itemId, opStock, opStock);
    }

    const created = await db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// SERIALIZED BARCODE MANAGEMENT APIS (PER MACHINE TRACKING)
// ----------------------------------------------------
app.get('/api/items/:id/barcodes', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    if (!bId) return res.status(400).json({ error: 'No business context.' });

    const barcodes = await db.prepare(`
      SELECT ib.*, inv.invoice_number, inv.customer_name 
      FROM item_barcodes ib
      LEFT JOIN invoices inv ON ib.invoice_id = inv.id
      WHERE ib.item_id = ? AND ib.business_id = ?
      ORDER BY ib.status ASC, ib.id DESC
    `).all(req.params.id, bId);

    res.json(barcodes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/items/:id/barcodes', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    if (!bId) return res.status(400).json({ error: 'No business context.' });

    const { barcodes } = req.body;
    if (!barcodes) return res.status(400).json({ error: 'No barcodes provided.' });

    const codeList = Array.isArray(barcodes)
      ? barcodes
      : barcodes.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

    if (codeList.length === 0) return res.status(400).json({ error: 'No valid barcode numbers provided.' });

    const insertStmt = await db.prepare(`
      INSERT INTO item_barcodes (business_id, item_id, barcode, status)
      VALUES (?, ?, ?, 'AVAILABLE')
    `);

    let addedCount = 0;
    for (const code of codeList) {
      if (code) {
        insertStmt.run(bId, req.params.id, code);
        addedCount++;
      }
    }

    // Recalculate available stock count
    const availableCount = await db.prepare(`
      SELECT COUNT(*) as c FROM item_barcodes WHERE item_id = ? AND business_id = ? AND status = 'AVAILABLE'
    `).get(req.params.id, bId).c;

    await db.prepare('UPDATE items SET current_stock = ? WHERE id = ? AND business_id = ?').run(availableCount, req.params.id, bId);

    await db.prepare(`
      INSERT INTO stock_transactions (business_id, item_id, transaction_type, reference_id, quantity_change, remaining_stock, reason)
      VALUES (?, ?, 'ADJUSTMENT', NULL, ?, ?, ?)
    `).run(bId, req.params.id, addedCount, availableCount, `Added ${addedCount} individual machine barcode(s) to stock`);

    res.json({ message: `Added ${addedCount} barcode(s) to stock`, current_stock: availableCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/items/:id/barcodes/:barcodeId', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    if (!bId) return res.status(400).json({ error: 'No business context.' });

    const target = await db.prepare('SELECT * FROM item_barcodes WHERE id = ? AND business_id = ?').get(req.params.barcodeId, bId);
    if (!target) return res.status(404).json({ error: 'Barcode not found.' });

    if (target.status === 'SOLD') {
      return res.status(400).json({ error: 'Cannot delete a barcode that is already sold on an invoice.' });
    }

    await db.prepare('DELETE FROM item_barcodes WHERE id = ? AND business_id = ?').run(req.params.barcodeId, bId);

    const availableCount = await db.prepare(`
      SELECT COUNT(*) as c FROM item_barcodes WHERE item_id = ? AND business_id = ? AND status = 'AVAILABLE'
    `).get(req.params.id, bId).c;

    await db.prepare('UPDATE items SET current_stock = ? WHERE id = ? AND business_id = ?').run(availableCount, req.params.id, bId);

    res.json({ message: 'Barcode removed from stock', current_stock: availableCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/barcodes/lookup', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    if (!bId) return res.status(400).json({ found: false, error: 'No business context.' });

    const { barcode } = req.query;
    if (!barcode || !barcode.trim()) return res.status(400).json({ found: false, error: 'Barcode parameter required.' });
    const queryCode = barcode.trim();

    // 1. First look up unit machine barcode in item_barcodes
    const unitMatch = await db.prepare(`
      SELECT ib.*, i.name as item_name, i.sku, i.sale_price, i.gst_rate, i.unit, i.hsn_sac, i.current_stock
      FROM item_barcodes ib
      JOIN items i ON ib.item_id = i.id
      WHERE ib.business_id = ? AND LOWER(ib.barcode) = LOWER(?)
    `).get(bId, queryCode);

    if (unitMatch) {
      if (unitMatch.status === 'SOLD') {
        const invInfo = unitMatch.invoice_id ? ` on Invoice #${unitMatch.invoice_id}` : '';
        return res.json({ 
          found: false, 
          error: `Machine Series Number "${unitMatch.barcode}" has ALREADY been SOLD${invInfo} and cannot be added again!` 
        });
      }
      return res.json({
        found: true,
        is_serialized: true,
        barcode: unitMatch.barcode,
        status: unitMatch.status,
        item: {
          id: unitMatch.item_id,
          name: unitMatch.item_name,
          sku: unitMatch.sku,
          sale_price: unitMatch.sale_price,
          gst_rate: unitMatch.gst_rate,
          unit: unitMatch.unit,
          hsn_sac: unitMatch.hsn_sac,
          current_stock: unitMatch.current_stock
        }
      });
    }

    // 2. Fallback check: general item SKU barcode
    const itemMatch = await db.prepare(`
      SELECT * FROM items 
      WHERE business_id = ? AND (LOWER(barcode) = LOWER(?) OR LOWER(sku) = LOWER(?))
    `).get(bId, queryCode, queryCode);

    if (itemMatch) {
      return res.json({
        found: true,
        is_serialized: false,
        barcode: queryCode,
        status: 'AVAILABLE',
        item: {
          id: itemMatch.id,
          name: itemMatch.name,
          sku: itemMatch.sku,
          sale_price: itemMatch.sale_price,
          gst_rate: itemMatch.gst_rate,
          unit: itemMatch.unit,
          hsn_sac: itemMatch.hsn_sac,
          current_stock: itemMatch.current_stock
        }
      });
    }

    return res.json({
      found: false,
      error: `Barcode "${queryCode}" was not found in your inventory.`
    });
  } catch (err) {
    res.status(500).json({ found: false, error: err.message });
  }
});

app.post('/api/items/:id/adjust-stock', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    if (!bId) return res.status(400).json({ error: 'No business context.' });

    const { id } = req.params;
    const { adjustment_type, quantity, reason } = req.body;
    const qty = parseFloat(quantity) || 0;

    const item = await db.prepare('SELECT * FROM items WHERE id = ? AND business_id = ?').get(id, bId);
    if (!item) return res.status(404).json({ error: 'Item not found in this business.' });

    let qtyChange = adjustment_type === 'ADD' ? qty : -qty;
    let newStock = item.current_stock + qtyChange;
    if (newStock < 0) newStock = 0;

    await db.prepare('UPDATE items SET current_stock = ? WHERE id = ? AND business_id = ?').run(newStock, id, bId);

    await db.prepare(`
      INSERT INTO stock_transactions (business_id, item_id, transaction_type, reference_id, quantity_change, remaining_stock, reason)
      VALUES (?, ?, 'ADJUSTMENT', NULL, ?, ?, ?)
    `).run(bId, id, qtyChange, newStock, reason || 'Manual Stock Adjustment');

    res.json({ message: 'Stock updated', current_stock: newStock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/items/:id/history', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    const history = await db.prepare(`
      SELECT * FROM stock_transactions WHERE item_id = ? AND business_id = ? ORDER BY id DESC LIMIT 50
    `).all(req.params.id, bId);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6. TENANT PARTIES (CUSTOMERS & VENDORS)
// ----------------------------------------------------
app.get('/api/parties', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    if (!bId) return res.json([]);

    const { type } = req.query;
    let query = 'SELECT * FROM parties WHERE business_id = ?';
    const params = [bId];
    if (type) {
      query += ' AND party_type = ?';
      params.push(type.toUpperCase());
    }
    query += ' ORDER BY name ASC';
    const parties = await db.prepare(query).all(...params);
    res.json(parties);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/parties', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    if (!bId) return res.status(400).json({ error: 'No business context.' });

    const {
      name, party_type, phone, email, gstin, pan,
      state, state_code, billing_address, shipping_address,
      opening_balance, credit_limit
    } = req.body;

    const opBal = parseFloat(opening_balance) || 0;

    const defaultState = ctx?.business?.state || 'Gujarat';
    const defaultStateCode = ctx?.business?.state_code || '24';

    const result = await db.prepare(`
      INSERT INTO parties (
        business_id, name, party_type, phone, email, gstin, pan,
        state, state_code, billing_address, shipping_address,
        opening_balance, current_balance, credit_limit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      bId, name, party_type || 'CUSTOMER', phone || '', email || '', gstin || '', pan || '',
      state || defaultState, state_code || defaultStateCode, billing_address || '', shipping_address || '',
      opBal, opBal, parseFloat(credit_limit) || 0
    );

    const created = await db.prepare('SELECT * FROM parties WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/parties/:id', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    if (!bId) return res.status(400).json({ error: 'No business context.' });

    const party = await db.prepare('SELECT * FROM parties WHERE id = ? AND business_id = ?').get(req.params.id, bId);
    if (!party) return res.status(404).json({ error: 'Party not found.' });

    const invCount = await db.prepare('SELECT COUNT(*) as c FROM invoices WHERE customer_id = ? AND business_id = ?').get(req.params.id, bId).c;
    const purCount = await db.prepare('SELECT COUNT(*) as c FROM purchases WHERE vendor_id = ? AND business_id = ?').get(req.params.id, bId).c;

    if (invCount > 0 || purCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete "${party.name}". It is linked to ${invCount} invoice(s) and ${purCount} purchase bill(s).` 
      });
    }

    await db.prepare('DELETE FROM parties WHERE id = ? AND business_id = ?').run(req.params.id, bId);
    res.json({ message: 'Party deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 7. TENANT PURCHASES (STOCK-IN)
// ----------------------------------------------------
app.get('/api/purchases', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    if (!bId) return res.json([]);

    const purchases = await db.prepare(`
      SELECT p.*, pt.name as vendor_name, pt.phone as vendor_phone
      FROM purchases p
      LEFT JOIN parties pt ON p.vendor_id = pt.id
      WHERE p.business_id = ?
      ORDER BY p.id DESC
    `).all(bId);
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/purchases', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    if (!bId) return res.status(400).json({ error: 'No business context.' });

    const { vendor_id, bill_date, due_date, items, payment_mode, paid_amount, notes } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'No items provided.' });

    const count = await db.prepare('SELECT COUNT(*) as c FROM purchases WHERE business_id = ?').get(bId).c + 1;
    const purchaseNumber = `PUR-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

    let totalTaxable = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;
    let grandTotal = 0;

    const vendor = vendor_id ? await db.prepare('SELECT * FROM parties WHERE id = ? AND business_id = ?').get(vendor_id, bId) : null;
    const isInterState = vendor && vendor.state && ctx.business?.state && vendor.state.toLowerCase() !== ctx.business.state.toLowerCase();

    for (const it of items) {
      const qty = parseFloat(it.quantity) || 1;
      const rate = parseFloat(it.purchase_price) || 0;
      const gstRate = parseFloat(it.gst_rate) || 0;
      const taxable = qty * rate;
      const gstAmount = (taxable * gstRate) / 100;
      totalTaxable += taxable;
      if (isInterState) {
        igstTotal += gstAmount;
      } else {
        cgstTotal += gstAmount / 2;
        sgstTotal += gstAmount / 2;
      }
      grandTotal += (taxable + gstAmount);
    }

    const paid = parseFloat(paid_amount) || 0;
    const balanceDue = grandTotal - paid;

    const purResult = await db.prepare(`
      INSERT INTO purchases (
        business_id, purchase_number, vendor_id, bill_date, due_date,
        total_taxable, cgst_total, sgst_total, igst_total, grand_total,
        paid_amount, balance_due, payment_mode, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      bId, purchaseNumber, vendor_id || null, bill_date || new Date().toISOString().split('T')[0],
      due_date || null, totalTaxable, cgstTotal, sgstTotal, igstTotal, grandTotal,
      paid, balanceDue, payment_mode || 'CASH', notes || ''
    );

    const purchaseId = purResult.lastInsertRowid;

    for (const it of items) {
      const qty = parseFloat(it.quantity) || 1;
      const rate = parseFloat(it.purchase_price) || 0;
      const gstRate = parseFloat(it.gst_rate) || 0;
      const taxable = qty * rate;
      const gstAmt = (taxable * gstRate) / 100;
      const cgst = isInterState ? 0 : gstAmt / 2;
      const sgst = isInterState ? 0 : gstAmt / 2;
      const igst = isInterState ? gstAmt : 0;
      const itemTotal = taxable + gstAmt;

      await db.prepare(`
        INSERT INTO purchase_items (
          business_id, purchase_id, item_id, item_name, hsn_sac, unit, quantity,
          purchase_price, gst_rate, taxable_value, cgst_amount, sgst_amount, igst_amount, total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(bId, purchaseId, it.item_id, it.item_name, it.hsn_sac || '', it.unit || 'Pcs', qty, rate, gstRate, taxable, cgst, sgst, igst, itemTotal);

      // STOCK-IN: Increment stock
      await db.prepare('UPDATE items SET current_stock = current_stock + ? WHERE id = ? AND business_id = ?').run(qty, it.item_id, bId);
      const remaining = await db.prepare('SELECT current_stock FROM items WHERE id = ? AND business_id = ?').get(it.item_id, bId)?.current_stock || 0;
      await db.prepare(`
        INSERT INTO stock_transactions (business_id, item_id, transaction_type, reference_id, quantity_change, remaining_stock, reason)
        VALUES (?, ?, 'PURCHASE', ?, ?, ?, ?)
      `).run(bId, it.item_id, purchaseId, qty, remaining, `Stock In: Purchase Bill #${purchaseNumber}`);

      // Register incoming machine barcodes if provided
      if (Array.isArray(it.barcodes)) {
        for (const bc of it.barcodes) {
          if (bc && typeof bc === 'string' && bc.trim()) {
            await db.prepare(`
              INSERT INTO item_barcodes (business_id, item_id, barcode, status, purchase_id)
              VALUES (?, ?, ?, 'AVAILABLE', ?)
            `).run(bId, it.item_id, bc.trim(), purchaseId);
          }
        }
      } else if (it.serial_barcode && typeof it.serial_barcode === 'string' && it.serial_barcode.trim()) {
        await db.prepare(`
          INSERT INTO item_barcodes (business_id, item_id, barcode, status, purchase_id)
          VALUES (?, ?, ?, 'AVAILABLE', ?)
        `).run(bId, it.item_id, it.serial_barcode.trim(), purchaseId);
      }
    }

    if (vendor_id && balanceDue > 0) {
      await db.prepare('UPDATE parties SET current_balance = current_balance - ? WHERE id = ? AND business_id = ?').run(balanceDue, vendor_id, bId);
    }

    res.status(201).json({ id: purchaseId, purchase_number: purchaseNumber, grand_total: grandTotal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/purchases/:id', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    if (!bId) return res.status(400).json({ error: 'No business context.' });

    const pur = await db.prepare('SELECT * FROM purchases WHERE id = ? AND business_id = ?').get(req.params.id, bId);
    if (!pur) return res.status(404).json({ error: 'Purchase bill not found.' });

    const pItems = await db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ? AND business_id = ?').all(req.params.id, bId);

    // Revert stock increments
    for (const it of pItems) {
      await db.prepare('UPDATE items SET current_stock = current_stock - ? WHERE id = ? AND business_id = ?').run(it.quantity, it.item_id, bId);
      const rem = await db.prepare('SELECT current_stock FROM items WHERE id = ? AND business_id = ?').get(it.item_id, bId)?.current_stock || 0;
      await db.prepare(`
        INSERT INTO stock_transactions (business_id, item_id, transaction_type, reference_id, quantity_change, remaining_stock, reason)
        VALUES (?, ?, 'PURCHASE_CANCELLED', ?, ?, ?, ?)
      `).run(bId, it.item_id, pur.id, -it.quantity, rem, `Deleted Purchase Bill #${pur.purchase_number}`);
    }

    // Revert vendor balance if balance was due
    if (pur.vendor_id && pur.balance_due > 0) {
      await db.prepare('UPDATE parties SET current_balance = current_balance + ? WHERE id = ? AND business_id = ?').run(pur.balance_due, pur.vendor_id, bId);
    }

    // Delete any barcodes that were introduced with this purchase bill
    await db.prepare('DELETE FROM item_barcodes WHERE purchase_id = ? AND business_id = ?').run(req.params.id, bId);

    // Delete purchase items and purchase
    await db.prepare('DELETE FROM purchase_items WHERE purchase_id = ? AND business_id = ?').run(req.params.id, bId);
    await db.prepare('DELETE FROM purchases WHERE id = ? AND business_id = ?').run(req.params.id, bId);

    res.json({ message: `Purchase Bill #${pur.purchase_number} deleted and stock reverted.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 8. TENANT SALES INVOICES (STOCK-OUT)
// ----------------------------------------------------
app.get('/api/invoices', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    if (!bId) return res.json([]);

    const invoices = await db.prepare('SELECT * FROM invoices WHERE business_id = ? ORDER BY id DESC').all(bId);
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/invoices/:id', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    const invoice = await db.prepare('SELECT * FROM invoices WHERE id = ? AND business_id = ?').get(req.params.id, bId);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

    const items = await db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? AND business_id = ?').all(req.params.id, bId);
    res.json({ ...invoice, items, business: ctx.business });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/invoices', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    if (!bId) return res.status(400).json({ error: 'No business context.' });

    const {
      customer_id, customer_name, customer_phone, customer_gstin,
      place_of_supply, invoice_date, due_date, items,
      discount_amount, payment_mode, paid_amount, notes,
      converted_from_quotation_id
    } = req.body;

    if (!items || items.length === 0) return res.status(400).json({ error: 'No line items provided.' });

    const prefix = ctx.business?.invoice_prefix || 'INV-2026-';
    const count = await db.prepare('SELECT COUNT(*) as c FROM invoices WHERE business_id = ?').get(bId).c + 1;
    const invoiceNumber = `${prefix}${String(count).padStart(4, '0')}`;

    const custState = (place_of_supply && place_of_supply.trim()) || ctx.business?.state || 'Gujarat';
    const bizState = (ctx.business?.state && ctx.business.state.trim()) || 'Gujarat';
    const isInterState = custState.toLowerCase() !== bizState.toLowerCase();

    let totalTaxable = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;
    let subTotal = 0;

    for (const it of items) {
      const qty = parseFloat(it.quantity) || 1;
      const rate = parseFloat(it.sale_price) || 0;
      const gstRate = parseFloat(it.gst_rate) || 0;
      const disc = parseFloat(it.discount_percent) || 0;

      const rawAmount = qty * rate;
      const discAmount = (rawAmount * disc) / 100;
      const netTaxable = rawAmount - discAmount;
      const gstAmt = (netTaxable * gstRate) / 100;

      totalTaxable += netTaxable;
      if (isInterState) {
        igstTotal += gstAmt;
      } else {
        cgstTotal += gstAmt / 2;
        sgstTotal += gstAmt / 2;
      }
      subTotal += (netTaxable + gstAmt);
    }

    const overallDiscount = parseFloat(discount_amount) || 0;
    const finalAmount = Math.max(0, subTotal - overallDiscount);
    const roundedGrandTotal = Math.round(finalAmount);
    const roundOff = +(roundedGrandTotal - finalAmount).toFixed(2);

    const paid = parseFloat(paid_amount) || 0;
    const balanceDue = Math.max(0, roundedGrandTotal - paid);
    const paymentStatus = balanceDue === 0 ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'UNPAID');

    const invResult = await db.prepare(`
      INSERT INTO invoices (
        business_id, invoice_number, customer_id, customer_name, customer_phone, customer_gstin,
        place_of_supply, invoice_date, due_date, total_taxable, cgst_total, sgst_total, igst_total,
        discount_amount, round_off, grand_total, paid_amount, balance_due,
        payment_status, payment_mode, notes, converted_from_quotation_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      bId, invoiceNumber, customer_id || null, customer_name || 'Walk-in Customer', customer_phone || '', customer_gstin || '',
      custState, invoice_date || new Date().toISOString().split('T')[0], due_date || null,
      totalTaxable, cgstTotal, sgstTotal, igstTotal,
      overallDiscount, roundOff, roundedGrandTotal, paid, balanceDue,
      paymentStatus, payment_mode || 'CASH', notes || '', converted_from_quotation_id || null
    );

    const invoiceId = invResult.lastInsertRowid;

    for (const it of items) {
      const qty = parseFloat(it.quantity) || 1;
      const rate = parseFloat(it.sale_price) || 0;
      const gstRate = parseFloat(it.gst_rate) || 0;
      const disc = parseFloat(it.discount_percent) || 0;
      const netTaxable = (qty * rate) - ((qty * rate * disc) / 100);
      const gstAmt = (netTaxable * gstRate) / 100;
      const cgst = isInterState ? 0 : gstAmt / 2;
      const sgst = isInterState ? 0 : gstAmt / 2;
      const igst = isInterState ? gstAmt : 0;
      const itemTotal = netTaxable + gstAmt;

      const itemMeta = await db.prepare('SELECT purchase_price, current_stock FROM items WHERE id = ? AND business_id = ?').get(it.item_id, bId);
      const buyPrice = itemMeta?.purchase_price || 0;

      const serialBarcodeVal = it.serial_barcode ? (typeof it.serial_barcode === 'object' && it.serial_barcode !== null ? it.serial_barcode.barcode : String(it.serial_barcode)).trim() : null;

      await db.prepare(`
        INSERT INTO invoice_items (
          business_id, invoice_id, item_id, item_name, hsn_sac, unit, quantity,
          sale_price, purchase_price_snapshot, discount_percent, taxable_value,
          gst_rate, cgst_amount, sgst_amount, igst_amount, total_amount, serial_barcode
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        bId, invoiceId, it.item_id, it.item_name, it.hsn_sac || '', it.unit || 'Pcs',
        qty, rate, buyPrice, disc, netTaxable, gstRate, cgst, sgst, igst, itemTotal, serialBarcodeVal
      );

      // If specific machine barcode(s) were selected/sold, mark them as SOLD and remove from active stock!
      if (serialBarcodeVal) {
        const barcodesToMark = serialBarcodeVal.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
        const markSoldStmt = await db.prepare(`
          UPDATE item_barcodes SET 
            status = 'SOLD', 
            invoice_id = ?, 
            sold_at = CURRENT_TIMESTAMP 
          WHERE business_id = ? AND item_id = ? AND LOWER(barcode) = LOWER(?) AND status = 'AVAILABLE'
        `);

        for (const bc of barcodesToMark) {
          markSoldStmt.run(invoiceId, bId, it.item_id, bc);
        }
      }

      // Check if this item tracks serialized barcodes in item_barcodes
      const remainingAvailableBarcodes = await db.prepare(`
        SELECT COUNT(*) as c FROM item_barcodes 
        WHERE item_id = ? AND business_id = ? AND status = 'AVAILABLE'
      `).get(it.item_id, bId).c;

      // Deduct inventory stock
      let currentStockAfter;
      const totalBarcodes = await db.prepare('SELECT COUNT(*) as c FROM item_barcodes WHERE item_id = ? AND business_id = ?').get(it.item_id, bId).c;
      if (totalBarcodes > 0) {
        // Synchronize directly with available barcode count
        await db.prepare('UPDATE items SET current_stock = ? WHERE id = ? AND business_id = ?').run(remainingAvailableBarcodes, it.item_id, bId);
        currentStockAfter = remainingAvailableBarcodes;
      } else {
        await db.prepare('UPDATE items SET current_stock = current_stock - ? WHERE id = ? AND business_id = ?').run(qty, it.item_id, bId);
        currentStockAfter = (itemMeta?.current_stock || 0) - qty;
      }

      await db.prepare(`
        INSERT INTO stock_transactions (business_id, item_id, transaction_type, reference_id, quantity_change, remaining_stock, reason)
        VALUES (?, ?, 'SALE', ?, ?, ?, ?)
      `).run(bId, it.item_id, invoiceId, -qty, currentStockAfter, `Stock Out: Tax Invoice #${invoiceNumber}${serialBarcodeVal ? ' (Barcode: ' + serialBarcodeVal + ')' : ''}`);
    }

    if (customer_id && balanceDue > 0) {
      await db.prepare('UPDATE parties SET current_balance = current_balance + ? WHERE id = ? AND business_id = ?').run(balanceDue, customer_id, bId);
    }

    res.status(201).json({ id: invoiceId, invoice_number: invoiceNumber, grand_total: roundedGrandTotal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    const inv = await db.prepare('SELECT * FROM invoices WHERE id = ? AND business_id = ?').get(req.params.id, bId);
    if (!inv) return res.status(404).json({ error: 'Invoice not found.' });

    // Restore any machine barcodes sold on this invoice back to 'AVAILABLE' in stock!
    await db.prepare(`
      UPDATE item_barcodes SET 
        status = 'AVAILABLE', 
        invoice_id = NULL, 
        sold_at = NULL 
      WHERE invoice_id = ? AND business_id = ?
    `).run(req.params.id, bId);

    const items = await db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? AND business_id = ?').all(req.params.id, bId);
    for (const it of items) {
      const hasBarcodes = await db.prepare('SELECT COUNT(*) as c FROM item_barcodes WHERE item_id = ? AND business_id = ?').get(it.item_id, bId).c;
      if (hasBarcodes > 0) {
        const availableCount = await db.prepare("SELECT COUNT(*) as c FROM item_barcodes WHERE item_id = ? AND business_id = ? AND status = 'AVAILABLE'").get(it.item_id, bId).c;
        await db.prepare('UPDATE items SET current_stock = ? WHERE id = ? AND business_id = ?').run(availableCount, it.item_id, bId);
      } else {
        await db.prepare('UPDATE items SET current_stock = current_stock + ? WHERE id = ? AND business_id = ?').run(it.quantity, it.item_id, bId);
      }

      await db.prepare(`
        INSERT INTO stock_transactions (business_id, item_id, transaction_type, reference_id, quantity_change, remaining_stock, reason)
        VALUES (?, ?, 'SALE_RETURN', ?, ?, (SELECT current_stock FROM items WHERE id = ? AND business_id = ?), ?)
      `).run(bId, it.item_id, req.params.id, it.quantity, it.item_id, bId, `Cancelled Invoice #${inv.invoice_number}`);
    }

    if (inv.customer_id && inv.balance_due > 0) {
      await db.prepare('UPDATE parties SET current_balance = current_balance - ? WHERE id = ? AND business_id = ?').run(inv.balance_due, inv.customer_id, bId);
    }

    await db.prepare('DELETE FROM invoices WHERE id = ? AND business_id = ?').run(req.params.id, bId);
    res.json({ message: 'Invoice cancelled and stock restored to inventory' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 9. TENANT QUOTATIONS / ESTIMATES
// ----------------------------------------------------
app.get('/api/quotations', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    if (!bId) return res.json([]);
    const quotes = await db.prepare('SELECT * FROM quotations WHERE business_id = ? ORDER BY id DESC').all(bId);
    res.json(quotes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/quotations', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    if (!bId) return res.status(400).json({ error: 'No business context.' });

    const { customer_id, customer_name, customer_phone, quotation_date, valid_till, items, notes } = req.body;
    const count = await db.prepare('SELECT COUNT(*) as c FROM quotations WHERE business_id = ?').get(bId).c + 1;
    const qNum = `EST-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

    let grandTotal = 0;
    for (const it of items) {
      const taxable = (parseFloat(it.quantity) || 1) * (parseFloat(it.sale_price) || 0);
      grandTotal += taxable + (taxable * (parseFloat(it.gst_rate) || 0)) / 100;
    }

    const qResult = await db.prepare(`
      INSERT INTO quotations (business_id, quotation_number, customer_id, customer_name, customer_phone, quotation_date, valid_till, grand_total, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(bId, qNum, customer_id || null, customer_name || 'Valued Customer', customer_phone || '', quotation_date, valid_till || null, grandTotal, notes || '');

    const qId = qResult.lastInsertRowid;
    for (const it of items) {
      const taxable = it.quantity * it.sale_price;
      const total = taxable + (taxable * it.gst_rate) / 100;
      await db.prepare(`
        INSERT INTO quotation_items (business_id, quotation_id, item_id, item_name, hsn_sac, unit, quantity, sale_price, gst_rate, taxable_value, total_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(bId, qId, it.item_id, it.item_name, it.hsn_sac || '', it.unit || 'Pcs', it.quantity, it.sale_price, it.gst_rate, taxable, total);
    }

    res.status(201).json({ id: qId, quotation_number: qNum, grand_total: grandTotal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/quotations/:id/convert-to-invoice', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    if (!bId) return res.status(400).json({ error: 'No business context.' });

    const quote = await db.prepare('SELECT * FROM quotations WHERE id = ? AND business_id = ?').get(req.params.id, bId);
    if (!quote) return res.status(404).json({ error: 'Quotation not found.' });

    if (quote.status === 'CONVERTED_TO_INVOICE' && quote.converted_invoice_id) {
      return res.status(400).json({ 
        error: 'Quotation already converted to Invoice.', 
        invoice_id: quote.converted_invoice_id 
      });
    }

    const qItems = await db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ? AND business_id = ?').all(req.params.id, bId);
    if (!qItems || qItems.length === 0) {
      return res.status(400).json({ error: 'Quotation has no line items to convert.' });
    }

    // Determine place of supply and home state
    const homeState = ctx?.business?.state || 'Gujarat';
    let customerState = homeState;
    let customerGstin = '';
    let customerPhone = quote.customer_phone || '';

    if (quote.customer_id) {
      const party = await db.prepare('SELECT * FROM parties WHERE id = ? AND business_id = ?').get(quote.customer_id, bId);
      if (party) {
        customerState = party.state || homeState;
        customerGstin = party.gstin || '';
        if (party.phone) customerPhone = party.phone;
      }
    }

    const isInterState = customerState.trim().toLowerCase() !== homeState.trim().toLowerCase();
    const today = new Date().toISOString().split('T')[0];

    // Generate Invoice Number
    const prefix = ctx.business?.invoice_prefix || 'INV-2026-';
    const invCount = await db.prepare('SELECT COUNT(*) as c FROM invoices WHERE business_id = ?').get(bId).c + 1;
    const invNumber = `${prefix}${String(invCount).padStart(4, '0')}`;

    let totTaxable = 0, totCgst = 0, totSgst = 0, totIgst = 0, grand = 0;

    for (const it of qItems) {
      const qty = parseFloat(it.quantity) || 1;
      const price = parseFloat(it.sale_price) || 0;
      const gstRate = parseFloat(it.gst_rate) || 0;
      const taxable = qty * price;
      const gstAmt = (taxable * gstRate) / 100;

      totTaxable += taxable;
      if (isInterState) {
        totIgst += gstAmt;
      } else {
        totCgst += gstAmt / 2;
        totSgst += gstAmt / 2;
      }
      grand += taxable + gstAmt;
    }

    const roundedGrand = Math.round(grand);

    // Create Invoice (Default payment: CREDIT with balance due, or can be settled immediately)
    const invRes = await db.prepare(`
      INSERT INTO invoices (
        business_id, invoice_number, invoice_type, customer_id, customer_name,
        customer_phone, customer_gstin, place_of_supply, invoice_date, due_date,
        total_taxable, cgst_total, sgst_total, igst_total, discount_amount, round_off,
        grand_total, paid_amount, balance_due, payment_status, payment_mode, notes,
        converted_from_quotation_id
      ) VALUES (?, ?, 'TAX_INVOICE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 0, ?, 'UNPAID', 'CREDIT', ?, ?)
    `).run(
      bId, invNumber, quote.customer_id || null, quote.customer_name,
      customerPhone, customerGstin, customerState, today, today,
      totTaxable, totCgst, totSgst, totIgst, roundedGrand, roundedGrand,
      `Converted from Quotation #${quote.quotation_number}`, quote.id
    );

    const invoiceId = invRes.lastInsertRowid;

    // Insert Invoice Items & Deduct Stock
    for (const it of qItems) {
      const qty = parseFloat(it.quantity) || 1;
      const price = parseFloat(it.sale_price) || 0;
      const gstRate = parseFloat(it.gst_rate) || 0;
      const taxable = qty * price;
      const gstAmt = (taxable * gstRate) / 100;
      const cgst = isInterState ? 0 : gstAmt / 2;
      const sgst = isInterState ? 0 : gstAmt / 2;
      const igst = isInterState ? gstAmt : 0;
      const lineTotal = taxable + gstAmt;

      // Fetch master item info for purchase price snapshot & stock deduction
      const masterItem = await db.prepare('SELECT * FROM items WHERE id = ? AND business_id = ?').get(it.item_id, bId);
      const purchasePrice = masterItem ? masterItem.purchase_price : 0;

      await db.prepare(`
        INSERT INTO invoice_items (
          business_id, invoice_id, item_id, item_name, hsn_sac, unit,
          quantity, sale_price, purchase_price_snapshot, discount_percent,
          taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount,
          total_amount, serial_barcode
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, NULL)
      `).run(
        bId, invoiceId, it.item_id, it.item_name, it.hsn_sac || '', it.unit || 'Pcs',
        qty, price, purchasePrice, taxable, gstRate, cgst, sgst, igst, lineTotal
      );

      // Deduct warehouse stock
      if (masterItem) {
        await db.prepare('UPDATE items SET current_stock = current_stock - ? WHERE id = ? AND business_id = ?').run(qty, it.item_id, bId);
        const remStock = (masterItem.current_stock || 0) - qty;
        await db.prepare(`
          INSERT INTO stock_transactions (business_id, item_id, transaction_type, reference_id, quantity_change, remaining_stock, reason)
          VALUES (?, ?, 'OUT', ?, ?, ?, ?)
        `).run(bId, it.item_id, invoiceId, -qty, remStock, `Quotation #${quote.quotation_number} Converted`);
      }
    }

    // Update Quotation status
    await db.prepare(`
      UPDATE quotations SET
        status = 'CONVERTED_TO_INVOICE',
        converted_invoice_id = ?
      WHERE id = ? AND business_id = ?
    `).run(invoiceId, quote.id, bId);

    res.json({
      message: 'Quotation converted successfully to Tax Invoice.',
      invoice_id: invoiceId,
      invoice_number: invNumber,
      grand_total: roundedGrand
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/quotations/:id', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    if (!bId) return res.status(400).json({ error: 'No business context.' });

    await db.prepare('DELETE FROM quotation_items WHERE quotation_id = ? AND business_id = ?').run(req.params.id, bId);
    await db.prepare('DELETE FROM quotations WHERE id = ? AND business_id = ?').run(req.params.id, bId);
    res.json({ message: 'Quotation deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 10. TENANT REPORTS
// ----------------------------------------------------
app.get('/api/reports/stock-summary', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    if (!bId) return res.json([]);

    const report = await db.prepare(`
      SELECT 
        id, name, sku, hsn_sac, category, unit,
        purchase_price, sale_price, current_stock, min_stock_alert,
        (current_stock * purchase_price) as stock_valuation,
        CASE WHEN current_stock <= min_stock_alert THEN 'REORDER_NOW' ELSE 'NORMAL' END as stock_status
      FROM items WHERE business_id = ? AND is_active = 1
      ORDER BY current_stock ASC
    `).all(bId);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/gstr1', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    if (!bId) return res.json([]);

    const summary = await db.prepare(`
      SELECT 
        ii.gst_rate,
        COUNT(DISTINCT i.id) as invoice_count,
        SUM(ii.taxable_value) as total_taxable,
        SUM(ii.cgst_amount) as total_cgst,
        SUM(ii.sgst_amount) as total_sgst,
        SUM(ii.igst_amount) as total_igst,
        SUM(ii.total_amount) as total_invoice_value
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      WHERE ii.business_id = ?
      GROUP BY ii.gst_rate
      ORDER BY ii.gst_rate ASC
    `).all(bId);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/profit-loss', async (req, res) => {
  try {
    const ctx = await getAuthContext(req);
    const bId = ctx?.businessId;
    if (!bId) {
      return res.json({ 
        summary: { total_revenue: 0, total_cost: 0, gross_profit: 0, margin_percent: 0, invoice_count: 0 }, 
        invoices: [], 
        trend: [], 
        filter: { period: 'all', label: 'All Time' } 
      });
    }

    const invFilter = buildDateFilter('i.invoice_date', req.query);

    const invoices = await db.prepare(`
      SELECT 
        i.id,
        i.invoice_number,
        i.invoice_date,
        i.customer_name,
        COALESCE(SUM(ii.taxable_value), 0) as total_revenue,
        COALESCE(SUM(ii.quantity * ii.purchase_price_snapshot), 0) as total_cost,
        COALESCE(SUM(ii.taxable_value - (ii.quantity * ii.purchase_price_snapshot)), 0) as gross_profit,
        ROUND((COALESCE(SUM(ii.taxable_value - (ii.quantity * ii.purchase_price_snapshot)), 0) / NULLIF(SUM(ii.taxable_value), 0)) * 100, 1) as margin_percent
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      WHERE ii.business_id = ? ${invFilter.clause}
      GROUP BY i.id
      ORDER BY i.invoice_date DESC, i.id DESC
    `).all(bId, ...invFilter.params);

    let totalRevenue = 0;
    let totalCost = 0;
    let grossProfit = 0;

    for (const inv of invoices) {
      totalRevenue += inv.total_revenue || 0;
      totalCost += inv.total_cost || 0;
      grossProfit += inv.gross_profit || 0;
    }

    const overallMargin = totalRevenue > 0 ? parseFloat(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0;

    // Build chronological trend points for charts
    const trendMap = {};
    const sortedChrono = [...invoices].sort((a, b) => a.invoice_date.localeCompare(b.invoice_date));
    for (const inv of sortedChrono) {
      const d = inv.invoice_date;
      if (!trendMap[d]) {
        const parts = d.split('-');
        const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
        trendMap[d] = { key: d, label, revenue: 0, cost: 0, profit: 0, count: 0 };
      }
      trendMap[d].revenue += inv.total_revenue || 0;
      trendMap[d].cost += inv.total_cost || 0;
      trendMap[d].profit += inv.gross_profit || 0;
      trendMap[d].count += 1;
    }

    const trend = Object.values(trendMap).map(t => ({
      key: t.key,
      label: t.label,
      revenue: Math.round(t.revenue),
      cost: Math.round(t.cost),
      profit: Math.round(t.profit),
      margin_percent: t.revenue > 0 ? parseFloat(((t.profit / t.revenue) * 100).toFixed(1)) : 0
    }));

    res.json({
      summary: {
        total_revenue: Math.round(totalRevenue),
        total_cost: Math.round(totalCost),
        gross_profit: Math.round(grossProfit),
        margin_percent: overallMargin,
        invoice_count: invoices.length
      },
      invoices,
      trend,
      filter: {
        period: req.query.period || 'all',
        label: invFilter.label
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`⚡ DG Billing Backend running on http://localhost:${PORT}`);
  });
}

export default app;
