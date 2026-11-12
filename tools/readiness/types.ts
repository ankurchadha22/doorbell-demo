// Shapes shared by the checks, the scorer and the reports. The scan JSON is these types serialised.

export type CheckId = 'access' | 'reachability' | 'pricing' | 'facts' | 'machine' | 'help'

/** 'good' findings are things done well; they are shown but never ranked as fixes. */
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'good'

export interface Evidence {
  url?: string
  /** A short excerpt of what we read. Scanned content: always escape before display. */
  quote?: string
  /** A measured value, e.g. "static text: 120 characters". */
  value?: string
}

export interface Finding {
  id: string
  check: CheckId
  severity: Severity
  title: string
  detail: string
  evidence: Evidence[]
  fix?: string
}

export type CheckStatus = 'ok' | 'could not check'

export interface CheckResult<E> {
  id: CheckId
  status: CheckStatus
  /** Why a check could not run. */
  reason?: string
  evidence: E
  findings: Finding[]
}

export interface AgentAccess {
  token: string
  operator: string
  kind: string
  home: boolean
  pricing: boolean
  /** True when a robots.txt group names this agent; false when it falls back to `*`. */
  named: boolean
  /** The rule that blocked it, e.g. "Disallow: /". */
  rule?: string
}

export interface AccessEvidence {
  robotsUrl: string
  robots: 'found' | 'none' | 'could not check'
  httpStatus: number
  pricingPath: string
  agents: AgentAccess[]
  contentSignals: { agents: string[]; raw: string }[]
  sitemaps: string[]
  /** URLs this scan did not fetch because robots.txt closes them to unnamed agents. */
  skippedForRobots: string[]
}

export interface ReachabilityEvidence {
  url: string
  finalUrl: string
  httpStatus: number
  textLength: number
  title?: string
  challenge?: { vendor: string; marker: string }
  emptyShell: boolean
  error?: string
}

export interface PriceEvidence {
  raw: string
  amount: number
  currency: string
  quote: string
}

export interface PricingEvidence {
  url?: string
  foundVia: 'pricing path' | 'home page link' | 'none'
  tried: string[]
  /** Set when /pricing redirects to a page that is not about pricing (a contact form, say). */
  redirectedTo?: string
  httpStatus: number
  staticTextLength: number
  renderedTextLength?: number
  rendered: 'yes' | 'skipped' | 'failed'
  renderError?: string
  staticPrices: PriceEvidence[]
  renderedPrices: PriceEvidence[]
  /** Paid prices (amount above zero) a plain fetcher sees. */
  visiblePaidPrice: boolean
  /** Paid prices that appear only after JavaScript runs. */
  pricesNeedJs: boolean
  gating: { label: string; quote: string }[]
  trial?: { label: string; quote: string; days?: number }
  freePlan?: { label: string; quote: string }
  annualDiscount?: { label: string; quote: string }
  annualBilling?: { label: string; quote: string }
  plans: string[]
}

export interface FactItem {
  id: string
  label: string
  found: boolean
  url?: string
  quote?: string
}

export interface FactsEvidence {
  pagesRead: string[]
  items: FactItem[]
  trustLink?: { url: string; text: string }
  integrationsLink?: { url: string; text: string }
}

export interface TextFileEvidence {
  url: string
  httpStatus: number
  exists: boolean
  reason: string
  bytes?: number
  linksToPricing?: boolean
  linksToDocs?: boolean
  firstLine?: string
  skipped?: string
}

export interface MachineEvidence {
  llmsTxt: TextFileEvidence
  llmsFullTxt: TextFileEvidence
  jsonLdTypes: string[]
  jsonLdInvalidBlocks: number
  offerWithPrice: boolean
  offerQuote?: string
  markdownAlternate?: string
  acceptMarkdown: { checked: boolean; works: boolean; contentType?: string; httpStatus?: number; skipped?: string }
  sitemap: { declared: string[]; fetched?: { url: string; httpStatus: number; valid: boolean }; present: boolean }
  metaDescription?: string
  wellKnown: { path: string; httpStatus: number; exists: boolean; skipped?: string }[]
}

export interface HelpEvidence {
  search?: { how: string; url: string }
  chat: { vendor: string; evidence: string }[]
  aiAddressed?: { label: string; quote: string; url: string }
  /** Whether a JavaScript-rendered page was available to look for widgets loaded by scripts. */
  renderedChecked: boolean
}

export interface Checks {
  access: CheckResult<AccessEvidence>
  reachability: CheckResult<ReachabilityEvidence>
  pricing: CheckResult<PricingEvidence>
  facts: CheckResult<FactsEvidence>
  machine: CheckResult<MachineEvidence>
  help: CheckResult<HelpEvidence>
}

export interface CategoryScore {
  id: string
  label: string
  weight: number
  /** Null when the category could not be checked: it is left out of the total. */
  points: number | null
  max: number
  notes: string[]
}

export interface Score {
  total: number | null
  grade: string
  categories: CategoryScore[]
  topFindings: Finding[]
}

export interface ScanResult {
  tool: { name: string; version: string; userAgent: string }
  input: string
  domain: string
  origin: string
  scannedAt: string
  durationMs: number
  browser: boolean
  requests: { url: string; status: number; ms: number; note?: string }[]
  checks: Checks
  findings: Finding[]
  score: Score
}
