import { useState, useCallback, useRef } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export default function Toast({ toast }) {
  if (!toast) return null

  const isError = toast.type === 'error'

  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 50,
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 16px', borderRadius: 3, fontSize: 12, fontFamily: 'monospace',
      background: isError ? 'rgba(255,107,107,0.12)' : 'rgba(0,255,136,0.10)',
      border: `1px solid ${isError ? 'rgba(255,107,107,0.3)' : 'rgba(0,255,136,0.3)'}`,
      color: isError ? '#ff6b6b' : '#00ff88',
    }}>
      {isError ? <AlertCircle size={13}/> : <CheckCircle2 size={13}/>}
      {toast.msg}
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
