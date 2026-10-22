import type { TimelineEntry } from '../data/types'
import { DoorBadge, SourceBadge, StatusLabel } from './Badges'
import { Enter } from './Enter'

export interface PlacedEntry {
  entry: TimelineEntry
  animate: boolean
  delay: number
}

/** The agent's activity, oldest first, each step with door and source badges. */
export function Timeline({ entries }: { entries: PlacedEntry[] }) {
  return (
    <ol className="relative">
      {entries.map(({ entry: e, animate, delay }, i) => {
        const last = i === entries.length - 1
        const dot =
          e.status === 'escalated'
            ? 'bg-esc'
            : e.status === 'warn'
              ? 'bg-warn'
              : e.status === 'unverified'
                ? 'bg-surface border-2 border-muted'
                : e.source === 'independent'
                  ? 'bg-line-strong'
                  : 'bg-accent'
        return (
          <Enter as="li" key={e.id} animate={animate} delay={delay} className="relative grid grid-cols-[2.6rem_1fr] gap-x-2 pb-3">
            <span className="tnum pt-px text-sm text-muted">{e.at}</span>
            <div className="relative pl-5">
              {!last && <span aria-hidden className="absolute top-4 -bottom-4.5 left-[calc(0.3125rem-0.5px)] w-px bg-line" />}
              <span aria-hidden className={`absolute top-1.5 left-0 size-2.5 rounded-full ${dot}`} />
              <div className="text-[0.9375rem] leading-snug font-medium text-ink">{e.title}</div>
              {(e.door || e.source || e.status) && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {e.door && <DoorBadge door={e.door} />}
                  {e.source && <SourceBadge source={e.source} />}
                  {e.status && <StatusLabel status={e.status} label={e.statusLabel} />}
                </div>
              )}
              {e.detail && <div className="mt-0.5 text-sm leading-snug text-muted">{e.detail}</div>}
            </div>
          </Enter>
        )
      })}
    </ol>
  )
}
