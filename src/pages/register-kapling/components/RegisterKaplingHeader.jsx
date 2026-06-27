import { ClipboardList, Download, FileBarChart2, FileText, Plus, Settings, Tag, Upload } from 'lucide-react'
import { INVOIS_PREFIX_MAP } from '../utils/registerKaplingConstants'

export default function RegisterKaplingHeader({
  availableYears,
  bapRef,
  colMap,
  dkhpImportRef,
  fileRef,
  invoisRef,
  onBapFiles,
  onDkhpImportFiles,
  onExport,
  onFileChange,
  onInvoisFileChange,
  onAddRow,
  onOpenFixPrefix,
  realtimeStatus,
  rows,
  selectedYear,
  setDraftMap,
  setSelectedYear,
  setShowSettings,
}) {
  const needFix = new Set(
    rows
      .filter(r => r.no_invois && !INVOIS_PREFIX_MAP[String(r.no_invois).trim().slice(0, 3).toUpperCase()])
      .map(r => String(r.no_invois).trim())
  ).size

  const rt = {
    connected:    { bg: 'rgba(0,255,136,0.08)',   border: 'rgba(0,255,136,0.2)',   color: '#00ff88', label: 'live'       },
    disconnected: { bg: 'rgba(255,107,107,0.08)', border: 'rgba(255,107,107,0.2)', color: '#ff6b6b', label: 'offline'    },
    connecting:   { bg: 'rgba(255,170,0,0.08)',   border: 'rgba(255,170,0,0.2)',   color: '#ffaa00', label: 'connecting' },
  }[realtimeStatus] ?? { bg: 'rgba(255,170,0,0.08)', border: 'rgba(255,170,0,0.2)', color: '#ffaa00', label: 'connecting' }

  const iconBtn = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '7px 9px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>

      {/* Title + realtime badge */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace' }}>Register Kapling</h1>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 3,
            fontSize: 10, fontFamily: 'monospace', fontWeight: 600,
            background: rt.bg, border: `1px solid ${rt.border}`, color: rt.color,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: rt.color }} />
            {rt.label}
          </span>
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'monospace' }}>
          data register kapling dari file dp kapling (.xlsx)
        </p>
        {availableYears.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
            {availableYears.map(year => (
              <button key={year} onClick={() => setSelectedYear(selectedYear === year ? null : year)}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px', height: 22, fontSize: 10, fontFamily: 'monospace', fontWeight: 600, borderRadius: 3, cursor: 'pointer', border: `1px solid ${selectedYear === year ? 'transparent' : 'rgba(139,92,246,0.25)'}`, transition: 'all 0.15s', background: selectedYear === year ? '#a78bfa' : 'rgba(139,92,246,0.08)', color: selectedYear === year ? '#0a0a0a' : 'rgba(139,92,246,0.7)' }}
                onMouseEnter={e => { if (selectedYear !== year) { e.currentTarget.style.background = 'rgba(139,92,246,0.18)'; e.currentTarget.style.color = '#a78bfa'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.45)' } }}
                onMouseLeave={e => { if (selectedYear !== year) { e.currentTarget.style.background = 'rgba(139,92,246,0.08)'; e.currentTarget.style.color = 'rgba(139,92,246,0.7)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.25)' } }}
              >{year}</button>
            ))}
            {selectedYear && (
              <button onClick={() => setSelectedYear(null)}
                style={{ padding: '2px 8px', fontSize: 10, fontFamily: 'monospace', borderRadius: 3, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.3)' }}
              >semua</button>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6 }}>

        {/* Import DKHP */}
        <button onClick={() => dkhpImportRef.current?.click()} title="Import DKHP dari Excel"
          style={{ ...iconBtn, color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,136,0.07)'; e.currentTarget.style.color = '#00ff88'; e.currentTarget.style.borderColor = 'rgba(0,255,136,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
        ><FileBarChart2 size={14} /></button>

        {/* Settings */}
        <button onClick={() => { setDraftMap({ ...colMap }); setShowSettings(true) }} title="Pengaturan header kolom"
          style={{ ...iconBtn, gap: 6, padding: '7px 10px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#f0f0f0' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
        ><Settings size={14} /></button>

        {/* Add row */}
        <button onClick={onAddRow} title="Tambah Kapling"
          style={{ ...iconBtn, color: 'rgba(255,255,255,0.65)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#f0f0f0' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
        ><Plus size={14} /></button>

        {/* BAP PDF */}
        <button onClick={() => bapRef.current?.click()} title="Import BAP"
          style={{ ...iconBtn, color: 'rgba(139,92,246,0.65)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.12)'; e.currentTarget.style.color = '#a78bfa'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(139,92,246,0.65)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
        ><ClipboardList size={14} /></button>

        {/* Invoice PDF */}
        <button onClick={() => invoisRef.current?.click()} title="Input invois"
          style={{ ...iconBtn, color: 'rgba(255,255,255,0.65)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#f0f0f0' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
        ><FileText size={14} /></button>

        {/* Fix prefix — hanya tampil jika ada invois yang perlu diperbaiki */}
        {needFix > 0 && (
          <button onClick={onOpenFixPrefix} title="FIX INVOIS (ECR / ECK / EKK)"
            style={{ position: 'relative', ...iconBtn, background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.25)', color: '#ffaa00' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,170,0,0.18)'; e.currentTarget.style.borderColor = 'rgba(255,170,0,0.45)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,170,0,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,170,0,0.25)' }}
          >
            <Tag size={14} />
            <span style={{
              position: 'absolute', top: -6, right: -6,
              minWidth: 16, height: 16, borderRadius: 8,
              background: '#ffaa00', color: '#0a0a0a',
              fontSize: 10, fontWeight: 700, fontFamily: 'monospace',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px', lineHeight: 1,
            }}>{needFix}</span>
          </button>
        )}

        {/* Export Excel */}
        <button onClick={onExport} title="Export Excel"
          style={{ ...iconBtn, color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,136,0.07)'; e.currentTarget.style.color = '#00ff88'; e.currentTarget.style.borderColor = 'rgba(0,255,136,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
        ><Download size={14} /></button>

        {/* Import Excel */}
        <button onClick={() => fileRef.current?.click()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 12, background: '#00ff88', color: '#0a0a0a', borderRadius: 3, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 700 }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        ><Upload size={14} /> import excel</button>
      </div>

      {/* Hidden file inputs */}
      <input ref={fileRef}       type="file" accept=".xlsx,.xls"  className="hidden" onChange={onFileChange} />
      <input ref={invoisRef}     type="file" accept=".pdf" multiple className="hidden" onChange={onInvoisFileChange} />
      <input ref={bapRef}        type="file" accept=".pdf" multiple className="hidden" onChange={onBapFiles} />
      <input ref={dkhpImportRef} type="file" accept=".xlsx" multiple className="hidden" onChange={onDkhpImportFiles} />
    </div>
  )
}
