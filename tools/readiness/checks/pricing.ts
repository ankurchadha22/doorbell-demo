// Check 3: can an agent find the price, and does it need JavaScript to see it? The same page is
// read twice, as raw HTML (what most assistants' fetch tools get) and rendered in a browser.

import { detectChallenge, findAnnual, findFreePlan, findGating, findTrial, planNames, planPrices, type PriceMatch } from '../detect.ts'
import { headings, visibleText } from '../html.ts'
import type { FetchResult } from '../http.ts'
import type { CheckResult, Finding, PriceEvidence, PricingEvidence } from '../types.ts'

/** Keywords that mark a link as the pricing page. */
export const PRICING_LINK = /\b(?:pricing|prices?|plans?(?: (?:and|&) pricing)?|plans-and-pricing|buy)\b/i

export interface PricingInput {
  url?: string
  foundVia: PricingEvidence['foundVia']
  tried: string[]
  res?: FetchResult
  render?: { html: string; status: number; error?: string }
  renderState: PricingEvidence['rendered']
  redirectedTo?: string
  /** Why no page was fetched, e.g. robots.txt. */
  unavailable?: string
}

const toEvidence = (p: PriceMatch): PriceEvidence => ({ raw: p.raw, amount: p.amount, currency: p.currency, quote: p.quote })

export function checkPricing(input: PricingInput): CheckResult<PricingEvidence> {
  const res = input.res
  const staticOk = Boolean(res && res.status === 200 && !detectChallenge(res.status, res.headers, res.body))
  const renderOk = Boolean(input.render && !input.render.error && input.render.html && input.render.status < 400 && !detectChallenge(input.render.status, {}, input.render.html))
  const staticText = staticOk && res ? visibleText(res.body) : ''
  const renderedText = renderOk && input.render ? visibleText(input.render.html) : ''
  const staticPrices = planPrices(staticText, true)
  const renderedPrices = planPrices(renderedText, true)
  const paid = (ps: PriceMatch[]) => ps.some((p) => p.amount > 0)
  // Terms are read from whichever version has more text: a fact that only the browser sees is still
  // a fact the page states. The JavaScript dependency is reported separately for prices.
  const best = renderedText.length > staticText.length ? renderedText : staticText
  const bestHtml = renderedText.length > staticText.length ? (input.render?.html ?? '') : (res?.body ?? '')
  const annual = findAnnual(best)
  const evidence: PricingEvidence = {
    url: input.url, foundVia: input.foundVia, tried: input.tried, redirectedTo: input.redirectedTo, httpStatus: res?.status ?? 0,
    staticTextLength: staticText.length,
    renderedTextLength: renderOk ? renderedText.length : undefined,
    rendered: input.renderState === 'yes' && !renderOk ? 'failed' : input.renderState,
    renderError: input.render?.error ?? (input.render && !renderOk ? `HTTP ${input.render.status} or a challenge page` : undefined),
    staticPrices: staticPrices.slice(0, 12).map(toEvidence),
    renderedPrices: renderedPrices.slice(0, 12).map(toEvidence),
    visiblePaidPrice: paid(staticPrices),
    pricesNeedJs: !paid(staticPrices) && paid(renderedPrices),
    gating: findGating(best).slice(0, 5),
    trial: findTrial(best),
    freePlan: findFreePlan(best),
    annualDiscount: annual.discount,
    annualBilling: annual.billing,
    plans: planNames(headings(bestHtml)).slice(0, 8),
  }
  const findings: Finding[] = []
  const tried = input.tried.join(', ')

  if (!input.url) {
    if (input.unavailable) return { id: 'pricing', status: 'could not check', reason: input.unavailable, evidence, findings }
    findings.push({
      id: 'pricing-not-found', check: 'pricing', severity: 'high', title: 'We could not find a pricing page',
      detail: `We tried ${tried || '/pricing'} and looked for a link about pricing or plans on your home page. An assistant asked "how much does it cost?" would have nowhere to look.`,
      evidence: [{ value: `tried: ${tried || '/pricing'}` }],
      fix: 'Publish a pricing page at /pricing and link it from your main navigation.',
    })
    return { id: 'pricing', status: 'ok', evidence, findings }
  }
  if (!staticOk && !renderOk) {
    const why = res?.skipped === 'robots' ? 'robots.txt disallows it for unnamed agents' : res?.error ?? `HTTP ${res?.status}`
    return { id: 'pricing', status: 'could not check', reason: `pricing page could not be read (${why})`, evidence, findings }
  }

  const url = input.url
  if (evidence.visiblePaidPrice) {
    const p = staticPrices.find((x) => x.amount > 0)
    findings.push({
      id: 'prices-visible', check: 'pricing', severity: 'good', title: 'Your prices are in the page’s HTML',
      detail: 'An assistant that fetches your pricing page without a browser can read your prices.',
      evidence: [{ url, quote: p?.quote }],
    })
  } else if (evidence.pricesNeedJs) {
    const p = renderedPrices.find((x) => x.amount > 0)
    findings.push({
      id: 'prices-need-js', check: 'pricing', severity: 'high',
      title: 'Prices need JavaScript: assistants that fetch pages without a browser can’t see them',
      detail: `An AI assistant that fetches your pricing page without running JavaScript sees no prices. They appear only after the page’s scripts run (visible text: ${staticText.length.toLocaleString('en')} characters without JavaScript, ${renderedText.length.toLocaleString('en')} with it).`,
      evidence: [{ url, value: `without JavaScript: no prices; with JavaScript: ${renderedPrices.filter((x) => x.amount > 0).slice(0, 3).map((x) => x.raw).join(', ')}`, quote: p?.quote }],
      fix: 'Put the prices in the server-rendered HTML (server-side rendering or static generation), so they are in the page source.',
    })
  } else if (input.redirectedTo) {
    findings.push({
      id: 'pricing-redirects-to-contact', check: 'pricing', severity: 'high',
      title: `Your /pricing address redirects to ${new URL(input.redirectedTo).pathname}, with no prices`,
      detail: 'An assistant that opens your pricing page lands on a contact or demo form. It can only tell the buyer to get in touch, and may suggest a competitor that publishes prices.',
      evidence: [{ url, value: `/pricing → ${input.redirectedTo}` }, ...(evidence.gating[0] ? [{ quote: evidence.gating[0].quote }] : [])],
      fix: 'Publish a real pricing page at /pricing, with at least a starting price or a typical range per plan.',
    })
  } else if (evidence.gating.length) {
    findings.push({
      id: 'prices-gated', check: 'pricing', severity: 'high', title: `Your pricing page has no prices, only “${evidence.gating[0].label}”`,
      detail: 'An assistant asked what you cost can only tell the buyer to contact sales, and may suggest a competitor that publishes prices.',
      evidence: [{ url, quote: evidence.gating[0].quote }],
      fix: 'Publish at least a starting price or a typical range per plan, even if large deals are quoted.',
    })
  } else if (staticOk && !staticPrices.length && evidence.rendered === 'skipped') {
    findings.push({
      id: 'prices-not-in-html', check: 'pricing', severity: 'high', title: 'No prices in your pricing page’s HTML',
      detail: 'A plain fetch of your pricing page shows no prices. (The browser step was skipped, so we can’t say whether they appear with JavaScript.)',
      evidence: [{ url, value: `${staticText.length} characters of visible text` }],
      fix: 'Put the prices in the server-rendered HTML.',
    })
  } else {
    findings.push({
      id: 'prices-none', check: 'pricing', severity: 'high', title: 'We found no prices on your pricing page',
      detail: `Neither the HTML nor the page rendered in a browser shows an amount we recognise as a plan price.${renderOk ? '' : ' (The browser render did not work, so this is the HTML only.)'}`,
      evidence: [{ url, value: `${Math.max(staticText.length, renderedText.length)} characters of visible text read` }],
      fix: 'State the price of each plan as text on the page, e.g. "$49 per user per month".',
    })
  }

  if (evidence.trial || evidence.freePlan) {
    // A trial without a length is often just a question in an FAQ; a stated free plan is firmer.
    const t = evidence.trial?.days || !evidence.freePlan ? evidence.trial : undefined
    findings.push({
      id: 'trial-stated', check: 'pricing', severity: 'good',
      title: t ? (t.days ? `A ${t.days}-day trial is stated` : 'A free trial is mentioned (no length given)') : 'A free plan is stated',
      detail: 'An assistant can tell a buyer how to try you before buying.',
      evidence: [{ url, quote: (t ?? evidence.freePlan)?.quote }],
    })
  } else {
    findings.push({
      id: 'trial-missing', check: 'pricing', severity: 'low', title: 'No free trial or free plan stated on your pricing page',
      detail: 'Buyers often ask assistants "can I try it first?". We found no free trial, trial length or free plan in the text of your pricing page.',
      evidence: [{ url }],
      fix: 'If you offer a trial or free plan, say so in plain text with its length, e.g. "14-day free trial, no card required".',
    })
  }
  if (evidence.annualDiscount) {
    findings.push({ id: 'annual-discount', check: 'pricing', severity: 'good', title: 'An annual discount is stated', detail: 'Assistants comparing total cost can use it.', evidence: [{ url, quote: evidence.annualDiscount.quote }] })
  }
  return { id: 'pricing', status: 'ok', evidence, findings }
}
