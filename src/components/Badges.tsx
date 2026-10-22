import {
  AlertTriangle,
  Building2,
  CircleCheck,
  CircleHelp,
  ClipboardList,
  Globe,
  Lock,
  Plug,
  UserCheck,
  UserRoundCog,
  Users,
} from 'lucide-react'
import type { Door, FeedKind, Source, Status } from '../data/types'

const doorStyle: Record<Door, { label: string; Icon: typeof Globe; cls: string }> = {
  website: { label: 'Website', Icon: Globe, cls: 'bg-web-soft text-web' },
  form: { label: 'Form', Icon: ClipboardList, cls: 'bg-form-soft text-form' },
  mcp: { label: 'MCP', Icon: Plug, cls: 'bg-mcp-soft text-mcp' },
}

const kindStyle: Record<FeedKind, { label: string; Icon: typeof Globe; cls: string }> = {
  ...doorStyle,
  identity: { label: 'Identity', Icon: UserCheck, cls: 'bg-accent-soft text-accent-strong' },
  escalation: { label: 'Escalation', Icon: UserRoundCog, cls: 'bg-esc-soft text-esc' },
}

const chip =
  'inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold leading-tight whitespace-nowrap'

/** How the agent reached the information: one of the three doors. */
export function DoorBadge({ door }: { door: Door }) {
  const { label, Icon, cls } = doorStyle[door]
  return (
    <span className={`${chip} ${cls}`}>
      <Icon aria-hidden className="size-3.5" strokeWidth={2.25} />
      {label}
    </span>
  )
}

/** Feed event type on the seller side: a door, or an identity / escalation event. */
export function KindBadge({ kind }: { kind: FeedKind }) {
  const { label, Icon, cls } = kindStyle[kind]
  return (
    <span className={`${chip} ${cls}`}>
      <Icon aria-hidden className="size-3.5" strokeWidth={2.25} />
      {label}
    </span>
  )
}

/** Who published what the agent read. Outlined so it never reads as a door. */
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
      {independent ? 'Independent' : 'Vendor'}
    </span>
  )
}

const statusStyle: Record<Status, { Icon: typeof Globe; cls: string; fallback: string }> = {
  ok: { Icon: CircleCheck, cls: 'text-accent', fallback: 'Verified' },
  gated: { Icon: Lock, cls: 'text-ink-2', fallback: 'Gated' },
  warn: { Icon: AlertTriangle, cls: 'text-warn', fallback: 'Unavailable' },
  unverified: { Icon: CircleHelp, cls: 'text-muted', fallback: 'Unverified' },
  escalated: { Icon: UserRoundCog, cls: 'text-esc', fallback: 'Escalated to human' },
  identity: { Icon: UserCheck, cls: 'text-accent-strong', fallback: 'Identity' },
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
