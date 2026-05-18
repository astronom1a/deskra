import { FileText, Loader2, X } from 'lucide-react'

export default function RegisterKaplingInvoicePreview({
  isSaving,
  onCancel,
  onSave,
  preview,
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', maxHeight: '90vh', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 8, background: 'rgba(0,180,255,0.08)', border: '1px solid rgba(0,180,255,0.15)', borderRadius: 3 }}>
              <FileText size={16} style={{ color: 'rgba(0,180,255,0.9)' }}/>
            </div>
            <div>
              <p style={{ fontWeight: 600, color: '#f0f0f0', fontSize: 13, fontFamily: 'monospace' }}>{preview.invoices.length} invois siap diproses</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2, fontFamily: 'monospace' }}>{preview.fileCount} file dipilih</p>
            </div>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}><X size={14}/></button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 3, padding: '12px 16px' }}>
              <p style={{ fontSize: 10, color: '#00ff88', marginBottom: 3, fontFamily: 'monospace' }}>kapling ditemukan</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#00ff88', fontFamily: 'monospace' }}>{preview.totalMatched}</p>
            </div>
            {preview.totalUnmatched > 0 && (
              <div style={{ flex: 1, background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.15)', borderRadius: 3, padding: '12px 16px' }}>
                <p style={{ fontSize: 10, color: '#ffaa00', marginBottom: 3, fontFamily: 'monospace' }}>tidak ada di register</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#ffaa00', fontFamily: 'monospace' }}>{preview.totalUnmatched}</p>
              </div>
            )}
            {preview.errors.length > 0 && (
              <div style={{ flex: 1, background: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.15)', borderRadius: 3, padding: '12px 16px' }}>
                <p style={{ fontSize: 10, color: '#ff6b6b', marginBottom: 3, fontFamily: 'monospace' }}>file gagal</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#ff6b6b', fontFamily: 'monospace' }}>{preview.errors.length}</p>
              </div>
            )}
          </div>

          {preview.duplicateKaplings.length > 0 && (
            <div style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 3, padding: '10px 14px', fontSize: 11, fontFamily: 'monospace', color: '#ffaa00' }}>
              {preview.duplicateKaplings.length} kapling muncul di lebih dari satu invois. Data terakhir dari urutan file yang dipilih akan dipakai.
            </div>
          )}

          {preview.invoices.map(invoice => (
            <div key={`${invoice.fileName}-${invoice.noInvois}`} style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ background: 'rgba(255,255,255,0.035)', padding: '9px 12px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', marginBottom: 3, fontFamily: 'monospace' }}>{invoice.fileName}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace', overflowWrap: 'anywhere' }}>{invoice.noInvois}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 3, fontFamily: 'monospace', overflowWrap: 'anywhere' }}>{invoice.pembeli || '-'}</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ fontSize: 10, background: 'rgba(0,255,136,0.08)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 2, padding: '2px 6px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{invoice.matched.length} cocok</span>
                  {invoice.unmatched.length > 0 && <span style={{ fontSize: 10, background: 'rgba(255,170,0,0.08)', color: '#ffaa00', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 2, padding: '2px 6px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{invoice.unmatched.length} belum ada</span>}
                </div>
              </div>
              {invoice.matched.length > 0 && (
                <div>
                  {invoice.matched.slice(0, 20).map(row => (
                    <div key={`${invoice.noInvois}-${row.no_kapling}`} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.65)' }}>{row.no_kapling}</span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{row.jenis} - {row.sortimen}</span>
                    </div>
                  ))}
                  {invoice.matched.length > 20 && (
                    <div style={{ padding: '6px 12px', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                      +{invoice.matched.length - 20} kapling lainnya
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {preview.errors.length > 0 && (
            <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ background: 'rgba(255,107,107,0.06)', padding: '6px 12px', fontSize: 10, fontWeight: 600, color: '#ff6b6b', fontFamily: 'monospace' }}>file yang dilewati</div>
              <div>
                {preview.errors.map(error => (
                  <div key={error.fileName} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.65)', overflowWrap: 'anywhere' }}>{error.fileName}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,107,107,0.85)', fontFamily: 'monospace', textAlign: 'right' }}>{error.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview.totalMatched === 0 && (
            <div style={{ background: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 3, padding: '10px 14px', fontSize: 11, fontFamily: 'monospace', color: '#ff6b6b' }}>
              Tidak ada nomor kapling dalam invois yang cocok dengan data register. Pastikan data Excel sudah diimport terlebih dahulu.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexShrink: 0, paddingTop: 2 }}>
          <button onClick={onCancel} style={{ padding: '7px 14px', fontSize: 11, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}>batal</button>
          {preview.totalMatched > 0 && (
            <button onClick={onSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 11, borderRadius: 3, background: isSaving ? 'rgba(0,255,136,0.15)' : '#00ff88', color: isSaving ? 'rgba(0,255,136,0.4)' : '#0a0a0a', border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontWeight: 700 }}>
              {isSaving && <Loader2 size={11} className="animate-spin"/>}
              {isSaving ? 'menyimpan...' : `simpan (${preview.totalMatched} kapling)`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
