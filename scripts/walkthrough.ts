// End-to-end walkthrough of the demo.
//
//   npm run walkthrough          (builds, then runs this script)
//   node scripts/walkthrough.ts  (uses the existing dist/ build)
//
// It serves dist/ with `vite preview`, then in a real browser:
//   1. presses → through every presenter step and screenshots each one,
//   2. checks that the first → press finishes typing instead of advancing,
//   3. toggles Before / After on the seller view,
//   4. visits every nav screen,
//   5. opens the rep alert and CRM record by button, and makes a weekly-report "Add answer" edit,
//   6. checks Reset restores the title with all state cleared,
//   7. runs auto-play to the end on a fake clock (minutes in seconds),
//   8. blocks every non-localhost request and fails if the app tried one,
//   9. fails on any console error or page error.
// Screenshots go to screenshots/<width>x<height>/.

import { mkdir, rm } from 'node:fs/promises'
import { chromium, type Browser, type Page } from 'playwright'
import { preview } from 'vite'

const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
]
const OUT = 'screenshots'

const problems: string[] = []
const fail = (msg: string) => {
  problems.push(msg)
  console.error(`  ✗ ${msg}`)
}
const ok = (msg: string) => console.log(`  ✓ ${msg}`)

async function launch(): Promise<Browser> {
  // Prefer the installed Chrome so no browser download is needed; fall back to Playwright's Chromium.
  try {
    return await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' })
  } catch {
    return await chromium.launch()
  }
}

async function newContext(browser: Browser, viewport: { width: number; height: number }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const external: string[] = []
  // Offline guarantee: anything not served by the local preview server is blocked and reported.
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return route.continue()
    external.push(url.href)
    return route.abort()
  })
  return { context, external }
}

function watchErrors(page: Page, label: string) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') fail(`${label}: console error: ${msg.text()}`)
  })
  page.on('pageerror', (err) => fail(`${label}: page error: ${err.message}`))
}

const state = (page: Page) =>
  page.evaluate(() => {
    const d = document.documentElement.dataset
    return { step: Number(d.step), id: d.stepId ?? '', settled: d.settled === 'true', autoplay: d.autoplay === 'true' }
  })

const totalSteps = (page: Page) => page.locator('[aria-label="Story progress"] li').count()

async function waitSettled(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.settled === 'true', null, { timeout: 15_000 })
  await page.waitForTimeout(450) // let the last transitions (≤ 400 ms) finish before a screenshot
}

async function shot(page: Page, dir: string, name: string) {
  await page.screenshot({ path: `${dir}/${name}.png` })
}

async function checkOverflow(page: Page, label: string) {
  // Horizontal page scroll means something is wider than the window.
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  if (wide) fail(`${label}: page scrolls horizontally`)
}

async function walkStory(page: Page, dir: string, vp: string) {
  const total = await totalSteps(page)
  let s = await state(page)
  if (s.step !== 0) fail(`${vp}: expected to start on step 0, got ${s.step}`)
  await shot(page, dir, `00-${s.id}`)

  for (let i = 1; i < total; i++) {
    await page.keyboard.press('ArrowRight')
    s = await state(page)
    if (s.step !== i) fail(`${vp}: → should reach step ${i}, got ${s.step}`)

    // On a typed step, the next → finishes typing and stays on the same step.
    if (i === 1) {
      const typing = await page
        .locator('[aria-hidden] .animate-blink')
        .first()
        .waitFor({ timeout: 1500 })
        .then(() => true)
        .catch(() => false)
      if (!typing) fail(`${vp}: expected typing to be in progress on step 1`)
      await page.keyboard.press('ArrowRight')
      const after = await state(page)
      if (after.step !== 1 || !after.settled) fail(`${vp}: → during typing should finish it, not advance`)
      else ok(`${vp}: → finishes typing without advancing`)
    }

    await waitSettled(page)
    await checkOverflow(page, `${vp} step ${i} (${s.id})`)
    await shot(page, dir, `${String(i).padStart(2, '0')}-${s.id}`)

    // Before / After toggle, on the last seller step when everything is revealed.
    if (s.id === 's-crm') {
      await page.keyboard.press('b')
      await page.waitForTimeout(450)
      const beforeOn = await page.getByRole('button', { name: 'Before Doorbell', exact: true }).getAttribute('aria-pressed')
      if (beforeOn !== 'true') fail(`${vp}: B should switch the seller view to Before`)
      await shot(page, dir, `${String(i).padStart(2, '0')}-${s.id}-toggled-before`)
      await page.keyboard.press('b')
      await page.waitForTimeout(450)
      const afterOn = await page.getByRole('button', { name: 'After', exact: true }).getAttribute('aria-pressed')
      if (afterOn !== 'true') fail(`${vp}: B should switch the seller view back to After`)
      else ok(`${vp}: Before / After toggle works`)
    }
  }

  s = await state(page)
  if (s.step !== total - 1) fail(`${vp}: walk ended on step ${s.step}, expected ${total - 1}`)
  else ok(`${vp}: pressed → through all ${total} steps`)
}

async function visitNav(page: Page, dir: string, vp: string, suffix: string) {
  // Title and closing hide the side nav; start from a screen that shows it.
  await page.goto(page.url().replace(/#.*$/, '#/buyer'))
  const screens = ['Buyer view', 'Seller view', 'Weekly report', 'Rules', 'Setup', 'Title']
  for (const name of screens) {
    if (name !== 'Buyer view') {
      await page.getByRole('navigation', { name: 'Screens' }).getByRole('link', { name, exact: true }).click()
    }
    await page.waitForTimeout(500)
    await checkOverflow(page, `${vp} nav ${name}`)
    await shot(page, dir, `nav-${suffix}-${name.toLowerCase().replace(/\s+/g, '-')}`)
  }
  // From the title slide, the closing screen is reached through its own link row or the presenter; use the URL.
  await page.goto(page.url().replace(/#.*$/, '#/closing'))
  await page.waitForTimeout(400)
  await shot(page, dir, `nav-${suffix}-closing`)
  ok(`${vp}: visited every nav screen (${suffix})`)
}

async function interactions(page: Page, dir: string, vp: string) {
  // Seller view after the story: the rep alert and CRM record open from their buttons.
  await page.goto(page.url().replace(/#.*$/, '#/seller'))
  await page.getByRole('button', { name: 'Rep alert' }).click()
  await page.getByRole('article', { name: 'Rep alert in team chat' }).waitFor()
  await page.getByRole('button', { name: 'Close alert' }).click()
  await page.getByRole('button', { name: 'CRM record' }).click()
  await page.getByRole('article', { name: 'CRM record' }).waitFor()
  await shot(page, dir, 'interaction-seller-crm')
  ok(`${vp}: rep alert and CRM record open from their buttons`)

  // Weekly report: add an answer to something agents couldn't find.
  await page.goto(page.url().replace(/#.*$/, '#/insights'))
  await page.getByRole('button', { name: 'Add answer' }).first().click()
  await page.getByRole('textbox').first().fill('Not today. A person on our team can discuss options.')
  await page.getByRole('button', { name: 'Save answer' }).click()
  await page.getByText('Answer added').waitFor()
  await shot(page, dir, 'interaction-insights-answer-added')

  // Reset clears everything: step, route and local edits.
  await page.keyboard.press('r')
  await page.waitForTimeout(300)
  const r = await state(page)
  const hash = new URL(page.url()).hash
  if (r.step !== 0 || r.autoplay || (hash !== '#/' && hash !== '')) fail(`${vp}: reset should return to the title (step ${r.step}, ${hash})`)
  await page.goto(page.url().replace(/#.*$/, '#/insights'))
  const added = await page.getByText('Answer added').count()
  if (added) fail(`${vp}: reset should clear the added answer`)
  else ok(`${vp}: reset returns to the title and clears local state`)
  await page.goto(page.url().replace(/#.*$/, '#/'))
}

async function autoplay(browser: Browser, base: string) {
  const { context, external } = await newContext(browser, VIEWPORTS[0])
  const page = await context.newPage()
  watchErrors(page, 'autoplay')
  await page.clock.install()
  await page.goto(`${base}#/`)
  await page.waitForFunction(() => document.documentElement.dataset.step === '0')
  const total = await totalSteps(page)

  await page.keyboard.press('a')
  let fakeMs = 0
  let s = await state(page)
  while (fakeMs < 10 * 60_000) {
    await page.clock.runFor(500)
    fakeMs += 500
    s = await state(page)
    if (s.step === total - 1 && !s.autoplay) break
  }
  if (s.step === total - 1 && !s.autoplay) {
    ok(`auto-play reached the closing screen and stopped after ${(fakeMs / 1000).toFixed(0)} s of story time`)
  } else {
    fail(`auto-play got stuck on step ${s.step} (${s.id}), autoplay=${s.autoplay}`)
  }
  if (external.length) fail(`autoplay: external requests: ${external.join(', ')}`)
  await context.close()
}

async function main() {
  await rm(OUT, { recursive: true, force: true })
  const server = await preview({ preview: { port: 4317, strictPort: false, open: false }, logLevel: 'warn' })
  const base = server.resolvedUrls?.local[0] ?? 'http://localhost:4317/'
  console.log(`Serving dist/ at ${base}`)
  const browser = await launch()

  try {
    for (const viewport of VIEWPORTS) {
      const vp = `${viewport.width}x${viewport.height}`
      const dir = `${OUT}/${vp}`
      await mkdir(dir, { recursive: true })
      console.log(`\n${vp}`)

      const { context, external } = await newContext(browser, viewport)
      const page = await context.newPage()
      watchErrors(page, vp)
      await page.goto(`${base}#/`)
      await page.waitForFunction(() => document.documentElement.dataset.step === '0')
      await page.evaluate(() => document.fonts.ready)

      await walkStory(page, dir, vp)
      await visitNav(page, dir, vp, 'end-of-story')
      await interactions(page, dir, vp)
      await visitNav(page, dir, vp, 'fresh')

      if (external.length) fail(`${vp}: the app requested external URLs: ${[...new Set(external)].join(', ')}`)
      else ok(`${vp}: no external requests (works offline)`)
      await context.close()
    }

    console.log('\nauto-play')
    await autoplay(browser, base)
  } finally {
    await browser.close()
    await server.close()
  }

  console.log('')
  if (problems.length) {
    console.error(`${problems.length} problem(s) found.`)
    process.exit(1)
  }
  console.log(`All checks passed. Screenshots in ${OUT}/`)
}

await main()
