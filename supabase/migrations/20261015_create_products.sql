-- Migration: Create products table with multi-tenant RLS
-- Jalankan di Supabase SQL Editor (idempotent).

-- 1. Table schema -------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid, -- opsional: relasi ke categories di masa depan

  -- Identitas
  name text not null,
  type text not null default 'product' check (type in ('product', 'service')),
  sku text,
  barcode text,
  brand text,
  unit text default 'pcs',

  -- Harga & Biaya (tidak boleh negatif)
  cost_price numeric(15, 2) not null default 0 check (cost_price >= 0),
  selling_price numeric(15, 2) not null default 0 check (selling_price >= 0),

  -- Inventori & Stok
  track_stock boolean not null default true,
  stock numeric(12, 2) not null default 0,

  -- Penanda Komisi (persiapan masa depan)
  has_commission boolean not null default false,

  -- Status & Lifecycle
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Constraints & Uniqueness -------------------------------------------------
-- SKU unik per bisnis (hanya jika SKU diisi dan belum dihapus)
create unique index if not exists products_business_sku_unique
  on public.products (business_id, lower(sku))
  where sku is not null and sku <> '' and deleted_at is null;

-- Barcode unik per bisnis (hanya jika barcode diisi dan belum dihapus)
create unique index if not exists products_business_barcode_unique
  on public.products (business_id, barcode)
  where barcode is not null and barcode <> '' and deleted_at is null;

-- 3. Indexes untuk optimasi query & pencarian ---------------------------------
create index if not exists products_business_active_idx
  on public.products (business_id, created_at desc)
  where deleted_at is null;

create index if not exists products_business_name_idx
  on public.products (business_id, name)
  where deleted_at is null;

-- 4. Trigger auto-generate SKU urut per bisnis (00001, 00002, ...) -------------
create or replace function public.generate_product_sku()
returns trigger
language plpgsql
as $$
declare
  v_next_num bigint;
begin
  -- Hanya generate otomatis jika SKU kosong / null
  if new.sku is null or trim(new.sku) = '' then
    -- Lock advisory atau hitung max nomor urut numerik yang ada di bisnis terkait
    select coalesce(max(
      case 
        when sku ~ '^[0-9]+$' then sku::bigint 
        else 0 
      end
    ), 0) + 1
    into v_next_num
    from public.products
    where business_id = new.business_id;

    -- Format menjadi 5 digit padded (00001, 00002, dst.)
    new.sku := lpad(v_next_num::text, 5, '0');
  end if;

  return new;
end;
$$;

drop trigger if exists set_products_auto_sku on public.products;
create trigger set_products_auto_sku
  before insert on public.products
  for each row
  execute function public.generate_product_sku();

-- 5. Trigger auto-update updated_at -------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
  before update on public.products
  for each row
  execute function public.set_updated_at();

-- 6. Row Level Security (RLS) -------------------------------------------------
-- Isolasi multi-tenant: hanya owner/kasir dari bisnis yang bersangkutan
alter table public.products enable row level security;

-- SELECT: Baca produk dari bisnis sendiri (penyaringan deleted_at dilakukan di query aplikasi)
drop policy if exists "tenant select own products" on public.products;
create policy "tenant select own products" on public.products
  for select to authenticated
  using (
    business_id = public.current_business_id()
  );

-- INSERT: Tambah produk ke bisnis sendiri
drop policy if exists "tenant insert own products" on public.products;
create policy "tenant insert own products" on public.products
  for insert to authenticated
  with check (
    business_id = public.current_business_id()
  );

-- UPDATE: Perbarui produk bisnis sendiri (termasuk soft-delete)
drop policy if exists "tenant update own products" on public.products;
create policy "tenant update own products" on public.products
  for update to authenticated
  using (
    business_id = public.current_business_id()
  )
  with check (
    business_id = public.current_business_id()
  );

-- DELETE: Izinkan soft delete atau hard delete hanya untuk bisnis sendiri
drop policy if exists "tenant delete own products" on public.products;
create policy "tenant delete own products" on public.products
  for delete to authenticated
  using (
    business_id = public.current_business_id()
  );
