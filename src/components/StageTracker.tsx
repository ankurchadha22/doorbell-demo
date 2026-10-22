import { Flag } from 'lucide-react'
import { stages } from '../data/buyerScript'
import type { StageId } from '../data/types'

interface Props {
  current: StageId | null
  /** A later stage that needs attention (e.g. a negotiation request waiting for a person). */
  flagged?: StageId
  className?: string
}

/** The six buying stages as a segmented bar. */
export function StageTracker({ current, flagged, className = '' }: Props) {
  const currentIdx = current ? stages.findIndex((s) => s.id === current) : -1
  return (
    <ol className={`grid grid-cols-6 gap-1.5 ${className}`} aria-label="Buying stage">
      {stages.map((s, i) => {
        const done = i < currentIdx
        const active = i === currentIdx
        const isFlagged = s.id === flagged
        const bar = isFlagged
          ? 'bg-esc'
          : active
            ? 'bg-accent'
            : done
              ? 'bg-accent/45'
              : 'bg-line'
        const text = isFlagged
          ? 'text-esc font-semibold'
          : active
            ? 'text-ink font-semibold'
            : done
              ? 'text-ink-2'
              : 'text-muted'
        return (
          <li key={s.id} className="min-w-0" aria-current={active ? 'step' : undefined}>
            <div className={`h-1.5 rounded-full transition-colors duration-300 ${bar}`} />
            <div className={`mt-1.5 flex items-center gap-1 text-sm leading-tight ${text}`}>
              {isFlagged && <Flag aria-hidden className="size-3.5 shrink-0" strokeWidth={2.5} />}
              <span>{s.label}</span>
            </div>
            {isFlagged && <span className="sr-only">(flagged: waiting for a person)</span>}
          </li>
        )
      })}
    </ol>
  )
}
