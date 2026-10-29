# Doorbell: clickable concept demo

**Doorbell: know which AI agents came knocking.** One line of code shows a software company which AI agents visited its website, who sent them, what they were looking for and what they couldn't find.

This is a scripted demo for a hackathon, not a product. Every screen runs on fixed, fictional data, it makes no network or AI calls, and it works offline. Every screen carries a "Concept demo · simulated data" label.

The earlier version of the demo (an MCP desk, an agent-fillable quote form and a work-email consent step) is kept on the [`demo-v1-mcp-desk`](https://github.com/ankurchadha22/doorbell-demo/tree/demo-v1-mcp-desk) branch and the `demo-v1` tag. The website-tag version without the MCP step is tagged `demo-v2`.

The story, in three acts:

1. **What the buyer's agent does.** Julie Sharp, Head of Operations at a 40-person fintech, sends an AI browser agent to shortlist BI tools. It reads independent reviews first, then opens each vendor's website. Only the vendor uses Doorbell: its pricing page has a visible "Facts for AI assistants" panel and an ask box, so the agent verifies integrations, embedding, price and SOC 2 there. It can't find whether there's a free trial; the ask box has no approved answer, so the question goes to a person. For deeper or gated questions the facts panel offers an MCP connection: with Julie's approval the agent connects, gets a cited answer on branding and sign-in, and receives an NDA link for the SOC 2 report.
2. **What the vendor sees.** Before Doorbell: zero visits in analytics, a few signed log lines, no CRM record. After: the visit live (pages, facts panel, ask box and MCP), matched to MIT Capital by company network, a summary of what the agent was looking for, where it got stuck, a next step for the sales rep, a live alert in Slack or Teams and a CRM record.
3. **Weekly report, rules and setup.** What agents looked for across all visits and what they couldn't find (with "Add answer"), the rules that limit what Doorbell may tell agents, the one-line setup, and the roadmap: website tag today, WebMCP next, MCP later.

## Run it

Requires Node 20+ (tested on Node 24).

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173. Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Type-checks and builds the static site into `dist/` |
| `npm run preview` | Serves `dist/` at http://localhost:4173 |
| `npm run lint` | Runs oxlint |
| `npm run walkthrough` | Builds, then runs the Playwright walkthrough (see below) |

To deploy, upload `dist/` to any static host (Vercel, Netlify, S3). The app uses hash URLs (`/#/vendor`), so no rewrite rules are needed.

## Share it

```bash
npm run build:share
```

This writes `share/doorbell.html`: the whole demo in one self-contained file (scripts, styles and fonts inlined), ready to publish as a hosted page such as a claude.ai Artifact. On screens smaller than a laptop, the demo scales its 1280×800 layout down to fit.

## Present it

Open the app full screen. It is designed for 1280×800 and 1920×1080 and scales between them. Drive it with the keyboard or the presenter bar at the bottom.

| Key | Action |
|---|---|
| `→` or Space | Next step. If typing is still running, the first press finishes it. |
| `←` | Previous step |
| `A` | Auto-play on / off (the whole story takes about 3 minutes) |
| `R` | Reset to the title, clearing all state |
| `B` | Before / After on the vendor view |
| `1` `2` `3` | Jump to Act 1, 2 or 3 |
| `4` | Jump to the closing slide |

The dots on the right of the presenter bar jump to any step. Outside the presenter flow, every screen is clickable from the left nav (Buyer view, Vendor view, Weekly report, Rules, Setup).


## Edit the story

Everything you see comes from typed files in [src/data/](src/data/). Components only render what those files say.

| File | Holds |
|---|---|
| [config.ts](src/data/config.ts) | Every name (product, vendor, competitors, buyer, sales rep), domains, the closing statistic, the business model and the roadmap. Change a name here and it changes everywhere. |
| [policies.ts](src/data/policies.ts) | Plans and prices (the price the agent finds is computed from these), approved facts, the facts panel, escalation and answer rules |
| [buyerScript.ts](src/data/buyerScript.ts) | Act 1: each step's chat messages and timeline entries; the final comparison table |
| [sellerEvents.ts](src/data/sellerEvents.ts) | Act 2: the Before view, live feed events, the visit summary, rep alert, CRM record, and the Act 2 steps |
| [insights.ts](src/data/insights.ts) | Act 3 weekly-report numbers (simulated) |
| [setup.ts](src/data/setup.ts) | Setup page steps |
| [story.ts](src/data/story.ts) | The single ordered list of presenter steps (title, acts, closing) |

How the pieces fit:

- Each step in the ordered list says which screen it belongs to, how long auto-play stays on it (`dwellMs`), and what appears.
- Vendor-side items name the buyer step at which they happen (`stepId`), so the vendor view stays in sync: open the Vendor view mid-way through Act 1 and you'll see exactly what the vendor has seen so far.
- Act 2 steps list which vendor sections are revealed (`seller.show`), for pacing on stage.
- A typo in a `stepId` throws at load, and `npm run build` catches type errors.

## Verify it

```bash
npm run walkthrough
```

This builds the app, serves it, and in Chrome (via Playwright): presses `→` through every step, checks that `→` finishes typing before advancing, toggles Before/After, visits every screen, opens the rep alert and CRM record, adds an answer in the weekly report, checks that Reset clears everything, runs auto-play to the end on a fake clock, blocks and reports any non-local request, and fails on any console error. Screenshots of every step at 1280×800 and 1920×1080 go to `screenshots/`.

## What's real and what's mocked

| Real | Mocked |
|---|---|
| The presenter engine, keyboard controls, auto-play, reset | Every company, person, number and document |
| Step-synced buyer and vendor views | The buyer's AI agent and its answers (scripted) |
| Offline build with bundled fonts | Doorbell's agent detection, company matching, summaries, facts panel, ask box, CRM sync and alerts (scripted) |

Only the statistic on the closing slide refers to real research, with its source. See [docs/decisions.md](docs/decisions.md) for a note on verifying them.

## Prototype, Step 0: the detection probe

The working prototype starts in [prototype/probe/](prototype/probe/README.md): a test vendor site and collector that log what real AI agents' visits look like (signed requests, user agents, browser fingerprints, input patterns, networks) and whether they use the facts panel and ask box. Unlike the demo, it runs a server and is meant to be reached over the internet.

| Command | What it does |
|---|---|
| `npm run probe` | Starts the test vendor site (:8787) and collector (:8788) |
| `npm run probe:test` | Runs the probe's tests, including a headless browser run |
| `npm run probe:report` | Writes the comparison report from the log |

## Project structure

```
src/
  data/         config, story, buyerScript, sellerEvents, insights, policies, setup, types
  presenter/    DemoProvider (state, keyboard, auto-play), useStep (context hook), PresenterBar
  components/   Badges (channel, source, status), Timeline, ChatItems,
                AlertCard, CrmCard, Typewriter, PageHeader, SideNav, ...
  views/        Title, BuyerView, SellerView, Insights, Policies, Setup, Closing
  lib/          step timing, scroll pinning
scripts/        walkthrough.ts (Playwright)
docs/           decisions.md
prototype/
  probe/        Step 0: test vendor site, collector, tag, signature checks, report
```
