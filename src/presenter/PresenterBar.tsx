import { ChevronLeft, ChevronRight, Keyboard, Pause, Play, RotateCcw } from 'lucide-react'
import { useState, type MouseEvent } from 'react'
import { acts, steps } from '../data/story'
import { useDemo } from './useStep'

/** Mouse clicks should not leave focus on a bar button, or a later Space press would hit it again. */
const blurOnClick = (e: MouseEvent<HTMLButtonElement>) => {
  if (e.detail > 0) e.currentTarget.blur()
}

const shortcuts: [string, string][] = [
  ['→ / Space', 'Next (first press finishes typing)'],
  ['←', 'Previous'],
  ['A', 'Auto-play on / off'],
  ['R', 'Reset to the title'],
  ['B', 'Before / After (vendor view)'],
  ['1 2 3', 'Jump to act 1, 2 or 3'],
  ['4', 'Jump to the closing slide'],
]

export function PresenterBar() {
  const demo = useDemo()
  const { step, current, total, autoplay } = demo
  const [showKeys, setShowKeys] = useState(false)

  const btn =
    'inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[0.9375rem] font-medium text-white/90 hover:bg-white/10 disabled:opacity-35 disabled:hover:bg-transparent'

  return (
    <div className="relative z-30 col-span-full bg-bar text-white">
      {/* Auto-play dwell indicator for the current step */}
      {autoplay && (
        <div className="absolute inset-x-0 top-0 h-[3px] bg-white/10">
          <div
            key={`${step}-${demo.resetKey}`}
            className="h-full bg-accent-soft"
            style={{ animation: `dwell ${current.dwellMs}ms linear both` }}
          />
        </div>
      )}
      <style>{'@keyframes dwell { from { width: 0 } to { width: 100% } }'}</style>

      <div className="flex h-[3.75rem] items-center gap-4 px-4">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-white/60">{acts[current.act]}</div>
          <div className="truncate text-[0.9375rem] font-semibold" aria-live="polite">
            {current.label}
          </div>
        </div>

        <div className="flex items-center gap-1" role="group" aria-label="Presenter controls">
          <button type="button" className={btn} onClick={(e) => { blurOnClick(e); demo.prev() }} disabled={step === 0} aria-label="Previous step">
            <ChevronLeft aria-hidden className="size-4.5" />
            Prev
          </button>
          <button
            type="button"
            onClick={(e) => { blurOnClick(e); demo.next() }}
            disabled={step === total - 1 && demo.settled}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-[0.9375rem] font-semibold text-white hover:bg-accent-strong disabled:opacity-40"
          >
            Next
            <ChevronRight aria-hidden className="size-4.5" />
          </button>
          <button type="button" className={btn} onClick={(e) => { blurOnClick(e); demo.toggleAutoplay() }} aria-pressed={autoplay}>
            {autoplay ? <Pause aria-hidden className="size-4" /> : <Play aria-hidden className="size-4" />}
            {autoplay ? 'Pause' : 'Auto-play'}
          </button>
          <button type="button" className={btn} onClick={(e) => { blurOnClick(e); demo.reset() }}>
            <RotateCcw aria-hidden className="size-4" />
            Reset
          </button>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <ol className="hidden items-center gap-[3px] lg:flex" aria-label="Story progress">
            {steps.map((s, i) => {
              const firstOfAct = i > 0 && steps[i - 1].act !== s.act
              return (
                <li key={s.id} className={firstOfAct ? 'ml-1.5' : ''}>
                  <button
                    type="button"
                    onClick={(e) => { blurOnClick(e); demo.goTo(i) }}
                    title={`${i + 1}. ${s.label}`}
                    aria-label={`Go to step ${i + 1}: ${s.label}`}
                    aria-current={i === step ? 'step' : undefined}
                    className={`block h-2.5 w-1.5 rounded-full transition-colors ${
                      i === step ? 'bg-accent-soft' : i < step ? 'bg-white/50' : 'bg-white/18 hover:bg-white/35'
                    }`}
                  />
                </li>
              )
            })}
          </ol>
          <span className="tnum text-sm text-white/70 whitespace-nowrap">
            {step + 1} / {total}
          </span>
          <div className="relative">
            <button
              type="button"
              className={btn}
              onClick={(e) => { blurOnClick(e); setShowKeys((v) => !v) }}
              aria-expanded={showKeys}
              aria-controls="presenter-keys"
            >
              <Keyboard aria-hidden className="size-4" />
              Keys
            </button>
            {showKeys && (
              <div
                id="presenter-keys"
                className="absolute right-0 bottom-12 w-72 rounded-xl border border-white/10 bg-bar-2 p-3 shadow-xl"
              >
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                  {shortcuts.map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="font-mono text-accent-soft">{k}</dt>
                      <dd className="text-white/80">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
