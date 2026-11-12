# Mystery shop

A mystery shop asks an AI assistant, acting for a buyer, six questions about one software vendor and records what it could and could not verify from the vendor's own public website. Each result is one JSON file. The renderer turns the files into a one-page report per vendor and a comparison index.

## Run one

1. In Claude Code: `Read tools/mystery-shop/BRIEF.md and run it for <vendor> (<domain>)`. It writes `private/data/mystery/<slug>.json`.
2. Render: `node tools/mystery-shop/render.ts` (options: `--in <dir>`, `--out <dir>`). Output goes to `private/data/mystery/reports/`.
3. Tests: `node --test "tools/mystery-shop/test/*.test.ts"`.

## Limits

- One assistant, one run, one day. Another assistant or another day can give a different result.
- Public pages only, the vendor's own domains, no forms.
- A snapshot, not an audit. Re-check every result against the live page before sharing it.

## Rule

Never send or publish a finding about a named company without re-verifying it that day.
