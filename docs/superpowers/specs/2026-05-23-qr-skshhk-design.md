# Design: QR Code Generator untuk SKSHHK

**Tanggal:** 2026-05-23  
**Halaman:** `DkhpSkshhk.jsx`  
**Library baru:** `qrcode` (npm, ~50KB gzip)

---

## Ringkasan

Tambah fitur generate QR code per baris SKSHHK di halaman DkhpSkshhk. QR code mengenkode data dokumen dalam format standar SVLK, dengan preview modal yang bisa diedit sebelum dicetak. Hasil cetak menampilkan logo SVLK Indonesia, QR code, dan nomor surat.

---

## Format String QR

```
KB.C.[no_skshhk]#PERUM PERHUTANI#[tpk_label]#[end_user]#[alamat_bongkar]#[masa_aktif]#[penerbit]#[tanggal_terbit]
```

**Contoh:**
```
KB.C.7131705#PERUM PERHUTANI#TPK WONGSOREJO,-#END USER KAB. BANYUWANGI#Eko Suswanto, Jl. Joyoboyo RT/RW 001/001, Ds. Kalipuro, Kec. Kalipuro#23-05-2026 s/d 23-05-2026#Totok Subiantoro#23 Mei 2026
```

---

## Mapping Data → Field QR

| Field QR | Sumber Data | Input Modal |
|---|---|---|
| `KB.C.[no_skshhk]` | `row.no_skshhk` | Read-only |
| `PERUM PERHUTANI` | Fixed string | Read-only |
| `[tpk_label]` | `tpkName` (TPK aktif saat ini) | Read-only |
| `[end_user]` | Auto-detect dari `row.tujuan` + `row.kota_tujuan` | Text input (editable) |
| `[alamat_bongkar]` | `row.tujuan` | Textarea (editable) |
| `[masa_aktif]` | Awal: `row.tanggal` (fixed) + input durasi hari → akhir dihitung otomatis | Number input (durasi hari) |
| `[penerbit]` | `tabel_pejabat` WHERE jabatan ILIKE '%penerbit%', ambil `nama` | Text input (editable) |
| `[tanggal_terbit]` | `row.tanggal` diformat `DD Bulan YYYY` | Text input (editable) |

### Logika `end_user`

- Cek apakah `row.tujuan` diawali `PT`, `CV`, atau `UD` (case-insensitive)
- Jika **ya**: pre-fill dengan nama perusahaan (teks awal sebelum koma/titik)
- Jika **tidak**: pre-fill dengan `END USER [row.kota_tujuan]`
- Field tetap bisa diedit manual

### Logika `masa_aktif`

- Tanggal awal = `row.tanggal` (fixed, tidak bisa diubah)
- Input: durasi hari (number, default 1)
- Tanggal akhir = tanggal awal + durasi hari (dihitung di frontend)
- Output format: `dd-mm-yyyy s/d dd-mm-yyyy`

---

## Komponen & Alur Kerja

### Tombol QR di Tabel

- Posisi: kolom aksi per baris, di antara tombol edit dan delete
- Tampilan: ikon QR code (`QrCode` dari lucide-react), warna `rgba(255,255,255,0.3)` saat hover menjadi `#00ff88`
- Behavior: hanya tampil saat hover pada baris (konsisten dengan pola edit/delete yang ada)

### Modal QR Preview

Dibuka saat tombol QR diklik. Struktur:

1. **Header** — "cetak qr skshhk" + tombol tutup (X)
2. **Preview QR** — gambar QR live-update setiap field berubah, ukuran ~200×200px
3. **Form edit** — field yang bisa diedit:
   - End user (text input)
   - Alamat bongkar (textarea)
   - Durasi masa aktif (number input, dalam hari)
   - Penerbit (text input)
   - Tanggal terbit (text input)
4. **Tombol Cetak** — trigger `window.print()`

### Generate QR

- Library: `qrcode` (npm)
- Method: `QRCode.toDataURL(string, options)` → `<img src={dataUrl}>`
- Error correction: level M
- Re-generate via `useEffect` setiap kali form berubah (debounce tidak diperlukan, string pendek)

### Fetch Data Pejabat

- Dilakukan saat modal dibuka (bukan saat halaman load)
- Query: `tabel_pejabat` WHERE `tpk_id = tpkId` AND `aktif = true`
- Filter: cari entry dengan `jabatan` mengandung "penerbit"
- Hasil: pre-fill field penerbit dengan `nama` pejabat tersebut

---

## Layout Cetak (`@media print`)

```
┌─────────────────┐  ← A5 portrait (148mm × 210mm)
│                 │
│   [Logo SVLK]   │  ← ~40% lebar halaman
│  SVLK INDONESIA │
│                 │
│   [QR Code]     │  ← ~60% lebar halaman
│                 │
│  KB.C.7131705   │  ← font ~14pt, monospace
│                 │
└─────────────────┘
```

- Ukuran kertas: A5 portrait (`@page { size: A5 portrait; margin: 16mm }`)
- Logo SVLK disimpan sebagai SVG di `src/assets/svlk-logo.svg`
- Proporsi elemen (dari lebar area cetak ~116mm):
  - Logo SVLK: lebar ~45mm, tinggi proporsional
  - QR code: lebar ~70mm × 70mm
  - Nomor surat: font 14pt, monospace, rata tengah
- Saat print: semua elemen modal disembunyikan kecuali area cetak
- Semua elemen rata tengah secara horizontal

---

## File yang Diubah / Ditambah

| File | Perubahan |
|---|---|
| `src/pages/DkhpSkshhk.jsx` | Tambah state `qrRow`, modal QR, logika generate, tombol per baris |
| `src/assets/svlk-logo.svg` | File baru: logo SVLK Indonesia (SVG) |
| `package.json` | Tambah dependency `qrcode` |

---

## Hal yang Tidak Termasuk Scope

- Tidak menyimpan QR ke database
- Tidak ada halaman cetak terpisah (cukup `window.print()` dari modal)
- Tidak ada kustomisasi warna/ukuran QR
