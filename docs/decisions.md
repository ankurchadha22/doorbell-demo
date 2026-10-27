# Decisions made on your behalf

The brief said to pick sensible defaults and record them here. Grouped by area; the most consequential first.

## Things to check before presenting

- **Only one statistic is shown.** The closing slide cites IDC's "8 in 10 B2B tech buyers use AI agents" finding, as reported by MarketScale in August 2026. The earlier RESONEO figure was removed: it couldn't be verified as written, and the verified version (most ChatGPT answers open no web page) is about chat answers, not the AI browsers this demo is about.
- **Companies are named by their role** (your request): Seller, Competitor 1 and Competitor 2, so the audience never has to track made-up brand names. Running text says "the seller". The people keep names but are introduced by role: Maya Chen is the buyer (at MIT Capital), Jordan Ellis is the seller's sales rep. All names live in `src/data/config.ts`.
- **The buyer's company is "MIT Capital"** (your choice). Note: a real student venture group called MIT Capital Partners exists at MIT, and MIT restricts use of its name by outside ventures. The demo describes MIT Capital as a fictional 40-person fintech.
- **Real AI browsers are named in text only.** The buyer's agent is labeled "Buyer's AI browser agent", with "e.g. ChatGPT Agent, Comet or Claude in Chrome" as plain text, the same way Salesforce, HubSpot, Slack and Teams appear. No product styling or logos.

## Story and content

- **The product is a website tag (changed October 2026).** The first version had an MCP desk, an agent-fillable quote form and a work-email consent step. It now matches the application answers: Doorbell is one line of code that spots AI agent visits, matches them to a company where it can, summarizes what the agent was looking for and helps on the spot through a visible "Facts for AI assistants" panel and an ask box. MCP appears only on the roadmap.
- **Renamed from Agent Desk to Doorbell** (your choice, from four options). A quick web search found an existing AI customer-support product called AgentDesk. The logo is a doorbell button with two sound waves, drawn in the demo's green; the mark is in `brand/doorbell-mark.svg`.
- **Plain-English example.** Maya needs Stripe and QuickBooks connections and embedded dashboards where each customer sees only their own data. The gap the agent hits is "Is there a free trial?". SOC 2 stays.
- **The company match is shown as a match, not a fact.** The seller view says "Matched by company network · high confidence" and notes that visits that can't be matched stay anonymous. No person is named on the seller side.
- **The mission summary is labeled as inferred** ("Inferred from the pages it read, what it priced and what it asked"). The seller view no longer claims to know competitors, budget or buying stage.
- **Everything the agent sees is visible to people.** The facts panel and ask box sit on the page; one answer rule says so explicitly ("No hidden instructions").
- **The ask box escalates rather than guesses.** With no approved answer, it says so and passes the question to a person; the rep alert and the "what agents couldn't find" report pick it up.
- **Pricing is derived, not typed in.** Growth is $40 per user per month plus a $400/month embedding add-on: 40 users = $2,000/month, $21,600/year with the 10% annual discount. All of this lives in `src/data/policies.ts`.
- **Independent sources are fictional and generic**: `reviews.example`, `opsforum.example`, `databench.example`. No real review site is named.
- **The Before view** shows zero analytics visits (filtered as bot traffic), server log lines from a documentation-range IP with a `signature-agent` header naming a generic `ai-provider.example`, and no CRM record. All domains use the reserved `.example` TLD.
- **Simulated numbers** in the weekly report are invented and labeled "This week · simulated data".
- **The closing slide** shows the flow (agent visit → Doorbell → rep alert, CRM record, weekly report), the roadmap (website tag today, WebMCP next, MCP later), the statistic and the business model: a monthly subscription based on agent traffic, with a free tier for small sites.

## Presenter flow

- **23 steps**: title, 10 buyer steps, 7 seller steps, 4 Act 3 steps, closing. The single ordered array is `src/data/story.ts`, which composes `buyerSteps` (`buyerScript.ts`) and `sellerSteps` (`sellerEvents.ts`).
- **Sync model**: every seller-side item names the step id at which it happens (`stepId`). Both views compute what to show from the current step index, so the seller view is always in sync with the buyer.
- **Act 2 reveals sections one step at a time**, with dashed placeholders so the layout doesn't jump. Anywhere outside Act 2, everything that has happened so far is shown.
- **Rep alert and CRM record are overlays** rather than permanent columns, because everything would not fit legibly at 1280×800. They open automatically on their steps, and the "Rep alert" and "CRM record" buttons reopen them any time.
- **Before/After**: `B` on the scripted Before step plays the next step (the After reveal), so the flip and the reveal stay in order. On later steps `B` toggles freely; the override clears when the step changes.
- **`→` while animating**: the first press finishes the current step's typing and staggered reveals; the next press advances. `←` always lands on a fully shown step.
- **Extra key**: `4` jumps to the closing slide. The other keys are as specified.
- **Space and focus**: presenter buttons drop focus after a mouse click, and Space is left to a focused button, so one press never counts twice.
- **Auto-play runs about 2:50.** Per-step dwell times are in the data files (`dwellMs`).
- **Free navigation** never changes the step; presenter actions (`→`, `←`, act jumps, Reset, progress dots) move the screen to the step's route. Screens opened before the story starts show an empty state with "Start the buyer's story" and a jump to the end.
- **Reset** returns to step 1, stops auto-play and remounts every screen, which clears local edits (added answers, rule switches).

## Design

- **One accent**: a deep green (`#0f6b57`) on a cool, faintly green paper background. Channel colors (Web page blue, Facts panel ochre, Ask box violet) are a separate, consistent badge system. Source badges are outlined (Independent solid, Vendor dashed) so they never read as channels.
- **Type**: Inter Variable for everything, JetBrains Mono only for the server log, URLs and the tag snippet. Both bundled with `@fontsource`, so no network fonts.
- **Scaling**: the root font size goes from 15px at 1280×800 to 18px at 1920×1080 (by width and height), so the projector shows the same layout, larger.
- **The buyer's agent is generic**: a slate robot avatar, no product styling. The seller's page appears as a small browser frame with the facts panel beside the pricing tiers. The team-chat alert and CRM card are unbranded.
- **Charts are hand-built** (CSS bars): fewer dependencies, values labeled directly, full figures on hover.

## Tech

- **Versions**: Vite 8, React 19, TypeScript 6 (the Vite template's pin), Tailwind CSS 4 (Vite plugin), React Router 8 (`react-router`), `motion` 14 (imported from `motion/react`), lucide-react, oxlint.
- **HashRouter** (`/#/seller`) so the static build works on GitHub Pages or any file host without rewrite rules.
- **Test hooks**: the current step, step id, settled and auto-play states are written to `data-*` attributes on `<html>`. The walkthrough script reads them; they have no visual effect.
- **Walkthrough browser**: `scripts/walkthrough.ts` uses your installed Google Chrome through Playwright, so no browser download is needed. If Chrome is missing it falls back to Playwright's Chromium (`npx playwright install chromium`).
- **Auto-play test** runs on Playwright's fake clock, so the full story is checked in a few seconds.
