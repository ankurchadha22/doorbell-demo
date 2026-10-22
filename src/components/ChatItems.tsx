import { Bot, FileText, Info, UserCheck, UserRoundCog } from 'lucide-react'
import type { ReactNode } from 'react'
import { buyer } from '../data/config'
import { finalComparison, finalComparisonNote, type CellTone } from '../data/buyerScript'
import { purchasePaths } from '../data/policies'
import type { ChatItem, Citation } from '../data/types'
import { DoorBadge, SourceBadge, StatusLabel } from './Badges'
import { Typewriter } from './Typewriter'

type Of<K extends ChatItem['kind']> = Extract<ChatItem, { kind: K }>

export function CiteChip({ cite }: { cite: Citation }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-line bg-sunken px-2 py-0.5 text-sm text-ink-2">
      <FileText aria-hidden className="size-3.5 shrink-0 text-muted" />
      <span className="font-medium whitespace-nowrap">{cite.label}</span>
      <span className="truncate text-muted">{cite.url}</span>
    </span>
  )
}

export function AgentAvatar() {
  return (
    <div aria-hidden className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink-2 text-white">
      <Bot className="size-4.5" strokeWidth={2} />
    </div>
  )
}

/** Agent turn: avatar + content. */
export function AgentTurn({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <AgentAvatar />
      <div className="min-w-0 flex-1 pt-1">{children}</div>
    </div>
  )
}

export function UserMessage({ item, typing, delay }: { item: Of<'user'>; typing: boolean; delay: number }) {
  return (
    <div className="flex justify-end gap-3">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-ink-2 px-4 py-2.5 text-md leading-relaxed text-white">
        {item.typed ? <Typewriter key={typing ? 'typing' : 'static'} text={item.text} animate={typing} delayMs={delay} /> : item.text}
      </div>
      <div
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent-strong"
      >
        {buyer.initials}
      </div>
    </div>
  )
}

export function AgentMessage({ item }: { item: Of<'agent'> }) {
  return (
    <AgentTurn>
      <p className="text-md leading-relaxed text-ink">{item.text}</p>
      {item.note && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-mcp-soft px-2 py-1 text-sm font-medium text-mcp">
          <Info aria-hidden className="size-4 shrink-0" />
          {item.note}
        </p>
      )}
    </AgentTurn>
  )
}

/** One question checked with a vendor. Rows from the same vendor render inside one card. */
export function CheckRow({ item }: { item: Of<'check'> }) {
  return (
    <div className="py-2.5">
      <div className="text-sm text-muted">Asked: {item.question}</div>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-md font-medium text-ink">{item.answer}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <StatusLabel status={item.status} label={item.statusLabel} />
        {item.cite && <CiteChip cite={item.cite} />}
      </div>
    </div>
  )
}

export function CheckCardHeader({ item }: { item: Of<'check'> }) {
  return (
    <div className="flex items-center gap-2 border-b border-line pb-2">
      <span className="font-semibold text-ink">{item.vendor}</span>
      <DoorBadge door={item.door} />
      <SourceBadge source={item.source} />
      <span className="ml-auto text-sm text-muted">
        {item.door === 'mcp' ? 'Checked over MCP' : 'Checked on their website'}
      </span>
    </div>
  )
}

export function ShortlistMessage({ item }: { item: Of<'shortlist'> }) {
  return (
    <AgentTurn>
      <p className="text-md leading-relaxed text-ink">Shortlist from independent sources:</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {item.vendors.map((v) => (
          <li key={v} className="rounded-lg border border-line-strong bg-surface px-3 py-1.5 font-semibold text-ink">
            {v}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-md leading-relaxed text-ink-2">{item.note}</p>
    </AgentTurn>
  )
}

export function ConsentResult({ item }: { item: Of<'consent-result'> }) {
  return (
    <div className="flex justify-center">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent-strong">
        <UserCheck aria-hidden className="size-4" />
        {item.text}
      </span>
    </div>
  )
}

export function QuoteCard({ item }: { item: Of<'quote'> }) {
  return (
    <AgentTurn>
      <div className="rounded-xl border border-line bg-surface p-3.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{item.title}</span>
          <DoorBadge door="form" />
          <SourceBadge source="vendor" />
        </div>
        <dl className="mt-2.5 grid grid-cols-[1.5fr_0.6fr_1.1fr_1.1fr] gap-3">
          {item.lines.map((l) => (
            <div key={l.label} className="min-w-0">
              <dt className="text-sm text-muted">{l.label}</dt>
              <dd className="tnum mt-0.5 leading-snug font-semibold text-ink">{l.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-2.5">
          <CiteChip cite={item.cite} />
        </div>
      </div>
    </AgentTurn>
  )
}

export function PathsTable({ item }: { item: Of<'paths'> }) {
  return (
    <AgentTurn>
      <p className="text-md leading-relaxed text-ink">{item.intro}</p>
      <table className="mt-2.5 w-full overflow-hidden rounded-xl border border-line bg-surface text-left">
        <thead className="bg-sunken text-sm text-muted">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Path</th>
            <th scope="col" className="px-3 py-2 font-medium">Price</th>
            <th scope="col" className="px-3 py-2 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {purchasePaths.map((p) => (
            <tr key={p.id}>
              <th scope="row" className="px-3 py-2 font-semibold text-ink">{p.path}</th>
              <td className="tnum px-3 py-2 font-semibold whitespace-nowrap text-ink">{p.price}</td>
              <td className="px-3 py-2 text-ink-2">{p.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AgentTurn>
  )
}

export function DeskReply({ item }: { item: Of<'desk-reply'> }) {
  return (
    <AgentTurn>
      <p className="text-md leading-relaxed text-ink">I asked. Their desk replied:</p>
      <blockquote className="mt-2 rounded-xl border border-esc/30 bg-esc-soft/60 p-3.5">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-ink">{item.from}</span>
          <DoorBadge door="mcp" />
        </div>
        <p className="mt-1.5 text-md leading-relaxed text-ink">“{item.text}”</p>
        <div className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-esc">
          <UserRoundCog aria-hidden className="size-4" />
          Escalated to human
        </div>
      </blockquote>
    </AgentTurn>
  )
}

const toneCls: Record<CellTone, string> = {
  verified: 'text-accent-strong font-semibold',
  claimed: 'text-ink-2',
  unknown: 'text-warn',
  unverified: 'text-muted italic',
}

export function FinalAnswer({ item }: { item: Of<'final'> }) {
  return (
    <AgentTurn>
      <p className="text-md leading-relaxed text-ink">{item.intro}</p>
      <table className="mt-2.5 w-full table-fixed overflow-hidden rounded-xl border border-line bg-surface text-left text-[0.9375rem]">
        <colgroup>
          <col className="w-[31%]" />
          <col />
          <col />
          <col />
        </colgroup>
        <thead className="bg-sunken text-sm text-muted">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">
              <span className="sr-only">Requirement</span>
            </th>
            {finalComparison.vendors.map((v) => (
              <th key={v} scope="col" className="px-3 py-2 font-semibold text-ink">
                {v}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {finalComparison.rows.map((r) => (
            <tr key={r.label}>
              <th scope="row" className="px-3 py-1.5 font-medium text-ink-2">{r.label}</th>
              {r.cells.map((c, i) => (
                <td key={i} className={`tnum px-3 py-1.5 leading-snug ${toneCls[c.tone]}`}>
                  {c.text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1.5 text-sm text-muted">{finalComparisonNote}</p>
      <p className="mt-2.5 text-md leading-relaxed text-ink">{item.recommendation}</p>
    </AgentTurn>
  )
}
