import { ChevronDown, ChevronLeft, ChevronRight, Pencil, Search, SlidersHorizontal, Trash2, X } from 'lucide-react'

export default function RegisterKaplingToolbar({
  columns,
  colDropdownRef,
  currentPage,
  displayedCount,
  onBatchDelete,
  onBatchEdit,
  onClearSearch,
  onOpenSortPanel,
  onPageNext,
  onPagePrev,
  onSearchChange,
  onSearchColChange,
  onSetPageSize,
  onToggleColDropdown,
  pageSize,
  pageSizes,
  rowsCount,
  safePage,
  searchCol,
  searchTerm,
  searchedCount,
  selectedCount,
  showColDropdown,
  sorts,
  totalPages,
}) {
  if (!rowsCount) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
          menampilkan{' '}
          <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>{displayedCount.toLocaleString('id')}</span>
          {' '}dari{' '}
          <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>{searchedCount.toLocaleString('id')}</span>
          {searchTerm.trim() && <span style={{ color: 'rgba(255,255,255,0.25)' }}>{' '}(total {rowsCount.toLocaleString('id')})</span>}
          {' '}kapling
        </p>
        {selectedCount > 0 && (
          <>
            <button onClick={onBatchEdit}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 11, background: 'rgba(0,180,255,0.08)', border: '1px solid rgba(0,180,255,0.2)', borderRadius: 3, color: 'rgba(0,180,255,0.9)', cursor: 'pointer', fontFamily: 'monospace' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,180,255,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,180,255,0.08)'}
            ><Pencil size={11}/> edit {selectedCount} terpilih</button>
            <button onClick={onBatchDelete}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 11, background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 3, color: '#ff6b6b', cursor: 'pointer', fontFamily: 'monospace' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,107,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,107,107,0.08)'}
            ><Trash2 size={11}/> hapus {selectedCount} terpilih</button>
          </>
        )}
        {pageSize > 0 && totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={onPagePrev} disabled={safePage === 1}
              style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', fontSize: 11, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', cursor: safePage === 1 ? 'not-allowed' : 'pointer', opacity: safePage === 1 ? 0.4 : 1, fontFamily: 'monospace' }}
            ><ChevronLeft size={10}/> prev</button>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', padding: '0 6px', fontFamily: 'monospace' }}>{safePage} / {totalPages}</span>
            <button onClick={onPageNext} disabled={safePage === totalPages}
              style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', fontSize: 11, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', opacity: safePage === totalPages ? 0.4 : 1, fontFamily: 'monospace' }}
            >next <ChevronRight size={10}/></button>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div ref={colDropdownRef} style={{ position: 'relative' }}>
            <button onClick={onToggleColDropdown}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 28, padding: '0 8px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${showColDropdown ? 'rgba(0,255,136,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 3, color: searchCol === 'all' ? 'rgba(255,255,255,0.4)' : '#00ff88', fontFamily: 'monospace', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', outline: 'none', boxShadow: showColDropdown ? '0 0 0 2px rgba(0,255,136,0.07)' : 'none' }}
            >
              {searchCol === 'all' ? 'Semua Kolom' : (columns.find(c => c.key === searchCol)?.label || searchCol)}
              <ChevronDown size={10} style={{ opacity: 0.4, flexShrink: 0 }}/>
            </button>
            {showColDropdown && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200, background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3, overflow: 'hidden', minWidth: '100%', boxShadow: '0 8px 24px rgba(0,0,0,0.7)' }}>
                {[{ key: 'all', label: 'Semua Kolom' }, ...columns].map(c => {
                  const active = searchCol === c.key
                  return (
                    <div key={c.key}
                      onClick={() => onSearchColChange(c.key)}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                      style={{ padding: '6px 12px', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer', whiteSpace: 'nowrap', color: active ? '#00ff88' : 'rgba(255,255,255,0.65)', background: active ? 'rgba(0,255,136,0.08)' : 'transparent', borderLeft: `2px solid ${active ? '#00ff88' : 'transparent'}` }}
                    >{c.label}</div>
                  )
                })}
              </div>
            )}
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={11} style={{ position: 'absolute', left: 7, color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}/>
            <input type="text" value={searchTerm} onChange={e => onSearchChange(e.target.value)} placeholder="cari..." className="rk-input" style={{ height: 28, paddingLeft: 22, paddingRight: searchTerm ? 22 : 8, width: 140, fontSize: 11 }}/>
            {searchTerm && (
              <button onClick={onClearSearch} style={{ position: 'absolute', right: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0 }}><X size={10}/></button>
            )}
          </div>
        </div>
        <button onClick={onOpenSortPanel}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 11, borderRadius: 3, border: sorts.length > 0 ? '1px solid rgba(0,255,136,0.3)' : '1px solid rgba(255,255,255,0.1)', background: sorts.length > 0 ? 'rgba(0,255,136,0.08)' : 'rgba(255,255,255,0.04)', color: sorts.length > 0 ? '#00ff88' : 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'monospace' }}
        >
          <SlidersHorizontal size={11}/>
          urutan
          {sorts.length > 0 && <span style={{ background: '#00ff88', color: '#0a0a0a', borderRadius: 99, width: 15, height: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{sorts.length}</span>}
        </button>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>tampilkan:</span>
        <div style={{ display: 'flex', gap: 3 }}>
          {pageSizes.map(p => (
            <button key={p.value} onClick={() => onSetPageSize(p.value)}
              style={{ padding: '3px 8px', fontSize: 11, borderRadius: 3, fontWeight: 600, fontFamily: 'monospace', cursor: 'pointer', border: pageSize === p.value ? 'none' : '1px solid rgba(255,255,255,0.08)', background: pageSize === p.value ? '#00ff88' : 'rgba(255,255,255,0.04)', color: pageSize === p.value ? '#0a0a0a' : 'rgba(255,255,255,0.4)' }}
            >{p.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
