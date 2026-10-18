-- Migration: Create transactions, items, staff, and business settings with multi-tenant RLS & RPCs
-- Jalankan di Supabase SQL Editor (idempotent).

-- ============================================================================
-- 1. Tabel business_settings (Pengaturan per Bisnis)
-- ============================================================================
create table if not exists public.business_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  tax_enabled boolean not null default false,
  tax_rate numeric(5, 2) not null default 10 check (tax_rate >= 0 and tax_rate <= 100),
  receipt_footer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_business_settings_updated_at on public.business_settings;
create trigger set_business_settings_updated_at
  before update on public.business_settings
  for each row
  execute function public.set_updated_at();

alter table public.business_settings enable row level security;

drop policy if exists "business_settings_select_policy" on public.business_settings;
create policy "business_settings_select_policy" on public.business_settings
  for select to authenticated
  using (
    business_id = public.current_business_id() or public.is_superadmin()
  );

drop policy if exists "business_settings_insert_policy" on public.business_settings;
create policy "business_settings_insert_policy" on public.business_settings
  for insert to authenticated
  with check (
    (public.is_business_owner() and business_id = public.current_business_id()) or public.is_superadmin()
  );

drop policy if exists "business_settings_update_policy" on public.business_settings;
create policy "business_settings_update_policy" on public.business_settings
  for update to authenticated
  using (
    (public.is_business_owner() and business_id = public.current_business_id()) or public.is_superadmin()
  )
  with check (
    (public.is_business_owner() and business_id = public.current_business_id()) or public.is_superadmin()
  );


-- ============================================================================
-- 2. Tabel transactions (Header Transaksi)
-- ============================================================================
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  invoice_no text not null,

  -- Snapshot Customer (opsional)
  customer_id uuid references public.customers(id) on delete set null,
  customer_name_snapshot text,
  customer_phone_snapshot text,

  transaction_date timestamptz not null default now(),

  -- Kalkulasi Finansial
  subtotal numeric(15, 2) not null check (subtotal >= 0),
  item_discount_total numeric(15, 2) not null default 0 check (item_discount_total >= 0),
  discount_type text check (discount_type is null or discount_type in ('percent', 'amount')),
  discount_value numeric(15, 2) default 0 check (discount_value >= 0),
  discount_amount numeric(15, 2) not null default 0 check (discount_amount >= 0),
  tax_rate_snapshot numeric(5, 2) not null default 0 check (tax_rate_snapshot >= 0 and tax_rate_snapshot <= 100),
  tax_amount numeric(15, 2) not null default 0 check (tax_amount >= 0),
  total numeric(15, 2) not null check (total >= 0),

  -- Pembayaran
  payment_method text not null check (payment_method in ('cash', 'qris', 'card')),
  amount_paid numeric(15, 2) not null default 0 check (amount_paid >= 0),
  change_amount numeric(15, 2) not null default 0 check (change_amount >= 0),

  -- Status & Void
  status text not null default 'completed' check (status in ('completed', 'voided')),
  voided_at timestamptz,
  voided_by uuid references public.profiles(id) on delete set null,
  void_reason text,

  -- Audit & Lifecycle
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Constraint unik per invoice per bisnis
create unique index if not exists transactions_business_invoice_unique
  on public.transactions (business_id, invoice_no);

-- Indexes untuk pencarian, filter tanggal & status
create index if not exists transactions_business_date_idx
  on public.transactions (business_id, transaction_date desc);

create index if not exists transactions_business_status_date_idx
  on public.transactions (business_id, status, transaction_date desc);

create index if not exists transactions_customer_idx
  on public.transactions (customer_id);

create index if not exists transactions_created_by_idx
  on public.transactions (created_by);

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at
  before update on public.transactions
  for each row
  execute function public.set_updated_at();

alter table public.transactions enable row level security;

drop policy if exists "transactions_select_policy" on public.transactions;
create policy "transactions_select_policy" on public.transactions
  for select to authenticated
  using (
    business_id = public.current_business_id() or public.is_superadmin()
  );


-- ============================================================================
-- 3. Tabel transaction_items (Item Detail Transaksi)
-- ============================================================================
create table if not exists public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,

  -- Snapshot Produk
  product_name text not null,
  product_type text not null check (product_type in ('product', 'service')),
  unit text default 'pcs',
  unit_price numeric(15, 2) not null check (unit_price >= 0),
  cost_price numeric(15, 2) not null default 0 check (cost_price >= 0),
  quantity numeric(12, 2) not null check (quantity > 0),

  -- Diskon per Item
  discount_type text check (discount_type is null or discount_type in ('percent', 'amount')),
  discount_value numeric(15, 2) default 0 check (discount_value >= 0),
  discount_amount numeric(15, 2) not null default 0 check (discount_amount >= 0),

  -- Proporsi Alokasi Diskon Transaksi & Net Total Baris
  order_discount_share numeric(15, 2) not null default 0 check (order_discount_share >= 0),
  line_total numeric(15, 2) not null check (line_total >= 0),

  has_commission boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists transaction_items_transaction_idx
  on public.transaction_items (transaction_id);

create index if not exists transaction_items_business_product_idx
  on public.transaction_items (business_id, product_id);

alter table public.transaction_items enable row level security;

drop policy if exists "transaction_items_select_policy" on public.transaction_items;
create policy "transaction_items_select_policy" on public.transaction_items
  for select to authenticated
  using (
    business_id = public.current_business_id() or public.is_superadmin()
  );


-- ============================================================================
-- 4. Tabel transaction_item_staff (Staf Pelaksana per Item Transaksi)
-- ============================================================================
create table if not exists public.transaction_item_staff (
  id uuid primary key default gen_random_uuid(),
  transaction_item_id uuid not null references public.transaction_items(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid references public.profiles(id) on delete set null,
  staff_name_snapshot text not null,

  -- Kolom skeleton komisi (nullable, belum dihitung di iterasi ini)
  commission_type text,
  commission_rate numeric,
  commission_amount numeric(15, 2),

  created_at timestamptz not null default now()
);

create unique index if not exists transaction_item_staff_unique_idx
  on public.transaction_item_staff (transaction_item_id, staff_id);

create index if not exists transaction_item_staff_business_staff_idx
  on public.transaction_item_staff (business_id, staff_id);

alter table public.transaction_item_staff enable row level security;

drop policy if exists "transaction_item_staff_select_policy" on public.transaction_item_staff;
create policy "transaction_item_staff_select_policy" on public.transaction_item_staff
  for select to authenticated
  using (
    business_id = public.current_business_id() or public.is_superadmin()
  );


-- ============================================================================
-- 5. Helper Function: generate_invoice_no
-- Race-safe generator nomor invoice harian per bisnis (INV-YYYYMMDD-0001)
-- Menggunakan advisory lock transaksi pada business_id
-- ============================================================================
create or replace function public.generate_invoice_no(p_business_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date_str text;
  v_prefix text;
  v_seq integer;
begin
  -- Lock advisory eksklusif untuk bisnis ini selama transaksi berlangsung
  perform pg_advisory_xact_lock(hashtext('invoice_' || p_business_id::text));

  -- Format tanggal Asia/Jakarta YYYYMMDD
  v_date_str := to_char(now() at time zone 'Asia/Jakarta', 'YYYYMMDD');
  v_prefix := 'INV-' || v_date_str || '-';

  -- Cari nomor urut terbesar hari ini untuk prefix tersebut
  select coalesce(
    max(
      case
        when invoice_no like v_prefix || '%'
             and substring(invoice_no from length(v_prefix) + 1) ~ '^[0-9]+$'
        then substring(invoice_no from length(v_prefix) + 1)::integer
        else 0
      end
    ),
    0
  ) + 1
  into v_seq
  from public.transactions
  where business_id = p_business_id;

  return v_prefix || lpad(v_seq::text, 4, '0');
end;
$$;

revoke all on function public.generate_invoice_no(uuid) from public;
grant execute on function public.generate_invoice_no(uuid) to authenticated;


-- ============================================================================
-- 6. RPC: create_transaction
-- Aturan kalkulasi & pembulatan:
-- Semua nominal moneter (diskon, pajak, total, alokasi per baris) dibulatkan
-- ke bilangan bulat Rupiah (0 angka di belakang koma: round(..., 0)).
-- Sisa selisih pembulatan alokasi diskon transaksi dimasukkan ke baris terakhir
-- sehingga invarian: sum(line_total) = taxable selalu terpenuhi secara persis.
-- ============================================================================
create or replace function public.create_transaction(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_business_id uuid;

  -- Customer
  v_cust_id uuid;
  v_cust_name text;
  v_cust_phone text;

  -- Items payload & loop
  v_items_json jsonb;
  v_item_count integer;
  v_item jsonb;
  v_p_id uuid;
  v_qty numeric;
  v_prod record;

  -- Financial accumulator
  v_subtotal numeric(15, 2) := 0;
  v_item_disc_total numeric(15, 2) := 0;
  v_subtotal_after_item numeric(15, 2) := 0;

  v_disc_type text;
  v_disc_val numeric;
  v_disc_amt numeric;
  v_gross numeric;
  v_after_item numeric;

  -- Arrays untuk menyimpan hasil hitung tiap baris sebelum insert
  v_prod_ids uuid[] := '{}';
  v_prod_names text[] := '{}';
  v_prod_types text[] := '{}';
  v_units text[] := '{}';
  v_unit_prices numeric[] := '{}';
  v_cost_prices numeric[] := '{}';
  v_qtys numeric[] := '{}';
  v_item_disc_types text[] := '{}';
  v_item_disc_values numeric[] := '{}';
  v_item_disc_amounts numeric[] := '{}';
  v_after_items numeric[] := '{}';
  v_order_disc_shares numeric[] := '{}';
  v_line_totals numeric[] := '{}';
  v_has_commissions boolean[] := '{}';
  v_item_staff_jsons jsonb[] := '{}';

  -- Order-level discount
  v_order_disc_type text;
  v_order_disc_val numeric;
  v_order_disc_amt numeric := 0;
  v_allocated_share_sum numeric := 0;
  v_share numeric;

  -- Tax & Total
  v_tax_enabled boolean := false;
  v_tax_rate numeric(5, 2) := 10;
  v_tax_rate_snapshot numeric(5, 2) := 0;
  v_tax_amount numeric(15, 2) := 0;
  v_taxable numeric(15, 2) := 0;
  v_total numeric(15, 2) := 0;

  -- Payment
  v_pay_method text;
  v_amount_paid numeric(15, 2);
  v_change_amount numeric(15, 2) := 0;

  -- Database records
  v_invoice_no text;
  v_tx_id uuid;
  v_item_id uuid;

  -- Staff handling
  v_staff_arr jsonb;
  v_staff_len integer;
  v_s_id uuid;
  v_staff_name text;

  v_result jsonb;
  i integer;
  j integer;
begin
  -- 1. Verifikasi caller
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Unauthorized: Pengguna belum terautentikasi' using errcode = '42501';
  end if;

  select business_id into v_business_id
  from public.profiles
  where id = v_caller_id and deleted_at is null and is_active = true;

  if v_business_id is null then
    raise exception 'Profil pengguna tidak valid atau tidak memiliki bisnis aktif' using errcode = '42501';
  end if;

  -- 2. Validasi daftar item
  v_items_json := payload->'items';
  if v_items_json is null or jsonb_typeof(v_items_json) <> 'array' or jsonb_array_length(v_items_json) = 0 then
    raise exception 'Daftar item transaksi tidak boleh kosong' using errcode = '22000';
  end if;

  v_item_count := jsonb_array_length(v_items_json);

  -- 3. Validasi pelanggan (jika disertakan)
  if payload->>'customer_id' is not null and trim(payload->>'customer_id') <> '' then
    v_cust_id := (payload->>'customer_id')::uuid;
    select name, phone_number into v_cust_name, v_cust_phone
    from public.customers
    where id = v_cust_id and business_id = v_business_id and deleted_at is null;

    if not found then
      raise exception 'Pelanggan tidak ditemukan atau tidak aktif pada bisnis ini' using errcode = '22000';
    end if;
  end if;

  -- 4. Loop verifikasi produk, lock stok, hitung harga & diskon item
  for i in 0 .. v_item_count - 1 loop
    v_item := v_items_json->i;
    v_p_id := (v_item->>'product_id')::uuid;
    v_qty := coalesce((v_item->>'quantity')::numeric, 0);

    if v_qty <= 0 then
      raise exception 'Kuantitas item harus lebih besar dari 0' using errcode = '22000';
    end if;

    -- Lock baris produk untuk transaksi stok yang aman dari race condition
    select name, type, unit, selling_price, cost_price, track_stock, stock, has_commission, is_active, deleted_at
    into v_prod
    from public.products
    where id = v_p_id and business_id = v_business_id
    for update;

    if not found then
      raise exception 'Produk dengan ID % tidak ditemukan pada bisnis ini', v_p_id using errcode = '22000';
    end if;

    if v_prod.deleted_at is not null or v_prod.is_active = false then
      raise exception 'Produk "%" sudah tidak aktif atau telah dihapus', v_prod.name using errcode = '22000';
    end if;

    -- Validasi dan kurangi stok untuk barang fisik bertrack_stock
    if v_prod.type = 'product' and v_prod.track_stock = true then
      if v_prod.stock < v_qty then
        raise exception 'Stok tidak mencukupi untuk produk "%": sisa %, diminta %', v_prod.name, v_prod.stock, v_qty using errcode = '22000';
      end if;

      update public.products
      set stock = stock - v_qty
      where id = v_p_id;
    end if;

    -- Hitung harga kotor (gross)
    v_gross := round(v_prod.selling_price * v_qty, 0);
    v_subtotal := v_subtotal + v_gross;

    -- Hitung diskon item
    v_disc_type := v_item->>'discount_type';
    v_disc_val := coalesce((v_item->>'discount_value')::numeric, 0);

    if v_disc_type = 'percent' then
      if v_disc_val < 0 or v_disc_val > 100 then
        raise exception 'Diskon persen item harus antara 0 dan 100' using errcode = '22000';
      end if;
      v_disc_amt := round(v_gross * (v_disc_val / 100.0), 0);
    elsif v_disc_type = 'amount' then
      if v_disc_val < 0 then
        raise exception 'Nominal diskon item tidak boleh negatif' using errcode = '22000';
      end if;
      if v_disc_val > v_gross then
        raise exception 'Diskon item (Rp %) tidak boleh melebihi total harga item (Rp %)', v_disc_val, v_gross using errcode = '22000';
      end if;
      v_disc_amt := round(v_disc_val, 0);
    else
      v_disc_type := null;
      v_disc_val := 0;
      v_disc_amt := 0;
    end if;

    v_after_item := v_gross - v_disc_amt;
    v_item_disc_total := v_item_disc_total + v_disc_amt;
    v_subtotal_after_item := v_subtotal_after_item + v_after_item;

    -- Kumpulkan data baris
    v_prod_ids := array_append(v_prod_ids, v_p_id);
    v_prod_names := array_append(v_prod_names, v_prod.name);
    v_prod_types := array_append(v_prod_types, v_prod.type);
    v_units := array_append(v_units, coalesce(v_prod.unit, 'pcs'));
    v_unit_prices := array_append(v_unit_prices, v_prod.selling_price);
    v_cost_prices := array_append(v_cost_prices, v_prod.cost_price);
    v_qtys := array_append(v_qtys, v_qty);
    v_item_disc_types := array_append(v_item_disc_types, v_disc_type);
    v_item_disc_values := array_append(v_item_disc_values, v_disc_val);
    v_item_disc_amounts := array_append(v_item_disc_amounts, v_disc_amt);
    v_after_items := array_append(v_after_items, v_after_item);
    v_has_commissions := array_append(v_has_commissions, coalesce(v_prod.has_commission, false));
    v_item_staff_jsons := array_append(v_item_staff_jsons, v_item->'staff_ids');
  end loop;

  -- 5. Hitung diskon tingkat transaksi (order-level)
  v_order_disc_type := payload->>'discount_type';
  v_order_disc_val := coalesce((payload->>'discount_value')::numeric, 0);

  if v_order_disc_type = 'percent' then
    if v_order_disc_val < 0 or v_order_disc_val > 100 then
      raise exception 'Diskon persen transaksi harus antara 0 dan 100' using errcode = '22000';
    end if;
    v_order_disc_amt := round(v_subtotal_after_item * (v_order_disc_val / 100.0), 0);
  elsif v_order_disc_type = 'amount' then
    if v_order_disc_val < 0 then
      raise exception 'Nominal diskon transaksi tidak boleh negatif' using errcode = '22000';
    end if;
    if v_order_disc_val > v_subtotal_after_item then
      raise exception 'Diskon transaksi (Rp %) tidak boleh melebihi subtotal setelah diskon item (Rp %)', v_order_disc_val, v_subtotal_after_item using errcode = '22000';
    end if;
    v_order_disc_amt := round(v_order_disc_val, 0);
  else
    v_order_disc_type := null;
    v_order_disc_val := 0;
    v_order_disc_amt := 0;
  end if;

  -- 6. Alokasi proporsional diskon transaksi ke setiap baris
  v_allocated_share_sum := 0;
  for i in 1 .. v_item_count loop
    if i < v_item_count then
      if v_subtotal_after_item > 0 and v_order_disc_amt > 0 then
        v_share := round(v_order_disc_amt * (v_after_items[i] / v_subtotal_after_item), 0);
      else
        v_share := 0;
      end if;
      v_allocated_share_sum := v_allocated_share_sum + v_share;
    else
      -- Selisih pembulatan dialokasikan ke baris terakhir
      v_share := v_order_disc_amt - v_allocated_share_sum;
    end if;

    v_order_disc_shares := array_append(v_order_disc_shares, v_share);
    v_line_totals := array_append(v_line_totals, v_after_items[i] - v_share);
  end loop;

  -- 7. Hitung PPN (baca konfigurasi server-side dari business_settings)
  select tax_enabled, tax_rate into v_tax_enabled, v_tax_rate
  from public.business_settings
  where business_id = v_business_id;

  if not found then
    v_tax_enabled := false;
    v_tax_rate := 10;
  end if;

  v_taxable := v_subtotal_after_item - v_order_disc_amt;

  if v_tax_enabled = true then
    v_tax_rate_snapshot := v_tax_rate;
    v_tax_amount := round(v_taxable * (v_tax_rate / 100.0), 0);
  else
    v_tax_rate_snapshot := 0;
    v_tax_amount := 0;
  end if;

  v_total := v_taxable + v_tax_amount;

  -- 8. Validasi Pembayaran
  v_pay_method := payload->>'payment_method';
  if v_pay_method not in ('cash', 'qris', 'card') then
    raise exception 'Metode pembayaran tidak valid: %', v_pay_method using errcode = '22000';
  end if;

  v_amount_paid := coalesce((payload->>'amount_paid')::numeric, 0);

  if v_pay_method = 'cash' then
    if v_amount_paid < v_total then
      raise exception 'Nominal pembayaran tunai (Rp %) kurang dari total tagihan (Rp %)', v_amount_paid, v_total using errcode = '22000';
    end if;
    v_change_amount := v_amount_paid - v_total;
  else
    v_amount_paid := v_total;
    v_change_amount := 0;
  end if;

  -- 9. Buat nomor invoice race-safe
  v_invoice_no := public.generate_invoice_no(v_business_id);

  -- 10. Insert header transaksi
  insert into public.transactions (
    business_id,
    invoice_no,
    customer_id,
    customer_name_snapshot,
    customer_phone_snapshot,
    transaction_date,
    subtotal,
    item_discount_total,
    discount_type,
    discount_value,
    discount_amount,
    tax_rate_snapshot,
    tax_amount,
    total,
    payment_method,
    amount_paid,
    change_amount,
    status,
    created_by
  ) values (
    v_business_id,
    v_invoice_no,
    v_cust_id,
    v_cust_name,
    v_cust_phone,
    now(),
    v_subtotal,
    v_item_disc_total,
    v_order_disc_type,
    v_order_disc_val,
    v_order_disc_amt,
    v_tax_rate_snapshot,
    v_tax_amount,
    v_total,
    v_pay_method,
    v_amount_paid,
    v_change_amount,
    'completed',
    v_caller_id
  ) returning id into v_tx_id;

  -- 11. Insert item transaksi & staf pelaksana
  for i in 1 .. v_item_count loop
    insert into public.transaction_items (
      transaction_id,
      business_id,
      product_id,
      product_name,
      product_type,
      unit,
      unit_price,
      cost_price,
      quantity,
      discount_type,
      discount_value,
      discount_amount,
      order_discount_share,
      line_total,
      has_commission
    ) values (
      v_tx_id,
      v_business_id,
      v_prod_ids[i],
      v_prod_names[i],
      v_prod_types[i],
      v_units[i],
      v_unit_prices[i],
      v_cost_prices[i],
      v_qtys[i],
      v_item_disc_types[i],
      v_item_disc_values[i],
      v_item_disc_amounts[i],
      v_order_disc_shares[i],
      v_line_totals[i],
      v_has_commissions[i]
    ) returning id into v_item_id;

    -- Validasi & simpan staf pelaksana (maksimal 3 per item)
    v_staff_arr := v_item_staff_jsons[i];
    if v_staff_arr is not null and jsonb_typeof(v_staff_arr) = 'array' then
      v_staff_len := jsonb_array_length(v_staff_arr);
      if v_staff_len > 3 then
        raise exception 'Maksimal 3 staf pelaksana per item' using errcode = '22000';
      end if;

      for j in 0 .. v_staff_len - 1 loop
        v_s_id := (v_staff_arr->>j)::uuid;
        if v_s_id is not null then
          select full_name into v_staff_name
          from public.profiles
          where id = v_s_id
            and business_id = v_business_id
            and deleted_at is null
            and is_active = true;

          if not found then
            raise exception 'Staf dengan ID % tidak ditemukan atau bukan bagian dari bisnis ini', v_s_id using errcode = '22000';
          end if;

          insert into public.transaction_item_staff (
            transaction_item_id,
            business_id,
            staff_id,
            staff_name_snapshot
          ) values (
            v_item_id,
            v_business_id,
            v_s_id,
            v_staff_name
          );
        end if;
      end loop;
    end if;
  end loop;

  -- 12. Return data transaksi yang dibuat
  select jsonb_build_object(
    'id', t.id,
    'invoice_no', t.invoice_no,
    'business_id', t.business_id,
    'customer_id', t.customer_id,
    'customer_name_snapshot', t.customer_name_snapshot,
    'customer_phone_snapshot', t.customer_phone_snapshot,
    'transaction_date', t.transaction_date,
    'subtotal', t.subtotal,
    'item_discount_total', t.item_discount_total,
    'discount_type', t.discount_type,
    'discount_value', t.discount_value,
    'discount_amount', t.discount_amount,
    'tax_rate_snapshot', t.tax_rate_snapshot,
    'tax_amount', t.tax_amount,
    'total', t.total,
    'payment_method', t.payment_method,
    'amount_paid', t.amount_paid,
    'change_amount', t.change_amount,
    'status', t.status,
    'created_by', t.created_by,
    'created_at', t.created_at
  ) into v_result
  from public.transactions t
  where t.id = v_tx_id;

  return v_result;
end;
$$;

revoke all on function public.create_transaction(jsonb) from public;
grant execute on function public.create_transaction(jsonb) to authenticated;


-- ============================================================================
-- 7. RPC: void_transaction
-- Membatalkan transaksi:
-- - Hanya boleh dieksekusi oleh Owner dari bisnis yang bersangkutan (atau superadmin)
-- - Alasan void wajib diisi
-- - Mengembalikan stok untuk semua item bertipe 'product' dan track_stock = true
-- ============================================================================
create or replace function public.void_transaction(p_transaction_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_tx record;
  v_item record;
  v_trimmed_reason text;
  v_is_owner boolean;
  v_result jsonb;
begin
  -- 1. Verifikasi caller
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Unauthorized: Pengguna belum terautentikasi' using errcode = '42501';
  end if;

  v_trimmed_reason := trim(coalesce(p_reason, ''));
  if v_trimmed_reason = '' then
    raise exception 'Alasan pembatalan transaksi (void) wajib diisi' using errcode = '22000';
  end if;

  -- 2. Kunci baris transaksi
  select * into v_tx
  from public.transactions
  where id = p_transaction_id
  for update;

  if not found then
    raise exception 'Transaksi tidak ditemukan' using errcode = '22000';
  end if;

  if v_tx.status = 'voided' then
    raise exception 'Transaksi ini sudah dibatalkan sebelumnya' using errcode = '22000';
  end if;

  -- 3. Cek otorisasi owner bisnis
  select (role = 'owner' and business_id = v_tx.business_id) or role = 'superadmin'
  into v_is_owner
  from public.profiles
  where id = v_caller_id and deleted_at is null;

  if not coalesce(v_is_owner, false) then
    raise exception 'Hanya pemilik bisnis (owner) yang berhak membatalkan transaksi' using errcode = '42501';
  end if;

  -- 4. Kembalikan stok produk fisik yang dilacak stoknya
  for v_item in
    select ti.product_id, ti.quantity, p.track_stock, p.type
    from public.transaction_items ti
    join public.products p on p.id = ti.product_id
    where ti.transaction_id = v_tx.id
  loop
    if v_item.type = 'product' and v_item.track_stock = true and v_item.product_id is not null then
      update public.products
      set stock = stock + v_item.quantity
      where id = v_item.product_id;
    end if;
  end loop;

  -- 5. Tandai status voided
  update public.transactions
  set status = 'voided',
      voided_at = now(),
      voided_by = v_caller_id,
      void_reason = v_trimmed_reason,
      updated_at = now()
  where id = v_tx.id;

  select jsonb_build_object(
    'id', id,
    'invoice_no', invoice_no,
    'status', status,
    'voided_at', voided_at,
    'voided_by', voided_by,
    'void_reason', void_reason
  ) into v_result
  from public.transactions
  where id = v_tx.id;

  return v_result;
end;
$$;

revoke all on function public.void_transaction(uuid, text) from public;
grant execute on function public.void_transaction(uuid, text) to authenticated;
