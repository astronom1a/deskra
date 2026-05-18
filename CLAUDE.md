# Deskra — Panduan AI Agent

Panduan ini berlaku untuk semua AI agent yang bekerja di repository ini.
File lain (`AGENTS.md`, `GEMINI.md`, `.cursorrules`) merujuk ke sini sebagai sumber tunggal kebenaran.

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 18 + Vite 5 |
| Routing | React Router v6 |
| Styling | Tailwind CSS v3 |
| Backend/DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth + custom `AuthProvider` |
| Deploy | Vercel (SPA, `vercel.json`) |
| Language | **Plain JS/JSX — tidak ada TypeScript** |
| Test | Node.js built-in test runner (`node --test`) |

---

## Konvensi Kode

### Umum
- Bahasa komentar dan pesan UI: **Bahasa Indonesia**
- Bahasa identifier (variabel, fungsi, props): **camelCase** Bahasa Inggris
- Nama komponen React: **PascalCase**
- Nama file komponen: **PascalCase** (`RegisterKapling.jsx`)
- Nama file utility/lib: **camelCase** (`tenantScope.js`)
- Tidak ada TypeScript — jangan tambahkan `.ts`/`.tsx` atau JSDoc type annotation

### Struktur Folder
```
src/
  components/
    ui/               # Komponen UI atomik (Toast, ConfirmDialog, LoadingState, ThemedSelect)
    layout/           # Komponen layout (Layout, PageTransition, TpkRequiredState)
  lib/
    hooks/            # Custom hooks global (useTheme, useAccount)
    ...               # Utility & supabase client (tenantScope.js, supabase.js, dll)
  pages/
    admin/            # Halaman khusus role admin
    Cetak/            # Halaman cetak — lazy-loaded, standalone (tanpa Layout)
    database/         # Halaman master data (DatabasePejabat, DatabaseTarif, DatabaseTenaga)
    dk310/            # Halaman DK-310 + parser (Dk310.jsx, parseDk310.js, dll)
    register-kapling/ # Fitur Register Kapling (lihat pola feature folder di bawah)
    ...               # Halaman sederhana tetap sebagai file tunggal (Dashboard.jsx, dll)
```

Halaman yang kompleks menggunakan **pola feature folder** — satu subfolder per fitur dengan struktur internal:
```
pages/register-kapling/
  index.jsx           # Komponen halaman (orchestrator) — diimport via folder name
  components/         # Sub-komponen display (Table, Toolbar, Header, MetricCards, dll)
  modals/             # Modal (EditModal, DeleteModal, BatchEditModal, dll)
  hooks/              # Hook halaman (useRegisterKaplingPage, useRegisterKaplingTableControls)
  utils/              # Fungsi murni, konstanta, operasi DB (constants, crud, excelImport, dll)
```

Gunakan pola feature folder untuk halaman baru yang memiliki lebih dari ~5 file co-located.

### Komponen & JSX
- Gunakan functional component + hooks, tidak ada class component
- Halaman cetak menggunakan `lazy()` + `<Suspense>` — pertahankan pola ini
- `ProtectedRoute`, `AdminRoute`, `PublicRoute` — jangan bypass, selalu pakai wrapper ini untuk route baru
- Hindari prop drilling lebih dari 2 level — gunakan context (`AuthProvider`, `adminOperatorContext`)

### Styling
- Halaman dan komponen umum (Layout, form, card publik): styling via Tailwind utility class
- Halaman dark-themed (RegisterKapling, DkhpSkshhk, dll): menggunakan inline style dengan warna hardcoded — ini pola yang disengaja, bukan pelanggaran
- Jangan campur kedua pendekatan dalam satu komponen; konsisten dengan pola yang sudah ada di file tersebut
- Tidak ada CSS module
- Responsive: prioritaskan mobile-first (`sm:`, `md:`, `lg:`) — hanya berlaku untuk halaman yang memang responsif

### State & Side Effects
- Data fetching langsung di komponen dengan `useEffect` + `useState` (tidak ada React Query)
- Jangan tambahkan library state management baru tanpa diskusi
- Gunakan `useCallback`/`useMemo` hanya jika ada masalah performa nyata

---

## Workflow Git & Versi

### Sebelum Push
1. **Wajib update versi** di `package.json` (format `vX.Y.Z`, SemVer):
   - `patch` (Z): bugfix
   - `minor` (Y): fitur baru, perubahan UI
   - `major` (X): breaking change atau restrukturisasi besar
2. Commit perubahan dengan format di bawah, lalu push

### Commit Message
```
<type>: <deskripsi singkat>

# contoh:
feat: tambah filter tanggal di RegisterKapling
fix: koreksi kalkulasi biaya TPK saat periode kosong
refactor: pisah logika sort ke registerKaplingSort.js
chore: bump versi ke v0.34.0
```

- Tipe: `feat`, `fix`, `refactor`, `style`, `docs`, `chore`
- Deskripsi singkat, imperatif, Bahasa Indonesia
- Version bump menggunakan tipe `chore`: `chore: bump versi ke vX.Y.Z`

### Branch
- Branch utama: `main` — deploy otomatis ke Vercel production
- Tidak perlu branch terpisah untuk perubahan kecil

---

## Supabase & Database

### Client
- Satu instance di `src/lib/supabase.js` — jangan buat client baru
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — diakses via `import.meta.env`

### Query
- Selalu chain `.select()` dengan kolom spesifik — hindari `.select('*')` di tabel besar
- Gunakan `.eq('tpk_id', activeTpkId)` untuk tenant scoping — lihat `src/lib/tenantScope.js`
- Error handling: cek `{ data, error }` dari setiap query, tampilkan pesan ke user via `Toast`

### Keamanan
- **Jangan pernah** menyimpan data sensitif di `localStorage` — gunakan Supabase session
- RLS (Row Level Security) aktif di semua tabel — jangan matikan RLS saat debugging
- Semua operasi data harus melalui Supabase client, tidak ada direct SQL dari frontend

### Migrasi
- File migrasi di `supabase/migrations/`
- Jalankan via `npm run migrate` (menggunakan `migrate.js`)
- Verifikasi hasil migrasi di local/staging sebelum production — bukan `npm test`, tapi cek manual di Supabase dashboard atau SQL editor

---

## Panduan UI/UX

### Komponen UI
- Gunakan `lucide-react` untuk ikon — sudah terinstall, konsisten di seluruh app
- Toast/notifikasi: gunakan `src/components/ui/Toast.jsx` — jangan `alert()` atau `console.log` untuk feedback user
- Loading state: gunakan `PageLoader` atau `LoadingState` dari `src/components/ui/LoadingState.js`
- Konfirmasi destruktif: gunakan `ConfirmDialog` dari `src/components/ui/ConfirmDialog.jsx`

### Tabel & Data
- Tabel menggunakan lebar kolom minimal (`width: 1%` / `w-px`) untuk kolom status/badge agar tidak membuat row wrap
- Semua sel tabel harus vertically centered
- Angka uang: format dengan pemisah ribuan (`toLocaleString('id-ID')`)

### Tema
- Dua tema: light dan dark, diatur via `useTheme` hook (`src/lib/hooks/useTheme.js`)
- Komponen Tailwind: jangan hardcode warna — pakai class `dark:` agar tema berfungsi
- Halaman dark-themed (inline style): warna boleh hardcoded karena selalu gelap — tidak perlu `dark:` class
- Transisi halaman: gunakan `PageTransition` component

### Halaman Cetak
- Halaman di `src/pages/Cetak/` tidak menggunakan `Layout` — standalone
- Ukuran kertas: A4 portrait (`@page { size: A4 portrait }`) kecuali ada kebutuhan lain
- Tidak ada interaksi (button, form) di halaman cetak — pure read-only

---

## Hal yang Jangan Dilakukan

- Jangan tambahkan TypeScript atau ubah extension ke `.ts`/`.tsx`
- Jangan buat file README atau dokumentasi kecuali diminta eksplisit
- Jangan tambahkan library baru tanpa konfirmasi (bundle size sensitif)
- Jangan skip RLS atau hardcode `anon key` di tempat lain
- Jangan gunakan `alert()`, `confirm()`, atau `prompt()` — pakai komponen dialog
- Jangan push ke `main` tanpa update versi di `package.json`
- Jangan tambahkan error handling untuk skenario yang tidak mungkin terjadi
- Jangan tambahkan komentar yang hanya menjelaskan apa kode itu lakukan — hanya komentar WHY
- Jangan jalankan test (`npm test`, `node --test`, atau sejenisnya) kecuali diminta eksplisit oleh user atau saat menambahkan fitur baru

---

## Environment Variables

```env
VITE_SUPABASE_URL=        # URL project Supabase
VITE_SUPABASE_ANON_KEY=   # Public anon key Supabase
```

Di Vercel: diatur via dashboard → Project Settings → Environment Variables.
Jangan commit `.env` ke git (sudah ada di `.gitignore`).
