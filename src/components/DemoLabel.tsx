import { FlaskConical } from 'lucide-react'
import { product } from '../data/config'

/** Persistent label on every screen. */
export function DemoLabel({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  return (
    <div
      role="note"
      className={`pointer-events-none inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${
        tone === 'dark'
          ? 'border-white/20 bg-white/10 text-white/85'
          : 'border-line-strong bg-surface/90 text-ink-2 backdrop-blur'
      }`}
    >
      <FlaskConical aria-hidden className="size-3.5" strokeWidth={2.25} />
      {product.demoLabel}
    </div>
  )
}
