import { useEffect, useMemo, useState } from 'react'
import {
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown,
  Search, ScanLine, X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthProvider'
import { getEffectiveTpkId } from '../lib/effectiveTpk'
import TpkRequiredState from '../components/layout/TpkRequiredState'
import { TableSkeleton } from '../components/ui/LoadingState'
import ThemedSelect from '../components/ui/ThemedSelect'
import { useIsMobile } from '../lib/hooks/useIsMobile'

const PAGE = 500
const COLS = [
  { key: 'no_kapling', label: 'No. Kapling' },
  { key: 'no_batang', label: 'No. Batang' },
  { key: 'dkhp', label: 'DKHP', num: true },
  { key: 'skshhk', label: 'SKSHHK' },
  { key: 'no_invois', label: 'No. Invois' },
  { key: 'panjang', label: 'Panjang', num: true },
  { key: 'diameter', label: 'Ø (cm)', num: true },
  { key: 'volume', label: 'Volume', num: true },
]

const PAGE_SIZES = [
  { label: '10', value: 10 },
  { label: '20', value: 20 },
  { label: '50', value: 50 },
  { label: '100', value: 100 },
  { label: '500', value: 500 },
  { label: 'Semua', value: 0 },
]

export default function KayuBernomor() {
  const { profile, isAdmin, activeTpkId } = useAuth()
  const isMobile = useIsMobile()
  const tpkId = getEffectiveTpkId({ activeTpkId, profile })

  const [batang, setBatang]     = useState([])
  const [kaplingMap, setKaplingMap] = useState({})
  const [loading, setLoading]   = useState(false)
  const [search, setSearch]     = useState('')
  const [searchCol, setSearchCol] = useState('all')
  const [filterDkhp, setFilterDkhp] = useState('')
  const [sorts, setSorts]       = useState([{ key: 'no_kapling', dir: 'asc' }])
  const [pageSize, setPageSize] = useState(50)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (!tpkId) return
    fetchData()
  }, [tpkId])

  async function fetchData() {
    setLoading(true)
    let all = []
    let from = 0
    setKaplingMap({})
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

  useEffect(() => { setCurrentPage(1) }, [search, searchCol, filterDkhp])

  const dkhpOptions = useMemo(() => {
    const set = new Set(Object.values(kaplingMap).map(k => k.dkhp).filter(Boolean))
    return [...set].sort((a, b) => Number(a) - Number(b))
  }, [kaplingMap])

  function getKapling(row) {
    return kaplingMap[row.no_kapling] || {}
  }

  function getDisplayVal(row, key) {
    const kap = getKapling(row)
    if (key === 'dkhp') return kap.dkhp || ''
    if (key === 'skshhk') return kap.skshhk || ''
    if (key === 'no_invois') return kap.no_invois || ''
    if (key === 'pembeli') return kap.pembeli || ''
    if (key === 'volume') return Number(row.volume || 0).toFixed(3)
    return String(row[key] ?? '')
  }

  function getSortVal(row, key) {
    const col = COLS.find(c => c.key === key)
    const val = getDisplayVal(row, key)
    if (col?.num) return Number(val) || 0
    return val.toLowerCase()
  }

  function toggleSort(key) {
    setSorts(prev => {
      if (prev[0]?.key === key) {
        const newDir = prev[0].dir === 'asc' ? 'desc' : 'asc'
        return [{ key, dir: newDir }]
      }
      return [{ key, dir: 'asc' }]
    })
    setCurrentPage(1)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return batang.filter(b => {
      const kap = getKapling(b)
      if (filterDkhp && kap.dkhp !== filterDkhp) return false
      if (!q) return true
      if (searchCol === 'all') return [...COLS, { key: 'pembeli' }].some(c => getDisplayVal(b, c.key).toLowerCase().includes(q))
      return getDisplayVal(b, searchCol).toLowerCase().includes(q)
    })
  }, [batang, kaplingMap, search, searchCol, filterDkhp])

  const sortedRows = useMemo(() => {
    if (!sorts.length) return filtered
    return [...filtered].sort((a, b) => {
      for (const s of sorts) {
        const col = COLS.find(c => c.key === s.key)
        const av = getSortVal(a, s.key)
        const bv = getSortVal(b, s.key)
        const cmp = col?.num ? av - bv : av < bv ? -1 : av > bv ? 1 : 0
        if (cmp !== 0) return s.dir === 'asc' ? cmp : -cmp
      }
      return 0
    })
  }, [filtered, sorts])

  const totalVolume = useMemo(() => filtered.reduce((s, b) => s + (Number(b.volume) || 0), 0), [filtered])
  const totalPages = pageSize === 0 ? 1 : Math.ceil(sortedRows.length / pageSize)
  const safePage = Math.min(currentPage, totalPages || 1)
  const displayedRows = pageSize === 0
    ? sortedRows
    : sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize)

  if (!tpkId) return <TpkRequiredState />

  return (
    <div className="ds-page" style={{ height: isMobile ? 'calc(100dvh - 48px)' : '100vh', boxSizing: 'border-box', overflow: 'hidden', background: '#0a0a0a', color: '#f0f0f0', fontFamily: 'monospace', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .kbn-th:hover { background: rgba(255,255,255,0.04) !important; }
        .kbn-input:focus { border-color: rgba(0,255,136,0.5) !important; box-shadow: 0 0 0 2px rgba(0,255,136,0.07); }
        .kbn-input::placeholder { color: rgba(255,255,255,0.22); }
      `}</style>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
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
      {!loading && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              menampilkan{' '}
              <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.68)' }}>{displayedRows.length.toLocaleString('id')}</span>
              {' '}dari{' '}
              <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.68)' }}>{sortedRows.length.toLocaleString('id')}</span>
              {search.trim() && <span style={{ color: 'rgba(255,255,255,0.24)' }}>{' '}(total {batang.length.toLocaleString('id')})</span>}
              {' '}batang
            </p>
            {pageSize > 0 && totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                  style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', fontSize: 11, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', cursor: safePage === 1 ? 'not-allowed' : 'pointer', opacity: safePage === 1 ? 0.4 : 1, fontFamily: 'monospace' }}
                ><ChevronLeft size={10}/> prev</button>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', padding: '0 6px' }}>{safePage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                  style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', fontSize: 11, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', opacity: safePage === totalPages ? 0.4 : 1, fontFamily: 'monospace' }}
                >next <ChevronRight size={10}/></button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {/* Kolom pencarian */}
            <ThemedSelect
              value={searchCol}
              onChange={val => setSearchCol(val)}
              options={[{ value: 'all', label: 'Semua Kolom' }, ...COLS.map(c => ({ value: c.key, label: c.label })), { value: 'pembeli', label: 'Pembeli' }]}
              style={{ width: 140, minHeight: 30, fontSize: 11 }}
            />
            {/* Search input */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <Search size={11} style={{ position: 'absolute', left: 8, color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="cari..."
                className="kbn-input"
                style={{ height: 30, width: 160, padding: `0 ${search ? 24 : 9}px 0 24px`, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: '#f0f0f0', fontSize: 11, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0, lineHeight: 0 }}><X size={10}/></button>
              )}
            </div>
            {/* Filter DKHP */}
            <ThemedSelect
              value={filterDkhp}
              onChange={val => { setFilterDkhp(val); setCurrentPage(1) }}
              options={[{ value: '', label: 'Semua DKHP' }, ...dkhpOptions.map(d => ({ value: d, label: `DKHP ${d}` }))]}
              placeholder="Semua DKHP"
              style={{ width: 130, minHeight: 30, fontSize: 11 }}
            />
            {/* Page size */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderLeft: '1px solid rgba(255,255,255,0.07)', paddingLeft: 8, marginLeft: 2, flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>per halaman</span>
              <div style={{ display: 'flex', gap: 3 }}>
                {PAGE_SIZES.map(p => (
                  <button key={p.value} onClick={() => { setPageSize(p.value); setCurrentPage(1) }}
                    style={{ height: 30, padding: '0 8px', fontSize: 11, borderRadius: 3, fontWeight: 600, fontFamily: 'monospace', cursor: 'pointer', border: pageSize === p.value ? 'none' : '1px solid rgba(255,255,255,0.08)', background: pageSize === p.value ? '#00ff88' : 'rgba(255,255,255,0.04)', color: pageSize === p.value ? '#0a0a0a' : 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}
                  >{p.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
        {loading ? (
          <TableSkeleton rows={6} columns={8} />
        ) : batang.length === 0 ? (
          <div style={{ padding: 44, textAlign: 'center', color: 'rgba(255,255,255,0.24)', fontSize: 12 }}>Belum ada data kayu bernomor.</div>
        ) : (
        <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', scrollbarGutter: 'stable both-edges' }}>
          <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ background: '#111', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', width: 42 }}>No</th>
                {COLS.map(c => (
                  <th key={c.key} onClick={() => toggleSort(c.key)} className="kbn-th"
                    style={{ padding: '8px 12px', textAlign: c.num ? 'right' : 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      {c.label}
                      {(() => {
                        const idx = sorts.findIndex(s => s.key === c.key)
                        if (idx === -1) return <ChevronsUpDown size={10} style={{ color: 'rgba(255,255,255,0.15)' }}/>
                        const s = sorts[idx]
                        return s.dir === 'asc'
                          ? <ChevronUp size={10} style={{ color: '#00ff88' }}/>
                          : <ChevronDown size={10} style={{ color: '#00ff88' }}/>
                      })()}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedRows.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: '24px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>Tidak ada data yang cocok.</td></tr>
              ) : displayedRows.map((b, i) => {
                const kap = kaplingMap[b.no_kapling] || {}
                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <td style={{ padding: '7px 12px', color: 'rgba(255,255,255,0.22)', fontSize: 11 }}>{(safePage - 1) * (pageSize || 0) + i + 1}</td>
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
                  <td colSpan={8} style={{ padding: '7px 12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
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
    </div>
  )
}
