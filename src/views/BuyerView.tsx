import { Bot, Play, SkipForward } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import {
  AgentMessage,
  AgentTurn,
  AskExchange,
  CheckCardHeader,
  CheckRow,
  FinalAnswer,
  ShortlistMessage,
  SiteCard,
  UserMessage,
} from '../components/ChatItems'
import { Enter } from '../components/Enter'
import { PageHeader } from '../components/PageHeader'
import { Timeline, type PlacedEntry } from '../components/Timeline'
import { agent, buyer } from '../data/config'
import { acts, steps } from '../data/story'
import type { ChatItem } from '../data/types'
import { scheduleFor } from '../lib/schedule'
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

  // Everything the agent has said and done up to the current step.
  const { chat, timeline } = useMemo(() => {
    const chat: Placed[] = []
    const timeline: PlacedEntry[] = []
    for (let i = 0; i <= step; i++) {
      const s = steps[i]
      const sched = scheduleFor(s)
      const animate = i === step && !settled
      s.chat?.forEach((item, j) => chat.push({ item, animate, delay: sched.chat[j].delay, typeMs: sched.chat[j].typeMs }))
      s.timeline?.forEach((entry, j) => timeline.push({ entry, animate, delay: sched.timeline[j] }))
    }
    return { chat, timeline }
  }, [step, settled])

  const chatRef = useStickToBottom<HTMLDivElement>(`${step}-${chat.length}`)
  const tlRef = useStickToBottom<HTMLDivElement>(`${step}-${timeline.length}`)

  const notStarted = step < firstBuyerStep

  return (
    <div className="flex h-full flex-col gap-4 px-6 pt-5 pb-4">
      <PageHeader
        eyebrow={acts[1]}
        title={`${buyer.firstName} sends an AI browser agent to find a BI tool`}
        subtitle={`The buyer: ${buyer.person}, ${buyer.title} at ${buyer.company} (${buyer.size} people, ${buyer.industry})`}
      />

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-4">
        {/* Buyer's chat with their own AI agent */}
        <section aria-label={agent.label} className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="flex items-center gap-2.5 border-b border-line px-4 py-2.5">
            <Bot aria-hidden className="size-5 text-ink-2" />
            <h2 className="font-semibold whitespace-nowrap text-ink">{agent.label}</h2>
            <span className="min-w-0 truncate text-sm text-muted">e.g. {agent.examples}</span>
          </div>

          <div ref={chatRef} className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              {notStarted ? (
                <EmptyChat onPlay={() => demo.goTo(firstBuyerStep, true)} onSkip={() => demo.goTo(lastBuyerStep)} />
              ) : (
                renderChat(chat)
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
            <h2 className="font-semibold whitespace-nowrap text-ink">Agent activity</h2>
            <span className="min-w-0 truncate text-sm text-muted">Every page and question, in order</span>
          </div>
          <div ref={tlRef} className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-4 pt-3.5">
            <div>
              {timeline.length ? (
                <Timeline entries={timeline} />
              ) : (
                <p className="pt-1 text-md text-muted">
                  Each page the agent opens and each question it asks appears here as it works.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

/** Renders chat items, merging consecutive checks with the same vendor and channel into one card. */
function renderChat(chat: Placed[]): ReactNode[] {
  const out: ReactNode[] = []
  for (let i = 0; i < chat.length; i++) {
    const p = chat[i]
    const { item } = p
    if (item.kind === 'check') {
      const group: Placed[] = [p]
      while (i + 1 < chat.length) {
        const nxt = chat[i + 1].item
        if (nxt.kind !== 'check' || nxt.vendor !== item.vendor || nxt.channel !== item.channel) break
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
        {item.kind === 'site' && <SiteCard item={item} />}
        {item.kind === 'ask' && <AskExchange item={item} />}
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
        <p className="text-lg font-semibold text-ink">{buyer.firstName} hasn't asked the agent anything yet.</p>
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
