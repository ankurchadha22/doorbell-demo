// The single ordered script for the presenter flow.
// Both the buyer and seller views derive their state from the index into this array.

import { buyerSteps } from './buyerScript'
import { product, vendor } from './config'
import { sellerSteps } from './sellerEvents'
import type { Screen, Step } from './types'

export const steps: Step[] = [
  { id: 'title', act: 0, screen: 'title', label: 'Press Next or → to start', dwellMs: 6000 },
  ...buyerSteps,
  ...sellerSteps,
  { id: 'i-insights', act: 3, screen: 'insights', label: 'Insights: what agents ask', dwellMs: 9000 },
  { id: 'i-gaps', act: 3, screen: 'insights', label: 'Insights: content gaps', dwellMs: 7000, spotlight: 'gaps' },
  { id: 'p-policies', act: 3, screen: 'policies', label: 'Policies: what the desk may do', dwellMs: 8000 },
  { id: 'setup', act: 3, screen: 'setup', label: 'Setup: live in minutes', dwellMs: 7000 },
  { id: 'closing', act: 4, screen: 'closing', label: 'Three doors, one source of truth', dwellMs: 12000 },
]

export const acts: Record<Step['act'], string> = {
  0: `${product.name} concept demo`,
  1: "Act 1 · What the buyer's agent does",
  2: `Act 2 · What ${vendor.inSentence} sees`,
  3: 'Act 3 · Insight and controls',
  4: 'Closing',
}

export const routes: Record<Screen, string> = {
  title: '/',
  buyer: '/buyer',
  seller: '/seller',
  insights: '/insights',
  policies: '/policies',
  setup: '/setup',
  closing: '/closing',
}

const indexById = new Map(steps.map((s, i) => [s.id, i]))

/** Index of a step by id. Throws on a typo so broken references fail the build check early. */
export function stepIndex(id: string): number {
  const i = indexById.get(id)
  if (i === undefined) throw new Error(`Unknown step id: ${id}`)
  return i
}

export const firstStepOfAct = (act: Step['act']) => steps.findIndex((s) => s.act === act)
