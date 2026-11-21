# UX Flow: Universal Multi-Capability POS Template

> Berdasarkan: PRD Universal Multi-Capability POS Template
> 
> 

---

## Sitemap

```text
/                                       → Landing / redirect ke /pos atau /login
├── /login                              → Halaman login pengguna[cite: 1]
├── /register                           → Halaman registrasi pengguna[cite: 1]
└── /_authenticated/                    → Layout route (auth guard & outlet context)[cite: 1]
    ├── /                               → Dashboard utama (ringkasan outlet, shift, status sync)[cite: 1]
    ├── /pos                            → Kasir & keranjang transaksi (online/offline switch, varian, modifier, dimensi/tiered, DP)
    ├── /orders                         → Daftar & alur pengerjaan pesanan (workflow status, pelunasan DP)
    ├── /shifts                         → Buka/tutup shift kasir & rekap sesi
    ├── /inventory                      → Manajemen stok masuk/keluar, stok menipis, & rekonsiliasi offline
    ├── /products                       → Katalog produk, varian, modifier, & aturan harga
    ├── /outlets                        → Daftar tenant & outlet
    │   ├── /new                        → Buat outlet baru & pilih preset/capability
    │   └── /$id                        → Detail outlet, pengaturan capability flag, & anggota/role
    └── /settings                       → Pengaturan akun & preferensi koneksi bawaan[cite: 1]

```

---

## Navigation Pattern

* **Layout utama**: Sidebar navigasi di desktop dan bottom navigation di mobile, dibungkus layout route `_authenticated.tsx`.


* **Konteks aktif**: Pemilih *outlet* aktif di header/sidebar beserta indikator status mode koneksi (*Online* / *Offline*) dan jumlah antrean sinkronisasi yang belum terkirim.
* **Navigasi sekunder**: Breadcrumb pada halaman detail outlet (`/$id`) serta tab/filter status pada daftar pesanan dan inventori.


* **Auth guard**: `_authenticated.tsx` memeriksa sesi JWT; jika belum login atau tidak berhak mengakses rute/capability tertentu, pengguna diarahkan ke `/login` atau ditolak dengan notifikasi.


* **Toast / Alert**: Menggunakan komponen `Alert` atom untuk pesan status/error inline dan `Toast` molecule untuk umpan balik aksi singkat.



---

## User Flows

### Flow 1: Setup Tenant, Outlet & Capability Flags

```mermaid
flowchart TD
    A[Buka /outlets] --> B{Sudah login via _authenticated?}
    B -->|Tidak| C[Redirect ke /login]
    B -->|Ya| D[Klik Buat Outlet Baru ke /outlets/new]
    D --> E[Pilih tenant, isi info outlet, pilih preset atau capability flag]
    E --> F[Klik Simpan]
    F --> G{Validasi berhasil?}
    G -->|Tidak| H[Tampilkan Alert error pada form]
    H --> E
    G -->|Ya| I[Outlet & capability tersimpan]
    I --> J[Toast success + redirect ke /outlets/$id]
    J --> K[Kelola anggota/role atau ubah capability flag kapan saja]

```

### Flow 2: Buka Shift, Transaksi Kasir (Varian, Modifier, Dimensi/Tiered, DP) & Tutup Shift

```mermaid
flowchart TD
    A[Buka /shifts] --> B{Shift sedang terbuka?}
    B -->|Tidak| C[Input kas awal & buka shift]
    C --> D[Masuk ke /pos]
    B -->|Ya| D
    D --> E[Cari/pilih produk & atur varian/modifier/dimensi/qty]
    E --> F[Hitung harga & pilih pembayaran penuh atau DP]
    F --> G{Mode koneksi aktif?}
    G -->|Online| H[Kirim transaksi ke server]
    G -->|Offline| I[Simpan transaksi ke penyimpanan lokal & potong stok lokal]
    H --> J{Berhasil?}
    I --> K[Toast tersimpan lokal + masuk antrean sync]
    J -->|Ya| L[Toast transaksi berhasil + update stok & shift]
    J -->|Tidak| M[Tawarkan switch ke Offline atau tampilkan Alert error]
    L --> N[Saat selesai bertugas: buka /shifts & input kas akhir tutup shift]
    K --> N

```

### Flow 3: Switch ke Mode Offline & Sinkronisasi Saat Kembali Online

```mermaid
flowchart TD
    A[Kasir berada di /pos atau /orders] --> B[Klik toggle switch Online -> Offline atau koneksi terputus]
    B --> C[Status indikator berubah menjadi Offline]
    C --> D[Kasir memproses transaksi/DP menggunakan katalog & data lokal]
    D --> E[Data masuk ke antrean lokal dengan kunci unik anti-duplikasi]
    E --> F[Kasir klik switch Offline -> Online saat jaringan pulih]
    F --> G[Jalankan sinkronisasi antrean ke server]
    G --> H{Sinkronisasi sukses?}
    H -->|Ya| I[Tandai data tersinkronisasi + Toast sukses]
    H -->|Sebagian/Gagal| J[Tampilkan Alert status antrean & sediakan tombol retry]

```

### Flow 4: Alur Pengerjaan Pesanan & Pelunasan DP

```mermaid
flowchart TD
    A[Operator/Kasir buka /orders] --> B[Filter pesanan berdasarkan status pengerjaan atau status bayar]
    B --> C[Pilih pesanan aktif]
    C --> D{Aksi yang dilakukan?}
    D -->|Update pengerjaan| E[Ubah status antrean -> diproses -> siap -> selesai]
    D -->|Pelunasan DP| F[Input nominal & metode pelunasan sisa tagihan]
    E --> G[Simpan perubahan status]
    F --> H[Catat pembayaran & perbarui status lunas]
    G --> I[Toast sukses + perbarui daftar pesanan]
    H --> I

```

### Flow 5: Manajemen Stok & Rekonsiliasi Hasil Sinkronisasi

```mermaid
flowchart TD
    A[Pemilik/Pengelola buka /inventory] --> B[Lihat daftar stok produk/varian & penanda stok menipis]
    B --> C{Pilih aksi inventori?}
    C -->|Stok masuk/keluar/opname| D[Pilih item, jenis mutasi, jumlah, & catatan]
    C -->|Tinjau hasil sync offline| E[Filter riwayat mutasi/rekonsiliasi sinkronisasi]
    D --> F[Simpan mutasi stok]
    E --> G[Periksa selisih & catatan penyesuaian]
    F --> H[Toast stok terbarui + perbarui jumlah stok]
    G --> I[Simpan catatan penyesuaian bila diperlukan]

```

---

## State per Halaman

### `/` (Dashboard Utama)

| State | Tampilan |
| --- | --- |
| Loading | Skeleton kartu ringkasan dan status shift/koneksi

 |
| Empty | Ringkasan awal tanpa transaksi + tautan cepat ke `/outlets/new` atau `/pos`

 |
| Error | `Alert` error + tombol coba lagi

 |
| Success | Ringkasan outlet aktif, status shift, status mode online/offline, antrean sync, & pintasan modul

 |

### `/pos` (Kasir & Keranjang Transaksi)

| State | Tampilan |
| --- | --- |
| Loading | Skeleton daftar katalog dan panel keranjang

 |
| Empty | Pesan katalog kosong atau keranjang masih kosong dengan panduan pilih item

 |
| Error | `Alert` kegagalan input/pengiriman transaksi + opsi simpan offline / retry

 |
| Success | Katalog sesuai capability aktif, konfigurasi item dinamis, keranjang, ringkasan bayar/DP, & `Toast` transaksi tersimpan

 |

### `/orders` (Daftar & Alur Pengerjaan Pesanan)

| State | Tampilan |
| --- | --- |
| Loading | Skeleton daftar/tabel pesanan

 |
| Empty | Tampilan kosong "Belum ada pesanan" dengan filter status aktif

 |
| Error | `Alert` error saat memuat atau memperbarui status/pelunasan + tombol retry

 |
| Success | Daftar pesanan beserta status pengerjaan, status pembayaran (Lunas/DP/Belum Lunas), aksi ubah status, & pelunasan

 |

### `/shifts` (Manajemen Shift Kasir)

| State | Tampilan |
| --- | --- |
| Loading | Skeleton informasi shift aktif dan riwayat shift

 |
| Empty | Form buka shift kasir (input kas awal) dan daftar riwayat kosong

 |
| Error | `Alert` validasi atau kegagalan buka/tutup shift

 |
| Success | Detail shift aktif, form tutup shift dengan rekap kas, histori shift, & `Toast` konfirmasi

 |

### `/inventory` (Manajemen Stok & Rekonsiliasi)

| State | Tampilan |
| --- | --- |
| Loading | Skeleton tabel stok dan riwayat mutasi

 |
| Empty | Tampilan kosong "Belum ada data stok" + tombol tambah produk atau catat mutasi

 |
| Error | `Alert` error saat memuat atau mencatat mutasi stok

 |
| Success | Daftar stok (dengan penanda stok menipis), form mutasi stok, riwayat mutasi/rekonsiliasi offline, & `Toast` sukses

 |

### `/products` (Katalog Produk & Aturan Capability)

| State | Tampilan |
| --- | --- |
| Loading | Skeleton daftar produk dan form katalog

 |
| Empty | Ilustrasi/teks "Belum ada produk" + tombol tambah produk

 |
| Error | `Alert` error validasi atau gagal simpan produk/varian

 |
| Success | Daftar produk, pengaturan harga (tetap/dimensi/tiered), varian, modifier, & `Toast` konfirmasi

 |

### `/outlets`, `/outlets/new`, `/outlets/$id` (Tenant, Outlet & Capability)

| State | Tampilan |
| --- | --- |
| Loading | Skeleton daftar outlet, form outlet baru, atau detail outlet

 |
| Empty | Tampilan "Belum ada outlet" + tombol CTA buat outlet baru

 |
| Error | `Alert` error saat memuat atau menyimpan pengaturan outlet/capability/member

 |
| Success | Daftar outlet, form pembuatan dengan preset/capability, toggle capability & manajemen anggota/role di detail outlet, & `Toast` sukses

 |

### `/settings` (Pengaturan Akun & Preferensi Koneksi)

| State | Tampilan |
| --- | --- |
| Loading | Skeleton form pengaturan

 |
| Empty | Nilai default pengaturan akun dan mode koneksi awal (`online`)

 |
| Error | `Alert` error saat menyimpan perubahan pengaturan

 |
| Success | Form tersimpan dengan `Toast` konfirmasi dan pembaruan preferensi aktif

 |

---

## Langkah Selanjutnya

Dokumen UX Flow (`ux-flow.md`) sudah selaras dengan PRD (`prd.md`), ERD (`erd.md`), dan API Contract (`api-contract.md`). Tahap berikutnya pada jalur frontend adalah menyusun **UI Spec (`ui-spec.md`)** berdasarkan dokumen ini. Apakah Anda ingin langsung melanjutkan ke **UI Spec**?
