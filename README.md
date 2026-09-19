# Alban Zaman Dairy — POS & Business Management System

A bilingual (English / Arabic) retail Point-of-Sale and business management system for fresh dairy and food retail shops, with **SQLite persistence**. It is a single-owner system — no login is required and every user has full access.

## Features

- **Point of Sale (POS)** with barcode scanner support, held orders, split/mixed payments (cash, card, bank, loyalty) and thermal receipt printing.
- **Dashboard** with real-time KPIs, profit vs. sales charts.
- **Products / Inventory / Expiry** management with perishable dairy expiry watch.
- **Returns & Refunds**, **Loyalty program**, **Purchases & Vendors**.
- **Employees & Shifts** — cashier shift open/close with drawer reconciliation.
- **Finance** — expenses, payroll, fixed assets and loans.
- **Reports**, **Branches**, and **Alerts & Due Dates**.
- **No authentication** — single owner (Administrator/Owner) with full access to every module.

## Access Model

The system is a **single-owner** setup: there is no login screen, no users table, and no role checks. The cashier operating the machine is the owner (Administrator) and has full access to every module, including creating staff, editing products, and wiping/resetting data.

## Storage

All data is persisted in a local **SQLite** database file: `alban-dairy.db` (created automatically on first run, seeded with a realistic demo dataset). This replaces the previous browser-only localStorage storage. A Node/Express backend (`server/index.ts`) serves both the REST API and the built frontend.

## Run Locally

**Prerequisites:** Node.js (npm)

1. Install dependencies:
   ```
   npm install
   ```
2. Run the backend + frontend together (development with hot reload):
   ```
   npm run dev:all
   ```
   - Backend (Express + SQLite) runs on `http://localhost:4000`
   - Frontend (Vite) runs on `http://localhost:3000` and proxies `/api` to the backend.

   Or run them separately:
   - `npm run server` — Express + SQLite backend only
   - `npm run dev` — Vite frontend only

3. Production build (backend serves the built frontend):
   ```
   npm run build
   npm start
   ```
   Then open `http://localhost:4000`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite frontend dev server |
| `npm run server` | Express + SQLite backend |
| `npm run dev:all` | Backend + frontend together |
| `npm run build` | Production build of the frontend |
| `npm start` | Run the backend (serves built frontend if present) |
| `npm run lint` | TypeScript type-check |

## Tech Stack

React 19, TypeScript, Vite, Tailwind CSS v4, Express, better-sqlite3, Recharts.
