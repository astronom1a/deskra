import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  Save, AlertCircle, CheckCircle2, CalendarDays, Plus, Trash2,
  TreePine, Barcode, Users, Sparkles, Zap, Package, Lock
} from 'lucide-react'

const DEFAULT_JENIS = ['JATI', 'RIMBA', 'MAHONI']
const DEFAULT_JENIS_BARCODE = ['JATI', 'MAHONI', 'KEDAWUNG']

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
  lockedJenis = null, // jika diisi: jenis tidak bisa diedit, kolom Jenis disembunyikan
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

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden`}>
      <div className={`px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-${color}-50`}>
        <div className="flex items-center gap-2">
          <Icon size={16} className={`text-${color}-600`} />
          <p className="font-semibold text-gray-700 text-sm">{title}</p>
        </div>
        <p className={`text-sm font-semibold text-${color}-700`}>{formatRupiah(total)}</p>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            {!lockedJenis && (
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Jenis</th>
            )}
            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 w-32">
              {volumeField === 'jumlah' ? `Jumlah (${satuan})` : `Volume (${satuan})`}
            </th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 w-32">Tarif</th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 w-36">Nilai</th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.length === 0 && (
            <tr><td colSpan={lockedJenis ? 4 : 5} className="px-4 py-4 text-center text-gray-400 text-xs italic">
              Belum ada baris. Tambah baris di bawah.
            </td></tr>
          )}
          {rows.map(r => {
            const nilai = (parseFloat(r[volumeField]) || 0) * (parseFloat(r.tarif) || 0)
            return (
              <tr key={r._key} className="hover:bg-gray-50/50">
                {!lockedJenis && (
                  <td className="px-4 py-1.5">
                    <input
                      value={r.jenis || ''}
                      onChange={e => updateRow(r._key, 'jenis', e.target.value)}
                      list={`jenis-${tableName}`}
                      className="w-full border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:border-primary-400"
                      placeholder="Jenis pohon..."
                    />
                    <datalist id={`jenis-${tableName}`}>
                      {jenisDefaults.map(j => <option key={j} value={j} />)}
                    </datalist>
                  </td>
                )}
                <td className="px-4 py-1.5">
                  <input
                    type="number" step="0.001"
                    value={r[volumeField] ?? ''}
                    onChange={e => updateRow(r._key, volumeField, e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right outline-none focus:border-primary-400"
                  />
                </td>
                <td className="px-4 py-1.5">
                  <input
                    type="number"
                    value={r.tarif ?? ''}
                    onChange={e => updateRow(r._key, 'tarif', e.target.value)}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right outline-none focus:border-primary-400"
                  />
                </td>
                <td className="px-4 py-2 text-right font-medium text-gray-700">{formatRupiah(nilai)}</td>
                <td className="px-2">
                  <button onClick={() => removeRow(r._key)} className="text-gray-300 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
        <button
          onClick={addRow}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-600"
        >
          <Plus size={12} /> Tambah Baris
        </button>
      </div>
    </div>
  )
}

// ============================================================
// Main Page
// ============================================================
export default function DetailPekerjaan() {
  const [periodes, setPeriodes] = useState([])
  const [selectedPeriode, setSelectedPeriode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

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

  useEffect(() => { fetchPeriodes() }, [])
  useEffect(() => {
    if (selectedPeriode) fetchAll(selectedPeriode.id)
  }, [selectedPeriode])

  async function fetchPeriodes() {
    const { data } = await supabase
      .from('tabel_periode').select('*').order('created_at', { ascending: false })
    setPeriodes(data || [])
    if (data?.length && !selectedPeriode) setSelectedPeriode(data[0])
  }

  async function fetchAll(periodeId) {
    setLoading(true)
    const [tl, tb, pb, tnb, kb, lt, ci, tenagaBantuCount] = await Promise.all([
      supabase.from('tabel_tanda_laku').select('*').eq('periode_id', periodeId).order('urutan'),
      supabase.from('tabel_tumpuk_brongkol').select('*').eq('periode_id', periodeId).order('urutan'),
      supabase.from('tabel_pemasangan_barcode').select('*').eq('periode_id', periodeId).order('urutan'),
      supabase.from('tabel_tenaga_bantu').select('*').eq('periode_id', periodeId).maybeSingle(),
      supabase.from('tabel_kebersihan').select('*').eq('periode_id', periodeId).maybeSingle(),
      supabase.from('tabel_listrik').select('*').eq('periode_id', periodeId).maybeSingle(),
      supabase.from('tabel_custom_item').select('*').eq('periode_id', periodeId).order('urutan'),
      fetchJumlahTenagaBantuAktif(),
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

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function fetchJumlahTenagaBantuAktif() {
    const { data, error } = await supabase
      .from('tabel_tenaga_kerja')
      .select('id,posisi')
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
    setLoading(true)
    const pid = selectedPeriode.id

    const mapRows = (rows, volumeField) => rows
      .filter(r => r.jenis?.trim())
      .map((r, i) => ({
        periode_id: pid,
        jenis: r.jenis.trim(),
        [volumeField]: parseFloat(r[volumeField]) || 0,
        tarif: parseFloat(r.tarif) || 0,
        urutan: i,
      }))

    // Replace-style save (delete + insert per tabel)
    const ops = [
      supabase.from('tabel_tanda_laku').delete().eq('periode_id', pid),
      supabase.from('tabel_tumpuk_brongkol').delete().eq('periode_id', pid),
      supabase.from('tabel_pemasangan_barcode').delete().eq('periode_id', pid),
      supabase.from('tabel_custom_item').delete().eq('periode_id', pid),
    ]
    await Promise.all(ops)

    const inserts = []
    const tlRows = mapRows(tandaLaku, 'volume')
    const tbRows = mapRows(brongkol, 'volume')
    const pbRows = barcodeRows
      .filter(r => r.jenis?.trim())
      .map((r, i) => ({
        periode_id: pid,
        jenis: normalizeBarcodeJenis(r.jenis),
        jumlah: parseFloat(r.jumlah) || 0,
        tarif: parseFloat(r.tarif) || 0,
        urutan: i,
      }))
    const ciRows = customItems
      .filter(r => r.label?.trim())
      .map((r, i) => ({
        periode_id: pid,
        label: r.label.trim(),
        satuan: r.satuan || null,
        fisik: parseFloat(r.fisik) || 0,
        tarif: parseFloat(r.tarif) || 0,
        urutan: i,
      }))

    if (tlRows.length) inserts.push(supabase.from('tabel_tanda_laku').insert(tlRows))
    if (tbRows.length) inserts.push(supabase.from('tabel_tumpuk_brongkol').insert(tbRows))
    if (pbRows.length) inserts.push(supabase.from('tabel_pemasangan_barcode').insert(pbRows))
    if (ciRows.length) inserts.push(supabase.from('tabel_custom_item').insert(ciRows))

    // Tenaga Bantu & Kebersihan & Listrik - upsert
    if (isPeriodeII) {
      const jumlahTenagaBantuAktif = await fetchJumlahTenagaBantuAktif()
      inserts.push(supabase.from('tabel_tenaga_bantu').upsert({
        periode_id: pid,
        jumlah_orang: jumlahTenagaBantuAktif ?? (parseInt(tenagaBantu.jumlah_orang) || 0),
        tarif_per_orang: parseFloat(tenagaBantu.tarif_per_orang) || 0,
      }, { onConflict: 'periode_id' }))
    }

    if (isPeriodeII) {
      inserts.push(supabase.from('tabel_kebersihan').upsert({
        periode_id: pid,
        nominal: parseFloat(kebersihan.nominal) || 0,
      }, { onConflict: 'periode_id' }))
    }

    if (isPeriodeI) {
      inserts.push(supabase.from('tabel_listrik').upsert({
        periode_id: pid,
        nominal: parseFloat(listrik.nominal) || 0,
        no_meter: listrik.no_meter || null,
      }, { onConflict: 'periode_id' }))
    }

    const results = await Promise.all(inserts)
    const err = results.find(r => r.error)
    if (err) {
      showToast(err.error.message, 'error')
    } else {
      showToast('Semua data berhasil disimpan')
      fetchAll(pid)
    }
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-primary-600'}`}>
          {toast.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          {toast.msg}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Package size={22} className="text-primary-600" /> Detail Pekerjaan
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Tanda Laku, Tumpuk Brongkol, Pemasangan Barcode, Tenaga Bantu, Kebersihan, Listrik, dan Custom.
        </p>
      </div>

      {/* Periode selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-600 shrink-0">Periode:</span>
        <div className="flex flex-wrap gap-2 flex-1">
          {periodes.map(p => {
            const h = parseHalf(p.periode)
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPeriode(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriode?.id === p.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.periode}
                <span className={`ml-1 text-[10px] px-1 rounded ${h === 'II' ? 'bg-orange-200 text-orange-700' : 'bg-blue-200 text-blue-700'}`}>
                  {h}
                </span>
              </button>
            )
          })}
          {periodes.length === 0 && (
            <span className="text-xs text-gray-400 italic">Belum ada periode. Buat di Main Link.</span>
          )}
        </div>
        {selectedPeriode && (
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <CalendarDays size={12} />
            {formatTanggal(selectedPeriode.tgl_awal)} – {formatTanggal(selectedPeriode.tgl_akhir)}
          </p>
        )}
      </div>

      {selectedPeriode && (
        <div className="space-y-5">
          {/* Tanda Laku */}
          <SectionPerJenis
            title="Tanda Laku"
            icon={TreePine}
            color="emerald"
            satuan="M³"
            tarifDefault={750}
            volumeField="volume"
            tableName="tanda_laku"
            rows={tandaLaku}
            setRows={setTandaLaku}
            jenisDefaults={DEFAULT_JENIS}
          />

          {/* Tumpuk Brongkol */}
          <SectionPerJenis
            title="Tumpuk Brongkol"
            icon={TreePine}
            color="amber"
            satuan="SM"
            tarifDefault={7000}
            volumeField="volume"
            tableName="brongkol"
            rows={brongkol}
            setRows={setBrongkol}
            jenisDefaults={DEFAULT_JENIS}
          />

                    {/* Pemasangan Barcode */}
          <SectionPerJenis
            title="Pemasangan Barcode"
            icon={Barcode} color="violet" satuan="BTG" tarifDefault={350}
            volumeField="jumlah" tableName="barcode"
            rows={barcodeRows} setRows={setBarcodeRows}
            jenisDefaults={DEFAULT_JENIS_BARCODE}
          />

          {/* Tenaga Bantu - hanya periode II */}
          <div className={`rounded-xl border overflow-hidden ${isPeriodeII ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-70'}`}>
            <div className={`px-5 py-3 border-b border-gray-100 flex items-center justify-between ${isPeriodeII ? 'bg-sky-50' : 'bg-gray-100'}`}>
              <div className="flex items-center gap-2">
                <Users size={16} className={isPeriodeII ? 'text-sky-600' : 'text-gray-400'} />
                <p className="font-semibold text-gray-700 text-sm">
                  Tenaga Bantu
                  {!isPeriodeII && <Lock size={12} className="inline ml-2 text-gray-400" />}
                </p>
              </div>
              <p className={`text-sm font-semibold ${isPeriodeII ? 'text-sky-700' : 'text-gray-400'}`}>
                {formatRupiah(isPeriodeII ? tenagaBantuNilai : 0)}
              </p>
            </div>
            <div className="p-5">
              {isPeriodeII ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Jumlah Orang (otomatis dari Database Tenaga)</label>
                    <input
                      type="number"
                      value={tenagaBantu.jumlah_orang}
                      readOnly
                      className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none bg-gray-50 text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Tarif per Orang</label>
                    <input
                      type="number"
                      value={tenagaBantu.tarif_per_orang}
                      onChange={e => setTenagaBantu(p => ({ ...p, tarif_per_orang: e.target.value }))}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:border-primary-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Total</label>
                    <p className="px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-50 rounded border border-gray-200">
                      {formatRupiah(tenagaBantuNilai)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">
                  Hanya tersedia untuk periode II (misal II/1, II/2, ...). Periode saat ini: <strong>{half}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Kebersihan — hanya periode II */}
          <div className={`rounded-xl border overflow-hidden ${isPeriodeII ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-70'}`}>
            <div className={`px-5 py-3 border-b border-gray-100 flex items-center justify-between ${isPeriodeII ? 'bg-orange-50' : 'bg-gray-100'}`}>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className={isPeriodeII ? 'text-orange-600' : 'text-gray-400'} />
                <p className="font-semibold text-gray-700 text-sm">
                  Kebersihan
                  {!isPeriodeII && <Lock size={12} className="inline ml-2 text-gray-400" />}
                </p>
              </div>
              <p className={`text-sm font-semibold ${isPeriodeII ? 'text-orange-700' : 'text-gray-400'}`}>
                {formatRupiah(isPeriodeII ? kebersihan.nominal : 0)}
              </p>
            </div>
            <div className="p-5">
              {isPeriodeII ? (
                <div className="max-w-xs">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Nominal (otomatis periode II)</label>
                  <input
                    type="number"
                    value={kebersihan.nominal}
                    onChange={e => setKebersihan(p => ({ ...p, nominal: e.target.value }))}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:border-primary-400"
                  />
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">
                  Hanya tersedia untuk periode II (misal II/1, II/2, ...). Periode saat ini: <strong>{half}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Listrik — hanya periode I */}
          <div className={`rounded-xl border overflow-hidden ${isPeriodeI ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-70'}`}>
            <div className={`px-5 py-3 border-b border-gray-100 flex items-center justify-between ${isPeriodeI ? 'bg-yellow-50' : 'bg-gray-100'}`}>
              <div className="flex items-center gap-2">
                <Zap size={16} className={isPeriodeI ? 'text-yellow-600' : 'text-gray-400'} />
                <p className="font-semibold text-gray-700 text-sm">
                  Listrik TPK
                  {!isPeriodeI && <Lock size={12} className="inline ml-2 text-gray-400" />}
                </p>
              </div>
              <p className={`text-sm font-semibold ${isPeriodeI ? 'text-yellow-700' : 'text-gray-400'}`}>
                {formatRupiah(isPeriodeI ? listrik.nominal : 0)}
              </p>
            </div>
            <div className="p-5">
              {isPeriodeI ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Nominal</label>
                    <input
                      type="number"
                      value={listrik.nominal}
                      onChange={e => setListrik(p => ({ ...p, nominal: e.target.value }))}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:border-primary-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">No. Meter</label>
                    <input
                      value={listrik.no_meter || ''}
                      onChange={e => setListrik(p => ({ ...p, no_meter: e.target.value }))}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:border-primary-400"
                      placeholder="516740016889"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">
                  Hanya dapat diisi untuk periode I (misal I/1, I/2, ...). Periode saat ini: <strong>{half}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Custom Items */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-rose-50">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-rose-600" />
                <p className="font-semibold text-gray-700 text-sm">Tabel Custom</p>
              </div>
              <p className="text-sm font-semibold text-rose-700">{formatRupiah(customTotal)}</p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Uraian</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 w-24">Satuan</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 w-28">Fisik</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 w-32">Tarif</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 w-36">Nilai</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customItems.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-4 text-center text-gray-400 text-xs italic">
                    Belum ada item custom.
                  </td></tr>
                )}
                {customItems.map(r => {
                  const nilai = (parseFloat(r.fisik) || 0) * (parseFloat(r.tarif) || 0)
                  return (
                    <tr key={r._key} className="hover:bg-gray-50/50">
                      <td className="px-4 py-1.5">
                        <input
                          value={r.label || ''}
                          onChange={e => updateCustom(r._key, 'label', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:border-primary-400"
                          placeholder="Nama pekerjaan..."
                        />
                      </td>
                      <td className="px-4 py-1.5">
                        <input
                          value={r.satuan || ''}
                          onChange={e => updateCustom(r._key, 'satuan', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:border-primary-400"
                          placeholder="KALI"
                        />
                      </td>
                      <td className="px-4 py-1.5">
                        <input
                          type="number" step="0.001"
                          value={r.fisik ?? ''}
                          onChange={e => updateCustom(r._key, 'fisik', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right outline-none focus:border-primary-400"
                        />
                      </td>
                      <td className="px-4 py-1.5">
                        <input
                          type="number"
                          value={r.tarif ?? ''}
                          onChange={e => updateCustom(r._key, 'tarif', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right outline-none focus:border-primary-400"
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-gray-700">{formatRupiah(nilai)}</td>
                      <td className="px-2">
                        <button onClick={() => removeCustom(r._key)} className="text-gray-300 hover:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
              <button
                onClick={addCustom}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-600"
              >
                <Plus size={12} /> Tambah Item
              </button>
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
            >
              <Save size={15} /> {loading ? 'Menyimpan...' : 'Simpan Semua'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

