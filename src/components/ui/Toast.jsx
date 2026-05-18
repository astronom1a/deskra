import { useState, useCallback, useRef } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export default function Toast({ toast }) {
  if (!toast) return null

  const isError = toast.type === 'error'
  const accentColor = isError ? '#ff6b6b' : '#00d084'

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 50,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      width: 'min(420px, calc(100vw - 32px))',
      boxSizing: 'border-box',
      padding: '13px 16px',
      borderRadius: 6,
      fontSize: 13,
      lineHeight: 1.45,
      fontFamily: 'monospace',
      background: '#151515',
      border: '1px solid rgba(255,255,255,0.16)',
      borderLeft: `4px solid ${accentColor}`,
      color: '#f4f4f4',
      boxShadow: '0 14px 36px rgba(0,0,0,0.45)',
    }}>
      {isError
        ? <AlertCircle size={17} color={accentColor} style={{ marginTop: 1, flexShrink: 0 }}/>
        : <CheckCircle2 size={17} color={accentColor} style={{ marginTop: 1, flexShrink: 0 }}/>}
      <span style={{ overflowWrap: 'anywhere' }}>{toast.msg}</span>
    </div>
  )
}

export function useToast(duration = 3000) {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  const showToast = useCallback((msg, type = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ msg, type })
    timerRef.current = setTimeout(() => setToast(null), duration)
  }, [duration])

  return { toast, showToast }
}
