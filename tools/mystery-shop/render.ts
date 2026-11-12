import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const BRAND = 'Doorbell'

type Status = 'verified' | 'partial' | 'vague' | 'not_found' | 'contradictory' | 'blocked'
type Tone = 'good' | 'warn' | 'bad'

interface Answer {
  q: number
  question: string
  status: Status | string
  answer: string
  source_url: string | null
  quote: string | null
}

interface Fetch {
  url: string
  outcome: string
  note: string
}

export interface Vendor {
  slug: string
  vendor: string
  domain: string
  date: string
  fetches: Fetch[]
  answers: Answer[]
  price: { annual: number | null; basis: string }
  obstacles: string[]
  helped: string
  shortlist: string
  shortlistReason: string
}

const STATUS: Record<string, { label: string; tone: Tone }> = {
  verified: { label: 'Verified', tone: 'good' },
  partial: { label: 'Partly answered', tone: 'warn' },
  vague: { label: 'Mentioned, not specific', tone: 'warn' },
  not_found: { label: 'Not found', tone: 'bad' },
  contradictory: { label: 'Pages disagree', tone: 'bad' },
  blocked: { label: 'Could not load', tone: 'bad' },
}

const SHORTLIST: Record<string, { label: string; tone: Tone }> = {
  yes: { label: 'Shortlisted', tone: 'good' },
  maybe: { label: 'Maybe', tone: 'warn' },
  no: { label: 'Not shortlisted', tone: 'bad' },
}

const QUESTION_COUNT = 6
const QUESTION_SHORT = [
  'Stripe and QuickBooks',
  'Embedding, per-customer data',
  'Annual cost, 40 users',
  'SOC 2 Type II',
  'Free trial',
  'Branding and SSO',
]

export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function safeHref(url: string | null): string | null {
  if (!url) return null
  return /^https?:\/\//i.test(url.trim()) ? url.trim() : null
}

export function statusInfo(status: unknown): { label: string; tone: Tone } {
  return STATUS[String(status)] ?? { label: 'Not found', tone: 'bad' }
}

export function normalize(raw: unknown, slug: string): Vendor {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const answers = Array.isArray(r.answers) ? (r.answers as Record<string, unknown>[]) : []
  const fetches = Array.isArray(r.fetches) ? (r.fetches as Record<string, unknown>[]) : []
  const price = (r.price_estimate && typeof r.price_estimate === 'object' ? r.price_estimate : {}) as Record<string, unknown>
  return {
    slug,
    vendor: str(r.vendor, slug),
    domain: str(r.domain),
    date: str(r.date),
    fetches: fetches
      .filter((f) => f && typeof f === 'object')
      .map((f) => ({ url: str(f.url), outcome: str(f.outcome, 'unknown'), note: str(f.note) })),
    answers: answers
      .filter((a) => a && typeof a === 'object')
      .map((a, i) => ({
        q: typeof a.q === 'number' ? a.q : i + 1,
        question: str(a.question),
        status: str(a.status, 'not_found'),
        answer: str(a.answer),
        source_url: typeof a.source_url === 'string' && a.source_url ? a.source_url : null,
        quote: typeof a.quote === 'string' && a.quote ? a.quote : null,
      }))
      .sort((a, b) => a.q - b.q),
    price: {
      annual: typeof price.annual_usd === 'number' ? price.annual_usd : null,
      basis: str(price.basis),
    },
    obstacles: Array.isArray(r.obstacles) ? r.obstacles.filter((o): o is string => typeof o === 'string') : [],
    helped: str(r.what_would_have_helped),
    shortlist: str(r.would_shortlist),
    shortlistReason: str(r.shortlist_reason),
  }
}

function answerFor(v: Vendor, q: number): Answer | undefined {
  return v.answers.find((a) => a.q === q)
}

export function verifiedCount(v: Vendor): number {
  return v.answers.filter((a) => a.status === 'verified').length
}

function money(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

function formatDate(d: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  if (!m) return d
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const name = months[Number(m[2]) - 1]
  return name ? `${Number(m[3])} ${name} ${m[1]}` : d
}

const CSS = `
:root{color-scheme:light dark;--paper:#eef2f0;--surface:#ffffff;--ink:#16201d;--ink2:#34413d;--muted:#56645f;--line:#d8dfdc;--good:#0f6b57;--good-soft:#e0efe9;--warn:#8a4b00;--warn-soft:#f8eedb;--bad:#a2361f;--bad-soft:#f9e5df;--sans:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;--mono:ui-monospace,"SF Mono",Menlo,monospace}
@media (prefers-color-scheme:dark){:root{--paper:#0f1513;--surface:#171f1c;--ink:#e8eeeb;--ink2:#c4cfca;--muted:#93a29c;--line:#2c3834;--good:#6fd0b5;--good-soft:#173a30;--warn:#f0b866;--warn-soft:#3a2b10;--bad:#f09a85;--bad-soft:#40201a}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 var(--sans);font-variant-numeric:tabular-nums}
a{color:var(--good);text-underline-offset:2px}
.page{max-width:44rem;margin:0 auto;padding:2rem 1rem 3rem}
.wide{max-width:84rem}
.sheet{background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:2rem 1.75rem}
.eyebrow{font-size:.8125rem;color:var(--muted);margin:0 0 1.5rem;letter-spacing:.01em}
.eyebrow b{color:var(--ink2);font-weight:600}
h1{font-size:1.5rem;line-height:1.3;margin:0 0 .5rem;font-weight:650}
h2{font-size:.8125rem;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin:2rem 0 .5rem;font-weight:600}
p{margin:0 0 .75rem}
.verdict{display:flex;gap:.6rem;align-items:baseline;flex-wrap:wrap;color:var(--ink2);margin:0}
.chip{display:inline-block;font-size:.8125rem;font-weight:600;line-height:1.2;padding:.2rem .55rem;border-radius:3px;white-space:nowrap}
.good{background:var(--good-soft);color:var(--good)}
.warn{background:var(--warn-soft);color:var(--warn)}
.bad{background:var(--bad-soft);color:var(--bad)}
.rows{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
.rows>li{padding:1rem 0;border-bottom:1px solid var(--line)}
.q{display:flex;gap:.75rem;align-items:baseline;justify-content:space-between;flex-wrap:wrap;margin-bottom:.35rem}
.q strong{font-weight:600}
.ans{margin:0;color:var(--ink2)}
.ev{margin:.5rem 0 0;font-size:.875rem;color:var(--muted)}
.ev a,.url{font-family:var(--mono);font-size:.8125rem;overflow-wrap:anywhere}
.ev q{display:block;margin-top:.15rem;font-style:italic}
ul.plain{margin:0;padding-left:1.1rem;color:var(--ink2)}
ul.plain li{margin-bottom:.25rem}
.small{font-size:.8125rem;color:var(--muted)}
details{margin-top:1rem}
summary{cursor:pointer;font-size:.875rem;color:var(--ink2)}
.fetches{list-style:none;padding:0;margin:.5rem 0 0;font-size:.8125rem}
.fetches li{padding:.3rem 0;border-bottom:1px solid var(--line);display:flex;gap:.75rem;justify-content:space-between}
.fetches .url{min-width:0}
footer{margin-top:2rem;padding-top:1rem;border-top:1px solid var(--line);font-size:.8125rem;color:var(--muted)}
.strip{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:1px solid var(--line);border-radius:6px;background:var(--surface);margin:1.25rem 0}
.strip div{padding:.75rem 1rem;border-right:1px solid var(--line);border-bottom:1px solid var(--line);margin:0 -1px -1px 0}
.strip .n{font-size:1.375rem;font-weight:650;display:block;line-height:1.2}
.strip .l{font-size:.8125rem;color:var(--muted)}
.tablewrap{overflow-x:auto;border:1px solid var(--line);border-radius:6px;background:var(--surface)}
table{border-collapse:collapse;width:100%;font-size:.875rem}
th,td{padding:.6rem .65rem;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle}
th{font-size:.75rem;color:var(--muted);font-weight:600;white-space:normal;line-height:1.3}
tr:last-child td{border-bottom:0}
td.v{font-weight:600;white-space:nowrap}
td.num{text-align:right;white-space:nowrap}
th.num{text-align:right}
table .chip{font-size:.75rem;padding:.15rem .4rem;white-space:normal;display:inline-block}
table th,table td{padding:.55rem .5rem}
@media (max-width:40rem){.strip{grid-template-columns:repeat(2,1fr)}}
@media (max-width:30rem){.sheet{padding:1.25rem 1rem}.page{padding:1rem .5rem 2rem}h1{font-size:1.3rem}}
@media print{
  :root{--paper:#fff;--surface:#fff;--ink:#16201d;--ink2:#34413d;--muted:#56645f;--line:#d8dfdc;--good:#0f6b57;--good-soft:#e0efe9;--warn:#8a4b00;--warn-soft:#f8eedb;--bad:#a2361f;--bad-soft:#f9e5df}
  body{font-size:10.5pt;line-height:1.4}
  .page{max-width:none;padding:0}
  .sheet{border:0;padding:0}
  .chip{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .rows>li{break-inside:avoid;padding:.6rem 0}
  h2{margin-top:1.25rem;break-after:avoid}
  details>summary{display:none}
  details:not([open])>*{display:block}
  .tablewrap{overflow:visible}
  @page{margin:14mm}
}
`

function head(title: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${esc(title)}</title>
<style>${CSS}</style>
</head>
`
}

function chip(info: { label: string; tone: Tone }): string {
  return `<span class="chip ${info.tone}">${esc(info.label)}</span>`
}

export function headline(v: Vendor): string {
  const n = verifiedCount(v)
  const where = v.domain ? ` on ${v.domain}` : ''
  return `An AI assistant could verify ${n} of a buyer's ${QUESTION_COUNT} questions${where}.`
}

function questionRow(v: Vendor, q: number): string {
  const a = answerFor(v, q)
  const info = statusInfo(a ? a.status : 'not_found')
  const title = a?.question || QUESTION_SHORT[q - 1] || `Question ${q}`
  const href = safeHref(a?.source_url ?? null)
  let ev = ''
  if (href || a?.quote) {
    ev = '<p class="ev">'
    if (href) ev += `Source: <a href="${esc(href)}">${esc(a?.source_url)}</a>`
    if (a?.quote) ev += `<q>${esc(a.quote)}</q>`
    ev += '</p>'
  }
  const text = a?.answer || 'No answer was recorded for this question.'
  return `<li><div class="q"><strong>${q}. ${esc(title)}</strong>${chip(info)}</div><p class="ans">${esc(text)}</p>${ev}</li>`
}

export function renderVendor(v: Vendor): string {
  const sl = SHORTLIST[v.shortlist] ?? { label: 'Not shortlisted', tone: 'bad' as Tone }
  const total = v.fetches.length
  const failed = v.fetches.filter((f) => f.outcome !== 'ok').length
  const priceText =
    v.price.annual !== null
      ? `<p class="ans"><strong>About ${money(v.price.annual)} per year</strong> for 40 users with embedding.</p><p class="small">${esc(v.price.basis)}</p>`
      : `<p class="ans"><strong>No estimate could be computed.</strong> ${esc(v.price.basis)}</p>`
  const obstacles = v.obstacles.length
    ? `<ul class="plain">${v.obstacles.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>`
    : '<p class="ans">Nothing noted.</p>'
  const fetchList = v.fetches.length
    ? `<details><summary>Pages the assistant opened (${total})</summary><ul class="fetches">${v.fetches
        .map((f) => `<li><span class="url">${esc(f.url)}</span><span>${esc(f.outcome)}</span></li>`)
        .join('')}</ul></details>`
    : ''
  const rows = [1, 2, 3, 4, 5, 6].map((q) => questionRow(v, q)).join('')
  const body = `<body>
<main class="page"><article class="sheet">
<p class="eyebrow"><b>AI buyer report</b> &middot; ${esc(v.vendor)} &middot; ${esc(v.domain)} &middot; ${esc(formatDate(v.date))}</p>
<h1>${esc(headline(v))}</h1>
<p class="verdict">${chip(sl)} <span>${esc(v.shortlistReason)}</span></p>

<h2>The buyer's brief</h2>
<p class="ans">A 40-person fintech is evaluating business intelligence tools. The assistant was asked to answer six questions about ${esc(v.vendor)} using only what its own website says, and to name the page behind each answer.</p>

<h2>Six questions</h2>
<ol class="rows" style="list-style:none">${rows}</ol>

<h2>Price</h2>
${priceText}

<h2>What got in the way</h2>
${obstacles}

<h2>What would have helped</h2>
<p class="ans">${esc(v.helped || 'Nothing noted.')}</p>

<h2>How this was done</h2>
<p class="small">One AI assistant (Claude, using its page-fetch tool) made one run on ${esc(formatDate(v.date))}, reading only ${esc(v.vendor)}'s own public pages (${total} pages requested, ${failed} did not load), without submitting forms. Results can differ by assistant and by day. This is a snapshot, not an audit.</p>
${fetchList}

<footer>Prepared with ${esc(BRAND)}</footer>
</article></main>
</body>
</html>
`
  return head(`${v.vendor} - AI buyer report`) + body
}

export interface Summary {
  total: number
  verifiedByQuestion: number[]
  shortlist: { yes: number; maybe: number; no: number }
  blocked: number
  priceFound: number
}

export function isBlocked(v: Vendor): boolean {
  return v.fetches.some((f) => f.outcome === 'blocked')
}

export function summarize(vendors: Vendor[]): Summary {
  const verifiedByQuestion = [1, 2, 3, 4, 5, 6].map(
    (q) => vendors.filter((v) => answerFor(v, q)?.status === 'verified').length,
  )
  return {
    total: vendors.length,
    verifiedByQuestion,
    shortlist: {
      yes: vendors.filter((v) => v.shortlist === 'yes').length,
      maybe: vendors.filter((v) => v.shortlist === 'maybe').length,
      no: vendors.filter((v) => v.shortlist === 'no').length,
    },
    blocked: vendors.filter(isBlocked).length,
    priceFound: vendors.filter((v) => v.price.annual !== null).length,
  }
}

export function renderIndex(vendors: Vendor[]): string {
  const s = summarize(vendors)
  const stat = (n: string, l: string) => `<div><span class="n">${esc(n)}</span><span class="l">${esc(l)}</span></div>`
  const strip =
    s.verifiedByQuestion.map((n, i) => stat(`${n} of ${s.total}`, `verified: ${QUESTION_SHORT[i]}`)).join('') +
    stat(`${s.shortlist.yes} / ${s.shortlist.maybe} / ${s.shortlist.no}`, 'shortlisted yes / maybe / no') +
    stat(`${s.blocked} of ${s.total}`, 'sites that blocked the assistant on at least one page')
  const sorted = [...vendors].sort((a, b) => a.vendor.localeCompare(b.vendor))
  const rows = sorted
    .map((v) => {
      const cells = [1, 2, 3, 4, 5, 6]
        .map((q) => `<td>${chip(statusInfo(answerFor(v, q)?.status ?? 'not_found'))}</td>`)
        .join('')
      const sl = SHORTLIST[v.shortlist] ?? { label: 'Not shortlisted', tone: 'bad' as Tone }
      const price =
        v.price.annual !== null ? `<span class="chip good">${esc(money(v.price.annual))}</span>` : '<span class="chip bad">No</span>'
      return `<tr><td class="v"><a href="${esc(v.slug)}.html">${esc(v.vendor)}</a></td>${cells}<td>${price}</td><td>${chip(sl)}</td></tr>`
    })
    .join('')
  const heads = QUESTION_SHORT.map((q, i) => `<th>${i + 1}. ${esc(q)}</th>`).join('')
  const dates = [...new Set(vendors.map((v) => v.date).filter(Boolean))].sort()
  const when = dates.length ? (dates.length === 1 ? formatDate(dates[0] ?? '') : `${formatDate(dates[0] ?? '')} to ${formatDate(dates[dates.length - 1] ?? '')}`) : ''
  const body = `<body>
<main class="page wide">
<p class="eyebrow"><b>AI buyer report</b> &middot; comparison of ${s.total} vendors${when ? ` &middot; ${esc(when)}` : ''}</p>
<h1>What an AI assistant could verify about ${s.total} BI vendors</h1>
<p class="ans">Six questions a 40-person fintech would ask, answered only from each vendor's own public website. Click a vendor for its page.</p>
<div class="strip">${strip}</div>
<div class="tablewrap"><table>
<thead><tr><th>Vendor</th>${heads}<th>Price found</th><th>Shortlisted</th></tr></thead>
<tbody>${rows}</tbody>
</table></div>
<footer>One AI assistant, one run per vendor, public pages only. Snapshot, not an audit. Prepared with ${esc(BRAND)}</footer>
</main>
</body>
</html>
`
  return head('AI buyer report - comparison') + body
}

export function renderAll(inDir: string, outDir: string): { vendors: Vendor[]; skipped: string[] } {
  mkdirSync(outDir, { recursive: true })
  const vendors: Vendor[] = []
  const skipped: string[] = []
  const files = readdirSync(inDir).filter((f) => f.endsWith('.json')).sort()
  for (const f of files) {
    const slug = basename(f, '.json')
    try {
      const raw: unknown = JSON.parse(readFileSync(join(inDir, f), 'utf8'))
      const v = normalize(raw, slug)
      vendors.push(v)
      writeFileSync(join(outDir, `${slug}.html`), renderVendor(v))
    } catch (e) {
      skipped.push(`${f}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  writeFileSync(join(outDir, 'index.html'), renderIndex(vendors))
  return { vendors, skipped }
}

function main(): void {
  const args = process.argv.slice(2)
  const get = (name: string, fallback: string): string => {
    const i = args.indexOf(name)
    return i >= 0 && args[i + 1] ? (args[i + 1] as string) : fallback
  }
  const inDir = resolve(get('--in', 'private/data/mystery'))
  const outDir = resolve(get('--out', 'private/data/mystery/reports'))
  const { vendors, skipped } = renderAll(inDir, outDir)
  console.log(`Wrote ${vendors.length} vendor pages and index.html to ${outDir}`)
  for (const s of skipped) console.warn(`Skipped ${s}`)
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) main()
