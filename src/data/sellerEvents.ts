// Act 2: what the seller sees. Every item names the story step at which it happens (`stepId`),
// so the seller view stays in sync with the buyer's agent on the same step.

import { buyer, product, seller, vendor } from './config'
import { estimate, money } from './policies'
import type { FeedEvent, Step } from './types'

/* ---------- Before Doorbell ---------- */

export const before = {
  analytics: {
    label: `Visits from ${buyer.company}`,
    value: 0,
    note: "The agent's visit was filtered out as bot traffic.",
  },
  serverLog: [
    { ip: '198.51.100.17', time: '14:02:10', request: 'GET /pricing', status: 200 },
    { ip: '198.51.100.17', time: '14:03:48', request: 'GET /docs/embedding', status: 200 },
    { ip: '198.51.100.17', time: '14:05:22', request: 'GET /search?q=free+trial', status: 200 },
  ],
  signatureAgent: 'ai-provider.example',
  serverLogNote: "A signed header says which AI company's agent came by. Nothing says who sent it, what it wanted or what it couldn't find.",
  crm: { query: buyer.company, result: `No record of ${buyer.company}.` },
  caption: 'An AI agent spent four minutes on your pricing page. You can’t tell who sent it, or why it left.',
}

/* ---------- After: live activity feed ---------- */

export const feedEvents: FeedEvent[] = [
  {
    id: 'e-detected',
    stepId: 'b-seller-site',
    time: '14:02',
    kind: 'detected',
    text: 'AI browser agent detected on /pricing',
    detail: `Signed request verified: ${before.signatureAgent}`,
  },
  {
    id: 'e-identity',
    stepId: 'b-seller-site',
    time: '14:02',
    kind: 'identity',
    text: `Matched to ${buyer.company}`,
    detail: `The agent runs in a browser on ${buyer.company}'s company network`,
  },
  {
    id: 'e-facts-1',
    stepId: 'b-facts-1',
    time: '14:03',
    kind: 'facts',
    text: 'Read facts: Stripe + QuickBooks, embedding',
  },
  {
    id: 'e-price',
    stepId: 'b-facts-2',
    time: '14:05',
    kind: 'facts',
    text: `Priced ${estimate.plan} + embedding for ${estimate.seats} users`,
    detail: `${money(estimate.annual)}/yr on annual terms`,
  },
  {
    id: 'e-trust',
    stepId: 'b-facts-2',
    time: '14:05',
    kind: 'page',
    text: 'Opened the trust center: SOC 2 Type II',
  },
  {
    id: 'e-search',
    stepId: 'b-ask',
    time: '14:06',
    kind: 'page',
    text: 'Searched the site for “free trial”',
    detail: 'No results',
  },
  {
    id: 'e-ask',
    stepId: 'b-ask',
    time: '14:06',
    kind: 'escalation',
    text: 'Ask box: “Is there a free trial?”',
    detail: `No approved answer. Sent to ${seller.name}, your sales rep.`,
  },
  {
    id: 'e-left',
    stepId: 'b-ask',
    time: '14:06',
    kind: 'left',
    text: 'Agent left after 4 min 12 s',
    detail: '6 pages read, 1 question asked',
  },
]

/* ---------- After: the visit, as one account ---------- */

export const account = {
  /** The company is matched as soon as the agent arrives. */
  identifiedAt: 'b-seller-site',
  company: buyer.company,
  meta: `About ${buyer.size} people, ${buyer.industry}`,
  match: {
    method: 'Company network',
    confidence: 'High confidence',
    basis: `The agent ran in a browser on ${buyer.company}'s network. Visits that can't be matched stay anonymous.`,
  },
  agentKind: 'AI browser agent',
  mission: {
    stepId: 'b-facts-2',
    text: `Comparing BI tools for about ${buyer.size} users. Needs Stripe and QuickBooks, and embedded dashboards where each customer sees only their own data.`,
    basis: 'Inferred from the pages it read, what it priced and what it asked.',
  },
  checked: [
    { stepId: 'b-facts-1', text: 'Stripe + QuickBooks connections', found: true, note: 'Facts panel' },
    { stepId: 'b-facts-1', text: 'Embedding, each customer sees only their own data', found: true, note: 'Facts panel' },
    { stepId: 'b-facts-2', text: `Price: ${estimate.plan} + embedding, ${estimate.seats} users`, found: true, note: `${money(estimate.annual)}/yr` },
    { stepId: 'b-facts-2', text: 'SOC 2 Type II', found: true, note: 'Report needs NDA' },
    { stepId: 'b-ask', text: 'Free trial', found: false, note: 'Not found' },
  ],
  stuck: {
    stepId: 'b-ask',
    text: 'Couldn’t find whether there’s a free trial.',
    detail: 'It searched the site, asked in the ask box, got no approved answer and left 24 seconds later.',
  },
  value: {
    stepId: 'b-facts-2',
    text: money(estimate.annual),
    unit: 'per year, as priced',
  },
  nextBestAction: {
    stepId: 'b-ask',
    owner: seller.name,
    text: `Add a free-trial answer so the next agent gets one. Then reach out to ${buyer.company}: they priced ${estimate.plan} with embedding for about ${estimate.seats} users.`,
  },
}

/* ---------- After: rep alert and CRM ---------- */

export const repAlert = {
  stepId: 'b-ask',
  channel: 'sales-alerts',
  from: product.name,
  to: seller.name,
  time: '14:06',
  worksWith: 'Slack or Teams',
  text: `🔔 An AI agent from ${buyer.company} (about ${buyer.size} people, ${buyer.industry}) spent 4 minutes on ${vendor.site}. It priced ${estimate.plan} + embedding for ${estimate.seats} users and checked SOC 2. It couldn't find whether there's a free trial.`,
  cta: 'Open the visit →',
}

export const crmRecord = {
  stepId: 'b-ask',
  heading: 'Logged in your CRM',
  worksWith: 'Works with Salesforce or HubSpot',
  fields: [
    { label: 'Account', value: `${buyer.company} (${buyer.companyDomain})` },
    { label: 'Matched by', value: 'Company network, high confidence' },
    { label: 'Interest', value: `${estimate.plan} + embedding, ~${estimate.seats} users` },
    { label: 'Est. value', value: `${money(estimate.annual)} / yr` },
    { label: 'Owner', value: seller.name },
  ],
  activities: [
    { stepId: 'b-ask', text: 'AI agent visit: 4 min, 6 pages' },
    { stepId: 'b-ask', text: 'Mission summary attached' },
    { stepId: 'b-ask', text: 'Open question: “Is there a free trial?”' },
  ],
}

/* ---------- Act 2 steps ---------- */

export const sellerSteps: Step[] = [
  {
    id: 's-before',
    act: 2,
    screen: 'seller',
    label: `Before ${product.name}`,
    dwellMs: 11000,
    seller: { mode: 'before' },
  },
  {
    id: 's-feed',
    act: 2,
    screen: 'seller',
    label: 'After: the agent visit, live',
    dwellMs: 9000,
    animMs: 2200,
    seller: { mode: 'after', show: ['feed'] },
  },
  {
    id: 's-account',
    act: 2,
    screen: 'seller',
    label: `Who sent it: ${buyer.company}`,
    dwellMs: 8000,
    seller: { mode: 'after', show: ['feed', 'account'] },
  },
  {
    id: 's-mission',
    act: 2,
    screen: 'seller',
    label: 'What the agent was looking for',
    dwellMs: 9000,
    seller: { mode: 'after', show: ['feed', 'account', 'mission'] },
  },
  {
    id: 's-stuck',
    act: 2,
    screen: 'seller',
    label: 'Where it got stuck, and what to do',
    dwellMs: 8500,
    seller: { mode: 'after', show: ['feed', 'account', 'mission', 'stuck'] },
  },
  {
    id: 's-alert',
    act: 2,
    screen: 'seller',
    label: `Live alert to ${seller.firstName}, the sales rep`,
    dwellMs: 7500,
    seller: { mode: 'after', show: ['feed', 'account', 'mission', 'stuck', 'alert'] },
  },
  {
    id: 's-crm',
    act: 2,
    screen: 'seller',
    label: 'Visit logged in the CRM',
    dwellMs: 8000,
    seller: { mode: 'after', show: ['feed', 'account', 'mission', 'stuck', 'alert', 'crm'] },
  },
]
