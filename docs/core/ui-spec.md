# UI Spec: Universal Multi-Capability POS Template

> Berdasarkan: UX Flow (`ux-flow.md`)
> 
> 

---

## Layout Global

* **Desktop**: Sidebar 280px (kiri) + Content area utama (kanan).


* **Mobile**: Bottom navigation + hamburger menu.


* **Auth Layout**: `_authenticated.tsx` sebagai layout wrapper dan *auth guard* yang menyediakan konteks *outlet* aktif, indikator mode koneksi (*Online* / *Offline*), serta status antrean sinkronisasi.


* **Komponen Global**: Menggunakan `Alert` dan `Button` (atoms), `ConfirmDialog` dan `Toast` (molecules), serta ikon dari `Lucide React` dengan utilitas `Tailwind CSS v4`.



---

## Halaman: `/` (Dashboard Utama)

### Layout

```text
┌─────────────────────────────────────────────────────┐
│  Header: "Dashboard"   [Outlet Selector] [Sync Badge]│
├──────────────────────┬──────────────────────────────┤
│  Kartu Shift Aktif   │  Kartu Mode Koneksi & Sync   │
├──────────────────────┴──────────────────────────────┤
│  Ringkasan Metrik (Order, DP/Pelunasan, Stok Menipis)│
├─────────────────────────────────────────────────────┤
│  Pintasan Cepat: [Buka Kasir] [Pesanan] [Outlet]    │
└─────────────────────────────────────────────────────┘

```

### Komponen

| Komponen | Tipe (Atomic) | Keterangan |
| --- | --- | --- |
| Header & Pintasan | — | Custom flexbox/grid dengan ikon Lucide React

 |
| Tombol Pintasan | `Button` atom | Navigasi ke `/pos`, `/orders`, `/shifts`, `/outlets/new`

 |
| Status & Error | `Alert` atom | Tampil saat gagal memuat ringkasan atau koneksi bermasalah

 |
| Notifikasi Aksi | `Toast` molecule | Umpan balik sinkronisasi atau aksi cepat

 |

### Interaksi

* **Klik pintasan modul** → Navigasi ke rute terkait via TanStack Router `navigate()`.


* **Ganti *outlet* aktif** → Memperbarui konteks *outlet* dan memicu *query* ulang data via TanStack Query.


* **Klik sinkronisasi / coba lagi** → Menjalankan mutasi sinkronisasi atau `refetch()` / `invalidateQueries()`.



### Responsive

* **Desktop**: Grid multi-kolom (2 kolom kartu status + grid ringkasan & pintasan).
* **Mobile**: Stack vertikal 1 kolom dengan tombol pintasan mudah dijangkau.

---

## Halaman: `/pos` (Kasir & Keranjang Transaksi)

### Layout

```text
┌───────────────────────────────────────┬─────────────────────────┐
│  Baris Atas: [Search] [Filter] [Mode] │  Panel Keranjang         │
├───────────────────────────────────────┤  - Daftar Item & Qty    │
│  Grid Katalog Produk / Layanan        │  - Varian / Modifier /  │
│  ┌─────────────┐ ┌─────────────┐      │    Dimensi / Tiered     │
│  │ Item A      │ │ Item B      │      │  - Subtotal & Total     │
│  │ [+ Tambah]  │ │ [Konfig]    │      │  - Bayar Penuh / DP     │
│  └─────────────┘ └─────────────┘      │  [Proses Transaksi]     │
└───────────────────────────────────────┴─────────────────────────┘

```

### Komponen

| Komponen | Tipe (Atomic) | Keterangan |
| --- | --- | --- |
| Pencarian Item | `Input` atom | Cari nama, SKU, atau barcode

 |
| Tombol Aksi / Switch | `Button` atom | Tambah item, *switch* Online/Offline, submit transaksi

 |
| Input Konfigurasi Item | `FormField` molecule | Kombinasi `Label` + `Input` + pesan error untuk dimensi/qty/DP

 |
| Konfirmasi Transaksi | `ConfirmDialog` molecule | Konfirmasi aksi kritis (misalnya batal keranjang atau *switch* mode saat ada antrean)

 |
| Pesan Error / Info | `Alert` atom | Tampil jika input tidak valid atau pengiriman online gagal

 |
| Notifikasi Transaksi | `Toast` molecule | Konfirmasi transaksi tersimpan (online maupun antrean offline)

 |
| Komponen Fitur | Feature component | `src/features/pos/components/` (katalog, konfigurator varian/modifier/dimensi, keranjang, panel pembayaran/DP)

 |

### Interaksi

* **Ketik di kolom pencarian** → *Debounce* 300ms untuk menyaring katalog lokal/cache.


* **Klik item / tombol konfigurasi** → Membuka opsi varian, *modifier*, dimensi ($P \times L$), atau harga bertingkat sesuai *capability* aktif.


* **Klik switch Online/Offline** → Mengubah mode koneksi aktif dan memperbarui indikator status.


* **Submit transaksi** → Menjalankan `useMutation()` (kirim ke server jika *online*, atau simpan ke antrean lokal jika *offline*); menampilkan `Toast` saat sukses atau `Alert` saat gagal serta memperbarui cache/stok.



### Responsive

* **Desktop**: Split layout 2 kolom (katalog di kiri, keranjang & pembayaran di kanan).
* **Mobile**: Katalog tampil penuh dengan tombol ringkasan keranjang di bawah yang membuka panel/drawer keranjang saat diklik.

---

## Halaman: `/orders` (Daftar & Alur Pengerjaan Pesanan)

### Layout

```text
┌─────────────────────────────────────────────────────┐
│  Header: "Pesanan"      [Search] [Filter Status]    │
├─────────────────────────────────────────────────────┤
│  Tabel / Daftar Pesanan (Order #, Pelanggan, Bayar) │
│  ┌────────┬──────────┬───────────┬───────────────┐  │
│  │ #Order │ Klien    │ Status    │ Aksi          │  │
│  ├────────┼──────────┼───────────┼───────────────┤  │
│  │ ORD-01 │ Budi     │ In Prog   │ [Status][DP]  │  │
│  └────────┴──────────┴───────────┴───────────────┘  │
├─────────────────────────────────────────────────────┤
│  Pagination: < 1 2 3 ... >                          │
└─────────────────────────────────────────────────────┘

```

### Komponen

| Komponen | Tipe (Atomic) | Keterangan |
| --- | --- | --- |
| Pencarian Pesanan | `Input` atom | Cari nomor order atau nama pelanggan

 |
| Tombol Aksi | `Button` atom | Update status pengerjaan, catat pelunasan DP, pagination

 |
| Input Pelunasan | `FormField` molecule | Nominal dan metode pembayaran pelunasan sisa tagihan

 |
| Konfirmasi Aksi | `ConfirmDialog` molecule | Konfirmasi perubahan status akhir/destruktif

 |
| Feedback Error | `Alert` atom | Pesan gagal memuat atau memperbarui pesanan

 |
| Notifikasi | `Toast` molecule | Konfirmasi update status atau pelunasan tercatat

 |
| Komponen Fitur | Feature component | `src/features/orders/components/` (tabel/card pesanan, pembaruan workflow, modal/form pelunasan)

 |

### Interaksi

* **Ketik pencarian / pilih filter** → *Debounce* 300ms & pembaruan *query params*.


* **Ubah status pengerjaan** → `useMutation()` → `invalidateQueries()` + `Toast` sukses atau `Alert` error.


* **Catat pelunasan DP** → Submit form pelunasan via `useMutation()` → `invalidateQueries()` + `Toast` sukses atau `Alert` error.



### Responsive

* **Desktop**: Tabel penuh dengan kolom nomor order, pelanggan, status pengerjaan, status pembayaran, nominal, dan aksi.
* **Mobile**: *Card-based layout* dengan informasi ringkas dan tombol aksi per kartu.

---

## Halaman: `/shifts` (Manajemen Shift Kasir)

### Layout

```text
┌─────────────────────────────────────────────────────┐
│  Header: "Shift Kasir"                              │
├─────────────────────────────────────────────────────┤
│  Panel Shift Aktif / Form Buka Shift                │
│  (Kas Awal, Kas Sistem, Input Kas Akhir & Tutup)    │
├─────────────────────────────────────────────────────┤
│  Riwayat Shift                                      │
│  ┌────────┬──────────┬───────────┬───────────────┐  │
│  │ Shift  │ Kasir    │ Kas Awal  │ Selisih / Stat│  │
│  └────────┴──────────┴───────────┴───────────────┘  │
└─────────────────────────────────────────────────────┘

```

### Komponen

| Komponen | Tipe (Atomic) | Keterangan |
| --- | --- | --- |
| Form Kas Awal / Akhir | `FormField` molecule | Input nominal kas (`opening_cash` / `closing_cash`) + validasi

 |
| Tombol Buka / Tutup Shift | `Button` atom | Aksi buka shift atau tutup shift

 |
| Konfirmasi Tutup Shift | `ConfirmDialog` molecule | Konfirmasi tutup shift kasir

 |
| Feedback Error | `Alert` atom | Error validasi atau kegagalan proses shift

 |
| Notifikasi | `Toast` molecule | Konfirmasi shift dibuka/ditutup

 |
| Komponen Fitur | Feature component | `src/features/shifts/components/` (panel shift aktif, form buka/tutup, tabel riwayat)

 |

### Interaksi

* **Buka shift** → Submit kas awal via `useMutation()` → `invalidateQueries()` + `Toast` sukses atau `Alert` error.


* **Tutup shift** → Konfirmasi via `ConfirmDialog` → `useMutation()` → `invalidateQueries()` + `Toast` sukses atau `Alert` error.



### Responsive

* **Desktop**: Panel shift berdampingan dengan ringkasan kas serta tabel riwayat lengkap.
* **Mobile**: Susunan vertikal dengan *card* riwayat shift.

---

## Halaman: `/inventory` (Manajemen Stok & Rekonsiliasi)

### Layout

```text
┌─────────────────────────────────────────────────────┐
│  Header: "Inventori & Stok"   [Search] [Filter]     │
├─────────────────────────────────────────────────────┤
│  Form Catat Mutasi Stok (Masuk / Keluar / Opname)   │
├─────────────────────────────────────────────────────┤
│  Daftar Stok & Riwayat Mutasi / Sync Offline        │
│  ┌────────┬──────────┬───────────┬───────────────┐  │
│  │ Item   │ SKU      │ Stok      │ Status / Note │  │
│  └────────┴──────────┴───────────┴───────────────┘  │
└─────────────────────────────────────────────────────┘

```

### Komponen

| Komponen | Tipe (Atomic) | Keterangan |
| --- | --- | --- |
| Pencarian Stok | `Input` atom | Cari produk, SKU, atau catatan mutasi

 |
| Form Mutasi Stok | `FormField` molecule | Pilihan item, jenis mutasi, jumlah, catatan

 |
| Tombol Simpan Mutasi | `Button` atom | Submit mutasi stok

 |
| Feedback Error | `Alert` atom | Error validasi atau gagal menyimpan mutasi

 |
| Notifikasi | `Toast` molecule | Konfirmasi mutasi tersimpan

 |
| Komponen Fitur | Feature component | `src/features/inventory/components/` (tabel stok & indikator menipis, form mutasi, log rekonsiliasi)

 |

### Interaksi

* **Ketik pencarian** → *Debounce* 300ms & update *query params*.


* **Submit mutasi stok** → `useMutation()` → `invalidateQueries()` + `Toast` sukses atau `Alert` error.



### Responsive

* **Desktop**: Form mutasi dan tabel stok/mutasi penuh.
* **Mobile**: Form ringkas dan *card-based list* untuk daftar stok serta riwayat mutasi.

---

## Halaman: `/products` (Katalog Produk & Aturan Capability)

### Layout

```text
┌─────────────────────────────────────────────────────┐
│  Header: "Katalog Produk"    [Search] [+ Tambah]    │
├─────────────────────────────────────────────────────┤
│  Daftar Produk (Harga Tetap / Dimensi / Tiered)     │
│  ┌────────┬──────────┬───────────┬───────────────┐  │
│  │ Nama   │ SKU      │ Tipe Hrga │ Aksi          │  │
│  └────────┴──────────┴───────────┴───────────────┘  │
├─────────────────────────────────────────────────────┤
│  Panel / Form Produk, Varian & Modifier             │
└─────────────────────────────────────────────────────┘

```

### Komponen

| Komponen | Tipe (Atomic) | Keterangan |
| --- | --- | --- |
| Pencarian Produk | `Input` atom | Cari nama, SKU, atau kategori

 |
| Tombol Aksi | `Button` atom | Tambah/edit/hapus produk & varian

 |
| Field Form Katalog | `FormField` molecule | Nama, SKU, kategori, harga dasar, aturan harga/varian/modifier

 |
| Konfirmasi Hapus | `ConfirmDialog` molecule | Konfirmasi sebelum menghapus produk/varian

 |
| Feedback Error | `Alert` atom | Error validasi atau gagal simpan

 |
| Notifikasi | `Toast` molecule | Konfirmasi simpan/ubah/hapus

 |
| Komponen Fitur | Feature component | `src/features/products/components/` (daftar produk, editor varian & modifier, pengaturan aturan harga)

 |

### Interaksi

* **Ketik pencarian** → *Debounce* 300ms & update *query params*.


* **Simpan / ubah produk atau varian** → `useMutation()` → `invalidateQueries()` + `Toast` sukses atau `Alert` error.


* **Hapus produk / varian** → `ConfirmDialog` → `useMutation()` → `invalidateQueries()`.



### Responsive

* **Desktop**: Tabel produk berdampingan atau terintegrasi dengan form/panel detail varian & *modifier*.
* **Mobile**: *Card-based layout* dan form bertumpuk per bagian.

---

## Halaman: `/outlets`, `/outlets/new`, `/outlets/$id` (Tenant, Outlet & Capability)

### Layout

```text
┌─────────────────────────────────────────────────────┐
│  Breadcrumb / Header: [Outlet] / [Detail / Baru]    │
├─────────────────────────────────────────────────────┤
│  Daftar Outlet atau Form Outlet Baru (Preset & Flag)│
├─────────────────────────────────────────────────────┤
│  Pengaturan Capability Flags & Anggota / Role Outlet│
└─────────────────────────────────────────────────────┘

```

### Komponen

| Komponen | Tipe (Atomic) | Keterangan |
| --- | --- | --- |
| Tombol Navigasi & Simpan | `Button` atom | Buat outlet baru, simpan capability/anggota, kembali

 |
| Field Form Outlet & Anggota | `FormField` molecule | Nama outlet, alamat, preset, penambahan flag, assign user & role

 |
| Konfirmasi Hapus / Cabut | `ConfirmDialog` molecule | Konfirmasi hapus outlet atau cabut akses anggota

 |
| Feedback Error | `Alert` atom | Error validasi atau gagal menyimpan konfigurasi

 |
| Notifikasi | `Toast` molecule | Konfirmasi pengaturan tersimpan

 |
| Komponen Fitur | Feature component | `src/features/outlets/components/` (daftar outlet, pemilih preset & toggle capability, manajemen anggota/role)

 |

### Interaksi

* **Klik "Buat Outlet Baru"** → Navigasi ke `/outlets/new` via TanStack Router `navigate()`.


* **Pilih preset / toggle capability / simpan anggota** → `useMutation()` → `invalidateQueries()` + `Toast` sukses atau `Alert` error.


* **Hapus outlet / anggota** → `ConfirmDialog` → `useMutation()` → `invalidateQueries()`.



### Responsive

* **Desktop**: Layout terstruktur dengan daftar/form dan panel pengaturan *capability* serta anggota *outlet*.
* **Mobile**: *Card-based layout* dan form satu kolom.

---

## Halaman: `/settings` (Pengaturan Akun & Preferensi Koneksi)

### Layout

```text
┌─────────────────────────────────────────────────────┐
│  Header: "Pengaturan"                               │
├─────────────────────────────────────────────────────┤
│  Form Preferensi Koneksi Bawaan (Online / Offline)  │
│  & Informasi Akun                                   │
│  [Simpan Pengaturan]                                │
└─────────────────────────────────────────────────────┘

```

### Komponen

| Komponen | Tipe (Atomic) | Keterangan |
| --- | --- | --- |
| Field Pengaturan | `FormField` molecule | Preferensi mode bawaan dan informasi pengguna

 |
| Tombol Simpan | `Button` atom | Submit perubahan pengaturan

 |
| Feedback Error | `Alert` atom | Pesan error saat gagal menyimpan

 |
| Notifikasi | `Toast` molecule | Konfirmasi pengaturan tersimpan

 |
| Komponen Fitur | Feature component | `src/features/settings/components/` (form preferensi koneksi & akun)

 |

### Interaksi

* **Submit pengaturan** → `useMutation()` → `invalidateQueries()` + `Toast` sukses atau `Alert` error.



### Responsive

* **Desktop**: Form terpusat/terstruktur dalam *content area*.
* **Mobile**: Form penuh 1 kolom dengan tombol simpan di bagian bawah.

---

## Langkah Berikutnya

Seluruh dokumen perencanaan pada kedua jalur—**PRD**, **UX Flow**, **UI Spec**, **ERD**, dan **API Contract**—kini telah lengkap. Tahap berikutnya adalah masuk ke **Implementasi** (backend `model → dto → repository → service → handler` + Swagger, dan frontend `route → feature → component → API hook via Orval`). Apakah Anda ingin memulai dari implementasi **Backend** atau **Frontend** terlebih dahulu?
