// Check 5: signals made for machines: llms.txt, JSON-LD, markdown versions, sitemap, meta
// description and well-known agent files. Most agents today read HTML, so these weigh less than
// access and pricing, but they are cheap to add and some agents look for them.

import { checkTextFile, isJsonResponse } from '../detect.ts'
import { attr, jsonLdBlocks, jsonLdNodes, looksLikeHtml, metaContent, nodeTypes, openTags } from '../html.ts'
import type { FetchResult } from '../http.ts'
import type { CheckResult, Finding, MachineEvidence, TextFileEvidence } from '../types.ts'

export function textFileEvidence(url: string, res: FetchResult | undefined): TextFileEvidence {
  if (!res) return { url, httpStatus: 0, exists: false, reason: 'not checked', skipped: 'not checked' }
  if (res.skipped) return { url, httpStatus: 0, exists: false, reason: res.error ?? res.skipped, skipped: res.skipped }
  const c = checkTextFile(res.status, res.contentType, res.body)
  if (!c.valid) return { url, httpStatus: res.status, exists: false, reason: c.reason }
  return {
    url, httpStatus: res.status, exists: true, reason: c.reason, bytes: Buffer.byteLength(res.body),
    linksToPricing: /pricing|\/plans\b/i.test(res.body),
    linksToDocs: /\/docs\b|docs\.|documentation/i.test(res.body),
    firstLine: res.body.trim().split('\n')[0].slice(0, 120),
  }
}

/** Offers with a price, anywhere in the JSON-LD (Product.offers, SoftwareApplication.offers...). */
function offerPrice(nodes: Record<string, unknown>[]): string | undefined {
  for (const n of nodes) {
    const types = nodeTypes(n)
    if (!types.some((t) => /Offer$/.test(t))) continue
    const price = n.price ?? n.lowPrice ?? (n.priceSpecification as Record<string, unknown> | undefined)?.price
    if (price !== undefined && price !== null && price !== '') return `${types.join('/')} price ${String(price)} ${String(n.priceCurrency ?? '')}`.trim()
  }
  return undefined
}

export interface MachineInput {
  homeUrl: string
  homeHtml: string
  llms?: FetchResult
  llmsFull?: FetchResult
  markdown?: FetchResult
  sitemapDeclared: string[]
  sitemap?: FetchResult
  wellKnown: { path: string; res?: FetchResult }[]
}

export function checkMachine(input: MachineInput): CheckResult<MachineEvidence> {
  const origin = new URL(input.homeUrl).origin
  const { blocks, invalid } = jsonLdBlocks(input.homeHtml)
  const nodes = jsonLdNodes(blocks)
  const types = [...new Set(nodes.flatMap(nodeTypes))]
  const offer = offerPrice(nodes)
  const alt = openTags(input.homeHtml, 'link').find((t) => /alternate/i.test(attr(t, 'rel') ?? '') && /markdown/i.test(attr(t, 'type') ?? ''))
  const md = input.markdown
  const mdWorks = Boolean(md && md.status === 200 && /markdown/i.test(md.contentType) && !looksLikeHtml(md.body))
  const sitemapOk = Boolean(input.sitemap && input.sitemap.status === 200 && /<(urlset|sitemapindex)\b/i.test(input.sitemap.body))
  const evidence: MachineEvidence = {
    llmsTxt: textFileEvidence(origin + '/llms.txt', input.llms),
    llmsFullTxt: textFileEvidence(origin + '/llms-full.txt', input.llmsFull),
    jsonLdTypes: types,
    jsonLdInvalidBlocks: invalid,
    offerWithPrice: Boolean(offer),
    offerQuote: offer,
    markdownAlternate: alt ? new URL(attr(alt, 'href') ?? '', input.homeUrl).href : undefined,
    acceptMarkdown: md
      ? { checked: !md.skipped, works: mdWorks, contentType: md.contentType, httpStatus: md.status, skipped: md.skipped }
      : { checked: false, works: false, skipped: 'not checked' },
    sitemap: {
      declared: input.sitemapDeclared,
      fetched: input.sitemap && !input.sitemap.skipped ? { url: input.sitemap.url, httpStatus: input.sitemap.status, valid: sitemapOk } : undefined,
      present: input.sitemapDeclared.length > 0 || sitemapOk,
    },
    metaDescription: metaContent(input.homeHtml, 'description') || undefined,
    wellKnown: input.wellKnown.map(({ path, res }) => ({
      path,
      httpStatus: res?.status ?? 0,
      exists: Boolean(res && isJsonResponse(res.status, res.contentType, res.body)),
      skipped: !res ? 'not checked (request budget)' : res.skipped,
    })),
  }
  if (!input.homeHtml) return { id: 'machine', status: 'could not check', reason: 'home page could not be read', evidence, findings: [] }

  const findings: Finding[] = []
  const llms = evidence.llmsTxt
  if (llms.exists) {
    findings.push({
      id: 'llms-txt', check: 'machine', severity: 'good', title: 'You publish an llms.txt',
      detail: `${llms.bytes?.toLocaleString('en')} bytes${llms.linksToPricing ? ', links to pricing' : ''}${llms.linksToDocs ? ', links to docs' : ''}.`,
      evidence: [{ url: llms.url, quote: llms.firstLine }],
    })
    if (!llms.linksToPricing) {
      findings.push({
        id: 'llms-no-pricing', check: 'machine', severity: 'low', title: 'Your llms.txt does not point to pricing',
        detail: 'Agents that read llms.txt use it as a map of your site; pricing is one of the first things buyers ask.',
        evidence: [{ url: llms.url }], fix: 'Add a line linking your pricing page (and a one-line summary of plans) to llms.txt.',
      })
    }
  } else if (!llms.skipped) {
    findings.push({
      id: 'llms-missing', check: 'machine', severity: 'low', title: 'No llms.txt',
      detail: `${llms.url}: ${llms.reason}. llms.txt is a short markdown map of your site for language models; few agents rely on it yet, but it is cheap to add.`,
      evidence: [{ url: llms.url, value: llms.reason }],
      fix: 'Publish /llms.txt as plain markdown: one paragraph on what you sell, then links to pricing, docs, security and integrations.',
    })
  }
  if (types.length) {
    findings.push({
      id: 'jsonld', check: 'machine', severity: 'good', title: `Structured data on your home page: ${types.slice(0, 6).join(', ')}`,
      detail: offer ? `Including an offer with a price (${offer}).` : 'No JSON-LD offer carries a price.', evidence: [{ url: input.homeUrl, value: types.join(', ') }],
    })
  } else {
    findings.push({
      id: 'jsonld-missing', check: 'machine', severity: 'low', title: 'No structured data (JSON-LD) on your home page',
      detail: 'Schema.org markup (Organization, SoftwareApplication with Offers) states who you are and what you cost in a form machines read without guessing.',
      evidence: [{ url: input.homeUrl }], fix: 'Add Organization and SoftwareApplication JSON-LD, with an Offer per public plan.',
    })
  }
  if (!evidence.metaDescription) {
    findings.push({
      id: 'meta-missing', check: 'machine', severity: 'low', title: 'Your home page has no meta description',
      detail: 'Search engines and assistants use it as the one-line summary of your site.', evidence: [{ url: input.homeUrl }],
      fix: 'Add a meta description that says plainly what you sell and to whom.',
    })
  }
  const known = evidence.wellKnown.filter((w) => w.exists)
  if (known.length) {
    findings.push({
      id: 'well-known', check: 'machine', severity: 'good', title: `Agent discovery files: ${known.map((w) => w.path).join(', ')}`,
      detail: 'These JSON files tell agents how to connect to you directly.', evidence: known.map((w) => ({ url: origin + w.path })),
    })
  }
  if (evidence.markdownAlternate || mdWorks) {
    findings.push({
      id: 'markdown', check: 'machine', severity: 'good', title: 'Your site offers a markdown version of its pages',
      detail: mdWorks ? 'Asking for text/markdown returns markdown.' : 'Your home page links a markdown alternate.',
      evidence: [{ url: evidence.markdownAlternate ?? input.homeUrl, value: md?.contentType }],
    })
  }
  return { id: 'machine', status: 'ok', evidence, findings }
}
