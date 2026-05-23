# Office Ecosystem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan tiga fitur ekosistem kantor: Audit Trail (log aktivitas diff-based), User Management (hapus sistem tema + reset password mandiri), dan Export Excel (Register Kapling + Rekap Periode).

**Architecture:** Tiga sub-project independen dikerjakan berurutan. Audit Trail: migrasi DB baru + helper `activityLog.js` + halaman `/activity-log` + integrasi di 4 modul. User Management: hapus `useTheme` hook + tambah reset password di Settings. Export Excel: util baru + tombol di 2 halaman existing.

**Tech Stack:** React 18, Vite, Supabase (PostgreSQL + RLS), plain JS/JSX, `xlsx` (sudah terinstall), `lucide-react` (sudah terinstall)

**Spec:** `docs/superpowers/specs/2026-05-23-office-ecosystem-design.md`

---

## Sub-project 1: Audit Trail

### Task 1: DB Migration — tabel_activity_log

**Files:**
- Create: `supabase/migrations/20260523000002_create_activity_log.sql`

- [ ] **Step 1: Buat file migrasi**

Buat file `supabase/migrations/20260523000002_create_activity_log.sql` dengan isi:

```sql
-- ============================================================
-- DESKRA — Audit Trail: tabel_activity_log
-- Log immutable untuk setiap aksi create/update/delete.
-- ============================================================
create table if not exists tabel_activity_log (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  tpk_id        uuid not null references tabel_tpk(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  nama_operator text,
  action        text not null check (action in ('create', 'update', 'delete')),
  entity_type   text not null,
  entity_id     uuid,
  entity_label  text,
  diff          jsonb
);

create index if not exists idx_activity_log_tpk_created
  on tabel_activity_log(tpk_id, created_at desc);

alter table tabel_activity_log enable row level security;

-- Operator baca log TPK sendiri; admin baca semua
create policy "activity_log_select" on tabel_activity_log
  for select using (tpk_id = my_tpk_id() or is_admin());

-- Semua authenticated user bisa insert (client-side logging)
create policy "activity_log_insert" on tabel_activity_log
  for insert with check (tpk_id = my_tpk_id() or is_admin());

-- Tidak ada update/delete — log bersifat immutable
```

- [ ] **Step 2: Jalankan migrasi**

```
npm run migrate
```

Verifikasi: tabel `tabel_activity_log` muncul di Supabase dashboard → Table Editor dengan kolom sesuai di atas.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260523000002_create_activity_log.sql
git commit -m "feat: tambah tabel activity_log untuk audit trail"
```

---

### Task 2: Helper activityLog.js

**Files:**
- Create: `src/lib/activityLog.js`

- [ ] **Step 1: Buat file helper**

Buat file `src/lib/activityLog.js`:

```js
import { supabase } from './supabase'

export async function logActivity({
  action,
  entityType,
  entityId = null,
  entityLabel = null,
  diff = null,
  tpkId,
  profile,
}) {
  try {
    await supabase.from('tabel_activity_log').insert({
      tpk_id:        tpkId,
      user_id:       profile?.id ?? null,
      nama_operator: profile?.nama_operator ?? null,
      action,
      entity_type:   entityType,
      entity_id:     entityId ?? null,
      entity_label:  entityLabel ?? null,
      diff:          diff && diff.length > 0 ? diff : null,
    })
  } catch (err) {
    console.warn('[activityLog] gagal catat log:', err)
  }
}

// Hanya field yang nilainya berubah; HTML tag di label dibersihkan.
export function buildDiff(oldObj, newObj, fieldDefs) {
  return fieldDefs
    .filter(({ key }) => String(oldObj[key] ?? '') !== String(newObj[key] ?? ''))
    .map(({ key, label }) => ({
      field:  key,
      label:  label.replace(/<[^>]+>/g, ''),
      before: oldObj[key] ?? null,
      after:  newObj[key] ?? null,
    }))
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/activityLog.js
git commit -m "feat: tambah helper activityLog untuk client-side audit logging"
```

---

### Task 3: Halaman ActivityLog.jsx

**Files:**
- Create: `src/pages/ActivityLog.jsx`

- [ ] **Step 1: Buat halaman**

Buat file `src/pages/ActivityLog.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthProvider'
import { getEffectiveTpkId } from '../lib/effectiveTpk'
import TpkRequiredState from '../components/layout/TpkRequiredState'
import { TableSkeleton } from '../components/ui/LoadingState'
import { ChevronDown, ChevronRight } from 'lucide-react'

const ENTITY_LABELS = {
  register_kapling: 'Register Kapling',
  periode:          'Periode',
  tenaga_kerja:     'Tenaga Kerja',
  pejabat:          'Pejabat',
}

const ACTION_STYLE = {
  create: { bg: 'rgba(0,255,136,0.1)',   color: '#00ff88',             border: 'rgba(0,255,136,0.22)',   label: 'buat'  },
  update: { bg: 'rgba(0,180,255,0.1)',   color: 'rgba(0,180,255,0.9)', border: 'rgba(0,180,255,0.22)',   label: 'ubah'  },
  delete: { bg: 'rgba(255,107,107,0.1)', color: '#ff6b6b',             border: 'rgba(255,107,107,0.22)', label: 'hapus' },
}

function ActionBadge({ action }) {
  const s = ACTION_STYLE[action] || {}
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '1px 7px',
      borderRadius: 3, fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {s.label || action}
    </span>
  )
}

function DiffTable({ diff }) {
  if (!diff || !diff.length) {
    return <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontFamily: 'monospace' }}>—</span>
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'monospace' }}>
      <thead>
        <tr>
          {['Field', 'Sebelum', 'Sesudah'].map(h => (
            <th key={h} style={{
              textAlign: 'left', padding: '3px 8px',
              color: 'rgba(255,255,255,0.35)', fontWeight: 600,
              fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {diff.map((d, i) => (
          <tr key={i}>
            <td style={{ padding: '3px 8px', color: 'rgba(255,255,255,0.55)' }}>{d.label || d.field}</td>
            <td style={{ padding: '3px 8px', color: '#ff6b6b'  }}>{String(d.before ?? '—')}</td>
            <td style={{ padding: '3px 8px', color: '#00ff88'  }}>{String(d.after  ?? '—')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function LogRow({ log }) {
  const [expanded, setExpanded] = useState(false)
  const hasDiff = log.diff && log.diff.length > 0
  const date    = new Date(log.created_at)
  const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  return (
    <>
      <tr
        onClick={() => hasDiff && setExpanded(e => !e)}
        style={{ cursor: hasDiff ? 'pointer' : 'default', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
        onMouseEnter={e => { if (hasDiff) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <td style={{ padding: '8px 12px', fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
          <div>{dateStr}</div>
          <div style={{ color: 'rgba(255,255,255,0.3)' }}>{timeStr}</div>
        </td>
        <td style={{ padding: '8px 12px', fontSize: 11, fontFamily: 'monospace', color: '#f0f0f0' }}>{log.nama_operator || '—'}</td>
        <td style={{ padding: '8px 12px' }}><ActionBadge action={log.action} /></td>
        <td style={{ padding: '8px 12px', fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.45)' }}>
          {ENTITY_LABELS[log.entity_type] || log.entity_type}
        </td>
        <td style={{ padding: '8px 12px', fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.65)' }}>
          {log.entity_label || log.entity_id || '—'}
        </td>
        <td style={{ padding: '8px 12px', width: 24 }}>
          {hasDiff && (expanded
            ? <ChevronDown  size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
            : <ChevronRight size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
          )}
        </td>
      </tr>
      {expanded && hasDiff && (
        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <td colSpan={6} style={{ padding: '8px 24px 12px', background: 'rgba(255,255,255,0.02)' }}>
            <DiffTable diff={log.diff} />
          </td>
        </tr>
      )}
    </>
  )
}

export default function ActivityLog() {
  const { profile, activeTpkId } = useAuth()
  const tpkId = getEffectiveTpkId({ activeTpkId, profile })

  const today    = new Date().toISOString().split('T')[0]
  const sevenAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [dateFrom,     setDateFrom]     = useState(sevenAgo)
  const [dateTo,       setDateTo]       = useState(today)
  const [moduleFilter, setModuleFilter] = useState('all')
  const [logs,         setLogs]         = useState([])
  const [loading,      setLoading]      = useState(true)

  if (!tpkId) return <TpkRequiredState />

  useEffect(() => {
    async function load() {
      setLoading(true)
      let q = supabase
        .from('tabel_activity_log')
        .select('id, created_at, nama_operator, action, entity_type, entity_label, entity_id, diff')
        .order('created_at', { ascending: false })
        .limit(200)
      if (dateFrom)               q = q.gte('created_at', dateFrom)
      if (dateTo)                 q = q.lte('created_at', dateTo + 'T23:59:59')
      if (moduleFilter !== 'all') q = q.eq('entity_type', moduleFilter)
      const { data } = await q
      setLogs(data || [])
      setLoading(false)
    }
    load()
  }, [dateFrom, dateTo, moduleFilter, tpkId])

  const panelStyle = {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 3,
  }
  const inputStyle = {
    padding: '6px 10px', borderRadius: 3,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.03)',
    color: '#f0f0f0', fontFamily: 'monospace', fontSize: 11, outline: 'none',
  }

  return (
    <div style={{ padding: 24, background: '#0a0a0a', color: '#f0f0f0', minHeight: '100%' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', margin: 0, color: '#f0f0f0' }}>
          Log Aktivitas
        </h1>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4, fontFamily: 'monospace' }}>
          Riwayat perubahan data oleh operator.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>dari</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>sampai</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
        </div>
        <select
          value={moduleFilter}
          onChange={e => setModuleFilter(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="all">Semua Modul</option>
          <option value="register_kapling">Register Kapling</option>
          <option value="periode">Periode</option>
          <option value="tenaga_kerja">Tenaga Kerja</option>
          <option value="pejabat">Pejabat</option>
        </select>
      </div>

      <div style={panelStyle}>
        {loading ? (
          <div style={{ padding: 20 }}><TableSkeleton rows={6} /></div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
            Tidak ada log pada rentang waktu ini.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Waktu', 'Operator', 'Aksi', 'Modul', 'Entitas', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 12px', textAlign: 'left',
                    fontSize: 10, fontFamily: 'monospace',
                    color: 'rgba(255,255,255,0.35)', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => <LogRow key={log.id} log={log} />)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/ActivityLog.jsx
git commit -m "feat: tambah halaman log aktivitas dengan filter dan diff viewer"
```

---

### Task 4: Route + Nav Item

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/layout/Layout.jsx`

- [ ] **Step 1: Tambah import dan route di App.jsx**

Di `src/App.jsx`, tambah import setelah baris `import Settings from './pages/Settings'`:
```js
import ActivityLog from './pages/ActivityLog'
```

Di dalam blok `<Route path="/" ...>`, tambah setelah `<Route path="settings" ...>`:
```jsx
<Route path="activity-log" element={<ActivityLog />} />
```

- [ ] **Step 2: Tambah icon History di Layout.jsx**

Di `src/components/layout/Layout.jsx`, tambah `History` ke import lucide-react:
```js
import {
  LayoutDashboard, Link2, Users, Users2, Layers, Package,
  ChevronDown, ChevronRight, ClipboardList, Wallet, ScrollText,
  Settings as SettingsIcon, Building2, ShieldCheck, LogOut,
  ArrowLeft, FileBarChart2, ScanLine, MapPin, History,
} from 'lucide-react'
```

Di array `operatorNavItems`, tambah item baru setelah entry `'Kayu Bernomor'`:
```js
{ label: 'Log Aktivitas', path: '/activity-log', icon: History },
```

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx src/components/layout/Layout.jsx
git commit -m "feat: tambah route /activity-log dan nav item Log Aktivitas"
```

---

### Task 5: Integrasi Audit Trail — Register Kapling

**Files:**
- Modify: `src/pages/register-kapling/hooks/useRegisterKaplingPage.js`

- [ ] **Step 1: Tambah import**

Di bagian atas `useRegisterKaplingPage.js`, tambah import:
```js
import { logActivity, buildDiff } from '../../../lib/activityLog'
```

- [ ] **Step 2: Modifikasi handleSaveEdit**

Cari fungsi `handleSaveEdit` (sekitar baris 241). Ganti seluruh isi fungsi:
```js
async function handleSaveEdit() {
  if (!editRow) return
  if (!editRow.no_kapling?.trim()) { showToast('No. Kapling wajib diisi.', 'error'); return }
  if (!tpkId) { showToast('Profil TPK tidak ditemukan. Coba login ulang.', 'error'); return }
  const isNew  = Boolean(editRow._new)
  const oldRow = isNew ? null : rows.find(r => r.id === editRow.id)
  setEditSaving(true)
  const result = await saveEditedRow({ row: editRow, supabase, tpkId })
  setEditSaving(false)
  showToast(result.message, result.type)
  if (result.closeEditor) setEditRow(null)
  if (result.refresh) {
    fetchData()
    if (isNew) {
      logActivity({ action: 'create', entityType: 'register_kapling', entityLabel: editRow.no_kapling, tpkId, profile })
    } else if (oldRow) {
      const diff = buildDiff(oldRow, editRow, FIELD_DEFS)
      logActivity({ action: 'update', entityType: 'register_kapling', entityId: editRow.id, entityLabel: editRow.no_kapling, diff, tpkId, profile })
    }
  }
}
```

- [ ] **Step 3: Modifikasi handleDelete**

Cari fungsi `handleDelete` (sekitar baris 263). Ganti seluruh isi fungsi:
```js
async function handleDelete() {
  if (!deleteRow || !tpkId) return
  const snapshot = { ...deleteRow }
  setDeleting(true)
  const result = await saveDeletedRow({ row: deleteRow, supabase, tpkId })
  setDeleting(false)
  showToast(result.message, result.type)
  if (result.closeEditor) setDeleteRow(null)
  if (result.refresh) {
    fetchData()
    logActivity({ action: 'delete', entityType: 'register_kapling', entityId: snapshot.id, entityLabel: snapshot.no_kapling, tpkId, profile })
  }
}
```

- [ ] **Step 4: Modifikasi handleBatchDelete**

Cari fungsi `handleBatchDelete` (sekitar baris 274). Ganti blok `if (result.refresh)` yang sudah ada dengan:
```js
setBatchDeleting(false)
showToast(result.message, result.type)
if (result.closeEditor) setShowBatchDelete(false)
if (result.refresh) {
  fetchData()
  logActivity({ action: 'delete', entityType: 'register_kapling', entityLabel: `${[...selectedIds].length} kapling (batch)`, tpkId, profile })
}
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/register-kapling/hooks/useRegisterKaplingPage.js
git commit -m "feat: tambah audit trail di register kapling"
```

---

### Task 6: Integrasi Audit Trail — Pejabat

**Files:**
- Modify: `src/pages/database/DatabasePejabat.jsx`

- [ ] **Step 1: Tambah import**

Di `src/pages/database/DatabasePejabat.jsx`, tambah import:
```js
import { logActivity, buildDiff } from '../../lib/activityLog'
```

- [ ] **Step 2: Modifikasi handleSave**

Cari fungsi `handleSave` (sekitar baris 52). Ubah menjadi:
```js
async function handleSave() {
  if (!tpkId) return showToast('TPK aktif tidak ditemukan. Coba pilih TPK atau login ulang.', 'error')
  if (!form.nama || !form.jabatan) return showToast('Nama dan jabatan wajib diisi', 'error')
  if (editId) {
    const oldRow = data.find(r => r.id === editId)
    const { error } = await supabase.from('tabel_pejabat').update(form).eq('tpk_id', tpkId).eq('id', editId)
    if (error) return showToast(error.message, 'error')
    showToast('Data pejabat diperbarui')
    logActivity({
      action: 'update', entityType: 'pejabat', entityId: editId, entityLabel: form.nama,
      diff: oldRow ? buildDiff(oldRow, form, [
        { key: 'nama', label: 'Nama' }, { key: 'npk', label: 'NPK' },
        { key: 'jabatan', label: 'Jabatan' }, { key: 'aktif', label: 'Aktif' },
      ]) : null,
      tpkId, profile,
    })
  } else {
    const { error } = await supabase.from('tabel_pejabat').insert({ ...form, tpk_id: tpkId })
    if (error) return showToast(error.message, 'error')
    showToast('Pejabat berhasil ditambahkan')
    logActivity({ action: 'create', entityType: 'pejabat', entityLabel: form.nama, tpkId, profile })
  }
  setEditId(null)
  setForm({ nama: '', npk: '', jabatan: '', aktif: true })
  fetchData()
}
```

- [ ] **Step 3: Modifikasi handleDelete**

Cari fungsi `handleDelete` (sekitar baris 68). Ubah menjadi:
```js
async function handleDelete() {
  if (!tpkId) return showToast('TPK aktif tidak ditemukan. Coba pilih TPK atau login ulang.', 'error')
  if (!deleteRow) return
  const snapshot = { ...deleteRow }
  setDeleting(true)
  const { error } = await supabase.from('tabel_pejabat').delete().eq('tpk_id', tpkId).eq('id', deleteRow.id)
  setDeleting(false)
  if (error) return showToast(error.message, 'error')
  setDeleteRow(null)
  fetchData()
  showToast('Pejabat berhasil dihapus')
  logActivity({ action: 'delete', entityType: 'pejabat', entityId: snapshot.id, entityLabel: snapshot.nama, tpkId, profile })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/database/DatabasePejabat.jsx
git commit -m "feat: tambah audit trail di database pejabat"
```

---

### Task 7: Integrasi Audit Trail — Tenaga Kerja

**Files:**
- Modify: `src/pages/database/DatabaseTenaga.jsx`

- [ ] **Step 1: Tambah import**

```js
import { logActivity, buildDiff } from '../../lib/activityLog'
```

- [ ] **Step 2: Modifikasi handleSave — bagian update**

Cari blok `if (editId)` dalam `handleSave` (sekitar baris 122). Tambah `const oldRow` sebelum query dan `logActivity` setelah berhasil:
```js
if (editId) {
  const oldRow = data.find(r => r.id === editId)
  const { error } = await supabase.from('tabel_tenaga_kerja').update(payload).eq('tpk_id', tpkId).eq('id', editId)
  if (error) return showToast(error.message, 'error')
  showToast('Data tenaga diperbarui')
  logActivity({
    action: 'update', entityType: 'tenaga_kerja', entityId: editId, entityLabel: payload.nama,
    diff: oldRow ? buildDiff(oldRow, payload, [
      { key: 'nama', label: 'Nama' }, { key: 'nik', label: 'NIK' },
      { key: 'jabatan', label: 'Jabatan' }, { key: 'aktif', label: 'Aktif' },
    ]) : null,
    tpkId, profile,
  })
}
```

- [ ] **Step 3: Modifikasi handleSave — bagian insert**

Cari blok `else` setelah `if (editId)` (sekitar baris 127). Tambah `logActivity` setelah berhasil:
```js
} else {
  const { error } = await supabase.from('tabel_tenaga_kerja').insert({ ...payload, tpk_id: tpkId })
  if (error) return showToast(error.message, 'error')
  showToast('Tenaga kerja berhasil ditambahkan')
  logActivity({ action: 'create', entityType: 'tenaga_kerja', entityLabel: payload.nama, tpkId, profile })
}
```

- [ ] **Step 4: Modifikasi handleDelete**

Cari fungsi `handleDelete` (sekitar baris 137). Ubah menjadi:
```js
async function handleDelete() {
  if (!tpkId) return showToast('TPK aktif tidak ditemukan. Coba pilih TPK atau login ulang.', 'error')
  if (!deleteRow) return
  const snapshot = { ...deleteRow }
  setDeleting(true)
  const { error } = await supabase.from('tabel_tenaga_kerja').delete().eq('tpk_id', tpkId).eq('id', deleteRow.id)
  setDeleting(false)
  if (error) return showToast(error.message, 'error')
  setDeleteRow(null)
  fetchData()
  showToast('Tenaga kerja berhasil dihapus')
  logActivity({ action: 'delete', entityType: 'tenaga_kerja', entityId: snapshot.id, entityLabel: snapshot.nama, tpkId, profile })
}
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/database/DatabaseTenaga.jsx
git commit -m "feat: tambah audit trail di database tenaga kerja"
```

---

### Task 8: Integrasi Audit Trail — Periode (MainLink)

**Files:**
- Modify: `src/pages/MainLink.jsx`

- [ ] **Step 1: Tambah import**

Di `src/pages/MainLink.jsx`, tambah import:
```js
import { logActivity } from '../lib/activityLog'
```

- [ ] **Step 2: Modifikasi handleCreatePeriode — log setelah insert**

Cari baris setelah insert periode (sekitar baris 315-317):
```js
const { data, error } = await supabase.from('tabel_periode')
  .insert({ periode:label, tgl_awal, tgl_akhir, status:'aktif', tpk_id: scopedTpkId, pejabat_snapshot: pejabatSnapshot }).select().single()
if (error) return showToast(error.message,'error')
```

Tambah baris setelah `if (error)`:
```js
logActivity({ action: 'create', entityType: 'periode', entityId: data.id, entityLabel: label, tpkId: scopedTpkId, profile })
```

- [ ] **Step 3: Modifikasi handleDeletePeriode — log setelah delete**

Cari fungsi `handleDeletePeriode` (sekitar baris 385). Setelah baris `if (error) return showToast(error.message,'error')`, tambah:
```js
logActivity({ action: 'delete', entityType: 'periode', entityId: confirmDelete.id, entityLabel: confirmDelete.periode, tpkId: scopedTpkId, profile })
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/MainLink.jsx
git commit -m "feat: tambah audit trail di periode (MainLink)"
```

---

## Sub-project 2: User Management

### Task 9: Hapus Sistem Tema

**Files:**
- Modify: `src/main.jsx`
- Delete: `src/lib/hooks/useTheme.js`

- [ ] **Step 1: Update main.jsx**

Di `src/main.jsx`:

Hapus baris import:
```js
import { initTheme } from './lib/hooks/useTheme'
```

Hapus baris pemanggilan:
```js
initTheme()
```

Ganti dengan (letakkan sebelum `ReactDOM.createRoot(...)`):
```js
document.documentElement.classList.add('dark')
```

Hasil akhir bagian atas `main.jsx`:
```js
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// ... ErrorBoundary class tetap sama ...

document.documentElement.classList.add('dark')

ReactDOM.createRoot(document.getElementById('root')).render(
  // ... sama seperti sebelumnya
)
```

- [ ] **Step 2: Hapus file useTheme.js**

```bash
git rm src/lib/hooks/useTheme.js
```

- [ ] **Step 3: Commit**

```bash
git add src/main.jsx
git commit -m "refactor: hapus sistem tema, dark mode jadi default permanen"
```

---

### Task 10: Reset Password Mandiri di Settings.jsx

**Files:**
- Modify: `src/pages/Settings.jsx`

- [ ] **Step 1: Update import**

Ganti baris import di `src/pages/Settings.jsx`:
```js
import { UserCog, Save, Check, AlertCircle, Mail } from 'lucide-react'
import { useAuth } from '../lib/AuthProvider'
import { supabase } from '../lib/supabase'
```

- [ ] **Step 2: Tambah session ke destructuring useAuth**

Ganti:
```js
const { profile, tpk, updateProfile } = useAuth()
```
Dengan:
```js
const { profile, tpk, updateProfile, session } = useAuth()
```

- [ ] **Step 3: Tambah state dan handler reset password**

Setelah blok `useState` yang sudah ada, tambah:
```js
const [resetSent,    setResetSent]    = useState(false)
const [resetSending, setResetSending] = useState(false)
```

Setelah fungsi `handleSave`, tambah:
```js
async function handleResetPassword() {
  if (resetSending || resetSent) return
  setResetSending(true)
  await supabase.auth.resetPasswordForEmail(session?.user?.email, {
    redirectTo: window.location.origin + '/login',
  })
  setResetSending(false)
  setResetSent(true)
}
```

- [ ] **Step 4: Tambah section reset password di JSX**

Tambah section baru setelah `</section>` pertama (section Akun) dan sebelum closing `</div>` utama:

```jsx
<section style={{ marginTop: 16, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: 20 }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
    <div style={{ width: 32, height: 32, borderRadius: 3, background: 'rgba(0,180,255,0.08)', border: '1px solid rgba(0,180,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Mail size={15} style={{ color: 'rgba(0,180,255,0.9)' }} />
    </div>
    <div>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace', margin: 0 }}>Password</h2>
      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', marginTop: 3, fontFamily: 'monospace' }}>Reset password via email.</p>
    </div>
  </div>
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
    <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>
      Link akan dikirim ke{' '}
      <span style={{ color: 'rgba(255,255,255,0.7)' }}>{session?.user?.email}</span>
    </span>
    <button
      onClick={handleResetPassword}
      disabled={resetSending || resetSent}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '8px 14px', borderRadius: 3,
        border: `1px solid ${resetSent ? 'rgba(255,255,255,0.06)' : 'rgba(0,180,255,0.3)'}`,
        background: resetSent ? 'rgba(255,255,255,0.06)' : 'rgba(0,180,255,0.12)',
        color: resetSent ? 'rgba(255,255,255,0.32)' : 'rgba(0,180,255,0.9)',
        cursor: (resetSending || resetSent) ? 'not-allowed' : 'pointer',
        fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
      }}
    >
      <Mail size={13} />
      {resetSent ? 'Email terkirim' : resetSending ? 'Mengirim...' : 'Kirim Link Reset'}
    </button>
    {resetSent && (
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#00ff88', fontFamily: 'monospace' }}>
        <Check size={13} /> Cek inbox email kamu
      </span>
    )}
  </div>
</section>
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/Settings.jsx
git commit -m "feat: tambah reset password mandiri di settings"
```

---

## Sub-project 3: Export Excel

### Task 11: Export Excel — Register Kapling

**Files:**
- Create: `src/pages/register-kapling/utils/registerKaplingExcelExport.js`
- Modify: `src/pages/register-kapling/components/RegisterKaplingHeader.jsx`
- Modify: `src/pages/register-kapling/hooks/useRegisterKaplingPage.js`
- Modify: `src/pages/register-kapling/index.jsx`

- [ ] **Step 1: Buat util export**

Buat file `src/pages/register-kapling/utils/registerKaplingExcelExport.js`:

```js
import * as XLSX from 'xlsx'
import { FIELD_DEFS } from './registerKaplingConstants'

const EXPORT_COLS = FIELD_DEFS.map(f => ({
  key:   f.key,
  label: f.label.replace(/<[^>]+>/g, ''),
}))

export function exportRegisterKaplingToExcel({ rows, tpkName = 'tpk' }) {
  const headers = EXPORT_COLS.map(c => c.label)
  const data    = rows.map(row => EXPORT_COLS.map(c => row[c.key] ?? ''))

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data])

  ws['!cols'] = EXPORT_COLS.map((c, i) => {
    const maxLen = Math.max(
      c.label.length,
      ...rows.slice(0, 100).map(r => String(r[c.key] ?? '').length)
    )
    return { wch: Math.min(maxLen + 2, 40) }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Register Kapling')

  const today    = new Date().toISOString().split('T')[0]
  const safeName = tpkName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
  XLSX.writeFile(wb, `register-kapling-${safeName}-${today}.xlsx`)
}
```

- [ ] **Step 2: Tambah prop onExport dan tombol di RegisterKaplingHeader.jsx**

Di `src/pages/register-kapling/components/RegisterKaplingHeader.jsx`:

Tambah `Download` ke import lucide:
```js
import { Download, FileBarChart2, FileText, Plus, Settings, Tag, Upload } from 'lucide-react'
```

Tambah `onExport` ke destructuring props (setelah `onDkhpImportFiles`):
```js
export default function RegisterKaplingHeader({
  colMap,
  dkhpImportRef,
  fileRef,
  invoisRef,
  onDkhpImportFiles,
  onExport,
  onFileChange,
  onInvoisFileChange,
  onAddRow,
  onOpenFixPrefix,
  realtimeStatus,
  rows,
  setDraftMap,
  setShowSettings,
}) {
```

Di bagian action buttons, tambah tombol export sebelum tombol Settings:
```jsx
{/* Export Excel */}
<button
  onClick={onExport}
  title="Export ke Excel"
  style={{ ...iconBtn, color: 'rgba(255,255,255,0.5)' }}
  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,136,0.07)'; e.currentTarget.style.color = '#00ff88'; e.currentTarget.style.borderColor = 'rgba(0,255,136,0.2)' }}
  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
>
  <Download size={14} />
</button>
```

- [ ] **Step 3: Tambah import dan handler di useRegisterKaplingPage.js**

Tambah import di `src/pages/register-kapling/hooks/useRegisterKaplingPage.js`:
```js
import { exportRegisterKaplingToExcel } from '../utils/registerKaplingExcelExport'
```

Tambah fungsi handler di dalam hook (setelah fungsi lain, sebelum return):
```js
function handleExport() {
  exportRegisterKaplingToExcel({
    rows:    searchedRows,
    tpkName: profile?.tabel_tpk?.namatpk || 'tpk',
  })
}
```

Di return object dari hook, tambah:
```js
handleExport,
```

- [ ] **Step 4: Pass onExport ke RegisterKaplingHeader di index.jsx**

Di `src/pages/register-kapling/index.jsx`, di props `<RegisterKaplingHeader>`, tambah:
```jsx
onExport={page.handleExport}
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/register-kapling/utils/registerKaplingExcelExport.js \
        src/pages/register-kapling/components/RegisterKaplingHeader.jsx \
        src/pages/register-kapling/hooks/useRegisterKaplingPage.js \
        src/pages/register-kapling/index.jsx
git commit -m "feat: tambah export Excel di register kapling"
```

---

### Task 12: Export Excel — Rekap Periode (MainLink)

**Files:**
- Modify: `src/pages/MainLink.jsx`

- [ ] **Step 1: Tambah import XLSX dan Download icon**

Di `src/pages/MainLink.jsx`, tambah ke import yang ada:
```js
import * as XLSX from 'xlsx'
```

Di import lucide-react yang sudah ada di MainLink, tambah `Download`:
```js
import { Plus, Save, CalendarDays, X, Trash2, RefreshCw, Settings2, ChevronDown, ChevronUp, Printer, FileText, ClipboardCheck, Receipt, Wallet, ClipboardList, FileSpreadsheet, Download } from 'lucide-react'
```

- [ ] **Step 2: Tambah handler handleExportRekap**

Di dalam komponen `MainLink`, tambah fungsi setelah `handleSave`:
```js
function handleExportRekap() {
  if (!selectedPeriode || !rows.length) return
  const headers = ['No', 'Uraian', 'Satuan', 'Fisik', 'Tarif (Rp)', 'Jumlah (Rp)']
  const data = rows.map(row => [
    row.no,
    row.uraian,
    row.satuan,
    row.fisik,
    row.tarif,
    Math.round((Number(row.fisik) || 0) * (Number(row.tarif) || 0)),
  ])
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
  ws['!cols'] = [{ wch: 4 }, { wch: 42 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 16 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Periode')
  const safePeriode = selectedPeriode.periode.replace(/\//g, '-')
  const kode = profile?.tabel_tpk?.kode_tpk || 'tpk'
  XLSX.writeFile(wb, `rekap-${safePeriode}-${kode}.xlsx`)
}
```

- [ ] **Step 3: Tambah tombol export di JSX**

Cari section yang menampilkan tabel pekerjaan di JSX (sekitar baris dengan "Main Link" atau header tabel). Tambah tombol export di dekat tombol Save atau header section:

```jsx
{selectedPeriode && rows.length > 0 && (
  <button
    onClick={handleExportRekap}
    style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '7px 12px', borderRadius: 3,
      border: '1px solid rgba(0,255,136,0.2)',
      background: 'rgba(0,255,136,0.07)',
      color: '#00ff88', fontFamily: 'monospace', fontSize: 12, cursor: 'pointer',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,136,0.12)' }}
    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,255,136,0.07)' }}
  >
    <Download size={13} /> Export Excel
  </button>
)}
```

- [ ] **Step 4: Version bump**

Di `package.json`, update `"version"` dari `"0.36.0"` ke `"0.37.0"`.

Di `src/changelog.js`, tambah entry baru di bagian atas array `changelog`:
```js
{
  version: '0.37.0',
  date: '2026-05-23',
  items: [
    { type: 'feat',     text: 'Tambah audit trail — log aktivitas create/update/delete di 4 modul' },
    { type: 'refactor', text: 'Hapus sistem tema, dark mode jadi default permanen' },
    { type: 'feat',     text: 'Tambah reset password mandiri di halaman Settings' },
    { type: 'feat',     text: 'Tambah export Excel di Register Kapling dan Rekap Periode' },
  ]
},
```

- [ ] **Step 5: Commit final**

```bash
git add src/pages/MainLink.jsx package.json src/changelog.js
git commit -m "feat: tambah export Excel di rekap periode

chore: bump versi ke v0.37.0"
```

---

## Self-review Checklist (sudah dilakukan)

- [x] Semua requirements dari spec dicakup (audit trail, hapus tema, reset password, export)
- [x] Tidak ada placeholder atau TBD
- [x] `logActivity` signature konsisten di semua task (5–8)
- [x] `buildDiff` didefinisikan di Task 2, dipakai di Task 5–7
- [x] `searchedRows` tersedia di `useRegisterKaplingPage` (dari `buildRegisterKaplingTableState`)
- [x] `profile` tersedia di semua komponen yang mengintegrasikan logActivity
- [x] RLS migration di Task 1 sudah cover insert policy untuk client-side logging
- [x] Version bump hanya di Task 12 (satu commit di akhir, sesuai konvensi)
