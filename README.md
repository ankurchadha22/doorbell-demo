# Doorbell: clickable concept demo

**Doorbell: a sales rep for AI agents.** When a buyer's AI researches your product, it talks to Doorbell, and your sales team learns who's interested.

This is a scripted demo for a hackathon, not a product. Every screen runs on fixed, fictional data, it makes no network or AI calls, and it works offline. Every screen carries a "Concept demo · simulated data" label.

The story, in three acts:

1. **What the buyer's agent does.** Maya, Head of Operations at a 40-person fintech, asks her AI agent to shortlist BI tools. The agent compares using independent sources, then verifies facts with each vendor. Only Vantly uses Doorbell: the agent gets cited answers over MCP, an exact quote through an agent-fillable form (after Maya agrees to share her work email), and a clear "how to buy" comparison. A request for non-standard terms is escalated to a human rep.
2. **What Vantly sees.** Before Doorbell: zero visits, anonymous log lines, no CRM record. After: a live feed, a named account with the exact questions, buying stage, deal value, next best action, a rep alert and a CRM record.
3. **Insight and controls.** What agents ask across all buyers, the questions the desk couldn't answer, the policies that limit what the desk may say, and setup.

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

To deploy, upload `dist/` to any static host (Vercel, Netlify, S3). The app uses hash URLs (`/#/seller`), so no rewrite rules are needed.

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
| `B` | Before / After on the seller view |
| `1` `2` `3` | Jump to Act 1, 2 or 3 |
| `4` | Jump to the closing slide |

The dots on the right of the presenter bar jump to any step. Outside the presenter flow, every screen is clickable from the left nav (Buyer view, Seller view, Insights, Policies, Setup).


## Edit the story

Everything you see comes from typed files in [src/data/](src/data/). Components only render what those files say.

| File | Holds |
|---|---|
| [config.ts](src/data/config.ts) | Every name (product, vendor, competitors, buyer, seller), domains, the two closing statistics. Change a name here and it changes everywhere. |
| [policies.ts](src/data/policies.ts) | Plans and prices (the quote is computed from these), purchase paths, price bands, gated documents, escalation and answer rules |
| [buyerScript.ts](src/data/buyerScript.ts) | Act 1: each step's chat messages, timeline entries, buying stage, consent moment; the final comparison table |
| [sellerEvents.ts](src/data/sellerEvents.ts) | Act 2: the Before view, live feed events, account details, rep alert, CRM record, and the Act 2 steps |
| [insights.ts](src/data/insights.ts) | Act 3 simulated numbers |
| [setup.ts](src/data/setup.ts) | Setup page steps |
| [story.ts](src/data/story.ts) | The single ordered list of presenter steps (title, acts, closing) |

How the pieces fit:

- Each step in the ordered list says which screen it belongs to, how long auto-play stays on it (`dwellMs`), and what appears.
- Seller-side items name the buyer step at which they happen (`stepId`), so the seller view stays in sync: open the Seller view mid-way through Act 1 and you'll see exactly what Vantly has seen so far.
- Act 2 steps list which seller sections are revealed (`seller.show`), for pacing on stage.
- A typo in a `stepId` throws at load, and `npm run build` catches type errors.

## Verify it

```bash
npm run walkthrough
```

This builds the app, serves it, and in Chrome (via Playwright): presses `→` through every step, checks that `→` finishes typing before advancing, toggles Before/After, visits every screen, tries the consent "Not now" path and an Insights edit, checks that Reset clears everything, runs auto-play to the end on a fake clock, blocks and reports any non-local request, and fails on any console error. Screenshots of every step at 1280×800 and 1920×1080 go to `screenshots/`.

## What's real and what's mocked

| Real | Mocked |
|---|---|
| The presenter engine, keyboard controls, auto-play, reset | Every company, person, number and document |
| Step-synced buyer and seller views | The buyer's AI agent and its answers (scripted) |
| Offline build with bundled fonts | Doorbell's answers, quote form, CRM sync and alerts in the app (scripted) |

Only the two statistics on the closing slide refer to real research, each with its source. See [docs/decisions.md](docs/decisions.md) for a note on verifying them.

## Project structure

```
src/
  data/         config, story, buyerScript, sellerEvents, insights, policies, setup, types
  presenter/    DemoProvider (state, keyboard, auto-play), useStep (context hook), PresenterBar
  components/   Badges (door, source, status), StageTracker, Timeline, ChatItems, ConsentDialog,
                AlertCard, CrmCard, Typewriter, PageHeader, SideNav, ...
  views/        Title, BuyerView, SellerView, Insights, Policies, Setup, Closing
  lib/          step timing, scroll pinning
scripts/        walkthrough.ts (Playwright)
docs/           decisions.md
```
