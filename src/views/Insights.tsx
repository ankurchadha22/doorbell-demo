import { Check, CircleHelp, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ChannelBadge } from '../components/Badges'
import { PageHeader } from '../components/PageHeader'
import { vendor } from '../data/config'
import { agentTypes, contentGaps, headline, insightsPeriod, topMissions, usageByChannel } from '../data/insights'
import { acts } from '../data/story'
import type { Channel } from '../data/types'
import { useDemo } from '../presenter/useStep'

const channelFill: Record<Channel, string> = { page: 'bg-web', facts: 'bg-form', ask: 'bg-mcp' }

export function Insights() {
  const { current } = useDemo()
  const spotGaps = current.spotlight === 'gaps'

  return (
    <div className="scroll-quiet h-full overflow-y-auto px-6 pt-5 pb-6">
      <PageHeader eyebrow={acts[3]} title={`Weekly report: AI agents on ${vendor.site}`} subtitle={insightsPeriod} />

      <div className="mt-5 grid grid-cols-3 gap-4">
        <Card title="This week">
          <dl className="space-y-2.5">
            {headline.map((h) => (
              <div key={h.label} className="flex items-baseline gap-3">
                <dd className="tnum w-14 text-[1.75rem] leading-none font-bold tracking-tight text-ink">{h.value}</dd>
                <dt className="min-w-0">
                  <div className="font-medium text-ink">{h.label}</div>
                  {h.note && <div className="text-sm text-muted">{h.note}</div>}
                </dt>
              </div>
            ))}
          </dl>
        </Card>

        <Card title="What agents used">
          <Bars
            max={Math.max(...usageByChannel.map((d) => d.value))}
            rows={usageByChannel.map((d) => ({
              key: d.channel,
              label: <ChannelBadge channel={d.channel} />,
              value: d.value,
              valueLabel: d.value.toLocaleString('en-US'),
              hint: `${d.label}: ${d.value.toLocaleString('en-US')} ${d.unit}`,
              fill: channelFill[d.channel],
            }))}
            labelWidth="6.5rem"
          />
          <p className="mt-3 text-sm text-muted">Most agents read pages. The facts panel and ask box are where they get exact answers.</p>
        </Card>

        <Card title="Agents seen">
          <Bars
            max={100}
            rows={agentTypes.map((p) => ({
              key: p.label,
              label: <span className="text-[0.9375rem] text-ink-2">{p.label}</span>,
              value: p.share,
              valueLabel: `${p.share}%`,
              hint: `${p.label}: ${p.share}% of visits`,
              fill: 'bg-ink-2',
            }))}
            labelWidth="9.5rem"
          />
          <p className="mt-3 text-sm text-muted">Grouped by how the agent behaves, not by brand.</p>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4">
        <Card title="What agents were looking for">
          <ol className="space-y-1.5">
            {topMissions.map((q) => (
              <li key={q.text} className="flex items-baseline gap-3">
                <span className="min-w-0 flex-1 text-[0.9375rem] text-ink">{q.text}</span>
                <span className="tnum text-[0.9375rem] font-semibold text-ink">{q.count}</span>
                <span className="w-12 text-sm text-muted">visits</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card
          title="What agents couldn't find"
          highlight={spotGaps}
          aside={<span className="text-sm text-muted">Add an answer and the next agent gets it</span>}
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
            {state === 'added'
              ? 'Answer live in the facts panel and ask box.'
              : `${asked} agent visits looked for this. ${endedThere} left soon after.`}
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
            Answer agents will see in the facts panel (cite your source page)
          </label>
          <textarea
            id={`gap-${text}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="For example: Yes. Every plan has a 14-day free trial, no card needed."
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
