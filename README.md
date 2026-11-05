# DG Billing — Cloud GST Billing & Machinery ERP Platform

DG Billing is a high-performance GST billing, machinery inventory control, and multi-tenant SaaS accounting system designed for Indian businesses and agricultural machinery dealers.

Built with **React 19 + Vite**, **Express REST API**, and **Turso Cloud Database (libSQL)**, ready for instant serverless deployment on **Vercel**.

---

## 🌟 Key Features

* **Cloud-Native Database**: Backed by **Turso (libSQL)** in AWS Mumbai (`ap-south-1`) with permanent cloud persistence.
* **Executive Analytics Command Center**: Real-time business KPIs, Revenue & Net Profit bezier curve, Sales vs Cost comparative bars, and Payment Mix tracker (Cash, UPI, NEFT, Udhar).
* **Date & Period Filters**: Interactive filtering for *Today*, *This Month*, *This Year*, *All Time*, and *Custom Date Ranges*.
* **Machine Series Number Tracking**: Serialized barcode management with per-machine tracking (available vs sold).
* **GST & Tax Rules**: Automatic detection for Intra-State (CGST 50% + SGST 50%) vs Inter-State (IGST 100%). Defaulted to Gujarat (`24`).
* **Multi-Tenant Architecture**: Complete tenant isolation per business account with Super Admin management portal.
* **Print & PDF Invoicing**: Standard A4 and 3-inch POS Thermal invoice formats with automatic customer name and date file naming.
* **100% Mobile Responsive**: Touch-friendly sidebar drawer and responsive tables.

---

## 🚀 Local Development

1. Install dependencies:
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

2. Configure environment variables in `server/.env` (see `.env.example`):
   ```ini
   TURSO_DATABASE_URL=libsql://dgbilling-dhruvg.aws-ap-south-1.turso.io
   TURSO_AUTH_TOKEN=your_auth_token
   PORT=5050
   ```

3. Run both backend and frontend:
   ```bash
   node start.mjs
   ```

* Frontend: `http://localhost:5174`
* Backend API: `http://localhost:5050/api`

---

## ☁️ Deploy to Vercel

1. Import this repository into [Vercel](https://vercel.com).
2. In Project Settings ➔ **Environment Variables**, add:
   * `TURSO_DATABASE_URL`
   * `TURSO_AUTH_TOKEN`
3. Click **Deploy**!
