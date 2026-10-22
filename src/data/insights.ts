// Act 3: vendor-wide insight. Simulated last-30-days numbers for the fictional vendor.
// These are illustrative only and are always labeled as simulated in the UI.

import type { Door } from './types'

export const insightsPeriod = 'Last 30 days · simulated data'

export const interactionsByDoor: { door: Door; label: string; value: number; unit: string }[] = [
  { door: 'website', label: 'Website reads', value: 1284, unit: 'page reads' },
  { door: 'mcp', label: 'MCP questions', value: 412, unit: 'questions' },
  { door: 'form', label: 'Form submissions', value: 96, unit: 'submissions' },
]

/** Agent sessions that reached each buying stage. */
export const stageFunnel = [
  { stage: 'Explore', sessions: 640 },
  { stage: 'Compare', sessions: 410 },
  { stage: 'Shortlist', sessions: 233 },
  { stage: 'Quote', sessions: 96 },
  { stage: 'Choose how to buy', sessions: 41 },
  { stage: 'Negotiate (human)', sessions: 12 },
]

export const topQuestions = [
  { text: 'Do you connect to Stripe?', count: 88 },
  { text: 'What does it cost for N users?', count: 74 },
  { text: 'Can we embed dashboards in our app?', count: 61 },
  { text: 'Is there a SOC 2 Type II report?', count: 47 },
  { text: 'Does each customer see only their own data?', count: 39 },
  { text: 'Is there an annual discount?', count: 22 },
]

/** Questions the desk could not answer from the vendor's content. */
export const contentGaps = [
  { id: 'gap-trial', text: 'Is there a free trial?', asked: 14, endedThere: 9 },
  { id: 'gap-eu', text: 'Can data stay in the EU?', asked: 11, endedThere: 5 },
  { id: 'gap-onprem', text: 'Is there an on-premise option?', asked: 8, endedThere: 4 },
]

export const agentPlatforms = [
  { label: 'Chat assistants', share: 58 },
  { label: 'Browser agents', share: 24 },
  { label: 'Procurement agents', share: 12 },
  { label: 'Unknown', share: 6 },
]
