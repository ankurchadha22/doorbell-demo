import { useEffect, useRef } from 'react'

/** Keeps a scroll container pinned to its newest content while content grows (typing, new items),
 *  unless the viewer has scrolled up to read something. Re-pins whenever `pinKey` changes. */
export function useStickToBottom<T extends HTMLElement>(pinKey: unknown) {
  const ref = useRef<T>(null)
  const stick = useRef(true)

  useEffect(() => {
    stick.current = true
    const el = ref.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [pinKey])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onScroll = () => {
      stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48
    }
    const ro = new ResizeObserver(() => {
      if (stick.current) el.scrollTop = el.scrollHeight
    })
    el.addEventListener('scroll', onScroll, { passive: true })
    for (const child of Array.from(el.children)) ro.observe(child)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [])

  return ref
}
