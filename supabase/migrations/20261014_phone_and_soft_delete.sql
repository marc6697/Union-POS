-- Validasi nomor telepon + soft delete. Jalankan di Supabase SQL Editor (idempotent).

-- 1. Nomor telepon: hanya angka, boleh diawali "+", 9-15 digit -----------------
-- Bersihkan data lama (hapus spasi, tanda hubung, dan karakter non-angka).
update public.businesses
  set owner_phone = regexp_replace(owner_phone, '[^0-9+]', '', 'g')
  where owner_phone ~ '[^0-9+]';

-- NOT VALID: baris lama yang masih tidak sesuai (mis. terlalu pendek) tidak
-- menggagalkan migration, tetapi semua insert/update baru wajib memenuhi aturan.
alter table public.businesses
  drop constraint if exists businesses_owner_phone_check;
alter table public.businesses
  add constraint businesses_owner_phone_check
  check (owner_phone ~ '^\+?[0-9]{9,15}$') not valid;

-- Cek baris lama yang belum valid (perbaiki manual, lalu jalankan VALIDATE):
--   select id, business_name, owner_phone from public.businesses
--   where owner_phone !~ '^\+?[0-9]{9,15}$';
--   alter table public.businesses validate constraint businesses_owner_phone_check;

-- 2. Soft delete ----------------------------------------------------------------
alter table public.businesses
  add column if not exists deleted_at timestamptz;

create index if not exists businesses_active_idx
  on public.businesses (created_at desc)
  where deleted_at is null;

-- Owner hanya bisa membaca bisnisnya selama belum dihapus.
drop policy if exists "owner select own business" on public.businesses;
create policy "owner select own business" on public.businesses
  for select to authenticated
  using (id = public.current_business_id() and deleted_at is null);
