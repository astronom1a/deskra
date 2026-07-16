import { useEffect } from 'react'
import { X } from 'lucide-react'

// Panel slide-up dari bawah + backdrop — untuk filter/aksi halaman di mobile.
// Pola visual mengikuti drawer sidebar (Layout.jsx).
export default function BottomSheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 59, background: 'rgba(0,0,0,0.6)' }}
        />
      )}
      <div
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 60,
          background: '#0d0d0d',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px 8px 0 0',
          maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.25s ease',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#00ff88' }}>
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            }}
          >
            <X size={13} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: 16 }}>
          {children}
        </div>
      </div>
    </>
  )
}
