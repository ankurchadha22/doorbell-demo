// The only way the scanner talks to a site. It sends an honest User-Agent, waits between requests
// to the same host, stops at a per-scan budget, caps time and body size, retries at most once, and
// refuses paths that robots.txt closes to unnamed agents.

import { LIMITS, TOOL_NAME, USER_AGENT, type Limits } from './config.ts'
import { decide, type Robots } from './robots.ts'

export interface FetchResult {
  url: string
  finalUrl: string
  status: number
  contentType: string
  headers: Record<string, string>
  body: string
  truncated: boolean
  ms: number
  /** Network error, timeout or a skipped request. status is 0 then. */
  error?: string
  skipped?: 'robots' | 'budget'
}

export interface RequestLog {
  url: string
  status: number
  ms: number
  note?: string
}

// Shared across every scan in the process, so a batch never hits one host faster than the limit.
const nextSlot = new Map<string, number>()

async function waitForSlot(host: string, gapMs: number) {
  const now = Date.now()
  const at = Math.max(now, nextSlot.get(host) ?? 0)
  nextSlot.set(host, at + gapMs)
  if (at > now) await new Promise((r) => setTimeout(r, at - now))
}

/** Headers kept in the evidence: enough to explain a block or a content type, nothing personal. */
const KEEP_HEADERS = ['content-type', 'content-length', 'server', 'cf-mitigated', 'cf-ray', 'location', 'x-robots-tag', 'retry-after', 'vary', 'link']

async function readCapped(res: Response, maxBytes: number): Promise<{ text: string; truncated: boolean }> {
  if (!res.body) return { text: '', truncated: false }
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  let truncated = false
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (size + value.byteLength > maxBytes) {
      chunks.push(value.subarray(0, maxBytes - size))
      truncated = true
      await reader.cancel().catch(() => {})
      break
    }
    chunks.push(value)
    size += value.byteLength
  }
  return { text: new TextDecoder('utf-8', { fatal: false }).decode(Buffer.concat(chunks)), truncated }
}

export interface FetchOptions {
  accept?: string
  /** robots.txt itself is never gated. */
  ignoreRobots?: boolean
  note?: string
}

export class PoliteFetcher {
  limits: Limits
  robots: Robots | undefined
  /** The origin robots.txt was read from; only paths on it are gated. */
  robotsOrigin: string | undefined
  used = 0
  log: RequestLog[] = []
  blockedByRobots: string[] = []

  constructor(limits: Partial<Limits> = {}) {
    this.limits = { ...LIMITS, ...limits }
  }

  remaining(): number {
    return this.limits.maxRequests - this.used
  }

  /** Whether robots.txt lets an unnamed agent (the `*` group, or a group naming this tool) fetch the URL. */
  allowedByRobots(url: string): boolean {
    if (!this.robots || !this.robotsOrigin) return true
    const u = new URL(url)
    if (u.origin !== this.robotsOrigin) return true
    return decide(this.robots, TOOL_NAME, u.pathname + u.search).allowed
  }

  /** Takes one unit of the budget for a request made elsewhere (the browser's page load). */
  async reserve(url: string, note: string): Promise<boolean> {
    if (this.remaining() <= 0) return false
    this.used++
    await waitForSlot(new URL(url).host, this.limits.minIntervalMs)
    this.log.push({ url, status: -1, ms: 0, note })
    return true
  }

  async get(url: string, opts: FetchOptions = {}): Promise<FetchResult> {
    const empty = (extra: Partial<FetchResult>): FetchResult => ({
      url, finalUrl: url, status: 0, contentType: '', headers: {}, body: '', truncated: false, ms: 0, ...extra,
    })
    if (!opts.ignoreRobots && !this.allowedByRobots(url)) {
      this.blockedByRobots.push(url)
      this.log.push({ url, status: 0, ms: 0, note: 'skipped: disallowed by robots.txt' })
      return empty({ skipped: 'robots', error: 'disallowed by robots.txt for unnamed agents' })
    }
    if (this.remaining() <= 0) {
      this.log.push({ url, status: 0, ms: 0, note: 'skipped: request budget used up' })
      return empty({ skipped: 'budget', error: 'request budget used up' })
    }
    this.used++
    let result = await this.once(url, opts)
    for (let i = 0; i < this.limits.retries; i++) {
      const retryable = (result.error && !/timeout/i.test(result.error)) || result.status === 429 || result.status >= 500
      if (!retryable) break
      await new Promise((r) => setTimeout(r, 2000))
      result = await this.once(url, { ...opts, note: 'retry' })
    }
    return result
  }

  private async once(url: string, opts: FetchOptions): Promise<FetchResult> {
    const started = Date.now()
    let current = url
    try {
      for (let hop = 0; ; hop++) {
        await waitForSlot(new URL(current).host, this.limits.minIntervalMs)
        const res = await fetch(current, {
          redirect: 'manual',
          signal: AbortSignal.timeout(this.limits.timeoutMs),
          headers: {
            'user-agent': USER_AGENT,
            accept: opts.accept ?? 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
            'accept-language': 'en',
          },
        })
        const location = res.headers.get('location')
        if (res.status >= 300 && res.status < 400 && location && hop < this.limits.maxRedirects) {
          await res.body?.cancel().catch(() => {})
          this.log.push({ url: current, status: res.status, ms: Date.now() - started, note: 'redirect' })
          const next = new URL(location, current).href
          // A redirect into a path robots.txt closes is not followed.
          if (!opts.ignoreRobots && !this.allowedByRobots(next)) {
            this.blockedByRobots.push(next)
            return { url, finalUrl: next, status: 0, contentType: '', headers: {}, body: '', truncated: false, ms: Date.now() - started, skipped: 'robots', error: 'redirect target disallowed by robots.txt' }
          }
          current = next
          continue
        }
        const headers: Record<string, string> = {}
        for (const h of KEEP_HEADERS) {
          const v = res.headers.get(h)
          if (v) headers[h] = v.slice(0, 300)
        }
        const { text, truncated } = await readCapped(res, this.limits.maxBytes)
        const ms = Date.now() - started
        this.log.push({ url: current, status: res.status, ms, note: opts.note })
        return { url, finalUrl: current, status: res.status, contentType: headers['content-type'] ?? '', headers, body: text, truncated, ms }
      }
    } catch (e) {
      const err = e as Error & { cause?: { code?: string; message?: string } }
      const timeout = err.name === 'TimeoutError' || err.name === 'AbortError'
      const error = timeout ? `timeout after ${this.limits.timeoutMs / 1000} s` : (err.cause?.code ?? err.cause?.message ?? err.message)
      const ms = Date.now() - started
      this.log.push({ url: current, status: 0, ms, note: `error: ${error}` })
      return { url, finalUrl: current, status: 0, contentType: '', headers: {}, body: '', truncated: false, ms, error }
    }
  }
}
