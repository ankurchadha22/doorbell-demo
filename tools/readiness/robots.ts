// A robots.txt parser and matcher that follows RFC 9309: groups of user-agent lines, rules merged
// across every group that names the agent, the longest matching rule wins, Allow wins a tie, and
// `*` and `$` work as wildcards. Also keeps the Sitemap and Content-Signal lines.

export interface RobotsRule {
  allow: boolean
  pattern: string
}

export interface RobotsGroup {
  agents: string[]
  rules: RobotsRule[]
  /** Cloudflare Content Signals, e.g. "search=yes, ai-train=no", kept with the group they sit in. */
  contentSignals: string[]
}

export interface Robots {
  groups: RobotsGroup[]
  sitemaps: string[]
}

export interface ContentSignal {
  agents: string[]
  raw: string
  signals: Record<string, string>
}

export function parseRobots(text: string): Robots {
  const groups: RobotsGroup[] = []
  const sitemaps: string[] = []
  let current: RobotsGroup | undefined
  // True while we are still reading the user-agent lines that open a group.
  let collectingAgents = false

  for (const rawLine of text.replace(/^﻿/, '').split(/\r\n|\r|\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    const colon = line.indexOf(':')
    if (colon < 1) continue
    const key = line.slice(0, colon).trim().toLowerCase().replace(/[\s_]+/g, '-')
    const value = line.slice(colon + 1).trim()

    if (key === 'user-agent') {
      if (!collectingAgents || !current) {
        current = { agents: [], rules: [], contentSignals: [] }
        groups.push(current)
        collectingAgents = true
      }
      if (value) current.agents.push(value)
      continue
    }
    if (key === 'sitemap') {
      // Sitemap lines belong to the file, not to a group, so they don't end one.
      if (value) sitemaps.push(value)
      continue
    }
    if (key === 'allow' || key === 'disallow') {
      collectingAgents = false
      // Rules before any user-agent line belong to no group and are ignored, as crawlers do.
      // An empty Disallow means "allow everything" and adds no rule.
      if (current && value) current.rules.push({ allow: key === 'allow', pattern: value })
      continue
    }
    if (key === 'content-signal') {
      collectingAgents = false
      if (current && value) current.contentSignals.push(value)
      continue
    }
    // Crawl-delay and other extensions end the user-agent run but are otherwise ignored.
    collectingAgents = false
  }
  return { groups, sitemaps }
}

/** The product token of a user-agent line: "ChatGPT-User/1.0" names ChatGPT-User. */
function productToken(value: string): string {
  return value.split(/[\s/]/)[0].toLowerCase()
}

/** Groups that apply to the agent: those naming it, or else the `*` groups. */
export function groupsFor(robots: Robots, token: string): RobotsGroup[] {
  const t = token.toLowerCase()
  const named = robots.groups.filter((g) => g.agents.some((a) => productToken(a) === t))
  if (named.length) return named
  return robots.groups.filter((g) => g.agents.some((a) => a.trim() === '*'))
}

/** Whether a group names this agent itself (as opposed to the agent falling back to `*`). */
export function isNamed(robots: Robots, token: string): boolean {
  const t = token.toLowerCase()
  return robots.groups.some((g) => g.agents.some((a) => productToken(a) === t))
}

// Percent-encoding is compared in one canonical form, so /caf%c3%a9 and /caf%C3%A9 match.
function canonical(path: string): string {
  return path.replace(/%[0-9a-f]{2}/gi, (m) => m.toUpperCase())
}

function patternToRegExp(pattern: string): RegExp {
  const anchored = pattern.endsWith('$')
  const body = anchored ? pattern.slice(0, -1) : pattern
  const source = body
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp('^' + source + (anchored ? '$' : ''))
}

export function ruleMatches(pattern: string, path: string): boolean {
  return patternToRegExp(canonical(pattern)).test(canonical(path))
}

export interface Decision {
  allowed: boolean
  /** The rule that decided it, if any. */
  rule?: RobotsRule
  /** True when a group names the agent; false when it fell back to `*` or nothing applied. */
  named: boolean
}

/** Is `path` (path + query) allowed for the agent with this product token? */
export function decide(robots: Robots, token: string, path: string): Decision {
  const named = isNamed(robots, token)
  if (path === '/robots.txt') return { allowed: true, named }
  let best: RobotsRule | undefined
  for (const g of groupsFor(robots, token)) {
    for (const rule of g.rules) {
      if (!ruleMatches(rule.pattern, path)) continue
      const longer = !best || rule.pattern.length > best.pattern.length
      const tieAllow = best && rule.pattern.length === best.pattern.length && rule.allow && !best.allow
      if (longer || tieAllow) best = rule
    }
  }
  return { allowed: best ? best.allow : true, rule: best, named }
}

export function isAllowed(robots: Robots, token: string, path: string): boolean {
  return decide(robots, token, path).allowed
}

export function contentSignals(robots: Robots): ContentSignal[] {
  const out: ContentSignal[] = []
  for (const g of robots.groups) {
    for (const raw of g.contentSignals) {
      const signals: Record<string, string> = {}
      for (const part of raw.split(',')) {
        const [k, v] = part.split('=').map((s) => s.trim().toLowerCase())
        if (k && v) signals[k] = v
      }
      out.push({ agents: g.agents, raw, signals })
    }
  }
  return out
}
