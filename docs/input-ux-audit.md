# Audit Input & Interaksi (Ronde 2)

Dokumen ini mencatat temuan input/interaksi setelah audit UX P0–P2 selesai
(lihat [`ui-ux-audit.md`](ui-ux-audit.md)), beserta keputusan desain dan statusnya.

**Cakupan:** dropdown, field angka di kasir, alur pesanan, halaman pelanggan, dan tutup shift.

---

## 1. Ringkasan Keputusan

| Tema | Keputusan |
| --- | --- |
| Dropdown | Tidak lagi memakai `<select>` native. Semua dropdown memakai `Combobox` (listbox pattern) dengan chevron di dalam kontrol dan pencarian otomatis untuk 8+ opsi. |
| Input angka | Uang → `CurrencyInput`; angka lain → `NumberInput` (spinner seragam). Karakter non-numerik diblokir. |
| Persen di kasir | **Bilangan bulat** (0–100, step 1). Diskon/pajak tidak butuh 0,01% di meja kasir. Komisi staf tetap desimal karena diatur di katalog. |
| Pemilihan varian | Tombol chip (satu baris, `aria-pressed`), bukan dropdown — lebih cepat ditekan saat ramai. |
| Status pesanan | Kontrol ubah status hanya muncul bila capability `enable_order_workflow` aktif. |
| Riwayat pelanggan | Halaman detail pelanggan sendiri (`/customers/$id`), list pelanggan kembali fokus ke satu konteks. |
| Kas shift | Kas sistem dihitung **live** (kas awal + pembayaran tunai shift), bukan hanya saat tutup shift. |

---

## 2. Temuan & Perbaikan

| ID | Area | Temuan | Dampak | Perbaikan |
| --- | --- | --- | --- | --- |
| I-01 | Semua dropdown | Memakai `<select>` native; panah bawaan browser tidak sejajar dan tidak bisa menampilkan deskripsi | Tampilan tidak konsisten, sulit dipakai untuk daftar panjang | `Combobox`: trigger dengan chevron di dalam padding, popup `role="listbox"`, pencarian otomatis ≥8 opsi, navigasi keyboard (↑/↓/Home/End/Enter/Escape), klik luar menutup |
| I-02 | Kasir — pelanggan | Dropdown pelanggan terdaftar dan input nama pelanggan berdiri sendiri | Bisa tersimpan order dengan `customer_id` A tetapi `customer_name` B | Dependen: memilih pelanggan mengisi nama dan mengunci field nama; input nama hanya aktif untuk walk-in. Teks bantuan menjelaskan perilaku |
| I-03 | Kasir — varian | Varian dipilih dari dropdown | Butuh 2 klik dan tidak terlihat semua pilihan | Chip tombol (termasuk "Tanpa varian") dengan `aria-pressed` di dalam `fieldset`/`legend` |
| I-04 | Kasir — catatan item | Placeholder "Contoh: tanpa gula, warna hitam" tidak menjelaskan cakupan | Kasir bingung catatan untuk item atau pesanan | Placeholder: “Tulis permintaan khusus, mis. tanpa gula / jahit rapat” |
| I-05 | Kasir — persen | Diskon/pajak memakai 2 desimal | Stepper 0,01 tidak berguna; risiko salah input | Bilangan bulat 0–100; komisi katalog tetap 2 desimal |
| I-06 | Pesanan | Kontrol status selalu tampil walau capability alur pesanan mati | Operator melihat kontrol yang tidak berlaku | Filter status & kontrol per pesanan hanya muncul bila `enable_order_workflow`; grid filter menyesuaikan 2/3 kolom |
| I-07 | Pesanan | Ukuran dropdown status dan tombol aksi tidak seragam | Baris terlihat tidak rapi | `size="sm"` untuk dropdown & tombol, padding link "Pelunasan" disamakan |
| I-08 | Pelanggan | Satu halaman menampilkan list pelanggan **dan** riwayat pesanan | Dua konteks bercampur; sulit dipakai di layar kecil | Riwayat pindah ke `/customers/$id` (profil + riwayat + struk); list hanya menautkan |
| I-09 | Tutup shift | "Kas sistem" hanya berisi kas awal sampai shift ditutup, lalu UI menampilkan selisih "Lebih" yang menyesatkan | Kasir mengira ada kelebihan uang padahal sistem belum menghitung penjualan tunai | Backend menghitung `expected_cash` live pada GET/LIST (kas awal + pembayaran `cash` dengan `shift_id`), plus teks penjelas arti selisih |

---

## 3. Pertanyaan: persen di kasir bulat atau desimal?

**Bilangan bulat.** Alasannya:

- Pajak dan diskon operasional di Indonesia lazim berupa angka bulat (mis. 11%, 10%, 5%).
- Stepper dengan step 0,01 menghasilkan perubahan yang tidak terasa dan rawan salah ketik.
- Server tetap menerima `float64`, jadi outlet yang butuh 2,5% bisa mengetik `2.5`
  lewat input teks; spinner hanya menambah 1.

Komisi staf **tetap desimal** karena rule komisi adalah konfigurasi katalog, bukan input cepat kasir.

---

## 4. Konvensi Baru

- Dropdown wajib `Combobox`/`Select` kustom; jangan menambah `<select>` native.
  - `<Select>` tetap tersedia dengan API lama (children `<option>`, `onChange` event) sehingga
    form lama tidak perlu diubah; ia meneruskan ke `Combobox`.
  - Untuk data non-`<option>` (mis. hasil pencarian user), pakai `Combobox` langsung dengan
    `options: { value, label, description? }[]`.
- Nominal uang → `CurrencyInput`; angka lain → `NumberInput`; jangan `type="number"`.
- Pilihan sedikit dan sering dipakai saat transaksi (varian, qty) → tombol chip, bukan dropdown.
- Kontrol yang bergantung pada capability harus dirender dari flag outlet aktif
  (`activeOutlet.capabilities.*`), bukan diasumsikan selalu ada.

---

## 5. Status

| ID | Status |
| --- | --- |
| I-01 … I-09 | ✅ Selesai |

### Verifikasi

- Unit/component: `Combobox`, `Select` adapter, `NumberInput`, `CurrencyInput` (Vitest).
- Integrasi API: `TestOpenShiftReportsLiveExpectedCash` (kas sistem live saat shift terbuka).
- E2E: 8 skenario (navigasi form, preset capability via dropdown kustom, checkout tunai, quick-add pelanggan,
  guard unsaved changes, validasi rentang laporan).

---

## 6. Catatan Terbuka

- `Select` kustom melakukan pencarian otomatis pada ≥8 opsi; untuk daftar yang sangat panjang
  (ribuan baris) sebaiknya tetap pakai pencarian server-side (contoh: `useSearchUsers` di form anggota outlet).
- Dropdown saat ini merender popup inline (bukan portal); pada kontainer dengan `overflow: hidden`
  popup bisa terpotong — belum ditemukan kasus di aplikasi ini.
