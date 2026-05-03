import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Save, AlertCircle, CheckCircle2, CalendarDays, Sparkles, Layers, Lock } from 'lucide-react'
import { DEFAULT_TARIF_PERIODE, TUMPUK_TARIF_KODE } from '../lib/rekapPekerjaan'

const JENIS_LIST = [
  { key: 'JATI', label: 'Tumpuk Kapling JATI' },
  { key: 'RIMBA_MAHONI', label: 'Tumpuk Kapling RIMBA (Mahoni)' },
  { key: 'RIMBA_KEDAWUNG', label: 'Tumpuk Kapling RIMBA (Kedawung)' },
]
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
  const [periodes, setPeriodes] = useState([])
  const [selectedPeriode, setSelectedPeriode] = useState(null)
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState({ penomoran: 0, sabuk: 0, slaghammer: 0 })
  // Tarif per sortimen — sumber: tabel_tarif_periode (dikelola di Main Link)
  const [tarifSortimen, setTarifSortimen] = useState(DEFAULT_TARIF)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => { fetchPeriodes() }, [])

  useEffect(() => {
    if (selectedPeriode) fetchData(selectedPeriode.id)
  }, [selectedPeriode])

  async function fetchPeriodes() {
    const { data } = await supabase
      .from('tabel_periode').select('*').order('created_at', { ascending: false })
    setPeriodes(data || [])
    if (data?.length && !selectedPeriode) setSelectedPeriode(data[0])
  }

  async function fetchData(periodeId) {
    setLoading(true)
    const [{ data: rowData }, { data: tarifData }] = await Promise.all([
      supabase.from('tabel_tumpuk_kapling').select('*').eq('periode_id', periodeId),
      supabase.from('tabel_tarif_periode').select('kode,tarif').eq('periode_id', periodeId),
    ])
    setRows(rowData || [])
    // Build map sortimen → tarif (fallback: DEFAULT_TARIF_PERIODE)
    const tarifByKode = Object.fromEntries((tarifData || []).map(t => [t.kode, t.tarif]))
    setTarifSortimen({
      AI:   tarifByKode[TUMPUK_TARIF_KODE.AI]   ?? DEFAULT_TARIF.AI,
      AII:  tarifByKode[TUMPUK_TARIF_KODE.AII]  ?? DEFAULT_TARIF.AII,
      AIII: tarifByKode[TUMPUK_TARIF_KODE.AIII] ?? DEFAULT_TARIF.AIII,
    })
    await fetchSummary(periodeId)
    setLoading(false)
  }

  async function fetchSummary(periodeId) {
    const [{ data: pen }, { data: sab }, { data: slag }] = await Promise.all([
      supabase.from('v_penomoran_kapling').select('*').eq('periode_id', periodeId).maybeSingle(),
      supabase.from('v_sabuk_kapling').select('*').eq('periode_id', periodeId).maybeSingle(),
      supabase.from('v_slaghammer').select('*').eq('periode_id', periodeId).maybeSingle(),
    ])
    setSummary({
      penomoran: pen || { fisik: 0, tarif: 900, nilai: 0 },
      sabuk: sab || { fisik: 0, tarif: 400, nilai: 0 },
      slaghammer: slag || { fisik: 0, tarif: 3000, nilai: 0 },
    })
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
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
    const { error } = await supabase.rpc('seed_tumpuk_kapling', { p_periode_id: selectedPeriode.id })
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
      }]
    })
  }

  async function handleSave() {
    if (!selectedPeriode) return showToast('Pilih periode dulu', 'error')
    setLoading(true)

    const payload = []
    for (const j of JENIS_LIST) {
      for (const s of SORTIMEN_LIST) {
        const row = getRow(j.key, s)
        payload.push({
          periode_id: selectedPeriode.id,
          jenis: j.key,
          sortimen: s,
          volume: parseFloat(row?.volume) || 0,
          // Tarif selalu diambil dari Tarif Periode (Main Link), bukan dari user.
          tarif: tarifSortimen[s] ?? DEFAULT_TARIF[s],
        })
      }
    }

    const { error } = await supabase
      .from('tabel_tumpuk_kapling')
      .upsert(payload, { onConflict: 'periode_id,jenis,sortimen' })

    if (error) {
      showToast(error.message, 'error')
    } else {
      showToast('Data Tumpuk Kapling tersimpan')
      fetchData(selectedPeriode.id)
    }
    setLoading(false)
  }

  const hasData = rows.length > 0
  const grid = hasData ? rows : (selectedPeriode ? buildEmptyGrid(selectedPeriode.id) : [])

  function totalPerJenis(jenis) {
    return SORTIMEN_LIST.reduce((sum, s) => {
      const r = grid.find(x => x.jenis === jenis && x.sortimen === s)
      return sum + (parseFloat(r?.volume) || 0)
    }, 0)
  }
  function nilaiPerJenis(jenis) {
    return SORTIMEN_LIST.reduce((sum, s) => {
      const r = grid.find(x => x.jenis === jenis && x.sortimen === s)
      const tarif = tarifSortimen[s] ?? DEFAULT_TARIF[s]
      return sum + (parseFloat(r?.volume) || 0) * tarif
    }, 0)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-primary-600'}`}>
          {toast.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          {toast.msg}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Layers size={22} className="text-primary-600" /> Tumpuk Kapling
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Input volume per jenis & sortimen. Penomoran, Sabuk, dan Slaghammer otomatis terhitung.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
          <Lock size={11} /> Tarif sortimen dikelola di <span className="font-medium">Main Link → Tarif Periode</span>.
        </p>
      </div>

      {/* Periode selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-5 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300 shrink-0">Periode:</span>
        <div className="flex flex-wrap gap-2 flex-1">
          {periodes.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPeriode(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriode?.id === p.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {p.periode}
            </button>
          ))}
          {periodes.length === 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic">Belum ada periode. Buat di Main Link.</span>
          )}
        </div>
        {selectedPeriode && (
          <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
            <CalendarDays size={12} />
            {formatTanggal(selectedPeriode.tgl_awal)} – {formatTanggal(selectedPeriode.tgl_akhir)}
          </p>
        )}
      </div>

      {selectedPeriode && (
        <>
          {/* Info kalau belum ada data */}
          {!hasData && !loading && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-5 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm">
                <Sparkles size={16} />
                <span>Belum ada data untuk periode ini. Gunakan grid di bawah atau generate 9 baris default.</span>
              </div>
              <button
                onClick={handleSeed}
                className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700"
              >
                Generate Default
              </button>
            </div>
          )}

          {/* Grid input per jenis */}
          <div className="space-y-4 mb-5">
            {JENIS_LIST.map(j => (
              <div key={j.key} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/40">
                  <p className="font-semibold text-gray-700 dark:text-gray-100 text-sm">{j.label}</p>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex gap-4">
                    <span>Total: <strong className="text-gray-700 dark:text-gray-100">{formatNum(totalPerJenis(j.key))} M³</strong></span>
                    <span className="text-primary-600 dark:text-primary-300 font-medium">{formatRupiah(nilaiPerJenis(j.key))}</span>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 w-24">Sortimen</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 w-32">Volume (M³)</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 w-36">
                        <span className="inline-flex items-center gap-1">
                          Tarif <Lock size={11} className="text-gray-400 dark:text-gray-500" />
                        </span>
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Nilai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {SORTIMEN_LIST.map(s => {
                      const r = grid.find(x => x.jenis === j.key && x.sortimen === s)
                      const vol = parseFloat(r?.volume) || 0
                      const trf = tarifSortimen[s] ?? DEFAULT_TARIF[s]
                      return (
                        <tr key={s} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-2 font-medium text-gray-600 dark:text-gray-200">{s}</td>
                          <td className="px-4 py-1.5">
                            <input
                              type="number" step="0.001"
                              value={r?.volume ?? ''}
                              onChange={e => updateVolume(j.key, s, e.target.value)}
                              className="w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-sm text-right tabular-nums outline-none focus:border-primary-400 dark:focus:border-primary-500"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-400 tabular-nums">
                            {formatRupiah(trf)}
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-gray-700 dark:text-gray-100 tabular-nums">
                            {formatRupiah(vol * trf)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Summary turunan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            {[
              {
                label: 'Penomoran Kapling', data: summary.penomoran, note: 'Semua jenis',
                cls: {
                  card:  'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
                  title: 'text-blue-600 dark:text-blue-300',
                  note:  'text-blue-500 dark:text-blue-400',
                  nilai: 'text-blue-700 dark:text-blue-200',
                },
              },
              {
                label: 'Sabuk Kapling', data: summary.sabuk, note: '= Penomoran',
                cls: {
                  card:  'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
                  title: 'text-emerald-600 dark:text-emerald-300',
                  note:  'text-emerald-500 dark:text-emerald-400',
                  nilai: 'text-emerald-700 dark:text-emerald-200',
                },
              },
              {
                label: 'Slaghammer', data: summary.slaghammer, note: 'JATI + Mahoni',
                cls: {
                  card:  'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900',
                  title: 'text-orange-600 dark:text-orange-300',
                  note:  'text-orange-500 dark:text-orange-400',
                  nilai: 'text-orange-700 dark:text-orange-200',
                },
              },
            ].map(c => (
              <div key={c.label} className={`${c.cls.card} border rounded-xl p-4`}>
                <p className={`text-xs font-medium uppercase tracking-wide ${c.cls.title}`}>{c.label}</p>
                <p className={`text-xs mb-2 ${c.cls.note}`}>{c.note}</p>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{formatNum(c.data.fisik)} M³</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">× {formatRupiah(c.data.tarif)}</p>
                <p className={`text-sm font-semibold mt-1 ${c.cls.nilai}`}>{formatRupiah(c.data.nilai)}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
            >
              <Save size={15} /> {loading ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
