-- Hapus check constraint tipe bisnis di database agar database murni menerima string apa saja
-- Validasi opsi dropdown dikelola sepenuhnya di sisi frontend (FE).

alter table public.businesses
  drop constraint if exists businesses_business_type_check;
