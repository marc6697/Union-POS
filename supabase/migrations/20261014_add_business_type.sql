-- Union POS: tabel businesses (+ business_type) dengan RLS khusus superadmin.
-- Jalankan di Supabase SQL Editor. Idempotent: aman dijalankan ulang,
-- baik tabel belum ada maupun sudah ada (kolom yang kurang akan ditambahkan).
-- Asumsi: tabel public.profiles(id uuid, role text) sudah ada (dipakai authStore).

-- 1. Tabel ---------------------------------------------------------------------
create table if not exists public.businesses (
  id            uuid primary key default gen_random_uuid(),
  business_name text not null,
  business_type text not null default 'Toko Ritel & Minimarket',
  owner_name    text not null,
  owner_phone   text not null,
  owner_email   text not null,
  status        text not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Jika tabel sudah ada sebelumnya tanpa business_type
alter table public.businesses
  add column if not exists business_type text;

update public.businesses
  set business_type = 'Toko Ritel & Minimarket'
  where business_type is null;

alter table public.businesses
  alter column business_type set not null;

-- 2. Constraint ----------------------------------------------------------------
alter table public.businesses
  drop constraint if exists businesses_business_type_check;
alter table public.businesses
  add constraint businesses_business_type_check
  check (business_type in (
    'Toko Ritel & Minimarket',
    'Kafe, Restoran, & Coffee Shop',
    'Usaha Laundry',
    'Salon & Barbershop'
  ));

alter table public.businesses
  drop constraint if exists businesses_status_check;
alter table public.businesses
  add constraint businesses_status_check
  check (status in ('active', 'inactive'));

create index if not exists businesses_created_at_idx
  on public.businesses (created_at desc);

-- 3. Row Level Security --------------------------------------------------------
-- Helper security definer agar tidak rekursif jika profiles juga memakai RLS.
create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'superadmin'
  );
$$;

revoke all on function public.is_superadmin() from public;
grant execute on function public.is_superadmin() to authenticated;

alter table public.businesses enable row level security;

drop policy if exists "superadmin select businesses" on public.businesses;
drop policy if exists "superadmin insert businesses" on public.businesses;
drop policy if exists "superadmin update businesses" on public.businesses;
drop policy if exists "superadmin delete businesses" on public.businesses;

create policy "superadmin select businesses" on public.businesses
  for select to authenticated using (public.is_superadmin());

create policy "superadmin insert businesses" on public.businesses
  for insert to authenticated with check (public.is_superadmin());

create policy "superadmin update businesses" on public.businesses
  for update to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

create policy "superadmin delete businesses" on public.businesses
  for delete to authenticated using (public.is_superadmin());
