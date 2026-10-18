# Transactions Feature – Execution Plan

> **How to use this file (for the executing AI agent)**
> 1. Read `/claude.md` first. Its rules always apply (minimal change, no unrelated refactor, no scope creep, verify before claiming success, response format max 5 bullets).
> 2. Execute **one phase at a time**, in order. After each phase: run lint + typecheck (+ tests if available), then report in the `claude.md` format and **STOP for user review** (mandatory after Phase 1 and Phase 4).
> 3. Do not assume a file, function, or schema exists. Verify it (see "Pre-flight checks").
> 4. Do not install new dependencies without asking the user.
> 5. Everything under "Out of scope" must NOT be built.

Language of UI text: Indonesian (match existing UI). Code/comments: English or Indonesian, follow surrounding files.

---

## 0. Context (verified in repo)

- Stack: React + TypeScript + Vite, Supabase (Postgres + RLS + Edge Functions), Tailwind, `sonner` toasts, `lucide-react` icons.
- Multi-tenant: every table has `business_id`; RLS uses `public.current_business_id()` and `public.is_superadmin()`; owner check via `public.is_business_owner()` (defined in `supabase/migrations/20261018_update_profiles_and_staff_rls.sql`).
- Migrations live in `supabase/migrations/` (idempotent SQL, dated prefix, Indonesian comments). Existing `public.set_updated_at()` trigger function can be reused.
- `profiles` table = users and staff. Staff can exist without login (`can_login = false`). Soft delete via `deleted_at`. DB role check is already `superadmin | owner | staff`.
- `products`: `type` (`product`|`service`), `selling_price`, `cost_price`, `track_stock`, `stock`, `has_commission`.
- `customers`: unique phone per business, soft delete.
- Current state of `src/pages/pos/POSPage.tsx`: checkout is a mock (`setTimeout`), PPN 10% hard-coded, cart has no customer/staff/discount.
- `src/pages/pos/SettingsPage.tsx`: tax input is static (`defaultValue={10}`), no toggle, Save button does nothing, no settings table.
- `src/pages/pos/CommissionsPage.tsx`: placeholder only.
- `src/types/index.ts`: `Transaction` and `CartItem` types are outdated; `UserRole` still contains `'kasir'`.
- `src/App.tsx` and `src/router/ProtectedRoute.tsx` still reference `'kasir'`.
- Nav menu is `NAV_ITEMS` in `src/components/NavigationDrawer.tsx`.

## 1. Final decisions (do not re-open)

| Topic | Decision |
|---|---|
| Roles | Only `superadmin`, `owner`, `staff`. Remove `kasir` everywhere in frontend (`UserRole`, `roleHome`, `allowedRoles`). A staff who can log in can act as cashier. |
| Created by | `transactions.created_by` NOT NULL = logged-in user (`auth.uid()`), set server-side. |
| Customer | Optional. Pick existing, quick-add new (name + phone), or none (walk-in). Snapshot name/phone on transaction. |
| Staff per item | Optional. Table `transaction_item_staff` exists from day one; RPC accepts up to 3 staff per item; **UI in this iteration = 1 dropdown**. Selectable: active, non-deleted staff of the business (login not required). Label in UI: "Staf Pelaksana" (generic, no salon-specific wording). |
| Discount | Per item AND per whole transaction. Type `percent` or `amount` (Rupiah). Owner and staff may discount freely (no max limit). |
| Tax (PPN) | Per-business setting: toggle on/off (default OFF) + percentage. Exclusive: added on top. Calculated from amount **after all discounts**. Rate stored as snapshot on each transaction. |
| Payment | One method per transaction: `cash`, `qris`, `card`. Cash requires `amount_paid >= total`, shows change. No split payment, no debt/DP. |
| Stock | Decrease only for `type='product'` AND `track_stock=true`. Services never touch stock. |
| Void | Owner only, reason required, enforced in DB/RPC. Restores stock. No edit/delete of transactions. |
| History | Owner and all logged-in staff can see all business transactions. New menu "Riwayat Transaksi" (`/pos/transactions`). |
| Receipt | PDF sized for 80mm thermal printer, generated from transaction detail page. |
| Commission | Skeleton only: nullable columns, no calculation, no UI. |
| Reporting-ready | Index + timezone handling so day/month/year/custom-range filters are a single query pattern. |

## 2. Data model

### 2.1 `business_settings` (1 row per business)
- `business_id uuid primary key references businesses(id) on delete cascade`
- `tax_enabled boolean not null default false`
- `tax_rate numeric(5,2) not null default 10 check (tax_rate >= 0 and tax_rate <= 100)`
- `receipt_footer text`
- `created_at`, `updated_at` (+ `set_updated_at` trigger)
- RLS: SELECT for same business (+ superadmin). INSERT/UPDATE only `is_business_owner()` of the same business (+ superadmin). Row may not exist yet → service must upsert / treat missing row as defaults.

### 2.2 `transactions`
- `id uuid pk default gen_random_uuid()`
- `business_id uuid not null → businesses`
- `invoice_no text not null` – unique per business, sequential, e.g. `INV-YYYYMMDD-0001` (daily sequence per business, based on Asia/Jakarta date). Must be race-safe.
- `customer_id uuid null → customers on delete set null`, `customer_name_snapshot text`, `customer_phone_snapshot text`
- `transaction_date timestamptz not null default now()` (server-set, no backdating)
- `subtotal numeric(15,2)` (sum of qty × unit_price)
- `item_discount_total numeric(15,2)`
- `discount_type text null check in ('percent','amount')`, `discount_value numeric(15,2)`, `discount_amount numeric(15,2)` (order-level)
- `tax_rate_snapshot numeric(5,2)`, `tax_amount numeric(15,2)`
- `total numeric(15,2)`
- `payment_method text check in ('cash','qris','card')`
- `amount_paid numeric(15,2)`, `change_amount numeric(15,2)`
- `status text not null default 'completed' check in ('completed','voided')`
- `voided_at`, `voided_by → profiles`, `void_reason text`
- `created_by uuid not null → profiles(id)`
- `created_at`, `updated_at`
- All money columns `check >= 0`.
- Indexes: `(business_id, transaction_date desc)`, `(business_id, status, transaction_date desc)`, unique `(business_id, invoice_no)`, `(customer_id)`, `(created_by)`.

### 2.3 `transaction_items`
- `id`, `transaction_id → transactions on delete cascade`, `business_id` (denormalized for RLS/reports)
- `product_id uuid null → products on delete set null`
- Snapshots: `product_name`, `product_type`, `unit`, `unit_price`, `cost_price`
- `quantity numeric(12,2) check > 0`
- Item discount: `discount_type`, `discount_value`, `discount_amount`
- `order_discount_share numeric(15,2) default 0` (proportional share of order-level discount)
- `line_total numeric(15,2)` = `unit_price*qty − discount_amount − order_discount_share` (net, before tax)
- `has_commission boolean` snapshot of product flag
- Indexes: `(transaction_id)`, `(business_id, product_id)`

### 2.4 `transaction_item_staff` (commission skeleton)
- `id`, `transaction_item_id → transaction_items on delete cascade`, `business_id`
- `staff_id uuid null → profiles on delete set null`, `staff_name_snapshot text`
- Reserved, nullable, **not populated now**: `commission_type text`, `commission_rate numeric`, `commission_amount numeric(15,2)`
- Unique `(transaction_item_id, staff_id)`; max 3 per item enforced in RPC
- Index `(business_id, staff_id)`

### 2.5 RLS rules (all four tables)
- SELECT: `business_id = current_business_id() or is_superadmin()`.
- No direct INSERT/UPDATE/DELETE policies for authenticated on `transactions`, `transaction_items`, `transaction_item_staff` (writes only via `SECURITY DEFINER` RPCs). `business_settings` per 2.1.
- RPCs: `set search_path = public`, validate `auth.uid()` and that the caller's profile belongs to the business, revoke from public, grant to authenticated.

### 2.6 Calculation rules (server is the source of truth)
1. `gross = unit_price × qty` (unit_price read from DB, never trusted from client).
2. Item discount: percent → `gross × v/100`; amount → `v`. Must be `0 ≤ discount ≤ gross` (percent `0–100`). Reject otherwise.
3. `after_item = gross − item_discount` per line; `subtotal_after_item = Σ after_item`.
4. Order discount computed on `subtotal_after_item` (percent or amount, capped by it).
5. Allocate order discount to lines proportionally to `after_item`; rounding remainder goes to the **last** line so `Σ share = order discount` exactly.
6. `taxable = subtotal_after_item − order_discount`; `tax = round(taxable × rate/100)` if `tax_enabled`, else 0. Rate read from `business_settings` server-side.
7. `total = taxable + tax`. Round Rupiah to whole numbers consistently; document the rounding choice in the migration.
8. Invariant: `Σ line_total = taxable`; header total must match.

### 2.7 RPC contracts
`create_transaction(payload jsonb) returns jsonb`
- payload: `customer_id?`, `payment_method`, `amount_paid?`, `discount_type?`, `discount_value?`, `items: [{ product_id, quantity, discount_type?, discount_value?, staff_ids?: uuid[] (max 3) }]`
- Validates: items non-empty; quantity > 0; every product/customer/staff belongs to caller's business, is not soft-deleted, product is active; cash `amount_paid >= total`.
- Locks product rows (`FOR UPDATE`) and decrements stock only for `product` + `track_stock`; rejects insufficient stock with a clear message.
- Generates `invoice_no` race-safely, sets `created_by = auth.uid()`, writes header + items + staff rows in one transaction.
- Returns the created transaction (with items) or raises a readable error.

`void_transaction(p_transaction_id uuid, p_reason text) returns jsonb`
- Caller must be owner of the same business (check in DB). Reason required (trimmed, non-empty). Only `completed` transactions can be voided.
- Restores stock for stock-tracked products, sets `status='voided'`, `voided_at/by`, `void_reason`.

## 3. Pre-flight checks (do before Phase 1)

- [ ] Find where `current_business_id()` and `is_superadmin()` are defined; confirm signatures.
- [ ] Check `package.json`: existing PDF lib? test runner (vitest/jest)? If missing, ASK the user before adding.
- [ ] Read `Modal`, `Select`, `Input`, `Button`, `Badge` in `src/components/ui/` and reuse them.
- [ ] Read `CustomersPage.tsx` (pagination/search/filter pattern) and `customerService.ts` / `productService.ts` (service pattern).
- [ ] Read `src/store/authStore.ts` for how `user` / `business_id` are obtained.
- [ ] Confirm how migrations are applied in this project (SQL editor vs CLI); follow the existing convention.

## 4. Phases

### Phase 1 – Database (STOP for review after this phase)
Deliver: one new idempotent migration `supabase/migrations/20261019_create_transactions.sql` (or next date prefix) with sections 2.1–2.7: tables, constraints, indexes, `set_updated_at` triggers, RLS, invoice generator, `create_transaction`, `void_transaction`.
Also deliver: a SQL test script (e.g. `supabase/tests/transactions.sql` or documented queries) covering:
- normal sale with item + order discount (totals match, `Σ line_total = taxable`)
- tax on/off
- service item does not change stock; tracked product does
- insufficient stock rejected
- discount > price rejected; percent > 100 rejected
- void by non-owner rejected; void by owner restores stock
- cross-tenant access (other business's customer/product/staff) rejected
- two concurrent sales of last stock unit → only one succeeds (describe how to test if not automatable)
Acceptance: migration runs twice without error; all scenarios documented with results. Report anything that could not be executed.

### Phase 2 – Types, services, calculation helper
- `src/types/index.ts`: rewrite `Transaction`, `CartItem`; add `TransactionItem`, `TransactionItemStaff`, `BusinessSettings`, discount/payment types. **Remove `'kasir'` from `UserRole`.**
- `src/router/ProtectedRoute.tsx` and `src/App.tsx`: remove `kasir`; routes for owner+staff stay the same. Fix any compile errors this surfaces (only those).
- `src/lib/services/settingsService.ts`: get (defaults if no row) and upsert.
- `src/lib/services/transactionService.ts`: `createTransaction`, `fetchTransactions` (date range, status, search, pagination), `fetchTransactionById`, `voidTransaction`. Errors surfaced, never swallowed.
- `src/lib/` pure helper for discount/tax preview mirroring section 2.6 (used only for UI preview; server wins). Unit tests if a runner exists.
Acceptance: typecheck clean, lint clean, helper tested.

### Phase 3 – PPN settings (backend + frontend)
- `SettingsPage.tsx`: load settings; toggle "Aktifkan PPN"; percent input shown only when enabled (0–100 validation); Save persists via service; loading/error/success states. Staff sees values read-only (controls disabled, no save). Only touch the tax section (and wire `receipt_footer` since the receipt needs it); leave other settings UI as is.
Acceptance: owner saves and value persists after refresh; staff cannot change it (verify that the DB rejects staff writes, not just the UI).

### Phase 4 – POS cart (STOP for review after this phase)
In `POSPage.tsx` (+ small focused components if the file gets too large, e.g. cart panel, customer picker):
- Customer picker: search existing, quick-add (name + phone via `createCustomer`), clear selection; optional.
- Per cart line: staff dropdown ("Staf Pelaksana", optional, active staff), discount control (toggle `%`/`Rp` + value).
- Order-level discount control (`%`/`Rp`).
- Summary: subtotal, item discounts, order discount, PPN (only if enabled, rate from settings), total.
- Payment: Tunai / QRIS / Kartu; cash shows amount received + change; validate received >= total.
- Checkout calls `create_transaction`; remove hard-coded 10% tax and the `setTimeout` mock; disable button while processing (no double submit); show server errors clearly; clear cart and refresh product stock on success.
- Mobile-first, touch-friendly (existing bottom-sheet pattern for cart).
Acceptance: all states handled (loading, empty, error, success); stock-out and validation errors visible; typecheck/lint clean.

### Phase 5 – Transaction history
- `NavigationDrawer.tsx`: add `{ label: 'Riwayat Transaksi', path: '/pos/transactions' }` after "Transaksi" (visible to owner + staff).
- `src/App.tsx`: routes `/pos/transactions` and `/pos/transactions/:id` for owner + staff.
- `TransactionsPage.tsx`: list with filters Hari Ini / Bulan Ini / Tahun Ini / Custom Range + status filter + search by invoice/customer, pagination, scannable table (cards on mobile). Date boundaries computed in **Asia/Jakarta** (`start <= transaction_date < end`).
- `TransactionDetailPage.tsx` (or modal): items, discounts, tax, payment, created by, staff per item, customer; **Void** button visible to owner only, reason required, confirm dialog; voided state clearly marked.
Acceptance: test date filters around midnight WIB; void flow works for owner and is rejected for staff at DB level.

### Phase 6 – Receipt PDF (80mm)
- Use an existing PDF lib, or ask the user before adding one.
- Page width 80mm (content ~72mm), content: business name, invoice no, date (WIB), customer, created by, items (name, qty × price, item discount, staff), subtotal, discounts, PPN, total, payment (+ change for cash), footer from `business_settings.receipt_footer`. Voided transactions show a clear "VOID" mark.
- "Cetak Struk" button on the detail page opens/downloads the PDF for printing.
Acceptance: PDF renders correctly at 80mm for short and long item lists.

## 5. Out of scope (do NOT build)
- Commission calculation, commission UI, changes to `CommissionsPage.tsx` (skeleton columns only).
- Multi-staff UI (1–3) – backend only supports it.
- Split payment, debt/DP, refunds beyond void.
- Reports page changes, dashboards, exports.
- Bluetooth/direct thermal printing, WhatsApp share.
- Editing or deleting transactions.
- Refactors unrelated to this feature.

## 6. Risks to watch
- Order-discount rounding must sum exactly (remainder to last line).
- Concurrent checkout on the same stock → row locks in the RPC.
- Invoice number generation must be race-safe.
- Removing `kasir` may surface compile errors elsewhere; fix only what it breaks.
- Never expose service-role keys to the client; never rely on frontend-only authorization.

## 7. Per-phase report format (from `claude.md`)
**Implemented** · **Files changed** · **Verification** (checks run + results, blockers) – max 5 bullets unless more detail is requested.
