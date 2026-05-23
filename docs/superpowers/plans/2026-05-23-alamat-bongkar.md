# Database Alamat Bongkar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah tabel `tabel_alamat_bongkar` beserta halaman CRUD, dan integrasi dropdown + quick-save ke form surat SKSHHK dan modal QR di DkhpSkshhk.

**Architecture:** Tabel baru di Supabase dengan RLS pola `my_tpk_id()`, halaman CRUD standalone mengikuti pola `DatabasePejabat.jsx`, integrasi ke `DkhpSkshhk.jsx` via state `alamatOptions` yang di-fetch saat form/modal dibuka.

**Tech Stack:** React 18, Supabase (PostgreSQL + RLS), lucide-react, inline styles (dark-themed)

---

## File Structure

| File | Status | Tanggung Jawab |
|---|---|---|
| `supabase/migrations/20260523000001_create_tabel_alamat_bongkar.sql` | Create | DDL tabel + RLS |
| `src/pages/database/DatabaseAlamatBongkar.jsx` | Create | Halaman CRUD standalone |
| `src/components/layout/Layout.jsx` | Modify | Tambah nav item Database |
| `src/App.jsx` | Modify | Tambah import + route |
| `src/pages/DkhpSkshhk.jsx` | Modify | State + fetch + 2 dropdown + 2 quick-save + 1 mini-modal |
| `package.json` | Modify | Bump versi ke 0.36.0 |
| `src/changelog.js` | Modify | Entry versi baru |

---

### Task 1: Migrasi database — buat tabel_alamat_bongkar

**Files:**
- Create: `supabase/migrations/20260523000001_create_tabel_alamat_bongkar.sql`

- [ ] **Step 1: Buat file migrasi**

Buat file `supabase/migrations/20260523000001_create_tabel_alamat_bongkar.sql` dengan isi:

```sql
-- Tabel database alamat bongkar/tujuan — menyimpan alamat yang sering digunakan
-- per TPK untuk autofill di form surat SKSHHK dan modal QR.

create table if not exists tabel_alamat_bongkar (
  id             uuid primary key default gen_random_uuid(),
  tpk_id         uuid not null,
  label          text not null,
  end_user       text,
  alamat_lengkap text,
  kota           text,
  created_at     timestamptz default now()
);

create index if not exists tabel_alamat_bongkar_tpk_id_idx
  on tabel_alamat_bongkar (tpk_id);

alter table tabel_alamat_bongkar enable row level security;

drop policy if exists "rls_tabel_alamat_bongkar_all" on tabel_alamat_bongkar;
create policy "rls_tabel_alamat_bongkar_all" on tabel_alamat_bongkar for all
  using (tpk_id = my_tpk_id() or is_admin())
  with check (tpk_id = my_tpk_id() or is_admin());
```

- [ ] **Step 2: Jalankan migrasi**

```bash
npm run migrate
```

Expected: output tanpa error. Verifikasi di Supabase dashboard → Table Editor bahwa tabel `tabel_alamat_bongkar` muncul dengan kolom yang benar dan RLS enabled.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260523000001_create_tabel_alamat_bongkar.sql
git commit -m "feat: tambah tabel_alamat_bongkar dengan RLS"
```

---

### Task 2: Halaman CRUD DatabaseAlamatBongkar

**Files:**
- Create: `src/pages/database/DatabaseAlamatBongkar.jsx`

- [ ] **Step 1: Buat file halaman**

Buat `src/pages/database/DatabaseAlamatBongkar.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthProvider'
import { getEffectiveTpkId } from '../../lib/effectiveTpk'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import TpkRequiredState from '../../components/layout/TpkRequiredState'
import Toast from '../../components/ui/Toast'
import { TableSkeleton } from '../../components/ui/LoadingState'
import { Plus, Pencil, Trash2, X } from 'lucide-react'

const emptyForm = { label: '', end_user: '', alamat_lengkap: '', kota: '' }

export default function DatabaseAlamatBongkar() {
  const { profile, activeTpkId } = useAuth()
  const tpkId = getEffectiveTpkId({ activeTpkId, profile })
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState(null)
  const [deleteRow, setDeleteRow] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (tpkId) fetchData()
    else {
      setData([])
      setLoading(false)
    }
  }, [tpkId])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('tabel_alamat_bongkar')
      .select('*')
      .eq('tpk_id', tpkId)
      .order('label')
    setData(data || [])
    setLoading(false)
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function openAdd() { setForm(emptyForm); setEditId(null); setShowForm(true) }
  function openEdit(row) {
    setForm({ label: row.label, end_user: row.end_user || '', alamat_lengkap: row.alamat_lengkap || '', kota: row.kota || '' })
    setEditId(row.id)
    setShowForm(true)
  }

  async function handleSubmit() {
    if (!tpkId) return showToast('TPK aktif tidak ditemukan.', 'error')
    if (!form.label.trim()) return showToast('Label wajib diisi', 'error')
    if (editId) {
      const { error } = await supabase
        .from('tabel_alamat_bongkar')
        .update(form)
        .eq('tpk_id', tpkId)
        .eq('id', editId)
      if (error) return showToast(error.message, 'error')
      showToast('Data alamat diperbarui')
    } else {
      const { error } = await supabase
        .from('tabel_alamat_bongkar')
        .insert({ ...form, tpk_id: tpkId })
      if (error) return showToast(error.message, 'error')
      showToast('Alamat berhasil ditambahkan')
    }
    setShowForm(false)
    fetchData()
  }

  async function handleDelete() {
    if (!tpkId || !deleteRow) return
    setDeleting(true)
    const { error } = await supabase
      .from('tabel_alamat_bongkar')
      .delete()
      .eq('tpk_id', tpkId)
      .eq('id', deleteRow.id)
    setDeleting(false)
    if (error) return showToast(error.message, 'error')
    setDeleteRow(null)
    showToast('Data berhasil dihapus')
    fetchData()
  }

  const INP = {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#f0f0f0', borderRadius: 3, outline: 'none', fontFamily: 'monospace',
    fontSize: 12, padding: '7px 10px', width: '100%', boxSizing: 'border-box',
  }

  if (!tpkId) return <TpkRequiredState />

  return (
    <div style={{ padding: 24, minHeight: '100%', background: '#0a0a0a', color: '#f0f0f0' }}>
      <style>{`
        .dab-row:hover td { background: rgba(255,255,255,0.02) !important; }
        .dab-inp:focus { border-color: rgba(0,255,136,0.5) !important; box-shadow: 0 0 0 2px rgba(0,255,136,0.07); }
        .dab-inp::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>

      <Toast toast={toast} />

      <ConfirmDialog
        open={!!deleteRow}
        title="Hapus Alamat?"
        message="Data alamat bongkar ini akan dihapus dari database."
        detail={deleteRow?.label}
        loading={deleting}
        onCancel={() => setDeleteRow(null)}
        onConfirm={handleDelete}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace' }}>Database Alamat Bongkar</h1>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'monospace' }}>Kelola daftar alamat bongkar/tujuan yang sering digunakan</p>
        </div>
        <button onClick={openAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#00ff88', color: '#0a0a0a', borderRadius: 3, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        ><Plus size={13}/> tambah alamat</button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 3, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#00ff88', fontWeight: 600 }}>{editId ? 'edit alamat' : 'tambah alamat baru'}</p>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', lineHeight: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = '#f0f0f0'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            ><X size={15}/></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(0,255,136,0.7)', display: 'block', marginBottom: 4 }}>Label / Nama Singkat *</label>
              <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                style={INP} className="dab-inp" placeholder="mis. Pak Eko - Kalipuro"/>
            </div>
            <div>
              <label style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(0,255,136,0.7)', display: 'block', marginBottom: 4 }}>Kota / Kabupaten</label>
              <input value={form.kota} onChange={e => setForm(f => ({ ...f, kota: e.target.value }))}
                style={INP} className="dab-inp" placeholder="BANYUWANGI"/>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(0,255,136,0.7)', display: 'block', marginBottom: 4 }}>End User (untuk QR)</label>
            <input value={form.end_user} onChange={e => setForm(f => ({ ...f, end_user: e.target.value }))}
              style={INP} className="dab-inp" placeholder="END USER KAB. BANYUWANGI atau CV MAJU JAYA"/>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(0,255,136,0.7)', display: 'block', marginBottom: 4 }}>Alamat Lengkap (untuk QR)</label>
            <textarea rows={2} value={form.alamat_lengkap} onChange={e => setForm(f => ({ ...f, alamat_lengkap: e.target.value }))}
              style={{ ...INP, resize: 'vertical' }} className="dab-inp"
              placeholder="Nama, Jl. Joyoboyo RT/RW 001/001, Ds. Kalipuro, Kec. Kalipuro"/>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSubmit} style={{ padding: '7px 16px', background: '#00ff88', color: '#0a0a0a', borderRadius: 3, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>
              {editId ? 'perbarui' : 'simpan'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: 'rgba(255,255,255,0.65)', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}>batal</button>
          </div>
        </div>
      )}

      {/* Tabel */}
      <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        {loading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : data.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', fontSize: 11, fontStyle: 'italic' }}>Belum ada data alamat bongkar.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
            <thead>
              <tr>
                {['No','Label','End User','Alamat Lengkap','Kota',''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.id} className="dab-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.25)', fontSize: 11, width: 40 }}>{i + 1}</td>
                  <td style={{ padding: '10px 12px', color: '#f0f0f0', fontWeight: 500 }}>{row.label}</td>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.5)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.end_user || '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.45)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.alamat_lengkap || '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.35)' }}>{row.kota || '—'}</td>
                  <td style={{ padding: '10px 10px', width: 60 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                      <button onClick={() => openEdit(row)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.2)', lineHeight: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#00ff88'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                      ><Pencil size={13}/></button>
                      <button onClick={() => setDeleteRow(row)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.2)', lineHeight: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ff6b6b'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                      ><Trash2 size={13}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verifikasi manual**

Buka app, navigasi ke halaman (belum ada route — akan ditambah di Task 3). Cukup pastikan file tidak ada syntax error dengan melihat apakah dev server crash.

- [ ] **Step 3: Commit**

```bash
git add src/pages/database/DatabaseAlamatBongkar.jsx
git commit -m "feat: tambah halaman CRUD DatabaseAlamatBongkar"
```

---

### Task 3: Route + Nav item

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/layout/Layout.jsx`

- [ ] **Step 1: Tambah import + route di App.jsx**

Di `src/App.jsx`, tambahkan import setelah baris 15:
```js
// Baris lama (15):
import DatabaseTenaga from './pages/database/DatabaseTenaga'
// Tambah setelah baris 15:
import DatabaseAlamatBongkar from './pages/database/DatabaseAlamatBongkar'
```

Lalu tambahkan route setelah baris 184 (setelah `<Route path="database/tarif" ...>`):
```jsx
// Baris lama (184):
<Route path="database/tarif" element={<DatabaseTarif />} />
// Tambah setelah:
<Route path="database/alamat-bongkar" element={<DatabaseAlamatBongkar />} />
```

- [ ] **Step 2: Tambah nav item di Layout.jsx**

Di `src/components/layout/Layout.jsx`, ubah bagian nav Database (sekitar baris 38-43).

Cari:
```js
{
  label: 'Database', icon: null,
  children: [
    { label: 'Pejabat',      path: '/database/pejabat', icon: Users },
    { label: 'Tenaga Kerja', path: '/database/tenaga',  icon: Users2 },
  ],
},
```

Ganti dengan:
```js
{
  label: 'Database', icon: null,
  children: [
    { label: 'Pejabat',        path: '/database/pejabat',        icon: Users },
    { label: 'Tenaga Kerja',   path: '/database/tenaga',         icon: Users2 },
    { label: 'Alamat Bongkar', path: '/database/alamat-bongkar', icon: MapPin },
  ],
},
```

Lalu tambahkan `MapPin` ke import lucide-react di baris 1 Layout.jsx. Cek baris import lucide-react yang sudah ada dan tambahkan `MapPin` di sana.

- [ ] **Step 3: Verifikasi manual**

Buka app, lihat sidebar — harus ada item "Alamat Bongkar" di grup Database. Klik → halaman CRUD muncul. Coba tambah 1 entri, edit, hapus. Pastikan tidak ada error di console.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/components/layout/Layout.jsx
git commit -m "feat: tambah route dan nav item database alamat bongkar"
```

---

### Task 4: DkhpSkshhk — state baru + fetchAlamatOptions

**Files:**
- Modify: `src/pages/DkhpSkshhk.jsx`

- [ ] **Step 1: Tambah Bookmark ke import lucide-react**

Di baris 7-8 `src/pages/DkhpSkshhk.jsx`, cari:
```js
  SlidersHorizontal, ChevronLeft, ChevronRight, QrCode,
```
Ganti dengan:
```js
  SlidersHorizontal, ChevronLeft, ChevronRight, QrCode, Bookmark,
```

- [ ] **Step 2: Tambah state variabel**

Setelah baris 313 (`const [qrPenerbit, setQrPenerbit] = useState('')`), tambahkan:
```js
  const [alamatOptions, setAlamatOptions] = useState([])
  const [showSaveAlamat, setShowSaveAlamat] = useState(false)
  const [saveAlamatLabel, setSaveAlamatLabel] = useState('')
  const [saveAlamatTarget, setSaveAlamatTarget] = useState(null) // 'form' | 'qr'
```

- [ ] **Step 3: Tambah fungsi fetchAlamatOptions + handleSaveAlamat**

Setelah useEffect `[qrRow, tpkId]` yang berakhir di baris 381 (`}, [qrRow, tpkId])`), tambahkan dua fungsi:

```js
  async function fetchAlamatOptions() {
    if (!tpkId) return
    const { data } = await supabase
      .from('tabel_alamat_bongkar')
      .select('id, label, end_user, alamat_lengkap, kota')
      .eq('tpk_id', tpkId)
      .order('label', { ascending: true })
    setAlamatOptions(data || [])
  }

  async function handleSaveAlamat() {
    const label = saveAlamatLabel.trim()
    if (!label) return showToast('Label wajib diisi', 'error')
    let payload
    if (saveAlamatTarget === 'form') {
      payload = {
        tpk_id: tpkId,
        label,
        alamat_lengkap: editRow?.tujuan || '',
        kota: editRow?.kota_tujuan || '',
        end_user: deriveEndUser(editRow?.tujuan, editRow?.kota_tujuan),
      }
    } else {
      payload = {
        tpk_id: tpkId,
        label,
        end_user: qrForm?.endUser || '',
        alamat_lengkap: qrForm?.alamatBongkar || '',
        kota: qrRow?.kota_tujuan || '',
      }
    }
    const { error } = await supabase.from('tabel_alamat_bongkar').insert(payload)
    if (error) return showToast(error.message, 'error')
    showToast('Alamat berhasil disimpan ke database')
    setShowSaveAlamat(false)
    setSaveAlamatLabel('')
    fetchAlamatOptions()
  }
```

- [ ] **Step 4: Modifikasi openAdd, openEdit, openQr**

Cari baris 495-511:
```js
  function openAdd()      { setEditRow({ ...EMPTY_FORM, _new: true, _dateYear: new Date().getFullYear() }) }
  function openEdit(row)  { setEditRow({ ...row, _dateYear: dateYear(row.tanggal) || dateYear(row.tanggal_dimatikan) || new Date().getFullYear() }) }

  function openQr(row) {
    setQrRow(row)
    setQrForm({
      noSkshhk:      row.no_skshhk || '',
      tpkLabel:      tpkName,
      endUser:       deriveEndUser(row.tujuan, row.kota_tujuan),
      alamatBongkar: row.tujuan || '',
      tanggalAwal:   row.tanggal || '',
      durasiHari:    1,
      penerbit:      '',
      tanggalTerbit: formatTanggalTerbit(row.tanggal),
    })
    setQrDataUrl('')
  }
```

Ganti dengan:
```js
  function openAdd() {
    setEditRow({ ...EMPTY_FORM, _new: true, _dateYear: new Date().getFullYear() })
    fetchAlamatOptions()
  }
  function openEdit(row) {
    setEditRow({ ...row, _dateYear: dateYear(row.tanggal) || dateYear(row.tanggal_dimatikan) || new Date().getFullYear() })
    fetchAlamatOptions()
  }

  function openQr(row) {
    setQrRow(row)
    setQrForm({
      noSkshhk:      row.no_skshhk || '',
      tpkLabel:      tpkName,
      endUser:       deriveEndUser(row.tujuan, row.kota_tujuan),
      alamatBongkar: row.tujuan || '',
      tanggalAwal:   row.tanggal || '',
      durasiHari:    1,
      penerbit:      '',
      tanggalTerbit: formatTanggalTerbit(row.tanggal),
    })
    setQrDataUrl('')
    fetchAlamatOptions()
  }
```

- [ ] **Step 5: Verifikasi**

Dev server tidak crash. Buka DkhpSkshhk, klik edit baris mana saja — tidak ada error di console. (Dropdown belum tampil karena belum ditambahkan ke JSX.)

- [ ] **Step 6: Commit**

```bash
git add src/pages/DkhpSkshhk.jsx
git commit -m "feat: tambah state alamatOptions dan fetchAlamatOptions di DkhpSkshhk"
```

---

### Task 5: DkhpSkshhk — integrasi ke form surat

**Files:**
- Modify: `src/pages/DkhpSkshhk.jsx`

- [ ] **Step 1: Modifikasi render field surat (tujuan)**

Cari blok yang dimulai dengan (sekitar baris 1458):
```jsx
            {[
              { label: 'Pemohon / Sopir', key: 'pemohon_sopir' },
              { label: 'Pembeli',         key: 'pembeli' },
              { label: 'Tujuan (alamat lengkap)', key: 'tujuan', multiline: true },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.38)', marginBottom: 4, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</label>
                {f.multiline ? (
                  <textarea rows={2} value={editRow[f.key] ?? ''} onChange={e => setEditRow(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '7px 10px', fontSize: 12, color: '#f0f0f0', fontFamily: 'monospace', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}/>
                ) : (
                  <input type="text" value={editRow[f.key] ?? ''} onChange={e => setEditRow(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '7px 10px', fontSize: 12, color: '#f0f0f0', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}/>
                )}
              </div>
            ))}
```

Ganti dengan:
```jsx
            {[
              { label: 'Pemohon / Sopir', key: 'pemohon_sopir' },
              { label: 'Pembeli',         key: 'pembeli' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.38)', marginBottom: 4, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</label>
                <input type="text" value={editRow[f.key] ?? ''} onChange={e => setEditRow(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '7px 10px', fontSize: 12, color: '#f0f0f0', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}/>
              </div>
            ))}

            {/* Tujuan — dengan dropdown pilih alamat dan quick-save */}
            <div style={{ marginBottom: 10 }}>
              {alamatOptions.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: 'block', fontSize: 10, color: 'rgba(0,255,136,0.5)', marginBottom: 4, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pilih dari database alamat</label>
                  <select
                    value=""
                    onChange={e => {
                      const item = alamatOptions.find(a => a.id === e.target.value)
                      if (!item) return
                      setEditRow(p => ({ ...p, tujuan: item.alamat_lengkap || '', kota_tujuan: item.kota || '' }))
                    }}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,255,136,0.18)', borderRadius: 3, padding: '7px 10px', fontSize: 12, color: '#f0f0f0', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
                  >
                    <option value="">— pilih alamat tersimpan —</option>
                    {alamatOptions.map(a => (
                      <option key={a.id} value={a.id}>{a.label}{a.kota ? ` — ${a.kota}` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tujuan (alamat lengkap)</label>
                <button
                  type="button"
                  onClick={() => { setSaveAlamatTarget('form'); setSaveAlamatLabel((editRow?.tujuan || '').slice(0, 20).trim()); setShowSaveAlamat(true) }}
                  disabled={!editRow?.tujuan?.trim()}
                  title="Simpan alamat ini ke database"
                  style={{ background: 'none', border: 'none', cursor: editRow?.tujuan?.trim() ? 'pointer' : 'not-allowed', color: 'rgba(0,255,136,0.4)', opacity: editRow?.tujuan?.trim() ? 1 : 0.3, padding: 0, lineHeight: 0 }}
                  onMouseEnter={e => { if (editRow?.tujuan?.trim()) e.currentTarget.style.color = '#00ff88' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(0,255,136,0.4)' }}
                >
                  <Bookmark size={12}/>
                </button>
              </div>
              <textarea
                rows={2}
                value={editRow.tujuan ?? ''}
                onChange={e => setEditRow(p => ({ ...p, tujuan: e.target.value }))}
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '7px 10px', fontSize: 12, color: '#f0f0f0', fontFamily: 'monospace', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
```

- [ ] **Step 2: Verifikasi manual**

Buka DkhpSkshhk → klik edit baris mana saja. Jika ada data di `tabel_alamat_bongkar`, dropdown "Pilih dari database alamat" muncul dengan warna border hijau. Pilih salah satu → field tujuan dan kota_tujuan ter-autofill. Ikon Bookmark muncul di kanan label "TUJUAN" dan aktif jika tujuan tidak kosong.

- [ ] **Step 3: Commit**

```bash
git add src/pages/DkhpSkshhk.jsx
git commit -m "feat: tambah dropdown alamat dan quick-save di form surat SKSHHK"
```

---

### Task 6: DkhpSkshhk — integrasi ke modal QR

**Files:**
- Modify: `src/pages/DkhpSkshhk.jsx`

- [ ] **Step 1: Tambah dropdown di modal QR**

Cari blok read-only fields yang diakhiri dengan (sekitar baris 1550-1553):
```jsx
                  <div style={{ padding: '6px 8px', fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 3 }}>{f.value}</div>
                </div>
              ))}

                {/* End user */}
```

Tambahkan setelah blok read-only fields (antara `])}` dan `{/* End user */}`):
```jsx
                {/* Dropdown pilih dari database alamat */}
                {alamatOptions.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: 9, color: 'rgba(0,255,136,0.5)', marginBottom: 3, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pilih alamat tersimpan</label>
                    <select
                      value=""
                      onChange={e => {
                        const item = alamatOptions.find(a => a.id === e.target.value)
                        if (!item) return
                        setQrForm(p => ({ ...p, endUser: item.end_user || '', alamatBongkar: item.alamat_lengkap || '' }))
                      }}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,255,136,0.18)', borderRadius: 3, padding: '5px 8px', fontSize: 11, color: '#f0f0f0', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
                    >
                      <option value="">— pilih dari database —</option>
                      {alamatOptions.map(a => (
                        <option key={a.id} value={a.id}>{a.label}{a.kota ? ` — ${a.kota}` : ''}</option>
                      ))}
                    </select>
                  </div>
                )}
```

- [ ] **Step 2: Tambah quick-save di label Alamat Bongkar**

Cari (sekitar baris 1567-1568):
```jsx
                {/* Alamat bongkar */}
                <div>
                  <label style={{ display: 'block', fontSize: 9, color: 'rgba(255,255,255,0.38)', marginBottom: 3, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alamat Bongkar</label>
```

Ganti label-nya menjadi (ubah `<label>` tunggal jadi flex div):
```jsx
                {/* Alamat bongkar */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <label style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alamat Bongkar</label>
                    <button
                      type="button"
                      onClick={() => { setSaveAlamatTarget('qr'); setSaveAlamatLabel((qrForm?.endUser || '').slice(0, 20).trim()); setShowSaveAlamat(true) }}
                      disabled={!qrForm?.alamatBongkar?.trim()}
                      title="Simpan alamat ini ke database"
                      style={{ background: 'none', border: 'none', cursor: qrForm?.alamatBongkar?.trim() ? 'pointer' : 'not-allowed', color: 'rgba(0,255,136,0.4)', opacity: qrForm?.alamatBongkar?.trim() ? 1 : 0.3, padding: 0, lineHeight: 0 }}
                      onMouseEnter={e => { if (qrForm?.alamatBongkar?.trim()) e.currentTarget.style.color = '#00ff88' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(0,255,136,0.4)' }}
                    >
                      <Bookmark size={11}/>
                    </button>
                  </div>
```

- [ ] **Step 3: Verifikasi manual**

Buka DkhpSkshhk → klik ikon QR pada baris → modal QR terbuka. Jika ada data alamat, dropdown "Pilih alamat tersimpan" muncul. Pilih → endUser dan alamatBongkar ter-update dan QR live-update. Ikon Bookmark muncul di kanan label "ALAMAT BONGKAR".

- [ ] **Step 4: Commit**

```bash
git add src/pages/DkhpSkshhk.jsx
git commit -m "feat: tambah dropdown alamat dan quick-save di modal QR SKSHHK"
```

---

### Task 7: DkhpSkshhk — mini-modal quick-save

**Files:**
- Modify: `src/pages/DkhpSkshhk.jsx`

- [ ] **Step 1: Tambah mini-modal ke JSX**

Cari elemen terakhir sebelum penutupan `</div>` paling luar di return statement. Ini ada di sekitar baris terakhir file, setelah blok context menu (`{contextMenu && ...}`).

Cari bagian ini (mendekati akhir return):
```jsx
      {/* Area cetak QR */}
      <div id="qr-print-area" ...>
```

Tambahkan mini-modal SEBELUM `{/* Area cetak QR */}`:
```jsx
      {/* Mini-modal quick-save alamat */}
      {showSaveAlamat && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
          <div style={{ background: '#111', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 4, padding: 20, maxWidth: 340, width: '100%', margin: '0 16px' }}>
            <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#00ff88', fontWeight: 600, marginBottom: 12 }}>simpan ke database alamat</p>
            <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.38)', marginBottom: 4, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Label / nama singkat</label>
            <input
              type="text"
              autoFocus
              value={saveAlamatLabel}
              onChange={e => setSaveAlamatLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveAlamat() }}
              placeholder="mis. Pak Eko - Kalipuro"
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '7px 10px', fontSize: 12, color: '#f0f0f0', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setShowSaveAlamat(false); setSaveAlamatLabel('') }}
                style={{ flex: 1, padding: '7px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}>batal</button>
              <button
                onClick={handleSaveAlamat}
                style={{ flex: 1, padding: '7px 12px', background: '#00ff88', color: '#0a0a0a', borderRadius: 3, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>simpan</button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 2: Verifikasi end-to-end**

Alur yang harus berhasil:

1. **Form surat → quick-save**: Buka edit surat yang punya tujuan → klik ikon Bookmark → mini-modal muncul → isi label → klik simpan → toast "Alamat berhasil disimpan ke database" → buka halaman Database Alamat Bongkar → entry baru muncul.

2. **Form surat → dropdown**: Buka edit surat lain → dropdown "Pilih dari database alamat" muncul dengan entri yang baru disimpan → pilih → field tujuan dan kota_tujuan ter-autofill.

3. **Modal QR → quick-save**: Klik QR di baris surat → isi/edit alamat bongkar → klik Bookmark di label Alamat Bongkar → mini-modal muncul → isi label → simpan → toast sukses.

4. **Modal QR → dropdown**: Buka QR modal lagi → dropdown "Pilih alamat tersimpan" ada → pilih → endUser + alamatBongkar ter-update → QR live-update otomatis.

- [ ] **Step 3: Commit**

```bash
git add src/pages/DkhpSkshhk.jsx
git commit -m "feat: tambah mini-modal quick-save alamat bongkar"
```

---

### Task 8: Version bump + changelog

**Files:**
- Modify: `package.json`
- Modify: `src/changelog.js`

- [ ] **Step 1: Update versi di package.json**

Di `package.json`, ubah:
```json
"version": "0.35.0",
```
menjadi:
```json
"version": "0.36.0",
```

- [ ] **Step 2: Tambah entry di changelog.js**

Di `src/changelog.js`, tambahkan di bagian paling atas array `changelog`:
```js
  {
    version: '0.36.0',
    date: '2026-05-23',
    items: [
      { type: 'feat', text: 'Tambah database alamat bongkar/tujuan dengan halaman CRUD' },
      { type: 'feat', text: 'Dropdown pilih alamat tersimpan di form surat SKSHHK (autofill tujuan & kota)' },
      { type: 'feat', text: 'Dropdown pilih alamat tersimpan di modal QR (autofill end_user & alamat bongkar)' },
      { type: 'feat', text: 'Quick-save alamat dari form surat dan modal QR ke database' },
    ]
  },
```

- [ ] **Step 3: Commit**

```bash
git add package.json src/changelog.js
git commit -m "chore: bump versi ke v0.36.0"
```

---

## Self-Review

**Spec coverage:**
- ✅ Tabel `tabel_alamat_bongkar` dengan 4 field + RLS → Task 1
- ✅ Halaman CRUD standalone (label, end_user, alamat_lengkap, kota) → Task 2
- ✅ Route + nav item → Task 3
- ✅ Fetch saat form/modal dibuka → Task 4
- ✅ Dropdown autofill di form surat → Task 5
- ✅ Quick-save dari form surat → Task 5
- ✅ Dropdown di modal QR → Task 6
- ✅ Quick-save dari modal QR → Task 6 + Task 7
- ✅ Mini-modal shared dengan saveAlamatTarget → Task 7

**Consistency check:**
- `alamatOptions` — dibaca di Task 5 (form surat) dan Task 6 (QR modal), didefinisikan di Task 4 ✅
- `handleSaveAlamat` — `saveAlamatTarget === 'form'` pakai `editRow.tujuan`, `saveAlamatTarget === 'qr'` pakai `qrForm.endUser` + `qrForm.alamatBongkar` ✅
- `Bookmark` — diimport di Task 4 Step 1, dipakai di Task 5 dan Task 6 ✅
- `MapPin` — diimport di Layout.jsx Task 3 Step 2, pastikan ada di installed lucide-react ✅
- `showSaveAlamat`, `saveAlamatLabel`, `saveAlamatTarget` — didefinisikan Task 4, dipakai Task 5, 6, 7 ✅
