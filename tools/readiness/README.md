# AI-agent readiness scanner

Looks at a software vendor's public website the way an AI assistant researching a purchase would, and produces a report card: can an assistant get in, can it find the price, are the facts a buyer needs there, and is anything machine-readable.

## Run it

```bash
node tools/readiness/scan.ts example.com
```

Writes `example.com.json` and a self-contained `example.com.html` report card to `private/data/readiness/` (kept out of git). Options: `--out <dir>`, `--no-browser` (skip the headless-browser comparison), `--json` (print the result).

```bash
node tools/readiness/batch.ts domains.txt --out private/data/readiness/batch --concurrency 6
```

Scans one domain per line and writes `summary.csv`, `summary.json` and `summary.md` with aggregate statistics and the count behind every percentage. A batch can be stopped and resumed: domains already scanned are read back unless you pass `--force`.

```bash
node --test "tools/readiness/test/*.test.ts"
```

## What it checks

| Category | Points | Checks |
|---|---:|---|
| Access | 25 | `robots.txt` rules for every named AI agent in `core/agents.ts` (user-triggered fetchers, search crawlers, training crawlers), and whether a plain request from a cloud server gets real content or a bot challenge |
| Pricing clarity | 30 | Is there a pricing page, does its HTML show prices, does it say "contact sales", is a free trial or free plan stated, and do prices appear only after JavaScript runs |
| Buyer facts | 20 | SOC 2, ISO 27001, GDPR, HIPAA, single sign-on, data residency, integrations and security pages, with the page and a short quote as evidence |
| Machine-readable | 15 | `llms.txt`, JSON-LD types and prices, a Markdown alternate, sitemap, and proposed well-known agent files |
| On-site help | 10 | Site search, a chat widget, anything addressed to AI assistants |

The weights and every rule are in `score.ts`. Politeness limits, the user agent and the list of well-known paths are in `config.ts`. A check that could not run (blocked, timed out) is marked "could not check" and left out of the score rather than scored as zero.

## How it behaves on someone else's site

- It sends an honest, generic user agent (`agent-readiness-check`) and never imitates an AI agent.
- It obeys `robots.txt` for unnamed agents: a disallowed path is not fetched and is reported as a finding.
- At most one request a second per host and about a dozen requests per site, with a 15-second timeout and a 2 MB cap per page.

## Limits

- One visit, from a cloud server, to public pages only. A site may treat a real assistant differently from this scanner, and differently from one day to the next.
- "Blocked for our request" is not proof that an AI assistant is blocked. The report words it that way and gives it little weight.
- Text checks are pattern matches. They find "contact sales" and currency amounts reliably; they can miss a price shown only in an image, and they can misread unusual wording. Read the evidence quoted in the report before repeating a finding.
- Do not publish a finding about a named company without checking it against the live page that day.
