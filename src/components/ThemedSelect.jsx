import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function ThemedSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Pilih',
  disabled = false,
  style,
}) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const rootRef = useRef(null)

  const normalized = useMemo(() => options.map(opt =>
    typeof opt === 'string'
      ? { value: opt, label: opt }
      : { value: opt.value ?? opt.v ?? '', label: opt.label ?? opt.l ?? opt.value ?? opt.v ?? '' }
  ), [options])

  const selected = normalized.find(opt => opt.value === value)

  useEffect(() => {
    if (!open) return
    const onPointerDown = e => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    const onKeyDown = e => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const rootStyle = {
    position: 'relative',
    width: '100%',
    flex: style?.flex,
    minWidth: style?.minWidth,
  }

  const fieldBg = disabled
    ? 'rgba(255,255,255,0.025)'
    : open
      ? 'rgba(0,255,136,0.075)'
      : hovered
        ? 'rgba(0,255,136,0.045)'
        : (style?.background || style?.backgroundColor || '#101a14')

  const fieldBorder = disabled
    ? 'rgba(255,255,255,0.08)'
    : open
      ? '#00ff88'
      : hovered
        ? 'rgba(0,255,136,0.38)'
        : (style?.borderColor || 'rgba(0,255,136,0.28)')

  const baseStyle = {
    width: '100%',
    minHeight: 33,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderRadius: 3,
    padding: '6px 10px',
    color: disabled ? 'rgba(255,255,255,0.28)' : '#f0f0f0',
    fontFamily: 'monospace',
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: open ? '0 0 0 2px rgba(0,255,136,0.08)' : hovered ? '0 0 0 1px rgba(0,255,136,0.04)' : 'none',
    opacity: disabled ? 0.55 : 1,
    transition: 'background 120ms ease, border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease',
    ...style,
    background: fieldBg,
    border: `1px solid ${fieldBorder}`,
  }

  return (
    <div ref={rootRef} style={rootStyle}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(prev => !prev)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={baseStyle}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selected ? baseStyle.color : 'rgba(255,255,255,0.45)' }}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown size={13} style={{ color: disabled ? 'rgba(255,255,255,0.2)' : open ? '#00ff88' : 'rgba(0,255,136,0.75)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 120ms ease, color 120ms ease' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          zIndex: 100,
          left: 0,
          right: 0,
          top: 'calc(100% + 4px)',
          maxHeight: 220,
          overflowY: 'auto',
          background: '#111',
          border: '1px solid rgba(0,255,136,0.25)',
          borderRadius: 3,
          boxShadow: '0 14px 32px rgba(0,0,0,0.65)',
          padding: '4px 0',
        }}>
          {normalized.map(opt => {
            const active = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange?.(opt.value)
                  setOpen(false)
                }}
                style={{
                  width: '100%',
                  position: 'relative',
                  display: 'block',
                  padding: '8px 10px 8px 18px',
                  border: 'none',
                  borderRadius: 0,
                  background: active ? 'rgba(0,255,136,0.045)' : 'transparent',
                  color: active ? '#00ff88' : 'rgba(255,255,255,0.72)',
                  textAlign: 'left',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  fontWeight: active ? 700 : 400,
                  cursor: 'pointer',
                  transition: 'background 120ms ease, color 120ms ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = active ? 'rgba(0,255,136,0.07)' : 'rgba(255,255,255,0.045)'
                  e.currentTarget.style.color = active ? '#00ff88' : '#f0f0f0'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = active ? 'rgba(0,255,136,0.045)' : 'transparent'
                  e.currentTarget.style.color = active ? '#00ff88' : 'rgba(255,255,255,0.72)'
                }}
              >
                {active && (
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    background: '#00ff88',
                    boxShadow: '0 0 12px rgba(0,255,136,0.35)',
                  }} />
                )}
                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
