# Deskra — Office Ecosystem: Design Spec
**Tanggal:** 2026-05-23  
**Status:** Approved  
**Sub-projects:** Audit Trail · User Management · Export Excel

---

## Latar Belakang

Aplikasi Deskra sudah solid sebagai ops tool domain-spesifik (TPK multi-tenant, register kapling, DKHP/SKSHHK, billing periode). Tiga fitur berikut ditambahkan untuk menjadikannya ekosistem kantor internal yang lengkap, diprioritaskan berdasarkan risiko dan impact.

---

## Sub-project 1: Audit Trail

### Tujuan
Mencatat siapa mengubah apa dan kapan, termasuk nilai sebelum dan sesudah perubahan, untuk akuntabilitas data keuangan dan operasional.

### Database

Tabel baru: `tabel_activity_log`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `created_at` | `timestamptz` | Default `now()` |
| `tpk_id` | `uuid` | FK → `tabel_tpk`, NOT NULL |
| `user_id` | `uuid` | FK → `auth.users`, nullable (user bisa dihapus) |
| `nama_operator` | `text` | Snapshot nama saat aksi — tidak berubah jika nama operator diupdate |
| `action` | `text` | `'create'`, `'update'`, atau `'delete'` |
| `entity_type` | `text` | Identifier modul: `'register_kapling'`, `'periode'`, `'tenaga_kerja'`, `'pejabat'` |
| `entity_id` | `uuid` | UUID record yang diubah |
| `entity_label` | `text` | Label human-readable, misal `'RK-001'` atau `'Periode I/5-2026'` |
| `diff` | `jsonb` | Array `[{ field, label, before, after }]` untuk `update`; `null` untuk `create`/`delete` |

**RLS:**
- Operator: SELECT only, hanya log TPK sendiri (`tpk_id = my_tpk_id()`)
- Admin: SELECT all
- INSERT: semua authenticated user (untuk client-side logging)
- UPDATE/DELETE: tidak ada — log bersifat immutable

**Index:** `(tpk_id, created_at DESC)` untuk query halaman log.

### Helper

File baru: `src/lib/activityLog.js`

```js
// Signature
export async function logActivity({ action, entityType, entityId, entityLabel, diff, tpkId, profile })
```

- Async, fire-and-forget — tidak melempar error ke caller (try/catch internal, log ke console jika gagal)
- `diff`: array `[{ field, label, before, after }]`, hanya field yang berubah. `null` untuk create/delete.
- Dipanggil setelah konfirmasi operasi berhasil (setelah `supabase` query sukses)

### UI

Halaman baru: `src/pages/ActivityLog.jsx`  
Route: `/activity-log`  
Akses: semua authenticated user (RLS yang membatasi data yang terlihat)

**Tampilan:**
- Tabel: Waktu | Operator | Aksi (badge create/update/delete) | Modul | Entitas
- Klik baris → expand inline menampilkan diff (tabel field / sebelum / sesudah)
- Filter: rentang tanggal (default 7 hari terakhir) + dropdown modul
- Tidak ada paginasi di v1 — limit 200 baris terbaru

**Modul yang di-log (prioritas pertama):**
1. Register Kapling — create, update, delete
2. Periode — create, delete
3. Tenaga Kerja — create, update, delete
4. Pejabat — create, update, delete

Modul lain (tarif, DKHP) ditambahkan di iterasi berikutnya.

---

## Sub-project 2: User Management — Operator Self-Service

### Tujuan
Operator dapat mengubah nama tampilan dan mereset password sendiri dari dalam aplikasi tanpa perlu bantuan admin atau akses Supabase dashboard.

### Perubahan

**File yang dimodifikasi:** `src/pages/Settings.jsx`

- Hapus seluruh sistem tema: hook `useTheme`, toggle di manapun, dan semua referensinya. Tema dark (yang saat ini aktif) dijadikan satu-satunya tema permanen — tidak ada lagi light mode. Komponen yang sebelumnya pakai `useTheme` di-hardcode ke nilai dark-nya.
- Tambah section baru "Akun Saya" berisi:
  - Field `nama_operator` — pre-filled dari `profile.nama_operator`, simpan via `AuthProvider.updateProfile({ nama_operator })`
  - Tombol "Kirim Link Reset Password" — call `supabase.auth.resetPasswordForEmail(session.user.email)`, konfirmasi via Toast
  - Info read-only: email, role, nama TPK

**Tidak ada perubahan database atau route baru.** Semua fungsionalitas sudah tersedia di `AuthProvider.updateProfile()` dan Supabase Auth.

### Catatan Implementasi
- `updateProfile` sudah ada di `AuthProvider` dan sudah update local state
- Reset password via email sudah di-support Supabase Auth out of the box
- Section ini tampil untuk semua role (operator dan admin)

---

## Sub-project 3: Export Excel

### Tujuan
User dapat mengunduh data tabular ke file Excel dari modul yang paling sering dilaporkan.

### Register Kapling

**Entrypoint:** Tombol "Export Excel" di toolbar `RegisterKaplingToolbar.jsx`, sejajar dengan tombol Import yang sudah ada.

**File baru:** `src/pages/register-kapling/utils/registerKaplingExcelExport.js`

```js
// Signature
export function exportRegisterKaplingToExcel({ rows, tpkName })
```

- Mengekspor baris yang sedang tampil (setelah filter/sort aktif — bukan seluruh database)
- Kolom: semua kolom yang ada di data (bukan hanya kolom yang visible di UI — column settings tidak mempengaruhi export)
- Nama file: `register-kapling-[kode-tpk]-[YYYY-MM-DD].xlsx`
- Menggunakan library `xlsx` yang sudah terinstall

### Rekap Periode (MainLink)

**Entrypoint:** Tombol "Export Excel" di header section tabel pekerjaan di `MainLink.jsx`, aktif hanya ketika periode sudah dipilih.

**Implementasi:** Fungsi export inline di `MainLink.jsx` (tidak perlu file util terpisah karena data sudah ada di state).

- Kolom: No | Uraian | Satuan | Fisik | Tarif | Jumlah
- Nama file: `rekap-[periode]-[kode-tpk].xlsx`
- Menggunakan library `xlsx` yang sudah terinstall

**Tidak ada halaman baru** — export trigger download langsung dari halaman yang sudah ada.

---

## Urutan Implementasi

1. **Audit Trail** — DB migration + helper + integrasi di 4 modul + halaman `/activity-log`
2. **User Management** — modifikasi `Settings.jsx` (hapus tema, tambah section Akun Saya)
3. **Export Excel** — Register Kapling export util + tombol, lalu Rekap Periode

Setiap sub-project independen dan bisa dikerjakan oleh agen terpisah setelah sub-project sebelumnya selesai.

---

## Constraints

- Plain JS/JSX — tidak ada TypeScript
- Tidak ada library baru — `xlsx` sudah ada, Supabase Auth sudah ada
- RLS harus ditambahkan untuk tabel baru (`tabel_activity_log`)
- Commit message Bahasa Indonesia, version bump sebelum push
- Komentar kode hanya jika WHY non-obvious
