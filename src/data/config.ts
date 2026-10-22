// Every name in the demo lives here, so the cast can be swapped in one place.
// All companies and people are fictional. Domains use the reserved .example TLD.

export const product = {
  name: 'Doorbell',
  headline: 'Doorbell: a sales rep for AI agents.',
  tagline: 'Know which AI buyers came knocking.',
  subtitle:
    "When a buyer's AI researches your product, it talks to Doorbell, and your sales team learns who's interested.",
  demoLabel: 'Concept demo · simulated data',
  mcpExplainer: 'MCP: the standard way AI agents plug into tools.',
}

export const vendor = {
  name: 'Vantly',
  initial: 'V',
  category: 'business-intelligence and embedded-analytics tool',
  site: 'vantly.example',
  docs: 'docs.vantly.example',
  aiPages: 'vantly.example/ai',
  mcpUrl: 'vantly.doorbell.example/mcp',
  /** What buyers' agents see: the vendor's own desk, powered by Doorbell. */
  deskName: "Vantly's AI desk",
}

export const competitors = [
  { name: 'Gridlake', site: 'gridlake.example' },
  { name: 'Chartwell', site: 'chartwell.example' },
] as const

export const [gridlake, chartwell] = competitors

export const buyer = {
  company: 'Tidewater Labs',
  companyDomain: 'tidewaterlabs.example',
  size: 40,
  industry: 'fintech',
  person: 'Maya Chen',
  firstName: 'Maya',
  title: 'Head of Operations',
  email: 'maya@tidewaterlabs.example',
  initials: 'MC',
  budget: 25_000,
}

export const seller = {
  name: 'Jordan Ellis',
  firstName: 'Jordan',
  title: 'Account Executive',
  initials: 'JE',
}

/** The buyer's AI is always shown generically, never as a real product. */
export const agent = {
  label: "Buyer's AI agent",
  examples: 'ChatGPT, Claude or a procurement tool',
}

/** Fictional independent sources the buyer's agent reads first. */
export const independentSources = {
  reviews: 'reviews.example',
  forum: 'opsforum.example',
  benchmark: 'databench.example',
}

/** The only two statistics in the demo, shown on the closing screen with their sources. */
export const stats = [
  {
    value: '8 in 10',
    text: '8 in 10 B2B tech buyers use AI agents as part of their purchasing process.',
    source: 'IDC, Aug 2026, reported by MarketScale',
  },
  {
    value: '93%',
    text: "In one Aug 2026 study, 93% of ChatGPT's quick answers opened no web page at all.",
    source: 'RESONEO',
  },
]

export const businessModel =
  'Free to set up. Vendors pay for buyer intelligence, CRM sync and gated quotes.'
