import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { renderAll } from '../render.ts'

const answer = (q: number, status: string, extra: Record<string, unknown> = {}) => ({
  q,
  question: `Question ${q}`,
  status,
  answer: `Answer ${q}`,
  source_url: null,
  quote: null,
  ...extra,
})

const alpha = {
  vendor: 'Alpha <b>Analytics</b>',
  domain: 'alpha.example',
  date: '2026-11-12',
  fetches: [
    { url: 'https://alpha.example/', outcome: 'ok', note: 'Home' },
    { url: 'https://alpha.example/pricing', outcome: 'error', note: '' },
  ],
  answers: [
    answer(1, 'verified', { answer: 'Yes <script>alert(1)</script>', source_url: 'https://alpha.example/x', quote: 'He said "fast" & easy' }),
    answer(2, 'partial'),
    answer(3, 'vague'),
    answer(4, 'not_found'),
    answer(5, 'contradictory'),
    answer(6, 'blocked'),
  ],
  price_estimate: { annual_usd: 12000, basis: 'List price' },
  obstacles: ['Contact sales'],
  what_would_have_helped: 'A pricing page.',
  llms_txt: 'absent',
  would_shortlist: 'yes',
  shortlist_reason: 'Looks good.',
}

const beta = {
  vendor: 'Beta',
  domain: 'beta.example',
  date: '2026-11-12',
  fetches: [{ url: 'https://beta.example/', outcome: 'blocked', note: 'HTTP 405' }],
  answers: [answer(1, 'blocked'), answer(2, 'blocked'), answer(3, 'verified'), null, answer(5, 'blocked')],
  price_estimate: null,
  would_shortlist: 'no',
}

function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'mystery-'))
  const inDir = join(dir, 'in')
  const outDir = join(dir, 'out')
  mkdirSync(inDir)
  writeFileSync(join(inDir, 'alpha.json'), JSON.stringify(alpha))
  writeFileSync(join(inDir, 'beta.json'), JSON.stringify(beta))
  const res = renderAll(inDir, outDir)
  return { outDir, res }
}

test('writes vendor pages and index', () => {
  const { outDir } = setup()
  for (const f of ['alpha.html', 'beta.html', 'index.html']) assert.ok(existsSync(join(outDir, f)), f)
})

test('maps statuses to plain-English labels', () => {
  const html = readFileSync(join(setup().outDir, 'alpha.html'), 'utf8')
  for (const l of ['Verified', 'Partly answered', 'Mentioned, not specific', 'Not found', 'Pages disagree', 'Could not load']) {
    assert.ok(html.includes(`>${l}</span>`), l)
  }
  assert.ok(html.includes('could verify 1 of a buyer'))
  assert.ok(html.includes('Prepared with Doorbell'))
})

test('escapes vendor-supplied strings', () => {
  const html = readFileSync(join(setup().outDir, 'alpha.html'), 'utf8')
  assert.ok(!html.includes('<script>alert(1)'))
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
  assert.ok(html.includes('He said &quot;fast&quot; &amp; easy'))
  assert.ok(html.includes('Alpha &lt;b&gt;Analytics&lt;/b&gt;'))
})

test('missing or null fields do not crash', () => {
  const { outDir, res } = setup()
  assert.deepEqual(res.skipped, [])
  const html = readFileSync(join(outDir, 'beta.html'), 'utf8')
  assert.ok(html.includes('No estimate could be computed'))
  assert.ok(html.includes('Not shortlisted'))
})

test('index summary counts are right', () => {
  const html = readFileSync(join(setup().outDir, 'index.html'), 'utf8')
  assert.ok(html.includes('<span class="n">1 of 2</span><span class="l">verified: Stripe and QuickBooks</span>'))
  assert.ok(html.includes('<span class="n">1 of 2</span><span class="l">verified: Annual cost, 40 users</span>'))
  assert.ok(html.includes('<span class="n">1 / 0 / 1</span>'))
  assert.ok(html.includes('<span class="n">1 of 2</span><span class="l">sites that blocked'))
  assert.ok(html.includes('href="alpha.html"'))
})
