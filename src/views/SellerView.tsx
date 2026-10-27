import {
  Bell,
  Building2,
  CircleCheck,
  CircleX,
  Database,
  EyeOff,
  Network,
  Play,
  Search,
  ServerCrash,
  SkipForward,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { KindBadge } from '../components/Badges'
import { AlertCard } from '../components/AlertCard'
import { CrmCard } from '../components/CrmCard'
import { PageHeader } from '../components/PageHeader'
import { product, seller, vendor } from '../data/config'
import { account, before, crmRecord, feedEvents, repAlert } from '../data/sellerEvents'
import { acts, firstStepOfAct, stepIndex, steps } from '../data/story'
import type { FeedEvent, SellerSection } from '../data/types'
import { useDemo } from '../presenter/useStep'

const ALL: SellerSection[] = ['feed', 'account', 'mission', 'stuck', 'alert', 'crm']

export function SellerView() {
  const demo = useDemo()
  const { step, settled, sellerMode } = demo
  const cur = steps[step]
  const prev = steps[step - 1]

  // In Act 2 sections are revealed step by step; anywhere else everything that has happened is shown.
  const shown = cur.act === 2 && cur.seller?.show ? cur.seller.show : ALL
  const prevShown = prev?.act === 2 && prev.seller?.show ? prev.seller.show : []
  const isShown = (s: SellerSection) => shown.includes(s)
  /** Newly revealed on this step: gets a brief highlight. */
  const isFresh = (s: SellerSection) => cur.act === 2 && isShown(s) && !prevShown.includes(s)

  const happened = (id: string) => stepIndex(id) <= step

  // Overlays: scripted in Act 2, toggled by buttons anywhere.
  const scriptedOverlay: 'alert' | 'crm' | null =
    cur.act === 2 && isShown('crm') ? 'crm' : cur.act === 2 && isShown('alert') ? 'alert' : null
  const [choice, setChoice] = useState<{ step: number; overlay: 'alert' | 'crm' | null } | null>(null)
  const overlay = choice?.step === step ? choice.overlay : scriptedOverlay
  const setOverlay = (o: 'alert' | 'crm' | null) => setChoice({ step, overlay: o })

  const events = useMemo(() => feedEvents.filter((e) => stepIndex(e.stepId) <= step), [step])
  const streamFeed = cur.id === 's-feed' && !settled && sellerMode === 'after'

  return (
    <div className="relative flex h-full flex-col gap-4 px-6 pt-5 pb-4">
      <PageHeader
        eyebrow={acts[2]}
        title={sellerMode === 'before' ? `Before ${product.name}` : `With ${product.name}`}
        subtitle={
          sellerMode === 'before'
            ? `The same agent visit, as ${vendor.inSentence}'s usual tools see it.`
            : `${vendor.sentenceStart}'s dashboard: every AI agent visit, live, matched to a company where possible.`
        }
        actions={<BeforeAfterToggle mode={sellerMode} onChange={demo.setSellerMode} />}
      />

      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          {sellerMode === 'before' ? (
            <motion.div
              key="before"
              className="h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
            >
              <BeforeView />
            </motion.div>
          ) : (
            <motion.div
              key="after"
              className="h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
            >
              {events.length === 0 ? (
                <EmptyAfter
                  onStart={() => demo.goTo(firstStepOfAct(1), true)}
                  onJump={() => demo.goTo(stepIndex('s-crm'))}
                />
              ) : (
                <AfterView
                  events={events}
                  streamFeed={streamFeed}
                  isShown={isShown}
                  isFresh={isFresh}
                  happened={happened}
                  newEventStep={!settled ? cur.id : null}
                  overlayButtons={
                    <div className="flex items-center gap-1.5">
                      <OverlayButton
                        label="Rep alert"
                        icon={<Bell aria-hidden className="size-4" />}
                        active={overlay === 'alert'}
                        disabled={!happened(repAlert.stepId)}
                        onClick={() => setOverlay(overlay === 'alert' ? null : 'alert')}
                      />
                      <OverlayButton
                        label="CRM record"
                        icon={<Database aria-hidden className="size-4" />}
                        active={overlay === 'crm'}
                        disabled={!happened(crmRecord.stepId)}
                        onClick={() => setOverlay(overlay === 'crm' ? null : 'crm')}
                      />
                    </div>
                  }
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overlays: the rep's notification and the CRM record */}
        <AnimatePresence>
          {sellerMode === 'after' && overlay === 'alert' && happened(repAlert.stepId) && (
            <motion.div
              key="alert"
              className="absolute top-0 right-0 z-20 w-[min(25rem,100%)]"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <AlertCard onClose={() => setOverlay(null)} />
            </motion.div>
          )}
          {sellerMode === 'after' && overlay === 'crm' && happened(crmRecord.stepId) && (
            <motion.div
              key="crm"
              className="absolute top-0 right-0 z-20 max-h-full w-[min(26rem,100%)] overflow-y-auto"
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <CrmCard
                activities={crmRecord.activities.filter((a) => happened(a.stepId)).map((a) => a.text)}
                onClose={() => setOverlay(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ---------------- Before ---------------- */

function BeforeView() {
  return (
    <div className="flex h-full flex-col gap-4 grayscale-[0.6]">
      <div className="grid grid-cols-2 gap-4">
        <section className="rounded-2xl border border-dashed border-line-strong bg-sunken p-5">
          <h2 className="flex items-center gap-2 font-semibold text-ink-2">
            <EyeOff aria-hidden className="size-4.5 text-muted" />
            Web analytics
          </h2>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="tnum text-[3.5rem] leading-none font-bold tracking-tight text-ink-2">{before.analytics.value}</span>
            <span className="text-md text-ink-2">{before.analytics.label}</span>
          </div>
          <p className="mt-2 text-md text-muted">{before.analytics.note}</p>
        </section>

        <section className="rounded-2xl border border-dashed border-line-strong bg-sunken p-5">
          <h2 className="flex items-center gap-2 font-semibold text-ink-2">
            <Search aria-hidden className="size-4.5 text-muted" />
            CRM
          </h2>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-ink-2">
            <Search aria-hidden className="size-4 text-muted" />
            {before.crm.query}
          </div>
          <p className="mt-3 text-[1.375rem] font-semibold text-ink-2">{before.crm.result}</p>
          <p className="mt-1 text-md text-muted">No account, no activity, no open questions.</p>
        </section>
      </div>

      <section className="rounded-2xl border border-dashed border-line-strong bg-sunken p-5">
        <h2 className="flex items-center gap-2 font-semibold text-ink-2">
          <ServerCrash aria-hidden className="size-4.5 text-muted" />
          Server log excerpt
        </h2>
        <pre className="scroll-quiet mt-3 overflow-x-auto rounded-lg bg-[#1d2623] p-4 font-mono text-[0.875rem] leading-relaxed text-[#c9d4d0]">
          {before.serverLog.map((l) => (
            <span key={l.time + l.request} className="block">
              <span className="text-[#8fa39c]">{l.ip}</span> [{l.time}] <span className="text-white">"{l.request}"</span> {l.status}
              {'\n'}
              <span className="text-[#8fa39c]">{'  '}signature-agent: "{before.signatureAgent}"</span>
            </span>
          ))}
        </pre>
        <p className="mt-2 text-md text-muted">{before.serverLogNote}</p>
      </section>

      <div className="grid flex-1 place-items-center px-6">
        <p className="max-w-[46rem] text-center text-[2.125rem] leading-tight font-semibold tracking-[-0.02em] text-ink">
          {before.caption}
        </p>
      </div>
    </div>
  )
}

/* ---------------- After ---------------- */

interface AfterProps {
  events: FeedEvent[]
  streamFeed: boolean
  isShown: (s: SellerSection) => boolean
  isFresh: (s: SellerSection) => boolean
  happened: (id: string) => boolean
  /** Step id whose events are arriving right now (they animate in). */
  newEventStep: string | null
  overlayButtons: ReactNode
}

function AfterView({ events, streamFeed, isShown, isFresh, happened, newEventStep, overlayButtons }: AfterProps) {
  const identified = happened(account.identifiedAt)
  const checked = account.checked.filter((c) => happened(c.stepId))
  const visitDone = happened(account.leftAt)

  return (
    <div className="grid h-full grid-cols-[19.5rem_minmax(0,1fr)] gap-4">
      <Panel shown={isShown('feed')} fresh={isFresh('feed')} title="Live agent activity" className="min-h-0">
        <Feed key={streamFeed ? 'stream' : 'static'} events={events} stream={streamFeed} newEventStep={newEventStep} />
      </Panel>

      <div className="flex min-h-0 flex-col gap-4">
        {/* Who sent the agent */}
        <Panel shown={isShown('account')} fresh={isFresh('account')} title="Who sent it" actions={overlayButtons}>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] items-center gap-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <div aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-strong">
                <Building2 className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[1.375rem] leading-tight font-semibold tracking-tight text-ink">
                  {identified ? account.company : 'Not matched yet'}
                </div>
                <div className="text-md text-muted">{account.meta}</div>
              </div>
            </div>
            <div className="min-w-0 rounded-xl bg-accent-soft/60 px-3.5 py-2">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-accent-strong">
                <Network aria-hidden className="size-4" />
                Matched by {account.match.method.toLowerCase()} · {account.match.confidence.toLowerCase()}
              </div>
              <div className="mt-0.5 text-sm leading-snug text-ink-2">{account.match.basis}</div>
            </div>
            {isShown('mission') && happened(account.value.stepId) ? (
              <div className="text-right">
                <div className="text-sm text-muted">Est. value</div>
                <div className="tnum text-[1.75rem] leading-tight font-bold tracking-tight text-ink">{account.value.text}</div>
                <div className="text-sm text-muted">{account.value.unit}</div>
              </div>
            ) : (
              <div className="w-[8rem]" aria-hidden />
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Chip>{account.agentKind}</Chip>
            <Chip>{visitDone ? '4 min 12 s on site' : 'On site now'}</Chip>
            <Chip>{visitDone ? '6 pages read' : 'Reading pages'}</Chip>
            {visitDone && <Chip>3 questions asked</Chip>}
          </div>
        </Panel>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-4">
          <Panel shown={isShown('mission')} fresh={isFresh('mission')} title="What it was looking for" className="min-h-0">
            {happened(account.mission.stepId) ? (
              <>
                <p className="text-[1.0625rem] leading-snug font-medium text-ink">{account.mission.text}</p>
                <p className="mt-1 text-sm text-muted">{account.mission.basis}</p>
              </>
            ) : (
              <p className="text-md text-muted">Still reading. A summary appears as the agent works.</p>
            )}
            <ul className="scroll-quiet -mr-2 mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-2">
              {checked.map((c) => (
                <li key={c.text} className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-2">
                  {c.found ? (
                    <CircleCheck aria-hidden className="mt-0.5 size-4.5 text-accent" />
                  ) : (
                    <CircleX aria-hidden className="mt-0.5 size-4.5 text-esc" />
                  )}
                  <span className="text-[0.9375rem] leading-snug text-ink">
                    {c.text}
                    <span className="sr-only">{c.found ? ' (found)' : ' (not found)'}</span>
                  </span>
                  <span className={`text-sm whitespace-nowrap ${c.found ? 'text-muted' : 'font-semibold text-esc'}`}>{c.note}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel shown={isShown('stuck')} fresh={isFresh('stuck')} title="Where it got stuck" className="min-h-0">
            {happened(account.stuck.stepId) ? (
              <>
                <div className="flex items-start gap-2">
                  <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-esc" />
                  <p className="text-[1.0625rem] leading-snug font-semibold text-ink">{account.stuck.text}</p>
                </div>
                <p className="mt-1 text-[0.9375rem] leading-snug text-ink-2">{account.stuck.detail}</p>
                <div className="mt-3 rounded-xl border border-accent/30 bg-accent-soft/70 p-3">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-accent-strong">
                    <Sparkles aria-hidden className="size-4" />
                    Next step for {seller.firstName} (sales rep)
                  </div>
                  <p className="mt-1 text-[0.9375rem] leading-snug font-medium text-ink">{account.nextBestAction.text}</p>
                </div>
              </>
            ) : (
              <p className="text-md text-muted">Nothing yet.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-md border border-line bg-sunken px-2 py-0.5 text-ink-2">{children}</span>
}

function Panel({
  title,
  shown,
  fresh,
  className = '',
  actions,
  children,
}: {
  title: string
  shown: boolean
  fresh: boolean
  className?: string
  actions?: ReactNode
  children: ReactNode
}) {
  if (!shown) {
    return (
      <section aria-hidden className={`rounded-2xl border border-dashed border-line-strong/80 p-4 ${className}`}>
        <h2 className="text-sm font-medium text-muted/70">{title}</h2>
      </section>
    )
  }
  return (
    <section
      aria-label={title}
      className={`flex flex-col rounded-2xl border bg-surface p-4 transition-shadow duration-300 ${
        fresh ? 'animate-pop border-accent/50 shadow-[0_0_0_4px_rgba(15,107,87,0.12)]' : 'border-line'
      } ${className}`}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <h2 className="text-sm font-medium text-muted">{title}</h2>
        {actions && <div className="ml-auto">{actions}</div>}
      </div>
      {children}
    </section>
  )
}

const FEED_STAGGER_MS = 220

function Feed({ events, stream, newEventStep }: { events: FeedEvent[]; stream: boolean; newEventStep: string | null }) {
  // While streaming, events arrive one by one. The parent remounts this component when streaming
  // starts or stops, so the counter always begins at zero.
  const [arrived, setArrived] = useState(0)

  useEffect(() => {
    if (!stream) return
    let n = 0
    const id = window.setInterval(() => {
      n += 1
      setArrived(n)
      if (n >= events.length) window.clearInterval(id)
    }, FEED_STAGGER_MS)
    return () => window.clearInterval(id)
  }, [stream, events.length])

  const count = stream ? arrived : events.length

  // Newest first, like any live feed.
  const visible = events.slice(0, count).reverse()

  return (
    <div className="scroll-quiet -mx-1 min-h-0 flex-1 overflow-y-auto px-1">
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {visible.map((e) => {
            const arriving = stream || e.stepId === newEventStep
            return (
              <motion.li
                key={e.id}
                layout
                initial={arriving ? { opacity: 0, y: -10 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`rounded-xl border p-2.5 ${
                  e.kind === 'escalation'
                    ? 'border-esc/30 bg-esc-soft/50'
                    : e.kind === 'identity'
                      ? 'border-accent/30 bg-accent-soft/50'
                      : 'border-line bg-surface'
                }`}
              >
                <div className="flex items-center gap-2">
                  <KindBadge kind={e.kind} />
                  <span className="tnum ml-auto text-sm text-muted">{e.time}</span>
                </div>
                <div className="mt-1 text-[0.9375rem] leading-snug font-medium text-ink">{e.text}</div>
                {e.detail && <div className="mt-0.5 text-sm leading-snug text-muted">{e.detail}</div>}
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </div>
  )
}

function BeforeAfterToggle({ mode, onChange }: { mode: 'before' | 'after'; onChange: (m: 'before' | 'after') => void }) {
  const opt = (m: 'before' | 'after', label: string) => (
    <button
      type="button"
      aria-pressed={mode === m}
      onClick={(e) => {
        if (e.detail > 0) e.currentTarget.blur()
        onChange(m)
      }}
      className={`rounded-lg px-3.5 py-1.5 text-[0.9375rem] font-semibold transition-colors ${
        mode === m ? (m === 'after' ? 'bg-accent text-white shadow-sm' : 'bg-ink-2 text-white shadow-sm') : 'text-ink-2 hover:bg-surface'
      }`}
    >
      {label}
    </button>
  )
  return (
    <div role="group" aria-label={`Before or after ${product.name} (key B)`} className="flex rounded-xl border border-line-strong bg-sunken p-1">
      {opt('before', `Before ${product.name}`)}
      {opt('after', 'After')}
    </div>
  )
}

function OverlayButton({
  label,
  icon,
  active,
  disabled,
  onClick,
}: {
  label: string
  icon: ReactNode
  active: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={(e) => {
        if (e.detail > 0) e.currentTarget.blur()
        onClick()
      }}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-medium transition-colors disabled:opacity-40 ${
        active ? 'border-accent bg-accent-soft text-accent-strong' : 'border-line-strong text-ink-2 hover:bg-surface'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function EmptyAfter({ onStart, onJump }: { onStart: () => void; onJump: () => void }) {
  return (
    <div className="grid h-full place-items-center rounded-2xl border border-dashed border-line-strong">
      <div className="max-w-xl text-center">
        <p className="text-lg font-semibold text-ink">No agent visits yet.</p>
        <p className="mt-1 text-md text-muted">
          When an AI agent visits {vendor.inSentence}'s website, it shows up here as it happens: who sent it, what it read and where it got stuck.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" onClick={onStart} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent-strong">
            <Play aria-hidden className="size-4" />
            Start the buyer's story
          </button>
          <button type="button" onClick={onJump} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-line-strong px-4 py-2 font-medium text-ink-2 hover:bg-sunken">
            <SkipForward aria-hidden className="size-4" />
            Show what {vendor.inSentence} sees
          </button>
        </div>
      </div>
    </div>
  )
}
