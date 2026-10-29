import assert from 'node:assert/strict'
import { createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto'
import { test } from 'node:test'
import { checkSignature, jwkThumbprint, parseDictionary, signatureBase, type InnerList, type SignedRequest } from '../webBotAuth.ts'

test('rebuilds the RFC 9421 Ed25519 example (B.2.6) and verifies its signature', () => {
  const input = '("date" "@method" "@path" "@authority" "content-type" "content-length");created=1618884473;keyid="test-key-ed25519"'
  const req: SignedRequest = {
    method: 'POST',
    scheme: 'https',
    authorities: ['example.com'],
    path: '/foo?param=Value&Pet=dog',
    headers: { date: 'Tue, 20 Apr 2021 02:07:55 GMT', 'content-type': 'application/json', 'content-length': '18' },
  }
  const list = parseDictionary(`sig-b26=${input}`).get('sig-b26') as InnerList
  const base = signatureBase(list, req, 'example.com')
  assert.equal(
    base,
    [
      '"date": Tue, 20 Apr 2021 02:07:55 GMT',
      '"@method": POST',
      '"@path": /foo',
      '"@authority": example.com',
      '"content-type": application/json',
      '"content-length": 18',
      `"@signature-params": ${input}`,
    ].join('\n'),
  )
  const key = createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: 'JrQLj5P_89iXES9-vFgrIy29clF9CC_oPPsw3c5D0bs' }, format: 'jwk' })
  const signature = Buffer.from('wqcAqbmYJ2ji2glfAMaRy4gruYYnx2nEFN2HN6jrnDnQCK1u02Gb04v9EDgwUPiu4A0w6vuQv5lIp5WPpBKRCw==', 'base64')
  assert.ok(verify(null, Buffer.from(base!), key, signature))
})

test('thumbprint matches the keyid ChatGPT publishes for its key', () => {
  const jwk = { crv: 'Ed25519', kty: 'OKP', x: 'P_1c4SX6fCavDcq6FRegWcVvaOKsp_aXHPEN1FcKDIA' }
  assert.equal(jwkThumbprint(jwk), 'ArwjqcCqtA5oxEWkzXGC-To_0A9whHmajCHtfe8I9aY')
})

/* ---------- A Web Bot Auth request signed with a test key ---------- */

const { publicKey, privateKey } = generateKeyPairSync('ed25519')
const jwk = publicKey.export({ format: 'jwk' })
const keyid = jwkThumbprint(jwk)
const now = 1_800_000_000
const directory = 'https://agent.test/.well-known/http-message-signatures-directory'
const fetchKeys = async (url: string) => {
  assert.equal(url, directory)
  return [jwk]
}

function signedRequest(opts: { authority?: string; expires?: number; legacy?: boolean } = {}): SignedRequest {
  const agent = '"https://agent.test"'
  const component = opts.legacy ? '"signature-agent"' : '"signature-agent";key="sig1"'
  const params = `("@authority" ${component});created=${now - 10};expires=${opts.expires ?? now + 300};keyid="${keyid}";alg="ed25519";tag="web-bot-auth"`
  const base = [`"@authority": ${opts.authority ?? 'vendor.test'}`, `${component}: ${agent}`, `"@signature-params": ${params}`].join('\n')
  const signature = sign(null, Buffer.from(base), privateKey).toString('base64')
  return {
    method: 'GET',
    scheme: 'https',
    authorities: ['vendor.test', 'localhost:8787'],
    path: '/pricing',
    headers: {
      'signature-input': `sig1=${params}`,
      signature: `sig1=:${signature}:`,
      'signature-agent': opts.legacy ? agent : `sig1=${agent}`,
    },
  }
}

test('verifies a signed request and reports the agent', async () => {
  const check = await checkSignature(signedRequest(), fetchKeys, now)
  assert.equal(check.reason, 'verified')
  assert.equal(check.verified, true)
  assert.equal(check.agent, 'https://agent.test')
  assert.equal(check.authority, 'vendor.test')
  assert.equal(check.tag, 'web-bot-auth')
})

test('accepts the legacy bare-string Signature-Agent', async () => {
  const check = await checkSignature(signedRequest({ legacy: true }), fetchKeys, now)
  assert.equal(check.reason, 'verified')
})

test('tries each host the request may have been signed for', async () => {
  const check = await checkSignature(signedRequest({ authority: 'localhost:8787' }), fetchKeys, now)
  assert.equal(check.authority, 'localhost:8787')
})

test('rejects a signature for another host', async () => {
  const check = await checkSignature(signedRequest({ authority: 'elsewhere.test' }), fetchKeys, now)
  assert.equal(check.verified, false)
  assert.equal(check.reason, 'signature does not match')
})

test('rejects an expired signature', async () => {
  const check = await checkSignature(signedRequest({ expires: now - 1 }), fetchKeys, now)
  assert.equal(check.reason, 'expired')
})

test('rejects a key that is not in the directory', async () => {
  const other = generateKeyPairSync('ed25519').publicKey.export({ format: 'jwk' })
  const check = await checkSignature(signedRequest(), async () => [other], now)
  assert.equal(check.reason, 'key not in directory')
})

test('reports an unsigned request as not signed', async () => {
  const check = await checkSignature({ method: 'GET', scheme: 'https', authorities: ['vendor.test'], path: '/', headers: {} }, fetchKeys, now)
  assert.deepEqual(check, { present: false, verified: false, reason: 'not signed' })
})

test('does not throw on malformed headers', async () => {
  const req = signedRequest()
  req.headers['signature-input'] = 'sig1=("@authority"'
  const check = await checkSignature(req, fetchKeys, now)
  assert.equal(check.verified, false)
  assert.match(check.reason, /^error: /)
})
