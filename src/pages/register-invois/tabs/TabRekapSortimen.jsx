import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { TableSkeleton } from '../../../components/ui/LoadingState'
import { INVOIS_PREFIX_MAP, RK_BADGE_BASE } from '../../register-kapling/utils/registerKaplingConstants'
import { parseInvois } from '../utils/parseInvois'
import { cleanPembeliName } from '../utils/cleanPembeliName'
import { InvoisSegments, SORTIMEN_BADGE, tdStyle, thStyle } from '../components/shared.jsx'

const SORTIMEN_ORDER = { AI: 0, AII: 1, AIII: 2 }

// Read-only: satu baris per invois × sortimen, angka diturunkan dari register kapling
export default function TabRekapSortimen({ invoisRows, kaplingRows, loading }) {
  const [search, setSearch] = useState('')

  const pembeliByInvois = useMemo(() => {
    const map = {}
    invoisRows.forEach(r => { map[r.no_invois] = cleanPembeliName(r.pembeli) })
    return map
  }, [invoisRows])

  const rekapRows = useMemo(() => {
    const map = {}
    kaplingRows.forEach(r => {
      if (!(r.no_invois || '').trim()) return
      const sortimen = (r.sortimen || '').trim().toUpperCase() || '—'
      const key = `${r.no_invois}|${sortimen}`
      if (!map[key]) {
        map[key] = {
          key,
          no_invois: r.no_invois,
          sortimen,
          batang: 0,
          volume: 0,
          pembeli: pembeliByInvois[r.no_invois] || cleanPembeliName(r.pembeli),
        }
      }
      map[key].batang += r.batang || 0
      map[key].volume += Number(r.volume || 0)
    })
    // Invois terbaru di atas (dari tanggal di nomor), sortimen urut AI → AIII
    return Object.values(map).sort((a, b) => {
      if (a.no_invois !== b.no_invois) {
        const pa = parseInvois(a.no_invois)
        const pb = parseInvois(b.no_invois)
        const ka = pa ? `${pa.tanggal}${pa.jamRaw}` : ''
        const kb = pb ? `${pb.tanggal}${pb.jamRaw}` : ''
        if (ka && kb) return kb.localeCompare(ka)
        if (ka) return -1
        if (kb) return 1
        return a.no_invois.localeCompare(b.no_invois)
      }
      return (SORTIMEN_ORDER[a.sortimen] ?? 9) - (SORTIMEN_ORDER[b.sortimen] ?? 9)
    })
  }, [kaplingRows, pembeliByInvois])

  const displayRows = useMemo(() => {
    const term = search.trim().toUpperCase()
    if (!term) return rekapRows
    return rekapRows.filter(r =>
      r.no_invois.toUpperCase().includes(term) ||
      r.pembeli.toUpperCase().includes(term) ||
      r.sortimen.includes(term)
    )
  }, [rekapRows, search])

  const totals = useMemo(() => ({
    invois: new Set(displayRows.map(r => r.no_invois)).size,
    batang: displayRows.reduce((s, r) => s + r.batang, 0),
    volume: displayRows.reduce((s, r) => s + r.volume, 0),
  }), [displayRows])

  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)' }} />
          <input
            className="rk-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="cari invois / pembeli / sortimen..."
            style={{ width: '100%', padding: '7px 10px 7px 30px' }}
          />
        </div>
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)' }}>
          {totals.invois.toLocaleString('id')} invois · {totals.batang.toLocaleString('id')} btg · <span style={{ color: '#379165' }}>{totals.volume.toFixed(3)} m³</span>
        </span>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>
          otomatis dari register kapling — read-only
        </span>
      </div>

      {loading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : displayRows.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', fontSize: 11, fontStyle: 'italic', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
          {search ? 'Tidak ada rekap yang cocok.' : 'Belum ada kapling ber-invois di register.'}
        </div>
      ) : (
        <div className="rk-table-scroll" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '1%' }}>#</th>
                <th style={thStyle}>no. invois</th>
                <th style={thStyle}>pembeli</th>
                <th style={{ ...thStyle, width: '1%' }}>sortimen</th>
                <th style={{ ...thStyle, width: '1%', textAlign: 'right' }}>batang</th>
                <th style={{ ...thStyle, width: '1%', textAlign: 'right' }}>kubikasi (m³)</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, i) => {
                const prefix = parseInvois(row.no_invois)?.prefix
                const pfx = prefix ? INVOIS_PREFIX_MAP[prefix] : null
                const badge = SORTIMEN_BADGE[row.sortimen] ?? SORTIMEN_BADGE['—']
                return (
                  <tr key={row.key} className="rk-row">
                    <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.25)', textAlign: 'right' }}>{i + 1}</td>
                    <td style={tdStyle}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {pfx && <span style={{ ...RK_BADGE_BASE, background: pfx.bg, color: pfx.color, border: `1px solid ${pfx.border}` }}>{prefix}</span>}
                        <InvoisSegments noInvois={row.no_invois} />
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: row.pembeli ? '#f0f0f0' : 'rgba(255,170,0,0.5)' }}>{row.pembeli || 'belum diisi'}</td>
                    <td style={tdStyle}>
                      <span style={{ ...RK_BADGE_BASE, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>{row.sortimen}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#f0f0f0' }}>{row.batang.toLocaleString('id')}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#379165', fontWeight: 600 }}>{row.volume.toFixed(3)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ ...tdStyle, borderBottom: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>total</td>
                <td style={{ ...tdStyle, borderBottom: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'right', color: '#f0f0f0', fontWeight: 700 }}>{totals.batang.toLocaleString('id')}</td>
                <td style={{ ...tdStyle, borderBottom: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'right', color: '#379165', fontWeight: 700 }}>{totals.volume.toFixed(3)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  )
}
