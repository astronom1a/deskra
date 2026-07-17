import { Link } from 'react-router-dom'
import { BarChart3, Table2 } from 'lucide-react'
import Toast from '../../components/ui/Toast'
import TpkRequiredState from '../../components/layout/TpkRequiredState'
import { TableSkeleton } from '../../components/ui/LoadingState'
import RegisterKaplingMetricCards from './components/RegisterKaplingMetricCards.jsx'
import RegisterKaplingStyles from './components/RegisterKaplingStyles.jsx'
import { useRegisterKaplingPage } from './hooks/useRegisterKaplingPage'

// Halaman statistik Register Kapling — memisahkan card rincian dari tabel
// agar keduanya mendapat ruang penuh. Data & filter tahun dibagi lewat hook yang sama.
export default function StatistikKapling() {
  const page = useRegisterKaplingPage()

  if (!page.tpkId) return <TpkRequiredState />

  const rt = {
    connected:    { bg: 'rgba(0,255,136,0.08)',   border: 'rgba(0,255,136,0.2)',   color: '#00ff88', label: 'live'       },
    disconnected: { bg: 'rgba(255,107,107,0.08)', border: 'rgba(255,107,107,0.2)', color: '#ff6b6b', label: 'offline'    },
    connecting:   { bg: 'rgba(255,170,0,0.08)',   border: 'rgba(255,170,0,0.2)',   color: '#ffaa00', label: 'connecting' },
  }[page.realtimeStatus] ?? { bg: 'rgba(255,170,0,0.08)', border: 'rgba(255,170,0,0.2)', color: '#ffaa00', label: 'connecting' }

  return (
    <div className="ds-page" style={{ minHeight: '100%', background: '#0a0a0a', color: '#f0f0f0' }}>
      <RegisterKaplingStyles />
      <Toast toast={page.toast} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart3 size={18} style={{ color: '#00ff88' }} />
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace' }}>Statistik Kapling</h1>
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
            ringkasan & rincian data register kapling
          </p>
          {page.availableYears.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
              {page.availableYears.map(year => (
                <button key={year} onClick={() => page.setSelectedYear(page.selectedYear === year ? null : year)}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px', height: 22, fontSize: 10, fontFamily: 'monospace', fontWeight: 600, borderRadius: 3, cursor: 'pointer', border: `1px solid ${page.selectedYear === year ? 'transparent' : 'rgba(139,92,246,0.25)'}`, transition: 'all 0.15s', background: page.selectedYear === year ? '#a78bfa' : 'rgba(139,92,246,0.08)', color: page.selectedYear === year ? '#0a0a0a' : 'rgba(139,92,246,0.7)' }}
                >{year}</button>
              ))}
              {page.selectedYear && (
                <button onClick={() => page.setSelectedYear(null)}
                  style={{ padding: '2px 8px', fontSize: 10, fontFamily: 'monospace', borderRadius: 3, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.3)' }}
                >semua</button>
              )}
            </div>
          )}
        </div>

        <Link to="/register-kapling/tabel"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', textDecoration: 'none', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,136,0.07)'; e.currentTarget.style.color = '#00ff88'; e.currentTarget.style.borderColor = 'rgba(0,255,136,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
        ><Table2 size={13} /> buka tabel register</Link>
      </div>

      {/* Kartu rincian */}
      {page.loading ? (
        <TableSkeleton rows={4} columns={5} />
      ) : page.rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', fontSize: 11, fontStyle: 'italic', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
          Belum ada data register kapling. Import data di halaman Tabel Register.
        </div>
      ) : (
        <RegisterKaplingMetricCards
          accPihak3Batang={page.accPihak3Batang}
          accPihak3Volume={page.accPihak3Volume}
          accUnsoldBatang={page.accUnsoldBatang}
          accUnsoldVolume={page.accUnsoldVolume}
          blokBreakdown={page.blokBreakdown}
          hasDkhpData={page.dkhpEntries.length > 0}
          isYearFiltered={page.isYearFiltered}
          kaplingInfo={page.kaplingInfo}
          missingDkhp={page.missingDkhp}
          missingInvoices={page.missingInvoices}
          penguranganInvoices={page.penguranganInvoices}
          skippedInvoices={page.skippedInvoices}
          skippingInvoice={page.skippingInvoice}
          onSkipInvoice={page.handleSkipInvoice}
          onUnskipInvoice={page.handleUnskipInvoice}
          pihak3Batang={page.pihak3Batang}
          pihak3Rows={page.pihak3Rows}
          pihak3SortBatang={page.pihak3SortBatang}
          pihak3SortVolume={page.pihak3SortVolume}
          pihak3Volume={page.pihak3Volume}
          soldSortVolume={page.soldSortVolume}
          sortBatang={page.sortBatang}
          sortVolume={page.sortVolume}
          totalBatang={page.totalBatang}
          totalMissingCount={page.totalMissingCount}
          totalVolume={page.totalVolume}
          unsoldBatang={page.unsoldBatang}
          unsoldSortBatang={page.unsoldSortBatang}
          unsoldSortVolume={page.unsoldSortVolume}
          unsoldVolume={page.unsoldVolume}
        />
      )}
    </div>
  )
}
