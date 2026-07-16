import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { computeTotalUK } from '../../lib/rekapPekerjaan'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { TableSkeleton } from '../../components/ui/LoadingState'
import { Plus, CheckCircle2, XCircle, Search, ChevronRight, Trash2, AlertCircle } from 'lucide-react'

function ReadinessChip({ periodeCount, operatorCount }) {
  if (periodeCount > 0 && operatorCount > 0) return null
  const label = operatorCount === 0 ? 'Belum ada operator' : 'Belum ada periode'
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-mono font-medium"
      style={{
        borderRadius: 3,
        background: 'rgba(255,170,0,0.08)',
        border: '1px solid rgba(255,170,0,0.22)',
        color: '#ffaa00',
        whiteSpace: 'nowrap',
      }}
    >
      ⚠ {label}
    </span>
  )
}

export default function AdminTpkList() {
  const navigate = useNavigate()
  const [tpkList, setTpkList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [deleteRow, setDeleteRow] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [
          { data: tpkData, error: tpkErr },
          { data: periodeData, error: periodeErr },
          { data: profileData, error: profileErr },
        ] = await Promise.all([
          supabase.from('tabel_tpk').select('*').order('namatpk'),
          supabase.from('tabel_periode').select('id, tpk_id, periode'),
          supabase.from('profiles').select('tpk_id').not('tpk_id', 'is', null),
        ])
        if (tpkErr) throw tpkErr
        if (periodeErr) throw periodeErr
        if (profileErr) throw profileErr

        const periodeList = periodeData || []
        const liveTotals = await Promise.all(
          periodeList.map(p => computeTotalUK(p.id, p.periode, { tpkId: p.tpk_id }))
        )

        const byTpk = periodeList.reduce((acc, p, i) => {
          if (!acc[p.tpk_id]) acc[p.tpk_id] = { count: 0, totalUk: 0 }
          acc[p.tpk_id].count++
          acc[p.tpk_id].totalUk += liveTotals[i] || 0
          return acc
        }, {})

        const operatorByTpk = (profileData || []).reduce((acc, p) => {
          acc[p.tpk_id] = (acc[p.tpk_id] || 0) + 1
          return acc
        }, {})

        setTpkList((tpkData || []).map(t => ({
          ...t,
          periodeCount: byTpk[t.id]?.count || 0,
          totalUk: byTpk[t.id]?.totalUk || 0,
          operatorCount: operatorByTpk[t.id] || 0,
        })))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const fmt = v => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(Math.round(v || 0))

  const filtered = tpkList.filter(t =>
    t.namatpk.toLowerCase().includes(search.toLowerCase()) ||
    (t.kode_tpk || '').includes(search)
  )

  async function handleDeleteTpk() {
    if (!deleteRow) return
    setDeleting(true)
    const { error } = await supabase
      .from('tabel_tpk')
      .delete()
      .eq('id', deleteRow.id)
    setDeleting(false)

    if (error) {
      setError(error.message)
      return
    }

    setTpkList(prev => prev.filter(t => t.id !== deleteRow.id))
    setDeleteRow(null)
  }

  return (
    <div className="ds-page" style={{ minHeight: '100%', background: '#0a0a0a', color: '#f0f0f0' }}>
      <div className="mx-auto" style={{ width: '100%', maxWidth: 'min(96vw, 1180px)' }}>
        <ConfirmDialog
          open={!!deleteRow}
          title="Hapus TPK?"
          message="TPK ini akan dihapus dari sistem. Data terkait dapat ikut terhapus atau ditolak oleh aturan database."
          detail={deleteRow?.namatpk}
          loading={deleting}
          onCancel={() => setDeleteRow(null)}
          onConfirm={handleDeleteTpk}
        />

        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <p className="text-xs font-mono tracking-widest uppercase mb-2" style={{ color: '#00ff88' }}>— superadmin</p>
            <h1 className="text-2xl font-bold" style={{ color: '#f0f0f0' }}>Manajemen TPK</h1>
            <p className="text-sm mt-1 font-mono" style={{ color: 'rgba(255,255,255,0.32)' }}>Kelola semua TPK yang terdaftar di sistem.</p>
          </div>
          <button
            onClick={() => navigate('/admin/tpk/buat')}
            className="flex items-center gap-2 font-mono"
            style={{ padding: '8px 14px', borderRadius: 3, background: '#00ff88', color: '#0a0a0a', border: 'none', fontSize: 12, fontWeight: 700 }}
          >
            <Plus size={14} /> Tambah TPK
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau kode TPK..."
            className="w-full font-mono"
            style={{ padding: '9px 14px 9px 36px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#f0f0f0', fontSize: 12, outline: 'none' }}
          />
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 font-mono" style={{ padding: '10px 12px', borderRadius: 3, background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.22)', color: '#ff6b6b', fontSize: 12 }}>
            <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
          {loading ? (
            <TableSkeleton rows={6} columns={7} />
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {search ? 'Tidak ada TPK yang cocok.' : 'Belum ada TPK terdaftar.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
            <table className="w-full text-sm" style={{ minWidth: 680 }}>
              <thead style={{ background: 'rgba(255,255,255,0.015)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <tr>
                  {['Lokasi TPK','Kode','Operator','Periode','Total UK','Status',''].map((h, i) => (
                    <th key={i} className={`px-5 py-3 font-mono text-xs ${i >= 2 && i <= 3 ? 'text-center' : i === 4 ? 'text-right' : i === 5 ? 'text-center' : 'text-left'}`} style={{ color: 'rgba(255,255,255,0.35)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/admin/tpk/${t.id}`)}
                    className="cursor-pointer transition-colors"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <td className="px-5 py-3.5" style={{ color: '#f0f0f0' }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{t.namatpk}</span>
                        <ReadinessChip periodeCount={t.periodeCount} operatorCount={t.operatorCount} />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{t.kode_tpk || '—'}</td>
                    <td className="px-5 py-3.5 text-center font-mono" style={{ color: 'rgba(255,255,255,0.45)' }}>{t.operatorCount}</td>
                    <td className="px-5 py-3.5 text-center font-mono" style={{ color: 'rgba(255,255,255,0.45)' }}>{t.periodeCount}</td>
                    <td className="px-5 py-3.5 text-right font-semibold font-mono" style={{ color: '#00ff88' }}>{fmt(t.totalUk)}</td>
                    <td className="px-5 py-3.5 text-center">
                      {t.aktif ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-medium" style={{ borderRadius: 3, background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.22)', color: '#00ff88' }}>
                          <CheckCircle2 size={10} /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-medium" style={{ borderRadius: 3, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)' }}>
                          <XCircle size={10} /> Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={e => { e.stopPropagation(); setError(null); setDeleteRow(t) }}
                          title="Hapus TPK"
                          style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.18)', borderRadius: 3, color: '#ff6b6b', cursor: 'pointer', padding: 5, lineHeight: 0 }}
                        >
                          <Trash2 size={13} />
                        </button>
                        <ChevronRight size={15} style={{ color: 'rgba(255,255,255,0.25)' }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
