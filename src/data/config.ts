// Every name in the demo lives here, so the cast can be swapped in one place.
// All companies and people are fictional. Domains use the reserved .example TLD.

export const product = {
  name: 'Doorbell',
  headline: 'Doorbell: know which AI agents came knocking.',
  subtitle:
    'One line of code shows which AI agents visited your website, who sent them, what they were looking for and what they couldn’t find.',
  demoLabel: 'Concept demo · simulated data',
  mcpExplainer: 'MCP: the standard way AI agents plug into tools.',
}

// The companies are named by their role, so the audience never has to remember who is who.

/** The software company that uses Doorbell. */
export const vendor = {
  /** For labels, chips and table headers. */
  name: 'Seller',
  /** For running text, mid-sentence and at the start of a sentence. */
  inSentence: 'the seller',
  sentenceStart: 'The seller',
  category: 'business-intelligence and embedded-analytics tool',
  site: 'seller.example',
  docs: 'docs.seller.example',
  /** The MCP connection agents find in the facts panel, for deeper or gated questions. */
  mcpUrl: 'seller.doorbell.example/mcp',
}

export const competitors = [
  { name: 'Competitor 1', site: 'competitor1.example' },
  { name: 'Competitor 2', site: 'competitor2.example' },
] as const

export const [competitor1, competitor2] = competitors

export const buyer = {
  company: 'MIT Capital',
  companyDomain: 'mitcapital.example',
  size: 40,
  industry: 'fintech',
  person: 'Julie Sharp',
  firstName: 'Julie',
  title: 'Head of Operations',
  initials: 'JS',
  budget: 25_000,
}

/** The seller's sales rep, who gets the alert and handles anything Doorbell can't answer. */
export const seller = {
  name: 'Jordan Ellis',
  firstName: 'Jordan',
  title: 'Account Executive',
  role: "the seller's sales rep",
  initials: 'JE',
}

/** The buyer's AI is always shown generically, never with a real product's styling. */
export const agent = {
  label: "Buyer's AI browser agent",
  examples: 'ChatGPT Agent, Comet or Claude in Chrome',
}

/** Fictional independent sources the buyer's agent reads first. */
export const independentSources = {
  reviews: 'reviews.example',
  forum: 'opsforum.example',
  benchmark: 'databench.example',
}

/** The one statistic in the demo, shown on the closing screen with its source. */
export const stats = [
  {
    value: '8 in 10',
    text: '8 in 10 B2B tech buyers use AI agents as part of their purchasing process.',
    source: 'IDC research, reported by MarketScale, Aug 2026',
  },
]

export const businessModel = 'Vendors pay a monthly subscription based on agent traffic, with a free tier for small sites.'

/** Today the tag; next, the two standards that let agents talk to vendors directly. */
export const roadmap = [
  { id: 'tag', when: 'Today', name: 'Website tag', text: 'Works with any AI browser that visits your site.' },
  { id: 'webmcp', when: 'Next', name: 'WebMCP', text: 'Agents on your site use tools the page offers. Chrome is testing it now.' },
  { id: 'mcp', when: 'Later', name: 'MCP', text: "Deeper and gated questions from any AI assistant. Agents find the connection in your facts panel." },
]
