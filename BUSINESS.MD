# BUSINESS.MD — Alban Zaman Dairy
## Business Features & Workflow Specification

**Product:** Alban Zaman Dairy — POS & Back-Office Management System
**Sector:** Fresh dairy & food retail chain (Saudi Arabia, SAR currency)
**Language:** Arabic-first UI (RTL); English underlying implementation
**Companion file:** `PROJECT.md` (developer / technical spec). Read both together as the full guide for implementing features, changing business logic, or modifying workflows.

---

## 1. BUSINESS OVERVIEW

Alban Zaman Dairy is a specialized Point-of-Sale (POS) and back-office management system for a fresh dairy retail chain. It centralizes, in one application:

- Real-time checkout (barcode scanning, split payments, thermal receipts, held orders)
- Product catalog & inventory with perishable-dairy expiry watch
- Customer returns & refunds
- Loyalty program (points + store credit)
- Purchasing & vendor / accounts-payable tracking
- Employee records, cashier shifts, and cash-drawer reconciliation
- Finance: operating expenses, monthly payroll, fixed assets & depreciation, loans
- Multi-branch and multi-register support
- Alerts & due-date reminders
- Executive and branch reports
- Settings, data reset, and database backup

The system is **single-owner**: there is no login screen, no users table, and no role-based access checks. The cashier operating the machine is the owner and has full access to every module, including creating staff, editing products, and wiping/resetting data.

### Reference business scenario
A customer purchases milk, yogurt, and eggs at a branch. The cashier scans barcodes (or searches). The system deducts stock immediately, applies VAT-inclusive pricing (15% Saudi VAT), processes a split payment (cash + loyalty points), prints an itemized receipt, credits new points, and updates the open shift. At shift end, physical cash drawer counts are balanced against the system's calculated expectations. Expiry alerts automatically flag dairy nearing its sell-by date.

---

## 2. ROLES & ACCESS MODEL

| Who | Responsibility | Access |
| --- | --- | --- |
| Owner / Administrator | Full system management | Everything (no auth, no roles enforced) |
| Managers | Catalogs, staff, vendor bills, expenses, reports | Everything (same single session) |
| Cashiers | Scanning, sales, returns, shift open/close | Everything (same single session) |

**Design note:** The "current employee" (`currentEmployee`) is the name stamped on sales, returns, shifts, movements, expenses, etc. Cashiers may switch the current employee (e.g., at shift open) so records are attributed correctly, but no permission gating exists.

---

## 3. CORE BUSINESS ENTITIES (WHAT THE SYSTEM TRACKS)

| Entity | Business meaning | Key fields |
| --- | --- | --- |
| Branch | A physical store location | name, nameAr, code (uppercased), address, phone, isDefault, isActive |
| Register | A POS terminal / checkout device inside a branch | name, code, branchId |
| Employee | Staff member | name, nameAr, employeeCode, position, role, branchId, salary, status |
| Shift | One cashier's work session at one register | openingCash, cash/card/bank/mixed/loyaltySales, cashRefunds, expensesCash, expectedCash, actualCash, difference, status(Open/Closed) |
| Product | Sellable item | name, nameAr, sku, barcode, category, unit, costPrice, salePrice, minSalePrice, currentStock, minStock, expiryDate, batchNumber, isPerishable, priceHistory |
| ProductCategory | Product grouping | name, nameAr, icon, color |
| InventoryMovement | Audit trail of stock change | product, type(sale/customer_return/purchase/vendor_return/adjustment/branch_transfer), qty, reference, batch, date, branch, employee |
| Customer | Loyalty participant | name, phone, email, address, loyaltyPointsBalance, totalPointsEarned/Redeemed, outstandingBalance (credit tab) |
| LoyaltyTransaction | Points earned / redeemed / reversed | type, points, amountEquivalent, referenceSaleId |
| LoyaltySettings | Program configuration | enabled, pointsEarnedPerAmountSpent, pointRedemptionValue, minPointsForRedemption, maxPercentPayableWithPoints |
| Sale | Completed invoice | receiptNumber, branch/register/employee/shift, items, subtotal, discountTotal, total, totalCost, totalProfit, paymentMethod, payments[], points earned/redeemed, status |
| HeldOrder | Suspended / held cart at the register | holdNumber, customer, items, heldAt |
| ReturnRecord | Customer refund | returnNumber, originalSale, items, totalRefundAmount, reversedCost, reversedPoints, refundMethod, reason |
| Vendor | Supplier | name, phone, email, address, paymentTerms, balance (accounts payable) |
| PurchaseOrder | Goods order to supplier | poNumber, vendor, items, totalAmount, status Pending→Received→Paid/Cancelled |
| VendorReturn | Goods returned to supplier | returnNumber, vendor, items, totalAmount, reason |
| Expense | Operational cost | expenseType (rent, power, transport, marketing, …), amount, paymentMethod, paidFromShift |
| Salary | Payroll slip per employee/month | monthYear, basicSalary, allowances, bonuses, deductions, advances, netSalary, status Pending/Paid |
| Asset | Fixed asset | category (Refrigeration, Vehicles, Machinery, IT/POS, Fixtures), cost, usefulLifeYears, salvageValue, depreciationRate |
| Loan | Business loan (received or given) | type, lender/counterparty, principal, interestRate, installmentsCount, paidAmount, remainingBalance, status Active/Settled |
| ScannerSettings | Barcode parsing configuration | prefixes, sensitivity, weighted-barcode flags, audio, etc. |

---

## 4. FEATURES BY MODULE

### 4.1 Point of Sale (POS) — `POS Screen`
- Product grid with category filter, search by name (En/Ar), SKU or barcode.
- **Barcode scanning** with fallback chain: exact → scale weight (PLU+grams) → prefix strip → suffix match → prefix prepend. Unrecognized codes prompt quick product creation inline.
- **Auto-restock request:** adding an out-of-stock item is blocked; the system auto-creates a `Pending` purchase order (no duplicate while one is pending).
- **Custom order lines** (manual non-stock items, marked as custom, no stock effect).
- **Cart:** quantity +/- (capped at current stock), per-line remove, order-level % discount (quick presets 0/5/10/15%), hold cart, resume held order.
- **Customer selection** by name/phone, quick add customer, loyalty banner with redeem-points checkbox.
- **Checkout** via `PaymentModal` — see §6.2.
- **Receipt** via `ReceiptModal` — printable thermal receipt.

Keyboard shortcuts: `F2`/`Ctrl+K` focus search, `F4` or `Ctrl+Enter` checkout, `F8` hold cart, `Ctrl+H` held orders, `Ctrl+B` scanner settings, `Ctrl+U` add customer, `Ctrl+Backspace`/`Ctrl+Delete` clear cart, `?` or `Ctrl+/` shortcuts overlay.

### 4.2 Dashboard
- Today's KPIs: **revenue, profit, orders count, refunds count**.
- **Low stock** list (`currentStock <= minStock`) and **expiring soon** list (≤ 7 days, oldest first).
- Sales vs profit chart; sales by payment method; last 6 orders; top products by revenue/units.
- Quick action to add an expense.

### 4.3 Alerts Module — "التنبيهات والمواعيد"
Central urgency hub with 5 categories and urgency levels `critical` / `warning` / `upcoming`:
1. **Expiry:** products ≤ 3 days to expiry (critical) or ≤ 7 days (upcoming).
2. **Salaries:** pending salary slips for the month; amount = `netSalary`, or `emp.salary + 300` if no slip generated. Critical when 3+ days past the 1st.
3. **Vendors:** unpaid purchase orders past their deadline (critical) or due within 7 days (upcoming); quick action to create a supply PO.
4. **Stock:** low-stock items (`currentStock <= minStock`) with suggested min.
5. **Loans:** active loans; monthly installment = `monthlyInstallment || principal / installmentsCount`; quick "pay installment" action.

Also includes a **Flash Discount** modal (clearance pricing) with presets **20/30/40/50%** off and a **Pay Salary** modal (see §6.11).

### 4.4 Products & Catalog
- Full CRUD, category/branch filters, barcode capture, **price history** per product.
- **Bulk update** (price % or fixed, category reassignment, activate/deactivate, stock: target min stock, "today + 14 days" expiry default).
- **Bulk delete** and **CSV export**.
- Price edits preserve a price-history trail (`from → to` for sale & cost price).

### 4.5 Inventory
Three tabs:
- **Stock:** counts, low/out-of-stock states, search & category filter.
- **Perishables:** shelf-life classification — `expired`, `critical` (≤ 3 days), `upcoming` (4–7 days), `safe` (> 7 days).
- **Movements:** full audit log of every stock change.
- Actions: **adjust stock** (add/subtract/recount; default +5, default reason "Routine physical inventory cycle count") and **transfer stock** between branches (default qty 5, default note "Chilled van transfer").

### 4.6 Orders (Sales History)
- Searchable list of all sales with filters (status, branch, date range).
- Statuses: `Completed`, `Refunded`, `Partially_Refunded`, `Cancelled`.
- Per-sale drill-down (items, payments). Refund button only on `Completed` sales.
- Average ticket shown per order.

### 4.7 Returns & Refunds
- Search previous sales by receipt number / sale ID / customer name.
- Per-item return quantity editor is used only against **Completed** sales.
- Refund methods: **cash | card | original | store_credit**.
- Default reason: "Damaged / Sour Dairy".
- Processing restores stock, reverses loyalty points, adjusts the open shift (cash refunds reduce expected cash), and flips the sale to `Refunded` (full) or `Partially_Refunded`.

### 4.8 Loyalty Program
- **Customers** tab: add/edit/delete; new customer starts at 0 points, 0 store credit, 0 total spent. Customer may carry an `outstandingBalance` (credit tab / money owed to store).
- **History** tab: all points transactions (earned / redeemed / reversed).
- **Settings** tab: program configuration (see rules in §7.6).
- Loyalty points act as **store credit** convertible to payment at checkout.

### 4.9 Purchases & Vendors
Three tabs:
- **Orders:** create PO → receive goods → pay (lifecycle in §6.8). Pending orders can be auto-generated by the POS on out-of-stock.
- **Vendors:** CRUD, default payment terms "Net 30", running `balance` (accounts payable).
- **Returns:** goods returned to vendor → credit against vendor balance, stock deducted.

New PO line defaults: qty 50, unitCost = product cost, batch `B-<year><month>A`, expiry = today + 10 days. Non-product (supplier cost) lines allowed (e.g., packing materials).

### 4.10 Employees, Shifts & Drawer Reconciliation
- **Shift** tab: open/close cashier shift (details in §6.1 / §6.5). One active shift per register/branch.
- **Employees** tab: staff CRUD; defaults role `cashier`, salary 4500.
- **History** tab: closed-shift summaries and CSV export; per-employee sales for the day.

### 4.11 Finance
Four tabs:
- **Expenses:** add expense (defaults: category "Electricity & Cold Storage", amount 350, Cash). Cash expenses while a shift is open are flagged `paidFromShift` and deduct from shift `expensesCash` / `expectedCash`.
- **Salaries:** generate monthly payroll (status Pending), pay slips (bank/cash), printable salary voucher.
- **Assets:** fixed assets with straight-line depreciation basis `(cost − salvage) / usefulLifeYears`.
- **Overview:** profit/loss snapshot including total payroll paid.

### 4.12 Branches
- Add branch (requires name + code; code stored uppercased; flag `isActive`), switch active branch — all modules are scoped to the active branch.
- Default branch used for legacy/unassigned records in chain reports.

### 4.13 Reports
Global filters: date range (`today | 7days | 30days | month | all`, default 30 days), branch, search. CSV export per report; drilling into individual sales.

Report types:
- **Five Questions** executive dashboard (see §6.12)
- **Sales** (revenue, units, avg ticket per product/invoice)
- **Products** (per-product revenue, units, average ticket)
- **P&L** (revenue − cost of goods = sum of `totalProfit`)
- **Inventory** (value = `currentStock × costPrice`)
- **Expiry**
- **Shifts**
- **Purchases**
- **Employees**
- **Debts & Receivables** (customers owing, vendor balances, unpaid POs, pending salaries, active loans)
- **Branches comparison** (revenue, profit, margin%, avg ticket, revenue share; count of open shifts/registers per branch)

### 4.14 Settings
- Scanner settings configuration & reset.
- **Reset demo data** (`resetAllDemoData`) — restores all seed collections.
- **Full wipe** — requires typing the literal string `DELETE`; wipes all business data while preserving loyalty & scanner preferences; then reloads.
- **Database backup** — creates a physical SQLite backup file (kept in the `backup` directory).

---

## 5. SYSTEM-LEVEL BEHAVIOR (HOW THE BUSINESS DATA LIVES)

- All business data is persisted in a local **SQLite** database (`alban-dairy.db`) served by an Express backend. The browser keeps a **localStorage mirror** as an offline fallback.
- On app boot, the system (1) flushes any unsynced local changes from the outbox, then (2) pulls the authoritative SQLite state into the app. **Server writes are locked until this bootstrap completes** — bypassing this can overwrite live data with empty client state.
- After bootstrap, every state change is mirrored to localStorage AND enqueued for a debounced (400 ms) parallel write to SQLite (`PUT /api/collection/:name`, full-collection overwrite via `INSERT … ON CONFLICT`).
- If a server write fails (offline), the snapshot is kept in a persisted **outbox** and retried on the next flush or next app start — preventing silent divergence between localStorage and SQLite.
- Backend also exposes: `GET/PUT/POST/DELETE` collection items, health check, **reset** (full wipe), and **backup** endpoints.

---

## 6. END-TO-END WORKFLOWS

### 6.1 Daily opening — Open Shift
1. Cashier opens the **Employees → Shift** tab.
2. Choose the branch / register / cashier (current employee is stamped on the shift).
3. Enter the **opening cash** float (default 500 SAR).
4. System creates a shift `SH-YYYYMMDD-##` with status **Open**; all fields start at 0; `expectedCash = openingCash`.
5. The open shift now accumulates: cash/card/bank/mixed/loyalty sales, cash refunds, and cash expenses paid from the drawer.

**Rule:** one active shift per register/branch. A shift must be Open to reconcile cash properly.

### 6.2 The POS sale (checkout)
1. Cashier scans barcodes or taps product cards; cart builds `SaleItem` lines (qty capped by available stock; out-of-stock triggers an auto `Pending` PO request instead of selling).
2. Optionally: select a customer, apply an order-level % discount, add a custom (non-stock) line, redeem loyalty points, or hold the cart.
3. Press **Pay** (`F4` / `Ctrl+Enter`).
4. In the payment modal choose one of:
   - **Cash** — enter tendered amount (quick presets: exact, rounded up, 50/100/200/500); change due computed.
   - **Bank transfer** — enter reference number; full amount.
   - **Loyalty** — enter points to redeem (≥ min points, ≤ balance, capped at `maxPercentPayableWithPoints` of total); remainder paid in cash automatically.
   - **Mixed** — split between **cash + bank** (must equal the total, ±0.05).
5. `completeSale` runs 5 coordinated operations (see §6.3), then the receipt modal opens.
6. Cashier prints the thermal receipt and/or starts a new sale. Receipt shows: branch, receipt number `REC-yymmdd-###`, employee, items, subtotal, discounts (order % + points), total, payment breakdown, points earned.

### 6.3 What "complete sale" does atomically
1. **Deduct stock** for each non-custom line (never below 0).
2. **Log inventory movements** (`type = sale`, negative qty, referenced by receipt number).
3. **Update loyalty** — earn `floor(total / pointsEarnedPerAmountSpent)` points for loyalty customers; redeem points requested; persist earned/redeemed `LoyaltyTransaction`s.
4. **Update the open shift** — add cash/card/bank/loyalty amounts to shift sales; `expectedCash += cash received`.
5. **Prepend the sale** to the sales ledger (with `receiptNumber`, `totalCost`, `totalProfit`, payment breakdown, status `Completed`).

### 6.4 Held orders
- **Hold:** current cart (with customer and note) becomes a `HeldOrder` (`HOLD-##`); cart is cleared. No stock is deducted at hold time.
- **Resume:** returning a held order re-populates the cart and removes it from the held list (stock validated again at checkout).
- Held orders can also be deleted outright.

### 6.5 Shift close — drawer reconciliation
1. Cashier counts the physical drawer and enters the **actual cash** on hand.
2. System computes:
   - `expectedCash = openingCash + cashSales − cashRefunds − cashExpenses`
   - `difference = actualCash − expectedCash` (over/short displayed).
3. On confirm, the shift is stamped **Closed** with `closedAt`, `actualCash`, `difference`, and retained in the shifts history.
4. A new sale can only be reconciled under a newly opened shift.

### 6.6 Customer return / refund
1. Open **Returns**, search by receipt number / sale ID / customer name, and select a **Completed** sale.
2. Set return quantities per item (start at 0; cashier enters how many to return) and a reason (default "Damaged / Sour Dairy").
3. Choose refund method: **cash | card | original | store credit**.
4. On confirm:
   - **Restock** returned quantities; log `customer_return` movements.
   - **Reverse loyalty**: deduct the points equivalent of the refund from the customer balance; log a `reversed` transaction.
   - **Adjust shift**: cash refunds increase `cashRefunds` and decrease `expectedCash`.
   - **Update sale status**: full refund → `Refunded`; partial → `Partially_Refunded`.
   - Append a `ReturnRecord` (`RET-yymmdd-###`).

### 6.7 Vendor lifecycle — purchases
1. **Create Purchase Order** (or auto-from-POS on out-of-stock): status **Pending**, holds vendor, branch, items (qty × cost), total amount.
2. **Receive goods**: stock increases, cost/batch/expiry updated on products, `purchase` movements logged, vendor `balance += totalAmount`, status → **Received**.
3. **Pay**: status → **Paid** (records method & date); vendor `balance −= totalAmount` (never below 0).
4. **Vendor return** (along the way): stock decreases, `vendor_return` movement, vendor `balance −= amount`, `VendorReturn` record created (credit note).
5. Unpaid POs surface in Alerts past their payment deadline.

### 6.8 Inventory adjustments & transfers
- **Adjust stock:** manual +/- or recount for a product; always logged as an `adjustment` movement with reason. Never goes below 0.
- **Branch transfer:** quantity leaves the active branch (logged as `branch_transfer`, `TRF-TO-<code>`), validated against available stock. (The receiving branch side is recorded by the source; see technical notes.)

### 6.9 Loyalty lifecycle
- Points **earn** on cash/card/bank/mixed sales for customers (1 point per `pointsEarnedPerAmountSpent` spent → default configurable).
- Points **redeem** at checkout as store credit (1 pt = `pointRedemptionValue` SAR, capped at `maxPercentPayableWithPoints` % of the sale).
- Points are **reversed** on customer returns.
- New customers start at zero; the settings tab defines earning rate, redemption value, minimum redemption points, and maximum payable percentage.

### 6.10 Expenses
- Record operational expenses (rent, power, cold-storage, transport, cleaning, packaging, marketing, licenses, other).
- **Cash expenses while a shift is open** are paid from the drawer: shift `expensesCash` and `expectedCash` decrease; expense flagged `paidFromShift`.
- Bank/card expenses are recorded standalone.

### 6.11 Payroll
1. **Generate monthly payroll:** for every employee create a `Pending` slip:
   - `basicSalary = employee.salary`
   - `allowances = 300` (standard)
   - `deductions = 0`, `advances = 0`
   - `netSalary = basicSalary + allowances − deductions − advances`
2. **Pay a slip** (from Alerts or Finance, bank or cash): status → **Paid**, `paymentDate` = today, print a salary voucher.
3. Pending slips trigger salary alerts; the debts report lists unpaid payroll as a liability.

### 6.12 Executive "Five Questions" report
- **Q1 — How much did I sell?** total revenue, units sold, invoice count, average ticket; sales broken down by payment method (cash/card/bank/loyalty).
- **Q2–Q4:** profit & margin, top products/branches, refunds (report-driven).
- **Q5 — Salary obligations:** pending salaries count and total liability for the month.

### 6.13 Backups, resets, and maintenance
- **Backup:** creates a timestamped `.db` file via SQLite online backup into the `backup/` directory.
- **Reset demo data:** restores every collection to seed/demo values.
- **Full wipe:** double-confirmed with the literal keyword `DELETE`; clears all collections but **preserves loyalty & scanner settings**, then reloads.

---

## 7. BUSINESS RULES, FORMULAS & THRESHOLDS (DO NOT CHANGE WITHOUT CARE)

| # | Rule | Value / formula | Notes |
| --- | --- | --- | --- |
| 7.1 | **VAT scheme** | Prices are **inclusive** of 15% Saudi VAT: `tax = price × 15 / 115` | Do **NOT** switch to additive `price × 0.15`; accounting reports will be corrupted. |
| 7.2 | **Sale profit** | `totalProfit = total (after discounts) − totalCost (Σ cost×qty)` | Drives P&L and margin. |
| 7.3 | **Shift expected cash** | `expectedCash = openingCash + cashSales − cashRefunds − cashExpenses` | Used at close to compute `difference`. |
| 7.4 | **Points earned** | `floor(saleTotal / pointsEarnedPerAmountSpent)` | Loyalty customers only. |
| 7.5 | **Points redemption** | `discount = min(pointsBalance×value, maxPercentPayableWithPoints% of sale)`; points redeeming is `ceil(discount/value)` | Must also respect `minPointsForRedemption`. |
| 7.6 | **Loyalty defaults** | earned-per-amount configurable; redemption value configurable; min points 50; max 50% payable | Configurable in the Loyalty module. |
| 7.7 | **Expiry alert windows** | critical ≤ 3 days; upcoming 4–7 days; expired < today; safe > 7 | Used in POS badges, Inventory, Alerts, Dashboard. |
| 7.8 | **Low stock** | `currentStock <= minStock` | Drives stock alerts & dashboards. |
| 7.9 | **Payroll** | `netSalary = basic + allowances(300) − deductions − advances` | Generated monthly as Pending. |
| 7.10 | **Loan installment** | `monthlyInstallment ?? round(principal / installmentsCount)` | Loan settles when `remainingBalance == 0`. |
| 7.11 | **Asset depreciation** | Straight-line `(cost − salvage) / usefulLifeYears` | Basis used in Finance overview. |
| 7.12 | **Purchase defaults** | PO line qty 50; batch `B-<yyyy><mm>A`; expiry +10 days; vendor terms "Net 30" | New vendor / PO defaults. |
| 7.13 | **Bulk stock default** | target min stock 5; expiry default today + 14 days | Bulk update modal. |
| 7.14 | **Salary alert** | amount = `netSalary`, or `emp.salary + 300` if not generated | Critical 3+ days after the 1st. |
| 7.15 | **Stock floor** | stock never goes below 0 (sales/transfers/returns clamp) | Applies everywhere. |
| 7.16 | **Mixed payment** | split must equal total (±0.05 SAR) | Cash + bank only. |
| 7.17 | **Refund eligibility** | only `Completed` sales can be returned | Return quantities default 0. |
| 7.18 | **Scanner buffer** | `minBarcodeLength = 4` chars + Enter; inter-keystroke sensitivity 45 ms default | Global keystroke listener in POS. |
| 7.19 | **Weighted scale barcode** | prefix(s) 20/99 etc.; PLU(5/4/6) + grams(5) + checksum; weight = grams/1000 when 0 < grams ≤ 30000 | Saudi market scale labels. |
| 7.20 | **Branch code** | stored uppercased; legacy records attribute to default branch | Branch comparisons. |
| 7.21 | **Document numbering** | Receipt `REC-yymmdd-###`, PO `PO-…@@`, Hold `HOLD-##`, Return `RET-…`, Shift `SH-yyyymmdd-##`, Loan `LN-mm-##` | Sequential per day/month. |

---

## 8. OPERATIONAL SECURITY & DATA-SAFETY NOTES

- **Single owner, no authentication.** There is no login screen or user table; whoever operates the machine has full access. (Keep this in mind if adding roles — role checks do not exist.)
- **Never serve two sources of truth independently for long:** if the backend is unreachable, operations continue locally and are reconciled via the outbox on reconnect; manual edits made while offline should be reviewed after recovery to avoid drift.
- **Do not bypass the bootstrap gate** (the "bootstrapped" flag) — until the server pulls the authoritative state, all writes are intentionally blocked to prevent empty-client overwrites.
- **Resets are destructive.** Full wipe requires typing `DELETE`; reset demo restores seed data. Backups are the only recovery path.

---

## 9. GLOSSARY (EN ↔ AR)

| EN | AR | Meaning |
| --- | --- | --- |
| POS / Register | نقطة البيع | Checkout screen / terminal |
| Receipt | فاتورة / إيصال | Sale invoice |
| Hold order | طلب معلق | Suspended cart |
| Shift | وردية | Cashier work session with cash reconciliation |
| Cash drawer | الصندوق | Physical cash counted at shift close |
| Actual vs expected cash | الصندوق الفعلي vs المتوقع | Reconciliation |
| Difference / over-short | فرق الصندوق | `actual − expected` |
| Low stock / out of stock | مخزون منخفض / نفد | `currentStock <= minStock` / `<= 0` |
| Expiry / منتهي | الصلاحية | Sell-by date |
| Loyalty points | نقاط الولاء | Reward currency |
| Store credit | رصيد المحل | Points converted to payment |
| Purchase order | أمر شراء | Goods order to vendor |
| Vendor balance | رصيد المورد | Accounts payable |
| Payroll | رواتب | Salaries |
| Allowance | بدل | Standard 300 SAR allowance |
| Fixed asset | أصل ثابت | Refrigeration, vehicles, machinery, IT |
| Loan installment | قسط القرض | Monthly loan payment |
| Drawer expense | مصروف من الصندوق | Cash expense paid from shift |
| Flash discount | تخفيض سريع | Clearance % off (20–50%) |
| Credit tab (receivable) | آجل | Money customer owes the store |

---

## 10. CHANGE-GUIDANCE FOR AI / DEVELOPERS

When asked to add a feature, fix a bug, or adjust the workflow, treat this document as the business contract:

1. **Business logic lives in `server/` (storage) and `src/services/*` (domain rules), coordinated by `src/context/AppContext.tsx` and surfaced in `src/components/*`.** Keep formulas in §7 intact unless the user explicitly requests a change — especially the VAT scheme (7.1) and shift math (7.3).
2. **Every customer-facing money movement must stay audited:** any new money flow should update the respective ledger (sales, returns, shifts, expenses, purchases, salaries, loans) and ideally an inventory movement where stock is involved.
3. **Preserve the atomic coordination pattern used by `completeSale`:** a single action updates inventory + movements + loyalty + shift + ledger together.
4. **Respect state machines:** Shift Open→Closed, PO Pending→Received→Paid (or Cancelled), Salary Pending→Paid, Loan Active→Settled, Sale/Return statuses.
5. **Respect the alert thresholds and defaults** (§7) when extending Alerts, Inventory, or bulk operations.
6. **New modules must participate in sync:** add the collection key to `COLLECTION_KEYS` in `AppContext.tsx` and to the persistence effects; keep the SQLite JSON-blob model in mind (full-collection writes).
7. **When in doubt about a business rule, ask the owner** rather than inventing a formula that clashes with §7 or the reports in §4.11–4.13.