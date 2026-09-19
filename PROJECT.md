## Developer Onboarding

Alban Zaman Dairy POS & Back-Office System

TECHNICAL SPEC V1.0

## 1 THE BUSINESS DOMAIN

Purpose: A specialized Point-of-Sale (POS) and back-office management system tailored for a fresh dairy retail chain operating in Saudi Arabia. The system centralizes real-time checkout, vendor payment tracking, employee payroll, and inventory auditing.

## Cashiers

Scan products, execute retail sales, manage returns, and reconcile cash drawer shifts.

## Managers / Admins

Maintain product catalogs, staff records, vendor bills, operational expenses, and custom reports.

## Business Owner

Track net profit, operational costs, outstanding receivables, and multi- branch metrics.

## Real-World Operational Scenario

A customer purchases milk, yogurt, and eggs at "Downtown Fresh Dairy". The cashier scans barcodes or searches items. The system deducts stock immediately, calculates 15% VAT-inclusive prices, processes a split payment (cash + loyalty points), prints an itemized receipt, and credits new points. Dashboard alerts trigger automatically if perishable items near expiration. At shift end, physical cash drawer counts are balanced against calculated totals.

## 2 ARCHITECTURE & TECH STACK

Key Architecture Note: This project deviates from a standard MERN stack. MongoDB is replaced with file-based SQLite (via better-sqlite3), and Vite serves as the application build engine.

| Layer Technology Role / Impact Frontend Framework React 19 + TypeScript Strict type-safe interface components Styling & Motion Tailwind CSS v4 + Motion Utility styling via @tailwindcss/vite; Framer Motion successor UI Libraries Recharts + Lucide React Data visualization dashboards & clean system iconography Runtime & Build Vite 6 + tsx execution Direct TypeScript execution for backend without separate build phase Backend Engine Express 4 + better-sqlite3 Synchronous, lightweight file-based API server layer Auth & State JWT + React Context No Redux/Zustand; global app scope managed in AppContext |
| --- |
| Database File alban-dairy.db SQLite database residing directly in the root directory |

## Frontend ↔ Backend Communication & Sync Gateway

── Vite Proxy (/api/*)

Browser

localhost:3000 ──►

The apiFetch() utility (src/context/AuthContext.tsx) serves as the unified API gateway:

- Automatically injects the Authorization: Bearer <jwt> authorization token into headers.

- Handles 401 Unauthorized responses by instantly terminating session and triggering a page reload.

- Dual-Persistence Strategy: On boot, initial state fetches from SQLite. Subsequent updates are debounced by 400ms and synced via PUT /api/collection/:name while localStorage operates as an offline fallback.

SQLite DB

── better-sqlite3

Express Server

alban- dairy.db

localhost:4000 ──►


## 3 CODE STRUCTURE & KEY COMPONENTS

alban-zaman-dairy/ ├── server/ │ └── index.ts ← Monolithic backend (routes, DB setup, auth, se

## The 5 Core Engine Files

| # File Path | Responsibility |
| --- | --- |
| 1 src/context/AppContext.tsx | Central brain; stores state arrays and exposes all domain action helpers. |
| 2 server/index.ts | Complete server app; initializes SQLite, defines API endpoints and seed |
|   | data. |
| 3 src/types.ts | Single source of truth for all data structures and domain entities. |
| 4 src/components/pos/POSScreen.tsx | Primary retail interface handling real-time item scans and checkout |
|   | triggers. |
| 5 src/context/AuthContext.tsx | Session management, security tokens, and underlying HTTP transport |
|   | network. |

## 4 FULL-CYCLE WORKFLOW: POS CHECKOUT

Understanding how a transaction moves from UI input to permanent disk storage:

## Step 1: Item Selection & Tax Calculation

Cashier scans item. addToCart() checks inventory and generates a SaleItem object. VAT (15%) is calculated using the VAT-inclusive formula: taxAmount = (lineTotal * taxRate) / (100 + taxRate).

POSScreen.tsx

Keyboard shortcut F4 or Ctrl+Enter opens PaymentModal pre-populated with total balances.

POSScreen.tsx

## Step 2: Modal Trigger & Shortcut Execution

## Step 3: Payment Split & Submission

Cashier divides payments (cash, card, loyalty). handleComplete() invokes completeSale() in AppContext.

AppContext.tsx

Performs 5 critical operations in sequence: (1) Deducts product quantities, (2) Emits inventory movements, (3) Updates customer loyalty balances, (4) Updates shift balances, (5) Pushes final transaction to sales state.

AppContext.tsx → server/index.ts

State mutation triggers useEffects. queueServerSync() debounces requests (400ms) and dispatches parallel PUT /api/collection/* calls. Express executes INSERT ... ON CONFLICT DO UPDATE on SQLite.

ReceiptModal.tsx

PaymentModal.tsx

## Step 4: Atomic Execution in AppContext

## Step 5: React Effect & Server Synchronization

## Step 6: Receipt Rendering

System receives confirmed sale state and pops up a printable customer receipt modal.


## 5 DEVELOPER SETUP & TECHNICAL DEBT

## Environment Variables & Local Execution

## 1. Set Up Environment

Copy .env.example to .env. Ensure PORT=4000 and JWT_SECRET are set.

Default System Credentials: Admin Access: admin / admin123 | Seed Staff: alban2026

## 2. Install Dependencies

Run npm install to fetch both frontend dependencies and native SQLite bindings.

## 3. Launch Environment

Run npm run dev:all to launch Express (:4000) and Vite (:3000) concurrently.

## Critical Gotchas & Architectural Constraints

## 1. AppContext Monolith (1,536 lines)

Nearly all domain logic (sales, returns, payroll, stock logic) resides in AppContext.tsx. Be extremely careful when adding state dependencies to avoid infinite re-render loops within the primary sync effect.

## 2. JSON Blob Database Model

SQLite stores full collections (e.g., all products) as single JSON blobs in one table row. Every update overwrites the entire collection. This lacks relational SQL querying capabilities and will hit scalability limits on large data sizes.

## 3. Dual-Persistence Synchronization Drift

localStorage and SQLite write independently. If the Express backend drops, local storage continues recording operations, leading to potential state sync mismatch when connectivity restores.

## 4. VAT Calculation Scheme (Inclusive)

Prices stored in the system are inclusive of 15% Saudi VAT. The mathematical formula is tax = price * 15 / 115. Do NOT change this to an additive model (price * 0.15), or accounting reports will be corrupted.

## 5. Bootstrapping Race Condition Guard

The bootstrapped flag (AppContext.tsx:354) blocks background server sync until initial SQLite state is loaded. Bypassing this flag will overwrite server data with empty client states.

## 6. Entity ID Collisions & Session Timeouts

IDs are generated via Date.now(), creating risk for collisions during rapid batch actions. Additionally, JWTs expire in 12 hours with no refresh token mechanism, forcing full client re-authentication.
