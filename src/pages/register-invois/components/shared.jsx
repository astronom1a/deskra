import { parseInvois } from '../utils/parseInvois'

// Segmen nomor invois diberi warna sesuai bagiannya agar pattern-nya terlihat
export const SEG_COLORS = {
  prefix: 'rgba(255,255,255,0.4)',
  akun:   '#38bdf8',
  tgl:    '#00ff88',
  jam:    '#ffaa00',
}

export function InvoisSegments({ noInvois }) {
  const parsed = parseInvois(noInvois)
  if (!parsed) return <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#f0f0f0' }}>{noInvois}</span>
  return (
    <span style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap' }}>
      {parsed.prefix && <span style={{ color: SEG_COLORS.prefix }}>{parsed.prefix}</span>}
      <span style={{ color: SEG_COLORS.akun }}>{parsed.akun}</span>
      <span style={{ color: SEG_COLORS.tgl }}>{parsed.tglRaw}</span>
      <span style={{ color: SEG_COLORS.jam }}>{parsed.jamRaw}</span>
    </span>
  )
}

export const labelStyle = { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, display: 'block' }
export const thStyle    = { padding: '8px 12px', fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }
export const tdStyle    = { padding: '7px 12px', fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)', borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'middle', whiteSpace: 'nowrap' }

// Badge sortimen untuk Tab Rekap Sortimen
export const SORTIMEN_BADGE = {
  AI:   { bg: 'rgba(0,255,136,0.08)',   color: '#00ff88', border: 'rgba(0,255,136,0.22)' },
  AII:  { bg: 'rgba(56,189,248,0.08)',  color: '#38bdf8', border: 'rgba(56,189,248,0.22)' },
  AIII: { bg: 'rgba(167,139,250,0.1)',  color: '#a78bfa', border: 'rgba(167,139,250,0.25)' },
  '—':  { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.12)' },
}
