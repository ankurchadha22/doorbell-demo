// Scans one site and writes <out>/<domain>.json and <out>/<domain>.html.
//
//   node tools/readiness/scan.ts example.com
//   node tools/readiness/scan.ts https://www.example.com --out /tmp/scans --no-browser --json

import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import type { Browser } from 'playwright'
import { launchBrowser } from './browser.ts'
import { DEFAULT_OUT_DIR } from './config.ts'
import { renderReport } from './report.ts'
import { scanSite } from './scanner.ts'
import type { ScanResult } from './types.ts'

/** A file name from the domain: only letters, digits, dots and dashes. */
export function fileStem(domain: string): string {
  return domain.toLowerCase().replace(/[^a-z0-9.-]+/g, '_')
}

export async function writeOutputs(r: ScanResult, outDir: string): Promise<{ json: string; html: string }> {
  await mkdir(outDir, { recursive: true })
  const stem = fileStem(r.domain)
  const json = join(outDir, `${stem}.json`)
  const html = join(outDir, `${stem}.html`)
  await writeFile(json, JSON.stringify(r, null, 2) + '\n')
  await writeFile(html, renderReport(r))
  return { json, html }
}

export function terminalSummary(r: ScanResult): string {
  const lines = [`${r.domain}: ${r.score.total ?? '–'}/100 (${r.score.grade})`]
  for (const c of r.score.categories) lines.push(`  ${c.label.padEnd(18)} ${c.points === null ? 'could not check' : `${Math.round(c.points)}/${c.max}`}`)
  if (r.score.topFindings.length) lines.push('  Fix first:')
  for (const f of r.score.topFindings) lines.push(`   - [${f.severity}] ${f.title}`)
  return lines.join('\n')
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { out: { type: 'string' }, 'no-browser': { type: 'boolean' }, json: { type: 'boolean' } },
  })
  const target = positionals[0]
  if (!target) {
    console.error('usage: node tools/readiness/scan.ts <domain-or-url> [--out <dir>] [--no-browser] [--json]')
    process.exit(2)
  }
  let browser: Browser | undefined
  if (!values['no-browser']) {
    try {
      browser = await launchBrowser()
    } catch (e) {
      console.error(`browser unavailable, continuing without the JavaScript render: ${(e as Error).message.split('\n')[0]}`)
    }
  }
  try {
    const r = await scanSite(target, { browser })
    const files = await writeOutputs(r, resolve(values.out ?? DEFAULT_OUT_DIR))
    if (values.json) console.log(JSON.stringify(r, null, 2))
    else console.log(`${terminalSummary(r)}\n  ${files.json}\n  ${files.html}`)
  } finally {
    await browser?.close()
  }
}

if (import.meta.main) await main()
