import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ClipboardList, Download, FileBarChart2, FileSpreadsheet, FileText, Plus, Settings, Tag, Upload } from 'lucide-react'
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
  const [showImportMenu, setShowImportMenu] = useState(false)
  const importMenuRef = useRef(null)

  useEffect(() => {
    if (!showImportMenu) return
    function onClickOutside(e) {
      if (importMenuRef.current && !importMenuRef.current.contains(e.target)) setShowImportMenu(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [showImportMenu])

  const importOptions = [
    { label: 'DP Kapling',  desc: 'file excel dp kapling (.xlsx)',    Icon: FileSpreadsheet, color: '#00ff88',              onPick: () => fileRef.current?.click() },
    { label: 'DKHP',        desc: 'file excel dkhp (.xlsx, multi)',   Icon: FileBarChart2,   color: 'rgba(0,255,136,0.75)', onPick: () => dkhpImportRef.current?.click() },
    { label: 'BAP',         desc: 'file pdf bap (multi)',             Icon: ClipboardList,   color: '#a78bfa',              onPick: () => bapRef.current?.click() },
    { label: 'Invois',      desc: 'file pdf invois (multi)',          Icon: FileText,        color: 'rgba(0,180,255,0.9)',  onPick: () => invoisRef.current?.click() },
  ]

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
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>

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
      <div className="rk-header-actions">

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

        {/* Import — satu tombol untuk semua jenis import */}
        <div ref={importMenuRef} style={{ position: 'relative' }}>
          <button onClick={() => setShowImportMenu(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 12, background: '#00ff88', color: '#0a0a0a', borderRadius: 3, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 700 }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Upload size={14} /> import
            <ChevronDown size={12} style={{ transition: 'transform 0.15s', transform: showImportMenu ? 'rotate(180deg)' : 'none' }} />
          </button>
          {showImportMenu && (
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200, minWidth: 220, background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.7)' }}>
              {importOptions.map(({ label, desc, Icon, color, onPick }) => (
                <button key={label}
                  onClick={() => { setShowImportMenu(false); onPick() }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Icon size={14} style={{ color, flexShrink: 0 }} />
                  <span>
                    <span style={{ display: 'block', fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: '#f0f0f0' }}>{label}</span>
                    <span style={{ display: 'block', fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{desc}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={fileRef}       type="file" accept=".xlsx,.xls"  className="hidden" onChange={onFileChange} />
      <input ref={invoisRef}     type="file" accept=".pdf" multiple className="hidden" onChange={onInvoisFileChange} />
      <input ref={bapRef}        type="file" accept=".pdf" multiple className="hidden" onChange={onBapFiles} />
      <input ref={dkhpImportRef} type="file" accept=".xlsx" multiple className="hidden" onChange={onDkhpImportFiles} />
    </div>
  )
}
