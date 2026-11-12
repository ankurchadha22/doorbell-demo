// Check 4: the facts a buyer's assistant usually looks for (security, integrations, SSO, hosting,
// support), searched in the visible text of the pages we read. "Not found" means not on those pages,
// which is what an agent with a few page fetches would conclude too.

import { FACT_PATTERNS, findFact } from '../detect.ts'
import type { Link } from '../html.ts'
import type { CheckResult, FactItem, FactsEvidence, Finding } from '../types.ts'

export const TRUST_LINK = /\b(?:trust(?: center)?|security|compliance)\b/i
export const INTEGRATIONS_LINK = /\b(?:integrations?|connectors?|data sources|app (?:marketplace|directory)|marketplace)\b/i

/** A link whose text or URL path names the topic. */
export function findTopicLink(links: Link[], re: RegExp): Link | undefined {
  const scored = links
    .filter((l) => l.url)
    .map((l) => {
      const u = new URL(l.url as string)
      const pathHit = re.test(u.pathname.replace(/[-_/]/g, ' ')) || re.test(u.hostname.split('.')[0])
      const textHit = re.test(l.text) && l.text.length < 40
      return { l, score: (pathHit ? 2 : 0) + (textHit ? 1 : 0) }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  return scored[0]?.l
}

export interface FactsInput {
  pages: { url: string; text: string }[]
  links: Link[]
}

export function checkFacts(input: FactsInput): CheckResult<FactsEvidence> {
  const items: FactItem[] = FACT_PATTERNS.map((p) => {
    for (const page of input.pages) {
      const m = findFact(page.text, p)
      if (m) return { id: p.id, label: p.label, found: true, url: page.url, quote: m.quote }
    }
    return { id: p.id, label: p.label, found: false }
  })
  const trust = findTopicLink(input.links, TRUST_LINK)
  const integrations = findTopicLink(input.links, INTEGRATIONS_LINK)
  const evidence: FactsEvidence = {
    pagesRead: input.pages.map((p) => p.url),
    items,
    trustLink: trust?.url ? { url: trust.url, text: trust.text } : undefined,
    integrationsLink: integrations?.url ? { url: integrations.url, text: integrations.text } : undefined,
  }
  if (!input.pages.length) return { id: 'facts', status: 'could not check', reason: 'no page could be read', evidence, findings: [] }

  const findings: Finding[] = []
  const by = (id: string) => items.find((i) => i.id === id) as FactItem
  const pagesNote = `We read ${input.pages.length} page${input.pages.length > 1 ? 's' : ''}: ${input.pages.map((p) => new URL(p.url).pathname).join(', ')}.`
  const found = items.filter((i) => i.found)
  if (found.length) {
    findings.push({
      id: 'facts-found', check: 'facts', severity: 'good', title: `Buyer facts an assistant can quote: ${found.map((i) => i.label).join(', ')}`,
      detail: pagesNote,
      evidence: found.slice(0, 5).map((i) => ({ url: i.url, quote: i.quote })),
    })
  }
  const certs = ['soc2', 'iso27001'].map(by)
  if (!certs.some((c) => c.found)) {
    findings.push({
      id: 'security-cert-missing', check: 'facts', severity: 'medium',
      title: trust ? 'No security certification named on the pages we read' : 'No security page link or certification found on the pages we read',
      detail: `Security questionnaires start with "are you SOC 2 or ISO 27001 certified?". ${pagesNote} None mentions SOC 2 or ISO 27001${trust ? `, though you link to ${trust.url}` : ''}.`,
      evidence: trust?.url ? [{ url: trust.url, quote: trust.text }] : [{ value: pagesNote }],
      fix: 'State your certifications (or that you have none yet) in plain text on a /security or /trust page linked from every page’s footer.',
    })
  }
  if (!integrations) {
    findings.push({
      id: 'integrations-missing', check: 'facts', severity: 'medium', title: 'No integrations page linked from your home or pricing page',
      detail: '"Does it work with Salesforce / Slack / our warehouse?" is a standard buyer question. We found no link to an integrations page or directory.',
      evidence: [{ value: pagesNote }],
      fix: 'Link an integrations page, listing each integration by name as text, from your main navigation or footer.',
    })
  }
  if (!by('sso').found) {
    findings.push({
      id: 'sso-missing', check: 'facts', severity: 'low', title: 'SSO / SAML not mentioned on the pages we read',
      detail: `Enterprise buyers ask about single sign-on early. ${pagesNote}`, evidence: [{ value: pagesNote }],
      fix: 'Say which plans include SSO (SAML / OIDC) on your pricing page.',
    })
  }
  return { id: 'facts', status: 'ok', evidence, findings }
}
