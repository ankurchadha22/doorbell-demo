// Small, dependency-free HTML helpers. They are not a full parser: they read what a simple AI
// fetcher reads, which is the raw markup with scripts and styles thrown away.

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…',
  euro: '€', pound: '£', yen: '¥', cent: '¢', copy: '©', reg: '®', trade: '™', times: '×', middot: '·',
  bull: '•', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', laquo: '«', raquo: '»', deg: '°',
  thinsp: ' ', ensp: ' ', emsp: ' ', zwj: '', zwnj: '', shy: '', check: '✓', larr: '←', rarr: '→',
}

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);?/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m
    }
    const named = NAMED_ENTITIES[code.toLowerCase()]
    return named ?? m
  })
}

// Elements whose content a reader never sees as text. noscript is included: a fetcher that reads it
// usually gets "please enable JavaScript", not the page.
const INVISIBLE = ['script', 'style', 'title', 'noscript', 'svg', 'template', 'head', 'iframe', 'object', 'canvas']

/** Removes invisible elements and comments, leaving the rest of the markup. */
export function stripInvisible(html: string): string {
  let out = html.replace(/<!--[\s\S]*?-->/g, ' ')
  for (const tag of INVISIBLE) {
    out = out.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}\\s*>`, 'gi'), ' ')
    // An unclosed <script> or <style> swallows the rest of the document, as browsers do. (A
    // missing </head> is legal HTML, so this only applies to raw-text elements.)
    if (tag === 'script' || tag === 'style') out = out.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*$`, 'i'), ' ')
  }
  return out
}

const BLOCK = /^(p|div|section|article|header|footer|nav|main|aside|li|ul|ol|tr|td|th|table|h[1-6]|br|hr|dt|dd|dl|form|button|label|option|figure|figcaption|blockquote|pre)$/i

/** The text a reader would see, one line per block, entities decoded, whitespace collapsed. */
export function visibleText(html: string): string {
  const body = stripInvisible(html)
  // Quoted attribute values may contain ">" (Alpine and Vue handlers do), so tags are matched with quotes in mind.
  const withBreaks = body.replace(/<\/?([a-z][a-z0-9-]*)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi, (_m, tag: string) => (BLOCK.test(tag) ? '\n' : ' '))
  return decodeEntities(withBreaks.replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g, ' '))
    .split('\n')
    .map((l) => l.replace(/[\s ​]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

export function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i'))
  if (!m) return undefined
  return decodeEntities(m[1] ?? m[2] ?? m[3] ?? '')
}

export interface Link {
  href: string
  /** Absolute URL, or undefined for mailto:, javascript: and unparseable hrefs. */
  url?: string
  text: string
}

export function extractLinks(html: string, base: string): Link[] {
  const out: Link[] = []
  const clean = html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script\b[\s\S]*?<\/script\s*>/gi, ' ')
  for (const m of clean.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)) {
    const href = attr(m[1], 'href')
    if (href === undefined) continue
    const label = attr(m[1], 'aria-label') ?? attr(m[1], 'title') ?? ''
    const text = (visibleText(m[2]).replace(/\n/g, ' ') || label).trim()
    let url: string | undefined
    if (!/^(mailto|tel|javascript|data):/i.test(href)) {
      try {
        const u = new URL(href, base)
        if (u.protocol === 'http:' || u.protocol === 'https:') {
          u.hash = ''
          url = u.href
        }
      } catch {
        // Unparseable hrefs are kept for evidence but have no URL.
      }
    }
    out.push({ href, url, text })
  }
  return out
}

/** `<tag ...>` openings, for tags such as link, meta, form and input. */
export function openTags(html: string, tag: string): string[] {
  return [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'gi'))].map((m) => m[0])
}

export function metaContent(html: string, name: string): string | undefined {
  for (const t of openTags(html, 'meta')) {
    const n = attr(t, 'name') ?? attr(t, 'property')
    if (n?.toLowerCase() === name.toLowerCase()) return attr(t, 'content')?.trim()
  }
  return undefined
}

export function title(html: string): string | undefined {
  const m = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)
  return m ? decodeEntities(m[1]).replace(/\s+/g, ' ').trim() : undefined
}

export function headings(html: string): string[] {
  const body = stripInvisible(html)
  return [...body.matchAll(/<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi)]
    .map((m) => visibleText(m[2]).replace(/\n/g, ' ').trim())
    .filter(Boolean)
}

/** The parsed JSON-LD blocks; blocks that don't parse are counted, not thrown. */
export function jsonLdBlocks(html: string): { blocks: unknown[]; invalid: number } {
  const blocks: unknown[] = []
  let invalid = 0
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (!/application\/ld\+json/i.test(attr(m[1], 'type') ?? '')) continue
    try {
      blocks.push(JSON.parse(m[2].trim()))
    } catch {
      invalid++
    }
  }
  return { blocks, invalid }
}

/** Walks JSON-LD nodes, including @graph and nested objects. */
export function jsonLdNodes(blocks: unknown[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  const walk = (v: unknown, depth: number) => {
    if (depth > 12 || v === null || typeof v !== 'object') return
    if (Array.isArray(v)) {
      for (const x of v) walk(x, depth + 1)
      return
    }
    const o = v as Record<string, unknown>
    if ('@type' in o) out.push(o)
    for (const x of Object.values(o)) walk(x, depth + 1)
  }
  walk(blocks, 0)
  return out
}

export function nodeTypes(node: Record<string, unknown>): string[] {
  const t = node['@type']
  return (Array.isArray(t) ? t : [t]).filter((x): x is string => typeof x === 'string')
}

/** Escapes text for HTML content and attribute values. */
export function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** True when a body is an HTML document rather than text or JSON. */
export function looksLikeHtml(body: string): boolean {
  return /^\s*(<!doctype html|<html\b|<head\b|<body\b)/i.test(body) || /<(html|head|body)\b[^>]*>/i.test(body.slice(0, 2000))
}
