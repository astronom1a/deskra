import { ChevronDown, ChevronUp, X } from 'lucide-react'
import ThemedSelect from '../components/ThemedSelect'

export default function RegisterKaplingSortPanel({
  columns,
  draftSorts,
  onAddSort,
  onApply,
  onCancel,
  onChangeSortKey,
  onRemoveSort,
  onReset,
  onToggleSortDir,
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, width: '100%', maxWidth: 440, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontWeight: 600, color: '#f0f0f0', fontFamily: 'monospace', fontSize: 13 }}>urutan data</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'monospace' }}>atur prioritas kolom dan arah pengurutan</p>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}><X size={14}/></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {draftSorts.length === 0 && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '12px 0', fontFamily: 'monospace' }}>belum ada aturan pengurutan</p>
          )}
          {draftSorts.map((sort, index) => (
            <div key={`${sort.key}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', width: 16, textAlign: 'center', fontFamily: 'monospace' }}>{index + 1}</span>
              <ThemedSelect
                value={sort.key}
                onChange={next => onChangeSortKey(index, next)}
                options={columns.map(column => ({ value: column.key, label: column.label }))}
                style={{ flex: 1, minHeight: 29, padding: '5px 8px', fontSize: 11 }}
              />
              <button onClick={() => onToggleSortDir(index)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 11, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', minWidth: 60, justifyContent: 'center', fontFamily: 'monospace' }}>
                {sort.dir === 'asc' ? <><ChevronUp size={11}/> A-Z</> : <><ChevronDown size={11}/> Z-A</>}
              </button>
              <button onClick={() => onRemoveSort(index)} style={{ padding: 6, borderRadius: 3, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}
                onMouseEnter={event => event.currentTarget.style.color = '#ff6b6b'}
                onMouseLeave={event => event.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
              ><X size={12}/></button>
            </div>
          ))}
        </div>

        {draftSorts.length < columns.length && (
          <button onClick={onAddSort}
            style={{ width: '100%', padding: '7px 0', marginBottom: 16, fontSize: 11, border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 3, background: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'monospace' }}
            onMouseEnter={event => { event.currentTarget.style.borderColor = 'rgba(0,255,136,0.35)'; event.currentTarget.style.color = '#00ff88' }}
            onMouseLeave={event => { event.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; event.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
          >+ tambah kolom urutan</button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <button onClick={onReset} style={{ padding: '7px 12px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>reset</button>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onCancel} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>batal</button>
            <button onClick={onApply} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, background: '#00ff88', color: '#0a0a0a', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 700 }}>terapkan</button>
          </div>
        </div>
      </div>
    </div>
  )
}
