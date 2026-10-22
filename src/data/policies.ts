// The seller's prices and the rules that limit what the desk may say or commit to.
// The buyer script, the seller view and the Policies page all read from here.

import { buyer, vendor } from './config'

export const pricing = {
  currency: 'USD',
  plans: [
    {
      id: 'starter',
      name: 'Starter',
      seatPrice: 20,
      note: 'Dashboards and live connections. No embedding.',
    },
    {
      id: 'growth',
      name: 'Growth',
      seatPrice: 40,
      note: 'Adds embedded dashboards. Each of your customers sees only their own data.',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      seatPrice: null,
      note: 'Custom terms. Quoted by a person.',
    },
  ],
  /** Embedding add-on for the Growth plan, per month. */
  embeddingAddOn: 400,
  annualDiscount: 0.1,
}

const growth = pricing.plans[1]
const seats = buyer.size

/** The quote Tidewater Labs receives: Growth plan, 40 users, with embedding. */
export const quote = {
  id: 'Q-2026-1042',
  plan: growth.name,
  seats,
  monthly: growth.seatPrice! * seats + pricing.embeddingAddOn,
  get annualList() {
    return this.monthly * 12
  },
  get annual() {
    return Math.round(this.annualList * (1 - pricing.annualDiscount))
  },
  get threeYear() {
    return this.annual * 3
  },
}

export const money = (n: number) =>
  '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })

export const purchasePaths = [
  {
    id: 'card',
    path: 'Self-serve, monthly by card',
    price: `${money(quote.monthly)}/mo`,
    notes: 'Start today, cancel anytime',
  },
  {
    id: 'annual',
    path: 'Annual through sales',
    price: `${money(quote.annual)}/yr`,
    notes: `${pricing.annualDiscount * 100}% off, onboarding included`,
  },
  {
    id: 'marketplace',
    path: 'Cloud marketplace',
    price: `${money(quote.annual)}/yr`,
    notes: 'Counts toward existing cloud commitment, consolidated billing',
  },
]

/* ---------- Policies page ---------- */

export const priceBands = [
  {
    plan: 'Starter',
    list: `${money(20)} per user / mo`,
    mayQuote: 'List price',
    autoApprove: `Up to ${pricing.annualDiscount * 100}% off on annual terms`,
  },
  {
    plan: 'Growth',
    list: `${money(40)} per user / mo, embedding +${money(pricing.embeddingAddOn)} / mo`,
    mayQuote: 'List price',
    autoApprove: `Up to ${pricing.annualDiscount * 100}% off on annual terms`,
  },
  {
    plan: 'Enterprise',
    list: 'Custom',
    mayQuote: 'Ranges only',
    autoApprove: 'None. A person quotes.',
  },
]

export const gatedDocs = [
  { doc: 'SOC 2 Type II report', requirement: 'Requires NDA acceptance', open: false },
  { doc: 'Security questionnaire', requirement: 'Requires a verified work email', open: false },
  { doc: 'Exact quote', requirement: 'Requires a verified work email', open: false },
  { doc: 'Public pricing, docs and integrations', requirement: 'Open to every agent', open: true },
]

export const alwaysEscalate = [
  'Non-standard terms (for example unlimited usage or custom SLAs)',
  `Multi-year commitments over ${money(50_000)}`,
  'Custom security addenda',
  'Any discount above the auto-approve limit',
]

export const answerRules = [
  'Every answer must cite a source document.',
  'If unsure, say so and offer a human.',
  'Never compare against named competitors.',
  'Never promise roadmap features or dates.',
]

export const escalationOwner = {
  team: `${vendor.name} sales`,
  replyWithin: 'one business day',
}
