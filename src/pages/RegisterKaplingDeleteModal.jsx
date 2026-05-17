import { Loader2, Trash2 } from 'lucide-react'

export default function RegisterKaplingDeleteModal({
  count = 0,
  isDeleting,
  mode,
  noKapling,
  onCancel,
  onConfirm,
}) {
  const isBatch = mode === 'batch'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, width: '100%', maxWidth: 360, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ padding: 8, background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 3 }}>
            <Trash2 size={16} style={{ color: '#ff6b6b' }}/>
          </div>
          <div>
            <p style={{ fontWeight: 600, color: '#f0f0f0', fontSize: 13, fontFamily: 'monospace' }}>
              {isBatch ? 'hapus data terpilih' : 'hapus kapling'}
            </p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2, fontFamily: 'monospace' }}>
              {isBatch ? `${count} kapling dipilih` : noKapling}
            </p>
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 20, fontFamily: 'monospace', lineHeight: 1.5 }}>
          {isBatch
            ? 'Semua kapling yang dipilih akan dihapus permanen dan tidak dapat dikembalikan.'
            : 'Data kapling ini akan dihapus permanen dan tidak dapat dikembalikan.'}
        </p>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>batal</button>
          <button onClick={onConfirm} disabled={isDeleting} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 11, borderRadius: 3, background: '#ff6b6b', color: '#0a0a0a', border: 'none', cursor: isDeleting ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontWeight: 700, opacity: isDeleting ? 0.6 : 1 }}>
            {isDeleting && <Loader2 size={11} className="animate-spin"/>}
            {isDeleting ? 'menghapus...' : isBatch ? `hapus ${count} kapling` : 'hapus'}
          </button>
        </div>
      </div>
    </div>
  )
}
