// Deterministic entrance timing for one step. Everything is derived from the step's content,
// so the same step always animates the same way.

import type { Step } from '../data/types'

export const TYPE_MS_PER_CHAR = 25
const START = 150
const GAP = 380
const TIMELINE_STAGGER = 260
const SETTLE_PAD = 250

export interface StepSchedule {
  /** Per chat item: when it appears, and how long its typing runs (0 if not typed). */
  chat: { delay: number; typeMs: number }[]
  /** Per timeline entry: when it appears. */
  timeline: number[]
  /** When every entrance animation on this step has finished. */
  totalMs: number
}

const cache = new Map<string, StepSchedule>()

export function scheduleFor(step: Step): StepSchedule {
  const hit = cache.get(step.id)
  if (hit) return hit

  let t = START
  let firstTypedEnd = 0
  const chat = (step.chat ?? []).map((item) => {
    const typeMs = item.kind === 'user' && item.typed ? item.text.length * TYPE_MS_PER_CHAR : 0
    const entry = { delay: t, typeMs }
    if (typeMs && !firstTypedEnd) firstTypedEnd = t + typeMs
    t += typeMs + GAP
    return entry
  })

  const tlStart = firstTypedEnd || START
  const timeline = (step.timeline ?? []).map((_, i) => tlStart + i * TIMELINE_STAGGER)

  const lastChat = chat.length ? chat[chat.length - 1].delay + chat[chat.length - 1].typeMs : 0
  const lastTimeline = timeline.length ? timeline[timeline.length - 1] : 0
  const totalMs = Math.max(lastChat, lastTimeline, step.animMs ?? 0) + SETTLE_PAD

  const result = { chat, timeline, totalMs }
  cache.set(step.id, result)
  return result
}
