import { Loader2, Receipt, X } from 'lucide-react'

const INVOIS_PREFIX_MAP = {
  ECR: { bg: 'rgba(0,180,255,0.1)',  color: 'rgba(0,180,255,0.95)',  border: 'rgba(0,180,255,0.28)',  desc: 'Retail' },
  ECK: { bg: 'rgba(0,255,136,0.08)', color: '#00ff88',               border: 'rgba(0,255,136,0.22)',  desc: 'DK318'  },
  EKK: { bg: 'rgba(170,80,255,0.1)', color: 'rgba(170,80,255,0.9)',  border: 'rgba(170,80,255,0.28)', desc: 'Khusus' },
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 3,
  padding: '8px 10px',
  color: '#f0f0f0',
  fontFamily: 'monospace',
  fontSize: 12,
  outline: 'none',
  boxSizing: 'border-box',
}

const badgeBase = {
  display: 'inline-block', padding: '2px 6px', borderRadius: 3,
  fontSize: 9, fontWeight: 600, fontFamily: 'monospace',
}

export default function RegisterKaplingQuickInvoisModal({
  isSaving,
  noInvois,
  onCancel,
  onChange,
  onSave,
  pembeli,
  row,
}) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={() => !isSaving && onCancel()}
    >
      <div
        style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: 24, width: 380 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f0f0f0', fontSize: 13 }}>
            <Receipt size={13} style={{ display: 'inline', marginRight: 8, color: '#00ff88' }}/>
            Input Invois
          </span>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
            <X size={14}/>
          </button>
        </div>

        {/* No. Kapling info */}
        <div style={{ marginBottom: 16, padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 3, fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
          {row.no_kapling}
        </div>

        {/* No. Invois */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>
            No. Invois
            <span style={{ display: 'inline-flex', gap: 4 }}>
              {Object.entries(INVOIS_PREFIX_MAP).map(([key, val]) => (
                <span key={key} title={val.desc} style={{ ...badgeBase, background: val.bg, color: val.color, border: `1px solid ${val.border}` }}>{key}</span>
              ))}
            </span>
          </label>
          <input
            autoFocus
            value={noInvois}
            onChange={e => onChange('no_invois', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !isSaving && onSave()}
            placeholder="contoh: ECR2025-001"
            style={inputStyle}
          />
        </div>

        {/* Pembeli */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>
            Pembeli
          </label>
          <input
            value={pembeli}
            onChange={e => onChange('pembeli', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !isSaving && onSave()}
            placeholder="nama pembeli"
            style={inputStyle}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{ padding: '7px 14px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}
          >
            batal
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: isSaving ? 'rgba(0,255,136,0.15)' : '#00ff88', border: 'none', borderRadius: 3, color: isSaving ? 'rgba(0,255,136,0.4)' : '#0a0a0a', cursor: isSaving ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}
          >
            {isSaving && <Loader2 size={11} className="animate-spin"/>}
            {isSaving ? 'menyimpan...' : 'simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
