import { BellRing, Bot, ChartColumn, Database, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { DemoLabel } from '../components/DemoLabel'
import { Logo } from '../components/Logo'
import { businessModel, product, roadmap, stats } from '../data/config'
import { useDemo } from '../presenter/useStep'

const does = ['Spots the agent', 'Identifies the company', 'Summarizes what it wanted', 'Helps on the spot']

const outputs = [
  { label: 'Live rep alert', detail: 'Slack or Teams', Icon: BellRing },
  { label: 'CRM record', detail: 'Salesforce or HubSpot', Icon: Database },
  { label: 'Weekly report', detail: "What agents couldn't find", Icon: ChartColumn },
]

export function Closing() {
  const { reset } = useDemo()
  return (
    <div className="scroll-quiet flex h-full flex-col overflow-y-auto bg-paper px-[5vw] py-7">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo className="size-8" />
          <span className="text-lg font-semibold tracking-tight">{product.name}</span>
        </div>
        <DemoLabel />
      </div>

      <h1 className="mt-8 text-[clamp(2.25rem,3.6vw,3.5rem)] leading-[1.05] font-bold tracking-[-0.03em] text-ink">
        Know which AI agents came knocking
      </h1>

      {/* Diagram: an agent visit → Doorbell → the sales team's tools */}
      <div
        className="mt-8 grid items-center"
        style={{ gridTemplateColumns: 'minmax(0,0.85fr) minmax(2.5rem,0.25fr) minmax(0,1fr) minmax(2.5rem,0.25fr) minmax(0,1fr)' }}
        role="img"
        aria-label={`An AI agent visits your website. ${product.name} spots it, identifies the company, summarizes what it wanted and helps on the spot, then sends a rep alert, a CRM record and a weekly report.`}
      >
        <Node
          icon={<Bot className="size-6 text-ink-2" />}
          title="An AI agent visits your website"
          text="AI browsers open your pages and click through them for the buyer."
        />

        <Arrow />

        <div className="rounded-2xl bg-accent p-5 text-white shadow-[0_20px_50px_-20px_rgba(15,107,87,0.6)]">
          <div aria-hidden>
            <Logo className="size-9" />
          </div>
          <div className="mt-3 text-xl leading-tight font-semibold tracking-tight">{product.name}</div>
          <p className="mt-0.5 text-[0.9375rem] text-white/80">One line of code on your site</p>
          <ol className="mt-3 space-y-1">
            {does.map((d, i) => (
              <li key={d} className="flex items-center gap-2 text-[0.9375rem] font-medium">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/20 text-xs font-bold">{i + 1}</span>
                {d}
              </li>
            ))}
          </ol>
        </div>

        <Arrow />

        <ul className="space-y-2.5">
          {outputs.map((o) => (
            <li key={o.label} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
              <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-sunken text-ink-2">
                <o.Icon className="size-4.5" />
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-ink">{o.label}</div>
                <div className="text-sm text-muted">{o.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Roadmap */}
      <ol className="mt-7 grid grid-cols-3 gap-3" aria-label="Roadmap">
        {roadmap.map((r, i) => (
          <li key={r.id} className={`rounded-2xl border p-3.5 ${i === 0 ? 'border-accent bg-accent-soft/60' : 'border-line bg-surface'}`}>
            <div className="flex items-baseline gap-2">
              <span className={`text-sm font-semibold ${i === 0 ? 'text-accent-strong' : 'text-muted'}`}>{r.when}</span>
              <span className="text-lg font-semibold text-ink">{r.name}</span>
            </div>
            <p className="mt-0.5 text-[0.9375rem] leading-snug text-ink-2">{r.text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-7 border-t border-line pt-5">
        {stats.map((s) => {
          const [before, after] = s.text.split(s.value)
          return (
            <figure key={s.source}>
              <blockquote className="text-[1.3125rem] leading-snug text-ink">
                {before}
                <strong className="font-bold">{s.value}</strong>
                {after}
              </blockquote>
              <figcaption className="mt-1.5 text-sm text-muted">Source: {s.source}</figcaption>
            </figure>
          )
        })}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-4 pt-6">
        <p className="text-lg font-medium text-ink-2">{businessModel}</p>
        <button
          type="button"
          onClick={reset}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-4 py-2 font-medium text-ink-2 hover:bg-sunken"
        >
          <RotateCcw aria-hidden className="size-4" />
          Restart the demo
        </button>
      </div>
    </div>
  )
}

function Node({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 text-ink">
      <div aria-hidden>{icon}</div>
      <div className="mt-3 text-xl leading-tight font-semibold tracking-tight">{title}</div>
      <p className="mt-1.5 text-[0.9375rem] leading-snug text-ink-2">{text}</p>
    </div>
  )
}

function Arrow() {
  return (
    <div aria-hidden className="relative mx-2 h-0.5 bg-line-strong">
      <span className="absolute top-1/2 right-0 size-2.5 translate-x-px -translate-y-1/2 rotate-45 border-t-2 border-r-2 border-line-strong" />
    </div>
  )
}
