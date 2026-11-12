// AI fetchers and crawlers that name themselves in the User-Agent header. Browser agents such as
// ChatGPT Agent, Comet or Claude in Chrome send an ordinary Chrome user agent instead, which is what
// the rest of the probe is for.

export interface NamedAgent {
  token: string
  operator: string
  kind: 'user fetch' | 'search crawler' | 'training crawler' | 'crawler'
}

export const namedAgents: NamedAgent[] = [
  { token: 'ChatGPT-User', operator: 'OpenAI', kind: 'user fetch' },
  { token: 'OAI-SearchBot', operator: 'OpenAI', kind: 'search crawler' },
  { token: 'GPTBot', operator: 'OpenAI', kind: 'training crawler' },
  { token: 'Claude-User', operator: 'Anthropic', kind: 'user fetch' },
  { token: 'Claude-SearchBot', operator: 'Anthropic', kind: 'search crawler' },
  { token: 'ClaudeBot', operator: 'Anthropic', kind: 'training crawler' },
  { token: 'Perplexity-User', operator: 'Perplexity', kind: 'user fetch' },
  { token: 'PerplexityBot', operator: 'Perplexity', kind: 'search crawler' },
  { token: 'MistralAI-User', operator: 'Mistral', kind: 'user fetch' },
  { token: 'DuckAssistBot', operator: 'DuckDuckGo', kind: 'user fetch' },
  { token: 'meta-externalfetcher', operator: 'Meta', kind: 'user fetch' },
  { token: 'meta-externalagent', operator: 'Meta', kind: 'crawler' },
  { token: 'Google-CloudVertexBot', operator: 'Google', kind: 'crawler' },
  { token: 'Amazonbot', operator: 'Amazon', kind: 'crawler' },
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
