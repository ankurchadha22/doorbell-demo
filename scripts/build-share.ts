// Builds the demo as ONE self-contained HTML file for sharing as a hosted page
// (for example a claude.ai Artifact link): JavaScript, CSS and fonts are all inlined.
//
//   node scripts/build-share.ts [output.html]      default: share/doorbell.html
//
// The file is a page body fragment (title, style, root element, script) without its own
// <html>/<head>/<body>, because the host wraps it in a document skeleton.

import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { build } from 'vite'

const out = resolve(process.argv[2] ?? 'share/doorbell.html')
const tmp = await mkdtemp(join(tmpdir(), 'doorbell-share-'))

try {
  await build({
    base: './',
    logLevel: 'warn',
    define: { 'import.meta.env.VITE_SHARE': JSON.stringify('1') },
    build: {
      outDir: tmp,
      emptyOutDir: true,
      // Inline every font as a data: URI; the host only serves the page itself.
      assetsInlineLimit: 10_000_000,
      cssCodeSplit: false,
      modulePreload: false,
    },
  })

  const index = await readFile(join(tmp, 'index.html'), 'utf8')
  const jsPath = index.match(/<script[^>]*src="\.?\/?([^"]+\.js)"/)?.[1]
  const cssPath = index.match(/<link[^>]*rel="stylesheet"[^>]*href="\.?\/?([^"]+\.css)"/)?.[1]
  if (!jsPath || !cssPath) throw new Error('Could not find the built script and stylesheet in index.html')

  const js = (await readFile(join(tmp, jsPath), 'utf8')).replaceAll('</script', '<\\/script')
  const css = (await readFile(join(tmp, cssPath), 'utf8')).replaceAll('</style', '<\\/style')

  const html = [
    '<title>Doorbell</title>',
    '<meta name="description" content="Doorbell concept demo. Simulated data.">',
    `<style>${css}</style>`,
    '<div id="root"></div>',
    `<script type="module">${js}</script>`,
    '',
  ].join('\n')

  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, html)
  console.log(`Wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`)
} finally {
  await rm(tmp, { recursive: true, force: true })
}
