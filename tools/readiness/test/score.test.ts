import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkAccess, readRobots } from '../checks/access.ts'
import { checkFacts } from '../checks/facts.ts'
import { checkHelp } from '../checks/help.ts'
import { checkMachine } from '../checks/machine.ts'
import { checkPricing } from '../checks/pricing.ts'
import { checkReachability } from '../checks/reachability.ts'
import type { FetchResult } from '../http.ts'
import { renderReport } from '../report.ts'
import { grade, rankFindings, score } from '../score.ts'
import { summarize, summaryRow, toCsv } from '../summary.ts'
import type { Checks, ScanResult } from '../types.ts'

const res = (url: string, status: number, body: string, contentType = 'text/html'): FetchResult => ({
  url, finalUrl: url, status, contentType, headers: { 'content-type': contentType }, body, truncated: false, ms: 1,
})

const HOME = `<html><head><meta name="description" content="Acme analytics"></head><body>
<nav><a href="/pricing">Pricing</a><a href="/security">Security</a><a href="/integrations">Integrations</a></nav>
<h1>Acme</h1><p>${'Analytics for teams. '.repeat(20)} SOC 2 Type II. SAML SSO. Hosted in the EU.</p></body></html>`
const PRICING = '<html><body><h2>Starter</h2><p>$20 per user / month</p><h2>Pro</h2><p>$40 per user / month</p><p>14-day free trial. Save 20% with annual billing.</p></body></html>'

function checksFor(robotsTxt: string, pricingHtml: string, render?: string): Checks {
  const robotsRes = res('https://acme.test/robots.txt', 200, robotsTxt, 'text/plain')
  const reading = readRobots(robotsRes)
  const home = res('https://acme.test/', 200, HOME)
  const pricing = res('https://acme.test/pricing', 200, pricingHtml)
  return {
    access: checkAccess({ robotsUrl: robotsRes.url, robotsRes, reading, pricingPath: '/pricing', skippedForRobots: [] }),
    reachability: checkReachability(home),
    pricing: checkPricing({ url: pricing.url, foundVia: 'pricing path', tried: ['/pricing'], res: pricing, render: render ? { html: render, status: 200 } : undefined, renderState: render ? 'yes' : 'skipped' }),
    facts: checkFacts({ pages: [{ url: home.url, text: 'SOC 2 Type II. SAML SSO. Hosted in the EU.' }], links: [{ href: '/security', url: 'https://acme.test/security', text: 'Security' }, { href: '/integrations', url: 'https://acme.test/integrations', text: 'Integrations' }] }),
    machine: checkMachine({ homeUrl: home.url, homeHtml: HOME, llms: res('https://acme.test/llms.txt', 404, ''), sitemapDeclared: ['https://acme.test/sitemap.xml'], wellKnown: [] }),
    help: checkHelp({ pages: [{ url: home.url, html: HOME, text: '' }] }),
  }
}

const findingsOf = (c: Checks) => Object.values(c).flatMap((x) => x.findings)

test('a well-prepared site scores high; blocking a user-triggered fetcher costs points and ranks first', () => {
  const good = checksFor('User-agent: *\nAllow: /\n', PRICING)
  const s1 = score(good, findingsOf(good))
  assert.ok(s1.total !== null && s1.total >= 70, `score ${s1.total}`)
  const bad = checksFor('User-agent: ChatGPT-User\nDisallow: /\n', PRICING)
  const s2 = score(bad, findingsOf(bad))
  assert.ok((s2.total ?? 0) < (s1.total ?? 0))
  assert.equal(s2.topFindings[0].id, 'robots-user-fetch-blocked')
  assert.match(s2.topFindings[0].title, /ChatGPT’s user-triggered fetcher \(ChatGPT-User\)/)
})

test('training crawlers blocked are neutral: no points lost, not ranked as a fix', () => {
  const c = checksFor('User-agent: GPTBot\nUser-agent: ClaudeBot\nDisallow: /\n', PRICING)
  const s = score(c, findingsOf(c))
  assert.equal(s.categories.find((x) => x.id === 'access')?.points, 25)
  assert.ok(!s.topFindings.some((f) => f.id === 'robots-training-blocked'))
  assert.equal(c.access.findings.find((f) => f.id === 'robots-training-blocked')?.severity, 'info')
})

test('prices that need JavaScript are found and score less than prices in the HTML', () => {
  const js = checksFor('', '<html><body><div id="root"></div><script src="/app.js"></script></body></html>', PRICING)
  assert.equal(js.pricing.evidence.pricesNeedJs, true)
  assert.ok(js.pricing.findings.some((f) => f.id === 'prices-need-js'))
  const html = checksFor('', PRICING)
  const p = (c: Checks) => score(c, findingsOf(c)).categories.find((x) => x.id === 'pricing')?.points ?? 0
  assert.ok(p(js) < p(html))
})

test('a check that could not run is excluded from the score, not scored zero', () => {
  const c = checksFor('User-agent: *\nAllow: /\n', PRICING)
  const full = score(c, findingsOf(c)).total
  const blockedRobots = res('https://acme.test/robots.txt', 503, '')
  c.access = checkAccess({ robotsUrl: blockedRobots.url, robotsRes: blockedRobots, reading: readRobots(blockedRobots), pricingPath: '/pricing', skippedForRobots: [] })
  const reach = res('https://acme.test/', 403, '<title>Just a moment...</title>')
  c.reachability = checkReachability(reach)
  const s = score(c, findingsOf(c))
  assert.equal(c.access.status, 'could not check')
  // Reachability ran (it found a challenge), so Access is scored on its 5 reachability points alone.
  const access = s.categories.find((x) => x.id === 'access')
  assert.equal(access?.points, 0)
  c.reachability = { ...c.reachability, status: 'could not check' }
  const s2 = score(c, findingsOf(c))
  assert.equal(s2.categories.find((x) => x.id === 'access')?.points, null)
  // The total is rescaled over the 75 points that were checked.
  const rest = s2.categories.filter((x) => x.id !== 'access').reduce((n, x) => n + (x.points ?? 0), 0)
  assert.equal(s2.total, Math.round((rest / 75) * 100))
  assert.notEqual(s2.total, full)
})

test('grades and ranking', () => {
  assert.equal(grade(90), 'A')
  assert.equal(grade(54), 'D')
  assert.equal(grade(null), '–')
  const ranked = rankFindings([
    { id: 'a', check: 'machine', severity: 'low', title: '', detail: '', evidence: [] },
    { id: 'b', check: 'pricing', severity: 'high', title: '', detail: '', evidence: [] },
    { id: 'c', check: 'access', severity: 'high', title: '', detail: '', evidence: [] },
    { id: 'd', check: 'access', severity: 'good', title: '', detail: '', evidence: [] },
  ])
  assert.deepEqual(ranked.map((f) => f.id), ['c', 'b', 'a'])
})

function scanResult(c: Checks, domain = 'acme.test'): ScanResult {
  const findings = findingsOf(c)
  return {
    tool: { name: 'agent-readiness-check', version: '0.1', userAgent: 'UA' }, input: domain, domain, origin: `https://${domain}`,
    scannedAt: '2026-11-12T10:00:00.000Z', durationMs: 1, browser: false, requests: [], checks: c, findings, score: score(c, findings),
  }
}

test('the report escapes scanned content everywhere it appears', () => {
  const evil = '<script>alert(1)</script><img src=x onerror=alert(2)>"\''
  const c = checksFor('User-agent: ChatGPT-User\nDisallow: /' + evil + '\n', `<html><body><h2>Pro</h2><p>Contact sales ${evil}</p></body></html>`)
  c.facts.findings.push({ id: 'x', check: 'facts', severity: 'high', title: evil, detail: evil, evidence: [{ url: `https://acme.test/${evil}`, quote: evil, value: evil }], fix: evil })
  const html = renderReport(scanResult(c, 'acme.test'))
  assert.ok(!html.includes('<script>alert'), 'raw script tag in report')
  assert.ok(!/<img\b/i.test(html), 'raw img tag in report')
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
  assert.ok(!/<script\b/i.test(html), 'the report has no scripts at all')
  assert.ok(!/(src|href)=["']?https?:/i.test(html), 'the report loads nothing external')
  assert.match(html, /<title>AI-agent readiness report: acme\.test<\/title>/)
  assert.match(html, /Scan by Doorbell/)
})

test('summary rows, CSV and aggregate counts', () => {
  const a = scanResult(checksFor('User-agent: ChatGPT-User\nDisallow: /\n', PRICING), 'a.test')
  const b = scanResult(checksFor('', '<p>Contact sales</p>'), 'b.test')
  const s = summarize([a, b])
  const chat = s.stats.find((x) => x.label.startsWith('block ChatGPT-User'))
  assert.deepEqual([chat?.count, chat?.of, chat?.pct], [1, 2, 50])
  const noPrice = s.stats.find((x) => x.label.startsWith('show no price in the pricing page HTML'))
  assert.deepEqual([noPrice?.count, noPrice?.of], [1, 2])
  const csv = toCsv([summaryRow(a), { ...summaryRow(b), plans: '=HYPERLINK("x"), "q"' }])
  assert.equal(csv.split('\n')[0].split(',')[0], 'domain')
  assert.match(csv, /"'=HYPERLINK\(""x""\), ""q"""/)
})

test('a /pricing that redirects to a contact form is reported as such', () => {
  const page = res('https://acme.test/company/contact-us', 200, '<html><body><h1>Contact us</h1><p>Request a demo</p></body></html>')
  const c = checkPricing({ url: page.url, foundVia: 'pricing path', tried: ['/pricing'], res: page, renderState: 'skipped', redirectedTo: page.url })
  assert.equal(c.findings[0].id, 'pricing-redirects-to-contact')
  assert.match(c.findings[0].title, /redirects to \/company\/contact-us/)
})
