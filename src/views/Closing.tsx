import { BellRing, ClipboardList, Database, Globe, LayoutDashboard, Plug, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { DemoLabel } from '../components/DemoLabel'
import { Logo } from '../components/Logo'
import { businessModel, product, stats } from '../data/config'
import { useDemo } from '../presenter/useStep'

const doors = [
  { name: 'Website', role: 'reach', text: 'Pages any agent can read. No setup for the buyer.', Icon: Globe, tone: 'bg-web-soft text-web' },
  { name: 'Forms', role: 'identity', text: 'Quotes and documents, for a work email the buyer agrees to share.', Icon: ClipboardList, tone: 'bg-form-soft text-form' },
  { name: 'MCP', role: 'depth', text: 'Cited answers to any question, for agents that connect.', Icon: Plug, tone: 'bg-mcp-soft text-mcp' },
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
        Three doors, one source of truth
      </h1>

      {/* Diagram: three doors → one desk → the vendor's dashboard and CRM */}
      <div
        className="mt-8 grid items-center"
        style={{ gridTemplateColumns: 'minmax(0,1.25fr) minmax(2.5rem,0.3fr) minmax(0,0.9fr) minmax(2.5rem,0.3fr) minmax(0,1fr)' }}
        role="img"
        aria-label={`Website, Forms and MCP all lead to ${product.name}, which feeds the vendor's dashboard and CRM.`}
      >
        <ul className="space-y-3">
          {doors.map((d) => (
            <li key={d.name} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-3.5">
              <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-xl ${d.tone}`}>
                <d.Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="text-lg leading-tight font-semibold text-ink">
                  {d.name} <span className="font-normal text-muted">({d.role})</span>
                </div>
                <p className="mt-0.5 text-[0.9375rem] leading-snug text-ink-2">{d.text}</p>
              </div>
            </li>
          ))}
        </ul>

        <svg aria-hidden viewBox="0 0 100 300" preserveAspectRatio="none" className="h-full w-full self-stretch">
          {[50, 150, 250].map((y) => (
            <path
              key={y}
              d={`M0 ${y} C 55 ${y}, 45 150, 100 150`}
              fill="none"
              className="stroke-line-strong"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        <Node
          strong
          icon={<Logo className="size-9" />}
          title={product.name}
          text="Built from your website, docs, pricing, security files and past RFP answers. Your policies decide what it may say."
        />

        <Arrow />

        <Node
          icon={<LayoutDashboard className="size-6 text-ink-2" />}
          title="Dashboard + CRM"
          text="Named accounts, the exact questions, the buying stage and the deal value."
          extra={
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-ink-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-sunken px-2 py-0.5">
                <BellRing aria-hidden className="size-3.5" /> Rep alerts
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-sunken px-2 py-0.5">
                <Database aria-hidden className="size-3.5" /> CRM sync
              </span>
            </div>
          }
        />
      </div>

      <div className="mt-9 grid grid-cols-2 gap-6 border-t border-line pt-6">
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

      <div className="mt-auto flex flex-wrap items-center gap-4 pt-8">
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

function Node({ icon, title, text, strong, extra }: { icon: ReactNode; title: string; text: string; strong?: boolean; extra?: ReactNode }) {
  return (
    <div
      className={`rounded-2xl p-5 ${
        strong ? 'bg-accent text-white shadow-[0_20px_50px_-20px_rgba(15,107,87,0.6)]' : 'border border-line bg-surface text-ink'
      }`}
    >
      <div aria-hidden>{icon}</div>
      <div className="mt-3 text-xl leading-tight font-semibold tracking-tight">{title}</div>
      <p className={`mt-1.5 text-[0.9375rem] leading-snug ${strong ? 'text-white/85' : 'text-ink-2'}`}>{text}</p>
      {extra}
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
