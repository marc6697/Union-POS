# Union POS - Mobile-First SaaS Point of Sale

Dokumentasi inisialisasi awal dan instalasi dependensi untuk proyek **Union POS**.

---

## 1. Ringkasan Proyek (Project Overview)
**Union POS** adalah aplikasi kasir (Point of Sale) modern berbasis **Progressive Web App (PWA)** dengan pendekatan **Mobile-First**. Dirancang dengan model bisnis **Software-as-a-Service (SaaS)** multi-tenant yang siap dijual dan digunakan oleh berbagai klien ritel, F&B, dan UMKM.

### Karakteristik Utama:
- **Mobile-First PWA**: Responsif untuk smartphone & tablet kasir, dapat di-install langsung ke homescreen (Android & iOS) dan mendukung kemampuan offline dasar.
- **Backend & Database**: PostgreSQL via Supabase (Auth, Row Level Security/RLS, database validation).
- **Thermal Receipt Printer**: Kompatibel dengan printer Bluetooth Thermal (ESC/POS) di Android (Web Bluetooth API) serta iOS (Web Bluetooth browser / fallback print layout 58mm & 80mm).

---

## 2. Tech Stack

| Lapisan | Teknologi | Penjelasan |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript | UI berbasis komponen yang modular dan type-safe |
| **Build Tool & Bundler** | Vite 8 | Build tool berkecepatan tinggi dengan HMR |
| **PWA Engine** | `vite-plugin-pwa` + `workbox` | Service worker otomatis, app manifest, installable PWA |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/vite`) | Utility-first CSS dioptimalkan untuk mobile safe-areas |
| **Routing** | React Router v7 (`react-router-dom`) | Navigasi halaman Kasir, Produk, Transaksi, Laporan, Pengaturan |
| **State Management** | Zustand | State ringan dan cepat untuk keranjang belanja & sesi aktif |
| **Backend & DB** | Supabase (`@supabase/supabase-js`) | PostgreSQL, Auth, Realtime, dan Row Level Security (RLS) |
| **Thermal Printing** | `@point-of-sale/receipt-printer-encoder` | Generator binary ESC/POS untuk printer Bluetooth thermal |
| **Icons & UI Feedback** | Lucide React, Sonner, Canvas Confetti | Ikon mobile POS, toast notification, dan feedback transaksi |

---

## 3. Daftar Dependensi yang Diinstal

### Dependensi Produksi (`dependencies`)
1. **`@supabase/supabase-js`**
   - SDK klien Supabase resmi untuk integrasi autentikasi pengguna, query PostgreSQL, mutasi data, dan keamanan multi-tenant dengan RLS.
2. **`@point-of-sale/receipt-printer-encoder`**
   - Pustaka untuk menyusun dan meng-encode data struk belanja menjadi perintah byte ESC/POS yang kompatibel dengan mayoritas printer thermal mini (58mm dan 80mm).
3. **`react-router-dom`**
   - Penanganan routing SPA untuk navigasi antar modul (POS Cashier, Katalog Produk, Riwayat Transaksi, Laporan Penjualan, Pengaturan Printer/Toko, Autentikasi).
4. **`zustand`**
   - Manajemen state global yang sangat efisien untuk menangani keranjang transaksi (cart), diskon, pajak, metode pembayaran, serta konfigurasi printer aktif tanpa re-render berlebih.
5. **`lucide-react`**
   - Kumpulan icon modern yang ringan untuk antarmuka kasir mobile.
6. **`sonner`**
   - Komponen toast notification cepat dan elegan untuk memberi tahu status (misal: "Barang ditambahkan", "Printer terhubung", "Transaksi berhasil").
7. **`clsx` & `tailwind-merge`**
   - Utilitas penggabungan kelas styling dinamis untuk komponen UI.
8. **`date-fns`**
   - Utilitas manipulasi dan formatting tanggal/waktu transaksi pada struk dan laporan.
9. **`canvas-confetti`**
   - Animasi perayaan visual saat transaksi sukses dibayarkan untuk meningkatkan pengalaman pengguna (kasir/pelanggan).
10. **`workbox-window`**
    - Pustaka pembantu registrasi dan penanganan update service worker PWA di sisi browser.

### Dependensi Pengembangan (`devDependencies`)
1. **`tailwindcss` & `@tailwindcss/vite`**
   - Kompiler Tailwind CSS v4 terbaru yang terintegrasi langsung ke Vite pipeline.
2. **`vite-plugin-pwa`**
   - Plugin Vite untuk mengotomasi pembuatan file `manifest.webmanifest` dan Service Worker PWA dengan precaching aset.
3. **`@types/web-bluetooth`**
   - Definisi tipe TypeScript untuk Web Bluetooth API (`navigator.bluetooth`), memungkinkan komunikasi langsung dari browser ke printer Bluetooth thermal.
4. **`@types/canvas-confetti`**
   - Definisi tipe TypeScript untuk pustaka `canvas-confetti`.
5. **`@types/react` & `@types/react-dom`**
   - Definisi tipe TypeScript untuk React 19.
6. **`oxlint`**
   - Linter super cepat berbasis Rust untuk menjaga kualitas kode.

---

## 4. Langkah-Langkah yang Telah Dilakukan

1. **Inisialisasi Proyek Vite + React + TypeScript**:
   - Membuat kerangka awal proyek menggunakan Vite template `react-ts` dalam workspace `/Union-POS`.
2. **Instalasi Semua Dependensi Proyek**:
   - Menginstall dependensi inti aplikasi, dependensi Supabase, PWA, dan modul printer Bluetooth.
3. **Konfigurasi Vite & PWA (`vite.config.ts`)**:
   - Mengaktifkan plugin `@vitejs/plugin-react`.
   - Mengaktifkan plugin `@tailwindcss/vite`.
   - Mengkonfigurasi `VitePWA` dengan mode `registerType: 'autoUpdate'`, manifest aplikasi (nama, tema, display standalone), dan aturan caching Workbox.
4. **Penyesuaian TypeScript Config (`tsconfig.app.json`)**:
   - Menambahkan tipe `"web-bluetooth"` ke array `compilerOptions.types` agar pemanggilan `navigator.bluetooth` dikenali tanpa error tipe.
5. **Konfigurasi Styling Mobile-First & Thermal Print CSS (`src/index.css`)**:
   - Menambahkan import Tailwind CSS v4 (`@import "tailwindcss";`).
   - Menambahkan pengaturan CSS safe-area (`env(safe-area-inset-*)`) dan optimasi sentuhan mobile (`overscroll-behavior-y: none`).
   - Menyediakan aturan CSS `@media print` khusus struk thermal ukuran 58mm untuk mendukung fallback printing di iOS/Android.
6. **Pengujian Build Produksi (`npm run build`)**:
   - Memverifikasi kompilasi TypeScript dan bundling Vite.
   - Hasil: Build sukses 100% dan file service worker PWA (`sw.js`, `workbox-*.js`) tergenerate dengan baik.

---

## 5. Perintah Menjalankan Aplikasi

- **Mode Pengembangan (Local Dev)**:
  ```bash
  npm run dev
  ```
- **Kompilasi Build Produksi**:
  ```bash
  npm run build
  ```
- **Pratinjau Hasil Build (Preview)**:
  ```bash
  npm run preview
  ```
- **Pengecekan Linting**:
  ```bash
  npm run lint
  ```

---

*Status: Langkah pertama (instalasi & konfigurasi seluruh dependensi dasar) telah selesai.*
