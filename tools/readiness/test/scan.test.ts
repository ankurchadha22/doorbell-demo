// End to end: three local sites imitate a well-prepared vendor, a "contact sales" vendor that
// blocks ChatGPT-User, and a vendor whose prices need JavaScript. The full scan runs against each,
// including the headless browser step. Nothing leaves localhost.

import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import type { Browser } from 'playwright'
import { runBatch } from '../batch.ts'
import { launchBrowser } from '../browser.ts'
import { USER_AGENT } from '../config.ts'
import { PoliteFetcher } from '../http.ts'
import { parseRobots } from '../robots.ts'
import { scanSite } from '../scanner.ts'
import type { ScanResult } from '../types.ts'

interface Hit {
  path: string
  headers: IncomingHttpHeaders
}

type Page = { status?: number; type?: string; body: string }
type Site = (path: string, headers: IncomingHttpHeaders) => Page | undefined

const html = (body: string, head = '') => `<!doctype html><html><head><title>Vendor</title>${head}</head><body>${body}</body></html>`
const filler = '<p>' + 'Our analytics product helps teams answer questions about their business. '.repeat(8) + '</p>'

const prepared: Site = (path, headers) => {
  if (path === '/robots.txt') return { type: 'text/plain', body: 'User-agent: *\nContent-Signal: search=yes, ai-input=yes, ai-train=no\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /\n\nSitemap: /sitemap.xml\n' }
  if (path === '/') {
    if (/text\/markdown/.test(headers.accept ?? '')) return { type: 'text/markdown; charset=utf-8', body: '# Vendor\n\nAnalytics.' }
    return {
      type: 'text/html',
      body: html(
        `<nav><a href="/pricing">Pricing</a> <a href="/security">Security</a> <a href="/integrations">Integrations</a> <a href="/llms.txt">For AI assistants</a></nav>
<form role="search" action="/search"><input name="q"></form><h1>Vendor</h1>${filler}<p>Single sign-on with SAML on Business. EU data residency available.</p>`,
        `<meta name="description" content="Analytics for teams"><link rel="alternate" type="text/markdown" href="/index.md">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"Vendor"},{"@type":"SoftwareApplication","offers":{"@type":"Offer","price":"20","priceCurrency":"USD"}}]}</script>
<script src="https://widget.intercom.io/widget/abc"></script>`,
      ),
    }
  }
  if (path === '/pricing') return { body: html(`<h1>Pricing</h1><h2>Starter</h2><p>$20 per user / month</p><h2>Business</h2><p>$40 per user / month</p><h2>Enterprise</h2><p>Contact sales</p><p>14-day free trial, no card required. Save 20% with annual billing.</p>${filler}`) }
  if (path === '/security') return { body: html(`<h1>Security</h1><p>Vendor is SOC 2 Type II audited and GDPR compliant. 99.9% uptime SLA.</p>${filler}`) }
  if (path === '/llms.txt') return { type: 'text/plain', body: '# Vendor\n\n> Analytics for teams.\n\n- [Pricing](https://vendor.test/pricing)\n- [Docs](https://vendor.test/docs)\n' }
  if (path === '/llms-full.txt') return { type: 'text/plain', body: '# Vendor\n\nEverything.\n' }
  if (path === '/.well-known/mcp.json') return { type: 'application/json', body: '{"name":"vendor","url":"https://vendor.test/mcp"}' }
  return undefined
}

// A single-page app: every unknown path gets the same HTML shell with status 200.
const contactSales: Site = (path) => {
  if (path === '/robots.txt') return { type: 'text/plain', body: 'User-agent: ChatGPT-User\nDisallow: /\n\nUser-agent: *\nDisallow: /.well-known/\nDisallow: /internal\n' }
  if (path === '/') return { body: html(`<nav><a href="/plans">Plans</a> <a href="/internal/x">Internal</a></nav><h1>Enterprise software</h1>${filler}`) }
  if (path === '/plans') return { body: html(`<h1>Plans</h1><h2>Team</h2><p>Talk to sales for a quote.</p><h2>Enterprise</h2><p>Custom pricing. Book a demo.</p>${filler}<p>$0 setup fee.</p>`) }
  if (path === '/pricing') return { status: 404, body: html('<h1>Not found</h1>') }
  return { body: html('<div id="app"></div>') }
}

const jsPricing: Site = (path) => {
  if (path === '/robots.txt') return { status: 404, body: 'not found' }
  if (path === '/') return { body: html(`<nav><a href="/pricing">Pricing</a></nav><h1>Vendor</h1>${filler}`) }
  if (path === '/pricing') return { body: html('<div id="root"><p>Loading…</p></div><script src="/app.js"></script><noscript>Enable JavaScript to see prices</noscript>') }
  if (path === '/app.js') {
    return {
      type: 'text/javascript',
      body: `document.getElementById('root').innerHTML = '<h2>Starter</h2><p>$29 per month</p><h2>Pro</h2><p>$99 per month</p><p>Free plan available.</p>'`,
    }
  }
  return undefined
}

interface Running {
  origin: string
  hits: Hit[]
  server: Server
}

async function start(site: Site): Promise<Running> {
  const hits: Hit[] = []
  const server = createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0]
    hits.push({ path, headers: req.headers })
    const page = site(path, req.headers)
    if (!page) {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found')
      return
    }
    res.writeHead(page.status ?? 200, { 'content-type': page.type ?? 'text/html; charset=utf-8' }).end(page.body)
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  return { origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, hits, server }
}

let browser: Browser
let sites: Running[]
const results: ScanResult[] = []
// Fast for tests; the default is one request per second per host.
const limits = { minIntervalMs: 20, timeoutMs: 8000 }

before(async () => {
  browser = await launchBrowser()
  sites = await Promise.all([start(prepared), start(contactSales), start(jsPricing)])
  results.push(...(await Promise.all(sites.map((s) => scanSite(s.origin, { browser, limits })))))
})

after(async () => {
  await browser?.close()
  for (const s of sites ?? []) s.server.close()
})

test('well-prepared site: prices in HTML, facts, machine-readable signals, high score', () => {
  const r = results[0]
  const { pricing, facts, machine, access, help } = r.checks
  assert.equal(pricing.evidence.visiblePaidPrice, true)
  assert.equal(pricing.evidence.pricesNeedJs, false)
  assert.equal(pricing.evidence.trial?.days, 14)
  assert.ok(pricing.evidence.annualDiscount)
  assert.deepEqual(pricing.evidence.plans, ['Starter', 'Business', 'Enterprise'])
  const found = facts.evidence.items.filter((i) => i.found).map((i) => i.id)
  for (const id of ['soc2', 'gdpr', 'sso', 'residency', 'support']) assert.ok(found.includes(id), `${id} not found`)
  assert.equal(machine.evidence.llmsTxt.exists, true)
  assert.equal(machine.evidence.llmsTxt.linksToPricing, true)
  assert.equal(machine.evidence.llmsFullTxt.exists, true)
  assert.equal(machine.evidence.offerWithPrice, true)
  assert.equal(machine.evidence.acceptMarkdown.works, true)
  assert.ok(machine.evidence.markdownAlternate)
  assert.deepEqual(machine.evidence.wellKnown.filter((w) => w.exists).map((w) => w.path), ['/.well-known/mcp.json'])
  assert.equal(access.evidence.contentSignals.length, 1)
  assert.equal(access.evidence.agents.find((a) => a.token === 'GPTBot')?.home, false)
  assert.ok(help.evidence.search)
  assert.deepEqual(help.evidence.chat.map((c) => c.vendor), ['Intercom'])
  assert.ok(help.evidence.aiAddressed)
  assert.ok((r.score.total ?? 0) >= 85, `score ${r.score.total}`)
  assert.ok(!r.score.topFindings.some((f) => f.severity === 'critical' || f.severity === 'high'))
})

test('contact-sales site: ChatGPT-User blocked ranks first, pricing found via link, gated, HTML fallbacks rejected', () => {
  const r = results[1]
  assert.equal(r.score.topFindings[0].id, 'robots-user-fetch-blocked')
  assert.match(r.score.topFindings[0].title, /ChatGPT-User/)
  const p = r.checks.pricing.evidence
  assert.equal(p.foundVia, 'home page link')
  assert.match(p.url ?? '', /\/plans$/)
  assert.equal(p.visiblePaidPrice, false)
  assert.equal(p.pricesNeedJs, false)
  assert.ok(p.gating.length >= 2)
  assert.ok(r.findings.some((f) => f.id === 'prices-gated'))
  assert.equal(r.checks.machine.evidence.llmsTxt.exists, false)
  assert.match(r.checks.machine.evidence.llmsTxt.reason, /HTML/)
  // robots.txt closes /.well-known/ to unnamed agents: those probes are skipped and never sent.
  assert.ok(r.checks.machine.evidence.wellKnown.every((w) => w.skipped === 'robots'))
  assert.ok(r.checks.access.evidence.skippedForRobots.some((u) => u.includes('/.well-known/')))
  assert.ok((r.score.total ?? 100) < (results[0].score.total ?? 0))
})

test('JS-only pricing site: prices need JavaScript, found by the browser', () => {
  const r = results[2]
  const p = r.checks.pricing.evidence
  assert.equal(r.checks.access.evidence.robots, 'none')
  assert.equal(p.rendered, 'yes')
  assert.equal(p.visiblePaidPrice, false)
  assert.equal(p.pricesNeedJs, true)
  assert.ok((p.renderedTextLength ?? 0) > p.staticTextLength)
  assert.deepEqual(p.renderedPrices.map((x) => x.amount), [29, 99])
  assert.ok(p.freePlan)
  assert.ok(r.score.topFindings.some((f) => f.id === 'prices-need-js'))
})

test('every request is polite and anonymous', () => {
  for (const [i, s] of sites.entries()) {
    const plain = s.hits.filter((h) => h.headers['user-agent'] === USER_AGENT)
    assert.ok(plain.length > 3)
    assert.equal(s.hits[0].path, '/robots.txt', 'robots.txt comes first')
    for (const h of s.hits) {
      const all = JSON.stringify(h)
      assert.doesNotMatch(all, /doorbell/i)
      assert.doesNotMatch(all, /ChatGPT-User|Claude-User|GPTBot|ClaudeBot|PerplexityBot/i, 'never impersonates an AI agent')
      assert.ok(h.headers['user-agent'] === USER_AGENT || /HeadlessChrome\/.* agent-readiness-check\/0\.1$/.test(h.headers['user-agent'] ?? ''), h.headers['user-agent'])
    }
    // Page-level requests within the budget (the browser's script loads are the page's own assets).
    assert.ok(plain.length <= 12, `site ${i}: ${plain.length} requests`)
    if (i === 1) for (const h of s.hits) assert.ok(!h.path.startsWith('/.well-known/'), `fetched disallowed ${h.path}`)
  }
  assert.ok(!sites[1].hits.some((h) => h.path.startsWith('/internal')))
})

test('the fetcher spaces requests per host, stops at its budget, caps bodies and retries once', async () => {
  let calls = 0
  const s = await start((path) => {
    calls++
    if (path === '/flaky' && calls % 2 === 1) return { status: 503, body: 'busy' }
    if (path === '/big') return { body: 'x'.repeat(5000) }
    return { body: 'ok' }
  })
  try {
    const f = new PoliteFetcher({ minIntervalMs: 150, maxRequests: 3, maxBytes: 1000 })
    const t0 = Date.now()
    const a = await f.get(s.origin + '/a')
    const big = await f.get(s.origin + '/big')
    assert.ok(Date.now() - t0 >= 140, 'second request waited for the per-host gap')
    assert.equal(a.status, 200)
    assert.equal(big.body.length, 1000)
    assert.equal(big.truncated, true)
    const flaky = await f.get(s.origin + '/flaky')
    assert.equal(flaky.status, 200, 'retried once after a 503')
    const over = await f.get(s.origin + '/a')
    assert.equal(over.skipped, 'budget')
    f.robots = parseRobots('User-agent: *\nDisallow: /secret\n')
    f.robotsOrigin = s.origin
    f.limits.maxRequests = 10
    const before = s.hits.length
    assert.equal((await f.get(s.origin + '/secret/x')).skipped, 'robots')
    assert.equal(s.hits.length, before, 'a disallowed path is never requested')
  } finally {
    s.server.close()
  }
})

test('batch: summary files, and a second run resumes from the saved JSON', async () => {
  const out = await mkdtemp(join(tmpdir(), 'readiness-batch-'))
  try {
    const targets = sites.map((s) => s.origin)
    const first = await runBatch(targets, { outDir: out, concurrency: 3, limits })
    assert.equal(first.results.length, 3)
    const csv = await readFile(join(out, 'summary.csv'), 'utf8')
    assert.equal(csv.trim().split('\n').length, 4)
    const md = await readFile(join(out, 'summary.md'), 'utf8')
    assert.match(md, /block ChatGPT-User \(user fetch\) in robots\.txt \| 33\.3% \| 1 of 3 \|/)
    const hitsBefore = sites.map((s) => s.hits.length)
    const lines: string[] = []
    await runBatch(targets, { outDir: out, concurrency: 3, limits, log: (l) => lines.push(l) })
    assert.deepEqual(sites.map((s) => s.hits.length), hitsBefore, 'nothing refetched')
    assert.equal(lines.filter((l) => l.startsWith('skip')).length, 3)
    const html = await readFile(join(out, `${first.results[0].domain.replace(/[^a-z0-9.-]+/g, '_')}.html`), 'utf8')
    assert.match(html, /AI-agent readiness report/)
  } finally {
    await rm(out, { recursive: true, force: true })
  }
})
