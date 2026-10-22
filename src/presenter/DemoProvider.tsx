// Presenter state: step index, entrance animations, auto-play, keyboard and reset.
// Every view derives what it shows from `step`, so the buyer and seller sides stay in sync.

import { useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { firstStepOfAct, routes, steps } from '../data/story'
import { scheduleFor } from '../lib/schedule'
import { DemoCtx, type DemoContext, type DemoState, type SellerMode } from './useStep'

type State = DemoState

type Action =
  | { type: 'advance' }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'goto'; index: number; animate: boolean }
  | { type: 'settle' }
  | { type: 'reset' }
  | { type: 'autoplay'; on: boolean }
  | { type: 'seller'; mode: SellerMode | null }

const LAST = steps.length - 1

const initial: State = {
  step: 0,
  settled: true,
  autoplay: false,
  sellerOverride: null,
  resetKey: 0,
  navNonce: 0,
}

function moveTo(s: State, index: number, animate: boolean): State {
  const step = Math.max(0, Math.min(LAST, index))
  return { ...s, step, settled: !animate, sellerOverride: null, navNonce: s.navNonce + 1 }
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'advance':
      if (s.step >= LAST) return { ...s, autoplay: false, settled: true }
      return moveTo(s, s.step + 1, true)
    case 'next':
      // First press finishes any running animation (e.g. typing); the next press advances.
      if (!s.settled) return { ...s, settled: true }
      if (s.step >= LAST) return s
      return moveTo(s, s.step + 1, true)
    case 'prev':
      return s.step === 0 ? s : moveTo(s, s.step - 1, false)
    case 'goto':
      return moveTo(s, a.index, a.animate)
    case 'settle':
      return s.settled ? s : { ...s, settled: true }
    case 'reset':
      return { ...initial, resetKey: s.resetKey + 1, navNonce: s.navNonce + 1 }
    case 'autoplay':
      return { ...s, autoplay: a.on }
    case 'seller':
      return { ...s, sellerOverride: a.mode }
  }
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

/** Elements that Space activates natively. Links are not among them, so Space still advances after a nav click. */
function isActivatable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const role = el.getAttribute('role')
  return ['BUTTON', 'SUMMARY'].includes(el.tagName) || role === 'switch' || role === 'checkbox'
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial)
  const navigate = useNavigate()
  const location = useLocation()
  const current = steps[state.step]

  // Expose presenter state on <html> for the walkthrough script (and for debugging in devtools).
  useEffect(() => {
    const d = document.documentElement.dataset
    d.step = String(state.step)
    d.stepId = current.id
    d.settled = String(state.settled)
    d.autoplay = String(state.autoplay)
  }, [state.step, state.settled, state.autoplay, current.id])

  // Finish entrance animations after their scheduled time.
  useEffect(() => {
    if (state.settled) return
    const t = window.setTimeout(() => dispatch({ type: 'settle' }), scheduleFor(current).totalMs)
    return () => window.clearTimeout(t)
  }, [state.settled, state.step, state.resetKey, current])

  // Auto-play: dwell on each step for its scripted time, then advance.
  useEffect(() => {
    if (!state.autoplay) return
    const t = window.setTimeout(() => dispatch({ type: 'advance' }), current.dwellMs)
    return () => window.clearTimeout(t)
  }, [state.autoplay, state.step, state.resetKey, current])

  // Presenter actions move the screen to the step's route. Free navigation does not change the step.
  // Tracking the handled nonce (not a "first run" flag) keeps deep links working under StrictMode.
  const handledNav = useRef(state.navNonce)
  useEffect(() => {
    if (state.navNonce === handledNav.current) return
    handledNav.current = state.navNonce
    const target = routes[steps[state.step].screen]
    if (location.pathname !== target) navigate(target)
    // Re-runs on location changes are no-ops (the nonce is already handled), so free navigation sticks.
  }, [state.navNonce, state.step, location.pathname, navigate])

  const sellerMode: SellerMode = state.sellerOverride ?? current.seller?.mode ?? 'after'

  const api = useMemo(() => {
    const next = () => dispatch({ type: 'next' })
    const prev = () => dispatch({ type: 'prev' })
    const goTo = (index: number, animate = false) => dispatch({ type: 'goto', index, animate })
    const jumpToAct = (act: 1 | 2 | 3 | 4) => goTo(firstStepOfAct(act), true)
    const reset = () => dispatch({ type: 'reset' })
    const toggleAutoplay = () => dispatch({ type: 'autoplay', on: !state.autoplay })
    const setSellerMode = (mode: SellerMode) => {
      const scripted = current.seller?.mode ?? 'after'
      const following = steps[state.step + 1]
      // On the scripted "Before" step, flipping to After plays the next step, so the reveal continues in order.
      if (mode === 'after' && scripted === 'before' && following?.seller?.mode === 'after') {
        goTo(state.step + 1, true)
        return
      }
      dispatch({ type: 'seller', mode: mode === scripted ? null : mode })
    }
    const toggleSellerMode = () => setSellerMode(sellerMode === 'before' ? 'after' : 'before')
    return { next, prev, goTo, jumpToAct, reset, toggleAutoplay, setSellerMode, toggleSellerMode }
  }, [state.autoplay, state.step, sellerMode, current])

  // Keyboard shortcuts.
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isTypingTarget(e.target)) return
      const key = e.key
      // Let a focused button handle its own Space so a press is never counted twice.
      if (key === ' ' && isActivatable(e.target)) return

      switch (key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault()
          api.next()
          break
        case 'ArrowLeft':
          e.preventDefault()
          api.prev()
          break
        case 'r':
        case 'R':
          api.reset()
          break
        case 'a':
        case 'A':
          api.toggleAutoplay()
          break
        case 'b':
        case 'B':
          if (location.pathname === routes.seller) api.toggleSellerMode()
          break
        case '1':
        case '2':
        case '3':
        case '4':
          api.jumpToAct(Number(key) as 1 | 2 | 3 | 4)
          break
      }
    },
    [api, location.pathname],
  )

  useEffect(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onKey])

  const value: DemoContext = {
    ...state,
    current,
    total: steps.length,
    sellerMode,
    ...api,
  }

  return <DemoCtx.Provider value={value}>{children}</DemoCtx.Provider>
}
