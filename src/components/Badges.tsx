import {
  AlertTriangle,
  Building2,
  CircleCheck,
  CircleHelp,
  DoorOpen,
  FileText,
  Globe,
  ListChecks,
  Lock,
  MessageCircleQuestion,
  Plug,
  Radar,
  UserRoundCog,
  Users,
} from 'lucide-react'
import type { Channel, FeedKind, Source, Status } from '../data/types'

const channelStyle: Record<Channel, { label: string; Icon: typeof Globe; cls: string }> = {
  page: { label: 'Web page', Icon: FileText, cls: 'bg-web-soft text-web' },
  facts: { label: 'Facts panel', Icon: ListChecks, cls: 'bg-form-soft text-form' },
  ask: { label: 'Ask box', Icon: MessageCircleQuestion, cls: 'bg-ask-soft text-ask' },
  mcp: { label: 'MCP', Icon: Plug, cls: 'bg-mcp-soft text-mcp' },
}

const kindStyle: Record<FeedKind, { label: string; Icon: typeof Globe; cls: string }> = {
  ...channelStyle,
  detected: { label: 'Agent spotted', Icon: Radar, cls: 'bg-ink-2 text-white' },
  identity: { label: 'Company', Icon: Building2, cls: 'bg-accent-soft text-accent-strong' },
  escalation: { label: 'To a person', Icon: UserRoundCog, cls: 'bg-esc-soft text-esc' },
  left: { label: 'Left', Icon: DoorOpen, cls: 'bg-sunken text-ink-2' },
}

const chip =
  'inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold leading-tight whitespace-nowrap'

/** How the agent got something: a page, the facts panel, the ask box or MCP. */
export function ChannelBadge({ channel }: { channel: Channel }) {
  const { label, Icon, cls } = channelStyle[channel]
  return (
    <span className={`${chip} ${cls}`}>
      <Icon aria-hidden className="size-3.5" strokeWidth={2.25} />
      {label}
    </span>
  )
}

/** Feed event type on the vendor side. */
export function KindBadge({ kind }: { kind: FeedKind }) {
  const { label, Icon, cls } = kindStyle[kind]
  return (
    <span className={`${chip} ${cls}`}>
      <Icon aria-hidden className="size-3.5" strokeWidth={2.25} />
      {label}
    </span>
  )
}

/** Who published what the agent read. Outlined so it never reads as a channel. */
export function SourceBadge({ source }: { source: Source }) {
  const independent = source === 'independent'
  const Icon = independent ? Users : Building2
  return (
    <span
      className={`${chip} border font-medium ${
        independent ? 'border-line-strong text-ink-2' : 'border-dashed border-line-strong text-muted'
      }`}
    >
      <Icon aria-hidden className="size-3.5" strokeWidth={2} />
      {independent ? 'Independent' : 'Own site'}
    </span>
  )
}

const statusStyle: Record<Status, { Icon: typeof Globe; cls: string; fallback: string }> = {
  ok: { Icon: CircleCheck, cls: 'text-accent', fallback: 'Verified' },
  gated: { Icon: Lock, cls: 'text-ink-2', fallback: 'Gated' },
  warn: { Icon: AlertTriangle, cls: 'text-warn', fallback: 'Unavailable' },
  unverified: { Icon: CircleHelp, cls: 'text-muted', fallback: 'Unverified' },
  escalated: { Icon: UserRoundCog, cls: 'text-esc', fallback: 'Sent to a person' },
}

/** Outcome of a step: plain icon + colored text, no fill. */
export function StatusLabel({ status, label }: { status: Status; label?: string }) {
  const { Icon, cls, fallback } = statusStyle[status]
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold whitespace-nowrap ${cls}`}>
      <Icon aria-hidden className="size-4" strokeWidth={2.25} />
      {label ?? fallback}
    </span>
  )
}
