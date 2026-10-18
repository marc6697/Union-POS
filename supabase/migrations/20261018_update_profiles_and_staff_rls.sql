-- Migration: Update profiles schema & multi-tenant RLS for staff management
-- Jalankan di Supabase SQL Editor (idempotent).

-- 1. Penyesuaian Kolom profiles ------------------------------------------------
alter table public.profiles alter column id set default gen_random_uuid();

-- Lepas foreign key id -> auth.users jika ada (agar staff tanpa akun login bisa disimpan)
alter table public.profiles drop constraint if exists profiles_id_fkey;

-- Izinkan kolom email bernilai NULL (staff tanpa login tidak wajib punya email)
alter table public.profiles alter column email drop not null;

alter table public.profiles 
  add column if not exists phone text,
  add column if not exists position text,
  add column if not exists can_login boolean not null default false,
  add column if not exists is_active boolean not null default true,
  add column if not exists deleted_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- 2. Migrasi Role & Constraints ------------------------------------------------
-- Ubah data lama yang masih bertuliskan 'kasir' menjadi 'staff'
update public.profiles set role = 'staff' where role = 'kasir';

-- Pastikan superadmin dan owner selalu can_login = true serta position owner terisi
update public.profiles set can_login = true where role in ('superadmin', 'owner');
update public.profiles set position = 'Owner' where role = 'owner' and (position is null or position = '');

-- Check constraint role
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check 
  check (role in ('superadmin', 'owner', 'staff'));

-- Partial unique index untuk email (hanya berlaku jika email diisi & belum dihapus)
create unique index if not exists profiles_email_unique_idx
  on public.profiles (lower(email))
  where email is not null and deleted_at is null;

-- Index pencarian per tenant bisnis
create index if not exists profiles_business_active_idx
  on public.profiles (business_id, created_at desc)
  where deleted_at is null;

create index if not exists profiles_business_search_idx
  on public.profiles (business_id, full_name)
  where deleted_at is null;

-- 3. Helper Functions ----------------------------------------------------------
-- Cek apakah pemanggil adalah owner dari bisnisnya
create or replace function public.is_business_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner'
  );
$$;

revoke all on function public.is_business_owner() from public;
grant execute on function public.is_business_owner() to authenticated;

-- 4. Row Level Security (RLS) di public.profiles --------------------------------
alter table public.profiles enable row level security;

-- Bersihkan policy lama jika ada
drop policy if exists "profiles select policy" on public.profiles;
drop policy if exists "profiles insert policy" on public.profiles;
drop policy if exists "profiles update policy" on public.profiles;
drop policy if exists "profiles delete policy" on public.profiles;
drop policy if exists "users can read own profile" on public.profiles;
drop policy if exists "users can update own profile" on public.profiles;

-- SELECT:
-- 1. Baca profil diri sendiri (untuk keperluan authStore)
-- 2. Atau membaca rekan satu bisnis (jika business_id cocok)
-- 3. Atau superadmin membaca semua profil
create policy "profiles select policy" on public.profiles
  for select to authenticated
  using (
    id = auth.uid() 
    or (business_id is not null and business_id = public.current_business_id())
    or public.is_superadmin()
  );

-- INSERT:
-- Hanya Owner yang boleh menambah staff ke bisnisnya sendiri, atau Superadmin
create policy "profiles insert policy" on public.profiles
  for insert to authenticated
  with check (
    (public.is_business_owner() and business_id = public.current_business_id())
    or public.is_superadmin()
  );

-- UPDATE:
-- 1. Owner boleh mengupdate data staff di bisnisnya sendiri
-- 2. User boleh mengupdate sebagian profil dirinya sendiri (misal avatar/nama)
-- 3. Superadmin boleh mengupdate profil manapun
create policy "profiles update policy" on public.profiles
  for update to authenticated
  using (
    (public.is_business_owner() and business_id = public.current_business_id())
    or id = auth.uid()
    or public.is_superadmin()
  );

-- DELETE:
-- Hard delete hanya diizinkan untuk Superadmin (aplikasi menggunakan soft delete deleted_at)
create policy "profiles delete policy" on public.profiles
  for delete to authenticated
  using (public.is_superadmin());
