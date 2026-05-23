# Design: Database Alamat Bongkar / Tujuan

**Tanggal:** 2026-05-23  
**Fitur baru:** `tabel_alamat_bongkar` + `DatabaseAlamatBongkar.jsx`  
**Integrasi:** `DkhpSkshhk.jsx` (form surat + modal QR)

---

## Ringkasan

Tambah tabel database baru untuk menyimpan alamat bongkar/tujuan yang sering digunakan.
Fitur mencakup:
1. Halaman CRUD standalone untuk mengelola daftar alamat tersimpan
2. Dropdown autofill di form add/edit surat SKSHHK
3. Dropdown + quick-save di modal QR SKSHHK

---

## Skema Database

### Tabel: `tabel_alamat_bongkar`

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | uuid | PK, default gen_random_uuid() | |
| `tpk_id` | uuid | FK → tabel_tpk(id), NOT NULL | Tenant scoping |
| `label` | text | NOT NULL | Nama singkat untuk dropdown, misal "Pak Eko - Kalipuro" |
| `end_user` | text | | Teks end_user untuk field QR |
| `alamat_lengkap` | text | | Teks alamat_bongkar untuk field QR |
| `kota` | text | | Kota/kabupaten, misal "BANYUWANGI" |
| `created_at` | timestamptz | default now() | |

### RLS Policy

Pola sama dengan `tabel_pejabat`:
- **SELECT**: authenticated user, `tpk_id = get_effective_tpk_id()`
- **INSERT**: authenticated user, `tpk_id = get_effective_tpk_id()`
- **UPDATE**: authenticated user, `tpk_id = get_effective_tpk_id()`
- **DELETE**: authenticated user, `tpk_id = get_effective_tpk_id()`

---

## Komponen & Alur Kerja

### 1. Halaman CRUD Standalone

**File:** `src/pages/database/DatabaseAlamatBongkar.jsx`

Mengikuti pola `DatabasePejabat.jsx`:
- **State:** `items` (list), `form` (add/edit), `editId`, `loading`, `saving`, `deleteTarget`
- **Fetch:** `useEffect` saat load, query `tabel_alamat_bongkar` WHERE `tpk_id = tpkId` ORDER BY `label ASC`
- **Tabel:** kolom label, end_user (truncate panjang), alamat_lengkap (truncate), kota, aksi (edit/hapus)
- **Form inline** di bawah tabel: field label (required), end_user, alamat_lengkap (textarea), kota
- **Validasi:** label wajib diisi (cek sebelum submit)
- **Toast** untuk feedback sukses/error
- **ConfirmDialog** untuk konfirmasi hapus
- **Tenant scope:** semua query pakai `requireTpkId(tpkId)`

**Route:** ditambahkan di `MainLink.jsx` dalam grup Database, path `/database/alamat-bongkar`

---

### 2. Integrasi ke Form Surat SKSHHK

Lokasi: form add/edit surat di `DkhpSkshhk.jsx` (dark-themed, inline style)

**Dropdown "Pilih Alamat":**
- `<select>` di atas field tujuan dengan label "Pilih dari database alamat:"
- Opsi default: `"— pilih alamat tersimpan —"` (value kosong)
- Opsi lainnya: `${item.label} — ${item.kota}` untuk setiap item
- Ketika dipilih (onChange): set field `tujuan` ← `item.alamat_lengkap`, set field `kota_tujuan` ← `item.kota`
- Reset ke default setelah autofill (dropdown kembali ke opsi awal)
- Dropdown tidak mengirim data sendiri — hanya trigger pengisian field

**Tombol Quick-save:**
- Ikon bookmark/simpan kecil di samping kanan field tujuan
- Hanya aktif (enabled) jika field tujuan tidak kosong
- Klik → tampilkan mini-modal dengan satu field "Label / nama singkat:" (pre-fill: 10 karakter pertama nilai tujuan + "...")
- Tombol "Simpan" di mini-modal: INSERT ke `tabel_alamat_bongkar` dengan:
  - `label` ← dari input mini-modal
  - `alamat_lengkap` ← nilai tujuan saat ini
  - `kota` ← nilai kota_tujuan saat ini
  - `end_user` ← hasil `deriveEndUser(tujuan, kota_tujuan)` (fungsi yang sudah ada)
  - `tpk_id` ← tpkId aktif
- Toast sukses / error setelah simpan
- Setelah sukses: refresh list alamat (untuk dropdown)

**Fetch list alamat:**
- Dilakukan saat form surat dibuka (`openAddForm()` / `openEditForm()`)
- Disimpan di state `alamatOptions` (lokal di form state, bukan state global halaman)
- Tidak di-fetch saat halaman load

---

### 3. Integrasi ke Modal QR

Lokasi: modal QR di `DkhpSkshhk.jsx`

**Dropdown "Pilih dari database":**
- Di-render di bagian atas form edit modal QR, sebelum field end_user
- Label: "Pilih alamat tersimpan:"
- Opsi: `${item.label}` untuk setiap item
- Ketika dipilih: set `qrForm.endUser` ← `item.end_user`, set `qrForm.alamatBongkar` ← `item.alamat_lengkap`
- Reset ke default setelah autofill
- Fetch bersamaan dengan fetch pejabat saat modal QR dibuka (dalam `useEffect([qrRow, tpkId])`)
- Disimpan di state `alamatOptions` (state baru di komponen)

**Tombol Quick-save:**
- Ikon simpan kecil di samping field alamat bongkar
- Klik → mini-modal dengan field "Label:" (pre-fill: nilai endUser saat ini)
- Simpan: INSERT ke `tabel_alamat_bongkar` dengan:
  - `label` ← dari input mini-modal
  - `end_user` ← `qrForm.endUser`
  - `alamat_lengkap` ← `qrForm.alamatBongkar`
  - `kota` ← `qrRow.kota_tujuan`
  - `tpk_id` ← tpkId
- Toast sukses / error
- Setelah sukses: refresh `alamatOptions`

**Mini-modal (shared pattern):**
- Overlay kecil di dalam modal utama (bukan modal baru yang terpisah)
- Dua tombol: "Simpan" (submit) dan "Batal" (dismiss)
- State: `saveAlamatLabel` (string), `showSaveAlamat` (boolean)

---

## File yang Diubah / Ditambah

| File | Perubahan |
|---|---|
| `src/pages/database/DatabaseAlamatBongkar.jsx` | File baru: halaman CRUD alamat bongkar |
| `src/pages/MainLink.jsx` | Tambah route `/database/alamat-bongkar` → `DatabaseAlamatBongkar` |
| `src/pages/DkhpSkshhk.jsx` | Tambah state `alamatOptions`, dropdown + quick-save di form surat dan modal QR |
| `supabase/migrations/` | File migrasi baru: CREATE TABLE + RLS policy |
| `package.json` | Bump versi (minor) |
| `src/changelog.js` | Entry baru |

---

## Hal yang Tidak Termasuk Scope

- Tidak ada search/filter di halaman CRUD (list alamat per TPK umumnya sedikit)
- Tidak ada pagination (idem)
- Tidak ada deduplikasi otomatis saat quick-save (user bisa simpan duplikat dengan label berbeda)
- Tidak ada edit alamat dari dalam modal QR atau form surat — hanya via halaman CRUD
- Tidak mengubah kolom `tujuan` / `kota_tujuan` di tabel skshhk yang sudah ada
