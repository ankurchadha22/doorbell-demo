import { useEffect, useState, type ReactNode } from 'react'

// The demo is laid out for laptop and projector screens. On anything smaller it renders at
// 1280×800 and scales down to fit, like a slide, instead of reflowing into a broken layout.
const STAGE_W = 1280
const STAGE_H = 800
const MIN_W = 1024
const MIN_H = 600

function measure() {
  const w = window.innerWidth
  const h = window.innerHeight
  const small = w < MIN_W || h < MIN_H
  return { small, scale: Math.min(w / STAGE_W, h / STAGE_H) }
}

export function FitToScreen({ children }: { children: ReactNode }) {
  const [fit, setFit] = useState(measure)

  useEffect(() => {
    const onResize = () => setFit(measure())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (!fit.small) return <>{children}</>

  return (
    <div className="flex h-full flex-col items-center justify-center overflow-hidden bg-bar">
      <div style={{ width: STAGE_W * fit.scale, height: STAGE_H * fit.scale }} className="relative shrink-0 overflow-hidden">
        <div
          style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${fit.scale})`, transformOrigin: 'top left' }}
          className="absolute top-0 left-0 bg-paper"
        >
          {children}
        </div>
      </div>
      <p className="mt-2 px-4 text-center text-sm text-white/70">
        Built for a laptop screen. Rotate your phone or open it on a computer for the full view.
      </p>
    </div>
  )
}
