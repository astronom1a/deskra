import { X } from 'lucide-react'

export default function RegisterKaplingSettingsModal({
  draftMap,
  excelHeaders,
  fieldDefs,
  onCancel,
  onChangeField,
  onResetDefault,
  onSave,
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, width: '100%', maxWidth: 480, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontWeight: 600, color: '#f0f0f0', fontFamily: 'monospace', fontSize: 13 }}>pengaturan header kolom</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'monospace' }}>sesuaikan nama header kolom sesuai file excel</p>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}><X size={14}/></button>
        </div>
        {excelHeaders.length > 0 && <datalist id="excel-headers-list">{excelHeaders.map(header => <option key={header} value={header}/>)}</datalist>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {fieldDefs.map(field => (
            <div key={field.key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'center' }}>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace', fontWeight: 500 }}>
                {field.label}{field.required && <span style={{ color: '#ff6b6b', marginLeft: 2 }}>*</span>}
              </label>
              <input
                list="excel-headers-list"
                value={draftMap[field.key] || ''}
                onChange={event => onChangeField(field.key, event.target.value)}
                placeholder="nama header di excel..."
                className="rk-input"
                style={{ padding: '5px 8px', width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          ))}
        </div>
        {excelHeaders.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, padding: '8px 12px', marginBottom: 16 }}>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 3, fontFamily: 'monospace' }}>header terdeteksi:</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace', lineHeight: 1.6 }}>{excelHeaders.join(', ')}</p>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <button onClick={onResetDefault} style={{ padding: '7px 12px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>reset default</button>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onCancel} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>batal</button>
            <button onClick={onSave} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, background: '#00ff88', color: '#0a0a0a', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 700 }}>simpan</button>
          </div>
        </div>
      </div>
    </div>
  )
}
