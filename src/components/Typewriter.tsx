import { useEffect, useState } from 'react'
import { TYPE_MS_PER_CHAR } from '../lib/schedule'

interface Props {
  text: string
  /** Whether to animate now. When false, the full text shows immediately. */
  animate: boolean
  delayMs?: number
}

/** Types text at a fixed pace. Deterministic: same text, same timing, every run. */
export function Typewriter({ text, animate, delayMs = 0 }: Props) {
  const [typed, setTyped] = useState(0)

  useEffect(() => {
    if (!animate) return
    // A timer (not requestAnimationFrame) so typing also runs when the window is in the background.
    const start = Date.now() + delayMs
    const id = window.setInterval(() => {
      const n = Math.max(0, Math.floor((Date.now() - start) / TYPE_MS_PER_CHAR))
      setTyped(Math.min(text.length, n))
      if (n >= text.length) window.clearInterval(id)
    }, TYPE_MS_PER_CHAR)
    return () => window.clearInterval(id)
  }, [animate, text, delayMs])

  // When not animating (skipped, or an earlier step), the full text shows at once.
  const count = animate ? typed : text.length
  const done = count >= text.length
  return (
    <span>
      {/* Full text for screen readers; the animated copy is decorative. */}
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.slice(0, count)}
        {!done && <span className="ml-px inline-block h-[1.05em] w-[2px] translate-y-[0.15em] animate-blink bg-current" />}
      </span>
    </span>
  )
}
