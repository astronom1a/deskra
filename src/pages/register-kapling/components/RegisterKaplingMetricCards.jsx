import { INVOIS_PREFIX_MAP, RK_BADGE_BASE, SORTIMENS } from '../utils/registerKaplingConstants'

function Card({ onClick, style, children }) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 3, padding: '16px 20px', cursor: 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
        ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = style._hoverShadow; e.currentTarget.style.borderColor = style._hoverBorder }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = style.border?.replace('1px solid ', '') ?? style.borderColor }}
    >
      {children}
    </div>
  )
}

export default function RegisterKaplingMetricCards({
  blokBreakdown,
  expandedCard,
  kaplingInfo,
  missingInvoices,
  penguranganInvoices,
  setExpandedCard,
  soldSortVolume,
  sortBatang,
  sortVolume,
  totalBatang,
  totalMissingCount,
  totalVolume,
  unsoldBatang,
  unsoldSortBatang,
  unsoldSortVolume,
  unsoldVolume,
}) {
  function toggle(key) { setExpandedCard(prev => prev === key ? null : key) }

  const expandStyle = key => ({
    overflow: 'hidden',
    maxHeight: expandedCard === key ? 300 : 0,
    transition: 'max-height 0.3s ease',
    marginTop: expandedCard === key ? 12 : 0,
  })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>

      {/* Card 1: Total Kapling */}
      <div
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 0, transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease', cursor: 'pointer' }}
        onClick={() => toggle('kapling')}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
      >
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flexShrink: 0 }}>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 3, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>total kapling</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace' }}>{kaplingInfo?.total?.toLocaleString('id') ?? 0}</p>
            {kaplingInfo && (
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 6, fontFamily: 'monospace' }}>
                terakhir: <span style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{kaplingInfo.shorten(kaplingInfo.last)}</span>
              </p>
            )}
          </div>
          {kaplingInfo?.missing.length > 0 && (
            <div style={{ flex: 1, minWidth: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#ffaa00', marginBottom: 6, fontFamily: 'monospace' }}>
                missing <span style={{ fontWeight: 700 }}>{totalMissingCount.toLocaleString('id')}</span>
                <span style={{ opacity: 0.6 }}> ({kaplingInfo.missing.length} gap)</span>
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, maxHeight: 60, overflowY: 'auto' }}>
                {kaplingInfo.missing.map((m, i) => (
                  <span key={i} style={{ fontSize: 10, fontFamily: 'monospace', background: 'rgba(255,170,0,0.08)', color: '#ffaa00', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 2, padding: '1px 5px', whiteSpace: 'nowrap' }}>
                    {m.from === m.to ? kaplingInfo.shorten(m.from) : `${kaplingInfo.shorten(m.from)}–${kaplingInfo.shorten(m.to)}`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={expandStyle('kapling')}>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>breakdown per blok</p>
            <div className="scrollbar-thin" style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 200, overflowY: 'auto', paddingRight: 6 }}>
              {blokBreakdown.map(([blok, val]) => {
                const pct = totalVolume > 0 ? (val.volume / totalVolume) * 100 : 0
                return (
                  <div key={blok}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>{blok}</span>
                      <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>{val.volume.toFixed(3)} m³ · {val.batang.toLocaleString('id')} btg</span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'rgba(255,255,255,0.25)', borderRadius: 2, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Invois Terlewat */}
      <div
        style={{
          background: missingInvoices.length > 0 ? 'rgba(255,107,107,0.04)' : 'rgba(0,255,136,0.03)',
          border: `1px solid ${missingInvoices.length > 0 ? 'rgba(255,107,107,0.18)' : 'rgba(0,255,136,0.12)'}`,
          borderRadius: 3, padding: '16px 20px',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease', cursor: 'pointer',
        }}
        onClick={() => toggle('invois')}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = missingInvoices.length > 0 ? '0 8px 24px rgba(255,107,107,0.1)' : '0 8px 24px rgba(0,255,136,0.08)'
          e.currentTarget.style.borderColor = missingInvoices.length > 0 ? 'rgba(255,107,107,0.32)' : 'rgba(0,255,136,0.24)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = ''
          e.currentTarget.style.boxShadow = ''
          e.currentTarget.style.borderColor = missingInvoices.length > 0 ? 'rgba(255,107,107,0.18)' : 'rgba(0,255,136,0.12)'
        }}
      >
        <p style={{ fontSize: 10, color: missingInvoices.length > 0 ? 'rgba(255,107,107,0.7)' : 'rgba(0,255,136,0.5)', marginBottom: 4, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>invois terlewat</p>
        {penguranganInvoices.length === 0 ? (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', marginTop: 6 }}>belum ada data dk310</p>
        ) : missingInvoices.length === 0 ? (
          <>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#00ff88', fontFamily: 'monospace', lineHeight: 1 }}>0</p>
            <p style={{ fontSize: 10, color: 'rgba(0,255,136,0.5)', marginTop: 5, fontFamily: 'monospace' }}>semua invois terisi</p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#ff6b6b', fontFamily: 'monospace', lineHeight: 1 }}>{missingInvoices.length}</p>
            <p style={{ fontSize: 10, color: 'rgba(255,107,107,0.45)', fontFamily: 'monospace', marginTop: 5 }}>klik untuk lihat detail</p>
          </>
        )}
        {penguranganInvoices.length > 0 && missingInvoices.length > 0 && (
          <div style={expandStyle('invois')}>
            <div style={{ borderTop: '1px solid rgba(255,107,107,0.15)', paddingTop: 12 }}>
              <p style={{ fontSize: 9, color: 'rgba(255,107,107,0.4)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>semua invois terlewat</p>
              <div className="scrollbar-thin" style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto', paddingRight: 6 }}>
                {missingInvoices.map((inv, i) => {
                  const prefix = String(inv).slice(0, 3).toUpperCase()
                  const pfx    = INVOIS_PREFIX_MAP[prefix]
                  return (
                    <div key={inv} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,107,107,0.4)', fontFamily: 'monospace', minWidth: 18, textAlign: 'right' }}>{i + 1}.</span>
                      {pfx && <span style={{ ...RK_BADGE_BASE, background: pfx.bg, color: pfx.color, border: `1px solid ${pfx.border}`, fontSize: 9 }}>{prefix}</span>}
                      <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)' }}>{inv}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card 3: Total Batang + Volume */}
      <div
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease', cursor: 'pointer' }}
        onClick={() => toggle('volume')}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(55,145,101,0.1)'; e.currentTarget.style.borderColor = 'rgba(55,145,101,0.2)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
      >
        <div>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 3, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>total batang</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#f0f0f0', fontFamily: 'monospace', lineHeight: 1 }}>{totalBatang.toLocaleString('id')}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            {SORTIMENS.map(m => (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{m}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace' }}>{sortBatang[m].toLocaleString('id')}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
          <p style={{ fontSize: 10, color: 'rgba(55,145,101,0.65)', marginBottom: 3, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>total volume</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#379165', fontFamily: 'monospace', lineHeight: 1 }}>
            {totalVolume.toFixed(3)} <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(55,145,101,0.5)' }}>m³</span>
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            {SORTIMENS.map(m => (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(55,145,101,0.5)', fontFamily: 'monospace' }}>{m}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(55,145,101,0.8)', fontFamily: 'monospace' }}>{sortVolume[m].toFixed(3)}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ overflow: 'hidden', maxHeight: expandedCard === 'volume' ? 200 : 0, transition: 'max-height 0.3s ease' }}>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>proporsi volume per sortimen</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SORTIMENS.map(m => {
                const pct = totalVolume > 0 ? (sortVolume[m] / totalVolume) * 100 : 0
                return (
                  <div key={m}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, fontFamily: 'monospace', color: 'rgba(55,145,101,0.8)' }}>{m}</span>
                      <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(55,145,101,0.6)' }}>{sortVolume[m].toFixed(3)} m³ · {pct.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'rgba(55,145,101,0.6)', borderRadius: 2, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Card 4: Sisa Persediaan */}
      <div
        style={{ background: 'rgba(255,170,0,0.04)', border: '1px solid rgba(255,170,0,0.15)', borderRadius: 3, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease', cursor: 'pointer' }}
        onClick={() => toggle('sisa')}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,170,0,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,170,0,0.28)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'rgba(255,170,0,0.15)' }}
      >
        <div>
          <p style={{ fontSize: 10, color: 'rgba(255,170,0,0.55)', marginBottom: 3, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>sisa persediaan</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#ffaa00', fontFamily: 'monospace', lineHeight: 1 }}>
            {unsoldVolume.toFixed(3)} <span style={{ fontSize: 11, color: 'rgba(255,170,0,0.55)', fontWeight: 600 }}>m³</span>
          </p>
          <p style={{ fontSize: 10, color: 'rgba(255,170,0,0.5)', fontFamily: 'monospace', marginTop: 4 }}>{unsoldBatang.toLocaleString('id')} batang</p>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,170,0,0.12)', marginTop: 12, paddingTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {SORTIMENS.map(m => (
            <div key={m}>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,170,0,0.4)', fontFamily: 'monospace', marginBottom: 4 }}>{m}</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,170,0,0.7)', fontFamily: 'monospace', lineHeight: 1 }}>
                {unsoldSortVolume[m].toFixed(3)} <span style={{ fontSize: 9, color: 'rgba(255,170,0,0.45)' }}>m³</span>
              </p>
              <p style={{ fontSize: 10, color: 'rgba(255,170,0,0.5)', fontFamily: 'monospace', marginTop: 2 }}>{unsoldSortBatang[m].toLocaleString('id')} btg</p>
            </div>
          ))}
        </div>
        <div style={{ overflow: 'hidden', maxHeight: expandedCard === 'sisa' ? 220 : 0, transition: 'max-height 0.3s ease', marginTop: expandedCard === 'sisa' ? 12 : 0 }}>
          <div style={{ borderTop: '1px solid rgba(255,170,0,0.12)', paddingTop: 12 }}>
            <p style={{ fontSize: 9, color: 'rgba(255,170,0,0.3)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>terjual vs sisa per sortimen</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {SORTIMENS.map(m => {
                const total   = sortVolume[m]
                const sold    = soldSortVolume[m]
                const sisa    = unsoldSortVolume[m]
                const soldPct = total > 0 ? (sold / total) * 100 : 0
                return (
                  <div key={m}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, fontFamily: 'monospace', color: 'rgba(255,170,0,0.7)' }}>{m}</span>
                      <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)' }}>
                        <span style={{ color: 'rgba(0,255,136,0.6)' }}>{sold.toFixed(3)}</span> / <span style={{ color: 'rgba(255,170,0,0.6)' }}>{sisa.toFixed(3)}</span> m³
                      </span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,170,0,0.12)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${soldPct}%`, background: 'rgba(0,255,136,0.45)', borderRadius: 2, transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                      <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(0,255,136,0.45)' }}>terjual {soldPct.toFixed(1)}%</span>
                      <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,170,0,0.45)' }}>sisa {(100 - soldPct).toFixed(1)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
