// The self-contained HTML report card. Everything taken from the scanned site is untrusted, so
// every interpolated value goes through esc(); there are no scripts and no external requests.

import { BRAND } from './config.ts'
import { escapeHtml as esc } from './html.ts'
import type { CategoryScore, Evidence, Finding, ScanResult, Severity } from './types.ts'

const SEVERITY_LABEL: Record<Severity, string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', info: 'Note', good: 'Good' }

const CHECK_LABEL: Record<string, string> = {
  access: 'Access policy (robots.txt)', reachability: 'Reachability for a plain fetcher', pricing: 'Pricing discoverability',
  facts: 'Facts buyers ask about', machine: 'Machine-readable signals', help: 'On-site help',
}

const CSS = `
:root{--paper:#eef2f0;--surface:#fff;--ink:#16201d;--ink2:#34413d;--muted:#56645f;--hair:#d8dfdc;--accent:#0f6b57;--accent-soft:#e0efe9;--warn:#8a4b00;--warn-soft:#f6ead9;--bad:#a2361f;--bad-soft:#f9e5df;
--sans:Inter,ui-sans-serif,system-ui,sans-serif;--mono:ui-monospace,"SF Mono",Menlo,monospace}
@media (prefers-color-scheme:dark){:root{--paper:#0f1513;--surface:#18201d;--ink:#e6ece9;--ink2:#c3cdc9;--muted:#93a29c;--hair:#2c3833;--accent:#4fbf9f;--accent-soft:#17342b;--warn:#e0a458;--warn-soft:#3a2b17;--bad:#ef8a72;--bad-soft:#3d221b}}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 var(--sans);-webkit-font-smoothing:antialiased}
main{max-width:920px;margin:0 auto;padding:40px 16px 64px}
h1{font-size:15px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin:0 0 8px}
h2{font-size:22px;margin:40px 0 16px;letter-spacing:-.01em}
h3{font-size:17px;margin:0 0 4px}
.card{background:var(--surface);border:1px solid var(--hair);border-radius:16px;padding:24px;margin:0 0 16px}
.hero{display:flex;gap:32px;align-items:center;flex-wrap:wrap}
.score{font-size:88px;font-weight:700;line-height:1;letter-spacing:-.04em}
.score small{font-size:28px;color:var(--muted);font-weight:500}
.grade{display:inline-block;font-size:28px;font-weight:700;border-radius:12px;padding:6px 16px;background:var(--accent-soft);color:var(--accent);margin-left:8px;vertical-align:middle}
.domain{font-size:28px;font-weight:700;margin:0;word-break:break-word}
.meta{color:var(--muted);font-size:14px;margin:4px 0 0}
.bars{flex:1;min-width:240px}
.bar{display:grid;grid-template-columns:150px 1fr 70px;gap:12px;align-items:center;font-size:14px;margin:6px 0;color:var(--ink2)}
.track{height:8px;background:var(--paper);border-radius:8px;overflow:hidden}
.fill{height:100%;background:var(--accent);border-radius:8px}
.num{text-align:right;font-family:var(--mono);font-size:13px;color:var(--muted)}
.finding{border-left:4px solid var(--hair);padding-left:16px;margin:0 0 20px}
.finding:last-child{margin-bottom:0}
.sev{display:inline-block;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;border-radius:6px;padding:2px 8px;margin-bottom:6px}
.sev-critical,.sev-high{background:var(--bad-soft);color:var(--bad)}.finding.sev-b-critical,.finding.sev-b-high{border-color:var(--bad)}
.sev-medium,.sev-low{background:var(--warn-soft);color:var(--warn)}.finding.sev-b-medium,.finding.sev-b-low{border-color:var(--warn)}
.sev-good{background:var(--accent-soft);color:var(--accent)}.finding.sev-b-good{border-color:var(--accent)}
.sev-info{background:var(--paper);color:var(--muted)}
p{margin:6px 0;color:var(--ink2)}
.fix{color:var(--ink)}.fix b{color:var(--accent)}
.ev{font-size:13px;color:var(--muted);margin:8px 0 0;padding:0;list-style:none}
.ev li{margin:4px 0;word-break:break-word}
.ev code,.ev q{font-family:var(--mono);font-size:12.5px}
.ev q{color:var(--ink2);quotes:"“" "”"}
.cat-head{display:flex;justify-content:space-between;gap:16px;align-items:baseline;flex-wrap:wrap}
.pts{font-family:var(--mono);font-size:14px;color:var(--muted)}
.notes{font-size:13px;color:var(--muted);margin:8px 0 16px;padding-left:18px}
.na{color:var(--warn)}
footer{color:var(--muted);font-size:13px;margin-top:40px}
footer p{color:var(--muted)}
a{color:var(--accent)}
@media (max-width:560px){.score{font-size:64px}.bar{grid-template-columns:100px 1fr 56px}.card{padding:18px}}
`

function evidenceList(ev: Evidence[]): string {
  const items = ev
    .filter((e) => e.url || e.quote || e.value)
    .map((e) => {
      const parts: string[] = []
      if (e.url) parts.push(`<code>${esc(e.url)}</code>`)
      if (e.value) parts.push(esc(e.value))
      if (e.quote) parts.push(`<q>${esc(e.quote)}</q>`)
      return `<li>${parts.join(' · ')}</li>`
    })
  return items.length ? `<ul class="ev">${items.join('')}</ul>` : ''
}

function findingHtml(f: Finding): string {
  return `<div class="finding sev-b-${f.severity}">
<span class="sev sev-${f.severity}">${SEVERITY_LABEL[f.severity]}</span>
<h3>${esc(f.title)}</h3>
<p>${esc(f.detail)}</p>
${f.fix ? `<p class="fix"><b>Fix:</b> ${esc(f.fix)}</p>` : ''}
${evidenceList(f.evidence)}
</div>`
}

function bar(c: CategoryScore): string {
  const pct = c.points === null ? 0 : (c.points / c.max) * 100
  const num = c.points === null ? '<span class="na">n/a</span>' : `${esc(Math.round(c.points))}/${esc(c.max)}`
  return `<div class="bar"><span>${esc(c.label)}</span><div class="track"><div class="fill" style="width:${pct.toFixed(0)}%"></div></div><span class="num">${num}</span></div>`
}

const CATEGORY_CHECKS: Record<string, string[]> = { access: ['access', 'reachability'], pricing: ['pricing'], facts: ['facts'], machine: ['machine'], help: ['help'] }

export function renderReport(r: ScanResult): string {
  const date = r.scannedAt.slice(0, 10)
  const s = r.score
  const top = s.topFindings
  const sections = s.categories.map((c) => {
    const ids = CATEGORY_CHECKS[c.id] ?? []
    const blocks = ids.map((id) => {
      const check = r.checks[id as keyof typeof r.checks]
      const status = check.status === 'could not check' ? `<p class="na">Could not check: ${esc(check.reason)}. Left out of the score.</p>` : ''
      const list = check.findings.map(findingHtml).join('')
      return `<h3 style="margin-top:12px;font-size:14px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em">${esc(CHECK_LABEL[id])}</h3>${status}${list || (status ? '' : '<p>Nothing to report.</p>')}`
    })
    return `<section class="card"><div class="cat-head"><h2 style="margin:0">${esc(c.label)}</h2><span class="pts">${c.points === null ? 'not scored' : `${esc(Math.round(c.points))} of ${esc(c.max)} points`}</span></div>
<ul class="notes">${c.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>${blocks.join('')}</section>`
  })
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>AI-agent readiness report: ${esc(r.domain)}</title><style>${CSS}</style></head>
<body><main>
<h1>AI-agent readiness report</h1>
<section class="card hero">
<div><p class="domain">${esc(r.domain)}</p><p class="meta">Scanned ${esc(date)} · ${esc(r.origin)}</p>
<div style="margin-top:16px"><span class="score">${s.total === null ? '–' : esc(s.total)}<small>/100</small></span><span class="grade">${esc(s.grade)}</span></div></div>
<div class="bars">${s.categories.map(bar).join('')}</div>
</section>
<h2>What to fix first</h2>
<section class="card">${top.length ? top.map(findingHtml).join('') : '<p>No problems found on the pages we read.</p>'}</section>
<h2>Breakdown</h2>
${sections.join('\n')}
<footer>
<p><b>How this scan works.</b> We visited ${esc(r.domain)} once, from a cloud server, as a plain HTTP client that identifies itself honestly (<code>${esc(r.tool.userAgent)}</code>)${r.browser ? ', and loaded the pricing page once in a headless browser with JavaScript on' : ''}. We read robots.txt first and followed it, made ${esc(r.requests.filter((q) => q.note !== 'redirect').length)} requests at most one per second, and looked only at public pages.</p>
<p><b>Limits.</b> A single visit from a datacenter IP: bot protection may treat it differently from your visitors or from a specific AI agent. "Not found" means not found on the pages we read, not that it isn't true. Some agents ignore robots.txt or use a full browser; this report describes what an agent that follows the rules would see.</p>
<p>Scan by ${esc(BRAND)} · ${esc(r.tool.name)} ${esc(r.tool.version)} · ${esc(r.scannedAt)}</p>
</footer>
</main></body></html>
`
}
