import { Loader2, Pencil, X } from 'lucide-react'
import ThemedSelect from '../components/ThemedSelect'

const inputStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 3,
  padding: '6px 10px',
  color: '#f0f0f0',
  fontFamily: 'monospace',
  fontSize: 12,
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
}

const fields = [
  { label: 'Tgl Kapling', key: 'tgl_kapling', type: 'date' },
  { label: 'Periode',     key: 'periode',     placeholder: 'Kosongkan untuk tidak diubah' },
  { label: 'No Blok',     key: 'no_blok',     placeholder: 'Kosongkan untuk tidak diubah' },
]

export default function RegisterKaplingBatchEditModal({
  data,
  isSaving,
  onCancel,
  onChange,
  onSubmit,
  selectedCount,
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, width: '100%', maxWidth: 380, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 8, background: 'rgba(0,180,255,0.08)', border: '1px solid rgba(0,180,255,0.15)', borderRadius: 3 }}>
              <Pencil size={14} style={{ color: 'rgba(0,180,255,0.9)' }}/>
            </div>
            <div>
              <p style={{ fontWeight: 600, color: '#f0f0f0', fontSize: 13, fontFamily: 'monospace' }}>edit massal</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2, fontFamily: 'monospace' }}>{selectedCount} kapling terpilih - isi field yang ingin diubah</p>
            </div>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}><X size={14}/></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {fields.map(field => (
            <div key={field.key}>
              <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontFamily: 'monospace' }}>{field.label}</label>
              <input
                type={field.type || 'text'}
                value={data[field.key]}
                onChange={event => onChange(field.key, event.target.value)}
                placeholder={field.placeholder}
                className="rk-input"
                style={{ ...inputStyle }}
              />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontFamily: 'monospace' }}>Sertifikasi</label>
            <ThemedSelect
              value={data.sertifikasi}
              onChange={next => onChange('sertifikasi', next)}
              options={[
                { value: '', label: '- Tidak diubah -' },
                'FSC',
                'NFSC',
              ]}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>batal</button>
          <button onClick={onSubmit} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 11, borderRadius: 3, background: isSaving ? 'rgba(0,180,255,0.15)' : 'rgba(0,180,255,0.9)', color: '#fff', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontWeight: 700, opacity: isSaving ? 0.7 : 1 }}>
            {isSaving && <Loader2 size={11} className="animate-spin"/>}
            {isSaving ? 'menyimpan...' : `update ${selectedCount} kapling`}
          </button>
        </div>
      </div>
    </div>
  )
}
