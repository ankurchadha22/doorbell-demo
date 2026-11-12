// Runs the Step 0 probe behind two public URLs with one command, so real cloud agents can reach it.
//
//   npm run probe:public
//
// It opens two Cloudflare quick tunnels (no account needed; install with `brew install cloudflared`),
// one for the test vendor site and one for the collector, starts the probe with those public
// origins, and writes a run sheet: for every run code, the URL to give the agent and the brief to
// paste. The tunnels live as long as this process does; press Ctrl+C to stop everything.
//
// Two tunnels on purpose: the collector must be a different hostname from the site, as Doorbell's
// tag would be, so we can see whether agents sign or block third-party requests.

import { spawn, type ChildProcess } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runs } from './runs.ts'
import { startProbe } from './server.ts'

const here = dirname(fileURLToPath(import.meta.url))
const TUNNEL_URL = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/
const TUNNEL_TIMEOUT_MS = 45_000

export interface Tunnel {
  url: string
  stop: () => void
}

/** Starts one quick tunnel to a local port and resolves with its public URL. */
export function openTunnel(port: number, command = process.env.CLOUDFLARED ?? 'cloudflared'): Promise<Tunnel> {
  return new Promise((ok, fail) => {
    let child: ChildProcess
    try {
      child = spawn(command, ['tunnel', '--url', `http://localhost:${port}`], { stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (e) {
      fail(e)
      return
    }
    let settled = false
    let seen = ''
    const stop = () => child.kill('SIGTERM')
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      stop()
      fail(new Error(`No tunnel URL for port ${port} after ${TUNNEL_TIMEOUT_MS / 1000} s. Last output:\n${seen.slice(-600)}`))
    }, TUNNEL_TIMEOUT_MS)
    // cloudflared prints the URL on stderr; read both streams in case that changes.
    const onData = (chunk: Buffer) => {
      seen += chunk.toString('utf8')
      const url = TUNNEL_URL.exec(seen)?.[0]
      if (url && !settled) {
        settled = true
        clearTimeout(timer)
        ok({ url, stop })
      }
    }
    child.stdout?.on('data', onData)
    child.stderr?.on('data', onData)
    child.on('error', (e: NodeJS.ErrnoException) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      fail(
        e.code === 'ENOENT'
          ? new Error(`"${command}" is not installed. Install it (macOS: brew install cloudflared) and run this again.`)
          : e,
      )
    })
    child.on('exit', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      fail(new Error(`${command} exited with code ${code} before giving a URL:\n${seen.slice(-600)}`))
    })
  })
}

/** The brief every agent gets, word for word, so runs are comparable. It never mentions the facts panel or ask box. */
export const briefFor = (startUrl: string) =>
  [
    `I'm Head of Operations at a 40-person fintech, and we're evaluating a BI tool from a company called Vendor. Go to ${startUrl} and find out:`,
    '1. Does it connect to Stripe and QuickBooks?',
    '2. Can we embed dashboards in our app so each customer sees only their own data?',
    '3. What would it cost per year for 40 users with embedding?',
    '4. Are they SOC 2 Type II?',
    '5. Is there a free trial?',
    '',
    'Give me a short answer to each, and say where you found it.',
  ].join('\n')

export function runSheet(siteOrigin: string): string {
  const lines = [
    '# Step 0 run sheet',
    '',
    `Site: ${siteOrigin}`,
    '',
    'For each row: open a FRESH session of that agent (new chat or thread), paste the brief below with that row\'s URL, let it finish, and note anything odd. Do the two human rows yourself in your normal browser. Skip agents you can\'t access. Do not mention the facts panel or the ask box.',
    '',
    '| Done | Code | Agent | How | URL to use in the brief |',
    '|---|---|---|---|---|',
    ...runs
      .filter((r) => r.code !== 'x1')
      .map((r) => `| [ ] | ${r.code} | ${r.agent} | ${r.how} | ${siteOrigin}/start/${r.code} |`),
    '',
    '## The brief (replace the URL with the row\'s URL)',
    '',
    '```',
    briefFor(`${siteOrigin}/start/<code>`),
    '```',
    '',
    'When every run is done, keep this window open, and in a second terminal run:',
    '',
    '```',
    'npm run probe:report',
    '```',
    '',
    'The report is written to prototype/probe/reports/step0.md.',
    '',
  ]
  return lines.join('\n')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sitePort = Number(process.env.SITE_PORT ?? 8787)
  const collectorPort = Number(process.env.COLLECTOR_PORT ?? 8788)
  const tunnels: Tunnel[] = []
  const stopAll = () => tunnels.forEach((t) => t.stop())
  try {
    console.log('Opening two public tunnels (this takes a few seconds)...')
    // One after the other: quick tunnels are rate limited, and the order keeps the output readable.
    tunnels.push(await openTunnel(sitePort))
    tunnels.push(await openTunnel(collectorPort))
    const [site, collector] = tunnels
    const probe = await startProbe({ sitePort, collectorPort, siteOrigin: site.url, collectorOrigin: collector.url, dataDir: process.env.DATA_DIR })
    const sheet = runSheet(probe.siteOrigin)
    const sheetFile = join(process.env.DATA_DIR ?? join(here, 'data'), 'run-sheet.md')
    await mkdir(dirname(sheetFile), { recursive: true })
    await writeFile(sheetFile, sheet)
    console.log(`\nProbe site (public):      ${probe.siteOrigin}`)
    console.log(`Probe collector (public): ${probe.collectorOrigin}`)
    console.log(`Logging to:               ${probe.logFile()}`)
    console.log(`Run sheet saved to:       ${sheetFile}\n`)
    console.log(sheet)
    console.log('Leave this running while you do the runs. Ctrl+C stops the probe and closes the tunnels.')
    const shutdown = async () => {
      stopAll()
      await probe.close()
      process.exit(0)
    }
    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  } catch (e) {
    stopAll()
    console.error((e as Error).message)
    process.exit(1)
  }
}
