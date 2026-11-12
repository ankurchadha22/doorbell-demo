// Everything a person might want to tune without reading the scanner: who we say we are, how
// politely we fetch, and which well-known paths we probe. Scoring weights live in score.ts.

export const TOOL_NAME = 'agent-readiness-check'
export const TOOL_VERSION = '0.1'

/** Honest and generic: it names the tool, not the company or a person, and imitates no AI agent. */
export const USER_AGENT = `Mozilla/5.0 (compatible; ${TOOL_NAME}/${TOOL_VERSION})`

/** Shown only in the report footer. Never sent to scanned sites. */
export const BRAND = 'Doorbell'

export const DEFAULT_OUT_DIR = 'private/data/readiness'

export interface Limits {
  /** Minimum gap between two requests to the same host, shared by every scan in the process. */
  minIntervalMs: number
  /** Page-level requests per scan, the browser's page load included. Redirect hops are not counted. */
  maxRequests: number
  timeoutMs: number
  maxBytes: number
  maxRedirects: number
  /** Retries after a network error, 429 or 5xx. Never after a timeout or a 4xx. */
  retries: number
}

export const LIMITS: Limits = {
  minIntervalMs: 1000,
  maxRequests: 12,
  timeoutMs: 15_000,
  maxBytes: 2 * 1024 * 1024,
  maxRedirects: 4,
  retries: 1,
}

/**
 * Well-known files that agent protocols have proposed. These names move quickly, so this list is
 * expected to change; the order is the probe order, so the most useful ones come first in case the
 * request budget runs out.
 */
export const WELL_KNOWN_PATHS = [
  '/.well-known/mcp.json',
  '/.well-known/mcp/server-card.json',
  '/.well-known/agent-card.json',
  '/.well-known/agents.json',
  '/.well-known/ai-plugin.json',
]
