import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  checkTextFile, detectChallenge, findAiAddressed, findAnnual, findChatWidgets, findFact, findFreePlan, findGating, findPrices,
  findSearch, findTrial, FACT_PATTERNS, isJsonResponse, planNames, planPrices,
} from '../detect.ts'
import { extractLinks, jsonLdBlocks, jsonLdNodes, nodeTypes, visibleText } from '../html.ts'

test('visible text drops scripts, styles, noscript, svg, comments and head; decodes entities', () => {
  const html = `<!doctype html><html><head><title>T</title><style>.a{}</style></head><body>
<!-- $99 per month in a comment -->
<script>window.price = "$49 per month"</script>
<noscript>Please enable JavaScript</noscript>
<svg><text>$10/mo</text></svg>
<h1>Plans &amp; pricing</h1><p>Starter&nbsp;costs &euro;9&#47;month &#x2014; billed&nbsp;yearly</p>
<div>Pro</div></body></html>`
  const t = visibleText(html)
  assert.equal(t, 'Plans & pricing\nStarter costs €9/month — billed yearly\nPro')
})

test('visible text is not fooled by ">" inside a quoted attribute', () => {
  assert.equal(visibleText('<div x-init="fetch(u).then(r => r.json())">Price</div>'), 'Price')
})

test('visible text survives an unclosed script and leaves a missing </head> alone', () => {
  assert.equal(visibleText('<p>Hello</p><script>var x = "<p>$5/mo</p>"'), 'Hello')
  assert.equal(visibleText('<html><head><title>x</title><body><p>Body text</p></body></html>'), 'Body text')
})

test('prices: true positives in several formats', () => {
  const found = (s: string) => planPrices(s, false).map((p) => [p.amount, p.currency])
  assert.deepEqual(found('Starter $49 per user / month'), [[49, 'USD']])
  assert.deepEqual(found('Team €19/mo'), [[19, 'EUR']])
  assert.deepEqual(found('Business £1,200 per year'), [[1200, 'GBP']])
  assert.deepEqual(found('Pro: USD 99 monthly'), [[99, 'USD']])
  assert.deepEqual(found('Growth 49 € per month'), [[49, 'EUR']])
  assert.deepEqual(found('Starts at $2k per month'), [[2000, 'USD']])
  assert.deepEqual(found('$12.50 /seat'), [[12.5, 'USD']])
  assert.deepEqual(found('Pro\n$29\n/month'), [[29, 'USD']])
  assert.deepEqual(found('Identified events $0.000198 each after the first 1M'), [[0.000198, 'USD']])
  assert.deepEqual(found('$1,080 / year'), [[1080, 'USD']])
  assert.deepEqual(found('€49,99 per month'), [[49.99, 'EUR']])
  assert.deepEqual(found('each GB costs $0.05 for every month you keep it'), [[0.05, 'USD']])
})

test('prices: false positives are rejected', () => {
  const found = (s: string) => planPrices(s, true).map((p) => p.raw)
  assert.deepEqual(found('$0 setup fee. We raised $20M in funding. Save $200 a year.'), [])
  assert.deepEqual(found('Customers saved $5 million last year'), [])
  assert.deepEqual(found('500 credits (worth $5). Slack support over $2k/mo'), [])
  assert.deepEqual(found('Join 20 100 users'), [])
  assert.deepEqual(found('Get 20% off'), [])
  // Prices inside scripts never reach the text.
  assert.deepEqual(found(visibleText('<p>Contact sales</p><script>{"price":"$49 per month"}</script>')), [])
})

test('prices: bare amounts count only on a pricing page, and only two or more', () => {
  assert.equal(planPrices('Starter $29 Pro $79', false).length, 0)
  assert.equal(planPrices('Starter $29 Pro $79', true).length, 2)
  assert.equal(planPrices('Our fee is unusual: $29', true).length, 0)
  assert.equal(findPrices('Starter $29').length, 1)
})

test('gating, trial, free plan, annual discount and plan names', () => {
  assert.deepEqual(findGating('Enterprise: Contact sales. Or book a demo.').map((g) => g.label), ['contact sales', 'book a demo'])
  assert.equal(findGating('Our sales are up').length, 0)
  assert.equal(findTrial('Start your 14-day free trial')?.days, 14)
  assert.equal(findTrial('Try it free for 30 days')?.days, 30)
  assert.equal(findTrial('2-week trial')?.days, 14)
  assert.ok(findTrial('Start a free trial today'))
  assert.equal(findTrial('Talk to us'), undefined)
  assert.ok(findFreePlan('Free plan: up to 3 users'))
  assert.ok(findFreePlan('Hobby $0 / month'))
  assert.equal(findFreePlan('$0 setup'), undefined)
  assert.ok(findAnnual('Save 20% with annual billing').discount)
  assert.ok(findAnnual('Annual plans: 2 months free on yearly').discount ?? findAnnual('Annual: save 15%').discount)
  assert.equal(findAnnual('Billed annually').discount, undefined)
  assert.ok(findAnnual('Monthly Yearly\n2 months free\nStarter $9 /month').discount)
  assert.equal(findAnnual('Get 2 months free when you refer a friend').discount, undefined)
  assert.ok(findAnnual('Billed annually').billing)
  assert.deepEqual(planNames(['Starter', 'Pro', 'Why teams love us', 'Enterprise', 'pro']), ['Starter', 'Pro', 'Enterprise'])
})

test('challenge pages are detected; ordinary pages with vendor scripts are not', () => {
  assert.equal(detectChallenge(403, {}, '<html><head><title>Just a moment...</title></head><body></body></html>')?.vendor, 'Cloudflare')
  assert.equal(detectChallenge(403, {}, '<title>Attention Required! | Cloudflare</title>')?.vendor, 'Cloudflare')
  assert.equal(detectChallenge(200, { 'cf-mitigated': 'challenge' }, '')?.vendor, 'Cloudflare')
  assert.equal(detectChallenge(403, {}, '<html><title>Access Denied</title><body>You don\'t have permission to access "http://x/" on this server.<p>Reference #18.abc</p></body></html>')?.vendor, 'Akamai')
  assert.equal(detectChallenge(403, {}, '<div id="px-captcha"></div>')?.vendor, 'PerimeterX / HUMAN')
  assert.equal(detectChallenge(403, {}, '<script src="https://geo.captcha-delivery.com/captcha/"></script>')?.vendor, 'DataDome')
  const normal = `<html><head><title>Acme</title><script src="/cdn-cgi/challenge-platform/scripts/jsd/main.js"></script></head><body>${'<p>Real content about our product. </p>'.repeat(200)}</body></html>`
  assert.equal(detectChallenge(200, {}, normal), undefined)
  // A long article that mentions the phrase is not a challenge.
  assert.equal(detectChallenge(200, {}, `<p>${'Words. '.repeat(600)} Are you a robot? asked the article.</p>`), undefined)
})

test('llms.txt must be a text file, not the site’s HTML fallback page', () => {
  assert.equal(checkTextFile(200, 'text/plain; charset=utf-8', '# Acme\n> We sell things\n- [Pricing](/pricing)').valid, true)
  assert.equal(checkTextFile(200, 'text/html', '<!doctype html><html></html>').valid, false)
  assert.equal(checkTextFile(200, 'text/plain', '<!DOCTYPE html>\n<html lang="en">').valid, false)
  assert.equal(checkTextFile(200, '', '   ').valid, false)
  assert.equal(checkTextFile(404, 'text/plain', 'not found').valid, false)
  assert.equal(isJsonResponse(200, 'application/json', '{"name":"x"}'), true)
  assert.equal(isJsonResponse(200, 'text/html', '{"name":"x"}'), false)
  assert.equal(isJsonResponse(200, 'application/json', '<html>'), false)
})

test('buyer facts, links and JSON-LD', () => {
  const soc = FACT_PATTERNS.find((p) => p.id === 'soc2')!
  assert.ok(findFact('We are SOC 2 Type II audited', soc))
  assert.ok(findFact('SOC2 compliant', soc))
  assert.equal(findFact('Associated with SOCIAL2 things', soc), undefined)
  const sso = FACT_PATTERNS.find((p) => p.id === 'sso')!
  assert.equal(findFact('Our ESSO partner', sso), undefined)
  assert.ok(findFact('SAML single sign-on on Business', sso))
  const links = extractLinks('<a href="/pricing">Pricing</a><a href="mailto:x@y">Mail</a><a href="https://other.test/x#top"><span>Other</span></a>', 'https://ex.test/')
  assert.deepEqual(links.map((l) => [l.url, l.text]), [['https://ex.test/pricing', 'Pricing'], [undefined, 'Mail'], ['https://other.test/x', 'Other']])
  const { blocks, invalid } = jsonLdBlocks('<script type="application/ld+json">{"@graph":[{"@type":"Organization"},{"@type":"SoftwareApplication","offers":{"@type":"Offer","price":"49"}}]}</script><script type="application/ld+json">{bad</script>')
  assert.equal(invalid, 1)
  assert.deepEqual(jsonLdNodes(blocks).flatMap(nodeTypes), ['Organization', 'SoftwareApplication', 'Offer'])
})

test('on-site help: search, chat vendors and content addressed to AI', () => {
  assert.equal(findSearch('<form role="search"><input name="q"></form>'), 'form with role="search"')
  assert.equal(findSearch('<input type="text" name="email">'), undefined)
  assert.deepEqual(findChatWidgets('<script src="https://widget.intercom.io/widget/abc"></script>').map((c) => c.vendor), ['Intercom'])
  assert.deepEqual(findChatWidgets('', ['https://js.driftt.com/include/1.js']).map((c) => c.vendor), ['Drift'])
  assert.ok(findAiAddressed('', 'Information for AI assistants: our prices are...'))
  assert.ok(findAiAddressed('<a href="/llms.txt">llms.txt</a>', ''))
  assert.equal(findAiAddressed('', 'Build AI agents with our platform. LLMs are great.'), undefined)
})
