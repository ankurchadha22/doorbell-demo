import assert from 'node:assert/strict'
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { briefFor, openTunnel, runSheet } from '../public.ts'

// A stand-in for cloudflared, so the test never opens a real tunnel.
async function fakeCloudflared(script: string) {
  const dir = await mkdtemp(join(tmpdir(), 'fake-cloudflared-'))
  const file = join(dir, 'cloudflared')
  await writeFile(file, `#!/bin/sh\n${script}\n`)
  await chmod(file, 0o755)
  return { file, cleanup: () => rm(dir, { recursive: true, force: true }) }
}

test('reads the public URL that cloudflared prints on stderr', async () => {
  const fake = await fakeCloudflared('echo "INF |  https://calm-river-1234.trycloudflare.com  |" 1>&2\nsleep 30')
  try {
    const tunnel = await openTunnel(8787, fake.file)
    assert.equal(tunnel.url, 'https://calm-river-1234.trycloudflare.com')
    tunnel.stop()
  } finally {
    await fake.cleanup()
  }
})

test('explains how to install cloudflared when it is missing', async () => {
  await assert.rejects(openTunnel(8787, '/nonexistent/cloudflared-missing'), /not installed/)
})

test('fails clearly when cloudflared exits without a URL', async () => {
  const fake = await fakeCloudflared('echo "failed to connect" 1>&2\nexit 3')
  try {
    await assert.rejects(openTunnel(8787, fake.file), /exited with code 3/)
  } finally {
    await fake.cleanup()
  }
})

test('the run sheet lists every agent run with its URL and never hints at the facts panel', () => {
  const sheet = runSheet('https://calm-river-1234.trycloudflare.com')
  assert.match(sheet, /\| c1 \| ChatGPT Agent/)
  assert.match(sheet, /https:\/\/calm-river-1234\.trycloudflare\.com\/start\/k3/)
  assert.doesNotMatch(sheet, /\| x1 \|/)
  const brief = briefFor('https://example.com/start/c1')
  assert.doesNotMatch(brief, /facts|ask box|panel/i)
  assert.match(brief, /free trial/)
})
