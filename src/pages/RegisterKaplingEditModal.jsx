import { Loader2, X } from 'lucide-react'
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

const selectStyle = {
  ...inputStyle,
  backgroundColor: '#101a14',
  borderColor: 'rgba(0,255,136,0.28)',
  colorScheme: 'dark',
}

const identityFields = [
  { label: 'Tgl Kapling', key: 'tgl_kapling', type: 'date', span: 1 },
  { label: 'Periode', key: 'periode', span: 1 },
  { label: 'No Blok', key: 'no_blok', span: 1 },
]

const woodFields = [
  { label: 'Jenis Kayu', key: 'jenis' },
  { label: 'Sortimen', key: 'sortimen' },
  { label: 'Sort. Untuk', key: 'sort_untuk' },
  { label: 'Asal Kayu', key: 'asal_kayu' },
  { label: 'Panjang', key: 'panjang' },
  { label: 'Lebar', key: 'lebar' },
  { label: 'Dia/Tebal', key: 'diameter_tebal' },
  { label: 'Jumlah', key: 'batang', type: 'number' },
  { label: 'Volume (M3)', key: 'volume', type: 'number' },
]

const qualityFields = [
  { label: 'Status', key: 'status', opts: ['LOKAL', 'INDUSTRI'] },
  { label: 'Mutu', key: 'mutu', opts: ['P', 'D', 'T', 'M', 'L', 'KBP'] },
  { label: 'Cacat', key: 'cacat', opts: [{ v: 'NRM', l: 'NRM' }, { v: 'BUN', l: 'BUN (BC)' }, { v: 'DOR', l: 'DOR (DR)' }] },
  { label: 'Sertifikasi', key: 'sertifikasi', opts: ['FSC', 'NFSC'] },
]

const documentFields = [
  { label: 'No. Invois', key: 'no_invois', span: 2 },
  { label: 'DKHP', key: 'dkhp', alignEnd: true },
  { label: 'Pembeli', key: 'pembeli', span: 2 },
  { label: 'SKSHHK', key: 'skshhk', alignEnd: true },
]

const badgeBase = { display: 'inline-block', padding: '2px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }

function Section({ children, title }) {
  return (
    <div>
      <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 10, fontFamily: 'monospace' }}>{title}</p>
      {children}
    </div>
  )
}

function FieldLabel({ children }) {
  return <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, fontFamily: 'monospace' }}>{children}</label>
}

export default function RegisterKaplingEditModal({
  invoicePrefixMap,
  isSaving,
  onCancel,
  onChange,
  onNumberStep,
  onSave,
  row,
}) {
  const modeLabel = row._new ? 'tambah kapling' : 'edit kapling'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, width: '100%', maxWidth: 640, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div>
            <p style={{ fontWeight: 600, color: '#f0f0f0', fontFamily: 'monospace', fontSize: 13 }}>{modeLabel}</p>
            {!row._new && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'monospace' }}>{row.no_kapling}</p>}
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}><X size={14}/></button>
        </div>

        <div style={{ overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Section title="Identitas">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                ...(row._new ? [{ label: 'No. Kapling', key: 'no_kapling', span: 3 }] : []),
                ...identityFields,
              ].map(field => (
                <div key={field.key} style={field.span === 3 ? { gridColumn: '1 / -1' } : field.span === 2 ? { gridColumn: 'span 2' } : {}}>
                  <FieldLabel>{field.label}</FieldLabel>
                  <input type={field.type || 'text'} value={row[field.key] ?? ''} onChange={event => onChange(field.key, event.target.value)} className="rk-input" style={{ ...inputStyle }} step={field.type === 'number' ? 'any' : undefined}/>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Kayu">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {woodFields.map(field => (
                <div key={field.key}>
                  <FieldLabel>{field.label}</FieldLabel>
                  <input
                    type={field.type || 'text'}
                    value={row[field.key] ?? ''}
                    onChange={event => onChange(field.key, event.target.value)}
                    onKeyDown={field.type === 'number' ? event => onNumberStep(event, field.key) : undefined}
                    className="rk-input"
                    style={{ ...inputStyle }}
                    step={field.type === 'number' ? (field.key === 'volume' ? '0.001' : '1') : undefined}
                    min={field.type === 'number' ? '0' : undefined}
                  />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Kualitas">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {qualityFields.map(field => (
                <div key={field.key}>
                  <FieldLabel>{field.label}</FieldLabel>
                  <ThemedSelect
                    value={row[field.key] ?? ''}
                    onChange={next => onChange(field.key, next)}
                    options={[{ value: '', label: '- Pilih -' }, ...field.opts.map(option => typeof option === 'string' ? option : { value: option.v, label: option.l })]}
                    style={selectStyle}
                  />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Dokumen">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {documentFields.map(field => (
                <div key={field.key} style={{ ...(field.span === 2 ? { gridColumn: 'span 2' } : {}), ...(field.alignEnd ? { alignSelf: 'end' } : {}) }}>
                  <FieldLabel>
                    {field.label}
                    {field.key === 'no_invois' && (
                      <span style={{ marginLeft: 8, display: 'inline-flex', gap: 4 }}>
                        {Object.entries(invoicePrefixMap).map(([key, value]) => (
                          <span key={key} title={value.desc} style={{ ...badgeBase, background: value.bg, color: value.color, border: `1px solid ${value.border}`, fontSize: 9 }}>{key}</span>
                        ))}
                      </span>
                    )}
                  </FieldLabel>
                  <input type="text" value={row[field.key] ?? ''} onChange={event => onChange(field.key, event.target.value)} className="rk-input" style={{ ...inputStyle }}/>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <button onClick={onCancel} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>batal</button>
          <button onClick={onSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 11, borderRadius: 3, background: isSaving ? 'rgba(0,255,136,0.15)' : '#00ff88', color: isSaving ? 'rgba(0,255,136,0.4)' : '#0a0a0a', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontWeight: 700 }}>
            {isSaving && <Loader2 size={11} className="animate-spin"/>}
            {isSaving ? 'menyimpan...' : row._new ? 'tambah' : 'simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
