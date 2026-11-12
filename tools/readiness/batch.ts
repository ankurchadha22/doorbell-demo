// Scans many sites: different hosts in parallel, each host still at most one request per second.
// Resumable: a domain whose JSON already exists is read back instead of scanned, unless --force.
//
//   node tools/readiness/batch.ts domains.txt --out private/data/readiness/batch-1 --concurrency 4

import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import type { Browser } from 'playwright'
import { launchBrowser } from './browser.ts'
import { DEFAULT_OUT_DIR, type Limits } from './config.ts'
import { fileStem, writeOutputs } from './scan.ts'
import { normalizeTarget, scanSite } from './scanner.ts'
import { summarize, summaryMarkdown, summaryRow, toCsv } from './summary.ts'
import type { ScanResult } from './types.ts'

/** One target per line; blank lines, # comments and duplicates are dropped. */
export function parseDomainList(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of text.split(/\r?\n/)) {
    const t = line.replace(/#.*$/, '').trim()
    if (!t) continue
    let key: string
    try {
      key = normalizeTarget(t).domain
    } catch {
      continue
    }
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

export interface BatchOptions {
  outDir: string
  concurrency: number
  force?: boolean
  browser?: Browser
  limits?: Partial<Limits>
  log?: (line: string) => void
}

export async function runBatch(targets: string[], opts: BatchOptions) {
  const results: ScanResult[] = []
  const failed: string[] = []
  const log = opts.log ?? (() => {})
  let next = 0
  const worker = async () => {
    while (next < targets.length) {
      const target = targets[next++]
      const file = join(opts.outDir, `${fileStem(normalizeTarget(target).domain)}.json`)
      if (!opts.force && existsSync(file)) {
        results.push(JSON.parse(await readFile(file, 'utf8')) as ScanResult)
        log(`skip ${target} (already scanned)`)
        continue
      }
      try {
        const r = await scanSite(target, { browser: opts.browser, limits: opts.limits })
        await writeOutputs(r, opts.outDir)
        results.push(r)
        log(`done ${r.domain}: ${r.score.total ?? '–'} (${r.score.grade})`)
      } catch (e) {
        failed.push(target)
        log(`fail ${target}: ${(e as Error).message}`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency) }, worker))
  results.sort((a, b) => a.domain.localeCompare(b.domain))
  const summary = summarize(results, failed)
  const now = new Date().toISOString()
  await writeFile(join(opts.outDir, 'summary.csv'), toCsv(results.map(summaryRow)))
  await writeFile(join(opts.outDir, 'summary.json'), JSON.stringify({ generatedAt: now, ...summary, rows: results.map(summaryRow) }, null, 2) + '\n')
  await writeFile(join(opts.outDir, 'summary.md'), summaryMarkdown(summary, now))
  return { results, failed, summary }
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { out: { type: 'string' }, concurrency: { type: 'string' }, 'no-browser': { type: 'boolean' }, force: { type: 'boolean' } },
  })
  if (!positionals[0]) {
    console.error('usage: node tools/readiness/batch.ts <file> [--out <dir>] [--concurrency 4] [--no-browser] [--force]')
    process.exit(2)
  }
  const targets = parseDomainList(await readFile(positionals[0], 'utf8'))
  const outDir = resolve(values.out ?? DEFAULT_OUT_DIR)
  let browser: Browser | undefined
  if (!values['no-browser']) {
    try {
      browser = await launchBrowser()
    } catch (e) {
      console.error(`browser unavailable, continuing without the JavaScript render: ${(e as Error).message.split('\n')[0]}`)
    }
  }
  try {
    const { summary } = await runBatch(targets, { outDir, concurrency: Number(values.concurrency ?? 4), force: values.force, browser, log: (l) => console.log(l) })
    console.log(`\n${summary.domains} domains, median score ${summary.medianScore ?? '–'}. Wrote ${join(outDir, 'summary.{csv,json,md}')}`)
  } finally {
    await browser?.close()
  }
}

if (import.meta.main) await main()
