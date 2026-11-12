# Website (draft)

A static site for the product, under its working name. Four pages (`index.html`, `scan.html`, `method.html`, `privacy.html`), one stylesheet, one small script. No build step, no dependencies, no external requests.

## Preview

```bash
npx serve site
```

Or open `site/index.html` in a browser.

## Before it goes live

1. **Set the two endpoints** in `config.js`. Until `waitlistEndpoint` is set, the waiting-list form says it isn't open yet instead of pretending to work. Until `scanEndpoint` is set, the scan form explains that the scan is opening to a waiting list. Each endpoint receives a JSON `POST`; any form service that accepts JSON will do.
2. **Set `contact`** in `config.js` (shown on the privacy page) and, if you want the "Who is behind this?" answer to appear, `behind`.
3. **Check every figure** against `content/evidence.json`. All numbers on the home page come from that file and were copied into the HTML by hand. Re-run the study, update the file, then update the page.

## Renaming

The name is set in `config.js` and applied when the page loads. The HTML also contains the working name so the pages read correctly without JavaScript. To rename, change `name` in `config.js`, then search and replace `Doorbell` across `site/*.html`, and replace `assets/doorbell-mark.svg`.

## Hosting

Any static host works: upload the `site/` folder as it is.

- **GitHub Pages:** publish the `site/` folder from a repository (Settings → Pages).
- **Cloudflare Pages / Netlify:** set the output directory to `site` and leave the build command empty.

Links are relative, so the site also works from a subfolder.
