# CABMITRA
### Cab Operations, Corporate Billing & Vendor Settlement Management Platform

CabMitra is a production-ready, modular, and scalable enterprise SaaS / ERP platform built for corporate employee transport management, client tax billing, vendor settlement payouts, and data standardization.

---

## 🌟 Core Product Principle

**Spreadsheet Standardization Engine**: Regardless of the format or headers a corporate client uploads (e.g. `FinalKMS`, `VehicleRegNo`, `EmployeeCount`, `DutyDate`), CabMitra dynamically maps and converts it into **One Standardized Internal Trip Schema**:

`trip_date`, `client_id`, `vendor_id`, `vehicle_id`, `vehicle_number`, `vehicle_type`, `employee_count`, `total_km`, `trip_category`, `bill_category`, `km_slab`, `trip_rate`, `trip_revenue`, `vendor_cost`, `status`

All downstream engines (Pricing, Invoicing, Settlements, Reports, Analytics) operate exclusively on this standardized schema.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Lucide Icons, Recharts, React Router v6, Axios.
- **Backend**: Node.js, Express / NestJS Architecture, TypeScript, JWT Auth, RBAC Middleware, Multer, PapaParse, XLSX, PDFKit, Razorpay SDK, Nodemailer.
- **Database**: PostgreSQL (with SQLite zero-config local fallback), Prisma ORM (Foreign Keys, Indexes, Transactions, Audit Logging).
- **Deployment**: Docker, docker-compose, Cloudflare Pages.

---

## 🔑 Demo Access Credentials

The database comes pre-populated with realistic Indian corporate cab dataset (Infosys, TCS, Wipro, Tech Mahindra, Accenture, 10 Vendors, 20 Vehicles, 115+ Trips).

Password for all accounts: **`Password@123`**

| Role | Email Address | Description |
| :--- | :--- | :--- |
| **ADMIN** | `admin@cabmitra.com` | Full system access & settings |
| **OPERATIONS** | `operations@cabmitra.com` | Excel/CSV Import, Column Mapping & Trips |
| **ACCOUNTS** | `accounts@cabmitra.com` | Client Invoicing, Vendor Settlements & Payments |
| **VENDOR** | `vendor@cabmitra.com` | Vendor Portal (Earnings & Payout Statements) |
| **CLIENT** | `client@cabmitra.com` | Corporate Client Portal (Tax Invoices & Usage) |

*Note: A quick 1-click Demo Role Switcher is available at the top header bar of the application.*

---

## 🚀 Quick Start Guide

### 1. Backend Setup
```bash
cd backend
npm install
npx prisma db push
npx prisma db seed
npm run dev
```
Backend API will start on **`http://localhost:5000`** (Health check: `http://localhost:5000/health`).

### 2. Frontend Setup
Open a second terminal window:
```bash
cd frontend
npm install
npm run dev
```
Frontend web application will start on **`http://localhost:3000`**.

---

## 🐳 Docker Setup
Run the entire production stack (PostgreSQL 15, Redis, Backend, Frontend) with a single command:
```bash
docker-compose up --build -d
```

---

## 💼 Core Business Modules

1. **Dashboard & Analytics**: Real-time database aggregations for Total Trips, Distance Run (KM), Revenue, Vendor Payout Costs, Gross Margin %, and Recharts trend graphs.
2. **Trips Management**: Searchable tabular log with status badges (`VALIDATED`, `PROCESSED`, `INVOICED`, `SETTLED`) and a manual trip entry modal with live backend pricing calculation breakdown preview.
3. **Excel / CSV Import Center**: 12-step guided spreadsheet import workflow with fuzzy column mapping suggestions, row-level validation, duplicate detection, and downloadable error logs.
4. **Tariff & Pricing Engine**: Client & vehicle type specific KM slab pricing rules (e.g. 0–15 KM, 16–25 KM, 26–40 KM, 40+ KM).
5. **Razorpay Online Payment System**: Instant Razorpay Checkout Popup modal supporting UPI (PhonePe, GPay, Paytm), Cards, Netbanking, QR codes, signature verification, and automated refunds.
6. **Client Billing & Invoicing**: Automated invoice generation with 5% GST (2.5% CGST + 2.5% SGST) and streaming PDF download.
7. **PDF Generator & Automated Email Delivery**: Automated PDF email dispatch for tax invoices, payment receipts, and vendor payouts via Nodemailer.
8. **Communication Center & Mailbox (`/email-center`)**: Centralized in-app inbox to track all outbound sent emails and incoming client/vendor inquiries with live preview.
9. **Vendor Settlement Engine**: Grouped trip calculation by period & vehicle slab, deduction penalties, approval workflow, UTR payment recording, and PDF payout summary download.
10. **Financial Reports & Audit Trail**: CSV report exports (Trips, P&L Statement) and immutable audit trail logs.
