# Mystery-shop brief (identical for every vendor)

Change only the parts marked CHANGE: `<VENDOR>`, the buyer scenario (the quoted block), and `<slug>`. Keep everything else identical so vendors stay comparable.

You are acting as a buyer's AI research assistant. Your user said:

> CHANGE (buyer scenario): We're a 40-person fintech. We're evaluating BI tools. For <VENDOR> (CHANGE: vendor name and domain), find out from their own website:
> 1. Does it connect to Stripe and QuickBooks?
> 2. Can we embed dashboards in our customer-facing app so each customer sees only their own data?
> 3. What would it cost per year for 40 users with embedding?
> 4. Are they SOC 2 Type II?
> 5. Is there a free trial?
> 6. Can embedded dashboards carry our own branding, and can our customers sign in with their existing accounts (SSO)?
> Give me a short answer to each, and say where you found it.

## Method (follow exactly, so vendors are comparable)
- Use ONLY the WebFetch tool (load it with ToolSearch if needed). Do not use WebSearch. Fetch only pages on the vendor's own domains (website, docs, trust center, pricing). This measures what the vendor's own site tells an assistant.
- Start at the vendor's home page. Then look for pricing, integrations/connectors, embedding docs, security/trust pages by following links you see or trying obvious paths (/pricing, /security, /trust, /integrations, /docs). Also try /llms.txt once.
- At most 14 fetches per vendor. Stop early when all six questions are settled.
- Never guess. If the site doesn't say, the status is not_found. If the site says something vague ("flexible pricing", "enterprise-grade security"), the status is vague.
- Do not fill in forms, start trials, or contact anyone.

## Output: one JSON file per vendor at private/data/mystery/<slug>.json (CHANGE: <slug> is the lowercase vendor name, e.g. metabase)
{
  "vendor": "Name",
  "domain": "example.com",
  "date": "2026-11-12",
  "fetches": [ { "url": "...", "outcome": "ok | blocked | error | redirect | empty", "note": "what was there, 1 line" } ],
  "answers": [
    {
      "q": 1,
      "question": "Stripe and QuickBooks connections",
      "status": "verified | partial | vague | not_found | contradictory | blocked",
      "answer": "one or two sentences, only what the site supports",
      "source_url": "the page that supports it, or null",
      "quote": "a short supporting quote, under 25 words, or null"
    }
    // ... q 2..6 in the same shape
  ],
  "price_estimate": { "annual_usd": number or null, "basis": "how you computed it from published numbers, or why you could not" },
  "obstacles": [ "plain-language list: e.g. pricing page says contact sales; docs page returned empty content; fetch blocked with 403" ],
  "what_would_have_helped": "one sentence: what one page or fact would have let you answer everything",
  "llms_txt": "present | absent | blocked",
  "would_shortlist": "yes | maybe | no",
  "shortlist_reason": "one sentence, from the buyer's point of view"
}
Status meanings: verified = stated clearly with a source page; partial = part of the question answered (e.g. Stripe yes, QuickBooks not mentioned); vague = mentioned without specifics; not_found = looked in the obvious places, nothing; contradictory = pages disagree; blocked = could not load the pages needed.
