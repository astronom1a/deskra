# Tumpuk Kapling — Jenis Dinamis & Slaghammer Checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ubah menu Tumpuk Kapling dari grid statis 3 jenis menjadi blok jenis dinamis (tambah/hapus via "Tambah Item"), tambah 3 jenis baru (Johar, Klampis, Rimba Campuran), dan ubah Slaghammer dari hardcode JATI+Mahoni menjadi checklist per jenis per periode.

**Architecture:** Kolom `jenis` di `tabel_tumpuk_kapling` (Postgres enum) diperluas dengan 3 nilai baru. Kolom baru `ikut_slaghammer` (boolean) jadi satu-satunya sumber kebenaran untuk kalkulasi Slaghammer di seluruh aplikasi (halaman input, rekap, dan laporan cetak) — menggantikan filter `jenis` yang hardcode. Halaman input (`TumpukKapling.jsx`) merender blok per jenis berdasarkan jenis unik yang ada di state `rows`, bukan array tetap.

**Tech Stack:** React 18 + Vite, Supabase (Postgres), Bahasa Indonesia untuk UI/komentar. Tidak ada TypeScript, tidak ada test runner untuk halaman ini (verifikasi manual di browser, sesuai `CLAUDE.md`).

---

## Spec

Lihat `docs/superpowers/specs/2026-07-30-tumpuk-kapling-jenis-dinamis-design.md` untuk detail keputusan desain lengkap.

## File yang disentuh

- Create: `supabase/migrations/20260730100000_tumpuk_kapling_jenis_baru.sql`
- Create: `supabase/migrations/20260730100001_tumpuk_kapling_slaghammer_flag.sql`
- Modify: `src/lib/rekapPekerjaan.js`
- Modify: `src/pages/TumpukKapling.jsx` (rewrite penuh)
- Modify: `src/pages/Cetak/CetakBiayaTPK.jsx`
- Modify: `src/pages/Cetak/CetakKwitansi.jsx`
- Modify: `src/pages/Cetak/CetakLampiran31.jsx`
- Modify: `package.json`
- Modify: `src/changelog.js`

---

### Task 1: Migration — tambah 3 nilai enum `jenis_kapling`

**Files:**
- Create: `supabase/migrations/20260730100000_tumpuk_kapling_jenis_baru.sql`

- [ ] **Step 1: Tulis file migration**

```sql
-- ============================================================
-- DESKRA — Tumpuk Kapling: tambah jenis baru
-- Johar, Klampis, Rimba Campuran
-- File ini HANYA berisi ALTER TYPE ADD VALUE — jangan tambah
-- statement lain di sini (lihat catatan di migration berikutnya).
-- ============================================================

alter type jenis_kapling add value if not exists 'JOHAR';
alter type jenis_kapling add value if not exists 'KLAMPIS';
alter type jenis_kapling add value if not exists 'RIMBA_CAMPURAN';
```

- [ ] **Step 2: Jalankan migrasi**

```bash
npm run migrate
```

Expected: output menunjukkan `20260730100000_tumpuk_kapling_jenis_baru.sql` berhasil dijalankan (`✓ Selesai`).

- [ ] **Step 3: Verifikasi manual di Supabase SQL editor**

Jalankan query berikut di Supabase dashboard → SQL Editor:

```sql
select unnest(enum_range(null::jenis_kapling));
```

Expected: hasil berisi 6 baris — `JATI`, `RIMBA_MAHONI`, `RIMBA_KEDAWUNG`, `JOHAR`, `KLAMPIS`, `RIMBA_CAMPURAN`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260730100000_tumpuk_kapling_jenis_baru.sql
git commit -m "feat: tambah jenis Johar, Klampis, Rimba Campuran ke enum jenis_kapling"
```

---

### Task 2: Migration — kolom `ikut_slaghammer` + backfill + view + seed function

**Files:**
- Create: `supabase/migrations/20260730100001_tumpuk_kapling_slaghammer_flag.sql`

- [ ] **Step 1: Tulis file migration**

```sql
-- ============================================================
-- DESKRA — Tumpuk Kapling: Slaghammer jadi checklist per jenis
-- JATI & RIMBA_MAHONI selalu ikut (fix), jenis lain opsional
-- per periode via checkbox di UI (default: tidak ikut).
-- ============================================================

alter table tabel_tumpuk_kapling
  add column if not exists ikut_slaghammer boolean not null default false;

-- Backfill data lama: JATI & RIMBA_MAHONI otomatis ikut Slaghammer
-- (perilaku sama seperti sebelum perubahan ini).
update tabel_tumpuk_kapling set ikut_slaghammer = true
  where jenis in ('JATI', 'RIMBA_MAHONI');

-- View v_slaghammer sekarang baca kolom ikut_slaghammer, bukan
-- filter jenis hardcode — otomatis benar untuk jenis apa pun.
create or replace view v_slaghammer
with (security_invoker = true) as
select
  periode_id,
  sum(volume)            as fisik,
  3000::numeric          as tarif,
  sum(volume) * 3000     as nilai
from tabel_tumpuk_kapling
where ikut_slaghammer = true
group by periode_id;

-- seed_tumpuk_kapling(): insert eksplisit kolom ikut_slaghammer
-- supaya JATI & RIMBA_MAHONI tetap true, RIMBA_KEDAWUNG false —
-- perilaku "Generate Default" (9 baris) tidak berubah.
create or replace function seed_tumpuk_kapling(p_periode_id uuid)
returns void as $$
declare
  v_tpk_id uuid;
begin
  select tpk_id into v_tpk_id from tabel_periode where id = p_periode_id;

  insert into tabel_tumpuk_kapling (periode_id, tpk_id, jenis, sortimen, volume, tarif, ikut_slaghammer) values
    (p_periode_id, v_tpk_id, 'JATI',           'AI',   0, 19000, true),
    (p_periode_id, v_tpk_id, 'JATI',           'AII',  0, 21500, true),
    (p_periode_id, v_tpk_id, 'JATI',           'AIII', 0, 24800, true),
    (p_periode_id, v_tpk_id, 'RIMBA_MAHONI',   'AI',   0, 19000, true),
    (p_periode_id, v_tpk_id, 'RIMBA_MAHONI',   'AII',  0, 21500, true),
    (p_periode_id, v_tpk_id, 'RIMBA_MAHONI',   'AIII', 0, 24800, true),
    (p_periode_id, v_tpk_id, 'RIMBA_KEDAWUNG', 'AI',   0, 19000, false),
    (p_periode_id, v_tpk_id, 'RIMBA_KEDAWUNG', 'AII',  0, 21500, false),
    (p_periode_id, v_tpk_id, 'RIMBA_KEDAWUNG', 'AIII', 0, 24800, false)
  on conflict (periode_id, jenis, sortimen) do nothing;
end;
$$ language plpgsql;
```

- [ ] **Step 2: Jalankan migrasi**

```bash
npm run migrate
```

Expected: `20260730100001_tumpuk_kapling_slaghammer_flag.sql` berhasil dijalankan.

- [ ] **Step 3: Verifikasi manual di Supabase SQL editor**

```sql
select jenis, sortimen, ikut_slaghammer from tabel_tumpuk_kapling order by jenis, sortimen limit 20;
```

Expected: baris dengan `jenis = 'JATI'` atau `'RIMBA_MAHONI'` punya `ikut_slaghammer = true`, baris `jenis = 'RIMBA_KEDAWUNG'` punya `ikut_slaghammer = false`.

```sql
select * from v_slaghammer limit 5;
```

Expected: query jalan tanpa error dan nilainya sama dengan sebelum migrasi (bandingkan dengan angka Slaghammer yang tampil di halaman Tumpuk Kapling untuk periode yang sama sebelum deploy).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260730100001_tumpuk_kapling_slaghammer_flag.sql
git commit -m "feat: kolom ikut_slaghammer di tabel_tumpuk_kapling, Slaghammer jadi checklist per jenis"
```

---

### Task 3: `rekapPekerjaan.js` — pakai `ikut_slaghammer`, tambah 3 baris rekap baru

**Files:**
- Modify: `src/lib/rekapPekerjaan.js:92-93` (totalSlag)
- Modify: `src/lib/rekapPekerjaan.js:107-110` (nilai per jenis + h29)
- Modify: `src/lib/rekapPekerjaan.js:138-143` (rows array)

- [ ] **Step 1: Ganti kalkulasi `totalSlag`**

Ganti (baris 92-93):

```js
  const totalSlag = t.filter(r=>['JATI','RIMBA_MAHONI'].includes(r.jenis))
    .reduce((s,r) => s+(r.volume||0), 0)
```

Jadi:

```js
  const totalSlag = t.filter(r => r.ikut_slaghammer)
    .reduce((s,r) => s+(r.volume||0), 0)
```

- [ ] **Step 2: Tambah nilai per jenis baru & perluas `h29`**

Ganti (baris 106-110):

```js
  const nilaiBrongkol = (brongkol||[]).reduce((s,r)=>s+(r.volume||0)*(r.tarif||0),0)
  const nilaiJati     = byJenis('JATI').nilai
  const nilaiMahoni   = byJenis('RIMBA_MAHONI').nilai
  const nilaiKedawung = byJenis('RIMBA_KEDAWUNG').nilai
  const h29 = nilaiJati + nilaiMahoni + nilaiKedawung + nilaiBrongkol
```

Jadi:

```js
  const nilaiBrongkol      = (brongkol||[]).reduce((s,r)=>s+(r.volume||0)*(r.tarif||0),0)
  const nilaiJati          = byJenis('JATI').nilai
  const nilaiMahoni        = byJenis('RIMBA_MAHONI').nilai
  const nilaiKedawung      = byJenis('RIMBA_KEDAWUNG').nilai
  const nilaiJohar         = byJenis('JOHAR').nilai
  const nilaiKlampis       = byJenis('KLAMPIS').nilai
  const nilaiRimbaCampuran = byJenis('RIMBA_CAMPURAN').nilai
  const h29 = nilaiJati + nilaiMahoni + nilaiKedawung + nilaiJohar + nilaiKlampis + nilaiRimbaCampuran + nilaiBrongkol
```

- [ ] **Step 3: Tambah 3 baris rekap baru**

Ganti (baris 138-143):

```js
    { _key:'tumpuk_jati', kode_rek:'51.69.44', uraian:'TUMPUK KAPLING JATI',
      satuan:'M3', ...byJenis('JATI'), _noMode:'group', _groupValue:h29, _src:'auto' },
    { _key:'tumpuk_mahoni', kode_rek:'51.69.44', uraian:'TUMPUK KAPLING RIMBA (MAHONI)',
      satuan:'M3', ...byJenis('RIMBA_MAHONI'), _noMode:'none', _src:'auto' },
    { _key:'tumpuk_kedawung', kode_rek:'51.69.44', uraian:'TUMPUK KAPLING RIMBA (KEDAWUNG)',
      satuan:'M3', ...byJenis('RIMBA_KEDAWUNG'), _noMode:'none', _src:'auto' },
```

Jadi:

```js
    { _key:'tumpuk_jati', kode_rek:'51.69.44', uraian:'TUMPUK KAPLING JATI',
      satuan:'M3', ...byJenis('JATI'), _noMode:'group', _groupValue:h29, _src:'auto' },
    { _key:'tumpuk_mahoni', kode_rek:'51.69.44', uraian:'TUMPUK KAPLING RIMBA (MAHONI)',
      satuan:'M3', ...byJenis('RIMBA_MAHONI'), _noMode:'none', _src:'auto' },
    { _key:'tumpuk_kedawung', kode_rek:'51.69.44', uraian:'TUMPUK KAPLING RIMBA (KEDAWUNG)',
      satuan:'M3', ...byJenis('RIMBA_KEDAWUNG'), _noMode:'none', _src:'auto' },
    { _key:'tumpuk_johar', kode_rek:'51.69.44', uraian:'TUMPUK KAPLING JOHAR',
      satuan:'M3', ...byJenis('JOHAR'), _noMode:'none', _src:'auto' },
    { _key:'tumpuk_klampis', kode_rek:'51.69.44', uraian:'TUMPUK KAPLING KLAMPIS',
      satuan:'M3', ...byJenis('KLAMPIS'), _noMode:'none', _src:'auto' },
    { _key:'tumpuk_rimba_campuran', kode_rek:'51.69.44', uraian:'TUMPUK KAPLING RIMBA (CAMPURAN)',
      satuan:'M3', ...byJenis('RIMBA_CAMPURAN'), _noMode:'none', _src:'auto' },
```

- [ ] **Step 4: Verifikasi manual**

```bash
npm run dev
```

Buka halaman Main Link, pilih periode yang sudah punya data Tumpuk Kapling (JATI/Mahoni/Kedawung) dan pastikan angka rekap "PENOMORAN KAPLING", "SABUK KAPLING", "SLAGHAMMER", dan "TUMPUK KAPLING JATI/RIMBA" tetap sama seperti sebelum perubahan (belum ada data Johar/Klampis/Rimba Campuran di DB, jadi barisnya akan tampil dengan fisik 0 dan tidak memengaruhi total).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rekapPekerjaan.js
git commit -m "feat: rekapPekerjaan dukung jenis tumpuk kapling baru & slaghammer berbasis checklist"
```

---

### Task 4: `TumpukKapling.jsx` — rewrite ke blok jenis dinamis

**Files:**
- Modify: `src/pages/TumpukKapling.jsx` (rewrite penuh)

- [ ] **Step 1: Tulis ulang seluruh file**

```jsx
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Save, CalendarDays, Sparkles, Layers, Lock, Plus, Trash2 } from 'lucide-react'
import { DEFAULT_TARIF_PERIODE, TUMPUK_TARIF_KODE } from '../lib/rekapPekerjaan'
import { useAuth } from '../lib/AuthProvider'
import { requireTpkId } from '../lib/tenantScope'
import { getEffectiveTpkId } from '../lib/effectiveTpk'
import TpkRequiredState from '../components/layout/TpkRequiredState'
import Toast, { useToast } from '../components/ui/Toast'
import { useIsMobile } from '../lib/hooks/useIsMobile'

// Jenis legacy — dipakai "Generate Default" untuk seed 9 baris seperti sebelumnya.
const JENIS_LIST = [
  { key: 'JATI', label: 'Tumpuk Kapling JATI' },
  { key: 'RIMBA_MAHONI', label: 'Tumpuk Kapling RIMBA (Mahoni)' },
  { key: 'RIMBA_KEDAWUNG', label: 'Tumpuk Kapling RIMBA (Kedawung)' },
]
// Semua jenis yang bisa dipilih lewat "Tambah Item".
const JENIS_OPTIONS = [
  ...JENIS_LIST,
  { key: 'JOHAR', label: 'Tumpuk Kapling JOHAR' },
  { key: 'KLAMPIS', label: 'Tumpuk Kapling KLAMPIS' },
  { key: 'RIMBA_CAMPURAN', label: 'Tumpuk Kapling RIMBA (Campuran)' },
]
// Jenis yang selalu ikut Slaghammer — checkbox-nya dikunci.
const JENIS_FIXED_SLAG = ['JATI', 'RIMBA_MAHONI']
const SORTIMEN_LIST = ['AI', 'AII', 'AIII']
// Tarif default fallback — dipakai bila Tarif Periode di Main Link belum di-set.
const DEFAULT_TARIF = {
  AI:   DEFAULT_TARIF_PERIODE.tumpuk_ai,
  AII:  DEFAULT_TARIF_PERIODE.tumpuk_aii,
  AIII: DEFAULT_TARIF_PERIODE.tumpuk_aiii,
}

function formatRupiah(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(Math.round(val || 0))
}

function formatTanggal(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatNum(n) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(n || 0)
}

export default function TumpukKapling() {
  const { profile, activeTpkId } = useAuth()
  const isMobile = useIsMobile()
  const tpkId = getEffectiveTpkId({ activeTpkId, profile })
  const [periodes, setPeriodes] = useState([])
  const [selectedPeriode, setSelectedPeriode] = useState(null)
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState({ penomoran: 0, sabuk: 0, slaghammer: 0 })
  // Tarif per sortimen — sumber: tabel_tarif_periode (dikelola di Main Link)
  const [tarifSortimen, setTarifSortimen] = useState(DEFAULT_TARIF)
  const [newJenisSelect, setNewJenisSelect] = useState('')
  const { toast, showToast } = useToast(3000)
  const [loading, setLoading] = useState(false)
  // Snapshot jenis yang ada di DB saat fetch terakhir — dipakai untuk
  // mendeteksi jenis yang dihapus user (perlu di-DELETE saat Simpan).
  const initialJenisRef = useRef(new Set())

  useEffect(() => {
    if (tpkId) fetchPeriodes()
    else {
      setPeriodes([])
      setSelectedPeriode(null)
    }
  }, [tpkId])

  useEffect(() => {
    if (selectedPeriode) fetchData(selectedPeriode.id)
  }, [selectedPeriode])

  async function fetchPeriodes() {
    const scopedTpkId = requireTpkId(tpkId)
    const { data } = await supabase
      .from('tabel_periode')
      .select('*')
      .eq('tpk_id', scopedTpkId)
      .order('created_at', { ascending: false })
    setPeriodes(data || [])
    if (data?.length && !selectedPeriode) setSelectedPeriode(data[0])
    if (!data?.some(p => p.id === selectedPeriode?.id)) setSelectedPeriode(data?.[0] || null)
  }

  async function fetchData(periodeId) {
    const scopedTpkId = requireTpkId(selectedPeriode?.tpk_id || tpkId)
    setLoading(true)
    const [{ data: rowData }, { data: tarifData }] = await Promise.all([
      supabase.from('tabel_tumpuk_kapling').select('*').eq('tpk_id', scopedTpkId).eq('periode_id', periodeId),
      supabase.from('tabel_tarif_periode').select('kode,tarif').eq('tpk_id', scopedTpkId).eq('periode_id', periodeId),
    ])
    setRows(rowData || [])
    initialJenisRef.current = new Set((rowData || []).map(r => r.jenis))
    setNewJenisSelect('')
    // Build map sortimen → tarif (fallback: DEFAULT_TARIF_PERIODE)
    const tarifByKode = Object.fromEntries((tarifData || []).map(t => [t.kode, t.tarif]))
    setTarifSortimen({
      AI:   tarifByKode[TUMPUK_TARIF_KODE.AI]   ?? DEFAULT_TARIF.AI,
      AII:  tarifByKode[TUMPUK_TARIF_KODE.AII]  ?? DEFAULT_TARIF.AII,
      AIII: tarifByKode[TUMPUK_TARIF_KODE.AIII] ?? DEFAULT_TARIF.AIII,
    })
    fetchSummary(rowData || [])
    setLoading(false)
  }

  function fetchSummary(sourceRows) {
    const total = sourceRows.reduce((sum, row) => sum + Number(row.volume || 0), 0)
    const slagTotal = sourceRows
      .filter(row => row.ikut_slaghammer)
      .reduce((sum, row) => sum + Number(row.volume || 0), 0)
    setSummary({
      penomoran: { fisik: total, tarif: 900, nilai: total * 900 },
      sabuk: { fisik: total, tarif: 400, nilai: total * 400 },
      slaghammer: { fisik: slagTotal, tarif: 3000, nilai: slagTotal * 3000 },
    })
  }

  function getRow(jenis, sortimen) {
    return rows.find(r => r.jenis === jenis && r.sortimen === sortimen)
  }

  function buildEmptyGrid(periodeId) {
    const list = []
    for (const j of JENIS_LIST) {
      for (const s of SORTIMEN_LIST) {
        list.push({
          _key: `${j.key}-${s}`,
          periode_id: periodeId,
          jenis: j.key,
          sortimen: s,
          volume: 0,
          tarif: tarifSortimen[s] ?? DEFAULT_TARIF[s],
        })
      }
    }
    return list
  }

  async function handleSeed() {
    if (!selectedPeriode) return
    const scopedTpkId = requireTpkId(selectedPeriode.tpk_id || tpkId)
    const payload = buildEmptyGrid(selectedPeriode.id).map(row => ({
      periode_id: selectedPeriode.id,
      tpk_id: scopedTpkId,
      jenis: row.jenis,
      sortimen: row.sortimen,
      volume: 0,
      tarif: row.tarif,
      ikut_slaghammer: JENIS_FIXED_SLAG.includes(row.jenis),
    }))
    const { error } = await supabase
      .from('tabel_tumpuk_kapling')
      .upsert(payload, { onConflict: 'periode_id,jenis,sortimen' })
    if (error) return showToast(error.message, 'error')
    showToast('9 baris default berhasil dibuat')
    fetchData(selectedPeriode.id)
  }

  function updateVolume(jenis, sortimen, value) {
    const val = value === '' ? '' : parseFloat(value)
    setRows(prev => {
      const idx = prev.findIndex(r => r.jenis === jenis && r.sortimen === sortimen)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], volume: val }
        return next
      }
      return [...prev, {
        _key: `${jenis}-${sortimen}`,
        periode_id: selectedPeriode.id,
        jenis, sortimen,
        volume: val,
        tarif: tarifSortimen[sortimen] ?? DEFAULT_TARIF[sortimen],
        ikut_slaghammer: JENIS_FIXED_SLAG.includes(jenis),
      }]
    })
  }

  function addJenisBlock(jenisKey) {
    if (!jenisKey || !selectedPeriode) return
    setRows(prev => [
      ...prev,
      ...SORTIMEN_LIST.map(s => ({
        _key: `${jenisKey}-${s}`,
        periode_id: selectedPeriode.id,
        jenis: jenisKey,
        sortimen: s,
        volume: 0,
        tarif: tarifSortimen[s] ?? DEFAULT_TARIF[s],
        ikut_slaghammer: JENIS_FIXED_SLAG.includes(jenisKey),
      })),
    ])
    setNewJenisSelect('')
  }

  function removeJenisBlock(jenisKey) {
    setRows(prev => prev.filter(r => r.jenis !== jenisKey))
  }

  function toggleSlaghammer(jenisKey, checked) {
    setRows(prev => prev.map(r => r.jenis === jenisKey ? { ...r, ikut_slaghammer: checked } : r))
  }

  async function handleSave() {
    if (!selectedPeriode) return showToast('Pilih periode dulu', 'error')
    const scopedTpkId = requireTpkId(selectedPeriode.tpk_id || tpkId)
    setLoading(true)

    const currentJenisSet = new Set(rows.map(r => r.jenis))
    const removedJenis = [...initialJenisRef.current].filter(j => !currentJenisSet.has(j))

    if (removedJenis.length) {
      const { error: deleteError } = await supabase
        .from('tabel_tumpuk_kapling')
        .delete()
        .eq('tpk_id', scopedTpkId)
        .eq('periode_id', selectedPeriode.id)
        .in('jenis', removedJenis)
      if (deleteError) {
        showToast(deleteError.message, 'error')
        setLoading(false)
        return
      }
    }

    const payload = []
    for (const j of JENIS_OPTIONS) {
      if (!currentJenisSet.has(j.key)) continue
      for (const s of SORTIMEN_LIST) {
        const row = getRow(j.key, s)
        payload.push({
          periode_id: selectedPeriode.id,
          tpk_id: scopedTpkId,
          jenis: j.key,
          sortimen: s,
          volume: parseFloat(row?.volume) || 0,
          // Tarif selalu diambil dari Tarif Periode (Main Link), bukan dari user.
          tarif: tarifSortimen[s] ?? DEFAULT_TARIF[s],
          ikut_slaghammer: JENIS_FIXED_SLAG.includes(j.key) ? true : !!row?.ikut_slaghammer,
        })
      }
    }

    if (payload.length) {
      const { error } = await supabase
        .from('tabel_tumpuk_kapling')
        .upsert(payload, { onConflict: 'periode_id,jenis,sortimen' })
      if (error) {
        showToast(error.message, 'error')
        setLoading(false)
        return
      }
    }

    showToast('Data Tumpuk Kapling tersimpan')
    fetchData(selectedPeriode.id)
    setLoading(false)
  }

  const hasData = rows.length > 0
  const activeJenisSet = new Set(rows.map(r => r.jenis))
  const activeJenis = JENIS_OPTIONS.filter(j => activeJenisSet.has(j.key))

  function totalPerJenis(jenis) {
    return SORTIMEN_LIST.reduce((sum, s) => {
      const r = rows.find(x => x.jenis === jenis && x.sortimen === s)
      return sum + (parseFloat(r?.volume) || 0)
    }, 0)
  }
  function nilaiPerJenis(jenis) {
    return SORTIMEN_LIST.reduce((sum, s) => {
      const r = rows.find(x => x.jenis === jenis && x.sortimen === s)
      const tarif = tarifSortimen[s] ?? DEFAULT_TARIF[s]
      return sum + (parseFloat(r?.volume) || 0) * tarif
    }, 0)
  }
  function isJenisSlagChecked(jenis) {
    return !!rows.find(x => x.jenis === jenis)?.ikut_slaghammer
  }

  if (!tpkId) return <TpkRequiredState />

  return (
    <div className="ds-page" style={{ minHeight: '100%', background: '#0a0a0a', color: '#f0f0f0' }}>
      <style>{`
        .tk-input { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); color: #f0f0f0; border-radius: 3px; outline: none; font-family: monospace; font-size: 12px; -moz-appearance: textfield; }
        .tk-input:focus { border-color: rgba(0,255,136,0.5); box-shadow: 0 0 0 2px rgba(0,255,136,0.07); }
        .tk-input::-webkit-inner-spin-button, .tk-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .tk-row:hover td { background: rgba(255,255,255,0.02) !important; }
      `}</style>

      <Toast toast={toast} />

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={18} style={{ color: '#00ff88' }}/> Tumpuk Kapling
        </h1>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'monospace' }}>
          Input volume per jenis &amp; sortimen. Penomoran, Sabuk, dan Slaghammer otomatis terhitung.
        </p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 3, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Lock size={10}/> Tarif sortimen dikelola di <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>Main Link → Tarif Periode</span>.
        </p>
      </div>

      {/* Periode selector */}
      <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '12px 16px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>Periode:</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flex: 1 }}>
          {periodes.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPeriode(p)}
              style={{
                padding: '4px 10px', borderRadius: 3, fontSize: 11, fontFamily: 'monospace',
                fontWeight: selectedPeriode?.id === p.id ? 700 : 400,
                background: selectedPeriode?.id === p.id ? '#00ff88' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${selectedPeriode?.id === p.id ? '#00ff88' : 'rgba(255,255,255,0.08)'}`,
                color: selectedPeriode?.id === p.id ? '#0a0a0a' : 'rgba(255,255,255,0.65)',
                cursor: 'pointer',
              }}
            >{p.periode}</button>
          ))}
          {periodes.length === 0 && (
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>Belum ada periode. Buat di Main Link.</span>
          )}
        </div>
        {selectedPeriode && (
          <p style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CalendarDays size={11}/>
            {formatTanggal(selectedPeriode.tgl_awal)} – {formatTanggal(selectedPeriode.tgl_akhir)}
          </p>
        )}
      </div>

      {selectedPeriode && (
        <>
          {/* Info belum ada data */}
          {!hasData && !loading && (
            <div style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 3, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'monospace', fontSize: 12, color: '#ffaa00' }}>
                <Sparkles size={14}/>
                <span>Belum ada data untuk periode ini. Tambah item jenis di bawah, atau generate 9 baris default.</span>
              </div>
              <button
                onClick={handleSeed}
                style={{ padding: '5px 12px', background: 'rgba(255,170,0,0.15)', border: '1px solid rgba(255,170,0,0.3)', borderRadius: 3, color: '#ffaa00', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer', fontWeight: 700 }}
              >Generate Default</button>
            </div>
          )}

          {/* Grid input per jenis — dinamis, hanya jenis yang aktif ditampilkan */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
            {activeJenis.map(j => {
              const isFixedSlag = JENIS_FIXED_SLAG.includes(j.key)
              return (
                <div key={j.key} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.015)', flexWrap: 'wrap', gap: 10 }}>
                    <p style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#f0f0f0' }}>{j.label}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)', cursor: isFixedSlag ? 'default' : 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isFixedSlag || isJenisSlagChecked(j.key)}
                          disabled={isFixedSlag}
                          onChange={e => toggleSlaghammer(j.key, e.target.checked)}
                        />
                        Ikut Slaghammer {isFixedSlag && <Lock size={9}/>}
                      </label>
                      <div style={{ display: 'flex', gap: 16, fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                        <span>Total: <strong style={{ color: '#f0f0f0' }}>{formatNum(totalPerJenis(j.key))} M³</strong></span>
                        <span style={{ color: '#00ff88', fontWeight: 600 }}>{formatRupiah(nilaiPerJenis(j.key))}</span>
                      </div>
                      <button
                        onClick={() => removeJenisBlock(j.key)}
                        title="Hapus jenis ini"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.2)', lineHeight: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ff6b6b'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                      ><Trash2 size={13}/></button>
                    </div>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '7px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)', width: 80 }}>Sortimen</th>
                        <th style={{ padding: '7px 12px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)', width: 140 }}>Volume (M³)</th>
                        <th style={{ padding: '7px 12px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)', width: 140 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Tarif <Lock size={10}/></span>
                        </th>
                        <th style={{ padding: '7px 12px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>Nilai</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SORTIMEN_LIST.map(s => {
                        const r = rows.find(x => x.jenis === j.key && x.sortimen === s)
                        const vol = parseFloat(r?.volume) || 0
                        const trf = tarifSortimen[s] ?? DEFAULT_TARIF[s]
                        return (
                          <tr key={s} className="tk-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '7px 12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{s}</td>
                            <td style={{ padding: '5px 12px' }}>
                              <input
                                type="number" step="0.001"
                                value={r?.volume ?? ''}
                                onChange={e => updateVolume(j.key, s, e.target.value)}
                                className="tk-input"
                                style={{ width: '100%', padding: '5px 8px', textAlign: 'right', boxSizing: 'border-box' }}
                                placeholder="0"
                              />
                            </td>
                            <td style={{ padding: '7px 12px', textAlign: 'right', color: 'rgba(255,255,255,0.35)' }}>
                              {formatRupiah(trf)}
                            </td>
                            <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 600, color: vol > 0 ? '#f0f0f0' : 'rgba(255,255,255,0.2)' }}>
                              {formatRupiah(vol * trf)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>

          {/* Tambah Item — pilih jenis yang belum aktif */}
          {activeJenis.length < JENIS_OPTIONS.length && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <select
                value={newJenisSelect}
                onChange={e => setNewJenisSelect(e.target.value)}
                className="tk-input"
                style={{ padding: '6px 10px' }}
              >
                <option value="">Pilih jenis...</option>
                {JENIS_OPTIONS.filter(j => !activeJenisSet.has(j.key)).map(j => (
                  <option key={j.key} value={j.key}>{j.label}</option>
                ))}
              </select>
              <button
                onClick={() => addJenisBlock(newJenisSelect)}
                disabled={!newJenisSelect}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                  background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.25)', borderRadius: 3,
                  color: '#00ff88', fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                  cursor: newJenisSelect ? 'pointer' : 'not-allowed', opacity: newJenisSelect ? 1 : 0.5,
                }}
              ><Plus size={12}/> Tambah Item</button>
            </div>
          )}

          {/* Summary turunan */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Penomoran Kapling', data: summary.penomoran, note: 'Semua jenis',   accent: '#60a5fa' },
              { label: 'Sabuk Kapling',     data: summary.sabuk,     note: '= Penomoran',   accent: '#34d399' },
              { label: 'Slaghammer',        data: summary.slaghammer, note: 'Sesuai checklist per jenis', accent: '#fb923c' },
            ].map(c => (
              <div key={c.label} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '14px 16px' }}>
                <p style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: c.accent, marginBottom: 2 }}>{c.label}</p>
                <p style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>{c.note}</p>
                <p style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#f0f0f0' }}>{formatNum(c.data.fisik)} M³</p>
                <p style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>× {formatRupiah(c.data.tarif)}</p>
                <p style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, marginTop: 4, color: c.accent }}>{formatRupiah(c.data.nilai)}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSave}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: loading ? 'rgba(0,255,136,0.15)' : '#00ff88', color: loading ? 'rgba(0,255,136,0.4)' : '#0a0a0a', borderRadius: 3, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}
            ><Save size={13}/> {loading ? 'Menyimpan...' : 'Simpan Data'}</button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Jalankan dev server dan verifikasi manual**

```bash
npm run dev
```

Buka halaman Tumpuk Kapling di browser, lalu cek:
1. Periode yang sudah punya data (JATI/Mahoni/Kedawung) — 3 blok tampil seperti sebelumnya, blok JATI & Mahoni checkbox "Ikut Slaghammer" tercentang & disabled (ada ikon lock), blok Kedawung checkbox kosong & bisa diklik.
2. Klik dropdown "Tambah Item" → pilih "Tumpuk Kapling JOHAR" → klik "Tambah Item" → blok baru muncul dengan 3 baris sortimen kosong, checkbox Slaghammer tidak tercentang & bisa diklik.
3. Isi volume di blok Johar, centang "Ikut Slaghammer", klik "Simpan Data" → toast sukses, blok Johar tetap ada setelah reload data, checkbox tetap tercentang.
4. Card ringkasan "Slaghammer" nilainya naik sesuai volume Johar yang baru dicentang.
5. Klik ikon trash di header blok Kedawung → blok hilang dari layar → klik "Simpan Data" → reload halaman (ganti periode lalu balik) → blok Kedawung tidak muncul lagi (row-nya sudah terhapus dari DB).
6. Klik "Generate Default" di periode baru (belum ada data) → 3 blok legacy muncul (JATI, Mahoni, Kedawung) dengan volume 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/TumpukKapling.jsx
git commit -m "feat: Tumpuk Kapling — blok jenis dinamis (tambah/hapus item) + checklist Slaghammer per jenis"
```

---

### Task 5: `CetakBiayaTPK.jsx` — grouping cetak jenis baru ke blok RIMBA

**Files:**
- Modify: `src/pages/Cetak/CetakBiayaTPK.jsx:82-83`

- [ ] **Step 1: Perluas filter `sortimenRimba`**

Ganti:

```js
  const sortimenJati  = sortimenOf(j => j === 'JATI')
  const sortimenRimba = sortimenOf(j => j === 'RIMBA_MAHONI' || j === 'RIMBA_KEDAWUNG')
```

Jadi:

```js
  const RIMBA_GROUP_JENIS = ['RIMBA_MAHONI', 'RIMBA_KEDAWUNG', 'JOHAR', 'KLAMPIS', 'RIMBA_CAMPURAN']
  const sortimenJati  = sortimenOf(j => j === 'JATI')
  const sortimenRimba = sortimenOf(j => RIMBA_GROUP_JENIS.includes(j))
```

- [ ] **Step 2: Verifikasi manual**

Buka halaman Cetak Biaya TPK untuk periode yang punya data Tumpuk Kapling. Pastikan blok "TUMPUK KAPLING JATI" dan "TUMPUK KAPLING RIMBA" nilainya tidak berubah dibanding sebelum perubahan (karena belum ada data Johar/Klampis/Rimba Campuran, filter tambahan tidak mengubah hasil).

- [ ] **Step 3: Commit**

```bash
git add src/pages/Cetak/CetakBiayaTPK.jsx
git commit -m "feat: Cetak Biaya TPK — gabung jenis tumpuk kapling baru ke blok RIMBA"
```

---

### Task 6: `CetakKwitansi.jsx` — label & breakdown jenis baru

**Files:**
- Modify: `src/pages/Cetak/CetakKwitansi.jsx:30` (JENIS_LABEL)
- Modify: `src/pages/Cetak/CetakKwitansi.jsx:609-619` (computeSubRows)

- [ ] **Step 1: Perluas `JENIS_LABEL`**

Ganti (baris 30):

```js
const JENIS_LABEL = { JATI: 'JATI', RIMBA_MAHONI: 'MAHONI', RIMBA_KEDAWUNG: 'KEDAWUNG' }
```

Jadi:

```js
const JENIS_LABEL = {
  JATI: 'JATI', RIMBA_MAHONI: 'MAHONI', RIMBA_KEDAWUNG: 'KEDAWUNG',
  JOHAR: 'JOHAR', KLAMPIS: 'KLAMPIS', RIMBA_CAMPURAN: 'RIMBA CAMPURAN',
}
```

- [ ] **Step 2: Perluas breakdown `subSrc === 'tumpuk'` dan ganti `subSrc === 'tumpuk_slag'` jadi dinamis**

Ganti (baris 609-619):

```js
  if (subSrc === 'tumpuk') {
    result = [
      { label: 'JATI',     fisik: get('JATI') },
      { label: 'MAHONI',   fisik: get('RIMBA_MAHONI') },
      { label: 'KEDAWUNG', fisik: get('RIMBA_KEDAWUNG') },
    ]
  } else if (subSrc === 'tumpuk_slag') {
    result = [
      { label: 'JATI',   fisik: get('JATI') },
      { label: 'MAHONI', fisik: get('RIMBA_MAHONI') },
    ]
  } else if (subSrc === 'tanda_laku') {
```

Jadi:

```js
  if (subSrc === 'tumpuk') {
    // Semua jenis yang ada datanya di periode ini ikut breakdown Penomoran/Sabuk.
    const jenisAda = [...new Set(t.map(r => r.jenis))]
    result = jenisAda.map(j => ({ label: JENIS_LABEL[j] || j, fisik: get(j) }))
  } else if (subSrc === 'tumpuk_slag') {
    // Hanya jenis yang dicentang "Ikut Slaghammer" di halaman Tumpuk Kapling.
    const jenisSlag = [...new Set(t.filter(r => r.ikut_slaghammer).map(r => r.jenis))]
    result = jenisSlag.map(j => ({ label: JENIS_LABEL[j] || j, fisik: get(j) }))
  } else if (subSrc === 'tanda_laku') {
```

- [ ] **Step 3: Verifikasi manual**

Buka halaman Cetak Kwitansi untuk item `tumpuk` dan `slaghammer` (URL `/cetak/kwitansi/:periodeId/tumpuk` dan `/slaghammer` atau lewat menu terkait) untuk periode dengan data JATI/Mahoni/Kedawung — pastikan sub-baris breakdown-nya sama seperti sebelum perubahan (JATI, MAHONI muncul di breakdown Slaghammer; JATI, MAHONI, KEDAWUNG muncul di breakdown Penomoran/Sabuk kalau semua > 0).

- [ ] **Step 4: Commit**

```bash
git add src/pages/Cetak/CetakKwitansi.jsx
git commit -m "feat: Cetak Kwitansi — breakdown jenis tumpuk kapling dinamis & label jenis baru"
```

---

### Task 7: `CetakLampiran31.jsx` — label & urutan jenis baru

**Files:**
- Modify: `src/pages/Cetak/CetakLampiran31.jsx:238-239`

- [ ] **Step 1: Perluas `JENIS_LABEL` dan `JENIS_ORDER`**

Ganti (baris 238-239):

```js
const JENIS_LABEL = { JATI: 'KAYU JATI', RIMBA_MAHONI: 'KAYU MAHONI', RIMBA_KEDAWUNG: 'KAYU KEDAWUNG' }
const JENIS_ORDER = ['JATI', 'RIMBA_MAHONI', 'RIMBA_KEDAWUNG']
```

Jadi:

```js
const JENIS_LABEL = {
  JATI: 'KAYU JATI', RIMBA_MAHONI: 'KAYU MAHONI', RIMBA_KEDAWUNG: 'KAYU KEDAWUNG',
  JOHAR: 'KAYU JOHAR', KLAMPIS: 'KAYU KLAMPIS', RIMBA_CAMPURAN: 'KAYU RIMBA CAMPURAN',
}
const JENIS_ORDER = ['JATI', 'RIMBA_MAHONI', 'RIMBA_KEDAWUNG', 'JOHAR', 'KLAMPIS', 'RIMBA_CAMPURAN']
```

- [ ] **Step 2: Verifikasi manual**

Buka halaman Cetak Lampiran 31 untuk periode dengan data Tumpuk Kapling — pastikan tabel "Bea tumpuk kapling" tampil sama seperti sebelum perubahan (jenis dengan volume 0 otomatis tidak muncul karena loop sudah memfilter `volume > 0`).

- [ ] **Step 3: Commit**

```bash
git add src/pages/Cetak/CetakLampiran31.jsx
git commit -m "feat: Cetak Lampiran 31 — dukung label jenis tumpuk kapling baru"
```

---

### Task 8: Version bump & changelog

**Files:**
- Modify: `package.json`
- Modify: `src/changelog.js`

- [ ] **Step 1: Bump versi di `package.json`**

Ganti (baris 4):

```json
  "version": "0.56.1",
```

Jadi:

```json
  "version": "0.57.0",
```

- [ ] **Step 2: Tambah entry changelog**

Tambahkan di awal array `changelog` pada `src/changelog.js` (sebelum entry `0.56.1`):

```js
  {
    version: '0.57.0',
    date: '2026-07-30',
    items: [
      { type: 'feat', text: 'Tumpuk Kapling: input jenis kini dinamis (tambah/hapus blok jenis via "Tambah Item"), tidak lagi grid tetap 3 jenis' },
      { type: 'feat', text: 'tambah 3 jenis baru di Tumpuk Kapling: Johar, Klampis, Rimba Campuran' },
      { type: 'feat', text: 'Slaghammer kini checklist per jenis per periode (JATI & Rimba Mahoni tetap fix ikut, jenis lain — termasuk Rimba Kedawung — opsional, default tidak ikut)' },
    ]
  },
```

- [ ] **Step 3: Commit**

```bash
git add package.json src/changelog.js
git commit -m "chore: bump versi ke v0.57.0"
```

---

### Task 9: Verifikasi end-to-end & push

- [ ] **Step 1: Verifikasi build**

```bash
npm run build
```

Expected: build selesai tanpa error.

- [ ] **Step 2: Verifikasi alur penuh di browser (dev server)**

```bash
npm run dev
```

1. Buka Tumpuk Kapling → pilih periode kosong → klik "Generate Default" → 3 blok legacy muncul.
2. Tambah item "Johar" → isi volume AI=5, centang Ikut Slaghammer → Simpan Data.
3. Buka Main Link / rekap periode yang sama → pastikan baris "TUMPUK KAPLING JOHAR" muncul dengan nilai sesuai, dan Slaghammer bertambah sesuai volume Johar.
4. Buka Cetak Biaya TPK periode yang sama → nilai blok "TUMPUK KAPLING RIMBA" sudah termasuk Johar.
5. Buka Cetak Lampiran 31 periode yang sama → baris "KAYU JOHAR" muncul di tabel Bea Tumpuk Kapling.

- [ ] **Step 3: Push**

```bash
git push
```

Sesuai `CLAUDE.md`, migration & perubahan versi/changelog wajib langsung push tanpa menunggu konfirmasi — tapi karena task ini juga mencakup banyak perubahan halaman UI (`TumpukKapling.jsx`, halaman Cetak), konfirmasi ke user dulu sebelum push kalau belum eksplisit diminta.
