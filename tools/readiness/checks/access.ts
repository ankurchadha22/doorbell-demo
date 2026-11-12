// Check 1: what robots.txt tells each named AI agent about the home page and the pricing page.
// Blocking user-triggered fetchers is the worst case (a buyer's assistant can't read you); blocking
// training crawlers is a legitimate choice and is reported neutrally.

import { namedAgents } from '../../../core/agents.ts'
import { detectChallenge } from '../detect.ts'
import { looksLikeHtml } from '../html.ts'
import type { FetchResult } from '../http.ts'
import { contentSignals, decide, parseRobots, type Robots } from '../robots.ts'
import type { AccessEvidence, AgentAccess, CheckResult, Finding } from '../types.ts'

export interface RobotsReading {
  robots: Robots | undefined
  state: AccessEvidence['robots']
  reason?: string
}

/** Interprets the robots.txt response as RFC 9309 says: 4xx means no rules, 5xx or no answer means unknown. */
export function readRobots(res: FetchResult): RobotsReading {
  if (res.status === 0) return { robots: undefined, state: 'could not check', reason: res.error ?? 'no response' }
  const challenge = detectChallenge(res.status, res.headers, res.body)
  if (challenge) return { robots: undefined, state: 'could not check', reason: `bot challenge (${challenge.vendor})` }
  if (res.status >= 500) return { robots: undefined, state: 'could not check', reason: `HTTP ${res.status}` }
  if (res.status >= 400) return { robots: parseRobots(''), state: 'none' }
  // Some sites answer every path with their HTML app shell; that is not a robots.txt.
  if (looksLikeHtml(res.body) || /text\/html/i.test(res.contentType)) return { robots: parseRobots(''), state: 'none', reason: 'served an HTML page' }
  return { robots: parseRobots(res.body), state: 'found' }
}

function ruleText(r: { allow: boolean; pattern: string } | undefined): string | undefined {
  return r ? `${r.allow ? 'Allow' : 'Disallow'}: ${r.pattern}` : undefined
}

export function agentAccess(robots: Robots, pricingPath: string): AgentAccess[] {
  return namedAgents.map((a) => {
    const home = decide(robots, a.token, '/')
    const pricing = decide(robots, a.token, pricingPath)
    const blocking = !home.allowed ? home.rule : !pricing.allowed ? pricing.rule : undefined
    return { token: a.token, operator: a.operator, kind: a.kind, home: home.allowed, pricing: pricing.allowed, named: home.named, rule: ruleText(blocking) }
  })
}

function list(tokens: string[]): string {
  if (tokens.length <= 1) return tokens.join('')
  return tokens.slice(0, -1).join(', ') + ' and ' + tokens[tokens.length - 1]
}

const ASSISTANT: Record<string, string> = {
  OpenAI: 'ChatGPT', Anthropic: 'Claude', Perplexity: 'Perplexity', Mistral: 'Le Chat', DuckDuckGo: 'DuckDuckGo’s assistant', Meta: 'Meta AI',
}

export interface AccessInput {
  robotsUrl: string
  robotsRes: FetchResult
  reading: RobotsReading
  pricingPath: string
  skippedForRobots: string[]
}

export function checkAccess(input: AccessInput): CheckResult<AccessEvidence> {
  const { reading, robotsUrl } = input
  const evidence: AccessEvidence = {
    robotsUrl,
    robots: reading.state,
    httpStatus: input.robotsRes.status,
    pricingPath: input.pricingPath,
    agents: [],
    contentSignals: [],
    sitemaps: [],
    skippedForRobots: input.skippedForRobots,
  }
  if (!reading.robots) {
    return { id: 'access', status: 'could not check', reason: `robots.txt: ${reading.reason}`, evidence, findings: [] }
  }
  const robots = reading.robots
  evidence.agents = agentAccess(robots, input.pricingPath)
  evidence.contentSignals = contentSignals(robots).map((c) => ({ agents: c.agents, raw: c.raw }))
  evidence.sitemaps = robots.sitemaps
  const findings: Finding[] = []
  const blocked = (kind: string) => evidence.agents.filter((a) => a.kind === kind && (!a.home || !a.pricing))
  const ev = (agents: AgentAccess[]) => [{ url: robotsUrl, quote: [...new Set(agents.map((a) => `User-agent: ${a.named ? a.token : '*'} → ${a.rule ?? ''}`))].slice(0, 4).join(' · ') }]
  const where = (agents: AgentAccess[]) => (agents.every((a) => !a.home) ? 'your pages' : 'your pricing page')

  if (reading.state === 'none') {
    findings.push({
      id: 'robots-none', check: 'access', severity: 'info', title: 'No robots.txt, so every agent may read your site',
      detail: `${robotsUrl} ${reading.reason ? `${reading.reason}` : `returned HTTP ${input.robotsRes.status}`}. With no rules, all crawlers and AI fetchers are allowed by default.`,
      evidence: [{ url: robotsUrl, value: `HTTP ${input.robotsRes.status}` }],
    })
  }

  const users = blocked('user fetch')
  if (users.length) {
    const one = users.length === 1 ? users[0] : undefined
    const viaStar = users.every((a) => !a.named)
    findings.push({
      id: 'robots-user-fetch-blocked', check: 'access', severity: 'critical',
      title: one
        ? `Your robots.txt blocks ${ASSISTANT[one.operator] ?? one.operator}’s user-triggered fetcher (${one.token})`
        : `Your robots.txt blocks the fetchers AI assistants use when a buyer asks about you: ${list(users.map((a) => a.token))}`,
      detail: one
        ? `When a buyer asks ${ASSISTANT[one.operator] ?? one.operator} about you, it opens ${where(users)} with ${one.token}. Your robots.txt tells it not to, so ${ASSISTANT[one.operator] ?? one.operator} cannot open ${where(users)} when a buyer asks about you.`
        : `These fetchers only visit when a person asks an assistant about you. Your robots.txt tells them not to open ${where(users)}${viaStar ? ' (through the rules for all unnamed agents, User-agent: *)' : ''}, so assistants that honour robots.txt cannot read you for that buyer.`,
      evidence: ev(users),
      fix: `Allow ${list(users.map((a) => a.token))} in robots.txt, e.g. "User-agent: ${users[0].token}" followed by "Allow: /". They fetch single pages on a person's request; they are not bulk crawlers.`,
    })
  }

  const search = blocked('search crawler')
  if (search.length) {
    findings.push({
      id: 'robots-search-blocked', check: 'access', severity: 'high',
      title: `AI search crawlers are told not to index ${where(search)}: ${list(search.map((a) => a.token))}`,
      detail: 'These crawlers build the index that AI search answers draw on (ChatGPT search, Claude search, Perplexity). Pages they may not crawl are unlikely to be cited when buyers research your category.',
      evidence: ev(search),
      fix: `Allow ${list(search.map((a) => a.token))} in robots.txt, at least for your home, product and pricing pages.`,
    })
  }

  const training = blocked('training crawler')
  const other = blocked('crawler')
  if (training.length || other.length) {
    findings.push({
      id: 'robots-training-blocked', check: 'access', severity: 'info',
      title: `You opt out of ${list([...training, ...other].map((a) => a.token))}`,
      detail: `${training.length ? 'Blocking AI training crawlers is a legitimate choice' : 'Blocking these crawlers is a legitimate choice'} and does not stop assistants from reading your pages when a buyer asks${users.length ? ' (that is decided by the user-triggered fetchers above)' : ''}.`,
      evidence: ev([...training, ...other]),
    })
  }

  if (!users.length && !search.length) {
    findings.push({
      id: 'robots-open', check: 'access', severity: 'good',
      title: 'Assistants and AI search crawlers may read your home and pricing pages',
      detail: `None of the ${evidence.agents.filter((a) => a.kind === 'user fetch' || a.kind === 'search crawler').length} user-triggered fetchers and AI search crawlers we track is blocked by your robots.txt.`,
      evidence: [{ url: robotsUrl, value: reading.state === 'found' ? 'robots.txt read' : 'no robots.txt' }],
    })
  }

  if (evidence.contentSignals.length) {
    findings.push({
      id: 'content-signals', check: 'access', severity: 'info', title: 'Your robots.txt states Content Signals',
      detail: 'Content Signals say how content may be used after it is fetched (search, AI input, AI training). They are a statement of preference, not an access rule.',
      evidence: evidence.contentSignals.slice(0, 3).map((c) => ({ url: robotsUrl, quote: `User-agent: ${c.agents.join(', ')} → Content-Signal: ${c.raw}` })),
    })
  }

  if (input.skippedForRobots.length) {
    findings.push({
      id: 'robots-closed-to-us', check: 'access', severity: 'info',
      title: 'Some pages are closed to unnamed agents, so we did not fetch them',
      detail: 'Your robots.txt disallows these paths for agents it does not name (User-agent: *). This scan follows those rules, so related checks are marked "could not check".',
      evidence: input.skippedForRobots.slice(0, 5).map((url) => ({ url })),
    })
  }

  return { id: 'access', status: 'ok', evidence, findings }
}
