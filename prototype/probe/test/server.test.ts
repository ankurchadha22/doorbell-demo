// End to end: starts the probe on free ports with a temporary log, then visits it as a named AI
// fetcher, as a signed agent, through the ask box, and in headless Chromium driven by Playwright
// (the automation control run, x1). Then checks the log and the report.

import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { chromium } from 'playwright'
import { groupVisits, renderReport, summarize, type LogRecord } from '../report.ts'
import { startProbe } from '../server.ts'
import { jwkThumbprint } from '../webBotAuth.ts'

const { publicKey, privateKey } = generateKeyPairSync('ed25519')
const jwk = publicKey.export({ format: 'jwk' })

let probe: Awaited<ReturnType<typeof startProbe>>
let dataDir: string

before(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'probe-test-'))
  probe = await startProbe({
    sitePort: 0,
    collectorPort: 0,
    dataDir,
    fetchKeys: async (url) => {
      assert.equal(url, 'https://agent.test/.well-known/http-message-signatures-directory')
      return [jwk]
    },
  })
})

after(async () => {
  await probe.close()
  await rm(dataDir, { recursive: true, force: true })
})

async function records(): Promise<LogRecord[]> {
  await probe.flushed()
  const text = await readFile(probe.logFile(), 'utf8').catch(() => '')
  return text.split('\n').filter(Boolean).map((l) => JSON.parse(l) as LogRecord)
}

/** Waits for the log to satisfy a condition: beacons arrive a moment after the page does. */
async function waitFor(check: (rs: LogRecord[]) => boolean, ms = 8000) {
  const end = Date.now() + ms
  for (;;) {
    const rs = await records()
    if (check(rs)) return rs
    if (Date.now() > end) throw new Error('timed out waiting for log records')
    await new Promise((r) => setTimeout(r, 200))
  }
}

/** Same fallback as scripts/walkthrough.ts, plus PW_EXECUTABLE for a browser at a fixed path. */
async function launch() {
  if (process.env.PW_EXECUTABLE) return chromium.launch({ executablePath: process.env.PW_EXECUTABLE })
  try {
    return await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' })
  } catch {
    return await chromium.launch()
  }
}

const httpFor = (rs: LogRecord[], ua: string) => rs.find((r) => r.type === 'http' && r.ua === ua)

test('serves the vendor page with the facts panel, and spots a named AI fetcher', async () => {
  const ua = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot'
  const res = await fetch(`${probe.siteOrigin}/pricing`, { headers: { 'user-agent': ua } })
  const html = await res.text()
  assert.equal(res.status, 200)
  assert.match(html, /Facts for AI assistants/)
  assert.match(html, /\$40 <span>per user \/ month/)
  assert.match(html, new RegExp(`src="${probe.collectorOrigin}/tag.js"`))
  const rs = await waitFor((rs) => Boolean(httpFor(rs, ua)))
  const rec = httpFor(rs, ua)
  assert.ok(rec?.type === 'http')
  assert.equal(rec.uaCheck.named?.token, 'ChatGPT-User')
  assert.equal(rec.signature.present, false)
})

test('verifies a Web Bot Auth signature on a page request', async () => {
  const authority = new URL(probe.siteOrigin).host
  const created = Math.floor(Date.now() / 1000) - 5
  const params = `("@authority" "signature-agent";key="sig1");created=${created};expires=${created + 300};keyid="${jwkThumbprint(jwk)}";alg="ed25519";tag="web-bot-auth"`
  const base = `"@authority": ${authority}\n"signature-agent";key="sig1": "https://agent.test"\n"@signature-params": ${params}`
  const ua = 'Mozilla/5.0 (signed test agent)'
  await fetch(`${probe.siteOrigin}/trust`, {
    headers: {
      'user-agent': ua,
      'signature-agent': 'sig1="https://agent.test"',
      'signature-input': `sig1=${params}`,
      signature: `sig1=:${sign(null, Buffer.from(base), privateKey).toString('base64')}:`,
    },
  })
  const rs = await waitFor((rs) => Boolean(httpFor(rs, ua)))
  const rec = httpFor(rs, ua)
  assert.ok(rec?.type === 'http')
  assert.equal(rec.signature.reason, 'verified')
  assert.equal(rec.signature.agent, 'https://agent.test')
})

test('ask box answers approved facts and sends the rest to a person', async () => {
  const form = await fetch(`${probe.siteOrigin}/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'q=' + encodeURIComponent('Is there a free trial?'),
  })
  assert.match(await form.text(), /passed your question to a person/)

  const json = await fetch(`${probe.siteOrigin}/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ q: 'How much is Growth for 40 users with embedding?' }),
  })
  const data = (await json.json()) as { decision: string; sources: { url: string }[] }
  assert.equal(data.decision, 'answer')
  assert.deepEqual(data.sources.map((s) => s.url).sort(), ['/docs/embedding', '/pricing'])

  const discount = await fetch(`${probe.siteOrigin}/ask?q=${encodeURIComponent('Can we get a bigger discount on the price?')}`)
  assert.match(await discount.text(), /passed your question to a person/)

  const rs = await waitFor((rs) => rs.filter((r) => r.type === 'ask').length >= 3)
  const asks = rs.filter((r) => r.type === 'ask')
  assert.deepEqual(
    asks.map((a) => [a.decision, a.via]),
    [
      ['escalate', 'form'],
      ['answer', 'tag'],
      ['escalate', 'url'],
    ],
  )
})

test('escapes what visitors type', async () => {
  const html = await (await fetch(`${probe.siteOrigin}/search?q=${encodeURIComponent('<script>alert(1)</script>')}`)).text()
  assert.doesNotMatch(html, /<script>alert/)
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  const none = await (await fetch(`${probe.siteOrigin}/search?q=free+trial`)).text()
  assert.match(none, /No results for “free trial”/)
})

test('records a headless browser run through the tag, and reports it', async () => {
  const browser = await launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    await page.goto(`${probe.siteOrigin}/start/x1`)
    await page.getByRole('link', { name: 'See pricing' }).click()
    await page.waitForURL('**/pricing')
    await page.getByLabel('Ask a question').fill('Is there a free trial?')
    await page.getByRole('button', { name: 'Ask' }).click()
    await page.getByRole('status').filter({ hasText: 'passed your question' }).waitFor()
    await page.getByRole('link', { name: 'Trust', exact: true }).click()
    await page.waitForURL('**/trust')
    await waitFor((rs) => rs.some((r) => r.type === 'beacon' && r.beacon.page === '/trust' && r.beacon.kind === 'load'))
  } finally {
    await browser.close()
  }

  const rs = await waitFor((rs) => rs.some((r) => r.type === 'beacon' && r.beacon.events.some((e) => e.type === 'ask-submit')))
  const visit = groupVisits(rs).map(summarize).find((v) => v.run === 'x1')
  assert.ok(visit, 'the x1 run is grouped into one visit')
  assert.deepEqual(visit.pages, ['/start/x1', '/pricing', '/trust'])
  assert.equal(visit.agent, 'Playwright (automation control)')
  assert.equal(visit.jsRan, true)
  assert.equal(visit.tagLoaded, true)
  assert.equal(visit.pixelLoaded, true)
  assert.equal(visit.signals?.webdriver, true)
  assert.equal(visit.headless, true)
  assert.deepEqual(visit.asks, [{ question: 'Is there a free trial?', decision: 'escalate', via: 'tag' }])
  // Playwright's fill() inserts text without key presses: the tell the tag looks for.
  assert.equal(visit.keydowns, 0)
  assert.ok(visit.inputs >= 1)
  assert.ok(visit.clicks >= 3)

  const report = renderReport([visit], new Map(), { lines: rs.length, files: ['test'] })
  assert.match(report, /### x1 · Playwright \(automation control\)/)
  assert.match(report, /\| Playwright \(automation control\) \| 1 \|/)
  assert.match(report, /“Is there a free trial\?” → escalate \(via tag\)/)
})
