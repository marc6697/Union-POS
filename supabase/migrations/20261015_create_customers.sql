-- Migration: Create customers table with multi-tenant RLS + created_by audit
-- Jalankan di Supabase SQL Editor (idempotent).

-- 1. Table schema -------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,

  -- Identitas Pelanggan
  name text not null,
  phone_number text not null,
  email text,
  address text,
  notes text,

  -- Status & Lifecycle
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Jika tabel customers sudah pernah dibuat sebelumnya, pastikan kolom created_by ditambahkan:
alter table public.customers 
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

-- 2. Constraints & Uniqueness -------------------------------------------------
-- Nomor HP unik per bisnis (hanya untuk data yang belum dihapus)
create unique index if not exists customers_business_phone_unique
  on public.customers (business_id, phone_number)
  where deleted_at is null;

-- 3. Indexes untuk optimasi query & pencarian ---------------------------------
create index if not exists customers_business_active_idx
  on public.customers (business_id, created_at desc)
  where deleted_at is null;

create index if not exists customers_business_name_idx
  on public.customers (business_id, name)
  where deleted_at is null;

create index if not exists customers_created_by_idx
  on public.customers (created_by)
  where deleted_at is null;

-- 4. Trigger auto-update updated_at -------------------------------------------
drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
  before update on public.customers
  for each row
  execute function public.set_updated_at();

-- 5. Row Level Security (RLS) -------------------------------------------------
-- Bersihkan semua policy lama
drop policy if exists "tenant select own customers" on public.customers;
drop policy if exists "tenant insert own customers" on public.customers;
drop policy if exists "tenant update own customers" on public.customers;
drop policy if exists "tenant delete own customers" on public.customers;
drop policy if exists "customers_select_policy" on public.customers;
drop policy if exists "customers_insert_policy" on public.customers;
drop policy if exists "customers_update_policy" on public.customers;
drop policy if exists "customers_delete_policy" on public.customers;

alter table public.customers enable row level security;

-- SELECT: Izinkan tenant membaca data milik bisnisnya
create policy "customers_select_policy" on public.customers
  for select to authenticated
  using (
    business_id = public.current_business_id() or public.is_superadmin()
  );

-- INSERT: Izinkan tenant menambah data ke bisnisnya
create policy "customers_insert_policy" on public.customers
  for insert to authenticated
  with check (
    business_id = public.current_business_id() or public.is_superadmin()
  );

-- UPDATE (Termasuk Soft Delete):
create policy "customers_update_policy" on public.customers
  for update to authenticated
  using (
    business_id = public.current_business_id() or public.is_superadmin()
  );

-- DELETE (Hard delete):
create policy "customers_delete_policy" on public.customers
  for delete to authenticated
  using (
    business_id = public.current_business_id() or public.is_superadmin()
  );
