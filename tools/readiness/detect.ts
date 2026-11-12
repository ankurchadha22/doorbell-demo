// Pattern detectors over visible text and raw markup. Each one returns what it matched and a short
// quote, so every finding can show its evidence. They err on the side of not matching: a missed
// fact reads as "we didn't find it", a false match would be a false claim.

import { attr, looksLikeHtml, openTags, title, visibleText } from './html.ts'

/** A short excerpt around a match, for evidence. */
export function quoteAround(text: string, index: number, length: number, radius = 70): string {
  const start = Math.max(0, index - radius)
  const end = Math.min(text.length, index + length + radius)
  const q = text.slice(start, end).replace(/\s+/g, ' ').trim()
  return (start > 0 ? '…' : '') + q + (end < text.length ? '…' : '')
}

/* ---------- Prices ---------- */

export interface PriceMatch {
  raw: string
  amount: number
  currency: string
  /** Has a billing unit nearby: per month, per user, /yr, billed annually and so on. */
  recurring: boolean
  quote: string
}

const CURRENCY_SYMBOL: Record<string, string> = { $: 'USD', US$: 'USD', CA$: 'CAD', A$: 'AUD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR' }
// No plain space as a thousands separator: "$20 100 users" is $20, not $20,100.
// Usage prices can be tiny ($0.000198 per event), so decimals run to six digits.
const NUMBER = String.raw`\d{1,3}(?:[,. ]\d{3})+(?![\d])(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,6})?`
const AMOUNT = new RegExp(
  String.raw`(?:(US\$|CA\$|A\$|[$€£¥₹])\s?(${NUMBER})|\b(USD|EUR|GBP|CAD|AUD)\s?(${NUMBER})|(${NUMBER})\s?(€|£|USD|EUR|GBP)(?![A-Za-z]))`,
  'g',
)
const UNIT_AFTER = /^\s*(?:[a-z]{0,3}\s*)?(?:\/|per\b|a\s+(?:month|year|user|seat)|each\b|monthly\b|annually\b|yearly\b|billed\b|\/\s?mo|mo\b|month\b|yr\b|year\b|user\b|seat\b|member\b|editor\b|host\b|node\b|k\s+(?:events|pageviews|requests)|for\s+\d)/i
const UNIT_NEAR = /\b(?:per (?:month|year|user|seat|member|editor|host|node)|\/\s?(?:mo|month|yr|year|user|seat)|a month|every month|each month|monthly|annually|billed (?:monthly|annually|yearly)|per (?:gb|event|request|seat|1k|1,000|million)|per\s+\w+\s*\/\s*month)\b/i
// Amounts that are not a plan price even on a pricing page.
const NOT_A_PRICE_BEFORE = /\b(?:save|saving|savings|raised|raise|funding|revenue|worth|valued|credit|credits|off|fee|fine|over|budget|donated)\s*(?:of\s*|up to\s*|over\s*)?$/i
const NOT_A_PRICE_AFTER = /^\s*(?:[mb]\b|bn\b|million|billion|trillion|in (?:funding|credits|revenue|savings)|setup|set-up|one[- ]time|off\b|credit|discount|saved|savings|arr\b|of (?:funding|credit))/i

function parseAmount(s: string): number {
  // 1,234.56 / 1.234,56 / 49,99 / 0.000198: the last separator is decimal unless exactly three
  // digits follow it in a number that doesn't start with 0 (1,080 is a thousand and eighty).
  const t = s.replace(/[\u00a0 ]/g, '')
  const last = t.match(/^(.*)[.,](\d+)$/)
  if (!last) return Number(t)
  const [, head, tail] = last
  const decimal = tail.length !== 3 || /^0+$/.test(head.replace(/[.,]/g, ''))
  return decimal ? Number(head.replace(/[.,]/g, '') + '.' + tail) : Number(t.replace(/[.,]/g, ''))
}

export function findPrices(text: string): PriceMatch[] {
  const out: PriceMatch[] = []
  for (const m of text.matchAll(AMOUNT)) {
    const sym = m[1] ?? m[3] ?? m[6]
    const num = m[2] ?? m[4] ?? m[5]
    if (!sym || !num) continue
    const index = m.index ?? 0
    const before = text.slice(Math.max(0, index - 30), index)
    const after = text.slice(index + m[0].length, index + m[0].length + 50)
    if (NOT_A_PRICE_BEFORE.test(before) || NOT_A_PRICE_AFTER.test(after)) continue
    // A year such as "© 2026 USD" or a percentage is not an amount.
    if (/^\s*%/.test(after)) continue
    const currency = CURRENCY_SYMBOL[sym] ?? sym.toUpperCase()
    const thousands = /^k\b/i.test(after)
    const recurring = UNIT_AFTER.test(after) || UNIT_NEAR.test(after.slice(0, 45)) || /\b(?:from|starts? at|starting at)\s*$/i.test(before)
    const amount = parseAmount(num) * (thousands ? 1000 : 1)
    out.push({ raw: m[0].trim() + (thousands ? 'k' : ''), amount, currency, recurring, quote: quoteAround(text, index, m[0].length, 50) })
  }
  return out
}

/**
 * Prices that read as plan prices. Off a pricing page an amount needs a billing unit next to it; on
 * a pricing page two or more bare amounts also count, because pricing tables often put "per user /
 * month" in a column header rather than next to each number.
 */
export function planPrices(text: string, onPricingPage: boolean): PriceMatch[] {
  const all = findPrices(text)
  const recurring = all.filter((p) => p.recurring)
  if (recurring.length || !onPricingPage) return recurring
  return all.length >= 2 ? all : []
}

/* ---------- Pricing terms ---------- */

export interface TextMatch {
  label: string
  quote: string
}

function firstMatch(text: string, re: RegExp, label?: string): TextMatch | undefined {
  const m = re.exec(text)
  if (!m) return undefined
  return { label: label ?? m[0], quote: quoteAround(text, m.index, m[0].length) }
}

const GATING = /\b(?:contact (?:our )?sales|talk to (?:our )?(?:sales|an? (?:expert|specialist))|speak (?:to|with) (?:our )?sales|request (?:a )?(?:quote|pricing)|get a (?:quote|demo)|custom pricing|custom quote|book a demo|request a demo|schedule a demo|contact us for (?:pricing|a quote)|pricing (?:available )?on request|let'?s talk)\b/gi

export function findGating(text: string): TextMatch[] {
  const seen = new Map<string, TextMatch>()
  for (const m of text.matchAll(GATING)) {
    const label = m[0].toLowerCase()
    if (!seen.has(label)) seen.set(label, { label, quote: quoteAround(text, m.index ?? 0, m[0].length) })
  }
  return [...seen.values()]
}

export interface TrialMatch extends TextMatch {
  days?: number
}

export function findTrial(text: string): TrialMatch | undefined {
  const withDays = /\b(\d{1,3})[- ]?(day|week|month)s?\b[- ](?:free[- ])?trial\b|\btry (?:it )?(?:\w+ )?free for (\d{1,3}) (day|week|month)s?\b|\bfree (?:for )?(\d{1,3})[- ](day|week)s?\b(?! money)/i
  const m = withDays.exec(text)
  if (m) {
    const n = Number(m[1] ?? m[3] ?? m[5])
    const unit = (m[2] ?? m[4] ?? m[6]).toLowerCase()
    const days = unit === 'week' ? n * 7 : unit === 'month' ? n * 30 : n
    return { label: m[0], days, quote: quoteAround(text, m.index, m[0].length) }
  }
  return firstMatch(text, /\bfree trial\b|\btry (?:it )?(?:for )?free\b|\bstart (?:your |a )?trial\b/i)
}

export function findFreePlan(text: string): TextMatch | undefined {
  return firstMatch(text, /\bfree (?:plan|tier|edition|version|forever)\b|\bforever free\b|\balways free\b|(?:[$€£]\s?0(?![.,]\d*[1-9])(?:[.,]00)?)\s*(?:\/|per)\s*(?:mo|month|user|seat)\b/i)
}

export function findAnnual(text: string): { discount?: TextMatch; billing?: TextMatch } {
  const discount = firstMatch(
    text,
    /\b(?:save|get|enjoy)\s+(?:up to\s+)?\d{1,2}\s?%[^.\n]{0,50}\b(?:annual|annually|yearly|year)\b|\b(?:annual|annually|yearly)\b[^.\n]{0,50}\b(?:save|discount|off)\b\s*(?:up to\s+)?\d{0,2}\s?%?|\b\d{1,2}\s?%\s*(?:off|discount)[^.\n]{0,30}\b(?:annual|yearly|year)\b|\b(?:\d|two|one|three) months? free\b[^.\n]{0,30}\b(?:annual|year)/i,
  )
  // "2 months free" next to a monthly/yearly switch: an annual offer even when the words are apart.
  const monthsFree = /\b(?:annual|annually|yearly|\/\s?year)\b/i.test(text) ? firstMatch(text, /\b(?:\d|one|two|three) months? free\b/i) : undefined
  const billing = firstMatch(text, /\bbilled (?:annually|yearly)\b|\b(?:annual|yearly) (?:billing|plan|subscription|contract)\b|\bpay (?:annually|yearly)\b/i)
  return { discount: discount ?? monthsFree, billing }
}

const PLAN_WORDS = /^(?:free|hobby|personal|starter|start|basic|essentials?|standard|plus|pro|professional|team|teams|business|growth|scale|scale-?up|premium|advanced|enterprise|startup|startups|open source|community|self-hosted|cloud|developer|ultimate|max|elite)(?: plan| edition| tier)?$/i

/** Headings on a pricing page that look like plan names. */
export function planNames(headingTexts: string[]): string[] {
  const out: string[] = []
  for (const h of headingTexts) {
    const name = h.replace(/\s+/g, ' ').trim()
    if (PLAN_WORDS.test(name) && !out.some((o) => o.toLowerCase() === name.toLowerCase())) out.push(name)
  }
  return out
}

/* ---------- Bot challenges ---------- */

export interface Challenge {
  vendor: string
  marker: string
}

// Each marker is specific to an interstitial page, not to the vendor's ordinary scripts, which
// sit on plenty of normal pages.
const CHALLENGE_MARKERS: { vendor: string; re: RegExp; where: 'title' | 'body' | 'header' }[] = [
  { vendor: 'Cloudflare', re: /^just a moment\.{0,3}$/i, where: 'title' },
  { vendor: 'Cloudflare', re: /attention required!? \| cloudflare/i, where: 'title' },
  { vendor: 'Cloudflare', re: /cf-browser-verification|cf_chl_opt|challenge-platform\/h\/[a-z]\/orchestrate|cf-challenge-running/i, where: 'body' },
  { vendor: 'Cloudflare', re: /^challenge$/i, where: 'header' },
  { vendor: 'Akamai', re: /^access denied$/i, where: 'title' },
  { vendor: 'Akamai', re: /you don't have permission to access ".*" on this server\.[\s\S]*reference #[0-9a-f.]+/i, where: 'body' },
  { vendor: 'Akamai', re: /\b_abck\b.*\bbm_sz\b|ak_bmsc[\s\S]{0,200}sec-if-cpt/i, where: 'body' },
  { vendor: 'PerimeterX / HUMAN', re: /px-captcha|_pxCaptcha|perimeterx[\s\S]{0,200}(block|captcha)|press (?:&amp; |& )?hold to confirm/i, where: 'body' },
  { vendor: 'DataDome', re: /captcha-delivery\.com|geo\.captcha-delivery|datadome[\s\S]{0,100}captcha/i, where: 'body' },
  { vendor: 'Imperva / Incapsula', re: /_Incapsula_Resource|incapsula incident id/i, where: 'body' },
  { vendor: 'AWS WAF', re: /awswaf|aws-waf-token|challenge\.js[\s\S]{0,200}gokuProps/i, where: 'body' },
  { vendor: 'Vercel', re: /vercel security checkpoint/i, where: 'body' },
  { vendor: 'Generic', re: /verify(?:ing)? you are (?:a )?human|are you a robot\?|checking (?:if the site connection is secure|your browser before accessing)/i, where: 'body' },
]

export function detectChallenge(status: number, headers: Record<string, string>, body: string): Challenge | undefined {
  const t = title(body) ?? ''
  if (headers['cf-mitigated']) return { vendor: 'Cloudflare', marker: `cf-mitigated: ${headers['cf-mitigated']}` }
  // Body markers are checked on the first part of the page only: a long, real page that mentions
  // "are you a robot?" in an article is not a challenge.
  const head = body.slice(0, 60_000)
  const textLength = visibleText(head).length
  for (const m of CHALLENGE_MARKERS) {
    if (m.where === 'header') continue
    if (m.where === 'title' && m.re.test(t)) return { vendor: m.vendor, marker: `page title "${t}"` }
    if (m.where === 'body' && m.re.test(head) && (textLength < 3000 || status >= 400)) {
      const found = head.match(m.re)?.[0] ?? ''
      return { vendor: m.vendor, marker: found.slice(0, 80) }
    }
  }
  return undefined
}

/* ---------- llms.txt and other text files ---------- */

export interface TextFileCheck {
  valid: boolean
  reason: string
}

/** A real llms.txt is text (usually markdown); a site that answers every path with its HTML app shell is not one. */
export function checkTextFile(status: number, contentType: string, body: string): TextFileCheck {
  if (status !== 200) return { valid: false, reason: `HTTP ${status}` }
  if (/text\/html|application\/xhtml/i.test(contentType)) return { valid: false, reason: 'served as an HTML page (the site’s fallback page, not a text file)' }
  if (looksLikeHtml(body)) return { valid: false, reason: 'the body is an HTML page' }
  if (!body.trim()) return { valid: false, reason: 'empty file' }
  return { valid: true, reason: 'text file' }
}

export function isJsonResponse(status: number, contentType: string, body: string): boolean {
  if (status !== 200 || !/\bjson\b/i.test(contentType)) return false
  try {
    const v: unknown = JSON.parse(body)
    return v !== null && typeof v === 'object'
  } catch {
    return false
  }
}

/* ---------- Buyer facts ---------- */

export interface FactPattern {
  id: string
  label: string
  re: RegExp
}

export const FACT_PATTERNS: FactPattern[] = [
  { id: 'soc2', label: 'SOC 2', re: /\bSOC\s?-?\s?2\b|\bSOC II\b/i },
  { id: 'iso27001', label: 'ISO 27001', re: /\bISO(?:\/IEC)?[\s-]?27001\b/i },
  { id: 'gdpr', label: 'GDPR', re: /\bGDPR\b/ },
  { id: 'hipaa', label: 'HIPAA', re: /\bHIPAA\b/ },
  { id: 'sso', label: 'SSO / SAML', re: /\bSAML\b|\bSSO\b|\bsingle sign[- ]on\b/i },
  {
    id: 'residency',
    label: 'Data residency / EU hosting',
    re: /\bdata residency\b|\bEU[- ](?:data[- ])?(?:hosting|hosted|region|cloud|servers?|data ?cent(?:er|re)s?)\b|\b(?:hosted|hosting|stored|servers?) (?:in|on) (?:the )?(?:EU|European Union|Europe|Germany)\b|\bEuropean (?:hosting|servers?|data ?cent(?:er|re)s?|cloud)\b/i,
  },
  { id: 'selfhost', label: 'Self-hosted / on-premises', re: /\bself[- ]host(?:ed|ing|able)?\b|\bon[- ]prem(?:ise|ises)?\b/i },
  { id: 'support', label: 'Support / SLA', re: /\bSLAs?\b|\buptime (?:guarantee|commitment|sla)\b|\bpriority support\b|\bdedicated (?:support|success manager|account manager|csm)\b|\b24\/7 support\b|\bpremium support\b|\bsupport (?:hours|plans?|response times?)\b/i },
]

export function findFact(text: string, pattern: FactPattern): TextMatch | undefined {
  return firstMatch(text, new RegExp(pattern.re.source, pattern.re.flags.replace('g', '')), pattern.label)
}

/* ---------- On-site help ---------- */

export const CHAT_VENDORS: { vendor: string; re: RegExp }[] = [
  { vendor: 'Intercom', re: /widget\.intercom\.io|js\.intercomcdn\.com|intercomSettings/i },
  { vendor: 'Drift', re: /js\.driftt\.com|drift\.com\/(?:include|core)/i },
  { vendor: 'HubSpot chat', re: /js\.usemessages\.com|hubspot\.com\/conversations|hs-scripts\.com\/[^"']*conversations/i },
  { vendor: 'Qualified', re: /js\.qualified\.com|qualified\.com\/qualified\.js/i },
  { vendor: 'Zendesk', re: /static\.zdassets\.com\/ekr|zopim|zendesk.*web_widget/i },
  { vendor: 'Crisp', re: /client\.crisp\.chat/i },
  { vendor: 'LiveChat', re: /cdn\.livechatinc\.com/i },
  { vendor: 'Tawk.to', re: /embed\.tawk\.to/i },
  { vendor: 'Olark', re: /static\.olark\.com/i },
  { vendor: 'Freshchat', re: /wchat\.freshchat\.com|fw-cdn\.com\/.*widget/i },
  { vendor: 'Help Scout Beacon', re: /beacon-v2\.helpscout\.net/i },
  { vendor: 'Front Chat', re: /chat-assets\.frontapp\.com/i },
  { vendor: 'Tidio', re: /code\.tidio\.co/i },
  { vendor: 'Ada', re: /static\.ada\.support/i },
  { vendor: 'Kapa.ai', re: /widget\.kapa\.ai/i },
  { vendor: 'Inkeep', re: /inkeep\.com|@inkeep\//i },
  { vendor: 'Chatbase', re: /chatbase\.co\/embed/i },
  { vendor: 'Salesforce chat', re: /service\.force\.com\/embeddedservice|embeddedservice_bootstrap/i },
]

/** Chat vendors named by script tags in the markup or by request URLs a browser made. */
export function findChatWidgets(html: string, requestUrls: string[] = []): { vendor: string; evidence: string }[] {
  const out: { vendor: string; evidence: string }[] = []
  const scripts = openTags(html, 'script').map((t) => attr(t, 'src') ?? '').filter(Boolean)
  const inline = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map((m) => m[1]).join('\n')
  for (const { vendor, re } of CHAT_VENDORS) {
    const hit = [...scripts, ...requestUrls].find((u) => re.test(u))
    if (hit) out.push({ vendor, evidence: hit.slice(0, 160) })
    else {
      const m = inline.match(re)
      if (m) out.push({ vendor, evidence: `inline script mentions "${m[0]}"` })
    }
  }
  return out
}

export function findSearch(html: string): string | undefined {
  if (/<search\b/i.test(html)) return '<search> element'
  for (const t of openTags(html, 'form')) if (/role\s*=\s*["']?search/i.test(t)) return 'form with role="search"'
  for (const t of openTags(html, 'input')) {
    if ((attr(t, 'type') ?? '').toLowerCase() === 'search') return 'input type="search"'
    const name = (attr(t, 'name') ?? '').toLowerCase()
    if (['q', 'query', 'search', 's'].includes(name)) return `input name="${name}"`
  }
  if (/DocSearch|docsearch-button|algolia-docsearch/i.test(html)) return 'Algolia DocSearch'
  for (const t of openTags(html, 'button')) if (/aria-label\s*=\s*["'][^"']*search/i.test(t)) return 'search button'
  return undefined
}

/** Text or markup that speaks to AI assistants directly. Marketing copy about AI products doesn't count. */
export function findAiAddressed(html: string, text: string): TextMatch | undefined {
  const inText = firstMatch(
    text,
    /\bif you(?:'re|’re| are) an? (?:AI|LLM|large language model|language model|AI assistant|AI agent|chatbot)\b|\b(?:note|notes|information|info|instructions|guidance|facts|summary|a message) for (?:AI|LLMs?|language models|large language models|AI (?:agents|assistants|models|crawlers))\b|\bfor AI (?:agents|assistants) (?:and|&) LLMs\b|\bAI assistants?,? (?:please|should)\b/i,
  )
  if (inText) return inText
  const link = /<a\b[^>]*href\s*=\s*["'][^"']*\/llms(?:-full)?\.txt["'][^>]*>/i.exec(html)
  if (link) return { label: 'link to llms.txt', quote: link[0].slice(0, 160) }
  const meta = /<meta\b[^>]*name\s*=\s*["'](?:ai|llm|ai-[a-z-]+)["'][^>]*>/i.exec(html)
  if (meta) return { label: 'meta tag for AI', quote: meta[0].slice(0, 160) }
  return undefined
}
