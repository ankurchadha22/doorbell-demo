import { Bot, FileText, Info, ListChecks, MessageCircleQuestion, Plug, Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { buyer, product, vendor } from '../data/config'
import { finalComparison, finalComparisonNote, type CellTone } from '../data/buyerScript'
import { factsPanel, pricing } from '../data/policies'
import type { ChatItem, Citation } from '../data/types'
import { ChannelBadge, SourceBadge, StatusLabel } from './Badges'
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

const channelNote: Record<Of<'check'>['channel'], string> = {
  page: 'Read on their website',
  facts: 'From the facts panel on their site',
  ask: 'From the ask box on their site',
  mcp: 'Over MCP, on the roadmap',
}

/** One question checked with a vendor. Rows from the same vendor render inside one card. */
export function CheckRow({ item }: { item: Of<'check'> }) {
  return (
    <div className="py-2.5">
      <div className="text-sm text-muted">Checked: {item.question}</div>
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
      <ChannelBadge channel={item.channel} />
      <SourceBadge source={item.source} />
      <span className="ml-auto text-sm text-muted">{channelNote[item.channel]}</span>
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

/** The seller's pricing page as the agent sees it: an ordinary page plus Doorbell's visible
 *  facts panel and ask box. Everything here is on the page for people too. */
export function SiteCard({ item }: { item: Of<'site'> }) {
  const plans = pricing.plans.map((p) => ({ name: p.name, price: p.seatPrice ? `$${p.seatPrice}` : 'Custom' }))
  return (
    <AgentTurn>
      <figure aria-label={`${vendor.sentenceStart}'s pricing page, as the agent sees it`} className="overflow-hidden rounded-xl border border-line-strong bg-surface">
        <div className="flex items-center gap-2 border-b border-line bg-sunken px-3 py-1.5">
          <span aria-hidden className="flex gap-1">
            <span className="size-2 rounded-full bg-line-strong" />
            <span className="size-2 rounded-full bg-line-strong" />
            <span className="size-2 rounded-full bg-line-strong" />
          </span>
          <span className="min-w-0 flex-1 truncate rounded-md bg-surface px-2 py-0.5 font-mono text-xs text-ink-2">{item.url}</span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-3 p-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink">Pricing</div>
            <ul className="mt-1.5 space-y-1.5">
              {plans.map((p) => (
                <li key={p.name} className="flex items-baseline justify-between rounded-md border border-line px-2 py-1 text-sm">
                  <span className="text-ink-2">{p.name}</span>
                  <span className="tnum font-semibold text-ink">{p.price}</span>
                </li>
              ))}
            </ul>
            <div className="mt-1.5 rounded-md bg-sunken px-2 py-1 text-xs text-muted">Contact us · Docs · Trust center</div>
          </div>
          <div className="min-w-0 rounded-lg border-2 border-form/30 bg-form-soft/40 p-2.5">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-form">
              <ListChecks aria-hidden className="size-4" />
              Facts for AI assistants
            </div>
            <dl className="mt-1.5 space-y-0.5 text-xs leading-snug">
              {factsPanel.map((f) => (
                <div key={f.topic} className="flex gap-1.5">
                  <dt className="shrink-0 font-semibold text-ink">{f.topic}:</dt>
                  <dd className="min-w-0 text-ink-2">{f.text}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-2 flex items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2 py-1 text-xs text-muted">
              <Search aria-hidden className="size-3" />
              Ask a question…
            </div>
            <div className="mt-1.5 flex items-start gap-1 text-xs leading-snug text-mcp">
              <Plug aria-hidden className="mt-px size-3 shrink-0" />
              <span>
                Deeper or gated questions? Connect over MCP: <span className="font-mono">{vendor.mcpUrl}</span>
              </span>
            </div>
            <div className="mt-1 text-right text-[0.6875rem] text-muted">by {product.name}</div>
          </div>
        </div>
      </figure>
    </AgentTurn>
  )
}

/** A question the agent typed into Doorbell's ask box, and the reply. */
export function AskExchange({ item }: { item: Of<'ask'> }) {
  return (
    <AgentTurn>
      <div className="rounded-xl border border-ask/25 bg-surface p-3.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink">{vendor.name}</span>
          <ChannelBadge channel="ask" />
          <span className="ml-auto text-sm text-muted">On their website, by {product.name}</span>
        </div>
        <div className="mt-2.5 flex items-start gap-2">
          <MessageCircleQuestion aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
          <p className="text-md font-medium text-ink">“{item.question}”</p>
        </div>
        <blockquote className="mt-2 rounded-lg bg-ask-soft/60 px-3 py-2 text-md leading-relaxed text-ink">“{item.reply}”</blockquote>
        <div className="mt-2">
          <StatusLabel status={item.status} label={item.statusLabel} />
        </div>
      </div>
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
