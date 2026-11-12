// AI fetchers and crawlers that name themselves in the User-Agent header. Browser agents such as
// ChatGPT Agent, Comet or Claude in Chrome send an ordinary Chrome user agent instead, which is what
// the rest of the probe is for.

export interface NamedAgent {
  token: string
  operator: string
  /**
   * 'user fetch' and 'browser agent' act for a person who is waiting on the answer; the crawlers do
   * not. A 'browser agent' here is one hosted by its operator that names itself; agents that drive
   * the visitor's own browser (Comet, Claude in Chrome, Gemini in Chrome) send an ordinary user agent
   * and cannot be listed.
   */
  kind: 'user fetch' | 'browser agent' | 'search crawler' | 'training crawler' | 'crawler'
}

// Checked against each operator's own documentation in November 2026, except where noted.
export const namedAgents: NamedAgent[] = [
  { token: 'ChatGPT-User', operator: 'OpenAI', kind: 'user fetch' },
  { token: 'OAI-SearchBot', operator: 'OpenAI', kind: 'search crawler' },
  { token: 'GPTBot', operator: 'OpenAI', kind: 'training crawler' },
  { token: 'OAI-AdsBot', operator: 'OpenAI', kind: 'crawler' },
  { token: 'Claude-User', operator: 'Anthropic', kind: 'user fetch' },
  { token: 'Claude-Agent', operator: 'Anthropic', kind: 'browser agent' },
  { token: 'Claude-SearchBot', operator: 'Anthropic', kind: 'search crawler' },
  { token: 'ClaudeBot', operator: 'Anthropic', kind: 'training crawler' },
  { token: 'Perplexity-User', operator: 'Perplexity', kind: 'user fetch' },
  { token: 'PerplexityBot', operator: 'Perplexity', kind: 'search crawler' },
  { token: 'Google-Agent', operator: 'Google', kind: 'browser agent' },
  { token: 'Google-GeminiNotebook', operator: 'Google', kind: 'user fetch' },
  { token: 'Google-NotebookLM', operator: 'Google', kind: 'user fetch' },
  { token: 'Google-CloudVertexBot', operator: 'Google', kind: 'crawler' },
  { token: 'MistralAI-User', operator: 'Mistral', kind: 'user fetch' },
  { token: 'DuckAssistBot', operator: 'DuckDuckGo', kind: 'user fetch' },
  { token: 'meta-externalfetcher', operator: 'Meta', kind: 'user fetch' },
  { token: 'meta-externalagent', operator: 'Meta', kind: 'training crawler' },
  { token: 'meta-webindexer', operator: 'Meta', kind: 'search crawler' },
  { token: 'Amzn-User', operator: 'Amazon', kind: 'user fetch' },
  { token: 'Amzn-SearchBot', operator: 'Amazon', kind: 'search crawler' },
  { token: 'Amazonbot', operator: 'Amazon', kind: 'crawler' },
  // From a third-party catalogue, not the operator's own documentation.
  { token: 'Manus-User', operator: 'Manus', kind: 'browser agent' },
  // Not re-checked in November 2026.
  { token: 'Applebot', operator: 'Apple', kind: 'crawler' },
  { token: 'Bytespider', operator: 'ByteDance', kind: 'crawler' },
  { token: 'cohere-ai', operator: 'Cohere', kind: 'crawler' },
]

export interface UaCheck {
  named?: NamedAgent
  /** HeadlessChrome in the user agent or the client hints. */
  headless: boolean
  /** Says bot, crawler or spider without being one we know. */
  genericBot: boolean
}

export function checkUserAgent(ua: string | undefined, secChUa: string | undefined): UaCheck {
  const s = ua ?? ''
  const named = namedAgents.find((a) => s.toLowerCase().includes(a.token.toLowerCase()))
  return {
    named,
    headless: /HeadlessChrome/i.test(s) || /HeadlessChrome/i.test(secChUa ?? ''),
    genericBot: !named && /bot|crawler|spider|fetcher/i.test(s),
  }
}
