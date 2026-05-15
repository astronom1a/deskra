import { useEffect, useRef, useState } from 'react'
import { FileBarChart2, Upload, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../lib/AuthProvider'
import { getEffectiveTpkId } from '../lib/effectiveTpk'
import Toast, { useToast } from '../components/Toast'
import TpkRequiredState from '../components/TpkRequiredState'

const CARDS = [
  { key: 'penambahan',          label: 'Penambahan' },
  { key: 'sisa_lalu',          label: 'Sisa yang Lalu' },
  { key: 'jumlah_persediaan',  label: 'Jumlah Persediaan' },
  { key: 'jumlah_pengurangan', label: 'Jumlah Pengurangan' },
  { key: 'sisa_sekarang',      label: 'Sisa Sekarang' },
]

function SummaryCard({ label }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 4,
      padding: '14px 18px',
      minWidth: 0,
    }}>
      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        {label}
      </p>
      <p style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.15)', fontFamily: 'monospace', lineHeight: 1 }}>
        — <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.15)' }}>btg</span>
      </p>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(55,145,101,0.3)', fontFamily: 'monospace', marginTop: 5 }}>
        — <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(55,145,101,0.2)' }}>m³</span>
      </p>
    </div>
  )
}

export default function Dk310Pengurangan() {
  const { profile, activeTpkId } = useAuth()
  const tpkId = getEffectiveTpkId({ activeTpkId, profile })
  const fileRef = useRef(null)
  const { toast, showToast } = useToast(3000)

  if (!tpkId) return <TpkRequiredState />

  return (
    <div style={{ minHeight: '100%', background: '#0a0a0a' }}>
      <Toast toast={toast} />
      <div className="relative z-10 p-6 mx-auto" style={{ width: '100%', maxWidth: 'min(96vw, 1440px)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileBarChart2 size={20} style={{ color: '#00ff88' }} />
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f0f0f0', letterSpacing: '-0.02em' }}>DK310 Pengurangan</h1>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(55,145,101,0.2)',
              border: '1px solid rgba(55,145,101,0.4)',
              borderRadius: 4, padding: '7px 14px', cursor: 'pointer',
              color: '#00ff88', fontSize: 13, fontWeight: 600,
            }}
          >
            <Upload size={14} />
            Import Excel
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={() => showToast('Fitur import sedang dalam pengembangan.', 'error')} />
        </div>

        {/* Summary Cards placeholder */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 28 }}>
          {CARDS.map(c => <SummaryCard key={c.key} label={c.label} />)}
        </div>

        {/* Section label */}
        <p style={{ fontSize: 10, color: '#00ff88', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Daftar Periode
        </p>

        {/* Empty state */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 12 }}>
          <AlertCircle size={24} style={{ color: 'rgba(255,255,255,0.1)' }} />
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, fontFamily: 'monospace' }}>
            Fitur DK310 Pengurangan sedang dalam pengembangan.
          </p>
        </div>

      </div>
    </div>
  )
}
