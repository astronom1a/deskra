# Design: Import DKHP dari Excel (.xlsx)

**Tanggal:** 2026-05-17  
**File utama:** `src/pages/RegisterKapling.jsx`  
**Scope:** Ganti import PDF DKHP → import Excel (.xlsx), multi-file, same preview/save flow

---

## Latar Belakang

Import DKHP sebelumnya menggunakan PDF dengan regex parsing. Diganti ke Excel (.xlsx) karena format Excel sudah terstandar (DKHP 271, DKHP 314, dst.) dan lebih reliable dibanding text extraction dari PDF.

---

## Struktur File Excel DKHP

| Row index | Konten |
|---|---|
| 0 | Kosong |
| 1 | Nama perusahaan + "Lampiran" |
| 2 | "Lembar Ke :" |
| 4–5 | Judul dokumen |
| **6** | **`"Nomor : 2631602.00271"` → extract nomor DKHP** |
| 7–8 | Provinsi, Kabupaten |
| 9–11 | Header kolom |
| **12+** | **Data rows** |

**Kolom data (0-indexed):**

| Col | Nama | Contoh AIII | Contoh AI/AII |
|---|---|---|---|
| 0 | No (urut) | `1` | `1` |
| 1 | No Kapling | `2621302000895` | `2621302001864` |
| 2 | No Batang | `26213020000022E0331103` | *(kosong)* |
| 3 | Jenis Kayu | `JATI Tectona Grandis` | `JATI Tectona Grandis` |
| 4 | Sort | `AIII` | `AI` / `AII` |
| 5 | Kelompok Jenis | `JATI` | `JATI` |
| 6 | Panjang (M) | `2.4` | `"3.10/3.20"` |
| 7 | Diameter (CM) | `39` | `"14/14"` atau Date object |
| 8 | Jumlah BTG | `1` | `3` |
| 9 | Volume (M3) | `0.29` | `0.29` |
| 10 | Keterangan | Asal Kayu, dst. | Asal Kayu, dst. |

**Deteksi data row:** `col[0]` adalah angka non-null. Semua baris "Total AI", "Total AII", "Total JATI", "Total" memiliki `col[0] = null` → otomatis terlewati.

---

## Klasifikasi Sortimen

| Sortimen | Diameter | No Batang | Panjang | Jumlah BTG/row |
|---|---|---|---|---|
| **AI** | 10–19 cm | Tidak ada | Range `"3.10-3.20"` | Bisa > 1 |
| **AII** | 20–29 cm | Tidak ada | Range `"3.10-3.20"` | Bisa > 1 |
| **AIII** | 30+ cm | **Ada, unik per baris** | Single `2.4` | Selalu 1 |

> AIII selalu memiliki DKHP tersendiri (tidak pernah mix dengan AI/AII dalam satu file).

---

## Normalisasi Field Range (AI & AII)

Semua separator distandarisasi ke **dash `-`**:

### Panjang (col 6) — AI & AII
```
"3.10/3.20" → "3.10-3.20"
```
Cukup replace `"/"` → `"-"`.

### Diameter (col 7) — AI saja (range 10–19)
Excel sering salah baca range seperti `"12/11"` sebagai Date object karena valid sebagai tanggal.

```
jika nilai adalah Date object:
    bulan = date.getMonth() + 1
    hari  = date.getDate()
    hasil = `${bulan}-${hari}`     // "12-11"
jika nilai adalah string:
    replace "/" → "-"              // "14/14" → "14-14"
```

### Diameter (col 7) — AII (range 20–29)
Nilai seperti `"21/26"` tidak valid sebagai tanggal → tidak pernah salah baca.
Cukup replace `"/"` → `"-"`.

### AIII
Diameter adalah integer tunggal per batang → tidak ada range, tidak ada konversi.

---

## Alur Parsing per File

```
1. Extract nomor DKHP
   - Row index 6, col 0
   - Regex: /2631602[.\s]*(\d+)/
   - Hasil: string integer, e.g. "271"

2. Ambil semua data rows
   - Filter: col[0] adalah angka (Number.isFinite)
   - Hasil: array of raw row objects

3. Deteksi sortimen
   - Kumpulkan unique values dari col[4] (Sort)
   - Jika ada "AIII" → mode AIII
   - Jika ada "AI" dan/atau "AII" → mode AI/AII

4. Extract kapling numbers
   - Semua unique values dari col[1]
   - Match ke data kapling yang ada di DB

5. Conflict check
   - Kapling yang sudah punya `dkhp` berbeda dari nomor ini → masuk array `conflicts`
   - Ditampilkan ke user di preview modal untuk di-review

6. Jika mode AIII:
   - Tiap baris → { no_kapling, no_batang, panjang, diameter, volume }
   - 1 kapling bisa muncul di banyak baris (banyak batang)
   - Simpan ke tabel_batang_aiii

7. Jika mode AI/AII:
   - Tiap baris → { no_kapling, panjang (normalized), diameter (normalized), jumlah_btg, volume }
   - Tidak ada penyimpanan ke tabel_batang_aiii
   - Hanya update no_dkhp di tabel_register_kapling
```

---

## Perubahan Kode

### 1. Hapus dependency pdfjs-dist
- Hapus `import * as pdfjsLib from 'pdfjs-dist'` (baris 5)
- Hapus `pdfjsLib.GlobalWorkerOptions.workerSrc = ...` (baris 14–16)

### 2. Ganti `handleDkhpImportFiles`
- Dynamic import SheetJS slim: `const XLSX = await import('xlsx/xlsx.mjs')`
- Implementasi parsing sesuai alur di atas
- Output shape identik dengan PDF lama → `handleDkhpImportSave` tidak perlu diubah

### 3. UI — perubahan minimal
| Element | Sebelum | Sesudah |
|---|---|---|
| `<input accept>` | `.pdf` | `.xlsx` |
| Button title | `"Import DKHP dari PDF"` | `"Import DKHP dari Excel"` |
| Error message | `"Gagal membaca PDF"` | `"Gagal membaca Excel"` |
| Toast kosong | `"Tidak ada PDF DKHP..."` | `"Tidak ada file Excel DKHP..."` |

### 4. Tidak berubah
- `handleDkhpImportSave` — logika save ke DB tetap sama
- Preview modal — struktur `dkhpImportPreview` tetap sama
- `tabel_batang_aiii` upsert logic — tetap sama

---

## Install Dependency

```bash
npm install xlsx
```

SheetJS slim build (`xlsx/xlsx.mjs`) di-import secara dynamic hanya saat user klik tombol import — zero impact pada initial bundle size.

---

## Error Handling

| Kondisi | Pesan |
|---|---|
| File tidak bisa dibaca | `"Gagal membaca Excel"` → masuk array `errors` |
| Nomor DKHP tidak ditemukan | `"Nomor DKHP tidak ditemukan"` → masuk array `errors` |
| Tidak ada data row valid | `"Tidak ada data kayu ditemukan"` → masuk array `errors` |
| Semua file error | Toast: `"Tidak ada file Excel DKHP yang bisa dibaca"` |
| Kapling konflik | Tampil di preview modal untuk user review |
