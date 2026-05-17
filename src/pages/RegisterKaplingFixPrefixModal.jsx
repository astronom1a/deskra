import { Loader2, X } from 'lucide-react'

const badgeBase = { display: 'inline-block', padding: '2px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }

export default function RegisterKaplingFixPrefixModal({
  entries,
  invoicePrefixMap,
  isSaving,
  onApply,
  onCancel,
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div>
            <p style={{ fontWeight: 600, color: '#f0f0f0', fontFamily: 'monospace', fontSize: 13 }}>perbaiki prefix invois</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'monospace' }}>
              dicocokkan dari DK310 Pengurangan - {entries.length} nomor invois akan diperbarui
            </p>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}><X size={14}/></button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '8px 24px' }}>
          {entries.length === 0 ? (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', padding: '24px 0', textAlign: 'center' }}>
              tidak ada nomor invois yang bisa dicocokkan dengan DK310 Pengurangan.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <th style={{ padding: '6px 0', textAlign: 'left', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>No. Invois (lama)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', width: 36 }}>Kpl</th>
                  <th style={{ padding: '6px 0', textAlign: 'right', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Menjadi</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(({ noInvois, count, prefix }) => {
                  const style = invoicePrefixMap[prefix]
                  return (
                    <tr key={noInvois} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '8px 0', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{noInvois}</td>
                      <td style={{ padding: '8px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{count}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ ...badgeBase, background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>{prefix}</span>
                          <span style={{ color: 'rgba(255,255,255,0.75)' }}>{noInvois}</span>
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <button onClick={onCancel} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>batal</button>
          <button onClick={onApply} disabled={isSaving || entries.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 11, borderRadius: 3, fontFamily: 'monospace', fontWeight: 700, border: 'none', cursor: (isSaving || !entries.length) ? 'not-allowed' : 'pointer', background: (isSaving || !entries.length) ? 'rgba(255,170,0,0.15)' : 'rgba(255,170,0,0.9)', color: (isSaving || !entries.length) ? 'rgba(255,170,0,0.4)' : '#0a0a0a' }}
          >
            {isSaving && <Loader2 size={11} className="animate-spin"/>}
            {isSaving ? 'menyimpan...' : `terapkan ${entries.length} invois`}
          </button>
        </div>
      </div>
    </div>
  )
}
