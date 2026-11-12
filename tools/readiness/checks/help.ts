// Check 6: on-site help: a search box, a chat widget, and anything addressed to AI assistants.
// Chat widgets are usually injected by scripts, so the rendered page and its requests are searched
// as well as the raw HTML.

import { findAiAddressed, findChatWidgets, findSearch } from '../detect.ts'
import type { CheckResult, Finding, HelpEvidence } from '../types.ts'

export interface HelpInput {
  pages: { url: string; html: string; text: string }[]
  rendered?: { url: string; html: string; requestUrls: string[] }
}

export function checkHelp(input: HelpInput): CheckResult<HelpEvidence> {
  const all = [...input.pages, ...(input.rendered ? [{ ...input.rendered, text: '' }] : [])]
  let search: HelpEvidence['search']
  let ai: HelpEvidence['aiAddressed']
  for (const p of all) {
    const how = search ? undefined : findSearch(p.html)
    if (how) search = { how, url: p.url }
    const a = ai ? undefined : findAiAddressed(p.html, p.text)
    if (a) ai = { ...a, url: p.url }
  }
  const chat = new Map<string, { vendor: string; evidence: string }>()
  for (const p of input.pages) for (const c of findChatWidgets(p.html)) chat.set(c.vendor, c)
  if (input.rendered) for (const c of findChatWidgets(input.rendered.html, input.rendered.requestUrls)) chat.set(c.vendor, c)
  const evidence: HelpEvidence = { search, chat: [...chat.values()], aiAddressed: ai, renderedChecked: Boolean(input.rendered) }
  if (!input.pages.length) return { id: 'help', status: 'could not check', reason: 'no page could be read', evidence, findings: [] }

  const findings: Finding[] = []
  if (ai) {
    findings.push({ id: 'ai-addressed', check: 'help', severity: 'good', title: 'Your site speaks to AI assistants directly', detail: `Found: ${ai.label}.`, evidence: [{ url: ai.url, quote: ai.quote }] })
  } else {
    findings.push({
      id: 'ai-not-addressed', check: 'help', severity: 'low', title: 'No plain facts page that an assistant can quote',
      detail: 'We found no page, section or link that gathers the facts buyers ask for in one place (for example a "quick facts" section or a link to llms.txt).',
      evidence: [{ value: `pages checked: ${all.length}` }],
      fix: 'Add a short "Quick facts" page that people can read too: what you sell, prices, trial, security, integrations, with links. Write statements of fact, not instructions to an AI: assistants are built to distrust page text that tells them what to do.',
    })
  }
  if (!search) {
    findings.push({
      id: 'search-missing', check: 'help', severity: 'low', title: 'No site search found',
      detail: `We found no search form on the pages we read${input.rendered ? ' (including the rendered page)' : ''}.`, evidence: [{ value: `pages checked: ${all.length}` }],
      fix: 'A search page with a plain URL (e.g. /search?q=sso) lets agents look things up.',
    })
  }
  if (chat.size) {
    findings.push({ id: 'chat', check: 'help', severity: 'info', title: `Chat widget: ${[...chat.keys()].join(', ')}`, detail: 'Helpful for people; most AI agents do not use chat widgets.', evidence: evidence.chat.slice(0, 3).map((c) => ({ value: c.evidence })) })
  }
  return { id: 'help', status: 'ok', evidence, findings }
}
