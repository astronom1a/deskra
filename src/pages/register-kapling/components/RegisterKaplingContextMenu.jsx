import { CheckCircle, Pencil, Trash2 } from 'lucide-react'

export default function RegisterKaplingContextMenu({
  isBatch,
  menu,
  onClearConflict,
  onDelete,
  onEdit,
  selectedCount,
}) {
  const showClearConflict = !isBatch && onClearConflict && menu?.row?.dkhp_conflict

  return (
    <div
      style={{ position: 'fixed', zIndex: 50, background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', padding: '4px 0', minWidth: 160, top: menu.y, left: menu.x }}
      onMouseDown={event => event.stopPropagation()}
    >
      {isBatch && (
        <div style={{ padding: '6px 16px', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace' }}>
          {selectedCount} kapling terpilih
        </div>
      )}
      <button
        onClick={onEdit}
        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 16px', fontSize: 12, color: 'rgba(255,255,255,0.65)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'monospace' }}
        onMouseEnter={event => event.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        onMouseLeave={event => event.currentTarget.style.background = 'none'}
      >
        <Pencil size={12} style={{ color: 'rgba(255,255,255,0.3)' }}/>
        {isBatch ? `edit ${selectedCount} terpilih` : 'edit'}
      </button>
      {showClearConflict && (
        <button
          onClick={onClearConflict}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 16px', fontSize: 12, color: '#ffaa00', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'monospace' }}
          onMouseEnter={event => event.currentTarget.style.background = 'rgba(255,170,0,0.07)'}
          onMouseLeave={event => event.currentTarget.style.background = 'none'}
        >
          <CheckCircle size={12}/>
          Tandai sudah diperiksa
        </button>
      )}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '3px 0' }}/>
      <button
        onClick={onDelete}
        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 16px', fontSize: 12, color: '#ff6b6b', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'monospace' }}
        onMouseEnter={event => event.currentTarget.style.background = 'rgba(255,107,107,0.07)'}
        onMouseLeave={event => event.currentTarget.style.background = 'none'}
      >
        <Trash2 size={12}/>
        {isBatch ? `hapus ${selectedCount} terpilih` : 'hapus'}
      </button>
    </div>
  )
}
