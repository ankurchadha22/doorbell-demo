// Renders one page in headless Chromium with JavaScript on, to compare what a browser-based agent
// sees with what a plain fetcher sees. The browser says it is headless and names this tool, so it
// is identifiable and imitates no AI agent.

import { existsSync } from 'node:fs'
import { chromium, type Browser } from 'playwright'
import { TOOL_NAME, TOOL_VERSION } from './config.ts'

const FALLBACK_EXECUTABLE = '/opt/pw-browsers/chromium'

/** PW_EXECUTABLE wins; else Playwright's own browser; else the container's fixed path. */
export async function launchBrowser(): Promise<Browser> {
  const proxy = process.env.HTTPS_PROXY ?? process.env.https_proxy
  // Behind a forwarding proxy (as in a cloud container) Chromium needs to be told about it; it
  // never proxies localhost, so local tests are unaffected.
  const base = proxy ? { proxy: { server: proxy, bypass: 'localhost,127.0.0.1,::1' } } : {}
  try {
    return await chromium.launch({ ...base, executablePath: process.env.PW_EXECUTABLE ?? undefined })
  } catch (e) {
    if (!existsSync(FALLBACK_EXECUTABLE)) throw e
    return await chromium.launch({ ...base, executablePath: FALLBACK_EXECUTABLE })
  }
}

export interface RenderResult {
  url: string
  finalUrl: string
  status: number
  html: string
  /** Script and XHR URLs the page requested, for chat-widget detection. */
  requestUrls: string[]
  ms: number
  error?: string
}

export interface RenderOptions {
  timeoutMs: number
  /** Extra time after the load event for client-side rendering to finish. */
  settleMs?: number
}

export async function renderPage(browser: Browser, url: string, opts: RenderOptions): Promise<RenderResult> {
  const started = Date.now()
  const userAgent = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/${browser.version()} Safari/537.36 ${TOOL_NAME}/${TOOL_VERSION}`
  const context = await browser.newContext({ userAgent, locale: 'en-US', viewport: { width: 1280, height: 900 } })
  const requestUrls: string[] = []
  try {
    const page = await context.newPage()
    // Images, fonts and media don't change the text, so they are not downloaded.
    await page.route('**/*', (route) => {
      const type = route.request().resourceType()
      if (type === 'image' || type === 'font' || type === 'media') return route.abort()
      if (type === 'script' || type === 'xhr' || type === 'fetch') requestUrls.push(route.request().url())
      return route.continue()
    })
    const res = await page.goto(url, { waitUntil: 'load', timeout: opts.timeoutMs })
    const left = Math.max(0, opts.timeoutMs - (Date.now() - started))
    await page.waitForLoadState('networkidle', { timeout: Math.min(left, 6000) }).catch(() => {})
    await page.waitForTimeout(Math.min(opts.settleMs ?? 1000, left))
    const html = await page.content()
    return { url, finalUrl: page.url(), status: res?.status() ?? 0, html, requestUrls, ms: Date.now() - started }
  } catch (e) {
    return { url, finalUrl: url, status: 0, html: '', requestUrls, ms: Date.now() - started, error: (e as Error).message.split('\n')[0] }
  } finally {
    await context.close().catch(() => {})
  }
}
