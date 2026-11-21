# Audit Form & UX — Universal Multi-Capability POS

> **Tanggal audit:** 2026-11-21
> **Basis kode:** `main` @ `f11ce10` (squash merge PR #1)
> **Cakupan:** seluruh halaman tambah/edit, form transaksi, dan list/detail di `apps/platform`.

Dokumen ini mencatat temuan input yang masih **manual/hardcoded** serta alur yang **belum ramah pengguna**,
beserta prioritas dan kriteria penerimaan. Dokumen ini adalah backlog UX, bukan source of truth domain —
untuk perilaku bisnis tetap mengacu ke [`core/prd.md`](core/prd.md), [`core/erd.md`](core/erd.md), dan
[`core/api-contract.md`](core/api-contract.md).

---

## 1. Ringkasan

| Aspek | Status |
| --- | --- |
| Semua form tambah/edit punya route sendiri | ✅ Terpenuhi |
| Form inline / modal CRUD | ✅ Tidak ada (kecuali alur transaksi POS) |
| Input terstruktur (bukan JSON manual) | ❌ Pricing rules & modifier masih JSON |
| Pemilih entitas (user/produk/varian) | ⚠️ Member masih User ID manual; mutasi stok belum pilih varian |
| Validasi inline per field | ❌ Masih toast-only |
| Error/not-found state pada halaman edit | ❌ Belum ada |
| Pagination pada list | ❌ API mem-paginasi (default 10) tetapi UI tidak menampilkan kontrol |
| Konsistensi bahasa | ⚠️ Login/register masih Inggris |
| Konfirmasi hapus | ✅ Memakai `ConfirmDialog` |

**Jumlah temuan:** 4 tinggi, 4 sedang, 1 rendah (manual/hardcode) + 11 temuan UX.

---

## 2. Definisi Prioritas

| Label | Arti |
| --- | --- |
| 🔴 **P0 / Tinggi** | Menghambat penyelesaian tugas atau berpotensi menimbulkan data salah |
| 🟠 **P1 / Sedang** | Menyulitkan pengguna secara signifikan, tetapi ada workaround |
| 🟡 **P2 / Rendah** | Polish, konsistensi, atau efisiensi |

---

## 3. Temuan Input Manual / Hardcoded

| ID | Prioritas | Lokasi | Temuan | Dampak | Rekomendasi |
| --- | --- | --- | --- | --- | --- |
| F-01 | 🔴 P0 | `features/products/ProductFormPage.tsx` | `Pricing Rules (JSON)` dan `Modifiers (JSON array)` berupa textarea mentah | Salah format JSON → transaksi gagal; rawan typo; tidak bisa dipakai non-teknis | Editor terstruktur: tier (min/max/harga), dimension (unit/min area), tabel modifier (nama/harga) |
| F-02 | 🔴 P0 | `features/outlets/OutletMemberFormPage.tsx` | Anggota outlet ditambahkan lewat **User ID** angka | Pengguna harus mencari ID manual; rawan salah orang | Endpoint pencarian user (`GET /users?search=`) + combobox nama/email, atau invite by email |
| F-03 | 🔴 P0 | `features/inventory/InventoryMutationPage.tsx` | Hanya memilih produk; tidak ada pilihan **varian**, tidak menampilkan stok saat ini | Mutasi varian tidak bisa dilakukan dari UI; pengguna menebak jumlah stok | Select varian (jika ada) + panel “stok saat ini → setelah mutasi” |
| F-04 | 🔴 P0 | `features/outlets/NewOutletPage.tsx` | Form tenant hanya muncul saat **belum ada tenant**; tidak ada halaman kelola tenant | Tenant baru tidak bisa dibuat setelah tenant pertama ada; tidak bisa edit/hapus tenant | Halaman `/tenants` (index/new/edit) atau tombol “Tambah tenant” permanen |
| F-05 | 🟠 P1 | `features/outlets/NewOutletPage.tsx` | `PRESETS` (retail, F&B, print, clothing) hardcoded di file | Capability baru tidak otomatis masuk preset | Metadata preset disimpan bersama registry capability (API) atau `lib/capabilities.ts` terpusat |
| F-06 | 🟠 P1 | `features/outlets/OutletCapabilitiesPage.tsx` | Hanya checkbox; tidak ada preset/Reset seperti form buat outlet | Mengubah capability satu per satu; tidak konsisten dengan form create | Tambahkan preset selector + Reset (pakai `capabilitiesForPreset`) |
| F-07 | 🟠 P1 | `features/products/ProductFormPage.tsx` | Kategori berupa input teks bebas | Duplikasi/typo kategori (`Clothing` vs `clothing`) memecah filter & laporan | `<datalist>` dari kategori yang sudah ada + normalisasi |
| F-08 | 🟠 P1 | `features/products/VariantFormPage.tsx` | Stok varian diedit langsung | Melewati audit mutasi stok; stok bisa berubah tanpa jejak | Arahkan perubahan stok ke `/inventory/new` atau buat movement `adjustment` otomatis |
| F-09 | 🟡 P2 | Banyak form | Payment methods, role outlet, paper size, movement type, opsi struk hardcoded | Wajar sebagai konstanta domain, tetapi tersebar | Pusatkan di `src/lib/constants.ts` agar konsisten |

---

## 4. Temuan UX

| ID | Prioritas | Area | Temuan | Rekomendasi |
| --- | --- | --- | --- | --- |
| U-01 | 🔴 P0 | Semua form | Validasi hanya toast; tidak ada pesan inline/`aria-invalid` per field | Error di bawah field + fokus ke field pertama yang salah |
| U-02 | 🔴 P0 | `/products/$id/edit`, `/customers/$id/edit`, `/variants/$variantId/edit`, `/outlets/$id/edit` | `404/403` tidak ditangani; halaman menampilkan form kosong atau spinner terus | Empty/error state + tombol kembali; jangan tampilkan form |
| U-03 | 🔴 P0 | List produk/pelanggan/pesanan/outlet | Server mem-paginasi default **10** dan hanya mengembalikan array; UI tidak punya kontrol halaman | Tambah `meta` pagination di API contract + kontrol halaman/limit di UI |
| U-04 | 🟠 P1 | `features/auth` | Copy login/register berbahasa Inggris; register tanpa konfirmasi password/kekuatan password | Terjemahkan konsisten (ID) + konfirmasi password + indikator kekuatan |
| U-05 | 🟠 P1 | POS checkout | Tidak ada input **uang diterima & kembalian** untuk pembayaran cash | Field “Uang diterima” + kembalian otomatis; validasi ≥ total |
| U-06 | 🟠 P1 | POS item configurator | Tidak ada **catatan bebas** per item (hanya modifier terstruktur) | Field catatan opsional → `meta_data.note` |
| U-07 | 🟠 P1 | POS pelanggan | Tidak bisa tambah pelanggan cepat dari POS | Quick-add modal/halaman kecil dari pemilih pelanggan |
| U-08 | 🟠 P1 | `/shifts/$id/close` | Tidak ada pratinjau kas sistem vs kas fisik vs selisih sebelum simpan | Hitung selisih live saat input kas fisik |
| U-09 | 🟡 P2 | `/orders/$id/payment` | Default nominal sisa tagihan (baik), tetapi tanpa aksi cepat “Lunasi semua”/validasi sisa inline | Tombol “Lunasi semua” + error inline bila melebihi sisa |
| U-10 | 🟡 P2 | Reports | `from > to` tidak divalidasi; hasil kosong tanpa penjelasan | Validasi rentang tanggal + pesan empty state |
| U-11 | 🟡 P2 | Semua form | Tidak ada peringatan **unsaved changes** | Guard `beforeunload`/router blocker saat form dirty |

---

## 5. Yang Sudah Baik

- Semua form tambah/edit berada di route sendiri (lihat lampiran).
- List/detail tidak lagi memuat form inline atau modal CRUD.
- Role-aware access: `AccessDenied` untuk halaman yang tidak diizinkan.
- Capability utama sudah registry-driven; preset reset berfungsi.
- Konfirmasi hapus memakai `ConfirmDialog`.
- Toast sukses/gagal konsisten dan navigasi kembali setelah simpan.
- Struktur visual konsisten (`PageHeader` + `Card` + `Label`/`Input`/`Select`).

---

## 6. Roadmap Perbaikan

### P0 — fondasi usability

| Item | Kriteria Penerimaan |
| --- | --- |
| U-01 Validasi inline | Setiap field wajib punya pesan error inline, `aria-invalid`, dan fokus otomatis ke field pertama yang gagal; toast tetap ada sebagai ringkasan |
| U-02 Error state halaman edit | ID tidak ditemukan/`403` menampilkan pesan + tombol kembali; tidak ada form kosong |
| U-03 Pagination | Respons list menyertakan `meta {page, limit, total}` (update `docs/core/api-contract.md`) dan UI menampilkan navigasi halaman |
| F-01 Editor pricing/modifier | Tidak ada textarea JSON; data tetap dikirim dengan bentuk yang sama |
| F-02 Pemilih anggota | Anggota dipilih dari daftar user (nama/email), bukan User ID |
| F-03 Mutasi stok | Produk → varian (opsional) → stok saat ini → jumlah → estimasi stok akhir |
| F-04 Kelola tenant | Tenant dapat dibuat/diedit/dihapus dari UI kapan pun |
| F-05/F-06 Preset konsisten | Definisi preset satu sumber; form create & edit outlet punya preset + Reset |

### P1 — efisiensi operasional

- U-04 bahasa & keamanan form auth.
- U-05 uang diterima/kembalian.
- U-06 catatan item POS.
- U-07 quick-add pelanggan dari POS.
- U-08 pratinjau selisih kas shift.
- F-07 kategori sebagai pilihan.
- F-08 perubahan stok varian lewat mutasi.

### P2 — polish

- U-09 aksi cepat pelunasan.
- U-10 validasi filter laporan.
- U-11 guard unsaved changes.
- F-09 sentralisasi konstanta domain.
- (Tambahan) skeleton loading untuk list, bukan spinner penuh.

---

## 7. Checklist Form Baru

Gunakan checklist ini saat menambah form tambah/edit:

- [ ] Route sendiri (`/<entity>/new`, `/<entity>/$id/edit`); list/detail hanya menautkan.
- [ ] Guard role (`canManage`/`canOperate`) + `AccessDenied`.
- [ ] Validasi inline per field + `aria-invalid` + fokus ke error pertama.
- [ ] Label eksplisit (`htmlFor`) untuk setiap input; tidak ada input tanpa nama aksesibel.
- [ ] Loading state saat fetch, error/not-found state, dan empty state.
- [ ] Tombol simpan menampilkan status pending dan mencegah double submit.
- [ ] Navigasi kembali setelah sukses + toast.
- [ ] Tombol Batal/Kembali konsisten.
- [ ] Konfirmasi untuk aksi destruktif.
- [ ] Tidak ada input ID mentah bila entitas bisa dipilih dari daftar.
- [ ] Tidak ada JSON mentah untuk konfigurasi yang bisa distrukturkan.
- [ ] Responsive: 320/768/1024/1440 px.
- [ ] Keyboard-only: Tab/Enter/Escape berfungsi.
- [ ] E2E: route dapat diakses dan alur simpan diuji.

---

## 8. Dependensi Backend

Beberapa perbaikan memerlukan perubahan API dan **wajib** memperbarui `docs/core/api-contract.md`:

| Kebutuhan | Perubahan API |
| --- | --- |
| Pemilih user untuk anggota outlet | `GET /users?search=&page=` (khusus admin/owner) |
| Pagination list | Tambahkan `meta` pada envelope list (products, customers, orders, outlets) |
| Catatan item POS | Tidak perlu endpoint baru; gunakan `meta_data.note` yang sudah ada |
| Mutasi varian | Tidak perlu endpoint baru; UI perlu mengirim `variant_id` |

---

## 9. Lampiran — Peta Route Form

| Entitas | Create | Edit |
| --- | --- | --- |
| Produk | `/products/new` | `/products/$id/edit` |
| Varian | `/products/$id/variants/new` | `/products/$id/variants/$variantId/edit` |
| Pelanggan | `/customers/new` | `/customers/$id/edit` |
| Mutasi stok | `/inventory/new` | — |
| Shift | `/shifts/new` | `/shifts/$id/close` |
| Pembayaran pesanan | `/orders/$id/payment` | — |
| Outlet | `/outlets/new` | `/outlets/$id/edit` |
| Capability outlet | — | `/outlets/$id/capabilities` |
| Anggota outlet | `/outlets/$id/members/new` | — |
| Struk outlet | — | `/outlets/$id/receipt-settings` |

Pengecualian modal (disengaja): `ItemConfigurator` di POS (alur transaksi) dan `ReceiptModal` (preview).
