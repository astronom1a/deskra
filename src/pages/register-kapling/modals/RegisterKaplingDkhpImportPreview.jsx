import { FileBarChart2, Loader2, X } from 'lucide-react'

export default function RegisterKaplingDkhpImportPreview({
  isSaving,
  onCancel,
  onSave,
  preview,
}) {
  const totalConflicts = preview.dkhpList.reduce((sum, dkhp) => sum + dkhp.conflicts.length, 0)
  const totalMatched = preview.dkhpList.reduce((sum, dkhp) => sum + dkhp.matched.length, 0)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={() => !isSaving && onCancel()}>
      <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: 24, width: 500, maxHeight: '80vh', overflowY: 'auto' }}
        onClick={event => event.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f0f0f0', fontSize: 13 }}>
            <FileBarChart2 size={13} style={{ display: 'inline', marginRight: 8, color: '#00ff88' }}/>
            Import DKHP - {preview.dkhpList.length} file
          </span>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={14}/></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {preview.dkhpList.map((dkhp, index) => (
            <div key={`${dkhp.fileName}-${index}`} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: dkhp.conflicts.length ? 8 : 0 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{dkhp.fileName}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#00ff88' }}>DKHP {dkhp.dkhpNo}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{dkhp.matched.length} kapling</span>
                  {dkhp.unmatched.length > 0 && <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{dkhp.unmatched.length} tidak cocok</span>}
                </div>
              </div>
              {dkhp.conflicts.length > 0 && (
                <div style={{ padding: '6px 8px', background: 'rgba(255,170,0,0.07)', borderRadius: 3, border: '1px solid rgba(255,170,0,0.18)' }}>
                  <p style={{ fontFamily: 'monospace', fontSize: 10, color: '#ffaa00', marginBottom: 4 }}>{dkhp.conflicts.length} konflik:</p>
                  {dkhp.conflicts.map(row => (
                    <div key={row.id} style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.5)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{row.no_kapling}</span>
                      <span style={{ color: '#ffaa00' }}>DKHP {row.dkhp} - {dkhp.dkhpNo}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {preview.errors.map((error, index) => (
            <div key={`${error.fileName}-${index}`} style={{ padding: '8px 12px', background: 'rgba(255,107,107,0.05)', border: '1px solid rgba(255,107,107,0.15)', borderRadius: 4, fontFamily: 'monospace', fontSize: 11, color: '#ff6b6b' }}>
              {error.fileName} - {error.message}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel}
            style={{ padding: '7px 14px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}>
            batal
          </button>
          {totalConflicts > 0 && (
            <button onClick={() => onSave(true)} disabled={isSaving}
              style={{ padding: '7px 14px', background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 3, color: '#ffaa00', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}>
              lewati konflik ({totalConflicts})
            </button>
          )}
          <button onClick={() => onSave(false)} disabled={isSaving}
            style={{ padding: '7px 14px', background: '#00ff88', border: 'none', borderRadius: 3, color: '#0a0a0a', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            {isSaving ? <Loader2 size={12} className="animate-spin"/> : null}
            simpan {totalMatched} kapling
          </button>
        </div>
      </div>
    </div>
  )
}
