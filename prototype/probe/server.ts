// Step 0 probe: a test vendor website plus a separate collector, logging everything an AI agent's
// visit shows us.
//
//   npm run probe        site on http://localhost:8787, collector on http://localhost:8788
//
// Behind public URLs, set SITE_ORIGIN and COLLECTOR_ORIGIN to them. The collector is a second origin
// on purpose: in the product the tag is third-party, so we need to see whether an agent signs requests
// to a third-party host too. Every request becomes one JSON line in data/ (headers, IP, the Web Bot
// Auth check, the user-agent check); the tag's beacons and ask box questions get lines of their own.

import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkUserAgent } from './agents.ts'
import { answer } from './facts.ts'
import { createLog } from './log.ts'
import { isRunCode } from './runs.ts'
import {
  factsJson,
  llmsTxt,
  pagePaths,
  renderAskPage,
  renderNotFound,
  renderPage,
  renderSearchPage,
  robotsTxt,
  sitemapXml,
} from './site.ts'
import { checkSignature, fetchDirectory, type KeyFetcher } from './webBotAuth.ts'

const here = dirname(fileURLToPath(import.meta.url))
const MAX_BODY = 64 * 1024
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

export type Surface = 'site' | 'collector'

export interface ProbeOptions {
  host?: string
  /** 0 picks a free port. */
  sitePort?: number
  collectorPort?: number
  /** Public origins, when the probe sits behind a tunnel or host. Default: the local ports. */
  siteOrigin?: string
  collectorOrigin?: string
  dataDir?: string
  fetchKeys?: KeyFetcher
}

interface Reply {
  status: number
  type?: string
  body?: string | Buffer
  headers?: Record<string, string>
}

const newId = () => randomBytes(6).toString('hex')

function parseCookies(header: string | undefined) {
  const out: Record<string, string> = {}
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=')
    if (i <= 0) continue
    try {
      out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
    } catch {
      // Malformed escape: ignore this cookie.
    }
  }
  return out
}

/** Readable by the tag (no HttpOnly), so beacons and page requests share a visitor id. */
const setCookie = (name: string, value: string, maxAge: number) => `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax`

function clientIp(req: IncomingMessage) {
  const forwarded = req.headers['x-forwarded-for']
  const xff = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim()
  const cf = req.headers['cf-connecting-ip']
  return (typeof cf === 'string' && cf) || xff || (req.socket.remoteAddress ?? '').replace(/^::ffff:/, '')
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((ok, fail) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > MAX_BODY) {
        fail(new Error('body too large'))
        req.destroy()
      } else chunks.push(c)
    })
    req.on('end', () => ok(Buffer.concat(chunks).toString('utf8')))
    req.on('error', fail)
  })
}

const flatHeaders = (req: IncomingMessage) =>
  Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v]))

export async function startProbe(options: ProbeOptions = {}) {
  const host = options.host ?? '127.0.0.1'
  const log = createLog(options.dataDir ?? join(here, 'data'))
  const fetchKeys = options.fetchKeys ?? fetchDirectory
  const origins = { site: options.siteOrigin ?? '', collector: options.collectorOrigin ?? '' }
  const tagFile = join(here, 'public', 'tag.js')
  const faviconFile = join(here, '..', '..', 'public', 'favicon.svg')

  async function route(req: IncomingMessage, url: URL, body: string) {
    const path = url.pathname
    const method = req.method ?? 'GET'
    const ctx = { collectorOrigin: origins.collector, path }
    const html = (s: string, status = 200): Reply => ({ status, type: 'text/html; charset=utf-8', body: s })
    const cors = { 'access-control-allow-origin': origins.site, 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST' }
    let record: Record<string, unknown> | undefined

    if (path === '/collect') {
      if (method === 'OPTIONS') return { reply: { status: 204, headers: cors } }
      if (method !== 'POST') return { reply: { status: 405, headers: cors } }
      try {
        const beacon = JSON.parse(body) as Record<string, unknown>
        record = { type: 'beacon', beacon }
        return { reply: { status: 204, headers: cors }, record }
      } catch {
        return { reply: { status: 400, headers: cors } }
      }
    }

    if (path === '/ask' && (method === 'POST' || method === 'GET')) {
      const json = (req.headers['content-type'] ?? '').includes('application/json')
      let question = ''
      let pageId: unknown
      if (method === 'GET') question = url.searchParams.get('q') ?? ''
      else if (json) {
        try {
          const parsed = JSON.parse(body) as { q?: unknown; pageId?: unknown }
          question = String(parsed.q ?? '')
          pageId = parsed.pageId
        } catch {
          return { reply: { status: 400 } }
        }
      } else question = new URLSearchParams(body).get('q') ?? ''
      question = question.slice(0, 500)
      const result = answer(question)
      record = {
        type: 'ask',
        question,
        decision: result.decision,
        facts: result.facts.map((f) => f.id),
        via: method === 'GET' ? 'url' : json ? 'tag' : 'form',
        pageId,
      }
      if ((req.headers.accept ?? '').includes('application/json'))
        return {
          reply: {
            status: 200,
            type: 'application/json',
            body: JSON.stringify({ decision: result.decision, text: result.text, sources: result.facts.map((f) => ({ label: f.topic, url: f.source })) }),
          },
          record,
        }
      return { reply: html(renderAskPage(ctx, question, result)), record }
    }

    if (method !== 'GET' && method !== 'HEAD') return { reply: { status: 405 } }

    if (pagePaths.includes(path)) return { reply: html(renderPage(path, ctx)!) }
    if (/^\/start\/[^/]+$/.test(path)) return { reply: html(renderPage('/', ctx)!) }
    switch (path) {
      case '/search':
        return { reply: html(renderSearchPage(ctx, url.searchParams.get('q') ?? '')) }
      case '/tag.js':
        return { reply: { status: 200, type: 'text/javascript; charset=utf-8', body: await readFile(tagFile) } }
      case '/p.gif':
        return { reply: { status: 200, type: 'image/gif', body: PIXEL } }
      case '/favicon.svg':
        return { reply: { status: 200, type: 'image/svg+xml', body: await readFile(faviconFile) } }
      case '/facts.json':
        return { reply: { status: 200, type: 'application/json', body: factsJson() } }
      case '/llms.txt':
        return { reply: { status: 200, type: 'text/plain; charset=utf-8', body: llmsTxt() } }
      case '/robots.txt':
        return { reply: { status: 200, type: 'text/plain; charset=utf-8', body: robotsTxt(origins.site) } }
      case '/sitemap.xml':
        return { reply: { status: 200, type: 'application/xml', body: sitemapXml(origins.site) } }
    }
    return { reply: html(renderNotFound(ctx), 404) }
  }

  async function handle(surface: Surface, req: IncomingMessage, res: ServerResponse) {
    const started = Date.now()
    const url = new URL(req.url ?? '/', 'http://probe.invalid')
    const cookies = parseCookies(req.headers.cookie)
    const setCookies: string[] = []

    // A run starts at /start/<code>: tag the browser with the run and a fresh visitor id.
    let visitor = cookies.pv
    let run = cookies.run && isRunCode(cookies.run) ? cookies.run : undefined
    let newVisitor = false
    const start = /^\/start\/([^/]+)$/.exec(url.pathname)
    if (start && isRunCode(start[1])) {
      run = start[1]
      visitor = newId()
      newVisitor = true
      setCookies.push(setCookie('run', run, 7200), setCookie('pv', visitor, 86400))
    } else if (!visitor && surface === 'site') {
      visitor = newId()
      newVisitor = true
      setCookies.push(setCookie('pv', visitor, 86400))
    }

    let reply: Reply
    let record: Record<string, unknown> | undefined
    try {
      const body = req.method === 'POST' ? await readBody(req) : ''
      ;({ reply, record } = await route(req, url, body))
    } catch (e) {
      reply = { status: (e as Error).message === 'body too large' ? 413 : 500 }
      console.error(e)
    }

    const headers: Record<string, string | string[]> = {
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...reply.headers,
    }
    if (reply.type) headers['content-type'] = reply.type
    if (setCookies.length) headers['set-cookie'] = setCookies
    res.writeHead(reply.status, headers)
    res.end(req.method === 'HEAD' ? undefined : reply.body)

    // Log after replying, so checking a signature never slows the page down.
    const publicOrigin = new URL(origins[surface])
    const flat = flatHeaders(req)
    const signature = await checkSignature(
      {
        method: req.method ?? 'GET',
        scheme: publicOrigin.protocol.replace(':', ''),
        authorities: [publicOrigin.host, flat['x-forwarded-host'], flat.host].filter((h): h is string => Boolean(h)),
        path: req.url ?? '/',
        headers: flat,
      },
      fetchKeys,
    )
    const common = {
      at: new Date(started).toISOString(),
      surface,
      ip: clientIp(req),
      ua: flat['user-agent'],
      visitor,
      run,
    }
    log.write({
      type: 'http',
      ...common,
      method: req.method,
      path: url.pathname,
      query: url.search || undefined,
      status: reply.status,
      newVisitor,
      cookieSent: Boolean(req.headers.cookie),
      socketIp: req.socket.remoteAddress,
      uaCheck: checkUserAgent(flat['user-agent'], flat['sec-ch-ua']),
      signature,
      headers: flat,
      ms: Date.now() - started,
    })
    if (record) log.write({ ...common, ...record })
  }

  const listen = (surface: Surface, port: number) =>
    new Promise<Server>((ok, fail) => {
      const server = createServer((req, res) => {
        handle(surface, req, res).catch((e) => {
          console.error(e)
          if (!res.headersSent) res.writeHead(500).end()
        })
      })
      server.on('error', fail)
      server.listen(port, host, () => ok(server))
    })

  const site = await listen('site', options.sitePort ?? 8787)
  const collector = await listen('collector', options.collectorPort ?? 8788)
  const local = (s: Server) => `http://localhost:${(s.address() as AddressInfo).port}`
  origins.site ||= local(site)
  origins.collector ||= local(collector)

  return {
    siteOrigin: origins.site,
    collectorOrigin: origins.collector,
    logFile: log.file,
    flushed: log.flushed,
    async close() {
      for (const s of [site, collector]) {
        s.closeAllConnections()
        await new Promise((ok) => s.close(ok))
      }
      await log.flushed()
    },
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const env = process.env
  if (Boolean(env.SITE_ORIGIN) !== Boolean(env.COLLECTOR_ORIGIN))
    console.warn('Set both SITE_ORIGIN and COLLECTOR_ORIGIN: pages load the tag from the collector origin.')
  const probe = await startProbe({
    host: env.HOST,
    sitePort: env.SITE_PORT ? Number(env.SITE_PORT) : undefined,
    collectorPort: env.COLLECTOR_PORT ? Number(env.COLLECTOR_PORT) : undefined,
    siteOrigin: env.SITE_ORIGIN,
    collectorOrigin: env.COLLECTOR_ORIGIN,
    dataDir: env.DATA_DIR,
  })
  console.log(`Probe site:      ${probe.siteOrigin}`)
  console.log(`Probe collector: ${probe.collectorOrigin}`)
  console.log(`Logging to:      ${probe.logFile()}`)
  console.log(`Start a run at:  ${probe.siteOrigin}/start/<code>   (codes in prototype/probe/runs.ts)`)
}
