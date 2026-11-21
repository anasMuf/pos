# Product Requirements Document (PRD): Universal Multi-Capability POS Template

---

## 1. Product Overview

**Universal Multi-Capability POS Template** adalah fondasi *project template* sistem Point of Sale (POS) untuk pengelolaan **multi-tenant dan multi-outlet** yang dapat dikonfigurasi untuk berbagai lini bisnis—meliputi **retail, F&B, jasa, percetakan, hingga clothing, konveksi, dan sablon**—dalam satu basis kode utama.

Sistem ini menggunakan pendekatan **berbasis *capability* (*feature flags* yang dapat dikonfigurasi dan diperluas)** alih-alih penguncian alur berdasarkan label jenis usaha. Secara *default*, aplikasi berjalan dalam mode **Online**, tetapi dilengkapi mekanisme **berpindah (*switch*) ke mode Offline** untuk mencatat transaksi secara lokal dan menyinkronkannya kembali ke sistem utama saat koneksi tersedia.

Rencana implementasi template ini menggunakan stack **Go**, **PostgreSQL**, **TanStack Router**, **TanStack Query**, dan **Docker**.

---

## 2. Background Problem & Solution

### Masalah

1. **Fragmentasi Basis Kode:** Memisahkan aplikasi atau *repository* per jenis bisnis menyebabkan duplikasi fitur dasar (autentikasi, kasir, shift, struk, laporan) serta memperbesar beban perawatan saat ada perbaikan *bug* atau pembaruan.
2. **Kebutuhan Operasional *Hybrid*:** Banyak usaha menggabungkan beberapa pola kerja sekaligus—misalnya *clothing store* dengan layanan sablon *custom*, atau percetakan dengan alur produksi bertahap dan pembayaran DP—sehingga klasifikasi tunggal sering tidak memadai.
3. **Ketergantungan pada Jaringan:** Koneksi internet yang tidak stabil atau terputus saat jam sibuk dapat menghambat proses kasir jika aplikasi tidak mendukung pencatatan lokal.
4. **Evolusi Fitur:** Kebutuhan fitur per usaha terus bertambah seiring waktu sehingga sistem memerlukan mekanisme penambahan *capability* baru tanpa merombak inti aplikasi.

### Solusi

1. **Satu Mesin Inti dengan Konfigurasi *Capability*:** Menyatukan alur kasir, stok, shift, dan multi-outlet dalam satu fondasi, lalu mengaktifkan atau menonaktifkan kemampuan spesifik (varian, *modifier*, harga dimensi atau bertingkat, alur pengerjaan pesanan, pembayaran DP/pelunasan) per *outlet* melalui *capability flag* yang dapat diperluas.
2. **Kombinasi *Capability* per *Outlet*:** Mengizinkan pengaktifan beberapa *capability* secara bersamaan agar bisnis *hybrid* dapat berjalan tanpa kompromi.
3. **Mode *Online-Default* dengan *Switch* ke *Offline*:** Menjalankan mode *online* sebagai kondisi awal, menyediakan *switch* ke mode *offline* dengan penyimpanan lokal dan antrean sinkronisasi yang mencegah duplikasi data saat kembali *online*.

---

## 3. Features

### Core (Wajib Ada pada Fondasi Template)

* **Manajemen Multi-Tenant & Multi-Outlet:** Isolasi data per *tenant* dan *outlet* untuk mengelola banyak cabang atau usaha.
* **Sistem *Capability Flag* yang Dapat Diperluas:** Pengaktifan/penonaktifan flag per *outlet*, dukungan *preset* awal, dan mekanisme penambahan *capability* baru di masa depan.
* **Kasir & Keranjang Transaksi Inti:** Pencarian item, pengelolaan keranjang, kalkulasi total, dan pencatatan transaksi.
* **Kemampuan Berbasis *Capability* Inti:**
* **Varian Produk:** Pengelolaan opsi/varian (ukuran, warna, jenis) dan stok terkait.
* ***Modifier* / Tambahan:** Penambahan opsi ekstra atau catatan khusus pada item pesanan (*topping*, jenis sablon, *finishing*).
* **Kalkulasi Harga Fleksibel:** Harga tetap per unit, perhitungan berbasis dimensi/ukuran, serta harga bertingkat berdasarkan kuantitas.
* **Alur Pengerjaan Pesanan (*Order Workflow*):** Pelacakan status pengerjaan pesanan (antrean, diproses, siap, selesai).
* **Pembayaran Bertahap (*DP / Pelunasan*) & Multi-Metode:** Pencatatan uang muka (DP), pelunasan bertahap, serta berbagai metode pembayaran.


* **Manajemen Stok Dasar:** Pencatatan stok masuk/keluar, pengurangan stok otomatis saat transaksi (sesuai pengaturan produk), dan peringatan stok menipis.
* **Manajemen Shift Kasir:** Buka shift, tutup shift, dan rekap ringkas transaksi serta kas per sesi.
* **Hak Akses Pengguna Dasar (*Role-Based Access*):** Pemisahan hak akses dasar untuk pemilik/pengelola, staf/operator, dan kasir.
* **Mode *Online-Default* & *Switch* Offline:** Berjalan *online* secara *default*, dapat dialihkan ke mode *offline* untuk menyimpan transaksi lokal, lalu menyinkronkannya kembali saat *online* secara *idempotent* (mencegah duplikasi).

### NTH (Nice to Have — Nilai Tambah)

* **Pencarian & Filter Cepat di Kasir:** *Shortcut* pencarian produk/SKU, riwayat transaksi cepat, dan alur input cepat untuk kasir.
* **Catatan Pelanggan & Riwayat Pesanan:** Penyimpanan data dasar pelanggan serta riwayat transaksi atau DP sebelumnya.
* **Indikator Status Koneksi & Antrean Sinkronisasi:** Tampilan status *online/offline* serta jumlah transaksi lokal yang menunggu sinkronisasi.
* **Pengaturan Struk / Bukti Transaksi:** Penyesuaian informasi dasar struk atau bukti pembayaran (termasuk rincian DP dan sisa tagihan).

### PTH (Plan to Have — Rencana Tahap Lanjut)

* **Penambahan *Capability* Lanjutan:** Dukungan pelacakan nomor seri, tanggal kedaluwarsa, komisi staf/operator, atau perhitungan bahan baku/resep (*Bill of Materials* / BOM) yang lebih rinci.
* **Laporan & Analitik Lintas *Outlet*:** Rekap penjualan, perbandingan performa antar-*outlet*, dan rekonsiliasi hasil sinkronisasi *offline-to-online*.
* **Integrasi Perangkat & Kanal Eksternal:** Integrasi perangkat keras kasir tambahan, notifikasi status pesanan ke pelanggan, atau koneksi ke kanal penjualan eksternal.
* **Aturan Otomasi & Promosi Lanjutan:** Diskon promo bersyarat, program loyalitas pelanggan, dan notifikasi/alur kerja otomatis.

---

## 4. User Stories

| No | Role | Action | Goal |
| --- | --- | --- | --- |
| 1 | **Pemilik / Pengelola Usaha** | Membuat *tenant* dan *outlet* baru serta memilih *preset* atau *capability* yang sesuai | Agar *outlet* langsung dapat digunakan untuk retail, F&B, jasa, percetakan, atau clothing/konveksi/sablon |
| 2 | **Pemilik / Pengelola Usaha** | Mengubah *capability flag* pada *outlet* aktif atau mendaftarkan *capability* baru | Agar sistem mengikuti perkembangan usaha dan penambahan fitur tanpa mengubah fondasi utama |
| 3 | **Pemilik / Pengelola Usaha** | Mengatur peran dan hak akses pengguna di setiap *outlet* | Agar akses kasir, staf/operator, dan pengelola sesuai dengan tanggung jawab masing-masing |
| 4 | **Pemilik / Pengelola Usaha** | Mengelola katalog produk beserta varian, *modifier*, skema harga (tetap, dimensi, bertingkat), dan aturan stok | Agar perhitungan harga dan pemotongan stok sesuai dengan mekanisme tiap item |
| 5 | **Kasir** | Membuka shift kasir dengan mencatat kas/modal awal | Agar saldo awal shift tercatat secara akurat sebelum transaksi dimulai |
| 6 | **Kasir** | Memilih item (termasuk varian, *modifier*, dimensi, atau jumlah bertingkat) dan memproses pembayaran lunas atau DP | Agar transaksi tercatat sesuai detail pesanan dan kesepakatan pembayaran |
| 7 | **Kasir** | Mencatat pembayaran pelunasan atas transaksi yang sebelumnya berstatus DP/cicilan | Agar tagihan dan status pembayaran pesanan terbarui hingga lunas |
| 8 | **Kasir** | Mengalihkan (*switch*) aplikasi dari mode *online* ke mode *offline* saat koneksi bermasalah atau tidak stabil | Agar proses transaksi tetap berjalan menggunakan data lokal tanpa terhambat jaringan |
| 9 | **Kasir / Sistem** | Menyinkronkan data transaksi dari mode *offline* ke server ketika mode *online* aktif kembali | Agar seluruh transaksi lokal tersimpan di pusat secara utuh tanpa duplikasi |
| 10 | **Staf / Operator Produksi atau Layanan** | Memantau pesanan aktif dan memperbarui status pengerjaan (antrean, diproses, siap, selesai) | Agar status pengerjaan pesanan *custom* atau layanan jelas bagi tim dan kasir |
| 11 | **Kasir** | Menutup shift kasir dan melihat rekap transaksi serta kas selama sesi berlangsung | Agar rekapitulasi shift dapat diperiksa dan dipertanggungjawabkan |
| 12 | **Pemilik / Pengelola Usaha** | Mencatat mutasi stok, memantau stok menipis, dan meninjau hasil sinkronisasi *offline* | Agar stok dan catatan transaksi tetap konsisten di seluruh *outlet* |

---

## 5. Reference

* **Kompetitor & Produk Acuan:**
* **Moka, Pawoon, Majoo:** Acuan operasional kasir multi-outlet, manajemen shift, dan alur transaksi bisnis lokal.
* **Square, Toast, Shopify POS:** Acuan alur *offline* berbasis penyimpanan lokal, sinkronisasi ulang saat koneksi kembali, serta fleksibilitas variasi dan *modifier*.
* **Odoo POS, ERPNext:** Acuan pengaktifan modul/kemampuan secara selektif sesuai kebutuhan operasional usaha.
* **Aplikasi Kasir UMKM & Percetakan/Konveksi:** Acuan kebutuhan praktis di lapangan seperti pembayaran DP/cicilan, alur pengerjaan pesanan *custom*, dan penanganan koneksi terbatas.


* **Stack & Infrastruktur Acuan:** **Go**, **PostgreSQL**, **TanStack Router**, **TanStack Query**, dan **Docker**.
