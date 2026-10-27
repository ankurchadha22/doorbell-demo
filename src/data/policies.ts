// The seller's prices and the rules that limit what Doorbell may tell agents.
// The buyer script, the seller view and the Policies page all read from here.

import { buyer, vendor } from './config'

export const pricing = {
  currency: 'USD',
  plans: [
    { id: 'starter', name: 'Starter', seatPrice: 20 },
    { id: 'growth', name: 'Growth', seatPrice: 40 },
    { id: 'enterprise', name: 'Enterprise', seatPrice: null },
  ],
  /** Embedding add-on for the Growth plan, per month. */
  embeddingAddOn: 400,
  annualDiscount: 0.1,
}

const growth = pricing.plans[1]
const seats = buyer.size

/** What the agent priced on the seller's site: Growth plan, 40 users, with embedding. */
export const estimate = {
  plan: growth.name,
  seats,
  monthly: growth.seatPrice! * seats + pricing.embeddingAddOn,
  get annual() {
    return Math.round(this.monthly * 12 * (1 - pricing.annualDiscount))
  },
}

export const money = (n: number) =>
  '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })

/* ---------- Policies page ---------- */

/** What the facts panel and ask box may say, each tied to the vendor's own source. */
export const approvedFacts = [
  {
    topic: 'Pricing',
    answer: `Starter ${money(20)}, Growth ${money(40)} per user / mo. Embedding +${money(pricing.embeddingAddOn)} / mo. ${pricing.annualDiscount * 100}% off annual.`,
    source: `${vendor.site}/pricing`,
  },
  { topic: 'Integrations', answer: 'Stripe and QuickBooks connect directly, on every plan.', source: `${vendor.docs}/connectors` },
  { topic: 'Embedding', answer: 'Growth plan. Each customer sees only their own data.', source: `${vendor.docs}/embedding` },
  { topic: 'Security', answer: 'SOC 2 Type II. The report is shared under NDA.', source: `${vendor.site}/trust` },
]

/** The short version shown in the "Facts for AI assistants" panel on the seller's site. */
export const factsPanel = [
  { topic: 'Plans', text: `Starter ${money(20)}, Growth ${money(40)} per user / mo` },
  { topic: 'Embedding', text: `Growth plan, +${money(pricing.embeddingAddOn)} / mo` },
  { topic: 'Integrations', text: 'Stripe, QuickBooks' },
  { topic: 'Security', text: 'SOC 2 Type II, report under NDA' },
]

export const alwaysEscalate = [
  'Any question without an approved answer',
  'Discounts beyond the published annual discount',
  'Non-standard terms (for example unlimited usage or custom SLAs)',
  'Custom security addenda',
]

export const answerRules = [
  'Answer only from approved facts, and cite the source.',
  'Everything agents see is visible to people too. No hidden instructions.',
  'If unsure, say so and pass the question to a person.',
  'Never compare against named competitors.',
  'Never promise roadmap features or dates.',
]

export const escalationOwner = {
  team: `${vendor.name} sales`,
  replyWithin: 'one business day',
}
