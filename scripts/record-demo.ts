// Records the demo's auto-play from start to finish as a video, for sharing where a live demo
// isn't practical (an email, a deck, an application form).
//
//   npm run record            builds, then records to recordings/doorbell-demo.mp4
//   node scripts/record-demo.ts [out.mp4]
//
// It plays in real time (about three minutes), so the video shows exactly what an audience sees.
// Needs ffmpeg on the PATH (macOS: brew install ffmpeg).

import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { chromium, type Browser } from 'playwright'
import { preview } from 'vite'

const SIZE = { width: 1280, height: 800 }
const out = resolve(process.argv[2] ?? 'recordings/doorbell-demo.mp4')

async function launch(): Promise<Browser> {
  try {
    return await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' })
  } catch {
    return await chromium.launch()
  }
}

const server = await preview({ preview: { port: 4318, strictPort: false }, logLevel: 'silent' })
const url = server.resolvedUrls?.local[0]
if (!url) throw new Error('Could not start the preview server. Run `npm run build` first.')

// Frames come from the browser's own screencast (one JPEG whenever the picture changes) and are
// stitched by ffmpeg, so no browser-bundled video encoder is needed.
const frameDir = await mkdtemp(join(tmpdir(), 'doorbell-frames-'))
const frames: { file: string; at: number }[] = []
const browser = await launch()
try {
  const context = await browser.newContext({ viewport: SIZE })
  const page = await context.newPage()
  await page.goto(url)
  await page.waitForSelector('html[data-step]')

  const cdp = await context.newCDPSession(page)
  let writes: Promise<void> = Promise.resolve()
  cdp.on('Page.screencastFrame', (frame) => {
    const file = join(frameDir, `f${String(frames.length).padStart(6, '0')}.jpg`)
    frames.push({ file, at: frame.metadata.timestamp ?? Date.now() / 1000 })
    writes = writes.then(() => writeFile(file, Buffer.from(frame.data, 'base64')))
    cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId }).catch(() => undefined)
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: SIZE.width, maxHeight: SIZE.height, everyNthFrame: 1 })

  await page.waitForTimeout(1500)
  await page.keyboard.press('a')

  // Auto-play stops itself on the closing screen; the page reports both through data attributes.
  const started = Date.now()
  await page.waitForFunction(
    () => document.documentElement.dataset.stepId === 'closing' && document.documentElement.dataset.autoplay !== 'true',
    undefined,
    { timeout: 6 * 60_000, polling: 500 },
  )
  await page.waitForTimeout(4000)
  await cdp.send('Page.stopScreencast')
  await writes
  frames.push({ file: frames[frames.length - 1].file, at: frames[frames.length - 1].at + 0.5 })
  console.log(`Played for ${Math.round((Date.now() - started) / 1000)} s, ${frames.length} frames`)
  await context.close()
} finally {
  await browser.close()
  await new Promise<void>((ok) => server.httpServer.close(() => ok()))
}

// A concat list with each frame's real duration keeps the timing exact.
const list = join(frameDir, 'frames.txt')
const lines: string[] = []
for (let i = 0; i < frames.length - 1; i++) {
  lines.push(`file '${frames[i].file}'`, `duration ${Math.max(0.01, frames[i + 1].at - frames[i].at).toFixed(3)}`)
}
lines.push(`file '${frames[frames.length - 1].file}'`)
await writeFile(list, lines.join('\n') + '\n')
await mkdir(dirname(out), { recursive: true })

const ffmpeg = spawnSync(
  'ffmpeg',
  ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '22', '-movflags', '+faststart', out],
  { stdio: 'inherit' },
)
await rm(frameDir, { recursive: true, force: true })
if (ffmpeg.status !== 0) {
  console.error('ffmpeg is needed to write the video (macOS: brew install ffmpeg).')
  process.exit(1)
}
console.log(`Wrote ${out}`)
