import { FileBarChart2, Loader2, X } from 'lucide-react'

export default function RegisterKaplingDkhpModal({
  conflicts,
  input,
  isSaving,
  onCancel,
  onChangeInput,
  onCheck,
  onSave,
  rows,
  step,
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={() => !isSaving && onCancel()}>
      <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: 24, width: 440, maxHeight: '80vh', overflowY: 'auto' }}
        onClick={event => event.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f0f0f0', fontSize: 13 }}>
            <FileBarChart2 size={13} style={{ display: 'inline', marginRight: 8, color: '#00ff88' }}/>
            Input DKHP
          </span>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={14}/></button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <p style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            {rows.length} kapling dipilih
          </p>
          <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {rows.map(row => (
              <div key={row.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 3, fontFamily: 'monospace', fontSize: 11 }}>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>{row.no_kapling}</span>
                {row.dkhp && (
                  <span style={{ fontSize: 10, color: row.dkhp !== input.trim() && input.trim() ? '#ffaa00' : '#00ff88' }}>
                    DKHP {row.dkhp}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {step === 'input' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 6 }}>No. DKHP</label>
              <input
                autoFocus
                value={input}
                onChange={event => onChangeInput(event.target.value)}
                onKeyDown={event => event.key === 'Enter' && onCheck()}
                placeholder="contoh: 9 atau 12"
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3, padding: '8px 10px', color: '#f0f0f0', fontFamily: 'monospace', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={onCancel}
                style={{ padding: '7px 14px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}>
                batal
              </button>
              <button onClick={onCheck} disabled={!input.trim()}
                style={{ padding: '7px 14px', background: input.trim() ? '#00ff88' : 'rgba(0,255,136,0.2)', border: 'none', borderRadius: 3, color: '#0a0a0a', cursor: input.trim() ? 'pointer' : 'default', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>
                simpan
              </button>
            </div>
          </>
        )}

        {step === 'confirm-conflicts' && (
          <>
            <div style={{ marginBottom: 16, padding: '10px 12px', background: 'rgba(255,170,0,0.07)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 4 }}>
              <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#ffaa00', marginBottom: 8, fontWeight: 700 }}>
                {conflicts.length} kapling sudah memiliki DKHP berbeda:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {conflicts.map(row => (
                  <div key={row.id} style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.6)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{row.no_kapling}</span>
                    <span style={{ color: '#ffaa00' }}>DKHP {row.dkhp} - {input.trim()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={onCancel}
                style={{ padding: '7px 14px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}>
                batal
              </button>
              <button onClick={() => onSave(true)} disabled={isSaving}
                style={{ padding: '7px 14px', background: 'rgba(255,170,0,0.12)', border: '1px solid rgba(255,170,0,0.3)', borderRadius: 3, color: '#ffaa00', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}>
                lewati yang konflik
              </button>
              <button onClick={() => onSave(false)} disabled={isSaving}
                style={{ padding: '7px 14px', background: '#00ff88', border: 'none', borderRadius: 3, color: '#0a0a0a', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>
                {isSaving ? <Loader2 size={12} className="animate-spin"/> : 'update semua'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
