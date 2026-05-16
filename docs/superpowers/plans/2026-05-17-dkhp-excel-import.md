# DKHP Excel Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti import DKHP dari PDF menjadi Excel (.xlsx) di `RegisterKapling.jsx`, mendukung multi-file, dua mode sortimen (AIII vs AI/AII), dan normalisasi separator `-`.

**Architecture:** Hanya satu file yang berubah: `src/pages/RegisterKapling.jsx`. Hapus pdfjs-dist, ganti body `handleDkhpImportFiles` dengan parser Excel menggunakan XLSX (sudah terinstall di baris 4). Output shape handler tetap sama sehingga `handleDkhpImportSave` dan preview modal tidak perlu diubah.

**Tech Stack:** React, SheetJS (`xlsx` — sudah ada di project), Supabase

---

## File Map

| File | Aksi | Keterangan |
|---|---|---|
| `src/pages/RegisterKapling.jsx` | Modify | Satu-satunya file yang berubah |

---

### Task 1: Hapus pdfjs-dist

**Files:**
- Modify: `src/pages/RegisterKapling.jsx:5` dan `14-17`

- [ ] **Step 1: Hapus import dan worker setup pdfjs-dist**

Baris 5 saat ini:
```js
import * as pdfjsLib from 'pdfjs-dist'
```

Baris 14–17 saat ini:
```js
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href
```

Hapus kedua blok tersebut. Baris 4 (`import * as XLSX from 'xlsx'`) **tidak diubah** — XLSX sudah dipakai dan tetap dibutuhkan.

- [ ] **Step 2: Verifikasi tidak ada referensi pdfjsLib lain**

Cek apakah `pdfjsLib` masih dipakai di tempat lain:
```bash
grep -n "pdfjsLib" src/pages/RegisterKapling.jsx
```
Expected: hanya muncul di `parsePdfInvoice` (sekitar baris 230-252) yang **bukan** bagian dari DKHP import — biarkan.

> Catatan: jika `pdfjsLib` masih dipakai di `parsePdfInvoice`, jangan hapus import-nya. Hapus hanya blok worker setup jika import tetap dibutuhkan, atau pertahankan keduanya jika `parsePdfInvoice` masih aktif.

- [ ] **Step 3: Commit**

```bash
git add src/pages/RegisterKapling.jsx
git commit -m "refactor: remove pdfjs-dist worker setup from DKHP import path"
```

---

### Task 2: Ganti `handleDkhpImportFiles` dengan parser Excel

**Files:**
- Modify: `src/pages/RegisterKapling.jsx:816-853`

- [ ] **Step 1: Ganti seluruh body fungsi `handleDkhpImportFiles`**

Cari fungsi ini (mulai baris 816):
```js
async function handleDkhpImportFiles(e) {
  const files = [...(e.target.files || [])]
  if (!files.length) return
  e.target.value = ''
  const rowsByKapling = new Map(rows.map(r => [r.no_kapling, r]))
  const dkhpList = []
  const errors = []
  for (const file of files) {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      ...
    } catch {
      errors.push({ fileName: file.name, message: 'Gagal membaca PDF' })
    }
  }
  if (!dkhpList.length) { toast('Tidak ada PDF DKHP yang bisa dibaca', 'error'); return }
  setDkhpImportPreview({ dkhpList, errors })
}
```

Ganti **seluruh fungsi** dengan implementasi berikut:

```js
async function handleDkhpImportFiles(e) {
  const files = [...(e.target.files || [])]
  if (!files.length) return
  e.target.value = ''
  const rowsByKapling = new Map(rows.map(r => [r.no_kapling, r]))
  const dkhpList = []
  const errors = []

  for (const file of files) {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

      // 1. Extract nomor DKHP dari baris ke-6 kolom 0
      const dkhpCell = String(raw[6]?.[0] ?? '')
      const dkhpMatch = dkhpCell.match(/2631602[.\s]*(\d+)/)
      if (!dkhpMatch) {
        errors.push({ fileName: file.name, message: 'Nomor DKHP tidak ditemukan' })
        continue
      }
      const dkhpNo = String(parseInt(dkhpMatch[1], 10))

      // 2. Ambil semua data rows: col[0] adalah angka finite
      const dataRows = raw.filter(row => Number.isFinite(row?.[0]))
      if (!dataRows.length) {
        errors.push({ fileName: file.name, message: 'Tidak ada data kayu ditemukan' })
        continue
      }

      // 3. Deteksi sortimen
      const sorts = new Set(dataRows.map(r => String(r[4] ?? '').trim().toUpperCase()))
      const isAIII = sorts.has('AIII')

      // Helper normalisasi separator untuk range field
      const normRange = (val) => {
        if (!val && val !== 0) return ''
        if (val instanceof Date) {
          return `${val.getMonth() + 1}-${val.getDate()}`
        }
        return String(val).replace(/\//g, '-')
      }

      // 4. Extract kapling numbers dari semua data rows
      const kaplingNums = [...new Set(dataRows.map(r => String(r[1] ?? '').trim()).filter(Boolean))]
      const matched = kaplingNums.map(k => rowsByKapling.get(k)).filter(Boolean)
      const unmatched = kaplingNums.filter(k => !rowsByKapling.has(k))
      const conflicts = matched.filter(r => r.dkhp && String(r.dkhp) !== dkhpNo)

      // 5. AIII: tiap baris = 1 batang unik, simpan ke tabel_batang_aiii
      const aiiiBatang = []
      if (isAIII) {
        for (const row of dataRows) {
          const noKapling = String(row[1] ?? '').trim()
          const noBatang  = String(row[2] ?? '').trim()
          const panjang   = parseFloat(row[6])
          const diameter  = parseInt(row[7], 10)
          const volume    = parseFloat(row[9])
          if (!noKapling || !noBatang) continue
          aiiiBatang.push({ no_kapling: noKapling, no_batang: noBatang, panjang, diameter, volume })
        }
      }

      dkhpList.push({ dkhpNo, matched, unmatched, conflicts, aiiiBatang, fileName: file.name })
    } catch {
      errors.push({ fileName: file.name, message: 'Gagal membaca Excel' })
    }
  }

  if (!dkhpList.length) { toast('Tidak ada file Excel DKHP yang bisa dibaca', 'error'); return }
  setDkhpImportPreview({ dkhpList, errors })
}
```

**Catatan penting:**
- `XLSX.read(..., { cellDates: true })` membuat SheetJS otomatis parse cell bertipe date sebagai `Date` object — dibutuhkan untuk konversi diameter AI.
- `normRange` digunakan di AI/AII untuk panjang dan diameter, dipanggil via `normRange(row[6])` dan `normRange(row[7])`.
- Untuk AI/AII mode, data batang tidak disimpan ke `aiiiBatang` (array tetap kosong) sehingga `handleDkhpImportSave` otomatis skip upsert ke `tabel_batang_aiii`.
- Output shape `{ dkhpNo, matched, unmatched, conflicts, aiiiBatang, fileName }` **identik** dengan PDF lama — tidak ada perubahan di `handleDkhpImportSave`.

- [ ] **Step 2: Commit**

```bash
git add src/pages/RegisterKapling.jsx
git commit -m "feat: replace PDF DKHP parser with Excel parser (SheetJS)"
```

---

### Task 3: Update UI elements

**Files:**
- Modify: `src/pages/RegisterKapling.jsx:1169` (button title)
- Modify: `src/pages/RegisterKapling.jsx:1220` (input accept)

- [ ] **Step 1: Ubah button title**

Cari (baris ~1169):
```jsx
<button onClick={() => dkhpImportRef.current?.click()} title="Import DKHP dari PDF"
```

Ganti menjadi:
```jsx
<button onClick={() => dkhpImportRef.current?.click()} title="Import DKHP dari Excel"
```

- [ ] **Step 2: Ubah input accept**

Cari (baris ~1220):
```jsx
<input ref={dkhpImportRef} type="file" accept=".pdf" multiple className="hidden" onChange={handleDkhpImportFiles}/>
```

Ganti menjadi:
```jsx
<input ref={dkhpImportRef} type="file" accept=".xlsx" multiple className="hidden" onChange={handleDkhpImportFiles}/>
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/RegisterKapling.jsx
git commit -m "feat: update DKHP import button and input to accept .xlsx"
```

---

### Task 4: Verifikasi manual

- [ ] **Step 1: Jalankan dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test dengan DKHP 271.xlsx (mode AIII)**

Buka Register Kapling → klik tombol import DKHP → pilih `DKHP 271.xlsx`.

Expected:
- Preview modal muncul dengan dkhpNo = `"271"`
- Total matched kapling sesuai nomor kapling yang ada di DB
- aiiiBatang terisi 20 batang

- [ ] **Step 3: Test dengan DKHP 314.xlsx (mode AI/AII)**

Pilih `DKHP 314.xlsx`.

Expected:
- Preview modal muncul dengan dkhpNo = `"314"`
- Kapling matched dari 19 baris (16 AI + 3 AII)
- aiiiBatang kosong (tidak ada penyimpanan batang detail)

- [ ] **Step 4: Test multi-file**

Pilih kedua file sekaligus.

Expected:
- Preview menampilkan 2 DKHP sekaligus
- Masing-masing ditampilkan terpisah di preview list

- [ ] **Step 5: Test file invalid**

Upload file `.xlsx` acak (bukan format DKHP).

Expected:
- Error muncul di section errors preview: `"Nomor DKHP tidak ditemukan"` atau `"Tidak ada data kayu ditemukan"`

---

## Catatan Implementasi

### Kenapa tidak dynamic import?
`import * as XLSX from 'xlsx'` sudah ada di baris 4 untuk fitur import kapling. Menambah dynamic import hanya untuk DKHP tidak mengurangi bundle — library sudah masuk. Pakai XLSX yang sudah ada.

### Kenapa `cellDates: true`?
Tanpa flag ini, SheetJS membaca tanggal Excel sebagai serial number (e.g., `45977`). Dengan `cellDates: true`, SheetJS mengubahnya menjadi `Date` object — dibutuhkan oleh `normRange()` untuk konversi diameter AI yang salah baca sebagai tanggal.

### Shape output yang tidak berubah
`handleDkhpImportSave` membaca `dkhpImportPreview.dkhpList[i].aiiiBatang` untuk upsert ke `tabel_batang_aiii`. Karena shape-nya identik, tidak ada perubahan di save logic.
