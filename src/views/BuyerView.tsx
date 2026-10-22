import { Bot, Play, SkipForward } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AgentMessage,
  AgentTurn,
  CheckCardHeader,
  CheckRow,
  ConsentResult,
  DeskReply,
  FinalAnswer,
  PathsTable,
  QuoteCard,
  ShortlistMessage,
  UserMessage,
} from '../components/ChatItems'
import { ConsentDialog } from '../components/ConsentDialog'
import { Enter } from '../components/Enter'
import { PageHeader } from '../components/PageHeader'
import { StageTracker } from '../components/StageTracker'
import { Timeline, type PlacedEntry } from '../components/Timeline'
import { agent, buyer, product, vendor } from '../data/config'
import { acts, steps } from '../data/story'
import type { ChatItem, StageId } from '../data/types'
import { CONSENT_CONFIRM_MS, scheduleFor } from '../lib/schedule'
import { useStickToBottom } from '../lib/useStickToBottom'
import { useDemo } from '../presenter/useStep'

interface Placed {
  item: ChatItem
  animate: boolean
  delay: number
  typeMs: number
}

const firstBuyerStep = steps.findIndex((s) => s.act === 1)
const lastBuyerStep = steps.findLastIndex((s) => s.act === 1)

export function BuyerView() {
  const demo = useDemo()
  const { step, settled } = demo
  const cur = steps[step]

  // Everything the agent has said and done up to the current step.
  const { chat, timeline, stage } = useMemo(() => {
    const chat: Placed[] = []
    const timeline: PlacedEntry[] = []
    let stage: StageId | null = null
    for (let i = 0; i <= step; i++) {
      const s = steps[i]
      const sched = scheduleFor(s)
      const animate = i === step && !settled
      s.chat?.forEach((item, j) => chat.push({ item, animate, delay: sched.chat[j].delay, typeMs: sched.chat[j].typeMs }))
      s.timeline?.forEach((entry, j) => timeline.push({ entry, animate, delay: sched.timeline[j] }))
      if (s.stage) stage = s.stage
    }
    return { chat, timeline, stage }
  }, [step, settled])

  // Consent dialog: open on the "ask" step; on the "shared" step it shows Share pressed, then closes.
  // Both flags remember the step they belong to, so they reset on their own when the step changes.
  const [declinedAt, setDeclinedAt] = useState<number | null>(null)
  const [confirmedAt, setConfirmedAt] = useState<number | null>(null)
  const declined = declinedAt === step
  const confirming = cur.consent === 'shared' && !settled && confirmedAt !== step
  useEffect(() => {
    if (cur.consent !== 'shared' || settled) return
    const t = window.setTimeout(() => setConfirmedAt(step), CONSENT_CONFIRM_MS - 120)
    return () => window.clearTimeout(t)
  }, [step, settled, cur.consent])

  const dialogOpen = (cur.consent === 'ask' && !declined) || (cur.consent === 'shared' && confirming)
  const shareNow = () => demo.goTo(step + 1, true)

  const chatRef = useStickToBottom<HTMLDivElement>(`${step}-${chat.length}`)
  const tlRef = useStickToBottom<HTMLDivElement>(`${step}-${timeline.length}`)

  const notStarted = step < firstBuyerStep

  return (
    <div className="flex h-full flex-col gap-4 px-6 pt-5 pb-4">
      <PageHeader
        eyebrow={acts[1]}
        title={`${buyer.firstName} asks her AI agent to find a BI tool`}
        subtitle={`${buyer.person}, ${buyer.title} at ${buyer.company} (${buyer.size} people, ${buyer.industry})`}
      />
      <StageTracker current={stage} />

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-4">
        {/* Buyer's chat with their own AI agent */}
        <section aria-label={agent.label} className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="flex items-center gap-2.5 border-b border-line px-4 py-2.5">
            <Bot aria-hidden className="size-5 text-ink-2" />
            <h2 className="font-semibold text-ink">{agent.label}</h2>
            <span className="text-sm text-muted">Any assistant, e.g. {agent.examples}</span>
          </div>

          <div ref={chatRef} className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              {notStarted ? (
                <EmptyChat onPlay={() => demo.goTo(firstBuyerStep, true)} onSkip={() => demo.goTo(lastBuyerStep)} />
              ) : (
                renderChat(chat)
              )}
              <ConsentDialog open={dialogOpen} confirmed={cur.consent === 'shared'} onShare={shareNow} onNotNow={() => setDeclinedAt(step)} />
              {cur.consent === 'ask' && declined && (
                <AgentTurn>
                  <p className="text-md leading-relaxed text-ink">
                    Okay, I haven't shared anything. Without your email, {vendor.name} can only show public list prices.
                  </p>
                  <button
                    type="button"
                    onClick={shareNow}
                    className="mt-2 rounded-lg border border-accent px-3 py-1.5 font-medium text-accent-strong hover:bg-accent-soft"
                  >
                    Share my email after all
                  </button>
                </AgentTurn>
              )}
            </div>
          </div>

          <div className="border-t border-line px-4 py-3">
            <div aria-hidden className="rounded-xl border border-line bg-sunken px-3.5 py-2 text-muted">
              Message your agent…
            </div>
          </div>

        </section>

        {/* What the agent did, step by step */}
        <section aria-label="Agent activity" className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="flex items-baseline gap-2 border-b border-line px-4 py-2.5">
            <h2 className="font-semibold text-ink">Agent activity</h2>
            <span className="text-sm text-muted">Every page, form and question, in order</span>
          </div>
          <div ref={tlRef} className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-4 pt-3.5">
            <div>
              {timeline.length ? (
                <Timeline entries={timeline} />
              ) : (
                <p className="pt-1 text-md text-muted">
                  Each page read, form and MCP question appears here as the agent works. {product.mcpExplainer}
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

/** Renders chat items, merging consecutive checks with the same vendor into one card. */
function renderChat(chat: Placed[]): ReactNode[] {
  const out: ReactNode[] = []
  for (let i = 0; i < chat.length; i++) {
    const p = chat[i]
    const { item } = p
    if (item.kind === 'check') {
      const group: Placed[] = [p]
      while (i + 1 < chat.length) {
        const nxt = chat[i + 1].item
        if (nxt.kind !== 'check' || nxt.vendor !== item.vendor) break
        group.push(chat[++i])
      }
      out.push(
        <Enter key={item.id} animate={p.animate} delay={p.delay}>
          <AgentTurn>
            <div className="rounded-xl border border-line bg-surface px-3.5 pt-2.5 pb-1">
              <CheckCardHeader item={item} />
              <div className="divide-y divide-line">
                {group.map((g) =>
                  g.item.kind === 'check' ? (
                    <Enter key={g.item.id} animate={g.animate} delay={g.delay}>
                      <CheckRow item={g.item} />
                    </Enter>
                  ) : null,
                )}
              </div>
            </div>
          </AgentTurn>
        </Enter>,
      )
      continue
    }
    out.push(
      <Enter key={item.id} animate={p.animate && item.kind !== 'user'} delay={p.delay}>
        {item.kind === 'user' && <UserMessage item={item} typing={p.animate} delay={p.delay} />}
        {item.kind === 'agent' && <AgentMessage item={item} />}
        {item.kind === 'shortlist' && <ShortlistMessage item={item} />}
        {item.kind === 'consent-result' && <ConsentResult item={item} />}
        {item.kind === 'quote' && <QuoteCard item={item} />}
        {item.kind === 'paths' && <PathsTable item={item} />}
        {item.kind === 'desk-reply' && <DeskReply item={item} />}
        {item.kind === 'final' && <FinalAnswer item={item} />}
      </Enter>,
    )
  }
  return out
}

function EmptyChat({ onPlay, onSkip }: { onPlay: () => void; onSkip: () => void }) {
  return (
    <div className="grid place-items-center py-16 text-center">
      <div className="max-w-xl">
        <p className="text-lg font-semibold text-ink">{buyer.firstName} hasn't asked her agent anything yet.</p>
        <p className="mt-1 text-md text-muted">Press → to start the story, or jump straight to the end of it.</p>
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" onClick={onPlay} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent-strong">
            <Play aria-hidden className="size-4" />
            Start the buyer's story
          </button>
          <button type="button" onClick={onSkip} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-line-strong px-4 py-2 font-medium text-ink-2 hover:bg-sunken">
            <SkipForward aria-hidden className="size-4" />
            Show the full conversation
          </button>
        </div>
      </div>
    </div>
  )
}
