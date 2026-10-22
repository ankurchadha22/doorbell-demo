// Act 1: what the buyer's agent does. Each step appends chat items and timeline entries.
// Edit the story here; the Buyer view renders whatever this file says.

import { buyer, competitor2, competitor1, independentSources as src, product, seller, vendor } from './config'
import { money, quote } from './policies'
import type { StageId, Step } from './types'

/** The six buying stages, in order. Labels are shown exactly as written. */
export const stages: { id: StageId; label: string }[] = [
  { id: 'explore', label: 'Explore' },
  { id: 'compare', label: 'Compare' },
  { id: 'shortlist', label: 'Shortlist' },
  { id: 'quote', label: 'Quote' },
  { id: 'how-to-buy', label: 'Choose how to buy' },
  { id: 'negotiate', label: 'Negotiate (human)' },
]

export const buyerSteps: Step[] = [
  {
    id: 'b-request',
    act: 1,
    screen: 'buyer',
    label: `${buyer.firstName} asks her agent`,
    dwellMs: 7000,
    stage: 'explore',
    chat: [
      {
        kind: 'user',
        id: 'c-request',
        typed: true,
        text: `We're a ${buyer.size}-person ${buyer.industry}. Find a BI tool that connects to Stripe and QuickBooks, lets us embed dashboards in our customer app, and costs under $25k a year. Shortlist 3 and get me real pricing.`,
      },
    ],
  },
  {
    id: 'b-explore',
    act: 1,
    screen: 'buyer',
    label: 'Explore and compare: independent sources',
    dwellMs: 6500,
    stage: 'compare',
    chat: [
      {
        kind: 'agent',
        id: 'c-plan',
        text: "I'll start with independent sources: reviews, peer discussions and benchmarks. Then I'll check facts and pricing with each vendor directly.",
      },
    ],
    timeline: [
      { id: 't-r1', at: '0:02', title: 'Read review summary: BI tools for startups', detail: src.reviews, door: 'website', source: 'independent' },
      { id: 't-r2', at: '0:03', title: 'Read reviews: embedded analytics, teams under 50', detail: src.reviews, door: 'website', source: 'independent' },
      { id: 't-r3', at: '0:05', title: 'Read forum thread: “Embedded dashboards under $25k?”', detail: src.forum, door: 'website', source: 'independent' },
      { id: 't-r4', at: '0:06', title: 'Read forum thread: “BI on Stripe + QuickBooks data, small team”', detail: src.forum, door: 'website', source: 'independent' },
      { id: 't-r5', at: '0:08', title: 'Read benchmark: dashboard speed on Stripe data, 6 tools', detail: src.benchmark, door: 'website', source: 'independent' },
      { id: 't-r6', at: '0:09', title: 'Read benchmark notes: embedded dashboards, 6 tools', detail: src.benchmark, door: 'website', source: 'independent' },
      { id: 't-r7', at: '0:11', title: `Read review comparison: ${vendor.name}, ${competitor1.name}, ${competitor2.name}`, detail: src.reviews, door: 'website', source: 'independent' },
    ],
  },
  {
    id: 'b-shortlist',
    act: 1,
    screen: 'buyer',
    label: 'Shortlist from independent sources',
    dwellMs: 5000,
    stage: 'shortlist',
    chat: [
      {
        kind: 'shortlist',
        id: 'c-shortlist',
        vendors: [vendor.name, competitor1.name, competitor2.name],
        note: 'Independent reviewers rate all three well for small teams. Next, I’ll verify the details you care about with each vendor.',
      },
    ],
    timeline: [
      { id: 't-short', at: '0:12', title: `Shortlist: ${vendor.name}, ${competitor1.name}, ${competitor2.name}`, detail: 'Based on 7 independent sources' },
    ],
  },
  {
    id: 'b-seller-site',
    act: 1,
    screen: 'buyer',
    label: `${vendor.name}: AI-readable site, then MCP`,
    dwellMs: 5000,
    stage: 'shortlist',
    chat: [
      {
        kind: 'agent',
        id: 'c-connect',
        text: `${vendor.sentenceStart} publishes pages written for agents and an AI desk I can connect to over MCP. I'm using it to check facts, not to compare.`,
        note: product.mcpExplainer,
      },
    ],
    timeline: [
      { id: 't-v1', at: '0:14', title: `Read ${vendor.inSentence}'s AI-readable pages: pricing, integrations, security`, detail: vendor.aiPages, door: 'website', source: 'vendor' },
      { id: 't-v2', at: '0:15', title: `Connected to ${vendor.inSentence}'s AI desk`, detail: product.mcpExplainer, door: 'mcp', source: 'vendor', status: 'ok', statusLabel: 'Connected' },
    ],
  },
  {
    id: 'b-mcp-1',
    act: 1,
    screen: 'buyer',
    label: 'MCP: Stripe and QuickBooks',
    dwellMs: 4000,
    stage: 'shortlist',
    chat: [
      {
        kind: 'check',
        id: 'c-q1',
        vendor: vendor.name,
        door: 'mcp',
        source: 'vendor',
        question: 'Do you connect to Stripe and QuickBooks?',
        answer: 'Yes. Both connect directly and stay up to date automatically, on every plan.',
        status: 'ok',
        cite: { label: 'Connectors: Stripe, QuickBooks', url: `${vendor.docs}/connectors` },
      },
    ],
    timeline: [
      { id: 't-q1', at: '0:16', title: 'Asked: Stripe and QuickBooks connections?', detail: 'Answered with a citation', door: 'mcp', source: 'vendor', status: 'ok', statusLabel: 'Verified' },
    ],
  },
  {
    id: 'b-mcp-2',
    act: 1,
    screen: 'buyer',
    label: 'MCP: embedding, each customer sees own data',
    dwellMs: 4000,
    stage: 'shortlist',
    chat: [
      {
        kind: 'check',
        id: 'c-q2',
        vendor: vendor.name,
        door: 'mcp',
        source: 'vendor',
        question: 'Can we embed dashboards in our app so each customer sees only their own data?',
        answer: 'Yes, on the Growth plan. Each customer is automatically limited to their own data.',
        status: 'ok',
        cite: { label: 'Embedding: customer data', url: `${vendor.docs}/embedding/customer-data` },
      },
    ],
    timeline: [
      { id: 't-q2', at: '0:17', title: 'Asked: embedding, each customer sees only their own data?', detail: 'Yes, on the Growth plan', door: 'mcp', source: 'vendor', status: 'ok', statusLabel: 'Verified' },
    ],
  },
  {
    id: 'b-mcp-3',
    act: 1,
    screen: 'buyer',
    label: 'MCP: SOC 2 Type II',
    dwellMs: 4000,
    stage: 'shortlist',
    chat: [
      {
        kind: 'check',
        id: 'c-q3',
        vendor: vendor.name,
        door: 'mcp',
        source: 'vendor',
        question: 'Are you SOC 2 Type II?',
        answer: 'Yes. Report available after NDA acceptance.',
        status: 'gated',
        statusLabel: 'Verified, report needs NDA',
        cite: { label: 'Trust center: SOC 2 Type II', url: `${vendor.site}/trust` },
      },
    ],
    timeline: [
      { id: 't-q3', at: '0:18', title: 'Asked: SOC 2 Type II?', detail: 'Yes. Report available after NDA acceptance', door: 'mcp', source: 'vendor', status: 'gated', statusLabel: 'Report needs NDA' },
    ],
  },
  {
    id: 'b-competitor-1',
    act: 1,
    screen: 'buyer',
    label: `${competitor1.name}: ordinary website`,
    dwellMs: 4000,
    stage: 'shortlist',
    chat: [
      {
        kind: 'check',
        id: 'c-comp1',
        vendor: competitor1.name,
        door: 'website',
        source: 'vendor',
        question: `What does it cost for ${buyer.size} users with embedding?`,
        answer: 'The pricing page only says “Contact sales for pricing.”',
        status: 'warn',
        statusLabel: 'Pricing unavailable to agent',
      },
    ],
    timeline: [
      { id: 't-comp1', at: '0:20', title: `Read ${competitor1.name}'s pricing page`, detail: '“Contact sales for pricing.”', door: 'website', source: 'vendor', status: 'warn', statusLabel: 'Pricing unavailable to agent' },
    ],
  },
  {
    id: 'b-competitor-2',
    act: 1,
    screen: 'buyer',
    label: `${competitor2.name}: search snippet only`,
    dwellMs: 4000,
    stage: 'shortlist',
    chat: [
      {
        kind: 'check',
        id: 'c-comp2',
        vendor: competitor2.name,
        door: 'website',
        source: 'vendor',
        question: 'Can we embed dashboards so each customer sees only their own data?',
        answer: 'I only found a search snippet. It mentions “embedded reports” but nothing about keeping each customer’s data separate.',
        status: 'unverified',
      },
    ],
    timeline: [
      { id: 't-comp2', at: '0:21', title: `Found only a search snippet for ${competitor2.name}`, detail: 'Embedding details unclear', door: 'website', source: 'vendor', status: 'unverified', statusLabel: 'Unverified' },
    ],
  },
  {
    id: 'b-quote-ask',
    act: 1,
    screen: 'buyer',
    label: 'Quote: consent to share identity',
    dwellMs: 5500,
    stage: 'quote',
    consent: 'ask',
    chat: [
      {
        kind: 'agent',
        id: 'c-quote-ask',
        text: `${vendor.sentenceStart} can give an exact quote if you share your work email with them. ${competitor1.name} and ${competitor2.name} require a sales call.`,
      },
    ],
    timeline: [
      { id: 't-qa', at: '0:23', title: `${vendor.sentenceStart}'s quote form needs a work email`, detail: `Asked ${buyer.firstName} before sharing anything`, door: 'form', source: 'vendor', status: 'identity', statusLabel: 'Waiting for approval' },
    ],
  },
  {
    id: 'b-quote-shared',
    act: 1,
    screen: 'buyer',
    label: 'Quote: agent fills the quote form',
    dwellMs: 6000,
    stage: 'quote',
    consent: 'shared',
    chat: [
      { kind: 'consent-result', id: 'c-shared', text: `You shared ${buyer.email} with ${vendor.inSentence}.` },
      {
        kind: 'quote',
        id: 'c-quote',
        title: `Quote from ${vendor.inSentence}`,
        lines: [
          { label: 'Plan', value: `${quote.plan} + embedding` },
          { label: 'Users', value: String(quote.seats) },
          { label: 'Annual price', value: `${money(quote.annual)}/yr` },
          { label: 'Quote ID', value: quote.id },
        ],
        cite: { label: 'Quote form', url: `${vendor.aiPages}/quote` },
      },
    ],
    timeline: [
      { id: 't-form', at: '0:31', title: `Submitted ${vendor.inSentence}'s quote form`, detail: `${quote.seats} users, ${quote.plan} plan + embedding. Work email shared with consent.`, door: 'form', source: 'vendor', status: 'identity', statusLabel: 'Email shared' },
      { id: 't-quote', at: '0:32', title: `Quote received: ${money(quote.annual)}/yr`, detail: quote.id, door: 'form', source: 'vendor', status: 'ok', statusLabel: 'Exact price' },
    ],
  },
  {
    id: 'b-paths',
    act: 1,
    screen: 'buyer',
    label: 'Choose how to buy',
    dwellMs: 6500,
    stage: 'how-to-buy',
    chat: [{ kind: 'paths', id: 'c-paths', intro: `${vendor.sentenceStart} offers three ways to buy. Here's how they compare:` }],
    timeline: [
      { id: 't-paths', at: '0:34', title: 'Asked: what purchase options are available?', detail: 'Card, annual contract, cloud marketplace', door: 'mcp', source: 'vendor', status: 'ok', statusLabel: '3 paths' },
    ],
  },
  {
    id: 'b-negotiate',
    act: 1,
    screen: 'buyer',
    label: 'Negotiate: escalated to a human',
    dwellMs: 7500,
    stage: 'negotiate',
    chat: [
      { kind: 'user', id: 'c-neg', typed: true, text: 'Ask them for unlimited AI-assistant queries on a 3-year deal.' },
      {
        kind: 'desk-reply',
        id: 'c-neg-reply',
        from: vendor.deskName,
        text: `This request is outside the terms I can approve. I've passed it to ${seller.name}, our sales rep, who'll reply within one business day.`,
      },
    ],
    timeline: [
      { id: 't-neg', at: '0:58', title: 'Requested: unlimited AI-assistant queries, 3-year deal', door: 'mcp', source: 'vendor' },
      { id: 't-esc', at: '0:59', title: 'Escalated to human', detail: `Passed to ${seller.name}, ${seller.role}`, door: 'mcp', source: 'vendor', status: 'escalated', statusLabel: 'Escalated to human' },
    ],
  },
  {
    id: 'b-final',
    act: 1,
    screen: 'buyer',
    label: `Final answer to ${buyer.firstName}`,
    dwellMs: 8500,
    stage: 'negotiate',
    chat: [
      {
        kind: 'final',
        id: 'c-final',
        intro: "Here's where your shortlist stands:",
        recommendation: `${vendor.sentenceStart} is the only option I could fully verify, and it fits your budget at ${money(quote.annual)}/yr. ${competitor1.name} and ${competitor2.name} may also fit, but each needs a sales call to confirm pricing and embedding. ${seller.name}, ${seller.role}, will reply on the 3-year request within one business day.`,
      },
    ],
  },
]

/** Final comparison shown to the buyer. `tone` drives the cell styling. */
export const finalComparisonNote = 'Verified means the vendor confirmed it with a cited document. Vendor claim means it appears on their website but was not checked.'

export type CellTone = 'verified' | 'claimed' | 'unknown' | 'unverified'

export const finalComparison: {
  vendors: string[]
  rows: { label: string; cells: { text: string; tone: CellTone }[] }[]
} = {
  vendors: [vendor.name, competitor1.name, competitor2.name],
  rows: [
    {
      label: 'Independent reviews',
      cells: [
        { text: 'Positive', tone: 'claimed' },
        { text: 'Positive', tone: 'claimed' },
        { text: 'Positive', tone: 'claimed' },
      ],
    },
    {
      label: 'Stripe + QuickBooks',
      cells: [
        { text: 'Verified', tone: 'verified' },
        { text: 'Vendor claim', tone: 'claimed' },
        { text: 'In reviews', tone: 'claimed' },
      ],
    },
    {
      label: 'Embedded dashboards',
      cells: [
        { text: 'Verified (Growth)', tone: 'verified' },
        { text: 'Vendor claim', tone: 'claimed' },
        { text: 'Unverified', tone: 'unverified' },
      ],
    },
    {
      label: 'SOC 2 Type II',
      cells: [
        { text: 'Verified (NDA)', tone: 'verified' },
        { text: 'Vendor claim', tone: 'claimed' },
        { text: 'Unknown', tone: 'unknown' },
      ],
    },
    {
      label: `Price, ${buyer.size} users`,
      cells: [
        { text: `${money(quote.annual)}/yr`, tone: 'verified' },
        { text: 'Contact sales', tone: 'unknown' },
        { text: 'Sales call', tone: 'unknown' },
      ],
    },
  ],
}
