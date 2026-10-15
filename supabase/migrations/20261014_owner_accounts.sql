-- Owner login support. Jalankan di Supabase SQL Editor (idempotent).
-- Asumsi: public.profiles(id uuid) sudah ada dan id = auth.users.id.

-- 1. profiles: tautkan owner ke bisnisnya ---------------------------------------
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists business_id uuid;

alter table public.profiles
  drop constraint if exists profiles_business_id_fkey;
alter table public.profiles
  add constraint profiles_business_id_fkey
  foreign key (business_id) references public.businesses(id) on delete cascade;

-- 2. Email owner harus unik (email ini dipakai untuk login) -----------------------
create unique index if not exists businesses_owner_email_unique
  on public.businesses (lower(owner_email));

-- 3. Owner boleh membaca bisnisnya sendiri (dipakai saat cek status login) -------
create or replace function public.current_business_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select business_id from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_business_id() from public;
grant execute on function public.current_business_id() to authenticated;

drop policy if exists "owner select own business" on public.businesses;
create policy "owner select own business" on public.businesses
  for select to authenticated
  using (id = public.current_business_id());

-- 4. Insert/update/delete bisnis kini lewat Edge Function (service role), -------
--    jadi policy tulis langsung dari client untuk superadmin dicabut agar
--    tidak ada jalur yang membuat bisnis tanpa akun login / melewati ban status.
drop policy if exists "superadmin insert businesses" on public.businesses;
drop policy if exists "superadmin update businesses" on public.businesses;
drop policy if exists "superadmin delete businesses" on public.businesses;
