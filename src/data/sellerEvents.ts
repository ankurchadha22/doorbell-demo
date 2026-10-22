// Act 2: what Vantly sees. Every item names the story step at which it happens (`stepId`),
// so the seller view stays in sync with the buyer's agent on the same step.

import { buyer, chartwell, gridlake, product, seller, vendor } from './config'
import { money, quote } from './policies'
import type { Door, FeedEvent, StageId, Step } from './types'

/* ---------- Before Doorbell ---------- */

export const before = {
  analytics: {
    label: `Visits from ${buyer.company}`,
    value: 0,
    note: 'The AI agent fetched your pages without running your analytics script.',
  },
  serverLog: [
    { ip: '203.0.113.24', time: '14:02:11', request: 'GET /pricing', status: 200 },
    { ip: '203.0.113.31', time: '14:02:12', request: 'GET /docs/embedding', status: 200 },
    { ip: '203.0.113.24', time: '14:02:40', request: 'GET /pricing', status: 200 },
  ],
  userAgent: 'Mozilla/5.0 (compatible; AI-Fetcher/2.1; +https://ai-provider.example/bot)',
  serverLogNote: "Requests came from an AI provider's servers. No company named.",
  crm: { query: buyer.company, result: `No record of ${buyer.company}.` },
  caption: `A ${money(quote.annual)} opportunity was evaluated, and you can't see it.`,
}

/* ---------- After: live activity feed ---------- */

export const feedEvents: FeedEvent[] = [
  {
    id: 'e-read',
    stepId: 'b-vantly-site',
    time: '14:02',
    kind: 'website',
    text: 'Agent read your AI-ready pages: pricing, integrations, security',
    detail: 'Anonymous session',
  },
  {
    id: 'e-connect',
    stepId: 'b-vantly-site',
    time: '14:02',
    kind: 'mcp',
    text: 'Agent connected to your desk',
    detail: `Stated context: ${buyer.size}-person ${buyer.industry}, comparing 3 BI tools, budget under $25k`,
  },
  {
    id: 'e-q1',
    stepId: 'b-mcp-1',
    time: '14:03',
    kind: 'mcp',
    text: 'Agent asked about Stripe + QuickBooks connections',
    detail: 'Answered with a citation',
  },
  {
    id: 'e-q2',
    stepId: 'b-mcp-2',
    time: '14:03',
    kind: 'mcp',
    text: 'Agent asked about embedding dashboards for its customers',
    detail: 'Answered: Growth plan',
  },
  {
    id: 'e-q3',
    stepId: 'b-mcp-3',
    time: '14:04',
    kind: 'mcp',
    text: 'Agent asked about SOC 2 Type II',
    detail: 'Report gated: NDA required',
  },
  {
    id: 'e-quote-req',
    stepId: 'b-quote-shared',
    time: '14:06',
    kind: 'form',
    text: `Quote requested: ${quote.seats} users, ${quote.plan} plan + embedding`,
  },
  {
    id: 'e-identity',
    stepId: 'b-quote-shared',
    time: '14:06',
    kind: 'identity',
    text: `Contact verified: ${buyer.person}, ${buyer.title}, ${buyer.company}`,
    detail: 'Work email shared with consent. Earlier questions linked to this account.',
  },
  {
    id: 'e-quote-sent',
    stepId: 'b-quote-shared',
    time: '14:06',
    kind: 'form',
    text: `Quote sent: ${money(quote.annual)}/yr`,
    detail: quote.id,
  },
  {
    id: 'e-paths',
    stepId: 'b-paths',
    time: '14:07',
    kind: 'mcp',
    text: 'Agent compared purchase paths: card, annual, marketplace',
    detail: 'No path chosen yet',
  },
  {
    id: 'e-escalation',
    stepId: 'b-negotiate',
    time: '14:08',
    kind: 'escalation',
    text: 'Non-standard term requested: unlimited AI-assistant queries, 3-year deal',
    detail: `Outside policy. Assigned to ${seller.name}.`,
  },
]

/* ---------- After: account view ---------- */

export const account = {
  company: buyer.company,
  meta: `${buyer.size} people, ${buyer.industry}`,
  /** Before this step the session is anonymous. */
  identifiedAt: 'b-quote-shared',
  anonymousLabel: 'Unidentified agent session',
  contact: {
    name: buyer.person,
    title: buyer.title,
    email: buyer.email,
    basis: 'Shared with consent at the quote step',
  },
  stageUpdates: [
    { stepId: 'b-vantly-site', stage: 'shortlist' },
    { stepId: 'b-quote-ask', stage: 'quote' },
    { stepId: 'b-paths', stage: 'how-to-buy' },
    { stepId: 'b-negotiate', stage: 'how-to-buy', flagged: 'negotiate' },
  ] as { stepId: string; stage: StageId; flagged?: StageId }[],
  questions: [
    { stepId: 'b-mcp-1', door: 'mcp', text: 'Do you connect to Stripe and QuickBooks?', outcome: 'Cited answer' },
    { stepId: 'b-mcp-2', door: 'mcp', text: 'Can we embed dashboards so each customer sees only their own data?', outcome: 'Cited answer' },
    { stepId: 'b-mcp-3', door: 'mcp', text: 'Are you SOC 2 Type II?', outcome: 'Gated: NDA' },
    { stepId: 'b-quote-shared', door: 'form', text: `Quote for ${quote.seats} users, ${quote.plan} + embedding`, outcome: 'Quote sent' },
    { stepId: 'b-paths', door: 'mcp', text: 'What purchase options are available?', outcome: 'Answered' },
    { stepId: 'b-negotiate', door: 'mcp', text: 'Unlimited AI-assistant queries on a 3-year deal?', outcome: 'Escalated' },
  ] as { stepId: string; door: Door; text: string; outcome: string }[],
  alsoEvaluating: {
    stepId: 'b-vantly-site',
    names: [gridlake.name, chartwell.name],
    basis: "Inferred from the agent's questions and stated shortlist",
  },
  quote: { stepId: 'b-quote-shared', text: `${money(quote.annual)}/yr`, detail: quote.id },
  preferredPath: { stepId: 'b-paths', text: 'Not yet chosen', detail: 'Compared card, annual and marketplace' },
  dealValue: {
    stepId: 'b-quote-shared',
    text: `${money(quote.annual)}`,
    unit: 'per year',
    detail: `Up to ${money(quote.threeYear)} if a 3-year deal lands`,
  },
  nextBestAction: {
    stepId: 'b-negotiate',
    owner: seller.name,
    text: 'Reply to the unlimited-AI-queries request. Consider offering a capped allowance on a 2-year term.',
    due: 'Reply promised within one business day',
  },
}

/* ---------- After: rep alert and CRM ---------- */

export const repAlert = {
  stepId: 'b-negotiate',
  channel: 'sales-alerts',
  from: product.name,
  to: seller.name,
  time: '14:08',
  text: `🔔 ${buyer.company} (${buyer.size} people, ${buyer.industry}) requested a quote via their AI agent. They need Stripe, QuickBooks and embedded dashboards where each customer sees only their own data, and they're asking for unlimited AI queries on a 3-year deal.`,
  cta: 'Open in CRM →',
}

export const crmRecord = {
  stepId: 'b-quote-shared',
  heading: 'Synced to your CRM',
  worksWith: 'Works with Salesforce or HubSpot',
  fields: [
    { label: 'Account', value: `${buyer.company} (${buyer.companyDomain})` },
    { label: 'Contact', value: `${buyer.person}, ${buyer.title}` },
    { label: 'Opportunity', value: `${vendor.name} ${quote.plan} + embedding` },
    { label: 'Amount', value: `${money(quote.annual)} / yr` },
    { label: 'Owner', value: seller.name },
  ],
  activities: [
    { stepId: 'b-mcp-3', text: '3 questions answered by the desk, with citations' },
    { stepId: 'b-quote-shared', text: `Quote ${quote.id} sent` },
    { stepId: 'b-paths', text: 'Purchase paths compared' },
    { stepId: 'b-negotiate', text: 'Escalation: non-standard term' },
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
    label: 'After: live activity feed',
    dwellMs: 9000,
    animMs: 2600,
    seller: { mode: 'after', show: ['feed'] },
  },
  {
    id: 's-account',
    act: 2,
    screen: 'seller',
    label: `Account: ${buyer.company}`,
    dwellMs: 8000,
    seller: { mode: 'after', show: ['feed', 'account'] },
  },
  {
    id: 's-questions',
    act: 2,
    screen: 'seller',
    label: 'Exact questions and competitors',
    dwellMs: 9000,
    seller: { mode: 'after', show: ['feed', 'account', 'questions'] },
  },
  {
    id: 's-next',
    act: 2,
    screen: 'seller',
    label: 'Deal value and next best action',
    dwellMs: 8000,
    seller: { mode: 'after', show: ['feed', 'account', 'questions', 'next-action'] },
  },
  {
    id: 's-alert',
    act: 2,
    screen: 'seller',
    label: `Alert to ${seller.firstName}`,
    dwellMs: 7500,
    seller: { mode: 'after', show: ['feed', 'account', 'questions', 'next-action', 'alert'] },
  },
  {
    id: 's-crm',
    act: 2,
    screen: 'seller',
    label: 'CRM sync',
    dwellMs: 8500,
    seller: { mode: 'after', show: ['feed', 'account', 'questions', 'next-action', 'alert', 'crm'] },
  },
]
