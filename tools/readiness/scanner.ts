// Runs one scan: fetches the pages in priority order within the request budget, renders the
// pricing page in a browser, then hands what it read to the check functions and the scorer. All
// network access goes through PoliteFetcher (and the one browser page load it accounts for).

import type { Browser } from 'playwright'
import { renderPage, type RenderResult } from './browser.ts'
import { checkAccess, readRobots } from './checks/access.ts'
import { checkFacts, findTopicLink, INTEGRATIONS_LINK, TRUST_LINK } from './checks/facts.ts'
import { checkHelp } from './checks/help.ts'
import { checkMachine } from './checks/machine.ts'
import { checkPricing, PRICING_LINK } from './checks/pricing.ts'
import { checkReachability } from './checks/reachability.ts'
import { TOOL_NAME, TOOL_VERSION, USER_AGENT, WELL_KNOWN_PATHS, type Limits } from './config.ts'
import { checkTextFile, detectChallenge } from './detect.ts'
import { extractLinks, title, visibleText, type Link } from './html.ts'
import { PoliteFetcher, type FetchResult } from './http.ts'
import { score } from './score.ts'
import type { Checks, PricingEvidence, ScanResult } from './types.ts'

export interface ScanOptions {
  /** A launched browser, or undefined to skip the JavaScript render. */
  browser?: Browser
  limits?: Partial<Limits>
  wellKnownPaths?: string[]
  now?: () => Date
}

/** "example.com", "https://www.example.com/x" or "http://127.0.0.1:8080" → an origin to start from. */
export function normalizeTarget(input: string): { origin: string; domain: string } {
  const s = input.trim()
  const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`)
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error(`not a web address: ${input}`)
  return { origin: u.origin, domain: u.host.replace(/^www\./, '') }
}

const sameSite = (a: string, b: string) => {
  const strip = (h: string) => h.replace(/^www\./, '')
  return strip(new URL(a).host) === strip(new URL(b).host)
}

const usable = (r: FetchResult | undefined) => Boolean(r && r.status === 200 && !detectChallenge(r.status, r.headers, r.body))

const usableText = (r: FetchResult) => checkTextFile(r.status, r.contentType, r.body).valid

/** A 200 page that says it is a 404, as some single-page apps do. */
function softNotFound(r: FetchResult): boolean {
  const t = title(r.body) ?? ''
  return /\b(404|not found|page not found)\b/i.test(t) || (/\b404\b/.test(visibleText(r.body).slice(0, 300)) && visibleText(r.body).length < 1500)
}

export async function scanSite(input: string, opts: ScanOptions = {}): Promise<ScanResult> {
  const started = Date.now()
  const now = opts.now ?? (() => new Date())
  const scannedAt = now().toISOString()
  const { origin: startOrigin, domain } = normalizeTarget(input)
  const f = new PoliteFetcher(opts.limits)

  // 1. robots.txt first, before anything else is fetched. Its final origin (after an apex → www
  //    redirect, say) is the origin the rest of the scan uses.
  let robotsRes = await f.get(startOrigin + '/robots.txt', { ignoreRobots: true, accept: 'text/plain,*/*;q=0.5' })
  let origin = robotsRes.status ? new URL(robotsRes.finalUrl).origin : startOrigin
  let reading = readRobots(robotsRes)
  f.robots = reading.robots
  f.robotsOrigin = origin

  // 2. Home page. If it lives on another origin than robots.txt did, read that origin's robots.txt.
  let home = await f.get(origin + '/')
  if (home.status && new URL(home.finalUrl).origin !== origin && sameSite(home.finalUrl, origin)) {
    origin = new URL(home.finalUrl).origin
    robotsRes = await f.get(origin + '/robots.txt', { ignoreRobots: true, accept: 'text/plain,*/*;q=0.5' })
    reading = readRobots(robotsRes)
    f.robots = reading.robots
    f.robotsOrigin = origin
    if (!f.allowedByRobots(home.finalUrl)) home = { ...home, status: 0, body: '', skipped: 'robots', error: 'disallowed by robots.txt for unnamed agents' }
  }
  const homeUrl = home.finalUrl
  const homeOk = usable(home)
  const homeLinks: Link[] = homeOk ? extractLinks(home.body, homeUrl) : []

  // 3. Pricing page: /pricing first, then a link on the home page.
  const tried: string[] = []
  let pricingRes: FetchResult | undefined
  let pricingUrl: string | undefined
  let foundVia: PricingEvidence['foundVia'] = 'none'
  let pricingUnavailable: string | undefined
  const direct = origin + '/pricing'
  tried.push('/pricing')
  const d = await f.get(direct)
  const redirectedAway = usable(d) && !PRICING_LINK.test(new URL(d.finalUrl).pathname.replace(/[-_/]/g, ' '))
  let redirectedTo: string | undefined
  if (redirectedAway && /contact|demo|sales|quote|talk/i.test(new URL(d.finalUrl).pathname)) {
    // /pricing that lands on a contact form is the pricing page an agent gets; say so plainly.
    pricingRes = d
    pricingUrl = d.finalUrl
    foundVia = 'pricing path'
    redirectedTo = d.finalUrl
  } else if (usable(d) && !softNotFound(d)) {
    pricingRes = d
    pricingUrl = d.finalUrl
    foundVia = 'pricing path'
  } else {
    if (d.skipped === 'robots') pricingUnavailable = 'robots.txt disallows /pricing for unnamed agents'
    const candidate = homeLinks.find((l) => l.url && sameSite(l.url, origin) && l.url.replace(/\/$/, '') !== direct && (PRICING_LINK.test(new URL(l.url).pathname.replace(/[-_/]/g, ' ')) || (PRICING_LINK.test(l.text) && l.text.length < 30)))
    if (candidate?.url) {
      tried.push(new URL(candidate.url).pathname)
      // A "#pricing" link on the home page points back at the page we already have.
      const c = candidate.url === homeUrl ? home : await f.get(candidate.url)
      if (usable(c) && !softNotFound(c)) {
        pricingRes = c
        pricingUrl = c.finalUrl
        foundVia = 'home page link'
        pricingUnavailable = undefined
      } else if (c.skipped === 'robots') pricingUnavailable = 'robots.txt disallows the pricing page for unnamed agents'
      else if (!usable(c)) pricingUnavailable ??= `pricing page answered ${c.error ?? `HTTP ${c.status}`}`
    } else if (d.status && d.status !== 404 && d.status !== 410 && !usable(d)) {
      pricingUnavailable ??= `/pricing answered ${d.error ?? `HTTP ${d.status}`}`
    }
    // A /pricing that is blocked or challenged is "could not check"; a clean 404 with no link is "not found".
    if (!homeOk && !pricingUrl) pricingUnavailable ??= 'home page could not be read, so its links could not be followed'
  }
  const pricingPath = pricingUrl ? new URL(pricingUrl).pathname : '/pricing'

  // 4. Render the pricing page (or the home page if there is none) in a browser.
  let render: RenderResult | undefined
  let renderState: PricingEvidence['rendered'] = opts.browser ? 'failed' : 'skipped'
  const renderTarget = pricingUrl ?? (homeOk ? homeUrl : undefined)
  if (opts.browser && renderTarget && (await f.reserve(renderTarget, 'browser render'))) {
    render = await renderPage(opts.browser, renderTarget, { timeoutMs: f.limits.timeoutMs })
    renderState = 'yes'
  } else if (opts.browser && renderTarget) renderState = 'skipped'
  const pricingRender = pricingUrl ? render : undefined

  // 5. Machine-readable files, in order of usefulness, while the budget lasts.
  const llms = await f.get(origin + '/llms.txt', { accept: 'text/markdown,text/plain;q=0.9,*/*;q=0.5' })
  // llms-full.txt is the long companion to llms.txt; without llms.txt it is rarely there, so it is
  // only asked for when llms.txt exists, to save the budget.
  const llmsFull = usableText(llms) ? await f.get(origin + '/llms-full.txt', { accept: 'text/markdown,text/plain;q=0.9,*/*;q=0.5' }) : undefined
  const markdown = homeOk ? await f.get(homeUrl, { accept: 'text/markdown', note: 'Accept: text/markdown' }) : undefined
  const sitemapDeclared = reading.robots?.sitemaps ?? []
  const sitemap = sitemapDeclared.length ? undefined : await f.get(origin + '/sitemap.xml', { accept: 'application/xml,text/xml;q=0.9,*/*;q=0.5' })

  // 6. One security or trust page, if the facts are not already on the pages we have.
  const pricingLinks = usable(pricingRes) && pricingRes && pricingUrl ? extractLinks(pricingRes.body, pricingUrl) : []
  const links = [...homeLinks, ...pricingLinks]
  const factPages: { url: string; text: string; html: string }[] = []
  if (homeOk) factPages.push({ url: homeUrl, text: visibleText(home.body), html: home.body })
  if (pricingUrl && pricingRes && usable(pricingRes)) {
    // Facts a browser sees on the pricing page count too, for example a JavaScript-built FAQ.
    const html = pricingRender && !pricingRender.error ? pricingRender.html : pricingRes.body
    factPages.push({ url: pricingUrl, text: visibleText(html), html: pricingRes.body })
  }
  const already = (re: RegExp) => factPages.some((p) => re.test(p.text))
  const trust = findTopicLink(links, TRUST_LINK)
  if (trust?.url && new URL(trust.url).origin === origin && !already(/\bSOC\s?-?\s?2\b|\bISO(?:\/IEC)?[\s-]?27001\b/i)) {
    const r = await f.get(trust.url)
    if (usable(r)) factPages.push({ url: r.finalUrl, text: visibleText(r.body), html: r.body })
  }

  const wellKnownPaths = opts.wellKnownPaths ?? WELL_KNOWN_PATHS
  const wellKnown: { path: string; res?: FetchResult }[] = []
  for (const path of wellKnownPaths) {
    wellKnown.push({ path, res: f.remaining() > 0 ? await f.get(origin + path, { accept: 'application/json, */*;q=0.1' }) : undefined })
  }
  const integrations = findTopicLink(links, INTEGRATIONS_LINK)
  if (integrations?.url && new URL(integrations.url).origin === origin && f.remaining() > 0 && !already(/\bSAML\b|\bSSO\b/)) {
    const r = await f.get(integrations.url)
    if (usable(r)) factPages.push({ url: r.finalUrl, text: visibleText(r.body), html: r.body })
  }

  const checks: Checks = {
    access: checkAccess({ robotsUrl: origin + '/robots.txt', robotsRes, reading, pricingPath, skippedForRobots: [...new Set(f.blockedByRobots)] }),
    reachability: checkReachability(home),
    pricing: checkPricing({
      url: pricingUrl, foundVia, tried, res: pricingRes,
      render: pricingRender ? { html: pricingRender.html, status: pricingRender.status, error: pricingRender.error } : undefined,
      renderState: pricingUrl ? renderState : 'skipped', unavailable: pricingUnavailable, redirectedTo,
    }),
    facts: checkFacts({ pages: factPages, links }),
    machine: checkMachine({ homeUrl, homeHtml: homeOk ? home.body : '', llms, llmsFull, markdown, sitemapDeclared, sitemap, wellKnown }),
    help: checkHelp({
      pages: factPages.slice(0, 2),
      rendered: render && !render.error ? { url: render.finalUrl, html: render.html, requestUrls: render.requestUrls } : undefined,
    }),
  }
  const findings = Object.values(checks).flatMap((c) => c.findings)
  return {
    tool: { name: TOOL_NAME, version: TOOL_VERSION, userAgent: USER_AGENT },
    input, domain, origin, scannedAt, durationMs: Date.now() - started, browser: Boolean(opts.browser),
    requests: f.log,
    checks, findings, score: score(checks, findings),
  }
}
