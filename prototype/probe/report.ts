// Turns the probe's raw log into the Step 0 report: one section per test run and a table comparing
// agents. IP addresses are masked, so the report can be shared; the raw log stays in data/.
//
//   npm run probe:report                        reads data/, writes reports/step0.md
//   npm run probe:report -- --since 2026-10-30  only records from that time on
//   npm run probe:report -- --ipinfo            also looks up each IP's network owner at ipinfo.io

import { reverse } from 'node:dns/promises'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { runByCode } from './runs.ts'

/* ---------- Log records ---------- */

interface Base {
  at: string
  surface: 'site' | 'collector'
  ip: string
  ua?: string
  visitor?: string
  run?: string
}

interface HttpRecord extends Base {
  type: 'http'
  method: string
  path: string
  query?: string
  status: number
  uaCheck: { named?: { token: string; operator: string; kind: string }; headless: boolean; genericBot: boolean }
  signature: { present: boolean; verified: boolean; reason: string; agent?: string }
}

interface ClickEvent {
  type: 'click'
  target: string | null
  trusted: boolean
  detail: number
  dx: number | null
  dy: number | null
  msSinceMove: number | null
}

interface Beacon {
  kind: string
  visitorId?: string
  pageId: string
  run?: string | null
  page: string
  t: number
  counters: Record<string, number | null>
  inputTypes: Record<string, number>
  fields: Record<string, Record<string, unknown> | null>
  foreign: { nodes: Record<string, unknown>[]; attrs: { on: string; name: string; value: string }[] }
  events: ({ type: string; t: number } & Record<string, unknown>)[]
  signals?: Record<string, unknown> & { webdriver?: boolean | null; ua?: string }
}

interface BeaconRecord extends Base {
  type: 'beacon'
  beacon: Beacon
}

interface AskRecord extends Base {
  type: 'ask'
  question: string
  decision: string
  via: string
}

export type LogRecord = HttpRecord | BeaconRecord | AskRecord

/* ---------- Grouping records into visits ---------- */

const GAP_MS = 30 * 60_000

const runOf = (r: LogRecord) => r.run ?? (r.type === 'beacon' ? r.beacon.run ?? undefined : undefined)
const visitorOf = (r: LogRecord) => (r.type === 'beacon' ? r.beacon.visitorId ?? r.visitor : r.visitor)

/**
 * Records join a visit when they share a visitor id, or come from the same IP and user agent within
 * 30 minutes (agents that drop cookies get a new id on every request). Two different run codes are
 * never merged.
 */
export function groupVisits(records: LogRecord[]): LogRecord[][] {
  const sorted = [...records].sort((a, b) => a.at.localeCompare(b.at))
  const parent = sorted.map((_, i) => i)
  const runs = sorted.map(runOf)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const union = (a: number, b: number) => {
    const ra = find(a)
    const rb = find(b)
    if (ra === rb) return
    if (runs[ra] && runs[rb] && runs[ra] !== runs[rb]) return
    parent[rb] = ra
    runs[ra] ??= runs[rb]
  }

  const byVisitor = new Map<string, number>()
  sorted.forEach((r, i) => {
    const v = visitorOf(r)
    if (!v) return
    const first = byVisitor.get(v)
    if (first === undefined) byVisitor.set(v, i)
    else union(first, i)
  })

  const lastByPrint = new Map<string, number>()
  sorted.forEach((r, i) => {
    const print = `${r.ip}|${r.ua ?? ''}`
    const prev = lastByPrint.get(print)
    if (prev !== undefined && Date.parse(r.at) - Date.parse(sorted[prev].at) < GAP_MS) union(prev, i)
    lastByPrint.set(print, i)
  })

  const groups = new Map<number, LogRecord[]>()
  sorted.forEach((r, i) => {
    const root = find(i)
    groups.set(root, [...(groups.get(root) ?? []), r])
  })
  return [...groups.values()]
}

/* ---------- Summarizing a visit ---------- */

const SPECIAL = ['/robots.txt', '/llms.txt', '/sitemap.xml', '/facts.json', '/favicon.svg']

export interface Visit {
  run?: string
  agent: string
  start: string
  seconds: number
  requests: number
  ips: string[]
  uas: string[]
  pages: string[]
  special: string[]
  wellKnown: string[]
  signedSite: boolean
  signedCollector: boolean
  verifiedSite: boolean
  verifiedCollector: boolean
  signatureAgents: string[]
  signatureReasons: string[]
  named: string[]
  headless: boolean
  tagLoaded: boolean
  pixelLoaded: boolean
  jsRan: boolean
  signals?: Beacon['signals']
  foreignNodes: Record<string, unknown>[]
  foreignAttrs: { on: string; name: string; value: string }[]
  clicks: number
  untrustedClicks: number
  centredClicks: number
  clicksWithoutMove: number
  mouseMoves: number
  keydowns: number
  inputs: number
  inputTypes: Record<string, number>
  scrolls: number
  factsOnScreen: boolean
  factsMsInView: number
  factsDetails: boolean
  factsSourceClicks: number
  factsSelected: boolean
  asks: { question: string; decision: string; via: string }[]
  askFields: Record<string, unknown>[]
  searches: string[]
}

const uniq = <T>(xs: T[]) => [...new Set(xs)]

export function summarize(records: LogRecord[]): Visit {
  const http = records.filter((r): r is HttpRecord => r.type === 'http')
  const beacons = records.filter((r): r is BeaconRecord => r.type === 'beacon').map((r) => r.beacon)
  const asks = records.filter((r): r is AskRecord => r.type === 'ask')
  const run = records.map(runOf).find(Boolean)
  const times = records.map((r) => Date.parse(r.at))

  // Counters are running totals per page load; keep the last beacon of each page.
  const lastPerPage = new Map<string, Beacon>()
  for (const b of beacons) {
    const prev = lastPerPage.get(b.pageId)
    if (!prev || b.t >= prev.t) lastPerPage.set(b.pageId, b)
  }
  const sum = (key: string) => [...lastPerPage.values()].reduce((n, b) => n + (Number(b.counters[key]) || 0), 0)
  const events = beacons.flatMap((b) => b.events)
  const clicks = events.filter((e) => e.type === 'click') as unknown as ClickEvent[]
  const pointerClicks = clicks.filter((c) => c.detail > 0)
  const inputTypes: Record<string, number> = {}
  for (const b of lastPerPage.values()) for (const [k, n] of Object.entries(b.inputTypes)) inputTypes[k] = (inputTypes[k] ?? 0) + n

  const pageViews = http.filter((r) => r.surface === 'site' && r.method === 'GET' && !SPECIAL.includes(r.path) && !r.path.startsWith('/.well-known'))
  const pages: string[] = []
  for (const r of pageViews) {
    const p = r.path + (r.path === '/search' ? r.query ?? '' : '')
    if (pages.at(-1) !== p) pages.push(p)
  }
  const signedOn = (surface: string, verified: boolean) =>
    http.some((r) => r.surface === surface && (verified ? r.signature.verified : r.signature.present))

  return {
    run,
    agent: (run && runByCode.get(run)?.agent) ?? (run ? `Unknown code ${run}` : 'Unlabeled'),
    start: new Date(Math.min(...times)).toISOString(),
    seconds: Math.round((Math.max(...times) - Math.min(...times)) / 1000),
    requests: http.length,
    ips: uniq(records.map((r) => r.ip)),
    uas: uniq(http.map((r) => r.ua ?? '(none)')),
    pages,
    special: uniq(http.filter((r) => SPECIAL.includes(r.path)).map((r) => r.path)),
    wellKnown: uniq(http.filter((r) => r.path.startsWith('/.well-known')).map((r) => r.path)),
    signedSite: signedOn('site', false),
    signedCollector: signedOn('collector', false),
    verifiedSite: signedOn('site', true),
    verifiedCollector: signedOn('collector', true),
    signatureAgents: uniq(http.map((r) => r.signature.agent).filter((a): a is string => Boolean(a))),
    signatureReasons: uniq(http.filter((r) => r.signature.present).map((r) => r.signature.reason)),
    named: uniq(http.map((r) => r.uaCheck.named?.token).filter((t): t is string => Boolean(t))),
    headless: http.some((r) => r.uaCheck.headless),
    tagLoaded: http.some((r) => r.path === '/tag.js'),
    pixelLoaded: http.some((r) => r.path === '/p.gif'),
    jsRan: beacons.length > 0,
    signals: beacons.find((b) => b.signals)?.signals,
    foreignNodes: uniq(beacons.flatMap((b) => b.foreign.nodes).map((n) => JSON.stringify({ ...n, when: undefined }))).map((s) => JSON.parse(s)),
    foreignAttrs: uniq(beacons.flatMap((b) => b.foreign.attrs).map((a) => JSON.stringify(a))).map((s) => JSON.parse(s)),
    clicks: sum('click'),
    untrustedClicks: sum('untrustedClick'),
    centredClicks: pointerClicks.filter((c) => c.dx !== null && c.dy !== null && Math.abs(c.dx) <= 1 && Math.abs(c.dy) <= 1).length,
    clicksWithoutMove: pointerClicks.filter((c) => c.msSinceMove === null || c.msSinceMove > 5000).length,
    mouseMoves: sum('mousemove'),
    keydowns: sum('keydown'),
    inputs: sum('input'),
    inputTypes,
    scrolls: sum('scroll'),
    factsOnScreen: events.some((e) => e.type === 'facts-visible'),
    factsMsInView: sum('factsMsInView'),
    factsDetails: events.some((e) => e.type === 'facts-details' && e.open),
    factsSourceClicks: clicks.filter((c) => c.target?.includes('in #facts') && c.target.includes('→')).length,
    factsSelected: events.some((e) => e.type === 'facts-selected' || (e.type === 'copy' && e.inFacts)),
    asks: asks.map((a) => ({ question: a.question, decision: a.decision, via: a.via })),
    askFields: events.filter((e) => e.type === 'ask-submit').map((e) => ({ trusted: e.trusted, ...(e.field as object) })),
    searches: http.filter((r) => r.path === '/search').map((r) => new URLSearchParams(r.query ?? '').get('q') ?? ''),
  }
}

/* ---------- Writing the report ---------- */

export function maskIp(ip: string) {
  if (ip.includes('.')) return ip.split('.').slice(0, 3).concat('x').join('.')
  return ip.split(':').slice(0, 4).join(':') + '::x'
}

const yes = (b: boolean) => (b ? 'yes' : 'no')
const duration = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`)
const count = (visits: Visit[], test: (v: Visit) => boolean) => `${visits.filter(test).length}/${visits.length}`

function describeBrowser(s: Visit['signals']) {
  if (!s) return 'tag did not run'
  const w = s.window as Record<string, number> | undefined
  const sc = s.screen as Record<string, number> | undefined
  const gl = s.webgl as { renderer?: string } | null | undefined
  const parts = [
    `navigator.webdriver ${String(s.webdriver)}${s.webdriverTampered ? ' (redefined)' : ''}`,
    sc && `screen ${sc.w}×${sc.h}`,
    w && `window ${w.outerW}×${w.outerH} (viewport ${w.innerW}×${w.innerH}, dpr ${w.dpr})`,
    gl?.renderer && `WebGL ${gl.renderer}`,
    s.timezone && `time zone ${String(s.timezone)}`,
    Array.isArray(s.languages) && `languages ${s.languages.join(', ')}`,
    `plugins ${String(s.plugins)}`,
    `notifications ${String(s.notification)}/${String(s.notificationQuery)}`,
    `focused ${String(s.focused)}, ${String(s.visibility)}`,
  ]
  const auto = s.automationGlobals as string[] | undefined
  const extra = s.extraGlobals as string[] | null | undefined
  if (auto?.length) parts.push(`automation globals: ${auto.join(', ')}`)
  if (extra?.length) parts.push(`extra globals: ${extra.join(', ')}`)
  return parts.filter(Boolean).join('; ')
}

export function renderReport(visits: Visit[], networks: Map<string, string>, meta: { lines: number; files: string[] }) {
  const labeled = visits.filter((v) => v.run).sort((a, b) => (a.run ?? '').localeCompare(b.run ?? '') || a.start.localeCompare(b.start))
  const unlabeled = visits.filter((v) => !v.run)
  const net = (ip: string) => `${maskIp(ip)}${networks.get(ip) ? ` (${networks.get(ip)})` : ''}`
  const out: string[] = []

  out.push('# Step 0 probe report', '')
  out.push(`Generated ${new Date().toISOString()} from ${meta.lines} log lines (${meta.files.join(', ') || 'no files'}). IP addresses are masked.`, '')

  const byAgent = new Map<string, Visit[]>()
  for (const v of labeled) byAgent.set(v.agent, [...(byAgent.get(v.agent) ?? []), v])
  out.push('## By agent', '')
  out.push('| Agent | Runs | Signed pages (verified) | Signed tag requests | Named in user agent | Ran the tag | navigator.webdriver | Networks | Facts panel on screen | Followed a fact source | Used the ask box | Searched the site |')
  out.push('|---|---|---|---|---|---|---|---|---|---|---|---|')
  for (const [agent, vs] of byAgent) {
    out.push(
      `| ${agent} | ${vs.length} | ${count(vs, (v) => v.signedSite)} (${count(vs, (v) => v.verifiedSite)}) | ${count(vs, (v) => v.signedCollector)} | ${
        uniq(vs.flatMap((v) => v.named)).join(', ') || 'no'
      } | ${count(vs, (v) => v.jsRan)} | ${count(vs, (v) => v.signals?.webdriver === true)} true | ${uniq(vs.flatMap((v) => v.ips.map((ip) => networks.get(ip) ?? maskIp(ip)))).join('; ')} | ${count(vs, (v) => v.factsOnScreen)} | ${count(vs, (v) => v.factsSourceClicks > 0)} | ${count(vs, (v) => v.asks.length > 0)} | ${count(vs, (v) => v.searches.length > 0)} |`,
    )
  }
  if (!byAgent.size) out.push('| (no labeled runs yet) | | | | | | | | | | | |')
  out.push('')

  out.push('## Runs', '')
  for (const v of labeled) {
    out.push(`### ${v.run} · ${v.agent}`, '')
    out.push(`- **When:** ${v.start}, ${duration(v.seconds)}, ${v.requests} requests`)
    out.push(`- **Network:** ${v.ips.map(net).join('; ')}`)
    out.push(`- **User agent:** ${v.uas.map((u) => `\`${u}\``).join('; ')}`)
    out.push(
      `- **Server-side:** signed pages ${yes(v.signedSite)} (verified ${yes(v.verifiedSite)}), signed tag requests ${yes(v.signedCollector)} (verified ${yes(v.verifiedCollector)})` +
        (v.signatureAgents.length ? `, Signature-Agent ${v.signatureAgents.join(', ')}` : '') +
        (v.signatureReasons.length ? `, results: ${v.signatureReasons.join('; ')}` : '') +
        `; named in user agent: ${v.named.join(', ') || 'no'}; headless: ${yes(v.headless)}`,
    )
    out.push(`- **Loaded:** tag ${yes(v.tagLoaded)}, tag ran ${yes(v.jsRan)}, pixel ${yes(v.pixelLoaded)}${v.special.length ? `, also fetched ${v.special.join(', ')}` : ''}${v.wellKnown.length ? `, ${v.wellKnown.join(', ')}` : ''}`)
    out.push(`- **Browser:** ${describeBrowser(v.signals)}`)
    out.push(
      `- **Extension traces:** ${
        v.foreignNodes.length || v.foreignAttrs.length
          ? [...v.foreignNodes.map((n) => `<${String(n.tag)}${n.id ? `#${String(n.id)}` : ''}> in ${String(n.parent)}${n.src ? ` (${String(n.src)})` : ''}`), ...v.foreignAttrs.map((a) => `${a.name} on ${a.on}`)].join('; ')
          : 'none'
      }`,
    )
    out.push(
      `- **Input:** ${v.clicks} clicks (${v.untrustedClicks} untrusted, ${v.centredClicks} dead centre, ${v.clicksWithoutMove} with no mouse move just before), ${v.mouseMoves} mouse moves, ${v.scrolls} scrolls, ${v.keydowns} key presses against ${v.inputs} input events (${Object.entries(v.inputTypes).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'})`,
    )
    out.push(`- **Pages:** ${v.pages.join(' → ') || 'none'}`)
    out.push(
      `- **Facts panel:** on screen ${yes(v.factsOnScreen)}${v.factsMsInView ? ` for ${duration(Math.round(v.factsMsInView / 1000))}` : ''}, machine-readable version opened ${yes(v.factsDetails)}, source links followed ${v.factsSourceClicks}, text selected or copied ${yes(v.factsSelected)}`,
    )
    out.push(`- **Ask box:** ${v.asks.length ? v.asks.map((a) => `“${a.question}” → ${a.decision} (via ${a.via})`).join('; ') : 'not used'}`)
    if (v.askFields.length) out.push(`- **Ask box typing:** ${v.askFields.map((f) => JSON.stringify(f)).join('; ')}`)
    out.push(`- **Site search:** ${v.searches.length ? v.searches.map((q) => `“${q}”`).join(', ') : 'not used'}`, '')
  }
  if (!labeled.length) out.push('No labeled runs yet.', '')

  out.push('## Unlabeled visits', '')
  out.push(unlabeled.length ? `${unlabeled.length} visits without a run code (other traffic to the public URL):` : 'None.', '')
  for (const v of unlabeled.slice(0, 30))
    out.push(`- ${v.start} · ${v.ips.map(net).join('; ')} · ${v.named.join(', ') || (v.uas[0] ?? '').slice(0, 80)} · ${v.pages.slice(0, 5).join(' → ')}`)
  out.push('')
  return out.join('\n')
}

/** Reverse DNS for each IP, and the network owner from ipinfo.io when asked. */
async function lookUpNetworks(ips: string[], useIpinfo: boolean) {
  const networks = new Map<string, string>()
  const local = /^(127\.|10\.|192\.168\.|::1$|localhost)/
  await Promise.all(
    ips.map(async (ip) => {
      if (local.test(ip)) return networks.set(ip, 'local')
      const names: string[] = []
      if (useIpinfo) {
        try {
          const token = process.env.IPINFO_TOKEN ? `?token=${process.env.IPINFO_TOKEN}` : ''
          const res = await fetch(`https://ipinfo.io/${ip}/json${token}`, { signal: AbortSignal.timeout(4000) })
          const info = (await res.json()) as { org?: string }
          if (info.org) names.push(info.org)
        } catch {
          // Lookup failed: fall back to reverse DNS.
        }
      }
      try {
        const host = (await Promise.race([reverse(ip), new Promise<string[]>((_, no) => setTimeout(no, 3000))]))[0]
        if (host) names.push(host)
      } catch {
        // No reverse DNS.
      }
      if (names.length) networks.set(ip, names.join(', '))
    }),
  )
  return networks
}

export async function readLogs(dir: string, since?: string) {
  const files = (await readdir(dir).catch(() => [])).filter((f) => /^probe-.*\.jsonl$/.test(f)).sort()
  const records: LogRecord[] = []
  for (const f of files)
    for (const line of (await readFile(join(dir, f), 'utf8')).split('\n')) {
      if (!line.trim()) continue
      const r = JSON.parse(line) as LogRecord
      if (!since || r.at >= since) records.push(r)
    }
  return { records, files }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const here = dirname(fileURLToPath(import.meta.url))
  const { values } = parseArgs({
    options: {
      data: { type: 'string', default: process.env.DATA_DIR ?? join(here, 'data') },
      out: { type: 'string', default: join(here, 'reports', 'step0.md') },
      since: { type: 'string' },
      ipinfo: { type: 'boolean', default: false },
    },
  })
  const { records, files } = await readLogs(values.data, values.since)
  const visits = groupVisits(records).map(summarize)
  const networks = await lookUpNetworks(uniq(visits.flatMap((v) => v.ips)), values.ipinfo)
  const report = renderReport(visits, networks, { lines: records.length, files })
  await mkdir(dirname(values.out), { recursive: true })
  await writeFile(values.out, report)
  console.log(report)
  console.log(`\nWritten to ${values.out}`)
}
