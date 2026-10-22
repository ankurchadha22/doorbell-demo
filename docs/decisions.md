# Decisions made on your behalf

The brief said to pick sensible defaults and record them here. Grouped by area; the most consequential first.

## Things to check before presenting

- **The RESONEO statistic could not be verified.** A web search found the IDC "8 in 10" figure via a MarketScale article ("80% of B2B tech buyers now use AI agents…"), but found no source for the RESONEO "93% of ChatGPT's quick answers opened no web page" study. It is shown exactly as the brief specified. Confirm the source before you present, or remove it in `src/data/config.ts` (`stats`).
- **Fictional names checked.** A web search found no BI or analytics product named Vantly, Gridlake or Chartwell. The closest real name is Chartio, a discontinued BI tool; "Chartwell" is distinct enough, so no rename. Tidewater Labs, Maya Chen and Jordan Ellis are generic. All names live in `src/data/config.ts`.
- **The ask in the closing talk track is a placeholder** (the talk track is kept outside this repository), because the brief didn't say what you're asking for.

## Story and content

- **Renamed from Agent Desk to Doorbell** (your choice, from four options). A quick web search found an existing AI customer-support product called AgentDesk. Buyers' agents see the vendor's desk as "Vantly's AI desk", powered by Doorbell. The logo is a doorbell button with two sound waves, drawn in the demo's existing green so the violet MCP badge stays distinct; the mark is in `brand/doorbell-mark.svg`.

- **Plain-English example (changed at your request after the first build).** Maya needs Stripe and QuickBooks connections instead of Snowflake and Postgres; "row-level security per customer" is now "each customer sees only their own data"; the headline content gap is "Is there a free trial?" instead of "HIPAA BAA available?". SOC 2 and everything else stay. Stripe and QuickBooks appear as text only, the same way the brief names Salesforce and HubSpot.

- **Pricing is derived, not typed in.** Growth is $40 per user per month plus a $400/month embedding add-on: 40 users = $2,000/month by card, $24,000/year list, $21,600/year with the 10% annual discount. A 3-year deal ($64,800) is over the $50k multi-year limit, so the negotiation request breaks two policies at once. All of this lives in `src/data/policies.ts`; the chat, quote, seller view and policy page read it from there.
- **The agent touches all three doors.** Besides MCP (questions) and Form (quote), the agent first reads Vantly's AI-readable pages (Website door), which is also how it discovers the MCP connection.
- **Independent sources are fictional and generic**: `reviews.example`, `opsforum.example`, `databench.example`. No real review site is named.
- **"Also evaluating" comes from context the agent states when it connects** ("comparing 3 BI tools"), and is labeled "Inferred, not confirmed" in the seller view.
- **Before identification, the seller view shows an "Unidentified agent session"**. Earlier questions are linked to Tidewater Labs at the quote step, when Maya shares her email. You can see this live by opening the Seller view during Act 1.
- **Seller stage**: after the escalation, the account sits at "Choose how to buy" with "Negotiate (human)" flagged, as the brief asked, while the buyer's own tracker shows "Negotiate (human)" as the current stage.
- **Final comparison wording**: "Verified" (vendor confirmed with a cited document), "Vendor claim" (on their website, not checked), "Unknown", "Unverified". A one-line legend sits under the table. The recommendation stays neutral and mentions that the others "may also fit".
- **Policy content beyond the brief**: added "Never compare against named competitors", "Never promise roadmap features or dates" (answer rules), "Any discount above the auto-approve limit" (escalation), and two rows of gated documents ("Exact quote" needs a verified work email; public pages are open). They make the page realistic and match the story.
- **Simulated numbers** on the Insights page (door counts, funnel, top questions, content gaps, platform shares) are invented and labeled "Last 30 days · simulated data". The top content gap is "Is there a free trial?"; the other two are "Can data stay in the EU?" and "Is there an on-premise option?".
- **Server log** uses documentation-range IPs (203.0.113.x) and a generic user agent (`AI-Fetcher/2.1`, `ai-provider.example`). All domains use the reserved `.example` TLD, including the MCP address `vantly.doorbell.example/mcp`.
- **The closing slide includes the business-model line** from the talk track, plus a "Restart the demo" button. No other statistics, logos or testimonials.

## Presenter flow

- **27 steps**: title, 14 buyer steps, 7 seller steps, 4 Act 3 steps, closing. The single ordered array is `src/data/story.ts`, which composes `buyerSteps` (`buyerScript.ts`) and `sellerSteps` (`sellerEvents.ts`). I added `story.ts`, `setup.ts` and `types.ts` to the suggested data files.
- **Sync model**: every seller-side item names the step id at which it happens (`stepId`). Both views compute what to show from the current step index, so the seller view is always in sync with the buyer.
- **Act 2 reveals sections one step at a time**, with dashed placeholders so the layout doesn't jump. Anywhere outside Act 2, everything that has happened so far is shown.
- **Rep alert and CRM record are overlays** (a notification card and a slide-in panel) rather than permanent columns, because everything would not fit legibly at 1280×800. They open automatically on their steps, and the "Rep alert" and "CRM record" buttons on the account panel reopen them any time.
- **Before/After**: `B` on the scripted Before step plays the next step (the After reveal), so the flip and the reveal stay in order. On later steps `B` toggles freely; the override clears when the step changes.
- **`→` while animating**: the first press finishes the current step's typing and staggered reveals; the next press advances. `←` always lands on a fully shown step.
- **Extra key**: `4` jumps to the closing slide, so the 3-minute talk can skip Act 3. The other keys are as specified.
- **Space and focus**: presenter buttons drop focus after a mouse click, and Space is left to a focused button, so one press never counts twice.
- **Consent is inline in the chat** (the way agent apps ask for permission) rather than a floating modal, so the agent's question stays visible above it. "Not now" works: the agent says nothing was shared and offers "Share my email after all", which continues the story.
- **Auto-play runs about 3:08** (title 6 s, Act 1 77 s, Act 2 61 s, Act 3 31 s, closing 12 s). Per-step dwell times are in the data files (`dwellMs`).
- **Free navigation** never changes the step; presenter actions (`→`, `←`, act jumps, Reset, progress dots) move the screen to the step's route. Screens opened before the story starts show an empty state with "Start the buyer's story" and "Show the full conversation" / "Show what Vantly sees".
- **Reset** returns to step 1, stops auto-play and remounts every screen, which clears local edits (added answers, policy switches, consent choice).

## Design

- **One accent**: a deep "desk-lamp" green (`#0f6b57`) on a cool, faintly green paper background. Door colors (Website blue, Form ochre, MCP violet) are a separate, consistent badge system, checked for color-blind separation. Source badges are outlined (Independent solid, Vendor dashed) so they never read as doors.
- **Type**: Inter Variable for everything, JetBrains Mono only for the server log, URLs and the MCP address. Both bundled with `@fontsource`, so no network fonts.
- **Scaling**: the root font size goes from 15px at 1280×800 to 18px at 1920×1080 (by width and height), so the projector shows the same layout, larger. Body text is at least 15px; small meta text (timestamps, badges) is 12–14px.
- **The buyer's agent is generic**: a slate robot avatar and the label "Buyer's AI agent", no product styling. The team-chat alert and CRM card are unbranded; Salesforce and HubSpot appear in text only.
- **Charts are hand-built** (CSS bars) instead of Recharts: fewer dependencies, no animation timing to fight, values labeled directly, full figures on hover.

## Tech

- **Versions**: Vite 8, React 19, TypeScript 6 (the Vite template's pin), Tailwind CSS 4 (Vite plugin), React Router 8 (`react-router`; `react-router-dom` is no longer needed), `motion` 14 (the current name of Framer Motion, imported from `motion/react`), lucide-react, oxlint (the template's linter).
- **HashRouter** (`/#/seller`) so the static build works on Vercel, Netlify or any file host without rewrite rules.
- **Built in place**: the folder held only the prompt file, so the project was created next to it.
- **Test hooks**: the current step, step id, settled and auto-play states are written to `data-*` attributes on `<html>`. The walkthrough script reads them; they have no visual effect.
- **Walkthrough browser**: `scripts/walkthrough.ts` uses your installed Google Chrome through Playwright, so no browser download is needed. If Chrome is missing it falls back to Playwright's Chromium (`npx playwright install chromium`).
- **Auto-play test** runs on Playwright's fake clock, so the 3-minute story is checked in a few seconds.
