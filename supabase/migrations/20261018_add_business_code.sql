-- Migration: Add business_code to businesses table for staff custom email domain
-- Jalankan di Supabase SQL Editor (idempotent).

-- 1. Tambah kolom business_code ------------------------------------------------
alter table public.businesses 
  add column if not exists business_code text;

-- 2. Backfill business_code untuk bisnis yang sudah ada -------------------------
-- Buat slug alphanumeric huruf kecil dari business_name (misal: "Kopi Kenangan" -> "kopikenangan")
update public.businesses
set business_code = lower(regexp_replace(business_name, '[^a-zA-Z0-9]', '', 'g'))
where business_code is null or business_code = '';

-- Pastikan tidak ada yang kosong
update public.businesses
set business_code = 'biz' || substr(id::text, 1, 4)
where business_code is null or business_code = '';

-- 3. Unique Index --------------------------------------------------------------
create unique index if not exists businesses_business_code_idx
  on public.businesses (lower(business_code))
  where deleted_at is null;
