import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthProvider'
import { requireTpkId } from '../lib/tenantScope'
import { getEffectiveTpkId } from '../lib/effectiveTpk'
import TpkRequiredState from '../components/layout/TpkRequiredState'
import {
  Save, CalendarDays, Plus, Trash2,
  TreePine, Barcode, Users, Sparkles, Zap, Package, Lock
} from 'lucide-react'
import Toast, { useToast } from '../components/ui/Toast'

const DEFAULT_JENIS = ['JATI', 'RIMBA', 'MAHONI']
const DEFAULT_JENIS_BARCODE = ['JATI', 'MAHONI', 'KEDAWUNG']

const SECTION_ACCENT = {
  emerald: '#34d399',
  amber:   '#fbbf24',
  violet:  '#a78bfa',
  sky:     '#38bdf8',
  orange:  '#fb923c',
  yellow:  '#facc15',
  rose:    '#fb7185',
}

const dp_inputStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f0', borderRadius: 3, outline: 'none', fontFamily: 'monospace', fontSize: 12, padding: '6px 8px', width: '100%', boxSizing: 'border-box', MozAppearance: 'textfield' }
const dp_inputStyleRight = { ...dp_inputStyle, textAlign: 'right' }

function formatRupiah(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(Math.round(val || 0))
}
function formatTanggal(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
function parseHalf(periodeLabel) {
  return periodeLabel?.startsWith('II/') ? 'II' : 'I'
}

// ============================================================
// Section: Per-Jenis (Tanda Laku, Tumpuk Brongkol, Pemasangan Barcode)
// ============================================================
function SectionPerJenis({
  title, icon: Icon, color, satuan, tarifDefault,
  volumeField, tableName, rows, setRows, jenisDefaults,
  lockedJenis = null,
}) {
  const addRow = () => setRows(prev => [...prev, {
    _key: crypto.randomUUID(),
    jenis: lockedJenis || '', [volumeField]: 0, tarif: tarifDefault, urutan: prev.length,
  }])
  const removeRow = (key) => setRows(prev => prev.filter(r => r._key !== key))
  const updateRow = (key, field, value) => setRows(prev =>
    prev.map(r => r._key === key ? { ...r, [field]: value } : r)
  )

  const total = rows.reduce(
    (s, r) => s + (parseFloat(r[volumeField]) || 0) * (parseFloat(r.tarif) || 0), 0
  )
  const accent = SECTION_ACCENT[color] || '#00ff88'

  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.015)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={14} style={{ color: accent }}/>
          <p style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#f0f0f0' }}>{title}</p>
        </div>
        <p style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: accent }}>{formatRupiah(total)}</p>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
        <thead>
          <tr>
            {!lockedJenis && (
              <th style={{ padding: '7px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>Jenis</th>
            )}
            <th style={{ padding: '7px 12px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)', width: 140 }}>
              {volumeField === 'jumlah' ? `Jumlah (${satuan})` : `Volume (${satuan})`}
            </th>
            <th style={{ padding: '7px 12px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)', width: 140 }}>Tarif</th>
            <th style={{ padding: '7px 12px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)', width: 140 }}>Nilai</th>
            <th style={{ width: 36, borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={lockedJenis ? 4 : 5} style={{ padding: 16, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic', fontSize: 11 }}>
              Belum ada baris. Tambah baris di bawah.
            </td></tr>
          )}
          {rows.map(r => {
            const nilai = (parseFloat(r[volumeField]) || 0) * (parseFloat(r.tarif) || 0)
            return (
              <tr key={r._key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                onMouseEnter={e => { for (const td of e.currentTarget.children) td.style.background = 'rgba(255,255,255,0.02)' }}
                onMouseLeave={e => { for (const td of e.currentTarget.children) td.style.background = '' }}
              >
                {!lockedJenis && (
                  <td style={{ padding: '5px 12px' }}>
                    <input
                      value={r.jenis || ''}
                      onChange={e => updateRow(r._key, 'jenis', e.target.value)}
                      list={`jenis-${tableName}`}
                      style={dp_inputStyle}
                      placeholder="Jenis pohon..."
                    />
                    <datalist id={`jenis-${tableName}`}>
                      {jenisDefaults.map(j => <option key={j} value={j} />)}
                    </datalist>
                  </td>
                )}
                <td style={{ padding: '5px 12px' }}>
                  <input
                    type="number" step="0.001"
                    value={r[volumeField] ?? ''}
                    onChange={e => updateRow(r._key, volumeField, e.target.value)}
                    style={dp_inputStyleRight}
                  />
                </td>
                <td style={{ padding: '5px 12px' }}>
                  <input
                    type="number"
                    value={r.tarif ?? ''}
                    onChange={e => updateRow(r._key, 'tarif', e.target.value)}
                    style={dp_inputStyleRight}
                  />
                </td>
                <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 600, color: nilai > 0 ? '#f0f0f0' : 'rgba(255,255,255,0.2)' }}>{formatRupiah(nilai)}</td>
                <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                  <button onClick={() => removeRow(r._key)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.2)', lineHeight: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ff6b6b'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                  ><Trash2 size={13}/></button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
        <button onClick={addRow}
          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.color = '#00ff88'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
        ><Plus size={11}/> Tambah Baris</button>
      </div>
    </div>
  )
}

// ============================================================
// Main Page
// ============================================================
export default function DetailPekerjaan() {
  const { profile, activeTpkId } = useAuth()
  const tpkId = getEffectiveTpkId({ activeTpkId, profile })
  const { toast, showToast } = useToast(3000)
  const [periodes, setPeriodes] = useState([])
  const [selectedPeriode, setSelectedPeriode] = useState(null)
  const [loading, setLoading] = useState(false)

  const [tandaLaku, setTandaLaku] = useState([])
  const [brongkol, setBrongkol] = useState([])
  const [barcodeRows, setBarcodeRows] = useState([])
  const [tenagaBantu, setTenagaBantu] = useState({ jumlah_orang: 6, tarif_per_orang: 750000 })
  const [kebersihan, setKebersihan] = useState({ nominal: 52000 })
  const [listrik, setListrik] = useState({ nominal: 0, no_meter: '' })
  const [customItems, setCustomItems] = useState([])

  const half = selectedPeriode ? parseHalf(selectedPeriode.periode) : null
  const isPeriodeI = half === 'I'
  const isPeriodeII = half === 'II'

  useEffect(() => {
    if (tpkId) fetchPeriodes()
    else {
      setPeriodes([])
      setSelectedPeriode(null)
    }
  }, [tpkId])
  useEffect(() => {
    if (selectedPeriode) fetchAll(selectedPeriode.id)
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

  async function fetchAll(periodeId) {
    const scopedTpkId = requireTpkId(selectedPeriode?.tpk_id || tpkId)
    setLoading(true)
    const [tl, tb, pb, tnb, kb, lt, ci, tenagaBantuCount] = await Promise.all([
      supabase.from('tabel_tanda_laku').select('*').eq('tpk_id', scopedTpkId).eq('periode_id', periodeId).order('urutan'),
      supabase.from('tabel_tumpuk_brongkol').select('*').eq('tpk_id', scopedTpkId).eq('periode_id', periodeId).order('urutan'),
      supabase.from('tabel_pemasangan_barcode').select('*').eq('tpk_id', scopedTpkId).eq('periode_id', periodeId).order('urutan'),
      supabase.from('tabel_tenaga_bantu').select('*').eq('tpk_id', scopedTpkId).eq('periode_id', periodeId).maybeSingle(),
      supabase.from('tabel_kebersihan').select('*').eq('tpk_id', scopedTpkId).eq('periode_id', periodeId).maybeSingle(),
      supabase.from('tabel_listrik').select('*').eq('tpk_id', scopedTpkId).eq('periode_id', periodeId).maybeSingle(),
      supabase.from('tabel_custom_item').select('*').eq('tpk_id', scopedTpkId).eq('periode_id', periodeId).order('urutan'),
      fetchJumlahTenagaBantuAktif(scopedTpkId),
    ])
    setTandaLaku((tl.data || []).map(r => ({ ...r, _key: r.id })))
    setBrongkol((tb.data || []).map(r => ({ ...r, _key: r.id })))
    setBarcodeRows((pb.data || []).map(r => ({ ...r, _key: r.id })))
    setTenagaBantu({
      jumlah_orang: tenagaBantuCount ?? 0,
      tarif_per_orang: tnb.data?.tarif_per_orang || 750000,
    })

    // Kebersihan auto-seed untuk periode II
    if (kb.data) {
      setKebersihan(kb.data)
    } else if (parseHalf(periodes.find(p => p.id === periodeId)?.periode) === 'II') {
      setKebersihan({ nominal: 52000 })
    } else {
      setKebersihan({ nominal: 0 })
    }

    setListrik(lt.data || { nominal: 0, no_meter: '' })
    setCustomItems((ci.data || []).map(r => ({ ...r, _key: r.id })))
    setLoading(false)
  }

  async function fetchJumlahTenagaBantuAktif(scopedTpkId = requireTpkId(tpkId)) {
    const { data, error } = await supabase
      .from('tabel_tenaga_kerja')
      .select('id,posisi')
      .eq('tpk_id', scopedTpkId)
      .eq('aktif', true)
    if (error) return null
    return (data || []).filter(w => (w.posisi || '').split(',').map(s => s.trim()).includes('TENAGA_BANTU')).length
  }

  function normalizeBarcodeJenis(jenis) {
    const v = (jenis || '').trim().toUpperCase()
    if (v.includes('KEDAWUNG')) return 'KEDAWUNG'
    if (v.includes('MAHONI')) return 'MAHONI'
    if (v.includes('JATI')) return 'JATI'
    return v
  }

  async function handleSave() {
    if (!selectedPeriode) return showToast('Pilih periode dulu', 'error')
    let scopedTpkId
    try { scopedTpkId = requireTpkId(selectedPeriode.tpk_id || tpkId) }
    catch (err) { return showToast(err.message, 'error') }
    setLoading(true)
    const pid = selectedPeriode.id

    const mapRows = (rows, volumeField) => rows
      .filter(r => r.jenis?.trim())
      .map((r, i) => ({
        periode_id: pid,
        tpk_id: scopedTpkId,
        jenis: r.jenis.trim(),
        [volumeField]: parseFloat(r[volumeField]) || 0,
        tarif: parseFloat(r.tarif) || 0,
        urutan: i,
      }))

    const tlRows = mapRows(tandaLaku, 'volume')
    const tbRows = mapRows(brongkol, 'volume')
    const pbRows = barcodeRows
      .filter(r => r.jenis?.trim())
      .map((r, i) => ({
        periode_id: pid,
        tpk_id: scopedTpkId,
        jenis: normalizeBarcodeJenis(r.jenis),
        jumlah: parseFloat(r.jumlah) || 0,
        tarif: parseFloat(r.tarif) || 0,
        urutan: i,
      }))
    const ciRows = customItems
      .filter(r => r.label?.trim())
      .map((r, i) => ({
        periode_id: pid,
        tpk_id: scopedTpkId,
        label: r.label.trim(),
        satuan: r.satuan || null,
        fisik: parseFloat(r.fisik) || 0,
        tarif: parseFloat(r.tarif) || 0,
        urutan: i,
      }))

    // Insert data baru dulu — baru hapus yang lama (safe order: insert first)
    const inserts = []
    if (tlRows.length) inserts.push(supabase.from('tabel_tanda_laku').insert(tlRows))
    if (tbRows.length) inserts.push(supabase.from('tabel_tumpuk_brongkol').insert(tbRows))
    if (pbRows.length) inserts.push(supabase.from('tabel_pemasangan_barcode').insert(pbRows))
    if (ciRows.length) inserts.push(supabase.from('tabel_custom_item').insert(ciRows))

    if (isPeriodeII) {
      const jumlahTenagaBantuAktif = await fetchJumlahTenagaBantuAktif(scopedTpkId)
      inserts.push(supabase.from('tabel_tenaga_bantu').upsert({
        periode_id: pid,
        tpk_id: scopedTpkId,
        jumlah_orang: jumlahTenagaBantuAktif ?? (parseInt(tenagaBantu.jumlah_orang) || 0),
        tarif_per_orang: parseFloat(tenagaBantu.tarif_per_orang) || 0,
      }, { onConflict: 'periode_id' }))
    }

    if (isPeriodeII) {
      inserts.push(supabase.from('tabel_kebersihan').upsert({
        periode_id: pid,
        tpk_id: scopedTpkId,
        nominal: parseFloat(kebersihan.nominal) || 0,
      }, { onConflict: 'periode_id' }))
    }

    if (isPeriodeI) {
      inserts.push(supabase.from('tabel_listrik').upsert({
        periode_id: pid,
        tpk_id: scopedTpkId,
        nominal: parseFloat(listrik.nominal) || 0,
        no_meter: listrik.no_meter || null,
      }, { onConflict: 'periode_id' }))
    }

    const results = await Promise.all(inserts)
    const err = results.find(r => r.error)
    if (err) {
      showToast(err.error.message, 'error')
      setLoading(false)
      return
    }

    // Insert sukses — baru hapus data lama
    await Promise.all([
      supabase.from('tabel_tanda_laku').delete().eq('tpk_id', scopedTpkId).eq('periode_id', pid),
      supabase.from('tabel_tumpuk_brongkol').delete().eq('tpk_id', scopedTpkId).eq('periode_id', pid),
      supabase.from('tabel_pemasangan_barcode').delete().eq('tpk_id', scopedTpkId).eq('periode_id', pid),
      supabase.from('tabel_custom_item').delete().eq('tpk_id', scopedTpkId).eq('periode_id', pid),
    ])

    showToast('Semua data berhasil disimpan')
    fetchAll(pid)
    setLoading(false)
  }

  // Custom items handlers
  const addCustom = () => setCustomItems(prev => [...prev, {
    _key: crypto.randomUUID(), label: '', satuan: '', fisik: 0, tarif: 0, urutan: prev.length,
  }])
  const updateCustom = (key, field, value) =>
    setCustomItems(prev => prev.map(r => r._key === key ? { ...r, [field]: value } : r))
  const removeCustom = (key) =>
    setCustomItems(prev => prev.filter(r => r._key !== key))

  const customTotal = customItems.reduce(
    (s, r) => s + (parseFloat(r.fisik) || 0) * (parseFloat(r.tarif) || 0), 0
  )
  const tenagaBantuNilai = (parseInt(tenagaBantu.jumlah_orang) || 0) * (parseFloat(tenagaBantu.tarif_per_orang) || 0)

  if (!tpkId) return <TpkRequiredState />

  return (
    <div style={{ padding: 24, minHeight: '100%', background: '#0a0a0a', color: '#f0f0f0' }}>
      <style>{`
        .dp-input { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); color: #f0f0f0; border-radius: 3px; outline: none; font-family: monospace; font-size: 12px; -moz-appearance: textfield; }
        .dp-input:focus { border-color: rgba(0,255,136,0.5); box-shadow: 0 0 0 2px rgba(0,255,136,0.07); }
        .dp-input::-webkit-inner-spin-button, .dp-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .dp-input option { background: #1a1a1a; color: #f0f0f0; }
        .dp-input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>

      <Toast toast={toast} />

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Package size={18} style={{ color: '#00ff88' }}/> Detail Pekerjaan
        </h1>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'monospace' }}>
          Tanda Laku, Tumpuk Brongkol, Pemasangan Barcode, Tenaga Bantu, Kebersihan, Listrik, dan Custom.
        </p>
      </div>

      {/* Periode selector */}
      <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '12px 16px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>Periode:</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flex: 1 }}>
          {periodes.map(p => {
            const h = parseHalf(p.periode)
            const isSelected = selectedPeriode?.id === p.id
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPeriode(p)}
                style={{
                  padding: '4px 10px', borderRadius: 3, fontSize: 11, fontFamily: 'monospace',
                  fontWeight: isSelected ? 700 : 400,
                  background: isSelected ? '#00ff88' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isSelected ? '#00ff88' : 'rgba(255,255,255,0.08)'}`,
                  color: isSelected ? '#0a0a0a' : 'rgba(255,255,255,0.65)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                {p.periode}
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 2,
                  background: h === 'II'
                    ? (isSelected ? 'rgba(0,0,0,0.2)' : 'rgba(251,146,60,0.2)')
                    : (isSelected ? 'rgba(0,0,0,0.2)' : 'rgba(96,165,250,0.2)'),
                  color: h === 'II'
                    ? (isSelected ? 'rgba(0,0,0,0.7)' : '#fb923c')
                    : (isSelected ? 'rgba(0,0,0,0.7)' : '#60a5fa'),
                }}>{h}</span>
              </button>
            )
          })}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Tanda Laku */}
          <SectionPerJenis
            title="Tanda Laku" icon={TreePine} color="emerald" satuan="M³" tarifDefault={750}
            volumeField="volume" tableName="tanda_laku" rows={tandaLaku} setRows={setTandaLaku}
            jenisDefaults={DEFAULT_JENIS}
          />

          {/* Tumpuk Brongkol */}
          <SectionPerJenis
            title="Tumpuk Brongkol" icon={TreePine} color="amber" satuan="SM" tarifDefault={7000}
            volumeField="volume" tableName="brongkol" rows={brongkol} setRows={setBrongkol}
            jenisDefaults={DEFAULT_JENIS}
          />

          {/* Pemasangan Barcode */}
          <SectionPerJenis
            title="Pemasangan Barcode" icon={Barcode} color="violet" satuan="BTG" tarifDefault={350}
            volumeField="jumlah" tableName="barcode" rows={barcodeRows} setRows={setBarcodeRows}
            jenisDefaults={DEFAULT_JENIS_BARCODE}
          />

          {/* Tenaga Bantu — hanya periode II */}
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', opacity: isPeriodeII ? 1 : 0.5 }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.015)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={14} style={{ color: isPeriodeII ? SECTION_ACCENT.sky : 'rgba(255,255,255,0.2)' }}/>
                <p style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#f0f0f0' }}>
                  Tenaga Bantu {!isPeriodeII && <Lock size={11} style={{ display: 'inline', color: 'rgba(255,255,255,0.2)', marginLeft: 4 }}/>}
                </p>
              </div>
              <p style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: isPeriodeII ? SECTION_ACCENT.sky : 'rgba(255,255,255,0.2)' }}>
                {formatRupiah(isPeriodeII ? tenagaBantuNilai : 0)}
              </p>
            </div>
            <div style={{ padding: '16px' }}>
              {isPeriodeII ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6 }}>Jumlah Orang (otomatis dari Database Tenaga)</label>
                    <input type="number" value={tenagaBantu.jumlah_orang} readOnly
                      style={{ ...dp_inputStyle, background: 'rgba(255,255,255,0.01)', cursor: 'not-allowed' }}/>
                  </div>
                  <div>
                    <label style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6 }}>Tarif per Orang</label>
                    <input type="number" value={tenagaBantu.tarif_per_orang}
                      onChange={e => setTenagaBantu(p => ({ ...p, tarif_per_orang: e.target.value }))}
                      style={dp_inputStyle}/>
                  </div>
                  <div>
                    <label style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6 }}>Total</label>
                    <p style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: SECTION_ACCENT.sky, padding: '6px 8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
                      {formatRupiah(tenagaBantuNilai)}
                    </p>
                  </div>
                </div>
              ) : (
                <p style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
                  Hanya tersedia untuk periode II (misal II/1, II/2, ...). Periode saat ini: <strong>{half}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Kebersihan — hanya periode II */}
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', opacity: isPeriodeII ? 1 : 0.5 }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.015)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={14} style={{ color: isPeriodeII ? SECTION_ACCENT.orange : 'rgba(255,255,255,0.2)' }}/>
                <p style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#f0f0f0' }}>
                  Kebersihan {!isPeriodeII && <Lock size={11} style={{ display: 'inline', color: 'rgba(255,255,255,0.2)', marginLeft: 4 }}/>}
                </p>
              </div>
              <p style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: isPeriodeII ? SECTION_ACCENT.orange : 'rgba(255,255,255,0.2)' }}>
                {formatRupiah(isPeriodeII ? kebersihan.nominal : 0)}
              </p>
            </div>
            <div style={{ padding: '16px' }}>
              {isPeriodeII ? (
                <div style={{ maxWidth: 280 }}>
                  <label style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6 }}>Nominal (otomatis periode II)</label>
                  <input type="number" value={kebersihan.nominal}
                    onChange={e => setKebersihan(p => ({ ...p, nominal: e.target.value }))}
                    style={dp_inputStyle}/>
                </div>
              ) : (
                <p style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
                  Hanya tersedia untuk periode II (misal II/1, II/2, ...). Periode saat ini: <strong>{half}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Listrik — hanya periode I */}
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', opacity: isPeriodeI ? 1 : 0.5 }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.015)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={14} style={{ color: isPeriodeI ? SECTION_ACCENT.yellow : 'rgba(255,255,255,0.2)' }}/>
                <p style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#f0f0f0' }}>
                  Listrik TPK {!isPeriodeI && <Lock size={11} style={{ display: 'inline', color: 'rgba(255,255,255,0.2)', marginLeft: 4 }}/>}
                </p>
              </div>
              <p style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: isPeriodeI ? SECTION_ACCENT.yellow : 'rgba(255,255,255,0.2)' }}>
                {formatRupiah(isPeriodeI ? listrik.nominal : 0)}
              </p>
            </div>
            <div style={{ padding: '16px' }}>
              {isPeriodeI ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 480 }}>
                  <div>
                    <label style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6 }}>Nominal</label>
                    <input type="number" value={listrik.nominal}
                      onChange={e => setListrik(p => ({ ...p, nominal: e.target.value }))}
                      style={dp_inputStyle}/>
                  </div>
                  <div>
                    <label style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6 }}>No. Meter</label>
                    <input value={listrik.no_meter || ''}
                      onChange={e => setListrik(p => ({ ...p, no_meter: e.target.value }))}
                      style={dp_inputStyle} placeholder="516740016889"/>
                  </div>
                </div>
              ) : (
                <p style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
                  Hanya dapat diisi untuk periode I (misal I/1, I/2, ...). Periode saat ini: <strong>{half}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Custom Items */}
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.015)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Package size={14} style={{ color: SECTION_ACCENT.rose }}/>
                <p style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#f0f0f0' }}>Tabel Custom</p>
              </div>
              <p style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: SECTION_ACCENT.rose }}>{formatRupiah(customTotal)}</p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
              <thead>
                <tr>
                  {['Uraian','Satuan','Fisik','Tarif','Nilai',''].map((h, i) => (
                    <th key={i} style={{ padding: '7px 12px', textAlign: i >= 2 && i <= 4 ? 'right' : 'left', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)', width: i === 5 ? 36 : i >= 2 && i <= 4 ? 130 : 'auto' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customItems.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic', fontSize: 11 }}>
                    Belum ada item custom.
                  </td></tr>
                )}
                {customItems.map(r => {
                  const nilai = (parseFloat(r.fisik) || 0) * (parseFloat(r.tarif) || 0)
                  return (
                    <tr key={r._key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => { for (const td of e.currentTarget.children) td.style.background = 'rgba(255,255,255,0.02)' }}
                      onMouseLeave={e => { for (const td of e.currentTarget.children) td.style.background = '' }}
                    >
                      <td style={{ padding: '5px 12px' }}>
                        <input value={r.label || ''} onChange={e => updateCustom(r._key, 'label', e.target.value)}
                          style={dp_inputStyle} placeholder="Nama pekerjaan..."/>
                      </td>
                      <td style={{ padding: '5px 12px', width: 100 }}>
                        <input value={r.satuan || ''} onChange={e => updateCustom(r._key, 'satuan', e.target.value)}
                          style={dp_inputStyle} placeholder="KALI"/>
                      </td>
                      <td style={{ padding: '5px 12px', width: 130 }}>
                        <input type="number" step="0.001" value={r.fisik ?? ''}
                          onChange={e => updateCustom(r._key, 'fisik', e.target.value)}
                          style={dp_inputStyleRight}/>
                      </td>
                      <td style={{ padding: '5px 12px', width: 130 }}>
                        <input type="number" value={r.tarif ?? ''}
                          onChange={e => updateCustom(r._key, 'tarif', e.target.value)}
                          style={dp_inputStyleRight}/>
                      </td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 600, color: nilai > 0 ? '#f0f0f0' : 'rgba(255,255,255,0.2)' }}>{formatRupiah(nilai)}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                        <button onClick={() => removeCustom(r._key)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.2)', lineHeight: 0 }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ff6b6b'}
                          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                        ><Trash2 size={13}/></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
              <button onClick={addCustom}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.color = '#00ff88'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
              ><Plus size={11}/> Tambah Item</button>
            </div>
          </div>

          {/* Save */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
            <button onClick={handleSave} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: loading ? 'rgba(0,255,136,0.15)' : '#00ff88', color: loading ? 'rgba(0,255,136,0.4)' : '#0a0a0a', borderRadius: 3, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}
            ><Save size={13}/> {loading ? 'Menyimpan...' : 'Simpan Semua'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
