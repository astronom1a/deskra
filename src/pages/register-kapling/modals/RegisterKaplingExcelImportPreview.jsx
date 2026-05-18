import { FileSpreadsheet, Loader2, X } from 'lucide-react'

export default function RegisterKaplingExcelImportPreview({
  importing,
  onCancel,
  onConfirm,
  onModeChange,
  preview,
}) {
  const tabs = [
    { key: 'insert', label: 'Tambah Baru', count: preview.newCount },
    { key: 'update', label: 'Update Kosong', count: preview.updateRows.length },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 8, background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 3 }}>
              <FileSpreadsheet size={16} style={{ color: '#00ff88' }}/>
            </div>
            <div>
              <p style={{ fontWeight: 600, color: '#f0f0f0', fontSize: 13, fontFamily: 'monospace' }}>{preview.fileName}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2, fontFamily: 'monospace' }}>{preview.rows.length} baris ditemukan</p>
            </div>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}><X size={14}/></button>
        </div>
        <div style={{ padding: '0 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 3, padding: 3, marginBottom: 16 }}>
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => onModeChange(tab.key)} style={{ flex: 1, padding: '6px 0', fontSize: 11, borderRadius: 2, fontFamily: 'monospace', cursor: 'pointer', border: 'none', background: preview.mode === tab.key ? 'rgba(255,255,255,0.08)' : 'transparent', color: preview.mode === tab.key ? '#f0f0f0' : 'rgba(255,255,255,0.38)', fontWeight: preview.mode === tab.key ? 600 : 400 }}>
                {tab.label} <span style={{ marginLeft: 4, padding: '1px 5px', borderRadius: 99, fontSize: 9, fontWeight: 700, background: preview.mode === tab.key ? '#00ff88' : 'rgba(255,255,255,0.08)', color: preview.mode === tab.key ? '#0a0a0a' : 'rgba(255,255,255,0.4)' }}>{tab.count}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: '0 24px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {preview.mode === 'insert' ? (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1, background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 3, padding: '12px 16px' }}>
                  <p style={{ fontSize: 10, color: '#00ff88', marginBottom: 3, fontFamily: 'monospace' }}>kapling baru</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#00ff88', fontFamily: 'monospace' }}>{preview.newCount}</p>
                </div>
                {(preview.skipCount > 0 || preview.updateRows.length > 0) && (
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '12px 16px' }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3, fontFamily: 'monospace' }}>sudah ada</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{preview.skipCount + preview.updateRows.length}</p>
                  </div>
                )}
              </div>
              <div style={{ background: preview.newCount === 0 ? 'rgba(255,170,0,0.06)' : 'rgba(0,180,255,0.06)', border: `1px solid ${preview.newCount === 0 ? 'rgba(255,170,0,0.2)' : 'rgba(0,180,255,0.2)'}`, borderRadius: 3, padding: '10px 14px', marginBottom: 14, fontSize: 11, fontFamily: 'monospace', color: preview.newCount === 0 ? '#ffaa00' : 'rgba(100,200,255,0.9)' }}>
                {preview.newCount === 0 ? 'semua kapling dalam file ini sudah ada di database.' : 'hanya kapling baru yang akan ditambahkan. data yang sudah ada tidak akan diubah.'}
              </div>
            </>
          ) : (
            <>
              {preview.updateRows.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '10px 14px', marginBottom: 14, fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)' }}>
                  tidak ada kapling dengan kolom kosong yang bisa diisi.
                </div>
              ) : (
                <>
                  <div style={{ background: 'rgba(0,180,255,0.06)', border: '1px solid rgba(0,180,255,0.2)', borderRadius: 3, padding: '10px 14px', marginBottom: 10, fontSize: 11, fontFamily: 'monospace', color: 'rgba(100,200,255,0.9)' }}>
                    hanya kolom yang kosong di database yang akan diisi.
                  </div>
                  <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 14 }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 12px', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace' }}>
                      <span>no. kapling</span><span>kolom yang akan diisi</span>
                    </div>
                    <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                      {preview.updateRows.map(({ row, fields }) => (
                        <div key={row.no_kapling} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.65)', flexShrink: 0 }}>{row.no_kapling}</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'flex-end' }}>
                            {fields.slice(0, 4).map(field => (
                              <span key={field.key} style={{ fontSize: 9, background: 'rgba(0,180,255,0.08)', color: 'rgba(100,200,255,0.8)', border: '1px solid rgba(0,180,255,0.2)', borderRadius: 2, padding: '1px 5px', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{field.label}</span>
                            ))}
                            {fields.length > 4 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>+{fields.length - 4}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', padding: '14px 24px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <button onClick={onCancel} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>batal</button>
          {preview.mode === 'insert' ? (
            <button onClick={onConfirm} disabled={importing || preview.newCount === 0} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 11, borderRadius: 3, background: (importing || !preview.newCount) ? 'rgba(0,255,136,0.15)' : '#00ff88', color: (importing || !preview.newCount) ? 'rgba(0,255,136,0.4)' : '#0a0a0a', border: 'none', cursor: (importing || !preview.newCount) ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontWeight: 700 }}>
              {importing && <Loader2 size={11} className="animate-spin"/>}
              {importing ? 'menyimpan...' : `tambah ${preview.newCount} kapling`}
            </button>
          ) : (
            <button onClick={onConfirm} disabled={importing || preview.updateRows.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 11, borderRadius: 3, background: (importing || !preview.updateRows.length) ? 'rgba(0,180,255,0.15)' : 'rgba(0,180,255,0.9)', color: '#fff', border: 'none', cursor: (importing || !preview.updateRows.length) ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontWeight: 700 }}>
              {importing && <Loader2 size={11} className="animate-spin"/>}
              {importing ? 'mengupdate...' : `update ${preview.updateRows.length} kapling`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
