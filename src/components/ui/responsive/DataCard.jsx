// Kartu "data ticket" — pengganti baris tabel di tampilan mobile.
// fields: [{ label, value }] dirender sebagai grid 2 kolom label-atas-nilai-bawah.
// actions: node tombol aksi, dirender sebagai baris footer rata kanan.
export default function DataCard({ title, badge, fields = [], right, onClick, actions }) {
  return (
    <div
      className="ds-data-card"
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f0', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </span>
        {badge}
        {right && (
          <span style={{ fontSize: 13, fontWeight: 600, color: '#00ff88', flexShrink: 0 }}>
            {right}
          </span>
        )}
      </div>
      {fields.length > 0 && (
        <div className="ds-card-grid">
          {fields.map((f, i) => (
            <div key={i}>
              <p className="ds-card-label">{f.label}</p>
              <p className="ds-card-value">{f.value ?? '—'}</p>
            </div>
          ))}
        </div>
      )}
      {actions && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 10,
            paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {actions}
        </div>
      )}
    </div>
  )
}
