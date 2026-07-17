# Spec: Register Invois Bertab (v0.55.0)

Status: **draft — menunggu persetujuan**
Tanggal: 2026-07-17
Halaman terdampak: `/register-kapling/invois`

---

## 1. Latar Belakang

Halaman Register Invois saat ini satu layar: form daftar invois + tabel. Dua masalah mendasari restrukturisasi ini:

1. **Data `pembeli` tercemar.** Import invois PDF menangkap seluruh teks setelah
   "Terima Dari :" — nama pembeli tercampur Email, No KTP, NPWP, Alamat, hingga
   seluruh detail transaksi dalam satu kolom. Contoh nyata di database:
   ```
   AGUSTI GUNAWAN Email : cu2nk86@gmail.com Type Pembeli : PERSONAL No KTP : 3510... Alamat : DUSUN GALEKAN ... Detail Transaksi : ...
   ```
2. **Tidak ada master pembeli.** Nomor akun (3–5 digit pertama nomor invois)
   sebenarnya identitas pembeli, tapi belum ada tempat meregister akun ↔ nama.

## 2. Tujuan

Halaman Register Invois menjadi **3 tab**:

| Tab | Nama | Isi | Sifat |
|-----|------|-----|-------|
| 1 | Register Pembeli | nomor akun + nama pembeli (tanpa email dll) | CRUD |
| 2 | Register Invois | isi halaman sekarang, pembeli = nama bersih | CRUD |
| 3 | Rekap Sortimen | no. invois, pembeli, sortimen (AI/AII/AIII), jumlah batang, kubikasi | read-only |

Non-tujuan: menyimpan email/KTP/NPWP/alamat pembeli (sengaja dibuang),
input manual di Tab 3 (semua angka diturunkan dari register kapling).

---

## 3. Pembersihan Data Pembeli (fondasi)

### 3.1 Fix parser PDF (`registerKaplingInvoiceImport.js`)

Regex pembeli berhenti di penanda pertama:

```
(?:Sudah|Telah)\s+Terima\s+Dari\s*:\s*(.+?)\s+(?:Email|Type\s+Pembeli|No\s+KTP|NPWP|Alamat|Detail\s+Transaksi)\s*:
```

Fallback ke regex lama bila penanda tidak ditemukan. Hasil di-trim + uppercase.

### 3.2 Utility bersama `cleanPembeliName(raw)`

Fungsi murni di `register-invois/utils/` — memotong string pada penanda pertama
(`Email :`, `Type Pembeli :`, `No KTP :`, `NPWP :`, `Alamat :`, `Detail Transaksi :`,
case-insensitive), trim hasilnya. Dipakai parser PDF, tampilan, dan backfill.

### 3.3 Migrasi pembersihan satu kali

```sql
UPDATE tabel_invois SET pembeli = <potong pada penanda> WHERE pembeli ~* penanda;
```

- Update `tabel_invois` cukup — trigger `trg_sync_invois_pembeli` yang sudah ada
  otomatis menyebarkan nama bersih ke semua baris register kapling se-invois.
- Tambahan langsung untuk: baris register kapling ber-pembeli kotor tapi tanpa
  `no_invois`, dan `tabel_dkhp_skshhk.pembeli` bila ikut tercemar.
- **Wajib diverifikasi dulu** dengan transaksi `BEGIN … ROLLBACK` + sampel
  before/after sebelum diterapkan permanen.

---

## 4. Data Model Baru: `tabel_pembeli`

```sql
create table tabel_pembeli (
  id         uuid primary key default gen_random_uuid(),
  tpk_id     uuid not null references tabel_tpk(id),
  akun       text not null,   -- 3-5 digit, disimpan sebagai text
  pembeli    text not null,
  created_at timestamptz default now()
);
create unique index on tabel_pembeli (tpk_id, akun);
-- RLS: pola rls_<table>_all, (tpk_id = my_tpk_id()) or is_admin()
```

Tidak ada trigger DB untuk tabel ini — nomor akun hanya bisa diturunkan dari
nomor invois lewat `parseInvois` (logika JS, tidak diduplikasi ke SQL).
Semua keterkaitan akun ↔ invois ditangani frontend (lihat §6).

Backfill awal: tidak lewat migrasi SQL. Tab 1 punya tombol
**"tarik dari register invois"** yang mem-parse akun semua invois terdaftar dan
meng-upsert pasangan akun→pembeli yang belum ada (nama diambil dari invois
terbaru per akun).

---

## 5. Struktur UI

```
src/pages/register-invois/
  index.jsx                  # shell: header + tab bar + render tab aktif
  tabs/
    TabPembeli.jsx           # Tab 1
    TabInvois.jsx            # Tab 2 (pindahan isi index.jsx sekarang)
    TabRekapSortimen.jsx     # Tab 3
  utils/
    parseInvois.js           # sudah ada
    cleanPembeliName.js      # baru (§3.2)
```

- Tab aktif disimpan di query param `?tab=` (`pembeli` / `invois` / `rekap`,
  default `invois`) agar bisa di-bookmark dan tahan refresh.
- Styling mengikuti pola dark-theme inline yang sudah ada (monospace, `#0a0a0a`,
  aksen `#00ff88`); tab bar model underline/badge konsisten dengan halaman lain.
- Data fetch di level shell (sekali) dan dibagikan ke tab via props:
  `tabel_invois`, `tabel_pembeli`, dan baris register kapling
  (`no_invois, pembeli, sortimen, batang, volume` — hanya kolom yang dibutuhkan).

### 5.1 Tab 1 — Register Pembeli

- Form: **no. akun** (angka 3–5 digit) + **nama pembeli**. Keduanya wajib.
- Tabel: akun, nama pembeli, jumlah invois ber-akun itu (hitung dari data invois),
  aksi edit/hapus (ConfirmDialog).
- Tombol "tarik dari register invois" (§4).
- Validasi: akun duplikat per TPK ditolak (unique index → toast ramah).

### 5.2 Tab 2 — Register Invois

Sama dengan halaman sekarang, dengan perubahan:

- Saran pembeli saat mengetik nomor invois: **prioritas `tabel_pembeli`**
  (lookup akun terparse), fallback histori invois se-akun.
- Simpan invois ber-pembeli dengan akun terparse yang belum ada di
  `tabel_pembeli` → otomatis upsert ke Register Pembeli (sekalian toast
  "pembeli baru terdaftar: …").
- Kolom pembeli menampilkan `cleanPembeliName` (jaga-jaga bila ada data kotor
  yang lolos).

### 5.3 Tab 3 — Rekap Sortimen

- Sumber: baris register kapling yang punya `no_invois`, digrup
  `no_invois × sortimen` → `sum(batang)`, `sum(volume)`.
- Kolom: no. invois (dengan segmen warna + badge prefix), pembeli, sortimen
  (badge AI/AII/AIII), jumlah batang, kubikasi (m³, 3 desimal, `id-ID`).
- Pembeli diambil dari `tabel_invois`; fallback nilai pembeli di baris register.
- Pencarian (invois/pembeli/sortimen) + baris total batang & m³ di footer.
- Read-only murni — tanpa tombol aksi.

---

## 6. Aturan Sinkronisasi (ringkasan)

| Kejadian | Efek |
|----------|------|
| Simpan invois + pembeli, akun belum terdaftar | upsert `tabel_pembeli` (frontend) |
| Daftarkan/ubah nama di Tab 1 | tawarkan isi pembeli invois se-akun yang masih kosong (frontend, dengan konfirmasi) |
| Pembeli entri invois berubah | trigger DB lama tetap: menimpa pembeli register kapling se-invois |
| Rekap Sortimen | selalu derived, tidak pernah ditulis balik |

Catatan: mengubah nama di Tab 1 **tidak** menimpa pembeli invois yang sudah
terisi (invois adalah acuan per-transaksi); hanya mengisi yang kosong.

---

## 7. Rencana Verifikasi

Aturan test: **hanya test pada bagian yang terhubung dengan perubahan** —
test global (`npm test` penuh) tidak dijalankan kecuali diperintah eksplisit.

1. Test unit `cleanPembeliName` (blob nyata dari DB → nama bersih; nama yang
   sudah bersih tidak berubah; string kosong/null).
2. Test unit regex pembeli parser PDF (teks invois Perhutani contoh → nama saja).
3. Jalankan hanya file test yang terhubung:
   `node --test test/parseInvois.test.js test/registerKaplingInvoiceImport.test.js`
   plus file test baru dari poin 1–2.
4. Migrasi pembersihan: jalankan dalam `BEGIN … ROLLBACK`, tampilkan 10 sampel
   before/after + jumlah baris terdampak, baru terapkan permanen.
5. `npm run build` untuk verifikasi kompilasi.
6. Cek visual 3 tab di dev server (data nyata) bila sesi login tersedia.

## 8. Rilis

- Versi **0.55.0** (minor — fitur baru + perubahan UI).
- Commit terpisah: (1) pembersihan data + parser fix + migrasi, (2) tabel_pembeli
  + migrasi, (3) restrukturisasi UI 3 tab, (4) chore bump versi.
- Migrasi diterapkan ke production via Supabase MCP setelah verifikasi rollback.

## 9. Pertanyaan Terbuka (default yang dipakai bila tidak dijawab)

1. Tab default saat halaman dibuka → **Register Invois** (fungsi utama sekarang).
2. Rekap Sortimen ikut filter tahun seperti Statistik? → **tidak** untuk versi
   ini (tampilkan semua, pencarian sudah cukup); mudah ditambah belakangan.
3. Baris register kapling tanpa sortimen (kosong) di Tab 3 → dikelompokkan
   sebagai "—" agar totalnya tetap jujur.
