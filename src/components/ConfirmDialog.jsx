import { AlertCircle, Trash2 } from 'lucide-react'

export default function ConfirmDialog({
  open,
  title,
  message,
  detail,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  loading = false,
  tone = 'danger',
  onCancel,
  onConfirm,
}) {
  if (!open) return null

  const danger = tone === 'danger'
  const accent = danger ? '#ff6b6b' : '#00ff88'
  const Icon = danger ? Trash2 : AlertCircle

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.72)' }}>
      <div style={{ background: '#111', border: `1px solid ${danger ? 'rgba(255,107,107,0.3)' : 'rgba(0,255,136,0.25)'}`, borderRadius: 3, padding: 24, maxWidth: 390, width: '100%', margin: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, background: danger ? 'rgba(255,107,107,0.12)' : 'rgba(0,255,136,0.10)', border: `1px solid ${danger ? 'rgba(255,107,107,0.2)' : 'rgba(0,255,136,0.2)'}`, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={16} style={{ color: accent }}/>
          </div>
          <div>
            <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#f0f0f0', fontWeight: 600 }}>{title}</p>
            <p style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{message}</p>
          </div>
        </div>
        {detail && (
          <div style={{ background: danger ? 'rgba(255,107,107,0.08)' : 'rgba(0,255,136,0.06)', border: `1px solid ${danger ? 'rgba(255,107,107,0.2)' : 'rgba(0,255,136,0.14)'}`, borderRadius: 3, padding: '8px 16px', marginBottom: 16, textAlign: 'center' }}>
            <p style={{ fontFamily: 'monospace', color: accent, fontWeight: 700, fontSize: 13 }}>{detail}</p>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{ flex: 1, padding: '8px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: 'rgba(255,255,255,0.65)', fontSize: 12, fontFamily: 'monospace', cursor: loading ? 'not-allowed' : 'pointer' }}
          >{cancelLabel}</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{ flex: 1, padding: '8px 16px', background: danger ? 'rgba(255,107,107,0.15)' : 'rgba(0,255,136,0.16)', border: `1px solid ${danger ? 'rgba(255,107,107,0.3)' : 'rgba(0,255,136,0.3)'}`, borderRadius: 3, color: accent, fontSize: 12, fontFamily: 'monospace', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: loading ? 0.55 : 1 }}
          >{loading ? 'Memproses...' : confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
