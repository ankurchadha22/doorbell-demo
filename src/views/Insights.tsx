import { Check, CircleHelp, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { DoorBadge } from '../components/Badges'
import { PageHeader } from '../components/PageHeader'
import { vendor } from '../data/config'
import { agentPlatforms, contentGaps, insightsPeriod, interactionsByDoor, stageFunnel, topQuestions } from '../data/insights'
import { acts } from '../data/story'
import type { Door } from '../data/types'
import { useDemo } from '../presenter/useStep'

const doorFill: Record<Door, string> = { website: 'bg-web', form: 'bg-form', mcp: 'bg-mcp' }

export function Insights() {
  const { current } = useDemo()
  const spotGaps = current.spotlight === 'gaps'

  return (
    <div className="scroll-quiet h-full overflow-y-auto px-6 pt-5 pb-6">
      <PageHeader eyebrow={acts[3]} title={`What buyers' agents ask ${vendor.name}`} subtitle={insightsPeriod} />

      <div className="mt-5 grid grid-cols-3 gap-4">
        <Card title="Agent interactions by door">
          <Bars
            max={Math.max(...interactionsByDoor.map((d) => d.value))}
            rows={interactionsByDoor.map((d) => ({
              key: d.door,
              label: <DoorBadge door={d.door} />,
              value: d.value,
              valueLabel: d.value.toLocaleString('en-US'),
              hint: `${d.label}: ${d.value.toLocaleString('en-US')} ${d.unit}`,
              fill: doorFill[d.door],
            }))}
            labelWidth="5.5rem"
          />
          <p className="mt-3 text-sm text-muted">Website reads reach every agent. MCP questions go deepest.</p>
        </Card>

        <Card title="Agent sessions reaching each stage">
          <Bars
            max={stageFunnel[0].sessions}
            rows={stageFunnel.map((s) => ({
              key: s.stage,
              label: <span className="text-[0.9375rem] text-ink-2">{s.stage}</span>,
              value: s.sessions,
              valueLabel: s.sessions.toLocaleString('en-US'),
              hint: `${s.stage}: ${s.sessions} sessions`,
              fill: 'bg-accent',
            }))}
            labelWidth="9.5rem"
            dense
          />
        </Card>

        <Card title="Agent platforms seen">
          <Bars
            max={100}
            rows={agentPlatforms.map((p) => ({
              key: p.label,
              label: <span className="text-[0.9375rem] text-ink-2">{p.label}</span>,
              value: p.share,
              valueLabel: `${p.share}%`,
              hint: `${p.label}: ${p.share}% of sessions`,
              fill: 'bg-ink-2',
            }))}
            labelWidth="9rem"
          />
          <p className="mt-3 text-sm text-muted">Grouped by how the agent behaves, not by brand.</p>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4">
        <Card title="Top questions agents asked">
          <ol className="space-y-1.5">
            {topQuestions.map((q) => (
              <li key={q.text} className="flex items-baseline gap-3">
                <span className="min-w-0 flex-1 text-[0.9375rem] text-ink">{q.text}</span>
                <span className="tnum text-[0.9375rem] font-semibold text-ink">{q.count}</span>
                <span className="w-12 text-sm text-muted">asked</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card
          title="Unanswered questions (content gaps)"
          highlight={spotGaps}
          aside={<span className="text-sm text-muted">The desk said "I don't know" and offered a person</span>}
        >
          <ul className="divide-y divide-line">
            {contentGaps.map((g) => (
              <GapRow key={g.id} text={g.text} asked={g.asked} endedThere={g.endedThere} />
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}

function Card({
  title,
  children,
  highlight,
  aside,
}: {
  title: string
  children: ReactNode
  highlight?: boolean
  aside?: ReactNode
}) {
  return (
    <section
      aria-label={title}
      className={`rounded-2xl border bg-surface p-4 transition-shadow duration-300 ${
        highlight ? 'animate-pop border-accent/50 shadow-[0_0_0_4px_rgba(15,107,87,0.12)]' : 'border-line'
      }`}
    >
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <h2 className="font-semibold text-ink">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

interface BarRow {
  key: string
  label: ReactNode
  value: number
  valueLabel: string
  hint: string
  fill: string
}

/** Horizontal bars: thin marks, rounded data end, value labeled directly. Hover shows the full figure. */
function Bars({ rows, max, labelWidth, dense }: { rows: BarRow[]; max: number; labelWidth: string; dense?: boolean }) {
  return (
    <ul className={dense ? 'space-y-1.5' : 'space-y-2.5'}>
      {rows.map((r) => (
        <li
          key={r.key}
          title={r.hint}
          className="group grid items-center gap-3"
          style={{ gridTemplateColumns: `${labelWidth} minmax(0,1fr) 3.25rem` }}
        >
          <span className="min-w-0 leading-tight">{r.label}</span>
          <span className="relative h-3 rounded-r bg-sunken">
            <span
              className={`absolute inset-y-0 left-0 rounded-r-[4px] ${r.fill} transition-opacity group-hover:opacity-80`}
              style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }}
            />
          </span>
          <span className="tnum text-right text-[0.9375rem] font-semibold text-ink">{r.valueLabel}</span>
          <span className="sr-only">{r.hint}</span>
        </li>
      ))}
    </ul>
  )
}

function GapRow({ text, asked, endedThere }: { text: string; asked: number; endedThere: number }) {
  const [state, setState] = useState<'open' | 'editing' | 'added'>('open')
  const [draft, setDraft] = useState('')

  return (
    <li className="py-2.5 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <CircleHelp aria-hidden className={`mt-0.5 size-5 shrink-0 ${state === 'added' ? 'text-accent' : 'text-warn'}`} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-ink">“{text}”</div>
          <div className="tnum text-sm text-ink-2">
            Asked {asked} times, no answer. {endedThere} sessions ended there.
          </div>
        </div>
        {state === 'open' && (
          <button
            type="button"
            onClick={() => setState('editing')}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-accent px-3 py-1.5 text-[0.9375rem] font-semibold text-accent-strong hover:bg-accent-soft"
          >
            <Plus aria-hidden className="size-4" />
            Add answer
          </button>
        )}
        {state === 'added' && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-accent-soft px-3 py-1.5 text-[0.9375rem] font-semibold text-accent-strong">
            <Check aria-hidden className="size-4" />
            Answer added
          </span>
        )}
      </div>
      {state === 'editing' && (
        <form
          className="mt-2 ml-8"
          onSubmit={(e) => {
            e.preventDefault()
            setState('added')
          }}
        >
          <label className="text-sm font-medium text-ink-2" htmlFor={`gap-${text}`}>
            Answer agents will receive (cited to your source document)
          </label>
          <textarea
            id={`gap-${text}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="For example: Not today. A person on our team can discuss options."
            className="mt-1 w-full resize-none rounded-lg border border-line-strong bg-surface px-3 py-2 text-[0.9375rem] text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <div className="mt-1.5 flex justify-end gap-2">
            <button type="button" onClick={() => setState('open')} className="rounded-lg px-3 py-1.5 font-medium text-ink-2 hover:bg-sunken">
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-accent px-3 py-1.5 font-semibold text-white hover:bg-accent-strong">
              Save answer
            </button>
          </div>
        </form>
      )}
    </li>
  )
}
