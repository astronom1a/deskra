# Dashboard — Panel Periode Berjalan & Reminder Uang Kerja

**Tanggal:** 2026-10-20
**Status:** Disetujui, siap dibuatkan rencana implementasi

## Masalah

Kartu History Uang Kerja di Dashboard hanya menampilkan 5 periode terakhir berdasarkan
`created_at`. Tidak ada yang memberi tahu user bahwa periode untuk rentang tanggal yang
sedang berjalan belum dibuat, atau sudah dibuat tapi datanya masih kosong.

Kondisi nyata saat spec ini ditulis membuktikan masalahnya: hari ini 20 Oktober 2026,
periode berjalan seharusnya `II/10 / 2026` (16–31 Okt), dan row-nya belum ada di
`tabel_periode`. Periode terakhir di DB hanya `I/10 / 2026`. Dashboard sama sekali tidak
menyinggung kekosongan itu.

Secara historis user membuat periode 2–3 hari sebelum `tgl_akhir` (contoh: `I/10` dibuat
13 Okt untuk periode yang berakhir 15 Okt). Reminder H-3 menyesuaikan kebiasaan tersebut.

## Lingkup

Hanya frontend. Tidak ada migrasi database. Semua informasi diturunkan dari data yang
sudah ada.

## Konsep Periode

Periode di Deskra bersifat setengah bulanan:

- Paruh **I** — tanggal 1 sampai 15
- Paruh **II** — tanggal 16 sampai akhir bulan (memperhitungkan tahun kabisat)

Label mengikuti format yang sudah dipakai MainLink: `II/10 / 2026`.

**Periode berjalan** adalah window yang memuat tanggal hari ini. Diturunkan murni dari
tanggal, bukan dari isi database. Konsekuensinya: `tgl_akhir` periode berjalan selalu
hari ini atau sesudahnya — periode berjalan tidak pernah bisa berstatus terlambat.
Keterlambatan hanya berlaku untuk **periode sebelumnya**.

## Komponen

### 1. `src/lib/periodeBerjalan.js` (baru)

Fungsi murni, tanpa dependensi Supabase atau React, sehingga bisa dites dengan
`node --test`.

| Fungsi | Masukan | Keluaran |
|---|---|---|
| `getPeriodeWindow(date)` | `Date` | `{ half, bulan, tahun, label, tglAwal, tglAkhir }` |
| `getPeriodeSebelumnya(window)` | window | window paruh sebelumnya (lintas tahun aman: I/1 → II/12 tahun lalu) |
| `hariTersisa(tglAkhir, today)` | ISO date + `Date` | selisih hari, bilangan bulat |
| `getStatusPeriode(args)` | lihat di bawah | `{ empty, current, previous, hariTersisa, reminderAktif }` |

`getStatusPeriode` menerima `{ window, periodeRow, totalUk, windowSebelumnya,
periodeRowSebelumnya, totalUkSebelumnya, today }`.

Tanggal dibandingkan sebagai string ISO `YYYY-MM-DD` di zona waktu lokal, bukan sebagai
objek `Date`, untuk menghindari pergeseran akibat UTC.

**Deduplikasi:** logika tanggal ini saat ini hidup di `generateTanggal` dan
`PERIODE_OPTIONS` dalam `src/pages/MainLink.jsx`. MainLink diubah untuk mengimpor dari
file baru ini agar label dan tanggal tidak punya dua sumber kebenaran.

### 2. State model

Model ini punya **dua sumbu**, bukan satu daftar datar. `current` menggambarkan periode
yang sedang berjalan, `previous` menggambarkan periode sebelumnya yang sudah lewat
`tgl_akhir`. Keduanya berdiri sendiri dan bisa muncul bersamaan — misalnya periode lalu
`overdue` sementara periode berjalan `missing`.

Nilai state memakai Bahasa Inggris sesuai aturan identifier di CLAUDE.md. Teks yang tampil
ke user tetap Bahasa Indonesia.

**`empty`** — flag boolean terpisah, bukan nilai state. Bernilai `true` kalau TPK ini belum
punya periode sama sekali. Saat `true`, kedua sumbu diabaikan dan Dashboard menampilkan
empty state yang sudah ada ("Belum ada periode"), tidak diubah.

#### Sumbu `current` — periode berjalan

| State | Kondisi | Warna | Tampilan |
|---|---|---|---|
| `missing` | Window berjalan tidak punya row di `tabel_periode` | amber | "Periode II/10 2026 belum dibuat" + rentang tanggal + sisa hari + tombol `Buat Periode →` |
| `noData` | Row ada, total UK = 0 | amber | "Periode II/10 2026 — data belum diinput" + tombol `Input Data →` |
| `onTrack` | Row ada, total UK > 0 | hijau | Nama periode, rentang tanggal, total UK, sisa hari |

Nominal pada `onTrack` mengikuti toggle mata (`hideAmount`) yang sudah ada di Dashboard.

#### Sumbu `previous` — periode sebelumnya

| State | Kondisi | Warna | Tampilan |
|---|---|---|---|
| `archived` | Sudah lewat `tgl_akhir` **dan** total UK > 0 | netral | Tidak ada banner. Keadaan tenang: periode itu selesai dan terarsip |
| `overdue` | Sudah lewat `tgl_akhir`, tapi belum dibuat atau total UK = 0 | merah | Banner "Periode I/10 2026 sudah berakhir dan belum diinput" |
| `none` | Tidak ada periode sebelumnya yang relevan | — | Tidak ada tampilan |

Banner `overdue` muncul di atas panel periode berjalan, bukan menggantikannya.

**Catatan penamaan:** `onTrack` sengaja tidak dinamai `aktif`. Kolom
`tabel_periode.status` sudah memakai nilai `'aktif'` untuk seluruh 12 baris yang ada
dengan arti berbeda, sehingga nama itu akan rancu. `archived` juga tidak dipakai untuk
periode berjalan, karena periode yang masih jalan belum bisa disebut arsip.

#### Kolom STATUS di tabel history

Kolom `STATUS` pada tabel 5 periode terakhir saat ini menampilkan
`tabel_periode.status` mentah, yang selalu bernilai `aktif` untuk setiap baris sehingga
tidak membawa informasi apa pun.

Kolom itu diubah menjadi state turunan memakai model yang sama: baris yang sudah lewat
`tgl_akhir` dan ada datanya ditandai **arsip**, yang sudah lewat tapi kosong ditandai
**belum lengkap**, dan baris window berjalan ditandai **berjalan**. Kolom
`tabel_periode.status` tidak lagi dibaca untuk tampilan ini dan tidak diubah isinya.

### 3. Reminder

Reminder menyala jika salah satu terpenuhi:

- `current ∈ {missing, noData}` **dan** `hariTersisa` ke `tgl_akhir` berada di rentang 0–3
  (H-3, H-2, H-1, dan hari-H itu sendiri)
- `previous = overdue`

`current = onTrack` dan `previous = archived` keduanya tidak pernah membunyikan reminder.

Dua wujud reminder:

**Banner** di Dashboard, di atas panel. Amber untuk H-3..H-0, merah untuk `overdue`.
Contoh teks: *"3 hari lagi periode II/10 2026 berakhir — periode belum dibuat."*

**Badge** titik di `Layout.jsx`, pada parent menu `Uang Kerja` dan child `Main Link`,
sehingga terlihat dari halaman mana pun. Badge mengikuti aturan menyala yang sama persis
dengan banner — di luar rentang itu sidebar bersih, supaya badge tetap bermakna saat
muncul.

**Dismiss:** banner punya tombol tutup. Flag disimpan di `localStorage` dengan kunci
`deskra_uk_reminder_dismiss` berisi `{ "<label periode>": "<tanggal ISO>" }`. Banner
muncul lagi keesokan harinya karena tanggalnya tidak lagi cocok. Badge sidebar **tidak**
terpengaruh dismiss — tetap menyala. Flag ini bukan data sensitif, jadi tidak melanggar
larangan menyimpan data sensitif di `localStorage`.

### 4. `UangKerjaReminderProvider` (baru)

`computeTotalUK` menjalankan **9 query per periode** lewat `buildRows`. Dashboard saat ini
sudah menjalankan 45 query untuk menghitung 5 periode. Badge ada di `Layout` yang hidup di
setiap halaman, jadi perhitungan tidak boleh diulang per halaman.

Provider dipasang di `src/App.jsx` membungkus `<Layout />`, sekali fetch per sesi:

1. Hitung window berjalan dan window sebelumnya dari tanggal — murni, tanpa query
2. Satu query ringan ke `tabel_periode` yang mengambil kedua window sekaligus
3. `computeTotalUK` dijalankan **hanya** untuk window yang row-nya ditemukan
4. Refetch saat `tpkId` berubah
5. Mengekspos `refresh()` yang dipanggil MainLink setelah membuat periode atau menyimpan
   data, agar badge langsung padam tanpa reload

Pencocokan row ke window dilakukan lewat `tgl_awal`, dengan fallback ke kecocokan `label`
bila `tgl_awal` bernilai null (kolomnya nullable).

Kolom `tabel_periode.total_uk` **tidak dipakai**. Kolom itu mati — isinya `0` untuk
seluruh 12 baris yang ada, tidak pernah dimutakhirkan oleh kode mana pun. Total selalu
dihitung ulang lewat `computeTotalUK`. Kolomnya tidak disentuh dan tidak dihapus dalam
pekerjaan ini.

### 5. Perubahan Dashboard

Panel periode berjalan disisipkan di atas tabel history yang sudah ada, di dalam section
`History Uang Kerja`. Tabel 5 periode terakhir tetap seperti sekarang, tidak diubah.

Dashboard mengonsumsi provider, tidak melakukan query sendiri untuk panel ini. Perhitungan
`total_uk` untuk tabel history yang sudah ada tetap berjalan seperti semula.

Styling mengikuti pola halaman dark-themed: inline style dengan warna hardcoded, sesuai
isi file Dashboard saat ini. Versi mobile memakai `useIsMobile` yang sudah ada.

## Penanganan Error

Kegagalan query di provider tidak boleh merusak Dashboard maupun Layout. Bila fetch gagal,
provider mengembalikan `current: null`, `previous: 'none'` dan `reminderAktif: false` —
panel dan badge tidak tampil, sisa Dashboard berjalan normal. Error dicatat agar bisa
ditampilkan bila diperlukan, tapi tidak memunculkan Toast karena ini pemuatan latar, bukan
hasil aksi user.

## Pengujian

`src/lib/periodeBerjalan.test.js` dengan `node --test`, mencakup:

- Window paruh I dan paruh II
- Batas tanggal 15 dan 16
- Akhir bulan 28/29/30/31, termasuk Februari kabisat dan non-kabisat
- `getPeriodeSebelumnya` melintasi pergantian tahun (I/1 → II/12 tahun sebelumnya)
- `hariTersisa` pada H-3, H-1, H-0
- Tiap cabang sumbu `current`: `missing`, `noData`, `onTrack`
- Tiap cabang sumbu `previous`: `archived`, `overdue`, `none`
- Flag `empty` menang atas kedua sumbu
- Kombinasi dua sumbu yang bisa terjadi bersamaan, misalnya `previous: overdue` +
  `current: missing`
- `reminderAktif` menyala pada `overdue` dan padam pada `onTrack` maupun `archived`
- Label yang dihasilkan identik dengan format MainLink (`II/10 / 2026`)

Hanya file ini yang dites, sesuai preferensi menjalankan test terbatas pada file terkait.

## Di Luar Lingkup

- Notifikasi browser (Web Notification API) dan push saat app tertutup
- Tabel notifikasi di database
- Pembuatan periode otomatis
- Membereskan kolom mati `tabel_periode.total_uk`

## Verifikasi Perilaku Hari Ini

Dengan data nyata per 20 Oktober 2026:

- Window berjalan `II/10 / 2026` (16–31 Okt), row belum ada → `current: missing`
- Sisa 11 hari ke 31 Okt → di luar rentang H-3 → banner dan badge **mati**
- Periode sebelumnya `I/10 / 2026` punya data fisik nyata (9 tumpuk kapling, 2 tanda laku,
  1 barcode) → total UK > 0 dan sudah lewat `tgl_akhir` → `previous: archived`

Hasilnya: panel memberi tahu periode berjalan belum dibuat, periode lalu ditandai sudah
terarsip, dan tidak ada alarm yang berbunyi sebelum waktunya.
