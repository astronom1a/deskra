# Design: Multi-TPK Authentication & Admin Panel

**Tanggal:** 2026-05-04
**Status:** Approved — diperbarui 2026-05-11

## Ringkasan

Memperluas Deskra dari single-tenant (satu TPK hardcoded) menjadi multi-tenant — banyak TPK bisa memakai satu instance aplikasi dengan data yang terisolasi per TPK. Ditambah admin panel untuk superadmin yang bisa mengelola semua akun dan data TPK.

---

## 1. Data Model

### Tabel Baru

#### `tabel_tpk`
Master data TPK yang terdaftar di sistem.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `nama_tpk` | text NOT NULL | Nama TPK (cth. "Wongsorejo") |
| `kode_tpk` | char(7) | 7 digit angka, CHECK `^\d{7}$` |
| `aktif` | boolean | Default `true` |
| `created_at` | timestamptz | Default `now()` |

#### `profiles`
Jembatan antara Supabase Auth user dan TPK. Dibuat otomatis saat user dibuat.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | uuid PK | FK → `auth.users.id` |
| `tpk_id` | uuid nullable | FK → `tabel_tpk.id` (null untuk admin) |
| `role` | text | `'operator'` atau `'admin'` |
| `nama_operator` | text | Nama operator, bisa diedit sendiri |
| `created_at` | timestamptz | Default `now()` |

### Perubahan Tabel Existing

Kolom `tpk_id uuid NOT NULL FK → tabel_tpk.id` ditambahkan ke semua tabel operasional:

- `tabel_pejabat`
- `tabel_tarif`
- `tabel_tarif_periode`
- `tabel_periode`
- `tabel_pekerjaan`
- `tabel_tumpuk_kapling`
- `tabel_tumpuk_brongkol`
- `tabel_tanda_laku`
- `tabel_pemasangan_barcode`
- `tabel_tenaga_bantu`
- `tabel_tenaga_kerja`
- `tabel_kebersihan`
- `tabel_listrik`
- `tabel_custom_item`
- `tabel_dkhp_skshhk`
- `tabel_register_kapling` (dibuat via dashboard, bukan migration)

### Row Level Security (RLS)

Helper function di Postgres:
```sql
create function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  )
$$ language sql security definer;

create function my_tpk_id() returns uuid as $$
  select tpk_id from profiles where id = auth.uid()
$$ language sql security definer;
```

Policy template untuk setiap tabel operasional:
```sql
-- Operator hanya bisa akses data TPK sendiri
create policy "operator_access" on tabel_* for all
  using (tpk_id = my_tpk_id() or is_admin());

-- Admin bisa akses semua
-- (sudah tercakup di policy di atas via is_admin())
```

---

## 2. Authentication & Frontend Auth

### Alur Login

- Semua route yang memerlukan auth redirect ke `/login` jika `session === null`
- `/login` redirect ke `/dashboard` jika sudah login
- Setelah login, cek `profiles.role`:
  - `operator` → redirect `/dashboard`
  - `admin` → redirect `/admin`

### `AuthProvider` (React Context)

Context baru yang menggantikan `useAccount()` untuk data identitas:

```js
{
  session,        // Supabase Auth session
  profile,        // row dari tabel profiles { role, tpk_id, nama_operator }
  tpk,            // row dari tabel_tpk { nama_tpk, kode_tpk }
  isAdmin,        // shorthand profile.role === 'admin'
  activeTpkId,    // dipakai admin saat masuk context TPK tertentu
  setActiveTpkId, // admin set saat buka /admin/tpk/:id
  signOut,
}
```

Semua query Supabase di halaman operasional menggunakan `activeTpkId` (untuk admin yang sedang masuk context TPK) atau `tpk.id` (untuk operator biasa). RLS Supabase tetap jadi safety net.

### Perubahan `useAccount`

`useAccount()` dihapus. Identitas TPK (nama, kode) tidak lagi dari localStorage — diambil dari `AuthProvider` yang sumber datanya adalah database.

### Perubahan Settings

Field **Nama TPK** dan **Kode TPK** dihapus dari halaman Settings (hanya bisa diubah admin). Yang tersisa:
- **Nama Operator** — edit sendiri, disimpan ke `profiles.nama_operator`
- **Toggle Tema** — tetap di localStorage

---

## 3. Routing

```
/login                     publik — form email + password
/dashboard                 operator + admin
/main-link                 operator + admin
/register-kapling          operator + admin
/dkhp-skshhk               operator + admin
/tumpuk-kapling            operator + admin
/detail-pekerjaan          operator + admin
/database/pejabat          operator + admin
/database/tenaga           operator + admin
/database/tarif            operator + admin
/settings                  operator + admin
/cetak/*                   operator + admin

/admin                     admin only → redirect /dashboard jika operator
/admin/tpk                 daftar semua TPK
/admin/tpk/buat            form buat akun TPK baru
/admin/tpk/:id             detail TPK — 3 tab: Info, Data, Akun
```

### Sidebar

`Layout.jsx` menampilkan sidebar berbeda berdasarkan role:
- **Operator** → sidebar existing (tidak berubah)
- **Admin** → sidebar admin: Dashboard Admin, Manajemen TPK

---

## 4. Admin Panel

### `/admin` — Dashboard Admin

- Jumlah TPK terdaftar (aktif / nonaktif)
- Total UK kumulatif seluruh TPK
- Tabel semua TPK: Nama TPK | Kode | Operator | Periode | Total UK | Status
- Animasi ScrambleNumber pada stat card (GSAP)

### `/admin/tpk` — Daftar TPK

Tabel: Nama TPK | Kode | Operator | Periode | Total UK | Status | →

Tombol **"+ Tambah TPK"** di kanan atas → navigasi ke `/admin/tpk/buat`.

### `/admin/tpk/buat` — Buat Akun TPK Baru

Form input:
- Nama TPK
- Kode TPK (7 digit angka)
- Email login
- Password awal

Proses: admin submit → call Supabase Edge Function `create-tpk-user` → Edge Function buat Supabase Auth user (pakai service role) + insert `tabel_tpk` + insert `profiles`.

### `/admin/tpk/:id` — Detail TPK

Tiga tab:

**Tab Info:**
- Edit nama TPK, kode TPK
- Toggle aktif/nonaktif

**Tab Data:**
- Menampilkan shortcut ke semua halaman operasional (Main Link, Register Kapling, Tumpuk Kapling, dll)
- Saat admin klik shortcut, `activeTpkId` di-set ke ID TPK ini, lalu admin dinavigasi ke halaman operator yang bersangkutan (misal `/main-link`)
- Halaman operator merender data TPK tersebut — tidak ada UI baru, yang berubah hanya `activeTpkId` di context
- Banner kecil muncul di sidebar saat admin sedang dalam "mode context TPK" (misal "Anda melihat data TPK Wongsorejo") dengan tombol kembali ke admin panel
- Full CRUD tersedia — admin bisa tambah/edit/hapus data layaknya operator TPK tersebut

**Tab Akun:**
- Ambil semua email operator TPK via RPC `get_tpk_user_emails(p_tpk_id)` (returns `TABLE(user_id uuid, email text)`)
- Setiap email ditampilkan dalam satu baris dengan tombol **Reset Password** inline di sampingnya
- Mendukung multiple operator per TPK — setiap baris punya state reset independen
- Tombol reset memanggil `supabase.auth.resetPasswordForEmail(email)`; setelah terkirim, tombol diganti label "Terkirim"

---

## 5. Database Functions (RPC)

Fungsi Postgres dengan `SECURITY DEFINER` agar client (anon key) bisa mengakses `auth.users` secara terbatas.

### `get_tpk_user_emails(p_tpk_id uuid)`

```sql
RETURNS TABLE(user_id UUID, email TEXT)
LANGUAGE SQL SECURITY DEFINER
```

Mengembalikan semua pasangan `(user_id, email)` operator yang terdaftar untuk TPK tersebut, diurutkan `created_at`. Hanya bisa dipanggil user `authenticated`.

Dipanggil dari: `AdminTpkDetail.jsx` tab Akun → `supabase.rpc('get_tpk_user_emails', { p_tpk_id: id })`.

---

## 7. Edge Function

### `create-tpk-user`

Dipanggil dari admin panel saat membuat TPK baru. Berjalan server-side dengan service role key.

Input (JSON body):
```json
{
  "nama_tpk": "string",
  "kode_tpk": "string",
  "email": "string",
  "password": "string"
}
```

Langkah:
1. Validasi input (kode_tpk harus 7 digit angka, email valid)
2. Insert `tabel_tpk` → dapat `tpk_id`
3. Buat Supabase Auth user dengan email + password
4. Insert `profiles` dengan `role = 'operator'` + `tpk_id`
5. Return sukses atau error

Authorization: hanya bisa dipanggil user dengan role admin (cek JWT di header).

---

## 8. Migration Strategy

### File Migration Baru

Satu file migration SQL yang dijalankan setelah semua file existing:
`supabase/migrations/20260504000000_multi_tpk_auth.sql`

Urutan eksekusi:
1. Buat `tabel_tpk`
2. Insert TPK Wongsorejo → simpan UUID-nya ke variable
3. Buat `profiles`
4. Tambah kolom `tpk_id` nullable ke semua tabel operasional
5. Backfill: `UPDATE tabel_* SET tpk_id = <wongsorejo_uuid>`
6. Set `tpk_id` menjadi NOT NULL
7. Enable RLS pada semua tabel operasional
8. Buat helper functions `is_admin()` dan `my_tpk_id()`
9. Buat RLS policies untuk semua tabel

### Setup Awal Setelah Deploy

1. Jalankan migration di Supabase dashboard
2. Deploy Edge Function `create-tpk-user` via Supabase CLI
3. Buat akun admin manual di Supabase Auth dashboard (Authentication → Users → Invite)
4. Insert row di `profiles` secara manual: `{ id: <auth_user_id>, role: 'admin', tpk_id: null }`
5. Login sebagai admin → dari admin panel, buat akun operator untuk TPK Wongsorejo

### Perubahan `.env`

`SUPABASE_SERVICE_ROLE_KEY` dihapus dari `.env` frontend — service role hanya hidup di environment variable Edge Function (server-side). File `.env` hanya menyimpan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.

---

## Ringkasan Perubahan File

| Area | Perubahan |
|---|---|
| `src/lib/supabase.js` | Tambah guard validasi env var — melempar error deskriptif jika `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` tidak di-set (mencegah blank white page di Vercel) |
| `src/main.jsx` | Tambah `ErrorBoundary` class component — menangkap error inisialisasi dan menampilkan pesan di layar alih-alih blank white |
| `src/lib/useAccount.js` | Dihapus, diganti `AuthProvider` |
| `src/lib/useTheme.js` | Tidak berubah |
| `src/lib/AuthProvider.jsx` | Baru — context auth global |
| `src/pages/Login.jsx` | Baru — halaman login |
| `src/pages/Settings.jsx` | Hapus field nama/kode TPK |
| `src/components/Layout.jsx` | Tambah sidebar kondisional per role + auth guard |
| `src/App.jsx` | Tambah route `/login` dan `/admin/*` |
| `src/pages/admin/AdminDashboard.jsx` | Tambah kolom Operator (fetch `profiles`, agregasi per TPK) |
| `src/pages/admin/AdminTpkList.jsx` | Tambah kolom Operator (fetch `profiles`, agregasi per TPK) |
| `src/pages/admin/AdminTpkDetail.jsx` | Tab Akun: fetch email via RPC `get_tpk_user_emails`, layout inline reset per email, support multi-operator |
| `supabase/migrations/20260504000000_multi_tpk_auth.sql` | Baru — migration multi-tenant |
| `supabase/migrations/get_tpk_user_email_rpc.sql` | Baru — RPC `get_tpk_user_email` (v1, single row, deprecated) |
| `supabase/migrations/get_tpk_user_emails_array.sql` | Baru — RPC `get_tpk_user_emails` (v2, multi-row, aktif dipakai) |
| `supabase/functions/create-tpk-user/` | Baru — Edge Function |
| `vercel.json` | Baru — SPA rewrite `/(.*) → /index.html` |
| `.env` | Catatan: `SUPABASE_SERVICE_ROLE_KEY` masih ada di `.env` lokal untuk kebutuhan script migrate; tidak di-commit ke git |
