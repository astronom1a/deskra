import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { gsap } from 'gsap'

// Barba.js-style page transitions powered by GSAP.
// Structure mirrors Barba.js: data-barba="wrapper" > data-barba="container".
// Curtain covers the screen before new content is painted, then reveals it.

export default function PageTransition({ children }) {
  const location  = useLocation()
  const curtainRef    = useRef(null)
  const containerRef  = useRef(null)
  const isFirst       = useRef(true)

  // Runs synchronously before the browser paints — cover screen immediately
  // so the user never sees a flash of un-animated new content.
  useLayoutEffect(() => {
    if (isFirst.current) return
    gsap.set(curtainRef.current,   { scaleY: 1, transformOrigin: 'top center', pointerEvents: 'all' })
    gsap.set(containerRef.current, { opacity: 0, y: 18 })
  }, [location.pathname])

  // Runs after paint — animate curtain away and reveal new page.
  useEffect(() => {
    const curtain   = curtainRef.current
    const container = containerRef.current

    if (isFirst.current) {
      isFirst.current = false
      gsap.from(container, { opacity: 0, y: 8, duration: 0.65, ease: 'power2.out' })
      return
    }

    gsap.timeline()
      // Curtain sweeps up (reveal from bottom)
      .to(curtain, {
        scaleY: 0,
        transformOrigin: 'bottom center',
        duration: 0.7,
        ease: 'expo.inOut',
      })
      // New content slides up and fades in
      .to(container, {
        opacity: 1,
        y: 0,
        duration: 0.45,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      }, '-=0.28')
      .set(curtain, { pointerEvents: 'none' })
  }, [location.pathname])

  return (
    <div data-barba="wrapper">
      {/* Transition curtain */}
      <div
        ref={curtainRef}
        data-barba-curtain
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#0a0a0a',
          transform: 'scaleY(0)',
          transformOrigin: 'top center',
          pointerEvents: 'none',
          willChange: 'transform',
        }}
      >
        {/* Subtle scan line */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(0,255,136,0.4), transparent)',
        }} />
      </div>
      {/* Page container — Barba.js namespace = first path segment */}
      <div
        ref={containerRef}
        data-barba="container"
        data-barba-namespace={location.pathname.slice(1).split('/')[0] || 'root'}
      >
        {children}
      </div>
    </div>
  )
}
