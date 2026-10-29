# Step 0: the detection probe

Before building Doorbell for real, we need to know what an AI agent's visit actually looks like from a vendor's side. This probe is a small test vendor website plus a collector that logs everything a visit shows. Each real agent runs the same buyer brief against it, and the report compares them.

It answers four questions per agent:

1. **Can the server tell it's an agent?** Signed requests (Web Bot Auth), or a user agent that names it.
2. **Can the tag tell?** Automation flags, browser fingerprint, how clicks and typing arrive, anything an extension adds to the page.
3. **Whose network does it come from?** The AI company's cloud, or the buyer's own connection. This decides whether "matched by company network" can work at all.
4. **Does it use what we put on the page?** The "Facts for AI assistants" panel, its source links, the ask box, site search, `llms.txt` and `facts.json`.

Nothing here uses an AI model. The ask box answers from four approved facts by keyword and sends everything else "to a person" (nobody reads it; the site says it's a test).

## What's in it

| File | What it does |
|---|---|
| [server.ts](server.ts) | The test vendor site (one origin) and the collector (a second origin, like a third-party tag). Logs every request with its headers, IP, signature check and user-agent check |
| [site.ts](site.ts) | The vendor's pages: home, pricing, docs, trust, contact, search, with the facts panel and ask box on every page. Also `llms.txt`, `facts.json`, `robots.txt`, `sitemap.xml` |
| [facts.ts](facts.ts) | The approved facts (same prices as the demo's `src/data/policies.ts`) and the ask box's rule-based answers |
| [public/tag.js](public/tag.js) | The tag: browser fingerprint, automation flags, click and typing patterns, extension traces, facts panel visibility, ask box submissions. It records counts and timing, never what is typed |
| [webBotAuth.ts](webBotAuth.ts) | Verifies Web Bot Auth signatures: fetches the agent's key directory and checks the signature (Ed25519, ECDSA P-256, RSA-PSS) |
| [agents.ts](agents.ts) | AI fetchers and crawlers that name themselves in the user agent |
| [runs.ts](runs.ts) | The run codes: each test run starts at `/start/<code>` |
| [report.ts](report.ts) | Groups the log into visits and writes the report, with IPs masked |

The facts panel deliberately has no answer for "Is there a free trial?", so we can see whether an agent turns to the ask box or site search when the page doesn't say.

## Run it locally

```bash
npm run probe
```

The site is at http://localhost:8787 and the collector at http://localhost:8788. Logs go to `prototype/probe/data/` (git-ignored: they hold IP addresses and full headers).

```bash
npm run probe:test
```

This runs the tests: signature checks (including the RFC 9421 Ed25519 test example), a named fetcher, the ask box, HTML escaping, and a full headless Chromium run through the tag. If Playwright can't find a browser, set `PW_EXECUTABLE` to a Chromium binary.

## Run it for real agents

Cloud agents can't reach localhost, so the probe needs **two public HTTPS URLs**: one for the site and one for the collector. Two different hostnames matter: they show whether an agent also signs requests to a third-party host, which is where Doorbell's tag would live. Any of these works:

- **Quick tunnels**, no account needed: start the probe, then run `cloudflared tunnel --url http://localhost:8787` and `cloudflared tunnel --url http://localhost:8788` and note the two `trycloudflare.com` URLs. They last as long as the processes run.
- **A host** (Fly.io, Render, Railway): run `npm run probe` with `HOST=0.0.0.0` and expose both ports.

Then restart the probe with the public URLs:

```bash
SITE_ORIGIN=https://<site-url> COLLECTOR_ORIGIN=https://<collector-url> npm run probe
```

## The test runs

For each run, open a **fresh** session of the agent (new chat or thread, so it doesn't remember the site), and give it this brief with the run's own URL:

> I'm Head of Operations at a 40-person fintech, and we're evaluating a BI tool from a company called Vendor. Go to `https://<site-url>/start/<code>` and find out:
> 1. Does it connect to Stripe and QuickBooks?
> 2. Can we embed dashboards in our app so each customer sees only their own data?
> 3. What would it cost per year for 40 users with embedding?
> 4. Are they SOC 2 Type II?
> 5. Is there a free trial?
>
> Give me a short answer to each, and say where you found it.

Don't mention the facts panel or the ask box: we want to see whether agents find them on their own.

| Codes | Agent | How |
|---|---|---|
| `h1`, `h2` | You (human control) | Your normal browser, answering the brief yourself. Shows what a person looks like, so we can measure false alarms |
| `c1`–`c3` | ChatGPT Agent | ChatGPT, agent mode |
| `p1`–`p3` | Comet | Perplexity's Comet browser, assistant doing the task |
| `k1`–`k3` | Claude in Chrome | The Claude in Chrome extension |
| `a1`–`a3` | ChatGPT Atlas | OpenAI's Atlas browser, agent mode |
| `f1`, `f2` | Assistant page fetch | A chat assistant without agent mode (ChatGPT or Claude), asked to read the link |

Skip any agent you don't have access to. Three runs each is enough to see whether a behaviour is consistent.

## The report

```bash
npm run probe:report
```

It writes `prototype/probe/reports/step0.md`: a table comparing agents (signed or named, ran the tag, `navigator.webdriver`, networks, facts panel, ask box, site search), then one section per run. Add `--ipinfo` to look up each IP's network owner at ipinfo.io (it sends the IPs there), and `--since <ISO time>` to skip earlier records. IPs in the report are masked to their first three parts; the raw log never leaves `data/`.

Visits are grouped by run code and visitor cookie, and, for agents that drop cookies, by IP and user agent within 30 minutes. Anything without a run code is listed as unlabeled: on a public URL, that's other traffic.

## What the signals mean

- **Signed pages, verified:** the agent signed its request with a key published in its directory (ChatGPT Agent does this). The strongest server-side signal, but only for agents that sign.
- **Signed tag requests:** the same signature on requests to the collector. If agents sign only the pages they open and not third-party requests, a JavaScript tag alone can't verify them, and Doorbell needs a server-side piece.
- **Named in user agent:** fetchers like `ChatGPT-User` or `Claude-User`. They usually don't run JavaScript, so only the server sees them.
- **navigator.webdriver, WebGL renderer, window size:** automation and cloud-browser tells. A software renderer such as SwiftShader suggests a cloud machine.
- **Clicks dead centre, key presses against input events:** scripted input. Text inserted without key presses, or clicks that land exactly in the middle of a button, are typical of automation; a person's clicks land off-centre and their typing produces a key press per character.
- **Extension traces:** elements or attributes the page didn't write. Agents that run as browser extensions sometimes add overlays or label elements they plan to click.
- **Network:** a cloud provider or the AI company's own network means the visit can't be matched to the buyer's company by IP.

The facts panel signals are proxies: an agent that reads the page's text without scrolling never puts the panel "on screen", so "followed a fact source", the ask box and `facts.json` fetches are the firmer evidence that it used the panel.
