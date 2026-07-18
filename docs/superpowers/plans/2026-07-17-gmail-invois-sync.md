# Gmail Invois Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user click "Sync Gmail" in Register Kapling to pull new invois PDFs straight from Gmail (sender: Toko Perhutani) and feed them through the existing PDF-import preview/confirm flow — no new parsing logic, no manual download/upload step.

**Architecture:** 3 new Supabase Edge Functions handle OAuth + Gmail API only (`gmail-oauth-init` mints a one-time state token, `gmail-oauth-callback` is the Google redirect target that exchanges the code for a refresh token, `gmail-sync` uses the stored refresh token to list/download new PDF attachments). The browser reuses the existing `parsePdfInvoice` → `prepareInvoiceImportPreview` → `RegisterKaplingInvoicePreview` → `saveInvoiceImportPreview` pipeline unchanged, treating Gmail-sourced PDFs as regular `File` objects.

**Tech Stack:** Supabase Postgres (RLS + migration), Supabase Edge Functions (Deno), React hook (`useRegisterKaplingPage.js`), existing `pdfjs-dist` browser parsing — no new npm dependencies.

**Deviations from the approved spec (`docs/superpowers/specs/2026-07-17-gmail-invois-sync-design.md`), found while working out exact mechanics:**
1. Added `tabel_gmail_oauth_state` (one-time state table) + `gmail-oauth-init` Edge Function. The spec's callback is a plain Google redirect (`GET`, no auth header) — without a server-issued, tpk-bound `state` token, anyone could craft their own `state=<victim tpk_id>` and hijack another tenant's Gmail connection. This closes that gap.
2. Dropped the `connected_by` column from `tabel_gmail_oauth` — the callback request comes from Google's redirect, not from an authenticated app session, so there's no caller identity to record there.
3. Dropped the frontend `GMAIL_INVOIS_SENDERS` constant — sender filtering happens entirely inside the `gmail-sync` Edge Function (the browser never needs the list), so it only exists once, in Deno.

---

### Task 1: Database migration — tables + RLS + status RPC

**Files:**
- Create: `supabase/migrations/20260717000009_gmail_invois_sync.sql`

- [ ] **Step 1: Write the migration**

```sql
-- =============================================================================
-- Migration: gmail_invois_sync
-- Tabel untuk koneksi Gmail per TPK (OAuth refresh token, hanya diakses lewat
-- Edge Function service-role — tidak pernah lewat klien), tabel state OAuth
-- sekali-pakai (mencegah state dari tenant lain dipakai untuk membajak
-- koneksi), dan log invois yang sudah diproses dari Gmail (dedup + histori).
-- =============================================================================

create table tabel_gmail_oauth (
  tpk_id        uuid primary key references tabel_tpk(id),
  email         text not null,
  refresh_token text not null,
  connected_at  timestamptz default now()
);
alter table tabel_gmail_oauth enable row level security;
-- Sengaja tidak ada policy select/insert/update untuk anon/authenticated —
-- refresh_token cuma boleh dibaca/ditulis lewat Edge Function (service role).

create table tabel_gmail_oauth_state (
  state      uuid primary key,
  tpk_id     uuid not null references tabel_tpk(id),
  expires_at timestamptz not null
);
alter table tabel_gmail_oauth_state enable row level security;
-- ponytail: baris kedaluwarsa tidak dibersihkan aktif (tabel kecil, umur
-- baris cuma 10 menit) — tambah cron cleanup kalau tabel ini pernah terasa
-- membengkak.

create table tabel_gmail_invois_log (
  id         uuid primary key default gen_random_uuid(),
  tpk_id     uuid not null references tabel_tpk(id),
  message_id text not null,
  no_invois  text,
  status     text not null,
  created_at timestamptz default now()
);
create unique index tabel_gmail_invois_log_tpk_message_idx
  on tabel_gmail_invois_log (tpk_id, message_id);
alter table tabel_gmail_invois_log enable row level security;

drop policy if exists rls_gmail_invois_log_select on tabel_gmail_invois_log;
create policy rls_gmail_invois_log_select on tabel_gmail_invois_log
  for select using ((tpk_id = my_tpk_id()) or is_admin());
-- Insert cuma lewat Edge Function/klien service role setelah user konfirmasi
-- simpan di preview — perlu policy insert untuk role authenticated karena
-- baris ini ditulis dari browser (bukan Edge Function) di handleInvoisSave.
drop policy if exists rls_gmail_invois_log_insert on tabel_gmail_invois_log;
create policy rls_gmail_invois_log_insert on tabel_gmail_invois_log
  for insert with check ((tpk_id = my_tpk_id()) or is_admin());

-- Status koneksi Gmail untuk ditampilkan di UI, tanpa pernah expose
-- refresh_token ke klien.
create function my_gmail_oauth_status()
returns table(email text, connected_at timestamptz)
language sql security definer as $$
  select email, connected_at from tabel_gmail_oauth where tpk_id = my_tpk_id()
$$;
```

- [ ] **Step 2: Run the migration**

Run: `npm run migrate`
Expected: output ends with `✅ N/N migrasi berhasil dijalankan.` including `20260717000009_gmail_invois_sync.sql`.

- [ ] **Step 3: Verify manually in Supabase SQL editor**

Run: `select * from tabel_gmail_oauth; select * from tabel_gmail_oauth_state; select * from tabel_gmail_invois_log;`
Expected: all three return empty result sets with no error (tables + RLS exist).

Run: `select my_gmail_oauth_status();` (as an authenticated TPK user, or via the SQL editor with a JWT claim set) — for now with no rows in `tabel_gmail_oauth` it should return an empty set, not an error.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260717000009_gmail_invois_sync.sql
git commit -m "feat: tabel gmail oauth + log invois untuk sinkronisasi Gmail"
```

---

### Task 2: Edge Function `gmail-oauth-init`

**Files:**
- Create: `supabase/functions/gmail-oauth-init/index.ts`

- [ ] **Step 1: Write the function**

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userErr } = await callerClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Unauthorized: sesi tidak valid' }, 401)

    const { data: profile, error: profileErr } = await callerClient
      .from('profiles')
      .select('tpk_id')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile?.tpk_id) return json({ error: 'Profil TPK tidak ditemukan' }, 400)

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const state = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: insertErr } = await admin
      .from('tabel_gmail_oauth_state')
      .insert({ state, tpk_id: profile.tpk_id, expires_at: expiresAt })

    if (insertErr) return json({ error: `Gagal membuat sesi otorisasi: ${insertErr.message}` }, 500)

    return json({ state }, 200)
  } catch (err) {
    return json({ error: err.message ?? 'Internal server error' }, 500)
  }
})

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 2: Deploy and smoke-test**

Run: `npx supabase functions deploy gmail-oauth-init`
Expected: deploy succeeds.

Run (replace `<anon-key>` and `<jwt>` with a real logged-in session's values from browser devtools → Application → local storage `sb-*-auth-token`):
```bash
curl -X POST "https://illdzeigtuuleddocxgc.supabase.co/functions/v1/gmail-oauth-init" \
  -H "Authorization: Bearer <jwt>" -H "apikey: <anon-key>"
```
Expected: `{"state":"<uuid>"}`.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/gmail-oauth-init/index.ts
git commit -m "feat: edge function gmail-oauth-init untuk state token OAuth"
```

---

### Task 3: Edge Function `gmail-oauth-callback`

**Files:**
- Create: `supabase/functions/gmail-oauth-callback/index.ts`

- [ ] **Step 1: Write the function**

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  if (oauthError) return html(`Otorisasi dibatalkan: ${oauthError}. Tutup jendela ini.`)
  if (!code || !state) return html('Permintaan tidak valid: code/state hilang. Tutup jendela ini.')

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI')!

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: stateRow, error: stateErr } = await admin
      .from('tabel_gmail_oauth_state')
      .select('tpk_id, expires_at')
      .eq('state', state)
      .single()

    if (stateErr || !stateRow) {
      return html('Sesi otorisasi tidak ditemukan atau sudah dipakai. Tutup jendela ini dan coba lagi.')
    }
    await admin.from('tabel_gmail_oauth_state').delete().eq('state', state)
    if (new Date(stateRow.expires_at) < new Date()) {
      return html('Sesi otorisasi kedaluwarsa. Tutup jendela ini dan coba lagi.')
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const tokenJson = await tokenRes.json()
    if (!tokenRes.ok || !tokenJson.refresh_token) {
      return html(`Gagal menukar kode otorisasi: ${tokenJson.error_description || tokenJson.error || 'refresh_token tidak diberikan (pastikan prompt=consent)'}. Tutup jendela ini.`)
    }

    const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    })
    const profileJson = await profileRes.json()
    const email = profileJson.emailAddress || 'tidak diketahui'

    const { error: upsertErr } = await admin
      .from('tabel_gmail_oauth')
      .upsert({
        tpk_id: stateRow.tpk_id,
        email,
        refresh_token: tokenJson.refresh_token,
        connected_at: new Date().toISOString(),
      }, { onConflict: 'tpk_id' })

    if (upsertErr) return html(`Gagal menyimpan koneksi: ${upsertErr.message}. Tutup jendela ini.`)

    return html(`Gmail (${email}) berhasil terhubung. Jendela ini akan tertutup otomatis.`, true)
  } catch (err) {
    return html(`Terjadi kesalahan: ${err.message ?? err}. Tutup jendela ini.`)
  }
})

function html(message: string, autoClose = false) {
  const script = autoClose ? '<script>setTimeout(() => window.close(), 800)</script>' : ''
  return new Response(
    `<!DOCTYPE html><html><body style="font-family:monospace;background:#0a0a0a;color:#f0f0f0;padding:24px">${message}${script}</body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  )
}
```

- [ ] **Step 2: Deploy**

Run: `npx supabase functions deploy gmail-oauth-callback --no-verify-jwt`

Note the `--no-verify-jwt` flag: Google's redirect hits this URL directly with no Supabase Authorization header, so Supabase's default JWT gate must be disabled for this function specifically (the other two functions keep default JWT verification since they're called from the authenticated app).

Expected: deploy succeeds. This function can't be smoke-tested standalone yet — it needs a real `code`/`state` pair from a completed Google consent screen, which only exists once Task 6 (frontend Connect Gmail flow) is wired up. Verification happens end-to-end in Task 10.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/gmail-oauth-callback/index.ts
git commit -m "feat: edge function gmail-oauth-callback untuk tukar code Google jadi refresh token"
```

---

### Task 4: Edge Function `gmail-sync`

**Files:**
- Create: `supabase/functions/gmail-sync/index.ts`

- [ ] **Step 1: Write the function**

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SENDERS = [
  'kwitansikontrak-potp@perhutani.co.id',
  'kwitansiretail-potp@perhutani.co.id',
]
const MAX_MESSAGES_PER_SYNC = 30

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userErr } = await callerClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Unauthorized: sesi tidak valid' }, 401)

    const { data: profile, error: profileErr } = await callerClient
      .from('profiles')
      .select('tpk_id')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile?.tpk_id) return json({ error: 'Profil TPK tidak ditemukan' }, 400)

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: oauthRow, error: oauthErr } = await admin
      .from('tabel_gmail_oauth')
      .select('refresh_token')
      .eq('tpk_id', profile.tpk_id)
      .single()

    if (oauthErr || !oauthRow) return json({ error: 'gmail_disconnected' }, 400)

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: oauthRow.refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    })
    const tokenJson = await tokenRes.json()
    if (!tokenRes.ok) return json({ error: 'gmail_disconnected' }, 401)
    const accessToken = tokenJson.access_token

    const { data: logRows } = await admin
      .from('tabel_gmail_invois_log')
      .select('message_id')
      .eq('tpk_id', profile.tpk_id)
    const processedIds = new Set((logRows || []).map((r: { message_id: string }) => r.message_id))

    const senderQuery = SENDERS.map(s => `from:${s}`).join(' OR ')
    const gmailQuery = `(${senderQuery}) has:attachment filename:pdf`
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(gmailQuery)}&maxResults=${MAX_MESSAGES_PER_SYNC}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const listJson = await listRes.json()
    if (!listRes.ok) return json({ error: `Gagal mengambil daftar email: ${listJson.error?.message || 'unknown'}` }, 502)

    const candidateIds = (listJson.messages || [])
      .map((m: { id: string }) => m.id)
      .filter((id: string) => !processedIds.has(id))

    const files: { fileName: string; base64: string; messageId: string }[] = []
    for (const messageId of candidateIds) {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const msgJson = await msgRes.json()
      if (!msgRes.ok) continue

      const pdfParts = findPdfParts(msgJson.payload)
      for (const part of pdfParts) {
        const attRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${part.body.attachmentId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        const attJson = await attRes.json()
        if (!attRes.ok || !attJson.data) continue

        const base64 = attJson.data.replace(/-/g, '+').replace(/_/g, '/')
        files.push({ fileName: part.filename || `invois-${messageId}.pdf`, base64, messageId })
      }
    }

    return json({ files, skippedCount: processedIds.size }, 200)
  } catch (err) {
    return json({ error: err.message ?? 'Internal server error' }, 500)
  }
})

function findPdfParts(payload: any, acc: any[] = []): any[] {
  if (!payload) return acc
  if (payload.filename && payload.filename.toLowerCase().endsWith('.pdf') && payload.body?.attachmentId) {
    acc.push(payload)
  }
  for (const part of payload.parts || []) {
    findPdfParts(part, acc)
  }
  return acc
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 2: Deploy**

Run: `npx supabase functions deploy gmail-sync`
Expected: deploy succeeds. Full end-to-end test happens in Task 10 (needs a real Gmail connection from Task 3).

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/gmail-sync/index.ts
git commit -m "feat: edge function gmail-sync untuk ambil PDF invois baru dari Gmail"
```

---

### Task 5: Thread `messageId` through the existing invoice-import pipeline

**Files:**
- Modify: `src/pages/register-kapling/utils/registerKaplingInvoiceImport.js:46-63` (`summarizeInvoiceParseResult`), `:90-131` (`prepareInvoiceImportPreview`)
- Test: `test/registerKaplingInvoiceImport.test.js`

Gmail-sourced files need to carry which Gmail message they came from, so the save step can log it (Task 7). Manual file-picker uploads never set this, so it stays `undefined` there — no behavior change for the existing flow.

- [ ] **Step 1: Write the failing tests**

Add to `test/registerKaplingInvoiceImport.test.js` (after the existing `summarizeInvoiceParseResult` tests, before `buildInvoiceImportPreview` tests):

```js
test('summarizeInvoiceParseResult passes through messageId when present', () => {
  const rowsByKapling = new Map([['001', { id: 1, no_kapling: '001' }]])

  const invoice = summarizeInvoiceParseResult({
    fileName: 'invoice.pdf',
    messageId: 'gmail-msg-123',
    parseResult: { noInvois: 'ECR-001', pembeli: 'PT Kayu', kaplingList: ['001'] },
    rowsByKapling,
  })

  assert.equal(invoice.messageId, 'gmail-msg-123')
})

test('summarizeInvoiceParseResult leaves messageId undefined when not passed', () => {
  const invoice = summarizeInvoiceParseResult({
    fileName: 'invoice.pdf',
    parseResult: { noInvois: 'ECR-001', pembeli: 'PT Kayu', kaplingList: [] },
    rowsByKapling: new Map(),
  })

  assert.equal(invoice.messageId, undefined)
})

test('prepareInvoiceImportPreview reads gmailMessageId off the file object', async () => {
  const files = [{ name: 'a.pdf', gmailMessageId: 'gmail-msg-1' }]
  const result = await prepareInvoiceImportPreview({
    files,
    parseInvoice: async () => ({ noInvois: 'ECR-001', pembeli: 'PT Kayu', kaplingList: [] }),
    rows: [],
  })

  assert.equal(result.preview.invoices[0].messageId, 'gmail-msg-1')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/registerKaplingInvoiceImport.test.js`
Expected: the 3 new tests FAIL (`invoice.messageId` is `undefined` instead of the expected string in the first and third test).

- [ ] **Step 3: Implement**

In `src/pages/register-kapling/utils/registerKaplingInvoiceImport.js`, change `summarizeInvoiceParseResult`:

```js
export function summarizeInvoiceParseResult({
  fileName,
  messageId,
  parseResult,
  rowsByKapling,
}) {
  const { noInvois, pembeli, kaplingList } = parseResult
  if (!noInvois) {
    return { error: { fileName, message: 'Nomor invois tidak ditemukan.' } }
  }

  return {
    noInvois,
    pembeli,
    matched: kaplingList.map(noKapling => rowsByKapling.get(noKapling)).filter(Boolean),
    unmatched: kaplingList.filter(noKapling => !rowsByKapling.has(noKapling)),
    fileName,
    messageId,
  }
}
```

And change the loop inside `prepareInvoiceImportPreview`:

```js
      const result = summarizeInvoiceParseResult({
        fileName: file.name,
        messageId: file.gmailMessageId,
        parseResult: await parseInvoice(file),
        rowsByKapling,
      })
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/registerKaplingInvoiceImport.test.js`
Expected: all tests PASS (including the pre-existing ones — confirms the change is backward compatible).

- [ ] **Step 5: Commit**

```bash
git add src/pages/register-kapling/utils/registerKaplingInvoiceImport.js test/registerKaplingInvoiceImport.test.js
git commit -m "feat: thread gmail messageId lewat pipeline import invois PDF"
```

---

### Task 6: New util module `registerKaplingGmailSync.js`

**Files:**
- Create: `src/pages/register-kapling/utils/registerKaplingGmailSync.js`
- Test: `test/registerKaplingGmailSync.test.js`

Pure, testable helpers: building the Google consent URL, decoding a base64 PDF into a `File`, calling an Edge Function, and building the log rows written after a successful save. Network calls (`callEdgeFunction`, `fetchGmailStatus`) aren't unit-tested here (no Supabase client to mock cheaply) — they're covered by the manual end-to-end check in Task 10, consistent with how this codebase already treats Supabase-calling functions (see `saveInvoiceImportPreview` — the DB-write half is tested via a mock client, but the Edge Function half here is thin enough it isn't worth a mock).

- [ ] **Step 1: Write the failing tests**

Create `test/registerKaplingGmailSync.test.js`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  base64PdfToFile,
  buildGmailAuthUrl,
  buildGmailInvoiceLogRows,
} from '../src/pages/register-kapling/utils/registerKaplingGmailSync.js'

test('buildGmailAuthUrl includes required OAuth params', () => {
  const url = buildGmailAuthUrl({
    clientId: 'client-123',
    redirectUri: 'https://example.supabase.co/functions/v1/gmail-oauth-callback',
    state: 'state-abc',
  })

  const parsed = new URL(url)
  assert.equal(parsed.origin + parsed.pathname, 'https://accounts.google.com/o/oauth2/v2/auth')
  assert.equal(parsed.searchParams.get('client_id'), 'client-123')
  assert.equal(parsed.searchParams.get('redirect_uri'), 'https://example.supabase.co/functions/v1/gmail-oauth-callback')
  assert.equal(parsed.searchParams.get('response_type'), 'code')
  assert.equal(parsed.searchParams.get('scope'), 'https://www.googleapis.com/auth/gmail.readonly')
  assert.equal(parsed.searchParams.get('access_type'), 'offline')
  assert.equal(parsed.searchParams.get('prompt'), 'consent')
  assert.equal(parsed.searchParams.get('state'), 'state-abc')
})

test('base64PdfToFile decodes base64 back into the original bytes', async () => {
  const original = 'hello pdf bytes'
  const base64 = Buffer.from(original, 'utf-8').toString('base64')

  const file = base64PdfToFile('invois.pdf', base64)

  assert.equal(file.name, 'invois.pdf')
  assert.equal(file.type, 'application/pdf')
  const text = await file.text()
  assert.equal(text, original)
})

test('buildGmailInvoiceLogRows only includes invoices that came from Gmail', () => {
  const rows = buildGmailInvoiceLogRows({
    tpkId: 'tpk-1',
    invoices: [
      { noInvois: 'ECR-001', messageId: 'msg-1', matched: [{ id: 1 }] },
      { noInvois: 'ECR-002', matched: [] }, // upload manual, tanpa messageId
      { noInvois: 'ECR-003', messageId: 'msg-3', matched: [] },
    ],
  })

  assert.deepEqual(rows, [
    { tpk_id: 'tpk-1', message_id: 'msg-1', no_invois: 'ECR-001', status: 'imported' },
    { tpk_id: 'tpk-1', message_id: 'msg-3', no_invois: 'ECR-003', status: 'skipped' },
  ])
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/registerKaplingGmailSync.test.js`
Expected: FAIL with `Cannot find module '../src/pages/register-kapling/utils/registerKaplingGmailSync.js'`.

- [ ] **Step 3: Implement**

Create `src/pages/register-kapling/utils/registerKaplingGmailSync.js`:

```js
import { supabase } from '../../../lib/supabase'

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'

export function buildGmailAuthUrl({ clientId, redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export function base64PdfToFile(fileName, base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], fileName, { type: 'application/pdf' })
}

export function buildGmailInvoiceLogRows({ tpkId, invoices }) {
  return invoices
    .filter(invoice => invoice.messageId)
    .map(invoice => ({
      tpk_id: tpkId,
      message_id: invoice.messageId,
      no_invois: invoice.noInvois,
      status: invoice.matched.length > 0 ? 'imported' : 'skipped',
    }))
}

export async function callGmailEdgeFunction(name, { body } = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Sesi tidak valid. Coba login ulang.')

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Terjadi kesalahan')
  return json
}

export async function fetchGmailStatus() {
  const { data, error } = await supabase.rpc('my_gmail_oauth_status')
  if (error) throw error
  return data?.[0] ?? null
}

export async function logGmailInvoiceSync({ invoices, tpkId }) {
  const rows = buildGmailInvoiceLogRows({ tpkId, invoices })
  if (!rows.length) return
  await supabase.from('tabel_gmail_invois_log').upsert(rows, { onConflict: 'tpk_id,message_id', ignoreDuplicates: true })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/registerKaplingGmailSync.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/register-kapling/utils/registerKaplingGmailSync.js test/registerKaplingGmailSync.test.js
git commit -m "feat: util gmail sync — auth url, decode PDF, log invoice rows"
```

---

### Task 7: Wire Gmail connect/sync into `useRegisterKaplingPage.js`

**Files:**
- Modify: `src/pages/register-kapling/hooks/useRegisterKaplingPage.js`

- [ ] **Step 1: Add imports**

At the top of the file, alongside the other `registerKaplingInvoiceImport` import (`useRegisterKaplingPage.js:13-17`), add:

```js
import {
  callGmailEdgeFunction,
  base64PdfToFile,
  buildGmailAuthUrl,
  fetchGmailStatus,
  logGmailInvoiceSync,
} from '../utils/registerKaplingGmailSync'
```

- [ ] **Step 2: Add state**

Right after the existing `invoisSaving` state declaration (`useRegisterKaplingPage.js:95-96`):

```js
  const [invoisPreview, setInvoisPreview]   = useState(null)
  const [invoisSaving, setInvoisSaving]     = useState(false)

  const [gmailStatus, setGmailStatus]       = useState(null) // { email, connected_at } | null
  const [gmailSyncing, setGmailSyncing]     = useState(false)
```

- [ ] **Step 3: Fetch Gmail status on load**

Right after the existing data-fetching `useEffect` (`useRegisterKaplingPage.js:159-179`), add a new effect:

```js
  useEffect(() => {
    if (!tpkId) { setGmailStatus(null); return }
    fetchGmailStatus().then(setGmailStatus).catch(() => setGmailStatus(null))
  }, [tpkId])
```

- [ ] **Step 4: Add connect/sync handlers**

Right after `handleInvoisSave` (`useRegisterKaplingPage.js:352-360`), add:

```js
  // ── Gmail invoice sync ───────────────────────────────────────────────────
  async function handleGmailConnect() {
    try {
      const { state } = await callGmailEdgeFunction('gmail-oauth-init')
      const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-oauth-callback`
      const authUrl = buildGmailAuthUrl({ clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID, redirectUri, state })
      const popup = window.open(authUrl, 'gmail-oauth', 'width=480,height=640')
      if (!popup) { showToast('Popup diblokir browser. Izinkan popup untuk connect Gmail.', 'error'); return }

      const poll = setInterval(async () => {
        if (!popup.closed) return
        clearInterval(poll)
        const status = await fetchGmailStatus().catch(() => null)
        setGmailStatus(status)
        showToast(status ? `Gmail terhubung: ${status.email}` : 'Koneksi Gmail dibatalkan.', status ? 'success' : 'error')
      }, 1000)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function handleGmailSync() {
    if (!tpkId) return
    setGmailSyncing(true)
    try {
      const { files } = await callGmailEdgeFunction('gmail-sync')
      if (!files.length) { showToast('Tidak ada invois baru dari Gmail.', 'success'); return }

      const fileObjects = files.map(f => {
        const file = base64PdfToFile(f.fileName, f.base64)
        file.gmailMessageId = f.messageId
        return file
      })

      const result = await prepareInvoiceImportPreview({ files: fileObjects, parseInvoice: parsePdfInvoice, rows })
      if (result.error) { showToast(result.error, 'error'); return }
      setInvoisPreview(result.preview)
    } catch (err) {
      if (err.message === 'gmail_disconnected') {
        setGmailStatus(null)
        showToast('Koneksi Gmail terputus, silakan connect ulang.', 'error')
      } else {
        showToast('Gagal sync Gmail: ' + err.message, 'error')
      }
    } finally {
      setGmailSyncing(false)
    }
  }
```

- [ ] **Step 5: Log processed messages after save**

Modify `handleInvoisSave` (`useRegisterKaplingPage.js:352-360`) to call `logGmailInvoiceSync` after a successful save:

```js
  async function handleInvoisSave() {
    if (!invoisPreview?.totalMatched || !tpkId) return
    setInvoisSaving(true)
    const result = await saveInvoiceImportPreview({ preview: invoisPreview, supabase, tpkId })
    if (result.type === 'success') {
      await logGmailInvoiceSync({ invoices: invoisPreview.invoices, tpkId }).catch(() => {})
    }
    setInvoisSaving(false)
    showToast(result.message, result.type)
    if (result.closePreview) setInvoisPreview(null)
    if (result.refresh) fetchData()
  }
```

- [ ] **Step 6: Expose new state/handlers from the hook**

In the return object, change the `// invois` line (`useRegisterKaplingPage.js:571`) to add a `// gmail` group right after it:

```js
    // invois
    invoisPreview, setInvoisPreview, invoisSaving, handleInvoisFileChange, handleInvoisSave,
    // gmail
    gmailStatus, gmailSyncing, handleGmailConnect, handleGmailSync,
```

- [ ] **Step 7: Manual smoke check (no Gmail connection yet)**

This can't be fully tested until Task 10 (needs a real Google OAuth client), but verify it doesn't break the existing page:

Run: `npm run dev` (or use the Browser pane) and open Register Kapling.
Expected: page loads with no console errors — `fetchGmailStatus()` should resolve to `null` (RPC returns empty set) without throwing, since no `tabel_gmail_oauth` row exists yet for any tenant.

- [ ] **Step 8: Commit**

```bash
git add src/pages/register-kapling/hooks/useRegisterKaplingPage.js
git commit -m "feat: wire gmail connect/sync handlers ke useRegisterKaplingPage"
```

---

### Task 8: Header UI — "Connect Gmail" / "Sync Gmail" entry

**Files:**
- Modify: `src/pages/register-kapling/components/RegisterKaplingHeader.jsx`

- [ ] **Step 1: Add new props and import an icon**

Change the lucide-react import (`RegisterKaplingHeader.jsx:2`):

```js
import { ChevronDown, ClipboardList, Download, FileBarChart2, FileSpreadsheet, FileText, Loader2, MailCheck, Plus, Settings, Tag, Upload } from 'lucide-react'
```

Add new props to the component signature (`RegisterKaplingHeader.jsx:5-24`):

```js
export default function RegisterKaplingHeader({
  availableYears,
  bapRef,
  colMap,
  dkhpImportRef,
  fileRef,
  gmailStatus,
  gmailSyncing,
  invoisRef,
  onBapFiles,
  onDkhpImportFiles,
  onExport,
  onFileChange,
  onGmailConnect,
  onGmailSync,
  onInvoisFileChange,
  onAddRow,
  onOpenFixPrefix,
  rows,
  selectedYear,
  setDraftMap,
  setSelectedYear,
  setShowSettings,
}) {
```

- [ ] **Step 2: Add the Gmail entry to the import dropdown**

Change `importOptions` (`RegisterKaplingHeader.jsx:37-42`) to append one more entry, built from `gmailStatus`:

```js
  const importOptions = [
    { label: 'DP Kapling',  desc: 'file excel dp kapling (.xlsx)',    Icon: FileSpreadsheet, color: '#00ff88',              onPick: () => fileRef.current?.click() },
    { label: 'DKHP',        desc: 'file excel dkhp (.xlsx, multi)',   Icon: FileBarChart2,   color: 'rgba(0,255,136,0.75)', onPick: () => dkhpImportRef.current?.click() },
    { label: 'BAP',         desc: 'file pdf bap (multi)',             Icon: ClipboardList,   color: '#a78bfa',              onPick: () => bapRef.current?.click() },
    { label: 'Invois',      desc: 'file pdf invois (multi)',          Icon: FileText,        color: 'rgba(0,180,255,0.9)',  onPick: () => invoisRef.current?.click() },
    gmailStatus
      ? { label: 'Sync Gmail', desc: `terhubung: ${gmailStatus.email}`, Icon: gmailSyncing ? Loader2 : MailCheck, color: '#00ff88', onPick: onGmailSync }
      : { label: 'Connect Gmail', desc: 'hubungkan akun Gmail untuk sinkron invois', Icon: MailCheck, color: 'rgba(255,170,0,0.85)', onPick: onGmailConnect },
  ]
```

- [ ] **Step 3: Manual visual check**

Run: use the Browser pane on Register Kapling, open the "import" dropdown.
Expected: a 5th entry appears reading "Connect Gmail" with description "hubungkan akun Gmail untuk sinkron invois" (since no `tabel_gmail_oauth` row exists yet for any tenant at this point in the plan).

- [ ] **Step 4: Commit**

```bash
git add src/pages/register-kapling/components/RegisterKaplingHeader.jsx
git commit -m "feat: tombol Connect/Sync Gmail di dropdown import Register Kapling"
```

---

### Task 9: Wire new props through `index.jsx`

**Files:**
- Modify: `src/pages/register-kapling/index.jsx:34-53`

- [ ] **Step 1: Pass the new props to `RegisterKaplingHeader`**

```jsx
      <RegisterKaplingHeader
        availableYears={page.availableYears}
        bapRef={page.bapRef}
        colMap={page.colMap}
        dkhpImportRef={page.dkhpImportRef}
        fileRef={page.fileRef}
        gmailStatus={page.gmailStatus}
        gmailSyncing={page.gmailSyncing}
        invoisRef={page.invoisRef}
        onBapFiles={page.handleBapFiles}
        onDkhpImportFiles={page.handleDkhpImportFiles}
        onExport={page.handleExport}
        onFileChange={page.handleFileChange}
        onGmailConnect={page.handleGmailConnect}
        onGmailSync={page.handleGmailSync}
        onInvoisFileChange={page.handleInvoisFileChange}
        onAddRow={() => page.setEditRow({ ...page.EMPTY_ROW })}
        onOpenFixPrefix={page.handleOpenFixPrefix}
        rows={page.rows}
        selectedYear={page.selectedYear}
        setDraftMap={page.setDraftMap}
        setSelectedYear={page.setSelectedYear}
        setShowSettings={page.setShowSettings}
      />
```

- [ ] **Step 2: Run the existing test suite to catch regressions**

Run: `node --test`
Expected: all tests pass (no test touches `index.jsx` directly, but this confirms Task 5/6 changes didn't break anything else in the suite).

- [ ] **Step 3: Commit**

```bash
git add src/pages/register-kapling/index.jsx
git commit -m "feat: sambungkan props gmail sync ke RegisterKapling index"
```

---

### Task 10: Deploy, configure secrets, and verify end-to-end

This task needs the Google Cloud OAuth client you set up per the prerequisites in the spec (`docs/superpowers/specs/2026-07-17-gmail-invois-sync-design.md`, bottom section). Nothing in Tasks 1-9 can be fully verified without it.

- [ ] **Step 1: Add the frontend env var**

Add to `.env` (not committed — already gitignored):
```
VITE_GOOGLE_CLIENT_ID=<your Google OAuth Client ID>
```
Add the same key/value in Vercel dashboard → Project Settings → Environment Variables (Production + Preview), so deployed builds have it too.

- [ ] **Step 2: Set Edge Function secrets**

Run (replace placeholders with real values from your Google Cloud OAuth client):
```bash
npx supabase secrets set GOOGLE_CLIENT_ID=<your-client-id>
npx supabase secrets set GOOGLE_CLIENT_SECRET=<your-client-secret>
npx supabase secrets set GOOGLE_REDIRECT_URI=https://illdzeigtuuleddocxgc.supabase.co/functions/v1/gmail-oauth-callback
```
Expected: each command confirms the secret was set. `GOOGLE_REDIRECT_URI` must byte-for-byte match one of the "Authorized redirect URIs" registered in Google Cloud Console.

- [ ] **Step 3: Redeploy all 3 functions so they pick up the secrets**

```bash
npx supabase functions deploy gmail-oauth-init
npx supabase functions deploy gmail-oauth-callback --no-verify-jwt
npx supabase functions deploy gmail-sync
```

- [ ] **Step 4: Connect a real Gmail account**

In the running app (`npm run dev` or deployed), open Register Kapling → import dropdown → "Connect Gmail". A popup should open Google's consent screen. Log in with a Gmail account that's listed as a **test user** in the OAuth consent screen config (required while the app is unpublished), grant access.

Expected: popup shows "Gmail (you@gmail.com) berhasil terhubung" and auto-closes within ~1s. Back in the app, a toast shows "Gmail terhubung: you@gmail.com" and the dropdown entry now reads "Sync Gmail".

- [ ] **Step 5: Verify the connection row**

In Supabase SQL editor:
```sql
select tpk_id, email, connected_at from tabel_gmail_oauth;
```
Expected: one row, `email` matches the Gmail account just connected, `refresh_token` is present (don't print it).

- [ ] **Step 6: Sync against a real invois email**

Forward or have Perhutani send a real kuitansi PDF to the connected Gmail account from `kwitansikontrak-potp@perhutani.co.id` or `kwitansiretail-potp@perhutani.co.id` (or use an existing one already in that inbox). Click "Sync Gmail".

Expected: the existing `RegisterKaplingInvoicePreview` modal opens showing the parsed invois (same as manual PDF upload today) — no. invois, pembeli, matched/unmatched kapling counts.

- [ ] **Step 7: Confirm save + log + dedup**

Click "simpan" in the preview. Then check:
```sql
select tpk_id, message_id, no_invois, status from tabel_gmail_invois_log;
```
Expected: one row per processed email, `status` = `imported` if it matched at least one kapling row, `skipped` otherwise.

Click "Sync Gmail" again immediately.
Expected: toast "Tidak ada invois baru dari Gmail." — confirms dedup against `tabel_gmail_invois_log` works (the same message isn't re-fetched).

- [ ] **Step 8: Verify a revoked connection is handled gracefully**

In your Google Account settings (myaccount.google.com → Security → Third-party access), revoke Deskra's access. Click "Sync Gmail" in the app again.

Expected: toast "Koneksi Gmail terputus, silakan connect ulang." and the dropdown entry reverts to "Connect Gmail".

---

### Task 11: Version bump, changelog, commit

**Files:**
- Modify: `package.json`
- Modify: `src/changelog.js`

- [ ] **Step 1: Bump version**

In `package.json`, change `"version": "0.56.2"` → `"version": "0.57.0"` (minor bump — new feature).

- [ ] **Step 2: Add changelog entry**

In `src/changelog.js`, add at the top of the `changelog` array:

```js
  {
    version: '0.57.0',
    date: '2026-07-17',
    items: [
      { type: 'feat', text: 'sinkronisasi invois dari Gmail — tombol "Connect Gmail"/"Sync Gmail" di Register Kapling menarik PDF kuitansi Perhutani langsung dari inbox, diproses lewat alur import invois PDF yang sudah ada' },
    ]
  },
```

- [ ] **Step 3: Run full test suite one more time**

Run: `node --test`
Expected: all tests pass.

- [ ] **Step 4: Commit and push**

```bash
git add package.json src/changelog.js
git commit -m "chore: bump versi ke v0.57.0 — sinkronisasi invois Gmail"
git push
```
