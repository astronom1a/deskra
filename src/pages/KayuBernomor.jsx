import { useEffect, useMemo, useState } from 'react'
import { Search, Loader2, ScanLine } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthProvider'
import { getEffectiveTpkId } from '../lib/effectiveTpk'
import TpkRequiredState from '../components/TpkRequiredState'

const PAGE = 500

export default function KayuBernomor() {
  const { profile, isAdmin, activeTpkId } = useAuth()
  const tpkId = getEffectiveTpkId({ activeTpkId, profile })

  const [batang, setBatang]     = useState([])
  const [kaplingMap, setKaplingMap] = useState({})
  const [loading, setLoading]   = useState(false)
  const [search, setSearch]     = useState('')
  const [filterDkhp, setFilterDkhp] = useState('')

  useEffect(() => {
    if (!tpkId) return
    fetchData()
  }, [tpkId])

  async function fetchData() {
    setLoading(true)
    let all = []
    let from = 0
    while (true) {
      const { data } = await supabase
        .from('tabel_batang_aiii')
        .select('id,no_kapling,no_batang,panjang,diameter,volume')
        .eq('tpk_id', tpkId)
        .range(from, from + PAGE - 1)
        .order('no_kapling')
      if (!data?.length) break
      all = all.concat(data)
      if (data.length < PAGE) break
      from += PAGE
    }
    setBatang(all)

    if (all.length) {
      const kaplingNums = [...new Set(all.map(b => b.no_kapling))]
      const { data: kaps } = await supabase
        .from('tabel_register_kapling')
        .select('no_kapling,dkhp,skshhk,no_invois,pembeli')
        .eq('tpk_id', tpkId)
        .in('no_kapling', kaplingNums)
      const map = {}
      for (const k of kaps || []) map[k.no_kapling] = k
      setKaplingMap(map)
    }
    setLoading(false)
  }

  const dkhpOptions = useMemo(() => {
    const set = new Set(Object.values(kaplingMap).map(k => k.dkhp).filter(Boolean))
    return [...set].sort((a, b) => Number(a) - Number(b))
  }, [kaplingMap])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return batang.filter(b => {
      const kap = kaplingMap[b.no_kapling] || {}
      if (filterDkhp && kap.dkhp !== filterDkhp) return false
      if (!q) return true
      return (
        b.no_kapling.includes(q) ||
        b.no_batang.toLowerCase().includes(q) ||
        (kap.no_invois || '').toLowerCase().includes(q) ||
        (kap.pembeli || '').toLowerCase().includes(q)
      )
    })
  }, [batang, kaplingMap, search, filterDkhp])

  const totalVolume = useMemo(() => filtered.reduce((s, b) => s + (Number(b.volume) || 0), 0), [filtered])

  if (!tpkId) return <TpkRequiredState />

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: '#0a0a0a', color: '#f0f0f0', fontFamily: 'monospace' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <ScanLine size={16} style={{ color: '#00ff88' }} />
          <h1 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
            Kayu Bernomor <span style={{ color: '#00ff88' }}>(KBN)</span>
          </h1>
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
          Data batang AIII per nomor berdasarkan DKHP
        </p>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Batang', value: filtered.length.toLocaleString('id'), color: '#00ff88' },
          { label: 'Total Volume', value: `${totalVolume.toFixed(3)} m³`, color: '#60a5fa' },
          { label: 'DKHP Tercatat', value: dkhpOptions.length, color: '#a78bfa' },
        ].map(c => (
          <div key={c.label} style={{ padding: '12px 16px', background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4 }}>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{c.label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: c.color, margin: 0 }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari no. batang, kapling, invois, pembeli..."
            style={{ width: '100%', paddingLeft: 30, padding: '7px 10px 7px 30px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: '#f0f0f0', fontSize: 12, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={filterDkhp} onChange={e => setFilterDkhp(e.target.value)}
          style={{ padding: '7px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: filterDkhp ? '#f0f0f0' : 'rgba(255,255,255,0.35)', fontSize: 12, fontFamily: 'monospace', cursor: 'pointer' }}
        >
          <option value="">Semua DKHP</option>
          {dkhpOptions.map(d => <option key={d} value={d}>DKHP {d}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
          <Loader2 size={14} className="animate-spin" /> Memuat data...
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 4, border: '1px solid rgba(255,255,255,0.07)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#111', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['No. Kapling', 'No. Batang', 'DKHP', 'SKSHHK', 'No. Invois', 'Panjang', 'Ø (cm)', 'Volume'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '24px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>Tidak ada data</td></tr>
              ) : filtered.map(b => {
                const kap = kaplingMap[b.no_kapling] || {}
                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <td style={{ padding: '7px 12px', color: 'rgba(255,255,255,0.6)' }}>{b.no_kapling}</td>
                    <td style={{ padding: '7px 12px', color: '#00ff88', fontWeight: 600 }}>{b.no_batang}</td>
                    <td style={{ padding: '7px 12px' }}>
                      {kap.dkhp ? <span style={{ background: 'rgba(0,255,136,0.08)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 3, padding: '2px 6px', fontSize: 11 }}>{kap.dkhp}</span> : <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>}
                    </td>
                    <td style={{ padding: '7px 12px', color: 'rgba(255,255,255,0.55)' }}>{kap.skshhk || <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>}</td>
                    <td style={{ padding: '7px 12px', color: 'rgba(255,255,255,0.55)' }}>{kap.no_invois || <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>}</td>
                    <td style={{ padding: '7px 12px', color: 'rgba(255,255,255,0.7)', textAlign: 'right' }}>{b.panjang ?? '—'}</td>
                    <td style={{ padding: '7px 12px', color: 'rgba(255,255,255,0.7)', textAlign: 'right' }}>{b.diameter ?? '—'}</td>
                    <td style={{ padding: '7px 12px', color: '#60a5fa', textAlign: 'right', fontWeight: 600 }}>{Number(b.volume).toFixed(3)}</td>
                  </tr>
                )
              })}
            </tbody>
            {filtered.length > 0 && (
              <tfoot style={{ background: 'rgba(255,255,255,0.02)', borderTop: '2px solid rgba(255,255,255,0.08)' }}>
                <tr>
                  <td colSpan={7} style={{ padding: '7px 12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                    TOTAL · {filtered.length.toLocaleString('id')} batang
                  </td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: '#60a5fa' }}>{totalVolume.toFixed(3)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}
