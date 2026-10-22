// Presenter state shared with every view: step index, entrance animations, auto-play and Before/After.
// The provider that owns this state lives in DemoProvider.tsx.

import { createContext, useContext } from 'react'
import type { Step } from '../data/types'

export type SellerMode = 'before' | 'after'

export interface DemoState {
  step: number
  /** False while the current step's entrance animations (typing, staggered reveals) are running. */
  settled: boolean
  autoplay: boolean
  /** Manual Before/After choice. Cleared whenever the step changes. */
  sellerOverride: SellerMode | null
  /** Incremented on reset; used as a React key so every view remounts with fresh local state. */
  resetKey: number
  /** Incremented whenever a presenter action should move the screen to the step's route. */
  navNonce: number
}

export interface DemoContext extends DemoState {
  current: Step
  total: number
  sellerMode: SellerMode
  next: () => void
  prev: () => void
  goTo: (index: number, animate?: boolean) => void
  /** 1–3 jump to an act; 4 jumps to the closing slide. */
  jumpToAct: (act: 1 | 2 | 3 | 4) => void
  reset: () => void
  toggleAutoplay: () => void
  setSellerMode: (mode: SellerMode) => void
  toggleSellerMode: () => void
}

export const DemoCtx = createContext<DemoContext | null>(null)

/** The current step and presenter controls. Every view derives what it shows from `step`. */
export function useDemo(): DemoContext {
  const ctx = useContext(DemoCtx)
  if (!ctx) throw new Error('useDemo must be used inside <DemoProvider>')
  return ctx
}
