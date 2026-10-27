// Act 3: the weekly report. Simulated numbers for the fictional vendor.
// These are illustrative only and are always labeled as simulated in the UI.

import type { Channel } from './types'

export const insightsPeriod = 'This week · simulated data'

export const headline = [
  { label: 'AI agent visits', value: 214 },
  { label: 'Matched to a company', value: 88, note: '41% of visits' },
  { label: 'Left without an answer', value: 37, note: 'Asked something your site doesn’t answer' },
]

export const usageByChannel: { channel: Channel; label: string; value: number; unit: string }[] = [
  { channel: 'page', label: 'Page reads', value: 1284, unit: 'page reads' },
  { channel: 'facts', label: 'Facts panel reads', value: 412, unit: 'reads' },
  { channel: 'ask', label: 'Ask box questions', value: 96, unit: 'questions' },
  { channel: 'mcp', label: 'MCP questions', value: 58, unit: 'questions' },
]

export const agentTypes = [
  { label: 'AI browser agents', share: 71 },
  { label: 'Assistant page fetches', share: 23 },
  { label: 'Unknown', share: 6 },
]

/** What agents were trying to find out, by number of visits. */
export const topMissions = [
  { text: 'Price for a given team size', count: 88 },
  { text: 'Stripe or QuickBooks connections', count: 74 },
  { text: 'Embedded dashboards', count: 61 },
  { text: 'SOC 2 and security', count: 47 },
  { text: 'Each customer sees only their own data', count: 39 },
  { text: 'Annual discount', count: 22 },
]

/** Things agents looked for and couldn't find on the vendor's site. */
export const contentGaps = [
  { id: 'gap-trial', text: 'Is there a free trial?', asked: 14, endedThere: 9 },
  { id: 'gap-eu', text: 'Can data stay in the EU?', asked: 11, endedThere: 5 },
  { id: 'gap-onprem', text: 'Is there an on-premise option?', asked: 8, endedThere: 4 },
]
