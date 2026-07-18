# Gmail Invois Sync — Design

## Latar belakang

Register Invois butuh no. invois + pembeli untuk tiap baris register kapling.
Sekarang ini diisi lewat 3 jalur: manual per-baris, import Excel (batch), atau
upload PDF kuitansi Perhutani manual (tombol "Invois" di header Register
Kapling → `RegisterKaplingHeader.jsx:41`, parser di
`registerKaplingInvoiceImport.js`).

Kuitansi PDF Perhutani datang otomatis lewat email dari alamat `Toko
Perhutani` (contoh: `kwitansikontrak-potp@perhutani.co.id`,
`kwitansiretail-potp@perhutani.co.id`). User harus download manual dari Gmail
lalu upload ke Deskra. Fitur ini menghilangkan langkah download-manual itu:
tombol "Ambil dari Gmail" di sebelah tombol upload PDF, yang mengambil
lampiran PDF langsung dari Gmail lalu masuk ke alur preview/konfirmasi yang
sudah ada — tanpa mengubah cara parsing atau cara data disimpan sama sekali.

## Keputusan yang sudah disepakati

- **Semi-otomatis**: sinkronisasi jalan saat user klik tombol di app (bukan
  background/cron). Tidak butuh Edge Function terjadwal.
- **Connect sekali, tersimpan**: OAuth Google sekali per TPK, refresh token
  disimpan di Supabase. Klik "Sync Gmail" berikutnya tidak perlu login ulang.
- **Per TPK**: tiap tenant connect akun Gmail-nya sendiri, konsisten dengan
  RLS by `tpk_id` yang sudah ada di seluruh app.
- **Filter by sender**: query Gmail `from:` ke daftar alamat pengirim yang
  diketahui, bukan label/folder.
- **Parsing tetap 100% di browser**: reuse `parsePdfInvoice()` dan seluruh
  alur `prepareInvoiceImportPreview` → `RegisterKaplingInvoicePreview` →
  `saveInvoiceImportPreview` apa adanya. Edge Function hanya jembatan OAuth +
  Gmail API, tidak menyentuh isi PDF.

## Arsitektur

```
[Connect Gmail]                         [Sync Gmail]
     │                                        │
     ▼                                        ▼
Google OAuth consent (popup)         Browser panggil Edge Function
     │ (authorization code)                  "gmail-sync"
     ▼                                        │
Edge Function "gmail-oauth-callback"          ▼
  - tukar code → refresh_token          Edge Function:
  - simpan di tabel_gmail_oauth           - ambil refresh_token dari DB
    (encrypted via service role only)     - mint access_token (refresh)
                                           - Gmail API: list messages
                                             query: from:(...) has:attachment
                                             filename:pdf, exclude message_id
                                             yang sudah ada di tabel_gmail_invois_log
                                           - untuk tiap message baru: ambil
                                             attachment PDF (base64)
                                           - return [{ fileName, base64 }]
                                                │
                                                ▼
                                 Browser: base64 → File object
                                                │
                                                ▼
                          prepareInvoiceImportPreview (KODE YANG SUDAH ADA,
                          tidak diubah) → RegisterKaplingInvoicePreview modal
                                                │
                                                ▼
                          User klik "simpan" → saveInvoiceImportPreview
                          (kode yang sudah ada) + catat message_id yang
                          diproses ke tabel_gmail_invois_log (agar tidak
                          diambil ulang di sync berikutnya)
```

## Skema database baru

```sql
create table tabel_gmail_oauth (
  tpk_id        uuid primary key references tabel_tpk(id),
  email         text not null,           -- alamat Gmail yang di-connect, ditampilkan di UI
  refresh_token text not null,           -- hanya bisa dibaca/ditulis service role (Edge Function)
  connected_at  timestamptz default now(),
  connected_by  uuid references profiles(id)
);
-- RLS: tidak ada policy select/update untuk anon/authenticated — akses
-- HANYA lewat Edge Function pakai service role. Tabel ini tidak pernah
-- di-query langsung dari klien.
alter table tabel_gmail_oauth enable row level security;

create table tabel_gmail_invois_log (
  id          uuid primary key default gen_random_uuid(),
  tpk_id      uuid not null references tabel_tpk(id),
  message_id  text not null,             -- Gmail message ID, dedup key
  no_invois   text,                      -- hasil parse, null kalau gagal parse
  status      text not null,             -- 'imported' | 'skipped' (gagal parse / tidak match kapling)
  created_at  timestamptz default now()
);
create unique index on tabel_gmail_invois_log (tpk_id, message_id);
alter table tabel_gmail_invois_log enable row level security;
create policy rls_gmail_invois_log_select on tabel_gmail_invois_log
  for select using ((tpk_id = my_tpk_id()) or is_admin());
-- insert hanya lewat Edge Function (service role), tidak ada policy insert
-- untuk klien.
```

`tabel_gmail_invois_log` juga dipakai untuk menampilkan riwayat singkat di UI
("12 email diproses, terakhir 17 Juli 15:40").

## Edge Functions baru

Ikut pola `supabase/functions/create-tpk-user/index.ts` yang sudah ada
(Deno.serve, CORS header, verifikasi JWT caller via `callerClient.auth.getUser()`,
service-role client untuk operasi sensitif).

### 1. `gmail-oauth-callback`
- Dipanggil browser setelah redirect dari Google consent screen (membawa
  `?code=...`).
- Verifikasi caller (JWT) → ambil `tpk_id` dari profile.
- Tukar `code` → `{ access_token, refresh_token }` ke Google token endpoint
  (pakai `client_id` + `client_secret` dari env var Edge Function).
- Ambil alamat email akun yang di-connect (Gmail API `userinfo` atau
  `users.getProfile`) untuk ditampilkan di UI.
- Upsert ke `tabel_gmail_oauth` (service role).
- Google **hanya mengirim refresh_token pada authorization pertama kali**
  kecuali request pakai `prompt=consent` — frontend wajib selalu sertakan
  `prompt=consent&access_type=offline` di URL consent supaya reconnect
  (ganti akun) tetap dapat refresh_token baru.

### 2. `gmail-sync`
- Verifikasi caller (JWT) → ambil `tpk_id`.
- Ambil `refresh_token` dari `tabel_gmail_oauth` (kalau tidak ada →
  400 "Gmail belum terhubung").
- Mint `access_token` baru dari refresh_token (Google token endpoint,
  `grant_type=refresh_token`).
- Gmail API `messages.list` dengan query:
  `from:(kwitansikontrak-potp@perhutani.co.id OR kwitansiretail-potp@perhutani.co.id) has:attachment filename:pdf`
- Filter keluar `message_id` yang sudah ada di `tabel_gmail_invois_log` untuk
  `tpk_id` ini.
- Untuk tiap message baru (batasi mis. 30 per sync supaya tidak timeout):
  ambil attachment PDF via `messages.attachments.get`, encode base64.
- Return `{ files: [{ fileName, base64 }], skippedCount }` ke browser.
- Tidak menulis ke `tabel_gmail_invois_log` di sini — pencatatan terjadi
  setelah user benar-benar klik "simpan" di preview (lihat bawah), supaya
  email yang di-fetch tapi dibatalkan usernya tetap muncul di sync berikutnya.

## Perubahan kode frontend

### Constants: alamat pengirim
Daftar sender di-hardcode sebagai konstanta (pola sama seperti
`INVOIS_PREFIX_MAP` di `registerKaplingConstants.js`), bukan tabel config —
ini cuma berubah kalau Perhutani ganti alamat pengirim, dan itu perubahan
kode biasa:
```js
// registerKaplingConstants.js
export const GMAIL_INVOIS_SENDERS = [
  'kwitansikontrak-potp@perhutani.co.id',
  'kwitansiretail-potp@perhutani.co.id',
]
```

### `registerKaplingInvoiceImport.js` — fungsi baru
```js
export function base64PdfToFile(fileName, base64) {
  // decode base64 → Uint8Array → new File([bytes], fileName, { type: 'application/pdf' })
}
```
Dipakai untuk mengubah hasil Edge Function jadi `File` object, supaya
langsung kompatibel dengan `parsePdfInvoice(file)` yang sudah ada tanpa
modifikasi.

### `useRegisterKaplingPage.js` — hook baru
```js
async function handleGmailSync() {
  // 1. panggil Edge Function gmail-sync
  // 2. kalau files.length === 0 → toast "tidak ada invois baru"
  // 3. ubah base64 → File[] (base64PdfToFile)
  // 4. panggil prepareInvoiceImportPreview (SAMA PERSIS seperti upload manual)
  // 5. setInvoisPreview(preview) → modal existing muncul
}
```
`handleInvoisSave` (existing) ditambah satu langkah: setelah
`saveInvoiceImportPreview` sukses, insert baris ke `tabel_gmail_invois_log`
untuk tiap message_id yang barusan diproses (butuh preview membawa
`messageId` per invoice — ditambahkan di `summarizeInvoiceParseResult`).

### UI
- **`RegisterKaplingHeader.jsx`**: tombol baru "Sync Gmail" di sebelah
  tombol "Invois" existing (baris 41). Kalau belum connect → tombol jadi
  "Connect Gmail" yang membuka popup OAuth Google. Status connect
  (email yang terhubung) diambil sekali saat halaman load lewat query kecil
  read-only (perlu 1 policy select tambahan yang cuma expose `email` +
  `connected_at`, TIDAK `refresh_token` — lihat catatan RLS di bawah).
- Loading state dan error pakai `Toast` yang sudah ada, konsisten dengan pola
  di `TabInvois.jsx`.

### Catatan RLS tambahan
`tabel_gmail_oauth` tidak boleh punya policy select untuk klien karena kolom
`refresh_token` sensitif. Supaya UI bisa menampilkan "terhubung sebagai
xxx@gmail.com", ditambah 1 fungsi Postgres `security definer`:
```sql
create function my_gmail_oauth_status()
returns table(email text, connected_at timestamptz)
language sql security definer as $$
  select email, connected_at from tabel_gmail_oauth where tpk_id = my_tpk_id()
$$;
```
Dipanggil dari klien via `supabase.rpc('my_gmail_oauth_status')` — tidak
pernah expose `refresh_token` ke klien sama sekali.

## Error handling

- Refresh token invalid/revoked (user cabut akses di Google) → Gmail API
  balas 401 → Edge Function balas `{ error: 'gmail_disconnected' }` →
  frontend tampilkan toast "Koneksi Gmail terputus, silakan connect ulang"
  dan tombol berubah jadi "Connect Gmail" lagi.
- Gmail API rate limit / quota → toast generic error, user bisa coba lagi.
- Attachment bukan PDF valid / gagal di-parse → sama seperti alur manual
  sekarang: masuk ke `preview.errors` (tidak menggagalkan seluruh sync).
- Sync dipanggil tapi belum ada koneksi Gmail → tombol otomatis dalam mode
  "Connect Gmail", jadi kasus ini tidak akan terjadi dari UI normal.

## Yang TIDAK dikerjakan (di luar scope)

- Background/cron sync — sudah diputuskan semi-otomatis saja.
- Auto-fill detail kapling dari PDF (No Kapling, jenis, volume, dll di
  Lampiran halaman 2) — PDF contoh punya data ini, tapi scope sekarang
  cuma no_invois + pembeli sesuai alur Quick Invois yang sudah ada. Bisa
  jadi proyek terpisah kalau dibutuhkan nanti.
- UI untuk mengedit daftar alamat pengirim dari Settings — hardcode
  konstanta, edit lewat kode kalau Perhutani ganti alamat.
- Multi-akun Gmail per TPK — satu refresh token per `tpk_id` (primary key),
  connect ulang menimpa yang lama.

## Prasyarat manual (harus kamu lakukan di luar Deskra)

1. Buka https://console.cloud.google.com/ → buat project baru (atau pakai
   yang sudah ada).
2. **APIs & Services → Library** → cari "Gmail API" → Enable.
3. **APIs & Services → OAuth consent screen** → User Type: External →
   isi nama app ("Deskra"), email support, scope tambahkan
   `https://www.googleapis.com/auth/gmail.readonly` → Test users: tambahkan
   email Gmail TPK yang akan dipakai (selama app belum "published",
   cuma test user yang terdaftar yang bisa login).
4. **APIs & Services → Credentials** → Create Credentials → OAuth client ID
   → Application type: **Web application** → Authorized redirect URIs:
   isi dengan URL Edge Function `gmail-oauth-callback` (formatnya
   `https://<project-ref>.supabase.co/functions/v1/gmail-oauth-callback`,
   saya kasih tahu URL persisnya begitu Edge Function di-deploy).
5. Catat **Client ID** dan **Client Secret** yang muncul — nanti disimpan
   sebagai environment variable Edge Function (`GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`), bukan di `.env` frontend (client secret tidak
   boleh sampai ke browser).
6. Kirimkan Client ID + Client Secret itu ke saya (lewat env var Supabase
   dashboard langsung kalau memungkinkan, biar tidak lewat chat).

Tanpa langkah ini, Edge Function OAuth tidak bisa jalan — ini bagian yang
saya tidak bisa lakukan otomatis.
