// The test vendor's website. Every page carries the visible "Facts for AI assistants" panel and the
// ask box, served as plain HTML so agents that don't run JavaScript see them too. Every element the
// server writes into <html>, <head> and <body> is marked data-site, so the tag can spot anything a
// browser extension adds.

import { facts, reviewedOn, vendorName, type AskResult } from './facts.ts'

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

interface Page {
  title: string
  /** Plain text for site search. */
  text: string
  body: string
}

const pages: Record<string, Page> = {
  '/': {
    title: `${vendorName}: BI and embedded analytics for growing teams`,
    text: 'Business intelligence and embedded analytics for growing teams. Connect Stripe and QuickBooks, build dashboards, and embed them in your own product.',
    body: `
      <h1>Business intelligence for growing teams</h1>
      <p class="lead">Connect your billing and accounting data, build dashboards, and embed them in your own product.</p>
      <ul class="cards">
        <li><h2><a href="/docs/connectors">Connectors</a></h2><p>Stripe and QuickBooks, on every plan.</p></li>
        <li><h2><a href="/docs/embedding">Embedded dashboards</a></h2><p>Put dashboards in your app. Each customer sees only their own data.</p></li>
        <li><h2><a href="/trust">Trust</a></h2><p>SOC 2 Type II.</p></li>
      </ul>
      <p><a class="button" href="/pricing">See pricing</a> <a class="button secondary" href="/contact">Talk to sales</a></p>`,
  },
  '/pricing': {
    title: `Pricing · ${vendorName}`,
    text: 'Pricing. Starter $20 per user per month. Growth $40 per user per month. Embedding add-on $400 per month, Growth plan. Enterprise contact sales. Annual billing 10% off.',
    body: `
      <h1>Pricing</h1>
      <p class="lead">Per user, per month. Pay annually and save 10%.</p>
      <ul class="cards plans">
        <li><h2>Starter</h2><p class="price">$20 <span>per user / month</span></p><p>Dashboards and reports. Stripe and QuickBooks connectors.</p></li>
        <li><h2>Growth</h2><p class="price">$40 <span>per user / month</span></p><p>Everything in Starter, plus embedded dashboards as an add-on: <strong>$400 / month</strong>.</p></li>
        <li><h2>Enterprise</h2><p class="price">Custom</p><p>Custom terms and SLAs. <a href="/contact">Contact sales</a>.</p></li>
      </ul>
      <p>Annual billing is 10% off every plan.</p>`,
  },
  '/docs': {
    title: `Docs · ${vendorName}`,
    text: 'Documentation. Connectors. Embedding.',
    body: `
      <h1>Docs</h1>
      <ul>
        <li><a href="/docs/connectors">Connectors: Stripe and QuickBooks</a></li>
        <li><a href="/docs/embedding">Embedding dashboards in your product</a></li>
      </ul>`,
  },
  '/docs/connectors': {
    title: `Connectors · ${vendorName} docs`,
    text: 'Connectors. Stripe and QuickBooks connect directly on every plan. Data syncs every 15 minutes.',
    body: `
      <h1>Connectors</h1>
      <p>Stripe and QuickBooks connect directly, on every plan. Sign in to each from Settings → Connectors; data syncs every 15 minutes.</p>`,
  },
  '/docs/embedding': {
    title: `Embedding · ${vendorName} docs`,
    text: 'Embedding. Embedded dashboards are available on the Growth plan as a $400 per month add-on. Each customer sees only their own data, enforced by row-level filters.',
    body: `
      <h1>Embedding</h1>
      <p>Embedded dashboards are available on the Growth plan, as a $400 / month add-on.</p>
      <p>Each of your customers sees only their own data: every embedded view is filtered by customer before it leaves our servers.</p>`,
  },
  '/trust': {
    title: `Trust · ${vendorName}`,
    text: 'Trust and security. SOC 2 Type II. The report is shared under NDA.',
    body: `
      <h1>Trust and security</h1>
      <p>${vendorName} is SOC 2 Type II certified. The report is shared under NDA.</p>
      <p><a href="/trust/nda">Request the SOC 2 report</a></p>`,
  },
  '/trust/nda': {
    title: `Request the SOC 2 report · ${vendorName}`,
    text: 'Request the SOC 2 report. Sign the NDA to receive it.',
    body: `
      <h1>Request the SOC 2 report</h1>
      <p>The report is shared once an NDA is signed. Signing isn't part of this test site.</p>`,
  },
  '/contact': {
    title: `Contact sales · ${vendorName}`,
    text: 'Contact sales. Email sales@vendor.example.',
    body: `
      <h1>Contact sales</h1>
      <p>Email <a href="mailto:sales@vendor.example">sales@vendor.example</a>.</p>`,
  },
}

export const pagePaths = Object.keys(pages)

const css = `
  :root { --ink: #14231f; --muted: #5b6b66; --line: #d7e2de; --paper: #f6faf8; --accent: #0f6b57; color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 16px/1.5 system-ui, -apple-system, Segoe UI, sans-serif; color: var(--ink); background: var(--paper); }
  a { color: var(--accent); }
  header, footer, .wrap { max-width: 1080px; margin: 0 auto; padding: 16px; }
  header { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; border-bottom: 1px solid var(--line); }
  header .brand { font-weight: 700; font-size: 20px; text-decoration: none; color: var(--ink); }
  header nav { display: flex; gap: 16px; flex: 1; }
  header form { display: flex; gap: 6px; }
  .wrap { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 32px; }
  @media (max-width: 800px) { .wrap { grid-template-columns: 1fr; } }
  .lead { font-size: 18px; color: var(--muted); }
  .cards { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
  .cards li { background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 14px; }
  .cards h2 { font-size: 17px; margin: 0 0 4px; }
  .price { font-size: 26px; font-weight: 700; margin: 4px 0; }
  .price span { font-size: 14px; font-weight: 400; color: var(--muted); }
  .button { display: inline-block; background: var(--accent); color: #fff; padding: 8px 14px; border-radius: 8px; text-decoration: none; }
  .button.secondary { background: #fff; color: var(--accent); border: 1px solid var(--accent); }
  .facts { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 16px; align-self: start; }
  .facts h2 { font-size: 16px; margin: 0; }
  .facts dl { margin: 12px 0; }
  .facts dt { font-weight: 600; font-size: 14px; }
  .facts dd { margin: 0 0 10px; font-size: 14px; }
  .muted { color: var(--muted); font-size: 13px; }
  .ask label { font-weight: 600; font-size: 14px; display: block; margin-bottom: 4px; }
  .ask .row { display: flex; gap: 6px; }
  input[type=text], input[type=search] { flex: 1; min-width: 0; padding: 7px 9px; border: 1px solid var(--line); border-radius: 7px; font: inherit; }
  button { padding: 7px 12px; border: 0; border-radius: 7px; background: var(--accent); color: #fff; font: inherit; cursor: pointer; }
  .answer { font-size: 14px; background: var(--paper); border-radius: 8px; padding: 8px 10px; }
  .answer:empty { display: none; }
  footer { color: var(--muted); font-size: 13px; border-top: 1px solid var(--line); }`

/** The facts panel and ask box, shown beside every page. */
function factsPanel(result?: { question: string; result: AskResult }) {
  const answerHtml = result
    ? `${esc(result.result.text)}${result.result.facts.map((f) => ` <a href="${f.source}">Source: ${esc(f.topic)}</a>`).join('')}`
    : ''
  return `
    <aside class="facts" id="facts" aria-labelledby="facts-heading">
      <h2 id="facts-heading">Facts for AI assistants</h2>
      <p class="muted">Approved by ${vendorName}, each with its source. Last reviewed ${reviewedOn}.</p>
      <dl>
        ${facts.map((f) => `<dt>${esc(f.topic)}</dt><dd>${esc(f.short)} <a href="${f.source}">Source</a></dd>`).join('\n        ')}
      </dl>
      <details id="facts-more"><summary>Machine-readable version</summary><p><a href="/facts.json">/facts.json</a></p></details>
      <form class="ask" id="ask-form" method="post" action="/ask">
        <label for="ask-q">Ask a question</label>
        <div class="row">
          <input id="ask-q" name="q" type="text" maxlength="500" autocomplete="off" placeholder="e.g. Does it connect to Stripe?" value="${result ? esc(result.question) : ''}">
          <button type="submit" id="ask-submit">Ask</button>
        </div>
        <p class="answer" id="ask-answer" role="status" aria-live="polite">${answerHtml}</p>
        <p class="muted">Answers come only from approved facts. Anything else goes to a person.</p>
      </form>
    </aside>`
}

export interface PageContext {
  collectorOrigin: string
  path: string
}

function layout(ctx: PageContext, title: string, main: string, ask?: { question: string; result: AskResult }) {
  const tag = `${ctx.collectorOrigin}/tag.js`
  return `<!doctype html>
<html lang="en" data-site>
<head data-site>
  <meta data-site charset="utf-8">
  <meta data-site name="viewport" content="width=device-width, initial-scale=1">
  <meta data-site name="robots" content="noindex">
  <title data-site>${esc(title)}</title>
  <link data-site rel="icon" href="/favicon.svg" type="image/svg+xml">
  <style data-site>${css}</style>
</head>
<body data-site>
  <header data-site>
    <a class="brand" href="/">${vendorName}</a>
    <nav aria-label="Main"><a href="/pricing">Pricing</a><a href="/docs">Docs</a><a href="/trust">Trust</a><a href="/contact">Contact</a></nav>
    <form method="get" action="/search" role="search"><label for="site-q" class="muted">Search</label><input id="site-q" type="search" name="q"><button type="submit">Search</button></form>
  </header>
  <div class="wrap" data-site>
    <main>${main}</main>
    ${factsPanel(ask)}
  </div>
  <footer data-site>${vendorName} is a fictional company. This site is a test page for research on AI agent visits.</footer>
  <img data-site src="${ctx.collectorOrigin}/p.gif?page=${encodeURIComponent(ctx.path)}" alt="" width="1" height="1" style="position:absolute;left:-9999px">
  <script data-site src="${tag}" async></script>
</body>
</html>`
}

export function renderPage(path: string, ctx: PageContext): string | undefined {
  const page = pages[path]
  return page && layout(ctx, page.title, page.body)
}

export function renderAskPage(ctx: PageContext, question: string, result: AskResult) {
  const body = `<h1>Your question</h1><p>“${esc(question)}”</p><p>The answer is beside this page.</p><p><a href="/">Back to the home page</a></p>`
  return layout(ctx, `Ask · ${vendorName}`, body, { question, result })
}

/** Site search: pages containing every word of the query. */
export function search(query: string) {
  const words = query.toLowerCase().split(/\W+/).filter(Boolean)
  if (!words.length) return []
  return Object.entries(pages)
    .filter(([, p]) => words.every((w) => p.text.toLowerCase().includes(w)))
    .map(([path, p]) => ({ path, title: p.title }))
}

export function renderSearchPage(ctx: PageContext, query: string) {
  const results = search(query)
  const list = results.length
    ? `<ul>${results.map((r) => `<li><a href="${r.path}">${esc(r.title)}</a></li>`).join('')}</ul>`
    : `<p>No results for “${esc(query)}”.</p>`
  return layout(ctx, `Search · ${vendorName}`, `<h1>Search</h1>${list}`)
}

export function renderNotFound(ctx: PageContext) {
  return layout(ctx, `Not found · ${vendorName}`, `<h1>Page not found</h1><p><a href="/">Home</a></p>`)
}

/* ---------- Machine-readable files agents may look for ---------- */

export const factsJson = () =>
  JSON.stringify(
    {
      vendor: vendorName,
      reviewed: reviewedOn,
      facts: facts.map((f) => ({ topic: f.topic, fact: f.answer, source: f.source })),
      unanswered: 'Questions without an approved answer go to a person on the sales team.',
      ask: { method: 'POST', url: '/ask', body: { q: 'your question' } },
    },
    null,
    2,
  )

export const llmsTxt = () => `# ${vendorName}

> Business intelligence and embedded analytics for growing teams. ${vendorName} is a fictional company; this is a test site.

## Approved facts

${facts.map((f) => `- ${f.topic}: ${f.answer} Source: ${f.source}`).join('\n')}

## Pages

${pagePaths.map((p) => `- [${pages[p].title}](${p})`).join('\n')}
`

export const robotsTxt = (origin: string) => `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`

export const sitemapXml = (origin: string) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pagePaths.map((p) => `  <url><loc>${origin}${p}</loc></url>`).join('\n')}
</urlset>
`
