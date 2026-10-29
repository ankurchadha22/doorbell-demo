// Web Bot Auth: verifies the HTTP message signature some AI agents add to their requests
// (draft-meunier-webbotauth-httpsig-protocol, built on RFC 9421). The agent names its key directory in
// the Signature-Agent header; we fetch the public keys from there and check the signature over the
// components it covers. ChatGPT Agent, for example, publishes Ed25519 keys at
// https://chatgpt.com/.well-known/http-message-signatures-directory.

import { constants, createHash, createPublicKey, verify, type JsonWebKey } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'

/* ---------- Structured fields (RFC 8941), only as much as Web Bot Auth needs ---------- */

type Bare = string | number | boolean | Uint8Array

export interface Item {
  value: Bare
  params: Map<string, Bare>
  /** The item exactly as sent, which is what a signature base repeats. */
  raw: string
}

export interface InnerList {
  items: Item[]
  params: Map<string, Bare>
  raw: string
}

export type Member = Item | InnerList

class Parser {
  s: string
  i = 0

  constructor(s: string) {
    this.s = s
  }

  fail(msg: string): never {
    throw new Error(`${msg} at character ${this.i}`)
  }

  ows() {
    while (this.s[this.i] === ' ' || this.s[this.i] === '\t') this.i++
  }

  sp() {
    while (this.s[this.i] === ' ') this.i++
  }

  key(): string {
    const m = /^[a-z*][a-z0-9_\-.*]*/.exec(this.s.slice(this.i))
    if (!m) return this.fail('expected a key')
    this.i += m[0].length
    return m[0]
  }

  bare(): Bare {
    const c = this.s[this.i]
    if (c === '"') return this.string()
    if (c === ':') {
      const end = this.s.indexOf(':', this.i + 1)
      if (end < 0) return this.fail('unterminated byte sequence')
      const bytes = Buffer.from(this.s.slice(this.i + 1, end), 'base64')
      this.i = end + 1
      return bytes
    }
    if (c === '?') {
      const v = this.s[this.i + 1]
      if (v !== '0' && v !== '1') return this.fail('bad boolean')
      this.i += 2
      return v === '1'
    }
    const num = /^-?\d+(\.\d+)?/.exec(this.s.slice(this.i))
    if (num) {
      this.i += num[0].length
      return Number(num[0])
    }
    const token = /^[A-Za-z*][A-Za-z0-9!#$%&'*+\-.^_`|~:/]*/.exec(this.s.slice(this.i))
    if (token) {
      this.i += token[0].length
      return token[0]
    }
    return this.fail('unexpected character')
  }

  string(): string {
    let out = ''
    this.i++
    while (this.i < this.s.length) {
      const c = this.s[this.i++]
      if (c === '"') return out
      if (c === '\\') {
        const next = this.s[this.i++]
        if (next !== '"' && next !== '\\') return this.fail('bad escape')
        out += next
      } else out += c
    }
    return this.fail('unterminated string')
  }

  params(): Map<string, Bare> {
    const params = new Map<string, Bare>()
    while (this.s[this.i] === ';') {
      this.i++
      this.sp()
      const k = this.key()
      let v: Bare = true
      if (this.s[this.i] === '=') {
        this.i++
        v = this.bare()
      }
      params.set(k, v)
    }
    return params
  }

  item(): Item {
    const start = this.i
    const value = this.bare()
    const params = this.params()
    return { value, params, raw: this.s.slice(start, this.i) }
  }

  member(): Member {
    if (this.s[this.i] !== '(') return this.item()
    const start = this.i++
    const items: Item[] = []
    for (;;) {
      this.sp()
      if (this.s[this.i] === ')') {
        this.i++
        break
      }
      items.push(this.item())
      const c = this.s[this.i]
      if (c !== ' ' && c !== ')') return this.fail('expected a space or )')
    }
    const params = this.params()
    return { items, params, raw: this.s.slice(start, this.i) }
  }

  dictionary(): Map<string, Member> {
    const dict = new Map<string, Member>()
    this.ows()
    while (this.i < this.s.length) {
      const k = this.key()
      if (this.s[this.i] === '=') {
        this.i++
        dict.set(k, this.member())
      } else {
        const start = this.i
        const params = this.params()
        dict.set(k, { value: true, params, raw: this.s.slice(start, this.i) })
      }
      this.ows()
      if (this.i >= this.s.length) break
      if (this.s[this.i] !== ',') return this.fail('expected ,')
      this.i++
      this.ows()
    }
    return dict
  }

  end<T>(value: T): T {
    this.ows()
    if (this.i < this.s.length) return this.fail('unexpected trailing text')
    return value
  }
}

export const parseDictionary = (s: string) => {
  const p = new Parser(s.trim())
  return p.end(p.dictionary())
}

export const parseItem = (s: string) => {
  const p = new Parser(s.trim())
  return p.end(p.item())
}

const isList = (m: Member | undefined): m is InnerList => m !== undefined && 'items' in m

/* ---------- Keys ---------- */

/** The base64url JWK SHA-256 thumbprint (RFC 7638) that Web Bot Auth uses as the keyid. */
export function jwkThumbprint(jwk: JsonWebKey): string {
  const members =
    jwk.kty === 'RSA'
      ? { e: jwk.e, kty: jwk.kty, n: jwk.n }
      : jwk.kty === 'EC'
        ? { crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y }
        : { crv: jwk.crv, kty: jwk.kty, x: jwk.x }
  return createHash('sha256').update(JSON.stringify(members)).digest('base64url')
}

export type KeyFetcher = (directoryUrl: string) => Promise<JsonWebKey[]>

const privateRanges = new BlockList()
for (const [net, bits] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
] as const)
  privateRanges.addSubnet(net, bits, 'ipv4')
for (const [net, bits] of [
  ['::', 127],
  ['::ffff:0:0', 96],
  ['fc00::', 7],
  ['fe80::', 10],
] as const)
  privateRanges.addSubnet(net, bits, 'ipv6')

/** Refuses directories on private networks, so a forged Signature-Agent can't make the probe call inward. */
async function assertPublicHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true })
  for (const a of addresses)
    if (privateRanges.check(a.address, a.family === 6 ? 'ipv6' : 'ipv4')) throw new Error('directory is on a private network')
}

async function loadDirectory(url: string): Promise<JsonWebKey[]> {
  const u = new URL(url)
  if (u.protocol !== 'https:') throw new Error('directory must be served over https')
  await assertPublicHost(u.hostname)
  const res = await fetch(u, {
    redirect: 'error',
    signal: AbortSignal.timeout(3000),
    headers: { accept: 'application/http-message-signatures-directory+json, application/json' },
  })
  if (!res.ok) throw new Error(`directory returned ${res.status}`)
  if (Number(res.headers.get('content-length') ?? 0) > 64_000) throw new Error('directory is too large')
  const body = JSON.parse(await res.text()) as { keys?: unknown }
  if (!Array.isArray(body.keys)) throw new Error('directory has no keys')
  return body.keys as JsonWebKey[]
}

const directoryCache = new Map<string, { at: number; keys?: JsonWebKey[]; error?: string }>()

/** Fetches a key directory, keeping keys for 10 minutes and failures for 1. */
export const fetchDirectory: KeyFetcher = async (url) => {
  const hit = directoryCache.get(url)
  if (hit && Date.now() - hit.at < (hit.keys ? 600_000 : 60_000)) {
    if (hit.keys) return hit.keys
    throw new Error(hit.error)
  }
  try {
    const keys = await loadDirectory(url)
    directoryCache.set(url, { at: Date.now(), keys })
    return keys
  } catch (e) {
    directoryCache.set(url, { at: Date.now(), error: (e as Error).message })
    throw e
  }
}

/* ---------- Verification ---------- */

export interface SignedRequest {
  method: string
  scheme: string
  /** Hosts the request may have been signed for: the public host first, then what the server saw. */
  authorities: string[]
  /** Path with query string. */
  path: string
  /** Lower-case header names. */
  headers: Record<string, string | undefined>
}

export interface SignatureCheck {
  /** Any of Signature, Signature-Input or Signature-Agent was sent. */
  present: boolean
  verified: boolean
  /** Why it did or didn't verify, in a few words. */
  reason: string
  agent?: string
  keyid?: string
  tag?: string
  alg?: string
  components?: string[]
  created?: number
  expires?: number
  /** The host the signature verified for. */
  authority?: string
}

const str = (v: Bare | undefined) => (typeof v === 'string' ? v : undefined)
const num = (v: Bare | undefined) => (typeof v === 'number' ? v : undefined)

/** The agent's key directory: the dictionary member the signature covers, or the legacy bare string. */
function signatureAgent(header: string | undefined, input: InnerList, label: string) {
  if (!header) return undefined
  const covered = input.items.find((c) => c.value === 'signature-agent')
  try {
    const dict = parseDictionary(header)
    const member = dict.get(str(covered?.params.get('key')) ?? label) ?? [...dict.values()][0]
    if (member && !isList(member) && typeof member.value === 'string')
      return { url: member.value, type: str(member.params.get('type')) ?? 'directory' }
  } catch {
    // Not a dictionary: fall through to the legacy form.
  }
  try {
    const item = parseItem(header)
    if (typeof item.value === 'string') return { url: item.value, type: 'directory' }
  } catch {
    // Neither form.
  }
  return undefined
}

function directoryUrl(agent: { url: string; type: string }) {
  const u = new URL(agent.url)
  const wellKnown = '/.well-known/http-message-signatures-directory'
  if (agent.type === 'jwks_uri' || u.pathname.endsWith(wellKnown)) return u.href
  return new URL(wellKnown, u.origin).href
}

function componentValue(c: Item, req: SignedRequest, authority: string): string | undefined {
  const name = c.value
  if (typeof name !== 'string') return undefined
  const [path, query] = req.path.split('?', 2)
  switch (name) {
    case '@authority':
      return authority
    case '@method':
      return req.method.toUpperCase()
    case '@scheme':
      return req.scheme
    case '@target-uri':
      return `${req.scheme}://${authority}${req.path}`
    case '@request-target':
      return req.path
    case '@path':
      return path
    case '@query':
      return `?${query ?? ''}`
  }
  if (name.startsWith('@')) return undefined
  const raw = req.headers[name]
  if (raw === undefined) return undefined
  const key = str(c.params.get('key'))
  if (key === undefined) return raw.trim()
  const member = parseDictionary(raw).get(key)
  return member && !isList(member) ? member.raw : undefined
}

/** The RFC 9421 signature base, or undefined if it covers a component we can't rebuild. */
export function signatureBase(input: InnerList, req: SignedRequest, authority: string): string | undefined {
  const lines: string[] = []
  for (const c of input.items) {
    const value = componentValue(c, req, authority)
    if (value === undefined) return undefined
    lines.push(`${c.raw}: ${value}`)
  }
  lines.push(`"@signature-params": ${input.raw}`)
  return lines.join('\n')
}

function verifyWith(jwk: JsonWebKey, alg: string | undefined, data: Buffer, signature: Uint8Array): boolean {
  const key = createPublicKey({ key: jwk, format: 'jwk' })
  const algorithm =
    alg ?? (jwk.kty === 'OKP' ? 'ed25519' : jwk.kty === 'EC' ? 'ecdsa-p256-sha256' : jwk.kty === 'RSA' ? 'rsa-pss-sha512' : '')
  switch (algorithm) {
    case 'ed25519':
      return verify(null, data, key, signature)
    case 'ecdsa-p256-sha256':
      return verify('sha256', data, { key, dsaEncoding: 'ieee-p1363' }, signature)
    case 'rsa-pss-sha512':
      return verify('sha512', data, { key, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 64 }, signature)
    case 'rsa-v1_5-sha256':
      return verify('sha256', data, key, signature)
    default:
      return false
  }
}

export async function checkSignature(
  req: SignedRequest,
  fetchKeys: KeyFetcher = fetchDirectory,
  now = Math.floor(Date.now() / 1000),
): Promise<SignatureCheck> {
  const h = req.headers
  const present = Boolean(h['signature'] || h['signature-input'] || h['signature-agent'])
  if (!present) return { present, verified: false, reason: 'not signed' }
  let out: SignatureCheck = { present, verified: false, reason: '' }
  try {
    const inputs = parseDictionary(h['signature-input'] ?? '')
    const signatures = parseDictionary(h['signature'] ?? '')
    // A request may carry several signatures; prefer the one tagged for Web Bot Auth.
    const labels = [...inputs.keys()]
    const label = labels.find((l) => inputs.get(l)?.params.get('tag') === 'web-bot-auth') ?? labels[0]
    const input = label === undefined ? undefined : inputs.get(label)
    if (label === undefined || !isList(input)) return { ...out, reason: 'no Signature-Input' }
    const p = input.params
    const agent = signatureAgent(h['signature-agent'], input, label)
    out = {
      ...out,
      agent: agent?.url,
      keyid: str(p.get('keyid')),
      tag: str(p.get('tag')),
      alg: str(p.get('alg')),
      created: num(p.get('created')),
      expires: num(p.get('expires')),
      components: input.items.map((c) => c.raw),
    }
    const sigMember = signatures.get(label)
    const signature = sigMember && !isList(sigMember) && sigMember.value instanceof Uint8Array ? sigMember.value : undefined
    if (!signature) return { ...out, reason: `no Signature for ${label}` }
    if (out.expires !== undefined && out.expires < now) return { ...out, reason: 'expired' }
    if (out.created !== undefined && out.created > now + 60) return { ...out, reason: 'created in the future' }
    if (!agent) return { ...out, reason: 'no Signature-Agent' }
    if (!out.keyid) return { ...out, reason: 'no keyid' }
    const keys = await fetchKeys(directoryUrl(agent))
    const jwk = keys.find((k) => (k as { kid?: string }).kid === out.keyid || jwkThumbprint(k) === out.keyid)
    if (!jwk) return { ...out, reason: 'key not in directory' }
    for (const authority of new Set(req.authorities)) {
      const base = signatureBase(input, req, authority)
      if (base === undefined) return { ...out, reason: 'covers a component we cannot check' }
      if (verifyWith(jwk, out.alg, Buffer.from(base), signature)) return { ...out, verified: true, reason: 'verified', authority }
    }
    return { ...out, reason: 'signature does not match' }
  } catch (e) {
    return { ...out, reason: `error: ${(e as Error).message}` }
  }
}
