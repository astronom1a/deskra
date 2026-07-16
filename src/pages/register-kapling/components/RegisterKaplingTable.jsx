import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, ChevronsUpDown, FileBarChart2, FileSpreadsheet, LayoutGrid, Pencil, Receipt, Table2, Trash2 } from 'lucide-react'
import { TableSkeleton } from '../../../components/ui/LoadingState'
import { useIsMobile } from '../../../lib/hooks/useIsMobile'
import { displayDate, getMutuLabel, getPembeliName } from '../utils/registerKaplingUtils'

const INVOIS_PREFIX_MAP = {
  ECR: { bg: 'rgba(0,180,255,0.1)',   color: 'rgba(0,180,255,0.95)',  border: 'rgba(0,180,255,0.28)',  desc: 'Retail' },
  ECK: { bg: 'rgba(0,255,136,0.08)',  color: '#00ff88',               border: 'rgba(0,255,136,0.22)',  desc: 'DK318'  },
  EKK: { bg: 'rgba(170,80,255,0.1)',  color: 'rgba(170,80,255,0.9)',  border: 'rgba(170,80,255,0.28)', desc: 'Khusus' },
}

const JENIS_STYLE = {
  JATI:     { background: 'rgba(0,255,136,0.12)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.25)' },
  MAHONI:   { background: 'rgba(255,107,107,0.12)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.25)' },
  KEDAWUNG: { background: 'rgba(255,107,107,0.12)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.25)' },
}

const RK_BADGE_BASE = { display: 'inline-block', padding: '2px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }
const RK_BADGE_DEF  = { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }

function InvoisBadge({ val }) {
  if (!val) return <span style={{ color: 'rgba(255,255,255,0.15)' }}>-</span>
  const prefix = String(val).trim().slice(0, 3).toUpperCase()
  const pfx = INVOIS_PREFIX_MAP[prefix]
  if (pfx) {
    return (
      <span title={pfx.desc} style={{ ...RK_BADGE_BASE, background: pfx.bg, color: pfx.color, border: `1px solid ${pfx.border}`, fontSize: 11 }}>
        {val}
      </span>
    )
  }
  return <span style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'monospace', fontSize: 11 }}>{val}</span>
}

function JenisKayuBadge({ val }) {
  if (!val) return <span style={{ color: 'rgba(255,255,255,0.2)' }}>-</span>
  return <span style={{ ...RK_BADGE_BASE, ...(JENIS_STYLE[val.toUpperCase()] || RK_BADGE_DEF) }}>{val}</span>
}

function SertBadge({ val }) {
  if (!val || val === '-') return <span style={{ color: 'rgba(255,255,255,0.2)' }}>-</span>
  const isFsc = val.toUpperCase() === 'FSC'
  const style = isFsc
    ? { background: 'rgba(0,255,136,0.12)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.25)' }
    : { background: 'rgba(255,170,0,0.12)', color: '#ffaa00', border: '1px solid rgba(255,170,0,0.25)' }
  return <span style={{ ...RK_BADGE_BASE, ...style }}>{val}</span>
}

function EmptyValue() {
  return <span style={{ color: 'rgba(255,255,255,0.15)' }}>-</span>
}

function DkhpCell({ val, conflict }) {
  if (!val) return <span style={{ color: 'rgba(255,255,255,0.15)' }}>-</span>
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{val}</span>
      {conflict && (
        <AlertTriangle
          size={10}
          title="No. DKHP pernah berubah — perlu evaluasi"
          style={{ color: '#ffaa00', flexShrink: 0 }}
        />
      )}
    </span>
  )
}

function CellValue({ column, row }) {
  if (column.key === 'sertifikasi') return <SertBadge val={row.sertifikasi}/>
  if (column.key === 'jenis') return <JenisKayuBadge val={row.jenis}/>
  if (column.key === 'volume') return Number(row.volume).toFixed(3)
  if (column.key === 'mutu_label') return getMutuLabel(row)
  if (column.key === 'tgl_kapling') return displayDate(row.tgl_kapling) ?? <EmptyValue />
  if (column.key === 'pembeli') return getPembeliName(row.pembeli) ?? <EmptyValue />
  if (column.key === 'no_invois') return <InvoisBadge val={row.no_invois}/>
  if (column.key === 'periode') return row.periode ? <span>{row.periode}</span> : <EmptyValue />
  if (column.key === 'dkhp') return <DkhpCell val={row.dkhp} conflict={row.dkhp_conflict} />
  return row[column.key] ?? <EmptyValue />
}

// Kartu pengganti baris tabel di mobile — checkbox seleksi + badge + aksi tetap tersedia.
function MobileRowCard({ row, selected, onToggleSelect, onOpenContextMenu, onOpenDkhpModal, onOpenInvoisModal, onEditRow, onDeleteRow }) {
  const fields = [
    { label: 'Tgl Kapling', value: displayDate(row.tgl_kapling) },
    { label: 'Sortimen', value: row.sortimen },
    { label: 'Panjang', value: row.panjang },
    { label: 'Dia/Tebal', value: row.diameter_tebal },
    { label: 'Mutu', value: getMutuLabel(row) },
    { label: 'Jumlah', value: row.batang != null ? Number(row.batang).toLocaleString('id') : null },
    { label: 'Pembeli', value: getPembeliName(row.pembeli) },
    { label: 'SKSHHK', value: row.skshhk },
  ]
  return (
    <div
      className="ds-data-card"
      onContextMenu={e => onOpenContextMenu(e, row)}
      style={selected ? { background: 'rgba(0,255,136,0.05)', borderColor: 'rgba(0,255,136,0.25)' } : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={selected} onChange={() => onToggleSelect(row.id)} className="rk-cb" style={{ cursor: 'pointer', flexShrink: 0 }}/>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f0', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.no_kapling}
        </span>
        <span style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <JenisKayuBadge val={row.jenis}/>
          <SertBadge val={row.sertifikasi}/>
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#00ff88', flexShrink: 0 }}>
          {Number(row.volume).toFixed(3)} m³
        </span>
      </div>
      <div className="ds-card-grid">
        {fields.map((f, i) => (
          <div key={i}>
            <p className="ds-card-label">{f.label}</p>
            <p className="ds-card-value">{f.value ?? '—'}</p>
          </div>
        ))}
        <div>
          <p className="ds-card-label">Invois</p>
          <p className="ds-card-value"><InvoisBadge val={row.no_invois}/></p>
        </div>
        <div>
          <p className="ds-card-label">DKHP</p>
          <p className="ds-card-value"><DkhpCell val={row.dkhp} conflict={row.dkhp_conflict}/></p>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={() => onOpenDkhpModal([row])} title="Input DKHP"
          style={{ padding: 5, borderRadius: 3, background: 'none', border: 'none', cursor: 'pointer', color: row.dkhp ? '#00ff88' : 'rgba(255,255,255,0.3)' }}
        ><FileBarChart2 size={14}/></button>
        <button onClick={() => onOpenInvoisModal(row)} title="Input Invois"
          style={{ padding: 5, borderRadius: 3, background: 'none', border: 'none', cursor: 'pointer', color: row.no_invois ? 'rgba(0,180,255,0.9)' : 'rgba(255,255,255,0.3)' }}
        ><Receipt size={14}/></button>
        <button onClick={() => onEditRow({ ...row })} title="Edit"
          style={{ padding: 5, borderRadius: 3, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}
        ><Pencil size={14}/></button>
        <button onClick={() => onDeleteRow(row)} title="Hapus"
          style={{ padding: 5, borderRadius: 3, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}
        ><Trash2 size={14}/></button>
      </div>
    </div>
  )
}

export default function RegisterKaplingTable({
  allSelected,
  columns,
  displayedRows,
  filteredBatang,
  filteredVolume,
  isEmpty,
  isLoading,
  onDeleteRow,
  onEditRow,
  onOpenContextMenu,
  onOpenDkhpModal,
  onOpenInvoisModal,
  onToggleSelectAll,
  onToggleSelectRow,
  onToggleSort,
  pageSize,
  safePage,
  selectAllRef,
  selectedIds,
  sorts,
  someSelected: _someSelected,
}) {
  const isMobile = useIsMobile()
  // Mobile: default tabel (scroll horizontal), bisa dialihkan ke tampilan kartu
  const [mobileView, setMobileView] = useState('table')
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
      {isLoading ? (
        <TableSkeleton rows={8} columns={10} />
      ) : isEmpty ? (
        <div style={{ padding: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <FileSpreadsheet size={36} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: 12 }}/>
          <p style={{ fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: 13 }}>belum ada data</p>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 4, fontFamily: 'monospace' }}>klik <span style={{ color: '#00ff88' }}>import excel</span> untuk mengimpor file DP Kapling</p>
        </div>
      ) : (
        <>
          {isMobile && (
            <div style={{ display: 'flex', gap: 4, padding: '8px 10px 0', flexShrink: 0 }}>
              {[{ v: 'table', label: 'tabel', Icon: Table2 }, { v: 'cards', label: 'kartu', Icon: LayoutGrid }].map(({ v, label, Icon }) => (
                <button
                  key={v}
                  onClick={() => setMobileView(v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 11, borderRadius: 3, fontFamily: 'monospace', fontWeight: 600, cursor: 'pointer',
                    ...(mobileView === v
                      ? { background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', color: '#00ff88' }
                      : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' })
                  }}
                >
                  <Icon size={11}/> {label}
                </button>
              ))}
            </div>
          )}
          {isMobile && mobileView === 'cards' ? (
        <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
          <div className="ds-card-list" style={{ padding: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 4px', fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', userSelect: 'none' }}>
              <input ref={selectAllRef} type="checkbox" checked={allSelected} onChange={onToggleSelectAll} className="rk-cb" style={{ cursor: 'pointer' }}/>
              pilih semua di halaman ini
            </label>
            {displayedRows.map(row => (
              <MobileRowCard
                key={row.id}
                row={row}
                selected={selectedIds.has(row.id)}
                onToggleSelect={onToggleSelectRow}
                onOpenContextMenu={onOpenContextMenu}
                onOpenDkhpModal={onOpenDkhpModal}
                onOpenInvoisModal={onOpenInvoisModal}
                onEditRow={onEditRow}
                onDeleteRow={onDeleteRow}
              />
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 3, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>
              <span>TOTAL</span>
              <span>{filteredBatang.toLocaleString('id')} btg · {filteredVolume.toFixed(3)} m³</span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', scrollbarGutter: 'stable both-edges' }}>
          <table style={{ fontSize: 12, width: 'max-content', minWidth: '100%' }}>
            <thead style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <tr>
                <th style={{ padding: '8px 8px', position: 'sticky', left: 0, background: 'rgba(13,13,13,0.98)', zIndex: 10, width: 32 }}>
                  <input ref={selectAllRef} type="checkbox" checked={allSelected} onChange={onToggleSelectAll} className="rk-cb" style={{ cursor: 'pointer' }}/>
                </th>
                <th style={{ padding: '8px 8px', textAlign: 'left', fontWeight: 600, color: 'rgba(255,255,255,0.3)', width: 32, fontFamily: 'monospace', fontSize: 11 }}>No</th>
                {columns.map(c => (
                  <th key={c.key} onClick={() => onToggleSort(c.key)} className="rk-th"
                    style={{ padding: '8px 8px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', textAlign: c.num ? 'right' : 'left', fontFamily: 'monospace', fontSize: 11 }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      {c.label}
                      {(() => {
                        const idx = sorts.findIndex(s => s.key === c.key)
                        if (idx === -1) return <ChevronsUpDown size={10} style={{ color: 'rgba(255,255,255,0.15)' }}/>
                        const s = sorts[idx]
                        return (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                            {sorts.length > 1 && <span style={{ fontSize: 9, fontWeight: 700, color: '#00ff88' }}>{idx + 1}</span>}
                            {s.dir === 'asc' ? <ChevronUp size={10} style={{ color: '#00ff88' }}/> : <ChevronDown size={10} style={{ color: '#00ff88' }}/>}
                          </span>
                        )
                      })()}
                    </span>
                  </th>
                ))}
                <th style={{ padding: '8px 8px', width: 48 }}></th>
              </tr>
            </thead>
            <tbody>
              {displayedRows.map((row, i) => (
                <tr key={row.id} className={`rk-row${selectedIds.has(row.id) ? ' rk-row-sel' : ''}`}
                  style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                  onContextMenu={e => onOpenContextMenu(e, row)}
                >
                  <td style={{ padding: '6px 8px', position: 'sticky', left: 0, zIndex: 10, background: selectedIds.has(row.id) ? 'rgba(0,255,136,0.05)' : '#0a0a0a' }}>
                    <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => onToggleSelectRow(row.id)} className="rk-cb" style={{ cursor: 'pointer' }}/>
                  </td>
                  <td style={{ padding: '6px 8px', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>{(safePage - 1) * (pageSize || 0) + i + 1}</td>
                  {columns.map(c => (
                    <td key={c.key} style={{ padding: '6px 8px', whiteSpace: 'nowrap', textAlign: c.num ? 'right' : 'left', fontFamily: c.num ? 'monospace' : 'inherit', color: c.num ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.75)' }}>
                      <CellValue column={c} row={row} />
                    </td>
                  ))}
                  <td style={{ padding: '6px 8px' }}>
                    <div className="rk-actions" style={{ display: 'flex', alignItems: 'center', gap: 3, opacity: 0, transition: 'opacity 0.15s' }}>
                      <button onClick={() => onOpenDkhpModal([row])} title="Input DKHP"
                        style={{ padding: 4, borderRadius: 3, background: 'none', border: 'none', cursor: 'pointer', color: row.dkhp ? '#00ff88' : 'rgba(255,255,255,0.3)' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#00ff88'; e.currentTarget.style.background = 'rgba(0,255,136,0.07)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = row.dkhp ? '#00ff88' : 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'none' }}
                      ><FileBarChart2 size={12}/></button>
                      <button onClick={() => onOpenInvoisModal(row)} title="Input Invois"
                        style={{ padding: 4, borderRadius: 3, background: 'none', border: 'none', cursor: 'pointer', color: row.no_invois ? 'rgba(0,180,255,0.9)' : 'rgba(255,255,255,0.3)' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(0,180,255,0.95)'; e.currentTarget.style.background = 'rgba(0,180,255,0.07)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = row.no_invois ? 'rgba(0,180,255,0.9)' : 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'none' }}
                      ><Receipt size={12}/></button>
                      <button onClick={() => onEditRow({ ...row })}
                        style={{ padding: 4, borderRadius: 3, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#f0f0f0'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'none' }}
                      ><Pencil size={12}/></button>
                      <button onClick={() => onDeleteRow(row)}
                        style={{ padding: 4, borderRadius: 3, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.background = 'rgba(255,107,107,0.08)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'none' }}
                      ><Trash2 size={12}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot style={{ borderTop: '2px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
              <tr style={{ fontWeight: 700, color: 'rgba(255,255,255,0.65)', fontFamily: 'monospace' }}>
                <td style={{ padding: '7px 8px', position: 'sticky', left: 0, background: 'rgba(13,13,13,0.98)', zIndex: 10 }} colSpan={12}>TOTAL</td>
                <td style={{ padding: '7px 8px', textAlign: 'right' }}>{filteredBatang.toLocaleString('id')}</td>
                <td style={{ padding: '7px 8px', textAlign: 'right' }}>{filteredVolume.toFixed(3)}</td>
                <td colSpan={5}></td>
              </tr>
            </tfoot>
          </table>
        </div>
          )}
        </>
      )}
    </div>
  )
}
