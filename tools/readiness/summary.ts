// Batch outputs: one CSV row per domain and aggregate statistics. Every percentage is printed with
// the counts behind it, and its denominator is only the domains where that check could run.

import { namedAgents } from '../../core/agents.ts'
import type { ScanResult } from './types.ts'

export interface Row {
  [column: string]: string | number | boolean | null
}

const yes = (b: boolean | undefined) => (b ? 'yes' : 'no')

export function summaryRow(r: ScanResult): Row {
  const { access, reachability, pricing, facts, machine, help } = r.checks
  const a = access.status === 'ok'
  const blocked = (kind: string) => (a ? access.evidence.agents.filter((x) => x.kind === kind && (!x.home || !x.pricing)).map((x) => x.token).join(' ') : null)
  const p = pricing.status === 'ok' ? pricing.evidence : undefined
  const fact = (id: string) => (facts.status === 'ok' ? yes(facts.evidence.items.find((i) => i.id === id)?.found) : null)
  const m = machine.status === 'ok' ? machine.evidence : undefined
  const row: Row = {
    domain: r.domain,
    score: r.score.total,
    grade: r.score.grade,
    robots: access.evidence.robots,
    blocked_user_fetchers: blocked('user fetch'),
    blocked_search_crawlers: blocked('search crawler'),
    blocked_training_crawlers: blocked('training crawler'),
    content_signal: a ? access.evidence.contentSignals.map((c) => c.raw).join(' | ') : null,
    home_status: reachability.evidence.httpStatus,
    home_challenge: reachability.evidence.challenge?.vendor ?? '',
    home_empty_shell: yes(reachability.evidence.emptyShell),
    pricing_url: p?.url ?? '',
    price_in_html: p ? yes(p.visiblePaidPrice) : null,
    price_needs_js: p ? yes(p.pricesNeedJs) : null,
    rendered: p?.rendered ?? null,
    contact_sales: p ? yes(p.gating.length > 0) : null,
    free_trial: p ? yes(Boolean(p.trial)) : null,
    trial_days: p?.trial?.days ?? '',
    free_plan: p ? yes(Boolean(p.freePlan)) : null,
    annual_discount: p ? yes(Boolean(p.annualDiscount)) : null,
    plans: p?.plans.join(' / ') ?? '',
    soc2: fact('soc2'),
    iso27001: fact('iso27001'),
    gdpr: fact('gdpr'),
    hipaa: fact('hipaa'),
    sso: fact('sso'),
    data_residency: fact('residency'),
    self_hosted: fact('selfhost'),
    support_sla: fact('support'),
    trust_page: facts.status === 'ok' ? yes(Boolean(facts.evidence.trustLink)) : null,
    integrations_page: facts.status === 'ok' ? yes(Boolean(facts.evidence.integrationsLink)) : null,
    llms_txt: m ? yes(m.llmsTxt.exists) : null,
    llms_full_txt: m ? yes(m.llmsFullTxt.exists) : null,
    jsonld_types: m?.jsonLdTypes.join(' ') ?? '',
    jsonld_offer_price: m ? yes(m.offerWithPrice) : null,
    markdown: m ? yes(Boolean(m.markdownAlternate) || m.acceptMarkdown.works) : null,
    sitemap: m ? yes(m.sitemap.present) : null,
    meta_description: m ? yes(Boolean(m.metaDescription)) : null,
    well_known: m?.wellKnown.filter((w) => w.exists).map((w) => w.path).join(' ') ?? '',
    site_search: help.status === 'ok' ? yes(Boolean(help.evidence.search)) : null,
    chat_widget: help.evidence.chat.map((c) => c.vendor).join(' '),
    ai_addressed: help.status === 'ok' ? yes(Boolean(help.evidence.aiAddressed)) : null,
  }
  return row
}

function csvCell(v: Row[string]): string {
  const s = v === null ? 'could not check' : String(v)
  // Quote everything that could break a row, and defuse spreadsheet formulas from scanned text.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
  return /[",\n\r]/.test(safe) || safe !== s ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function toCsv(rows: Row[]): string {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  return [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c] ?? '')).join(','))].join('\n') + '\n'
}

export interface Stat {
  label: string
  count: number
  of: number
  pct: number | null
}

const stat = (label: string, count: number, of: number): Stat => ({ label, count, of, pct: of ? Math.round((count / of) * 1000) / 10 : null })

export function median(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

export interface Summary {
  domains: number
  failed: string[]
  medianScore: number | null
  grades: Record<string, number>
  scoreBins: Record<string, number>
  stats: Stat[]
}

export function summarize(results: ScanResult[], failed: string[] = []): Summary {
  const robotsOk = results.filter((r) => r.checks.access.status === 'ok')
  const pricingOk = results.filter((r) => r.checks.pricing.status === 'ok')
  const withPage = pricingOk.filter((r) => r.checks.pricing.evidence.url)
  const rendered = withPage.filter((r) => r.checks.pricing.evidence.rendered === 'yes')
  const machineOk = results.filter((r) => r.checks.machine.status === 'ok')
  const factsOk = results.filter((r) => r.checks.facts.status === 'ok')
  const reach = results.filter((r) => r.checks.reachability.status === 'ok')
  const stats: Stat[] = []
  for (const a of namedAgents.filter((x) => x.kind === 'user fetch' || x.kind === 'search crawler')) {
    const n = robotsOk.filter((r) => r.checks.access.evidence.agents.some((x) => x.token === a.token && (!x.home || !x.pricing))).length
    stats.push(stat(`block ${a.token} (${a.kind}) in robots.txt`, n, robotsOk.length))
  }
  stats.push(stat('block at least one user-triggered fetcher', robotsOk.filter((r) => r.checks.access.evidence.agents.some((x) => x.kind === 'user fetch' && (!x.home || !x.pricing))).length, robotsOk.length))
  stats.push(stat('block at least one AI training crawler', robotsOk.filter((r) => r.checks.access.evidence.agents.some((x) => x.kind === 'training crawler' && !x.home)).length, robotsOk.length))
  stats.push(stat('challenge or refuse our plain fetch from a cloud server', reach.filter((r) => r.checks.reachability.evidence.challenge || r.checks.reachability.evidence.httpStatus !== 200).length, reach.length))
  stats.push(stat('have no pricing page we could find', pricingOk.filter((r) => !r.checks.pricing.evidence.url).length, pricingOk.length))
  stats.push(stat('show no price in the pricing page HTML', withPage.filter((r) => !r.checks.pricing.evidence.visiblePaidPrice).length, withPage.length))
  stats.push(stat('show prices only with JavaScript (of pages rendered)', rendered.filter((r) => r.checks.pricing.evidence.pricesNeedJs).length, rendered.length))
  stats.push(stat('show no price at all, even rendered (of pages rendered)', rendered.filter((r) => !r.checks.pricing.evidence.visiblePaidPrice && !r.checks.pricing.evidence.pricesNeedJs).length, rendered.length))
  stats.push(stat('say "contact sales" or similar on the pricing page', withPage.filter((r) => r.checks.pricing.evidence.gating.length).length, withPage.length))
  stats.push(stat('state a free trial', withPage.filter((r) => r.checks.pricing.evidence.trial).length, withPage.length))
  stats.push(stat('name SOC 2 or ISO 27001 on the pages read', factsOk.filter((r) => r.checks.facts.evidence.items.some((i) => (i.id === 'soc2' || i.id === 'iso27001') && i.found)).length, factsOk.length))
  stats.push(stat('have an llms.txt', machineOk.filter((r) => r.checks.machine.evidence.llmsTxt.exists).length, machineOk.length))
  stats.push(stat('have JSON-LD on the home page', machineOk.filter((r) => r.checks.machine.evidence.jsonLdTypes.length).length, machineOk.length))
  stats.push(stat('have any well-known agent file', machineOk.filter((r) => r.checks.machine.evidence.wellKnown.some((w) => w.exists)).length, machineOk.length))
  const scores = results.map((r) => r.score.total).filter((x): x is number => x !== null)
  const grades: Record<string, number> = {}
  const scoreBins: Record<string, number> = {}
  for (const r of results) grades[r.score.grade] = (grades[r.score.grade] ?? 0) + 1
  for (const x of scores) {
    const lo = Math.min(90, Math.floor(x / 10) * 10)
    const key = `${lo}–${lo === 90 ? 100 : lo + 9}`
    scoreBins[key] = (scoreBins[key] ?? 0) + 1
  }
  return { domains: results.length, failed, medianScore: median(scores), grades, scoreBins, stats }
}

export function summaryMarkdown(s: Summary, scannedAt: string): string {
  const pct = (x: Stat) => (x.pct === null ? 'n/a' : `${x.pct}%`)
  const bins = Object.keys(s.scoreBins).sort((a, b) => parseInt(a) - parseInt(b))
  return [
    '# AI-agent readiness: batch summary',
    '',
    `${s.domains} domains scanned (${scannedAt.slice(0, 10)}). ${s.failed.length ? `${s.failed.length} failed: ${s.failed.join(', ')}.` : ''}`,
    '',
    `Median score: ${s.medianScore ?? 'n/a'} (over ${Object.values(s.scoreBins).reduce((a, b) => a + b, 0)} domains with a score).`,
    '',
    '| Share of domains that… | % | count |',
    '|---|---:|---:|',
    ...s.stats.map((x) => `| ${x.label} | ${pct(x)} | ${x.count} of ${x.of} |`),
    '',
    'Denominators count only domains where that check could run.',
    '',
    '## Grades',
    '',
    '| Grade | Domains |',
    '|---|---:|',
    ...['A', 'B', 'C', 'D', 'F', '–'].filter((g) => s.grades[g]).map((g) => `| ${g} | ${s.grades[g]} |`),
    '',
    '## Score distribution',
    '',
    '| Score | Domains |',
    '|---|---:|',
    ...bins.map((b) => `| ${b} | ${s.scoreBins[b]} |`),
    '',
  ].join('\n')
}
