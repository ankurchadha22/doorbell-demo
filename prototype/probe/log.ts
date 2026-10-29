// Append-only JSON-lines log, one file per day. Raw logs hold IP addresses and full headers, so
// data/ is kept out of git; the report masks IPs before anything is shared.

import { appendFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

/** Stop logging past this size, so a public URL can't fill the disk. */
const MAX_BYTES = 200 * 1024 * 1024

export function createLog(dir: string) {
  let written = 0
  let queue: Promise<void> = mkdir(dir, { recursive: true }).then(() => undefined)
  const file = () => join(dir, `probe-${new Date().toISOString().slice(0, 10)}.jsonl`)
  return {
    file,
    write(record: Record<string, unknown>) {
      const line = JSON.stringify(record) + '\n'
      if (written + line.length > MAX_BYTES) return
      written += line.length
      queue = queue.then(() => appendFile(file(), line)).catch((e) => console.error('log write failed:', e))
    },
    /** Resolves once every write so far is on disk. */
    flushed: () => queue,
  }
}

export type Log = ReturnType<typeof createLog>
