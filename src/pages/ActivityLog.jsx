import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthProvider'
import { getEffectiveTpkId } from '../lib/effectiveTpk'
import TpkRequiredState from '../components/layout/TpkRequiredState'
import { TableSkeleton } from '../components/ui/LoadingState'
import { ChevronDown, ChevronRight } from 'lucide-react'
import ThemedSelect from '../components/ui/ThemedSelect'

const ENTITY_LABELS = {
  register_kapling: 'Register Kapling',
  periode:          'Periode',
  tenaga_kerja:     'Tenaga Kerja',
  pejabat:          'Pejabat',
}

const ACTION_STYLE = {
  create: { bg: 'rgba(0,255,136,0.1)',   color: '#00ff88',             border: 'rgba(0,255,136,0.22)',   label: 'buat'  },
  update: { bg: 'rgba(0,180,255,0.1)',   color: 'rgba(0,180,255,0.9)', border: 'rgba(0,180,255,0.22)',   label: 'ubah'  },
  delete: { bg: 'rgba(255,107,107,0.1)', color: '#ff6b6b',             border: 'rgba(255,107,107,0.22)', label: 'hapus' },
}

function ActionBadge({ action }) {
  const s = ACTION_STYLE[action] || {}
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '1px 7px',
      borderRadius: 3, fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {s.label || action}
    </span>
  )
}

function DiffTable({ diff }) {
  if (!diff || !diff.length) {
    return <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontFamily: 'monospace' }}>—</span>
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'monospace' }}>
      <thead>
        <tr>
          {['Field', 'Sebelum', 'Sesudah'].map(h => (
            <th key={h} style={{
              textAlign: 'left', padding: '3px 8px',
              color: 'rgba(255,255,255,0.35)', fontWeight: 600,
              fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {diff.map((d, i) => (
          <tr key={i}>
            <td style={{ padding: '3px 8px', color: 'rgba(255,255,255,0.55)' }}>{d.label || d.field}</td>
            <td style={{ padding: '3px 8px', color: '#ff6b6b'  }}>{String(d.before ?? '—')}</td>
            <td style={{ padding: '3px 8px', color: '#00ff88'  }}>{String(d.after  ?? '—')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function LogRow({ log }) {
  const [expanded, setExpanded] = useState(false)
  const hasDiff = log.diff && log.diff.length > 0
  const date    = new Date(log.created_at)
  const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  return (
    <>
      <tr
        onClick={() => hasDiff && setExpanded(e => !e)}
        style={{ cursor: hasDiff ? 'pointer' : 'default', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
        onMouseEnter={e => { if (hasDiff) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <td style={{ padding: '8px 12px', fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
          <div>{dateStr}</div>
          <div style={{ color: 'rgba(255,255,255,0.3)' }}>{timeStr}</div>
        </td>
        <td style={{ padding: '8px 12px', fontSize: 11, fontFamily: 'monospace', color: '#f0f0f0' }}>{log.nama_operator || '—'}</td>
        <td style={{ padding: '8px 12px' }}><ActionBadge action={log.action} /></td>
        <td style={{ padding: '8px 12px', fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.45)' }}>
          {ENTITY_LABELS[log.entity_type] || log.entity_type}
        </td>
        <td style={{ padding: '8px 12px', fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.65)' }}>
          {log.entity_label || log.entity_id || '—'}
        </td>
        <td style={{ padding: '8px 12px', width: 24 }}>
          {hasDiff && (expanded
            ? <ChevronDown  size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
            : <ChevronRight size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
          )}
        </td>
      </tr>
      {expanded && hasDiff && (
        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <td colSpan={6} style={{ padding: '8px 24px 12px', background: 'rgba(255,255,255,0.02)' }}>
            <DiffTable diff={log.diff} />
          </td>
        </tr>
      )}
    </>
  )
}

export default function ActivityLog() {
  const { profile, activeTpkId } = useAuth()
  const tpkId = getEffectiveTpkId({ activeTpkId, profile })

  const today    = new Date().toISOString().split('T')[0]
  const sevenAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [dateFrom,     setDateFrom]     = useState(sevenAgo)
  const [dateTo,       setDateTo]       = useState(today)
  const [moduleFilter, setModuleFilter] = useState('all')
  const [logs,         setLogs]         = useState([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    if (!tpkId) { setLogs([]); setLoading(false); return }
    async function load() {
      setLoading(true)
      let q = supabase
        .from('tabel_activity_log')
        .select('id, created_at, nama_operator, action, entity_type, entity_label, entity_id, diff')
        .order('created_at', { ascending: false })
        .limit(200)
      if (dateFrom)               q = q.gte('created_at', dateFrom)
      if (dateTo)                 q = q.lte('created_at', dateTo + 'T23:59:59')
      if (moduleFilter !== 'all') q = q.eq('entity_type', moduleFilter)
      const { data } = await q
      setLogs(data || [])
      setLoading(false)
    }
    load()
  }, [dateFrom, dateTo, moduleFilter, tpkId])

  if (!tpkId) return <TpkRequiredState />

  const panelStyle = {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 3,
  }
  const inputStyle = {
    padding: '6px 10px', borderRadius: 3,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.03)',
    color: '#f0f0f0', fontFamily: 'monospace', fontSize: 11, outline: 'none',
    minHeight: 30, boxSizing: 'border-box', colorScheme: 'dark',
  }

  return (
    <div style={{ padding: 24, background: '#0a0a0a', color: '#f0f0f0', minHeight: '100%' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', margin: 0, color: '#f0f0f0' }}>
          Log Aktivitas
        </h1>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4, fontFamily: 'monospace' }}>
          Riwayat perubahan data oleh operator.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Filter</span>
        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>dari</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>sampai</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)' }} />
        <ThemedSelect
          value={moduleFilter}
          onChange={val => setModuleFilter(val)}
          options={[
            { value: 'all',              label: 'Semua Modul'    },
            { value: 'register_kapling', label: 'Register Kapling' },
            { value: 'periode',          label: 'Periode'         },
            { value: 'tenaga_kerja',     label: 'Tenaga Kerja'    },
            { value: 'pejabat',          label: 'Pejabat'         },
          ]}
          style={{ width: 170, fontSize: 11, minHeight: 30 }}
        />
      </div>

      <div style={panelStyle}>
        {loading ? (
          <div style={{ padding: 20 }}><TableSkeleton rows={6} /></div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
            Tidak ada log pada rentang waktu ini.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Waktu', 'Operator', 'Aksi', 'Modul', 'Entitas', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 12px', textAlign: 'left',
                    fontSize: 10, fontFamily: 'monospace',
                    color: 'rgba(255,255,255,0.35)', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => <LogRow key={log.id} log={log} />)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
