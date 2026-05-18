import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { gsap } from 'gsap'

export default function PageTransition({ children }) {
  const loc          = useLocation()
  const containerRef = useRef(null)
  const barRef       = useRef(null)
  const isFirst      = useRef(true)

  useLayoutEffect(() => {
    if (isFirst.current) return
    gsap.set(containerRef.current, { opacity: 0, y: 8 })
  }, [loc.pathname])

  useEffect(() => {
    const container = containerRef.current
    const bar       = barRef.current

    if (isFirst.current) {
      isFirst.current = false
      gsap.from(container, { opacity: 0, y: 6, duration: 0.3, ease: 'power2.out' })
      return
    }

    gsap.timeline()
      .to(bar,       { scaleX: 1, duration: 0.18, ease: 'power1.out' })
      .to(container, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out', clearProps: 'transform,opacity' }, '-=0.08')
      .to(bar,       { opacity: 0, duration: 0.15 })
      .set(bar,      { scaleX: 0, opacity: 1 })
  }, [loc.pathname])

  return (
    <div>
      <div
        ref={barRef}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent, #00ff88 40%, #00ff88 60%, transparent)',
          transform: 'scaleX(0)',
          transformOrigin: 'left center',
          zIndex: 9999,
          pointerEvents: 'none',
          willChange: 'transform, opacity',
        }}
      />
      <div ref={containerRef}>
        {children}
      </div>
    </div>
  )
}
