// All scoring rules in one place. Each category has a weight (its maximum points) and a list of
// rules that award points from the evidence. A category whose check could not run is left out of
// the total instead of scoring zero, and the total is rescaled to 100 over what was checked.

import type { Checks, CategoryScore, Finding, Score, Severity } from './types.ts'

export const WEIGHTS = { access: 25, pricing: 30, facts: 20, machine: 15, help: 10 }

/** Share of the Access weight that comes from plain-fetch reachability. Kept small on purpose: the scan runs from a datacenter IP. */
export const REACHABILITY_POINTS = 5

export const GRADES: [number, string][] = [[85, 'A'], [70, 'B'], [55, 'C'], [40, 'D'], [0, 'F']]

export const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 9, good: 9 }

/** How many findings make the "what to fix first" list. */
export const TOP_FINDINGS = 5

interface Rule {
  note: string
  points: number
}

const clamp = (n: number, max: number) => Math.max(0, Math.min(max, n))

function accessRules(c: Checks): { rules: Rule[]; max: number } | null {
  const robotsMax = WEIGHTS.access - REACHABILITY_POINTS
  const rules: Rule[] = []
  let max = 0
  if (c.access.status === 'ok') {
    max += robotsMax
    const blocked = (kind: string) => c.access.evidence.agents.filter((a) => a.kind === kind && (!a.home || !a.pricing)).length
    // Each blocked user-triggered fetcher costs 8, each AI search crawler 3. Training crawlers cost nothing.
    const penalty = Math.min(16, blocked('user fetch') * 8) + Math.min(6, blocked('search crawler') * 3)
    rules.push({ note: `robots.txt: ${blocked('user fetch')} user-triggered fetchers and ${blocked('search crawler')} AI search crawlers blocked`, points: clamp(robotsMax - penalty, robotsMax) })
  }
  if (c.reachability.status === 'ok') {
    max += REACHABILITY_POINTS
    const r = c.reachability.evidence
    const ok = r.httpStatus === 200 && !r.challenge
    rules.push({ note: ok ? (r.emptyShell ? 'home page reachable but nearly empty without JavaScript' : 'home page reachable by a plain fetcher') : 'plain fetch from a cloud server was blocked or failed', points: ok ? (r.emptyShell ? 2 : REACHABILITY_POINTS) : 0 })
  }
  return max ? { rules, max } : null
}

function pricingRules(c: Checks): Rule[] | null {
  if (c.pricing.status !== 'ok') return null
  const p = c.pricing.evidence
  if (!p.url) return [{ note: 'no pricing page found', points: 0 }]
  const priceNote = p.visiblePaidPrice ? 'prices visible without JavaScript' : p.pricesNeedJs ? 'prices only with JavaScript' : 'no prices found'
  return [
    { note: 'pricing page found', points: 6 },
    { note: priceNote, points: p.visiblePaidPrice ? 12 : p.pricesNeedJs ? 4 : 0 },
    { note: p.trial || p.freePlan ? 'trial or free plan stated' : 'no trial or free plan stated', points: p.trial || p.freePlan ? 4 : 0 },
    { note: p.trial?.days || p.freePlan ? 'trial length or free plan given' : 'no trial length', points: p.trial?.days || p.freePlan ? 2 : 0 },
    { note: p.plans.length ? `plan names: ${p.plans.join(', ')}` : 'no plan names recognised', points: p.plans.length ? 3 : 0 },
    { note: p.annualDiscount ? 'annual discount stated' : p.annualBilling ? 'annual billing stated' : 'no annual terms', points: p.annualDiscount ? 3 : p.annualBilling ? 2 : 0 },
  ]
}

const FACT_POINTS: Record<string, number> = { soc2: 5, iso27001: 5, gdpr: 1, hipaa: 0, sso: 3, residency: 2, selfhost: 1, support: 2 }

function factsRules(c: Checks): Rule[] | null {
  if (c.facts.status !== 'ok') return null
  const f = c.facts.evidence
  const found = (id: string) => f.items.find((i) => i.id === id)?.found ?? false
  const cert = found('soc2') || found('iso27001')
  return [
    { note: cert ? 'security certification named' : 'no SOC 2 / ISO 27001 found', points: cert ? 5 : 0 },
    { note: f.trustLink ? 'trust or security page linked' : 'no trust or security page link', points: f.trustLink ? 3 : 0 },
    { note: f.integrationsLink ? 'integrations page linked' : 'no integrations page link', points: f.integrationsLink ? 4 : 0 },
    ...(['sso', 'residency', 'selfhost', 'support', 'gdpr'] as const).map((id) => ({ note: `${f.items.find((i) => i.id === id)?.label}: ${found(id) ? 'found' : 'not found'}`, points: found(id) ? FACT_POINTS[id] : 0 })),
  ]
}

function machineRules(c: Checks): Rule[] | null {
  if (c.machine.status !== 'ok') return null
  const m = c.machine.evidence
  return [
    { note: m.llmsTxt.exists ? 'llms.txt present' : 'no llms.txt', points: m.llmsTxt.exists ? 4 : 0 },
    { note: 'llms.txt links pricing or docs', points: m.llmsTxt.exists && (m.llmsTxt.linksToPricing || m.llmsTxt.linksToDocs) ? 1 : 0 },
    { note: m.jsonLdTypes.length ? 'JSON-LD present' : 'no JSON-LD', points: m.jsonLdTypes.length ? 2 : 0 },
    { note: m.offerWithPrice ? 'JSON-LD offer with a price' : 'no priced JSON-LD offer', points: m.offerWithPrice ? 2 : 0 },
    { note: m.markdownAlternate || m.acceptMarkdown.works ? 'markdown version available' : 'no markdown version', points: m.markdownAlternate || m.acceptMarkdown.works ? 2 : 0 },
    { note: m.sitemap.present ? 'sitemap present' : 'no sitemap found', points: m.sitemap.present ? 2 : 0 },
    { note: m.metaDescription ? 'meta description' : 'no meta description', points: m.metaDescription ? 1 : 0 },
    { note: 'well-known agent file', points: m.wellKnown.some((w) => w.exists) ? 1 : 0 },
  ]
}

function helpRules(c: Checks): Rule[] | null {
  if (c.help.status !== 'ok') return null
  const h = c.help.evidence
  return [
    { note: h.search ? 'site search' : 'no site search found', points: h.search ? 3 : 0 },
    { note: h.chat.length ? `chat widget (${h.chat.map((x) => x.vendor).join(', ')})` : 'no chat widget found', points: h.chat.length ? 3 : 0 },
    { note: h.aiAddressed ? 'content addressed to AI assistants' : 'nothing addressed to AI assistants', points: h.aiAddressed ? 4 : 0 },
  ]
}

function category(id: string, label: string, weight: number, rules: Rule[] | null, max = weight): CategoryScore {
  if (!rules) return { id, label, weight, points: null, max: weight, notes: ['could not check'] }
  const points = clamp(rules.reduce((s, r) => s + r.points, 0), max)
  // Rescale when only part of a category could be checked (Access without reachability, say).
  const scaled = max === weight ? points : (points / max) * weight
  return { id, label, weight, points: Math.round(scaled * 10) / 10, max: weight, notes: rules.map((r) => `${r.note} (${r.points})`) }
}

export function grade(total: number | null): string {
  if (total === null) return '–'
  return GRADES.find(([min]) => total >= min)?.[1] ?? 'F'
}

export function rankFindings(findings: Finding[]): Finding[] {
  const order = Object.keys(WEIGHTS)
  const catRank = (f: Finding) => {
    const i = order.indexOf(f.check === 'reachability' ? 'access' : f.check)
    return i < 0 ? 9 : i
  }
  return findings
    .filter((f) => SEVERITY_RANK[f.severity] < 9)
    // Reachability findings are softened: a datacenter block is real but not the vendor's whole story.
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || catRank(a) - catRank(b))
    .slice(0, TOP_FINDINGS)
}

export function score(checks: Checks, findings: Finding[]): Score {
  const access = accessRules(checks)
  const categories = [
    category('access', 'Access', WEIGHTS.access, access?.rules ?? null, access?.max ?? WEIGHTS.access),
    category('pricing', 'Pricing clarity', WEIGHTS.pricing, pricingRules(checks)),
    category('facts', 'Buyer facts', WEIGHTS.facts, factsRules(checks)),
    category('machine', 'Machine-readable', WEIGHTS.machine, machineRules(checks)),
    category('help', 'On-site help', WEIGHTS.help, helpRules(checks)),
  ]
  const checked = categories.filter((c) => c.points !== null)
  const max = checked.reduce((s, c) => s + c.max, 0)
  // With less than half the weight checked, a number would claim more than we know.
  const total = max >= 50 ? Math.round((checked.reduce((s, c) => s + (c.points ?? 0), 0) / max) * 100) : null
  return { total, grade: grade(total), categories, topFindings: rankFindings(findings) }
}
