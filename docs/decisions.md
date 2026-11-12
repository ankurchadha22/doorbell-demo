# Decisions made on your behalf

The brief said to pick sensible defaults and record them here. Grouped by area; the most consequential first.

## Things to check before presenting

- **Only one statistic is shown.** The closing slide cites Forrester's State of Business Buying 2026: 94% of business buyers use AI during their buying process. It replaced IDC's "8 in 10 B2B tech buyers use AI agents" line in November 2026: IDC's own wording is that 80% of buyers *would* use an agent in a complex transaction, which is intent, and the "now use" wording came from trade press. The earlier RESONEO figure was removed before that: it couldn't be verified as written.
- **Companies are named by their role** (your request): Vendor, Competitor 1 and Competitor 2, so the audience never has to track made-up brand names. Running text says "the vendor". (It was "Seller" until October 2026.) Where "vendor" used to be a generic word, the demo now says "Own site" for the source badge and "Claimed" in the final table, so neither reads as the company's name. The people keep names but are introduced by role (running text avoids pronouns for them): Julie Sharp is the buyer (at MIT Capital), Jordan Ellis is the vendor's sales rep. All names live in `src/data/config.ts`.
- **The buyer's company is "MIT Capital"** (your choice). Note: a real student venture group called MIT Capital Partners exists at MIT, and MIT restricts use of its name by outside ventures. The demo describes MIT Capital as a fictional 40-person fintech.
- **Real AI browsers are named in text only.** The buyer's agent is labeled "Buyer's AI browser agent", with "e.g. ChatGPT Agent, Comet or Claude in Chrome" as plain text, the same way Salesforce, HubSpot, Slack and Teams appear. No product styling or logos.

## Story and content

- **The product is a website tag (changed October 2026).** The first version had an MCP desk, an agent-fillable quote form and a work-email consent step. It now matches the application answers: Doorbell is one line of code that spots AI agent visits, matches them to a company where it can, summarizes what the agent was looking for and helps on the spot through a visible "Facts for AI assistants" panel and an ask box. MCP was added back later at your request, as the deeper channel (see below).
- **Renamed from Agent Desk to Doorbell** (your choice, from four options). A quick web search found an existing AI customer-support product called AgentDesk. The logo is a doorbell button with two sound waves, drawn in the demo's green; the mark is in `brand/doorbell-mark.svg`.
- **Plain-English example.** Julie needs Stripe and QuickBooks connections and embedded dashboards where each customer sees only their own data. The gap the agent hits is "Is there a free trial?". SOC 2 stays.
- **The company match is shown as a match, not a fact.** The vendor view says "Matched by company network · high confidence" and notes that visits that can't be matched stay anonymous. No person is named on the vendor side.
- **The mission summary is labeled as inferred** ("Inferred from the pages it read, what it priced and what it asked"). The vendor view no longer claims to know competitors, budget or buying stage.
- **Everything the agent sees is visible to people.** The facts panel and ask box sit on the page; one answer rule says so explicitly ("No hidden instructions").
- **MCP is the channel for deeper or gated questions, and is marked as roadmap.** Agents discover the connection in the facts panel (a line with the MCP address), which answers the reviewer's doubt about how agents would find it. The agent asks Julie before connecting, since assistants are likely to keep asking before connecting to an unknown server. Over MCP it gets a cited answer on branding and sign-in, and an NDA link for the SOC 2 report, which opens once signed. The MCP card in the buyer view says "Over MCP, on the roadmap", matching the application answers (website tag today, WebMCP and MCP next). MCP uses the violet badge; the ask box moved to teal.
- **The ask box escalates rather than guesses.** With no approved answer, it says so and passes the question to a person; the rep alert and the "what agents couldn't find" report pick it up.
- **Pricing is derived, not typed in.** Growth is $40 per user per month plus a $400/month embedding add-on: 40 users = $2,000/month, $21,600/year with the 10% annual discount. All of this lives in `src/data/policies.ts`.
- **Independent sources are fictional and generic**: `reviews.example`, `opsforum.example`, `databench.example`. No real review site is named.
- **The Before view shows the same visit as the After view (changed November 2026).** The agent in the story runs in the buyer's own browser, which is why it can be matched to a company network. Such a visit sends an ordinary Chrome user agent, signs nothing and is counted by analytics as one more anonymous person. So Before now shows one anonymous four-minute visit, ordinary browser log lines from a documentation-range IP, and no CRM record. The earlier version showed zero visits and a signed `signature-agent` header, which describes a cloud agent arriving from the AI company's network: a visit that could never be matched to the buyer. All domains use the reserved `.example` TLD.
- **The weekly report's mix of agents is realistic.** Assistant page fetches are the largest group, then AI browser agents, then cloud agents. Only AI browser agents can be matched to a company, so the matched share is 12% of visits, not 41%. The numbers are still invented and labeled as simulated.
- **Pricing line.** The closing slide says a flat monthly subscription per website. It used to say pricing was based on agent traffic, which a customer can neither control nor predict.
- **Simulated numbers** in the weekly report are invented and labeled "This week · simulated data".
- **The closing slide** shows the flow (agent visit → Doorbell → rep alert, CRM record, weekly report), the roadmap (website tag today, WebMCP next, MCP later), the statistic and the business model: a monthly subscription based on agent traffic, with a free tier for small sites.

## Presenter flow

- **25 steps**: title, 12 buyer steps, 7 vendor steps, 4 Act 3 steps, closing. The single ordered array is `src/data/story.ts`, which composes `buyerSteps` (`buyerScript.ts`) and `sellerSteps` (`sellerEvents.ts`).
- **Sync model**: every vendor-side item names the step id at which it happens (`stepId`). Both views compute what to show from the current step index, so the vendor view is always in sync with the buyer.
- **Act 2 reveals sections one step at a time**, with dashed placeholders so the layout doesn't jump. Anywhere outside Act 2, everything that has happened so far is shown.
- **Rep alert and CRM record are overlays** rather than permanent columns, because everything would not fit legibly at 1280×800. They open automatically on their steps, and the "Rep alert" and "CRM record" buttons reopen them any time.
- **Before/After**: `B` on the scripted Before step plays the next step (the After reveal), so the flip and the reveal stay in order. On later steps `B` toggles freely; the override clears when the step changes.
- **`→` while animating**: the first press finishes the current step's typing and staggered reveals; the next press advances. `←` always lands on a fully shown step.
- **Extra key**: `4` jumps to the closing slide. The other keys are as specified.
- **Space and focus**: presenter buttons drop focus after a mouse click, and Space is left to a focused button, so one press never counts twice.
- **Auto-play runs about 3:05.** Per-step dwell times are in the data files (`dwellMs`).
- **Free navigation** never changes the step; presenter actions (`→`, `←`, act jumps, Reset, progress dots) move the screen to the step's route. Screens opened before the story starts show an empty state with "Start the buyer's story" and a jump to the end.
- **Reset** returns to step 1, stops auto-play and remounts every screen, which clears local edits (added answers, rule switches).

## Design

- **One accent**: a deep green (`#0f6b57`) on a cool, faintly green paper background. Channel colors (Web page blue, Facts panel ochre, Ask box teal, MCP violet) are a separate, consistent badge system. Source badges are outlined (Independent solid, Vendor dashed) so they never read as channels.
- **Type**: Inter Variable for everything, JetBrains Mono only for the server log, URLs and the tag snippet. Both bundled with `@fontsource`, so no network fonts.
- **Scaling**: the root font size goes from 15px at 1280×800 to 18px at 1920×1080 (by width and height), so the projector shows the same layout, larger.
- **The buyer's agent is generic**: a slate robot avatar, no product styling. The vendor's page appears as a small browser frame with the facts panel beside the pricing tiers. The team-chat alert and CRM card are unbranded.
- **Charts are hand-built** (CSS bars): fewer dependencies, values labeled directly, full figures on hover.

## Tech

- **Versions**: Vite 8, React 19, TypeScript 6 (the Vite template's pin), Tailwind CSS 4 (Vite plugin), React Router 8 (`react-router`), `motion` 14 (imported from `motion/react`), lucide-react, oxlint.
- **HashRouter** (`/#/vendor`) so the static build works on GitHub Pages or any file host without rewrite rules.
- **Test hooks**: the current step, step id, settled and auto-play states are written to `data-*` attributes on `<html>`. The walkthrough script reads them; they have no visual effect.
- **Walkthrough browser**: `scripts/walkthrough.ts` uses your installed Google Chrome through Playwright, so no browser download is needed. If Chrome is missing it falls back to Playwright's Chromium (`npx playwright install chromium`).
- **Auto-play test** runs on Playwright's fake clock, so the full story is checked in a few seconds.
