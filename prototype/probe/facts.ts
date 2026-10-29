// The test vendor's approved facts, and the ask box's rule-based answers (no AI model in Step 0).
// Prices and facts match src/data/policies.ts, so the probe site and the demo tell the same story.

export const vendorName = 'Vendor'
export const reviewedOn = '29 Oct 2026'

export interface Fact {
  id: string
  topic: string
  /** The short line shown in the facts panel. */
  short: string
  /** The full answer the ask box gives. */
  answer: string
  source: string
  match: RegExp
}

export const facts: Fact[] = [
  {
    id: 'pricing',
    topic: 'Plans',
    short: 'Starter $20, Growth $40 per user / month. Enterprise: contact sales.',
    answer: 'Starter is $20 and Growth is $40 per user per month. Embedding adds $400 per month on Growth. Annual billing is 10% off.',
    source: '/pricing',
    match: /\b(price|prices|pricing|priced|cost|costs|how much|per user|seats?|plans?|annual|yearly)\b/i,
  },
  {
    id: 'embedding',
    topic: 'Embedding',
    short: 'Growth plan, +$400 / month. Each customer sees only their own data.',
    answer: 'Embedded dashboards are on the Growth plan, for $400 per month. Each of your customers sees only their own data.',
    source: '/docs/embedding',
    match: /embed|white.?label|each customer|own data|multi.?tenant|tenant/i,
  },
  {
    id: 'integrations',
    topic: 'Integrations',
    short: 'Stripe and QuickBooks connect directly, on every plan.',
    answer: 'Stripe and QuickBooks connect directly, on every plan.',
    source: '/docs/connectors',
    match: /stripe|quickbooks|integrat|connector|connects?\b/i,
  },
  {
    id: 'security',
    topic: 'Security',
    short: 'SOC 2 Type II. The report is shared under NDA.',
    answer: 'Vendor is SOC 2 Type II certified. The report is shared under NDA.',
    source: '/trust',
    match: /soc ?2|security|compliance|audit|pen(etration)? ?test/i,
  },
]

/** Questions that always go to a person, even when a fact matches. */
const alwaysEscalate = /discount|cheaper|negotiat|custom (terms|sla|contract)|unlimited|\bsla\b/i
/** The published annual discount is an approved fact, so it isn't escalated. */
const publishedDiscount = /\b(annual|yearly)\b/i

export const escalationText =
  "I don't have an approved answer to that yet. I've passed your question to a person on the sales team."

export type AskResult =
  | { decision: 'answer'; text: string; facts: Fact[] }
  | { decision: 'escalate'; text: string; facts: [] }
  | { decision: 'empty'; text: string; facts: [] }

export function answer(question: string): AskResult {
  const q = question.trim()
  if (!q) return { decision: 'empty', text: 'Type a question first.', facts: [] }
  if (alwaysEscalate.test(q) && !publishedDiscount.test(q)) return { decision: 'escalate', text: escalationText, facts: [] }
  const matched = facts.filter((f) => f.match.test(q))
  if (!matched.length) return { decision: 'escalate', text: escalationText, facts: [] }
  return { decision: 'answer', text: matched.map((f) => f.answer).join(' '), facts: matched }
}
