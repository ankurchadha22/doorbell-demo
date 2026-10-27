// Act 1: what the buyer's agent does. Each step appends chat items and timeline entries.
// Edit the story here; the Buyer view renders whatever this file says.

import { buyer, competitor1, competitor2, independentSources as src, product, seller, vendor } from './config'
import { estimate, money, pricing } from './policies'
import type { Step } from './types'

export const buyerSteps: Step[] = [
  {
    id: 'b-request',
    act: 1,
    screen: 'buyer',
    label: `${buyer.firstName} briefs an AI browser agent`,
    dwellMs: 7000,
    chat: [
      {
        kind: 'user',
        id: 'c-request',
        typed: true,
        text: `We're a ${buyer.size}-person ${buyer.industry}. Find a BI tool that connects to Stripe and QuickBooks, lets us embed dashboards in our customer app, and costs under $25k a year. Check each vendor's website and shortlist the best fit.`,
      },
    ],
  },
  {
    id: 'b-explore',
    act: 1,
    screen: 'buyer',
    label: 'Independent sources first',
    dwellMs: 6000,
    chat: [
      {
        kind: 'agent',
        id: 'c-plan',
        text: "I'll start with independent reviews and peer discussions, then open each vendor's website to check the details.",
      },
    ],
    timeline: [
      { id: 't-r1', at: '0:04', title: 'Read review summary: BI tools for startups', detail: src.reviews, channel: 'page', source: 'independent' },
      { id: 't-r2', at: '0:12', title: 'Read forum thread: “Embedded dashboards under $25k?”', detail: src.forum, channel: 'page', source: 'independent' },
      { id: 't-r3', at: '0:21', title: 'Read forum thread: “BI on Stripe + QuickBooks data, small team”', detail: src.forum, channel: 'page', source: 'independent' },
      { id: 't-r4', at: '0:33', title: 'Read benchmark: embedded dashboards, 6 tools', detail: src.benchmark, channel: 'page', source: 'independent' },
    ],
  },
  {
    id: 'b-shortlist',
    act: 1,
    screen: 'buyer',
    label: 'Shortlist of three',
    dwellMs: 5000,
    chat: [
      {
        kind: 'shortlist',
        id: 'c-shortlist',
        vendors: [vendor.name, competitor1.name, competitor2.name],
        note: 'Reviewers rate all three well for small teams. Next, I’ll check the details on each vendor’s website.',
      },
    ],
    timeline: [
      { id: 't-short', at: '0:45', title: `Shortlist: ${vendor.name}, ${competitor1.name}, ${competitor2.name}`, detail: 'Based on 4 independent sources' },
    ],
  },
  {
    id: 'b-seller-site',
    act: 1,
    screen: 'buyer',
    label: `The agent opens ${vendor.inSentence}'s website`,
    dwellMs: 7000,
    chat: [
      {
        kind: 'agent',
        id: 'c-open',
        text: `I'm on ${vendor.inSentence}'s pricing page. It has a “Facts for AI assistants” panel, so I'll check the details there.`,
      },
      { kind: 'site', id: 'c-site', url: `${vendor.site}/pricing` },
    ],
    timeline: [
      { id: 't-v1', at: '0:52', title: `Opened ${vendor.site}/pricing`, channel: 'page', source: 'vendor' },
      { id: 't-v2', at: '0:58', title: 'Found the “Facts for AI assistants” panel', detail: 'Visible on the page, with a source for each fact', channel: 'facts', source: 'vendor' },
    ],
  },
  {
    id: 'b-facts-1',
    act: 1,
    screen: 'buyer',
    label: 'Facts panel: integrations and embedding',
    dwellMs: 5000,
    chat: [
      {
        kind: 'check',
        id: 'c-q1',
        vendor: vendor.name,
        channel: 'facts',
        source: 'vendor',
        question: 'Does it connect to Stripe and QuickBooks?',
        answer: 'Yes. Both connect directly, on every plan.',
        status: 'ok',
        cite: { label: 'Connectors', url: `${vendor.docs}/connectors` },
      },
      {
        kind: 'check',
        id: 'c-q2',
        vendor: vendor.name,
        channel: 'facts',
        source: 'vendor',
        question: 'Can we embed dashboards so each customer sees only their own data?',
        answer: 'Yes, on the Growth plan.',
        status: 'ok',
        cite: { label: 'Embedding', url: `${vendor.docs}/embedding` },
      },
    ],
    timeline: [
      { id: 't-q1', at: '1:20', title: 'Read the integrations docs: Stripe, QuickBooks', detail: 'Confirmed in the facts panel', channel: 'facts', source: 'vendor', status: 'ok', statusLabel: 'Verified' },
      { id: 't-q2', at: '1:45', title: 'Read the embedding docs', detail: 'Growth plan; each customer sees only their own data', channel: 'facts', source: 'vendor', status: 'ok', statusLabel: 'Verified' },
    ],
  },
  {
    id: 'b-facts-2',
    act: 1,
    screen: 'buyer',
    label: 'Facts panel: price and SOC 2',
    dwellMs: 5000,
    chat: [
      {
        kind: 'check',
        id: 'c-q3',
        vendor: vendor.name,
        channel: 'facts',
        source: 'vendor',
        question: `What does Growth with embedding cost for ${buyer.size} users?`,
        answer: `${money(estimate.monthly)}/month, or ${money(estimate.annual)}/year with the ${pricing.annualDiscount * 100}% annual discount.`,
        status: 'ok',
        cite: { label: 'Pricing', url: `${vendor.site}/pricing` },
      },
      {
        kind: 'check',
        id: 'c-q4',
        vendor: vendor.name,
        channel: 'facts',
        source: 'vendor',
        question: 'Are they SOC 2 Type II?',
        answer: 'Yes. The report is shared under NDA.',
        status: 'gated',
        statusLabel: 'Verified, report needs NDA',
        cite: { label: 'Trust center', url: `${vendor.site}/trust` },
      },
    ],
    timeline: [
      { id: 't-q3', at: '2:10', title: `Priced Growth + embedding for ${buyer.size} users`, detail: `${money(estimate.annual)}/yr on annual terms`, channel: 'facts', source: 'vendor', status: 'ok', statusLabel: 'Exact price' },
      { id: 't-q4', at: '2:30', title: 'Opened the trust center: SOC 2 Type II', channel: 'page', source: 'vendor', status: 'gated', statusLabel: 'Report needs NDA' },
    ],
  },
  {
    id: 'b-ask',
    act: 1,
    screen: 'buyer',
    label: 'Ask box: “Is there a free trial?”',
    dwellMs: 7000,
    chat: [
      {
        kind: 'agent',
        id: 'c-search',
        text: "Nothing on the site says whether there's a free trial, so I asked in their ask box.",
      },
      {
        kind: 'ask',
        id: 'c-ask',
        question: 'Is there a free trial?',
        reply: "I don't have an approved answer to that yet. I've passed your question to a person on the sales team.",
        status: 'escalated',
        statusLabel: 'Sent to a person',
      },
    ],
    timeline: [
      { id: 't-s1', at: '2:50', title: 'Searched the site for “free trial”', detail: 'No results', channel: 'page', source: 'vendor', status: 'warn', statusLabel: 'Not found' },
      { id: 't-s2', at: '3:05', title: 'Asked in the ask box: “Is there a free trial?”', detail: 'No approved answer yet', channel: 'ask', source: 'vendor', status: 'escalated', statusLabel: 'Sent to a person' },
    ],
  },
  {
    id: 'b-mcp-connect',
    act: 1,
    screen: 'buyer',
    label: 'Facts panel offers MCP for deeper questions',
    dwellMs: 6500,
    chat: [
      {
        kind: 'agent',
        id: 'c-mcp-offer',
        text: `The facts panel also offers an MCP connection to ${vendor.inSentence} for deeper or gated questions. I'd like to ask about branding and get the SOC 2 report. Shall I connect?`,
        note: product.mcpExplainer,
      },
      { kind: 'user', id: 'c-mcp-ok', typed: true, text: 'Yes, connect.' },
    ],
    timeline: [
      { id: 't-m1', at: '3:20', title: 'Found an MCP connection in the facts panel', detail: vendor.mcpUrl, channel: 'facts', source: 'vendor' },
      { id: 't-m2', at: '3:28', title: `Connected over MCP, with ${buyer.firstName}'s approval`, channel: 'mcp', source: 'vendor', status: 'ok', statusLabel: 'Connected' },
    ],
  },
  {
    id: 'b-mcp',
    act: 1,
    screen: 'buyer',
    label: 'MCP: a deeper question and a gated document',
    dwellMs: 6500,
    chat: [
      {
        kind: 'check',
        id: 'c-m1',
        vendor: vendor.name,
        channel: 'mcp',
        source: 'vendor',
        question: 'Can the embedded dashboards carry our own logo, and can our customers sign in with their existing accounts?',
        answer: 'Yes. Your own branding and single sign-on are both included on the Growth plan.',
        status: 'ok',
        cite: { label: 'Embedding: branding and sign-in', url: `${vendor.docs}/embedding/branding` },
      },
      {
        kind: 'check',
        id: 'c-m2',
        vendor: vendor.name,
        channel: 'mcp',
        source: 'vendor',
        question: 'Can we get the SOC 2 Type II report?',
        answer: `It's shared under NDA. ${vendor.sentenceStart} sent an NDA link; once you sign it, the report opens right away.`,
        status: 'gated',
        statusLabel: 'Needs your NDA signature',
        cite: { label: 'NDA and report', url: `${vendor.site}/trust/nda` },
      },
    ],
    timeline: [
      { id: 't-m3', at: '3:45', title: 'Asked: own branding and customer sign-in?', detail: 'Answered with a citation', channel: 'mcp', source: 'vendor', status: 'ok', statusLabel: 'Verified' },
      { id: 't-m4', at: '4:20', title: 'Requested the SOC 2 Type II report', detail: `NDA link received for ${buyer.firstName} to sign`, channel: 'mcp', source: 'vendor', status: 'gated', statusLabel: 'Needs NDA' },
      { id: 't-m5', at: '5:04', title: `Left ${vendor.site}`, detail: `Free trial still unknown. ${seller.name} has the question.` },
    ],
  },
  {
    id: 'b-competitor-1',
    act: 1,
    screen: 'buyer',
    label: `${competitor1.name}: ordinary website`,
    dwellMs: 4500,
    chat: [
      {
        kind: 'check',
        id: 'c-comp1',
        vendor: competitor1.name,
        channel: 'page',
        source: 'vendor',
        question: `What does it cost for ${buyer.size} users with embedding?`,
        answer: 'The pricing page only says “Contact sales for pricing.”',
        status: 'warn',
        statusLabel: 'No price for the agent',
      },
    ],
    timeline: [
      { id: 't-comp1', at: '5:30', title: `Opened ${competitor1.site}/pricing`, detail: '“Contact sales for pricing.”', channel: 'page', source: 'vendor', status: 'warn', statusLabel: 'No price' },
    ],
  },
  {
    id: 'b-competitor-2',
    act: 1,
    screen: 'buyer',
    label: `${competitor2.name}: ordinary website`,
    dwellMs: 4500,
    chat: [
      {
        kind: 'check',
        id: 'c-comp2',
        vendor: competitor2.name,
        channel: 'page',
        source: 'vendor',
        question: 'Can we embed dashboards so each customer sees only their own data?',
        answer: 'The site mentions “embedded reports” but says nothing about keeping each customer’s data separate.',
        status: 'unverified',
      },
    ],
    timeline: [
      { id: 't-comp2', at: '6:10', title: `Opened ${competitor2.site}/embedding`, detail: 'Customer data separation unclear', channel: 'page', source: 'vendor', status: 'unverified', statusLabel: 'Unverified' },
    ],
  },
  {
    id: 'b-final',
    act: 1,
    screen: 'buyer',
    label: `Final answer to ${buyer.firstName}`,
    dwellMs: 8500,
    chat: [
      {
        kind: 'final',
        id: 'c-final',
        intro: "Here's where your shortlist stands:",
        recommendation: `${vendor.sentenceStart} is the best fit I could verify, at ${money(estimate.annual)}/yr. Sign the NDA to see their SOC 2 report. I couldn't find out whether it has a free trial. ${competitor1.name} and ${competitor2.name} may also fit, but each needs a sales call to confirm the details.`,
      },
    ],
  },
]

/** Final comparison shown to the buyer. `tone` drives the cell styling. */
export const finalComparisonNote = 'Verified means the company confirmed it with a source, on its website or over MCP. Claimed means it is mentioned but not specific.'

export type CellTone = 'verified' | 'claimed' | 'unknown' | 'unverified'

export const finalComparison: {
  vendors: string[]
  rows: { label: string; cells: { text: string; tone: CellTone }[] }[]
} = {
  vendors: [vendor.name, competitor1.name, competitor2.name],
  rows: [
    {
      label: 'Stripe + QuickBooks',
      cells: [
        { text: 'Verified', tone: 'verified' },
        { text: 'Claimed', tone: 'claimed' },
        { text: 'In reviews', tone: 'claimed' },
      ],
    },
    {
      label: 'Embedded dashboards',
      cells: [
        { text: 'Verified (Growth)', tone: 'verified' },
        { text: 'Claimed', tone: 'claimed' },
        { text: 'Unverified', tone: 'unverified' },
      ],
    },
    {
      label: 'Own branding + sign-in',
      cells: [
        { text: 'Verified', tone: 'verified' },
        { text: 'Unknown', tone: 'unknown' },
        { text: 'Unknown', tone: 'unknown' },
      ],
    },
    {
      label: 'SOC 2 Type II',
      cells: [
        { text: 'Verified, NDA link', tone: 'verified' },
        { text: 'Claimed', tone: 'claimed' },
        { text: 'Unknown', tone: 'unknown' },
      ],
    },
    {
      label: `Price, ${buyer.size} users`,
      cells: [
        { text: `${money(estimate.annual)}/yr`, tone: 'verified' },
        { text: 'Contact sales', tone: 'unknown' },
        { text: 'Sales call', tone: 'unknown' },
      ],
    },
    {
      label: 'Free trial',
      cells: [
        { text: 'Unknown', tone: 'unknown' },
        { text: 'Unknown', tone: 'unknown' },
        { text: 'Unknown', tone: 'unknown' },
      ],
    },
  ],
}
