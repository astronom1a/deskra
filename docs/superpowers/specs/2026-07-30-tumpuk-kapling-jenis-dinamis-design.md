# Tumpuk Kapling — Jenis Dinamis & Slaghammer Checklist

## Latar Belakang

Menu **Tumpuk Kapling** (`src/pages/TumpukKapling.jsx`) saat ini menampilkan grid statis 3 jenis × 3 sortimen (9 baris tetap): JATI, RIMBA (Mahoni), RIMBA (Kedawung). Kolom `jenis` di database adalah Postgres enum `jenis_kapling` yang hanya berisi 3 nilai tersebut.

Perubahan yang dibutuhkan:
1. Input jenis dibuat dinamis dengan model "Tambah Item" (mirip pola `SectionPerJenis` di `src/pages/DetailPekerjaan.jsx`) — user menambah/menghapus blok jenis sesuai kebutuhan, bukan grid tetap.
2. Tambah 3 jenis baru: **Johar**, **Klampis**, **Rimba Campuran**.
3. Slaghammer (yang sebelumnya hardcode = volume JATI + RIMBA_MAHONI) diubah jadi checklist per jenis per periode — JATI & RIMBA_MAHONI selalu fix ikut, jenis lain (termasuk Rimba Kedawung yang sekarang tidak ikut) jadi opsional via checkbox, default tidak dicentang.

Perubahan ini menyentuh 1 migration + 5 file kode (halaman input, util rekap, dan 3 halaman cetak) karena breakdown per-jenis tumpuk kapling dipakai di beberapa laporan.

## Skema Database

### Migration baru: `supabase/migrations/<timestamp>_tumpuk_kapling_jenis_baru.sql`

```sql
-- Tambah 3 jenis baru ke enum jenis_kapling
alter type jenis_kapling add value if not exists 'JOHAR';
alter type jenis_kapling add value if not exists 'KLAMPIS';
alter type jenis_kapling add value if not exists 'RIMBA_CAMPURAN';
```

Migration ini isinya murni `ALTER TYPE ... ADD VALUE` saja, tidak dicampur dengan DML lain — beberapa versi Postgres tidak mengizinkan `ALTER TYPE ... ADD VALUE` dijalankan di dalam blok transaksi yang sama dengan statement lain, jadi diisolasi ke file migration sendiri untuk aman terlepas dari bagaimana `migrate.js` membungkus eksekusinya.

### Migration baru: `supabase/migrations/<timestamp+1>_tumpuk_kapling_slaghammer_flag.sql`

```sql
alter table tabel_tumpuk_kapling
  add column if not exists ikut_slaghammer boolean not null default false;

update tabel_tumpuk_kapling set ikut_slaghammer = true
  where jenis in ('JATI', 'RIMBA_MAHONI');

create or replace view v_slaghammer
with (security_invoker = true) as
select
  periode_id,
  sum(volume)            as fisik,
  3000::numeric          as tarif,
  sum(volume) * 3000     as nilai
from tabel_tumpuk_kapling
where ikut_slaghammer = true
group by periode_id;
```

Data lama otomatis konsisten: baris JATI & RIMBA_MAHONI yang sudah ada jadi `ikut_slaghammer = true` (perilaku tidak berubah), baris lain (termasuk RIMBA_KEDAWUNG) tetap `false` (perilaku tidak berubah sampai user mencentang manual).

`seed_tumpuk_kapling()` perlu sedikit penyesuaian di migration flag ini: karena fungsi meng-`insert` dengan kolom eksplisit, kolom baru `ikut_slaghammer` tidak otomatis terisi `default`-nya kalau tidak disebut di value list. Migration ini melakukan `create or replace function seed_tumpuk_kapling(...)` ulang, menambahkan kolom `ikut_slaghammer` ke insert list dengan nilai `true` untuk baris JATI & RIMBA_MAHONI, `false` untuk RIMBA_KEDAWUNG — hasil akhirnya sama persis dengan perilaku sekarang (9 baris, 3 jenis lama).

## `src/pages/TumpukKapling.jsx`

### Struktur data & state

- `JENIS_OPTIONS`: array 6 jenis — `{ key, label }` — JATI, RIMBA_MAHONI, RIMBA_KEDAWUNG, JOHAR, KLAMPIS, RIMBA_CAMPURAN.
- `JENIS_FIXED_SLAG = ['JATI', 'RIMBA_MAHONI']` — jenis yang checkbox Slaghammer-nya selalu terkunci `true`.
- State `activeJenis: string[]` — daftar jenis yang blok-nya sedang tampil. Diturunkan (via `useEffect`/derivasi) dari jenis unik pada `rows` setiap kali `fetchData` selesai. Kalau periode belum ada data (`rows` kosong), `activeJenis` kosong — tidak ada blok tampil.
- Setiap baris di `rows` punya field `ikut_slaghammer` (boolean) selain field yang sudah ada (`volume`, `tarif`, dst).

### UI blok jenis

- Setiap blok jenis (struktur sama seperti blok existing: header + tabel 3 baris sortimen) sekarang punya:
  - Checkbox "Ikut Slaghammer" di header blok:
    - Untuk `JATI`/`RIMBA_MAHONI`: checkbox tercentang, disabled, dengan ikon lock (pola sama seperti indikator Tarif yang sudah ada di halaman ini).
    - Untuk jenis lain: checkbox interaktif, toggle mengubah `ikut_slaghammer` pada ketiga baris sortimen jenis tsb (state lokal, langsung tersimpan ke DB saat "Simpan Data").
  - Tombol hapus (ikon Trash2, konsisten dengan pola `removeRow`/`removeNota` di Detail Pekerjaan) di header blok — menghapus jenis dari `activeJenis` (state lokal saja; row di DB baru terhapus saat "Simpan Data").

### Kontrol "+ Tambah Item"

- Ditempatkan di bawah daftar blok (pola sama seperti tombol "Tambah Baris"/"Tambah Nota" di Detail Pekerjaan): dropdown berisi jenis dari `JENIS_OPTIONS` yang **belum** ada di `activeJenis`, + tombol "Tambah Item".
- Saat ditambahkan: jenis baru masuk ke `activeJenis`, dan 3 baris sortimen (AI/AII/AIII) dibuat di state lokal dengan `volume: 0`, `tarif` dari `tarifSortimen`, `ikut_slaghammer: JENIS_FIXED_SLAG.includes(jenis)` (otomatis `true` kalau kebetulan jenis fix, tapi karena fix jenis selalu sudah collapsed dari legacy 3 — dalam praktiknya kontrol ini dipakai untuk jenis non-fix, default `false`).
- Kontrol disembunyikan/disabled kalau ke-6 jenis sudah aktif semua.

### "Generate Default"

- Tidak berubah secara fungsional: tetap langsung `upsert` 9 baris (3 jenis lama × 3 sortimen) ke DB seperti sekarang, lalu `fetchData` ulang (yang otomatis mengisi `activeJenis` dari data baru). JATI & RIMBA_MAHONI di-upsert dengan `ikut_slaghammer: true`, RIMBA_KEDAWUNG dengan `ikut_slaghammer: false`.

### Simpan Data (`handleSave`)

1. Hitung jenis yang dihapus user = (jenis unik dari snapshot awal DB) − `activeJenis`. Untuk tiap jenis yang dihapus: `delete` dari `tabel_tumpuk_kapling` where `periode_id` + `jenis`.
2. Untuk tiap jenis di `activeJenis` × 3 sortimen: `upsert` seperti sekarang, ditambah field `ikut_slaghammer` dari state (untuk `JATI`/`RIMBA_MAHONI` selalu kirim `true`).
3. Setelah berhasil: `fetchData` ulang, snapshot awal DB di-refresh.

### Card ringkasan Slaghammer

- `fetchSummary`: fisik Slaghammer dihitung dari `SUM(volume) WHERE ikut_slaghammer === true` pada `sourceRows` (bukan filter jenis hardcode lagi).
- Note di card diganti dari `"JATI + Mahoni"` jadi teks generik, misalnya `"Sesuai checklist per jenis"`.

## `src/lib/rekapPekerjaan.js`

- `totalSlag`: ganti dari
  ```js
  t.filter(r=>['JATI','RIMBA_MAHONI'].includes(r.jenis)).reduce((s,r) => s+(r.volume||0), 0)
  ```
  jadi
  ```js
  t.filter(r => r.ikut_slaghammer).reduce((s,r) => s+(r.volume||0), 0)
  ```
- Tambah 3 baris rekap baru mengikuti pola `tumpuk_mahoni`/`tumpuk_kedawung` (kode_rek `51.69.44`, `_noMode: 'none'`, `_src: 'auto'`):
  - `tumpuk_johar` → uraian `TUMPUK KAPLING JOHAR`
  - `tumpuk_klampis` → uraian `TUMPUK KAPLING KLAMPIS`
  - `tumpuk_rimba_campuran` → uraian `TUMPUK KAPLING RIMBA (CAMPURAN)`
- `h29` (dasar nomor urut kode rek `51.69.44`) diperluas menjumlahkan nilai 3 jenis baru ini juga:
  ```js
  const h29 = nilaiJati + nilaiMahoni + nilaiKedawung + nilaiJohar + nilaiKlampis + nilaiRimbaCampuran + nilaiBrongkol
  ```

## `src/pages/Cetak/CetakBiayaTPK.jsx`

- `sortimenRimba` (filter jenis untuk blok cetak "TUMPUK KAPLING RIMBA") diperluas:
  ```js
  const sortimenRimba = sortimenOf(j =>
    ['RIMBA_MAHONI', 'RIMBA_KEDAWUNG', 'JOHAR', 'KLAMPIS', 'RIMBA_CAMPURAN'].includes(j)
  )
  ```
  Blok JATI (`sortimenJati`) tidak berubah. Tidak ada blok cetak baru — semua 3 jenis baru gabung ke blok RIMBA yang sudah ada.

## `src/pages/Cetak/CetakKwitansi.jsx`

- `JENIS_LABEL` diperluas: `JOHAR: 'JOHAR', KLAMPIS: 'KLAMPIS', RIMBA_CAMPURAN: 'RIMBA CAMPURAN'`.
- `computeSubRows`, cabang `subSrc === 'tumpuk'` (breakdown Penomoran/Sabuk — semua jenis ikut, tidak berkaitan dengan Slaghammer): tambah entri untuk 3 jenis baru mengikuti pola yang sama (`get('JOHAR')`, dst), atau — lebih tahan lama — generate daftar dari jenis unik yang ada di `data.tumpuk` supaya tidak perlu diedit lagi kalau ada jenis baru di masa depan.
- Cabang `subSrc === 'tumpuk_slag'` (breakdown Slaghammer): ganti dari daftar hardcode `['JATI', 'RIMBA_MAHONI']` jadi:
  ```js
  const jenisSlag = [...new Set(t.filter(r => r.ikut_slaghammer).map(r => r.jenis))]
  result = jenisSlag.map(j => ({ label: JENIS_LABEL[j] || j, fisik: get(j) }))
  ```

## `src/pages/Cetak/CetakLampiran31.jsx`

- `JENIS_LABEL` dan `JENIS_ORDER` diperluas dengan 3 jenis baru (`JOHAR: 'KAYU JOHAR'`, dst), mengikuti pola nama existing (`KAYU JATI`, `KAYU MAHONI`, `KAYU KEDAWUNG`). Loop `TumpukBody` sudah generic (filter jenis dengan `volume > 0`), jadi tidak perlu perubahan logic lain.

## Non-Goals / Di Luar Scope

- `DkhpSkshhk.jsx` — konstanta `JATI`/`RIMBA` di file ini untuk fitur DKHP/SKSHH yang berbeda (klasifikasi kayu, bukan Tumpuk Kapling), tidak disentuh.
- Tidak ada perubahan pada `tabel_tarif_periode` — tarif AI/AII/AIII tetap satu set untuk semua jenis (termasuk jenis baru), tidak ada tarif berbeda per jenis.
- Tidak ada migrasi data historis untuk mengisi `ikut_slaghammer` pada jenis baru (karena datanya belum ada — baris baru selalu mulai dari `false` sesuai default kolom).

## Testing

- Tidak ada test otomatis existing untuk Tumpuk Kapling (`test/` tidak menyentuh `tabel_tumpuk_kapling`/`TumpukKapling`). Verifikasi dilakukan manual: cek migrasi di Supabase dashboard, dan uji UI (tambah/hapus blok jenis, checklist Slaghammer, simpan, cek angka di Cetak Biaya TPK & Cetak Kwitansi) — sesuai `CLAUDE.md`, tidak menjalankan `npm test` kecuali diminta eksplisit.
