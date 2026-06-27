import { ClipboardList, Loader2, X } from 'lucide-react'
import { simplifyRange } from '../utils/registerKaplingUtils'

const SYNC_COLS = [
  { key: 'sortimen',       label: 'Sort',   w: 46  },
  { key: 'panjang',        label: 'Panjang', w: 90 },
  { key: 'diameter_tebal', label: 'Ø',       w: 58  },
  { key: 'status',         label: 'Status',  w: 66  },
  { key: 'mutu',           label: 'Mutu',    w: 38  },
  { key: 'batang',         label: 'Btg',     w: 30  },
  { key: 'volume',         label: 'Vol',     w: 68  },
]

function fmtVal(key, val, batang) {
  if (key === 'volume') return parseFloat(val || 0).toFixed(3)
  if (key === 'panjang' || key === 'diameter_tebal') {
    return batang <= 1 ? simplifyRange(String(val ?? '')) : String(val ?? '')
  }
  return String(val ?? '')
}

export default function RegisterKaplingBapPreview({ isSaving, onCancel, onSave, preview }) {
  const gridCols = `116px ${SYNC_COLS.map(c => `${c.w}px`).join(' ')}`

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', maxHeight: '90vh', padding: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 8, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 3 }}>
              <ClipboardList size={16} style={{ color: 'rgba(139,92,246,0.9)' }} />
            </div>
            <div>
              <p style={{ fontWeight: 600, color: '#f0f0f0', fontSize: 13, fontFamily: 'monospace' }}>{preview.invoices.length} BAP siap diproses</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2, fontFamily: 'monospace' }}>{preview.fileCount} file dipilih</p>
            </div>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}><X size={14} /></button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 3, padding: '10px 14px' }}>
            <p style={{ fontSize: 10, color: '#00ff88', marginBottom: 2, fontFamily: 'monospace' }}>kapling ditemukan</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#00ff88', fontFamily: 'monospace' }}>{preview.totalMatched}</p>
          </div>
          {preview.totalDiffs > 0 && (
            <div style={{ flex: 1, background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.15)', borderRadius: 3, padding: '10px 14px' }}>
              <p style={{ fontSize: 10, color: '#ffaa00', marginBottom: 2, fontFamily: 'monospace' }}>ada perbedaan data</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#ffaa00', fontFamily: 'monospace' }}>{preview.totalDiffs}</p>
            </div>
          )}
          {preview.totalUnmatched > 0 && (
            <div style={{ flex: 1, background: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.15)', borderRadius: 3, padding: '10px 14px' }}>
              <p style={{ fontSize: 10, color: '#ff6b6b', marginBottom: 2, fontFamily: 'monospace' }}>tidak ada di register</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#ff6b6b', fontFamily: 'monospace' }}>{preview.totalUnmatched}</p>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>

          {preview.totalDiffs > 0 && (
            <div style={{ background: 'rgba(255,170,0,0.04)', border: '1px solid rgba(255,170,0,0.15)', borderRadius: 3, padding: '8px 12px', fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,170,0,0.75)' }}>
              Nilai <span style={{ color: '#ffaa00', fontWeight: 700 }}>kuning</span> = dari BAP (akan disimpan). Nilai <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>dicoret</span> = data register saat ini.
            </div>
          )}

          {preview.invoices.map(inv => {
            const diffCount = inv.matched.filter(m => m.diffs.length > 0).length
            return (
              <div key={inv.noBap} style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                {/* BAP header */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginBottom: 3, fontFamily: 'monospace' }}>{inv.fileName}</p>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', fontFamily: 'monospace' }}>{inv.noBap}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2, fontFamily: 'monospace' }}>{inv.pembeli || '—'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, background: 'rgba(0,255,136,0.08)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 2, padding: '2px 6px', fontFamily: 'monospace' }}>{inv.matched.length} cocok</span>
                    {diffCount > 0 && <span style={{ fontSize: 10, background: 'rgba(255,170,0,0.08)', color: '#ffaa00', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 2, padding: '2px 6px', fontFamily: 'monospace' }}>{diffCount} beda</span>}
                    {inv.unmatched.length > 0 && <span style={{ fontSize: 10, background: 'rgba(255,107,107,0.08)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 2, padding: '2px 6px', fontFamily: 'monospace' }}>{inv.unmatched.length} tidak ada</span>}
                  </div>
                </div>

                {/* Table */}
                {inv.matched.length > 0 && (
                  <div>
                    {/* Column headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 4, padding: '5px 12px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', fontFamily: 'monospace', textTransform: 'uppercase' }}>No Kapling</span>
                      {SYNC_COLS.map(c => (
                        <span key={c.key} style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', fontFamily: 'monospace', textTransform: 'uppercase' }}>{c.label}</span>
                      ))}
                    </div>

                    {/* Rows */}
                    {inv.matched.slice(0, 40).map(({ row, bap, diffs }) => (
                      <div key={row.no_kapling} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 4, padding: '5px 12px', borderTop: '1px solid rgba(255,255,255,0.04)', background: diffs.length > 0 ? 'rgba(255,170,0,0.025)' : 'transparent' }}>
                        <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)' }}>{row.no_kapling}</span>
                        {SYNC_COLS.map(({ key }) => {
                          const hasDiff = diffs.includes(key)
                          return (
                            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                              <span style={{ fontSize: 9, fontFamily: 'monospace', color: hasDiff ? '#ffaa00' : 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {fmtVal(key, bap[key], bap.batang)}
                              </span>
                              {hasDiff && (
                                <span style={{ fontSize: 8, fontFamily: 'monospace', color: 'rgba(255,255,255,0.22)', textDecoration: 'line-through', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {fmtVal(key, row[key], row.batang)}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                    {inv.matched.length > 40 && (
                      <div style={{ padding: '6px 12px', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                        +{inv.matched.length - 40} kapling lainnya
                      </div>
                    )}
                  </div>
                )}

                {/* Unmatched */}
                {inv.unmatched.length > 0 && (
                  <div style={{ padding: '6px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,107,107,0.025)' }}>
                    <p style={{ fontSize: 9, color: 'rgba(255,107,107,0.5)', fontFamily: 'monospace', marginBottom: 4, textTransform: 'uppercase' }}>tidak ada di register (periode berbeda?)</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {inv.unmatched.map(k => (
                        <span key={k} style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,107,107,0.7)', background: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.15)', borderRadius: 2, padding: '1px 5px' }}>{k}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {preview.errors.length > 0 && (
            <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ background: 'rgba(255,107,107,0.06)', padding: '6px 12px', fontSize: 10, fontWeight: 600, color: '#ff6b6b', fontFamily: 'monospace' }}>file yang dilewati</div>
              {preview.errors.map(e => (
                <div key={e.fileName} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)' }}>{e.fileName}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,107,107,0.8)', fontFamily: 'monospace' }}>{e.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onCancel} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>batal</button>
          {preview.totalMatched > 0 && (
            <button onClick={onSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 11, borderRadius: 3, background: isSaving ? 'rgba(139,92,246,0.2)' : '#a78bfa', color: isSaving ? 'rgba(139,92,246,0.4)' : '#0a0a0a', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontWeight: 700 }}>
              {isSaving && <Loader2 size={11} className="animate-spin" />}
              {isSaving ? 'menyimpan...' : `simpan & sync (${preview.totalMatched} kapling)`}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
