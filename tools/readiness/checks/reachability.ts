// Check 2: does a plain HTTP client get the home page? This scan runs from a datacenter IP, which
// bot protection treats with more suspicion than a buyer's laptop, so a block here says something
// about agents that fetch from cloud servers, not about every visitor. The wording keeps that line.

import { detectChallenge } from '../detect.ts'
import { title, visibleText } from '../html.ts'
import type { FetchResult } from '../http.ts'
import type { CheckResult, Finding, ReachabilityEvidence } from '../types.ts'

/** Below this much visible text, a 200 page is treated as an empty shell that needs JavaScript. */
export const EMPTY_SHELL_CHARS = 200

export function checkReachability(home: FetchResult): CheckResult<ReachabilityEvidence> {
  const text = visibleText(home.body)
  const challenge = home.status ? detectChallenge(home.status, home.headers, home.body) : undefined
  const emptyShell = home.status === 200 && !challenge && text.length < EMPTY_SHELL_CHARS
  const evidence: ReachabilityEvidence = {
    url: home.url, finalUrl: home.finalUrl, httpStatus: home.status, textLength: text.length,
    title: title(home.body), challenge, emptyShell, error: home.error,
  }
  const findings: Finding[] = []
  const caveat = 'This scan runs from a cloud server, which bot protection treats with more suspicion than a buyer’s own computer, so your human visitors are probably not affected.'

  if (home.skipped === 'robots') {
    return { id: 'reachability', status: 'could not check', reason: 'robots.txt disallows the home page for unnamed agents', evidence, findings }
  }
  if (home.status === 0) {
    findings.push({
      id: 'home-unreachable', check: 'reachability', severity: 'medium',
      title: 'Our plain HTTP request from a cloud server got no answer',
      detail: `The request failed (${home.error}). Agents that fetch from cloud servers may fail the same way. ${caveat}`,
      evidence: [{ url: home.url, value: home.error }],
      fix: 'Check that your site answers requests from cloud IP ranges, or ask your hosting provider whether they are being dropped.',
    })
    return { id: 'reachability', status: 'ok', evidence, findings }
  }
  if (challenge) {
    findings.push({
      id: 'home-challenge', check: 'reachability', severity: 'medium',
      title: `Our plain HTTP request from a cloud server was blocked by a bot challenge (${challenge.vendor})`,
      detail: `Instead of your home page we got a challenge page (HTTP ${home.status}, ${challenge.marker}). Agents that fetch from cloud servers may be blocked too. ${caveat}`,
      evidence: [{ url: home.finalUrl, value: `HTTP ${home.status}`, quote: challenge.marker }],
      fix: 'In your bot protection, let verified AI assistants and search crawlers through (for example Cloudflare’s verified-bot and signed-agent allowances) rather than challenging every non-browser client.',
    })
  } else if (home.status >= 400) {
    findings.push({
      id: 'home-error', check: 'reachability', severity: 'medium',
      title: `Our plain HTTP request from a cloud server was refused (HTTP ${home.status})`,
      detail: `Your home page answered HTTP ${home.status} to a plain HTTP client. Agents that fetch from cloud servers may be refused too. ${caveat}`,
      evidence: [{ url: home.finalUrl, value: `HTTP ${home.status}` }],
      fix: 'Check your firewall or bot rules for blanket blocks on non-browser clients or cloud IP ranges.',
    })
  } else if (emptyShell) {
    findings.push({
      id: 'home-empty-shell', check: 'reachability', severity: 'high',
      title: 'Your home page has almost no text without JavaScript',
      detail: `A plain fetch of your home page returns only ${text.length} characters of visible text; the rest is drawn by JavaScript. Assistants that read pages without a browser see an almost empty page.`,
      evidence: [{ url: home.finalUrl, value: `${text.length} characters of visible text`, quote: text.slice(0, 160) }],
      fix: 'Server-render (or pre-render) your main pages so their text is in the HTML.',
    })
  } else if (home.status === 200) {
    findings.push({
      id: 'home-ok', check: 'reachability', severity: 'good',
      title: 'A plain HTTP client gets your home page with real content',
      detail: `HTTP 200 with ${text.length.toLocaleString('en')} characters of visible text, no JavaScript needed.`,
      evidence: [{ url: home.finalUrl, value: `HTTP 200, ${text.length} characters` }],
    })
  }
  return { id: 'reachability', status: 'ok', evidence, findings }
}
