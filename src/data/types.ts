// Shared types for the scripted story. Screens read data only through these shapes.

export type Screen = 'title' | 'buyer' | 'seller' | 'insights' | 'policies' | 'setup' | 'closing'

/** The three ways an agent reaches the desk (plus how it reads any other web page). */
export type Door = 'website' | 'form' | 'mcp'

/** Who published the information the agent read. */
export type Source = 'independent' | 'vendor'

export type StageId = 'explore' | 'compare' | 'shortlist' | 'quote' | 'how-to-buy' | 'negotiate'

export type Status = 'ok' | 'warn' | 'unverified' | 'escalated' | 'identity' | 'gated'

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
      door: Door
      source: Source
      question: string
      answer: string
      status: Status
      statusLabel?: string
      cite?: Citation
    }
  | { kind: 'shortlist'; id: string; vendors: string[]; note: string }
  | { kind: 'consent-result'; id: string; text: string }
  | { kind: 'quote'; id: string; title: string; lines: { label: string; value: string }[]; cite: Citation }
  | { kind: 'paths'; id: string; intro: string }
  | { kind: 'desk-reply'; id: string; from: string; text: string }
  | { kind: 'final'; id: string; intro: string; recommendation: string }

export interface TimelineEntry {
  id: string
  /** Elapsed time in the agent's session, e.g. "0:12". */
  at: string
  title: string
  detail?: string
  door?: Door
  source?: Source
  status?: Status
  statusLabel?: string
}

/* ---------- Seller side ---------- */

export type SellerSection = 'feed' | 'account' | 'questions' | 'next-action' | 'alert' | 'crm'

export type FeedKind = Door | 'identity' | 'escalation'

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
  /** Buyer's current buying stage (buyer view). */
  stage?: StageId
  chat?: ChatItem[]
  timeline?: TimelineEntry[]
  /** Consent dialog state on the buyer side. */
  consent?: 'ask' | 'shared'
  /** Seller view settings. Steps without this show the After view with everything that has happened. */
  seller?: { mode: 'before' | 'after'; show?: SellerSection[] }
  /** Optional spotlight target on Act 3 screens. */
  spotlight?: string
}
