-- ============================================================================
-- SQL Test Suite: Transactions Feature (Phase 1)
-- File: supabase/tests/transactions.sql
--
-- Cara menjalankan:
-- Jalankan skrip ini di Supabase SQL Editor.
-- Seluruh test dieksekusi di dalam blok DO $$ dengan penanganan rollback / assert.
-- ============================================================================

do $$
declare
  -- Tenant A (Bisnis Utama)
  v_biz_a uuid := gen_random_uuid();
  v_owner_a uuid := gen_random_uuid();
  v_staff_a uuid := gen_random_uuid();
  v_cust_a uuid := gen_random_uuid();
  v_prod_tracked uuid := gen_random_uuid();
  v_prod_service uuid := gen_random_uuid();

  -- Tenant B (Bisnis Lain untuk uji isolasi multi-tenant)
  v_biz_b uuid := gen_random_uuid();
  v_owner_b uuid := gen_random_uuid();
  v_cust_b uuid := gen_random_uuid();
  v_prod_b uuid := gen_random_uuid();

  -- Penampung hasil & variabel uji
  v_tx_result jsonb;
  v_void_result jsonb;
  v_tx_id uuid;
  v_stock numeric;
  v_sum_line_total numeric;
  v_taxable numeric;
  v_error_caught boolean;
begin
  raise notice '>>> Memulai Pengujian Fitur Transaksi (Phase 1)...';

  -- ==========================================================================
  -- SETUP FIXTURES (Bisnis, Akun Owner/Staff, Produk, Pelanggan)
  -- ==========================================================================
  insert into public.businesses (id, business_name, business_code, owner_name, owner_phone, owner_email, business_type)
  values 
    (v_biz_a, 'Bisnis A Test', 'biztesta', 'Owner A', '081200000001', 'owner_a@test.com', 'retail'),
    (v_biz_b, 'Bisnis B Test', 'biztestb', 'Owner B', '081200000002', 'owner_b@test.com', 'retail');

  insert into public.profiles (id, business_id, email, full_name, role, can_login, is_active)
  values
    (v_owner_a, v_biz_a, 'owner_a@test.com', 'Owner A', 'owner', true, true),
    (v_staff_a, v_biz_a, 'staff_a@test.com', 'Staff A', 'staff', true, true),
    (v_owner_b, v_biz_b, 'owner_b@test.com', 'Owner B', 'owner', true, true);

  insert into public.customers (id, business_id, name, phone_number, is_active)
  values
    (v_cust_a, v_biz_a, 'Pelanggan A', '081200000001', true),
    (v_cust_b, v_biz_b, 'Pelanggan B', '081200000002', true);

  -- Produk fisik dengan stok = 10
  insert into public.products (id, business_id, name, type, selling_price, cost_price, track_stock, stock, is_active)
  values (v_prod_tracked, v_biz_a, 'Kopi Susu Kemasan', 'product', 20000, 12000, true, 10, true);

  -- Produk jasa (layanan) tanpa stok
  insert into public.products (id, business_id, name, type, selling_price, cost_price, track_stock, stock, is_active)
  values (v_prod_service, v_biz_a, 'Jasa Potong Rambut', 'service', 50000, 0, false, 0, true);

  -- Produk milik Bisnis B
  insert into public.products (id, business_id, name, type, selling_price, cost_price, track_stock, stock, is_active)
  values (v_prod_b, v_biz_b, 'Produk Milik Bisnis B', 'product', 30000, 15000, true, 5, true);


  -- ==========================================================================
  -- TEST 1: Penjualan Normal dengan Diskon Item & Diskon Order (Tax OFF)
  -- Cek invarian: Σ line_total = taxable, dan total = subtotal - disc + tax
  -- ==========================================================================
  -- Simulasikan login sebagai Staff A
  perform set_config('request.jwt.claims', json_build_object('sub', v_staff_a::text)::text, true);

  -- Pastikan tax nonaktif di Bisnis A
  insert into public.business_settings (business_id, tax_enabled, tax_rate)
  values (v_biz_a, false, 10)
  on conflict (business_id) do update set tax_enabled = false, tax_rate = 10;

  -- Beli 2x Kopi Susu (40.000) diskon item 10% (4.000) -> 36.000
  -- Ditambah 1x Jasa Servis (50.000) diskon item Rp 5.000 -> 45.000
  -- Subtotal after item = 81.000
  -- Diskon order = 10.000 -> Taxable = 71.000
  -- Tax = 0 -> Total = 71.000. Bayar cash 100.000 -> Kembali 29.000
  v_tx_result := public.create_transaction(jsonb_build_object(
    'customer_id', v_cust_a,
    'payment_method', 'cash',
    'amount_paid', 100000,
    'discount_type', 'amount',
    'discount_value', 10000,
    'items', jsonb_build_array(
      jsonb_build_object(
        'product_id', v_prod_tracked,
        'quantity', 2,
        'discount_type', 'percent',
        'discount_value', 10,
        'staff_ids', jsonb_build_array(v_staff_a)
      ),
      jsonb_build_object(
        'product_id', v_prod_service,
        'quantity', 1,
        'discount_type', 'amount',
        'discount_value', 5000,
        'staff_ids', jsonb_build_array(v_staff_a)
      )
    )
  ));

  v_tx_id := (v_tx_result->>'id')::uuid;

  assert (v_tx_result->>'subtotal')::numeric = 90000, 'TEST 1 GAGAL: Subtotal salah';
  assert (v_tx_result->>'item_discount_total')::numeric = 9000, 'TEST 1 GAGAL: Total diskon item salah';
  assert (v_tx_result->>'discount_amount')::numeric = 10000, 'TEST 1 GAGAL: Total diskon transaksi salah';
  assert (v_tx_result->>'tax_amount')::numeric = 0, 'TEST 1 GAGAL: Pajak harus 0 karena tax_enabled = false';
  assert (v_tx_result->>'total')::numeric = 71000, 'TEST 1 GAGAL: Total salah';
  assert (v_tx_result->>'change_amount')::numeric = 29000, 'TEST 1 GAGAL: Kembalian salah';

  -- Cek invarian Σ line_total = taxable (71.000)
  v_sum_line_total := (
    select sum(line_total)
    from public.transaction_items
    where transaction_id = v_tx_id
  );

  assert v_sum_line_total = 71000, 'TEST 1 GAGAL: Invarian sum(line_total) = taxable tidak cocok';

  -- Cek pengurangan stok: produk fisik berkurang dari 10 menjadi 8, jasa tetap
  v_stock := (select stock from public.products where id = v_prod_tracked);
  assert v_stock = 8, 'TEST 1 GAGAL: Stok produk fisik tidak berkurang sesuai kuantitas';

  raise notice '✓ TEST 1 BERHASIL: Penjualan normal, diskon, alokasi & invarian baris valid.';


  -- ==========================================================================
  -- TEST 2: Perhitungan Pajak PPN Aktif (Tax ON)
  -- ==========================================================================
  update public.business_settings
  set tax_enabled = true, tax_rate = 11
  where business_id = v_biz_a;

  -- Beli 1x Kopi Susu (20.000). Taxable = 20.000. PPN 11% = 2.200. Total = 22.200
  v_tx_result := public.create_transaction(jsonb_build_object(
    'payment_method', 'qris',
    'items', jsonb_build_array(
      jsonb_build_object(
        'product_id', v_prod_tracked,
        'quantity', 1
      )
    )
  ));

  assert (v_tx_result->>'tax_rate_snapshot')::numeric = 11, 'TEST 2 GAGAL: Snapshot rate pajak salah';
  assert (v_tx_result->>'tax_amount')::numeric = 2200, 'TEST 2 GAGAL: Perhitungan nominal pajak salah';
  assert (v_tx_result->>'total')::numeric = 22200, 'TEST 2 GAGAL: Total dengan pajak salah';

  raise notice '✓ TEST 2 BERHASIL: Kalkulasi PPN aktif (11 persen) terverifikasi.';


  -- ==========================================================================
  -- TEST 3: Stok Tidak Mencukupi Ditolak
  -- Sisa stok kopi: 7 unit. Beli 10 unit harus melempar error
  -- ==========================================================================
  v_error_caught := false;
  begin
    perform public.create_transaction(jsonb_build_object(
      'payment_method', 'cash',
      'amount_paid', 500000,
      'items', jsonb_build_array(
        jsonb_build_object(
          'product_id', v_prod_tracked,
          'quantity', 10
        )
      )
    ));
  exception when others then
    v_error_caught := true;
  end;

  assert v_error_caught = true, 'TEST 3 GAGAL: Pembelian melebihi stok tidak melempar exception';
  raise notice '✓ TEST 3 BERHASIL: Pembelian melebihi sisa stok berhasil ditolak.';


  -- ==========================================================================
  -- TEST 4: Validasi Diskon Tidak Valid Ditolak
  -- a. Diskon item nominal melebihi harga produk
  -- b. Diskon persen > 100%
  -- ==========================================================================
  v_error_caught := false;
  begin
    perform public.create_transaction(jsonb_build_object(
      'payment_method', 'cash',
      'amount_paid', 100000,
      'items', jsonb_build_array(
        jsonb_build_object(
          'product_id', v_prod_tracked,
          'quantity', 1,
          'discount_type', 'amount',
          'discount_value', 25000 -- harga produk 20.000
        )
      )
    ));
  exception when others then
    v_error_caught := true;
  end;
  assert v_error_caught = true, 'TEST 4a GAGAL: Diskon item > harga tidak ditolak';

  v_error_caught := false;
  begin
    perform public.create_transaction(jsonb_build_object(
      'payment_method', 'cash',
      'amount_paid', 100000,
      'discount_type', 'percent',
      'discount_value', 120, -- diskon persen > 100
      'items', jsonb_build_array(
        jsonb_build_object('product_id', v_prod_tracked, 'quantity', 1)
      )
    ));
  exception when others then
    v_error_caught := true;
  end;
  assert v_error_caught = true, 'TEST 4b GAGAL: Diskon persen > 100 tidak ditolak';
  raise notice '✓ TEST 4 BERHASIL: Validasi batas diskon berhasil ditolak.';


  -- ==========================================================================
  -- TEST 5: Void Transaksi
  -- a. Staff (bukan owner) mencoba void -> Ditolak
  -- b. Owner melakukan void -> Berhasil dan stok dikembalikan
  -- ==========================================================================
  -- Sisa stok produk sebelum void test 1: 7
  -- v_tx_id pada Test 1 mengambil 2 unit Kopi Susu
  v_error_caught := false;
  begin
    -- Masih sebagai Staff A
    perform public.void_transaction(v_tx_id, 'Salah input oleh staff');
  exception when others then
    v_error_caught := true;
  end;
  assert v_error_caught = true, 'TEST 5a GAGAL: Non-owner bisa melakukan void';

  -- Ganti login sebagai Owner A
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner_a::text)::text, true);

  v_void_result := public.void_transaction(v_tx_id, 'Pembatalan transaksi oleh owner');
  assert v_void_result->>'status' = 'voided', 'TEST 5b GAGAL: Status tidak berubah menjadi voided';

  -- Stok harus kembali bertambah 2 (dari 7 menjadi 9)
  v_stock := (select stock from public.products where id = v_prod_tracked);
  assert v_stock = 9, 'TEST 5b GAGAL: Stok tidak dikembalikan setelah void (seharusnya 9, aktual ' || v_stock || ')';

  raise notice '✓ TEST 5 BERHASIL: Otorisasi void dan pengembalian stok terverifikasi.';


  -- ==========================================================================
  -- TEST 6: Isolasi Multi-Tenant (Cross-Tenant Access Ditolak)
  -- Pengguna Bisnis A mencoba menjual produk milik Bisnis B
  -- ==========================================================================
  v_error_caught := false;
  begin
    perform public.create_transaction(jsonb_build_object(
      'payment_method', 'cash',
      'amount_paid', 50000,
      'items', jsonb_build_array(
        jsonb_build_object(
          'product_id', v_prod_b, -- milik bisnis B
          'quantity', 1
        )
      )
    ));
  exception when others then
    v_error_caught := true;
  end;
  assert v_error_caught = true, 'TEST 6 GAGAL: Pengguna dapat mengakses produk milik bisnis lain';
  raise notice '✓ TEST 6 BERHASIL: Akses cross-tenant ditolak.';


  -- ==========================================================================
  -- CLEANUP TEST FIXTURES
  -- ==========================================================================
  delete from public.businesses where id in (v_biz_a, v_biz_b);
  raise notice '>>> Seluruh pengujian Phase 1 berhasil 100 persen tanpa error!';
end;
$$;
