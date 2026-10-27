// Shared types for the scripted story. Screens read data only through these shapes.

export type Screen = 'title' | 'buyer' | 'seller' | 'insights' | 'policies' | 'setup' | 'closing'

/** How the agent got something from a vendor: an ordinary page, Doorbell's facts panel, its ask box or an MCP connection. */
export type Channel = 'page' | 'facts' | 'ask' | 'mcp'

/** Who published the information the agent read. */
export type Source = 'independent' | 'vendor'

export type Status = 'ok' | 'warn' | 'unverified' | 'escalated' | 'gated'

export interface Citation {
  label: string
  url: string
}

/* ---------- Buyer side ---------- */

export type ChatItem =
  | { kind: 'user'; id: string; text: string; typed?: boolean }
  | { kind: 'agent'; id: string; text: string; note?: string }
  | {
      kind: 'check'
      id: string
      vendor: string
      channel: Channel
      source: Source
      question: string
      answer: string
      status: Status
      statusLabel?: string
      cite?: Citation
    }
  | { kind: 'shortlist'; id: string; vendors: string[]; note: string }
  /** The vendor's page as the agent sees it, with Doorbell's facts panel and ask box. */
  | { kind: 'site'; id: string; url: string }
  /** A question typed into Doorbell's ask box, and its reply. */
  | { kind: 'ask'; id: string; question: string; reply: string; status: Status; statusLabel: string }
  | { kind: 'final'; id: string; intro: string; recommendation: string }

export interface TimelineEntry {
  id: string
  /** Elapsed time in the agent's session, e.g. "0:12". */
  at: string
  title: string
  detail?: string
  channel?: Channel
  source?: Source
  status?: Status
  statusLabel?: string
}

/* ---------- Vendor side ---------- */

export type SellerSection = 'feed' | 'account' | 'mission' | 'stuck' | 'alert' | 'crm'

export type FeedKind = Channel | 'detected' | 'identity' | 'escalation' | 'left'

export interface FeedEvent {
  id: string
  /** The story step at which this event happens. */
  stepId: string
  time: string
  kind: FeedKind
  text: string
  detail?: string
}

/* ---------- The ordered script ---------- */

export interface Step {
  id: string
  act: 0 | 1 | 2 | 3 | 4
  screen: Screen
  /** Short label shown in the presenter bar. */
  label: string
  /** How long auto-play stays on this step. */
  dwellMs: number
  /** Minimum entrance-animation time, for steps whose animation is not derived from chat or timeline. */
  animMs?: number
  chat?: ChatItem[]
  timeline?: TimelineEntry[]
  /** Vendor view settings. Steps without this show the After view with everything that has happened. */
  seller?: { mode: 'before' | 'after'; show?: SellerSection[] }
  /** Optional spotlight target on Act 3 screens. */
  spotlight?: string
}
