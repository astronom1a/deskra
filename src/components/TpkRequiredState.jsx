import { Building2 } from 'lucide-react'

export default function TpkRequiredState({
  title = 'TPK aktif belum dipilih',
  message = 'Pilih TPK terlebih dahulu atau login ulang agar data dapat ditampilkan.',
}) {
  return (
    <div style={{ padding: 24, minHeight: '100%', background: '#0a0a0a', color: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 420, width: '100%', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: 28, textAlign: 'center' }}>
        <div style={{ width: 42, height: 42, margin: '0 auto 14px', borderRadius: 3, background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Building2 size={18} style={{ color: '#00ff88' }}/>
        </div>
        <p style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#f0f0f0' }}>{title}</p>
        <p style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6, lineHeight: 1.55 }}>{message}</p>
      </div>
    </div>
  )
}
