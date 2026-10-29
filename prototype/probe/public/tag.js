// Doorbell probe tag (Step 0). Records what a visitor's browser looks like and how it moves through
// the page, and sends it to the collector it was loaded from. It never records what is typed, only
// counts and timing; the one exception is a question submitted to the ask box, which the server
// logs anyway. Plain JavaScript, served as-is.
;(() => {
  const script = document.currentScript
  const collector = script ? new URL(script.src).origin : location.origin
  const now = () => Math.round(performance.now())
  const rid = () => Math.random().toString(16).slice(2, 14)
  const cookie = (name) =>
    document.cookie
      .split('; ')
      .find((c) => c.startsWith(name + '='))
      ?.slice(name.length + 1)

  let visitorId = cookie('pv')
  if (!visitorId) {
    try {
      visitorId = sessionStorage.getItem('pv') || rid()
      sessionStorage.setItem('pv', visitorId)
    } catch {
      visitorId = rid()
    }
  }
  const pageId = rid()
  const run = cookie('run') || null
  const opts = { capture: true, passive: true }

  /* ---------- What happens on the page ---------- */

  const MAX_EVENTS = 300
  let eventCount = 0
  const events = []
  const push = (type, data) => {
    if (eventCount++ < MAX_EVENTS) events.push({ t: now(), type, ...data })
  }

  const counters = {
    mousemove: 0,
    pointermove: 0,
    pointerdown: 0,
    click: 0,
    untrustedClick: 0,
    keydown: 0,
    untrustedKey: 0,
    input: 0,
    paste: 0,
    scroll: 0,
    wheel: 0,
    touch: 0,
    copy: 0,
    selection: 0,
    focusWindow: 0,
    blurWindow: 0,
    resize: 0,
    maxScrollPct: 0,
    factsMsInView: 0,
    firstInteractionMs: null,
  }
  const inputTypes = {}
  const touched = () => {
    if (counters.firstInteractionMs === null) counters.firstInteractionMs = now()
  }

  const describe = (el) => {
    if (!(el instanceof Element)) return null
    const tag = el.tagName.toLowerCase()
    const own = el.id ? `${tag}#${el.id}` : tag
    const href = el.closest('a')?.getAttribute('href')
    const context = el.id ? null : el.closest('[id]')?.id
    return [own, href && `→ ${href}`, context && `in #${context}`].filter(Boolean).join(' ')
  }
  const inFacts = (node) => !!(node && (node.nodeType === 1 ? node : node.parentElement)?.closest('#facts'))

  let lastMove = 0
  addEventListener('mousemove', () => {
    counters.mousemove++
    lastMove = now()
  }, opts)
  addEventListener('pointermove', () => counters.pointermove++, opts)
  addEventListener('pointerdown', () => {
    counters.pointerdown++
    touched()
  }, opts)
  addEventListener('click', (e) => {
    counters.click++
    if (!e.isTrusted) counters.untrustedClick++
    touched()
    const el = e.target instanceof Element ? e.target : null
    const r = el?.getBoundingClientRect()
    push('click', {
      target: describe(el),
      trusted: e.isTrusted,
      pointer: e.pointerType || null,
      detail: e.detail,
      x: Math.round(e.clientX),
      y: Math.round(e.clientY),
      // Offset from the element's centre: scripted clicks often land dead centre.
      dx: r ? Math.round(e.clientX - (r.left + r.width / 2)) : null,
      dy: r ? Math.round(e.clientY - (r.top + r.height / 2)) : null,
      msSinceMove: lastMove ? now() - lastMove : null,
    })
  }, opts)

  // Per text field: keydowns against input events. Text inserted by automation often arrives as
  // input events with no keydowns at all.
  const fields = {}
  const field = (el) => {
    const id = el.id || el.name || el.tagName.toLowerCase()
    return (fields[id] ??= { keydown: 0, untrustedKey: 0, input: 0, inputTypes: {}, paste: 0, focusAt: null, intervals: [], lastKey: 0 })
  }
  const isField = (el) => el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
  addEventListener('keydown', (e) => {
    counters.keydown++
    if (!e.isTrusted) counters.untrustedKey++
    touched()
    if (isField(e.target)) {
      const f = field(e.target)
      f.keydown++
      if (!e.isTrusted) f.untrustedKey++
      const t = now()
      if (f.lastKey && f.intervals.length < 200) f.intervals.push(t - f.lastKey)
      f.lastKey = t
    }
  }, opts)
  addEventListener('input', (e) => {
    counters.input++
    const type = e.inputType || 'unknown'
    inputTypes[type] = (inputTypes[type] || 0) + 1
    if (isField(e.target)) {
      const f = field(e.target)
      f.input++
      f.inputTypes[type] = (f.inputTypes[type] || 0) + 1
    }
  }, opts)
  addEventListener('paste', (e) => {
    counters.paste++
    if (isField(e.target)) field(e.target).paste++
  }, opts)
  addEventListener('focusin', (e) => {
    if (isField(e.target)) {
      const f = field(e.target)
      if (f.focusAt === null) f.focusAt = now()
    }
    push('focus', { target: describe(e.target), trusted: e.isTrusted })
  }, opts)
  addEventListener('scroll', () => {
    counters.scroll++
    const h = document.documentElement.scrollHeight
    if (h) counters.maxScrollPct = Math.max(counters.maxScrollPct, Math.round(((scrollY + innerHeight) / h) * 100))
  }, opts)
  addEventListener('wheel', () => {
    counters.wheel++
    touched()
  }, opts)
  addEventListener('touchstart', () => {
    counters.touch++
    touched()
  }, opts)
  addEventListener('resize', () => counters.resize++, opts)
  addEventListener('focus', () => counters.focusWindow++)
  addEventListener('blur', () => counters.blurWindow++)
  document.addEventListener('copy', () => {
    counters.copy++
    push('copy', { inFacts: inFacts(getSelection()?.anchorNode) })
  }, opts)
  let selectedFacts = false
  document.addEventListener('selectionchange', () => {
    counters.selection++
    if (!selectedFacts && inFacts(getSelection()?.anchorNode) && String(getSelection()).trim()) {
      selectedFacts = true
      push('facts-selected', {})
    }
  })

  // Facts panel: time on screen, and the machine-readable toggle.
  const facts = document.getElementById('facts')
  if (facts && 'IntersectionObserver' in window) {
    let since = null
    new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && since === null) {
          since = now()
          push('facts-visible', { ratio: Math.round(entry.intersectionRatio * 100) / 100 })
        } else if (!entry.isIntersecting && since !== null) {
          counters.factsMsInView += now() - since
          since = null
        }
      },
      { threshold: 0.5 },
    ).observe(facts)
    addEventListener('pagehide', () => {
      if (since !== null) counters.factsMsInView += now() - since
    }, opts)
  }
  document.getElementById('facts-more')?.addEventListener('toggle', (e) => push('facts-details', { open: e.target.open }))

  // Ask box: answer in place, and fall back to the plain form post if that fails.
  const form = document.getElementById('ask-form')
  const answerEl = document.getElementById('ask-answer')
  const fieldSummary = (id) => {
    const f = fields[id]
    if (!f) return null
    const iv = f.intervals
    const mean = iv.length ? iv.reduce((a, b) => a + b, 0) / iv.length : null
    const sd = mean === null ? null : Math.sqrt(iv.reduce((a, b) => a + (b - mean) ** 2, 0) / iv.length)
    return {
      keydown: f.keydown,
      untrustedKey: f.untrustedKey,
      input: f.input,
      inputTypes: f.inputTypes,
      paste: f.paste,
      msFocused: f.focusAt === null ? null : now() - f.focusAt,
      keyIntervalMean: mean === null ? null : Math.round(mean),
      keyIntervalSd: sd === null ? null : Math.round(sd),
    }
  }
  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const q = String(new FormData(form).get('q') || '')
    push('ask-submit', { trusted: e.isTrusted, submitter: describe(e.submitter), length: q.length, field: fieldSummary('ask-q') })
    send('ask')
    try {
      const res = await fetch('/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ q, visitorId, pageId }),
      })
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      answerEl.replaceChildren(document.createTextNode(data.text))
      for (const s of data.sources) {
        const a = document.createElement('a')
        a.href = s.url
        a.textContent = `Source: ${s.label}`
        a.setAttribute('data-probe', '')
        answerEl.append(' ', a)
      }
    } catch {
      form.submit()
    }
  })

  /* ---------- What the browser looks like ---------- */

  const AUTOMATION =
    /^(__playwright|__pw|__puppeteer|puppeteer|__selenium|_selenium|selenium|__webdriver|webdriver|__driver|__fxdriver|callPhantom|_phantom|phantom|__nightmare|domAutomation|cdc_|\$cdc_|_Selenium|__lastWatir|__stagehand|__browserbase|__browser_use)/i

  /** Window properties a clean frame doesn't have: page scripts, or scripts an extension put in the page. */
  const extraGlobals = () => {
    try {
      const frame = document.createElement('iframe')
      frame.setAttribute('data-probe', '')
      frame.style.display = 'none'
      document.body.append(frame)
      const clean = new Set(Object.getOwnPropertyNames(frame.contentWindow))
      frame.remove()
      return Object.getOwnPropertyNames(window).filter((k) => !clean.has(k)).slice(0, 40)
    } catch {
      return null
    }
  }

  const webgl = () => {
    try {
      const gl = document.createElement('canvas').getContext('webgl')
      const ext = gl?.getExtension('WEBGL_debug_renderer_info')
      return ext ? { vendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL), renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) } : null
    } catch {
      return null
    }
  }

  const safe = (fn) => {
    try {
      return fn()
    } catch {
      return null
    }
  }

  async function collectSignals() {
    const nav = navigator
    let uaHigh = null
    try {
      uaHigh = await nav.userAgentData?.getHighEntropyValues(['architecture', 'bitness', 'model', 'platformVersion', 'fullVersionList'])
    } catch {
      // Not offered by this browser.
    }
    let notificationQuery = null
    try {
      notificationQuery = (await nav.permissions.query({ name: 'notifications' })).state
    } catch {
      // Not offered by this browser.
    }
    const webdriverOwn = Object.getOwnPropertyDescriptor(nav, 'webdriver')
    const webdriverProto = safe(() => Object.getOwnPropertyDescriptor(Object.getPrototypeOf(nav), 'webdriver'))
    const getter = webdriverProto?.get
    return {
      webdriver: nav.webdriver ?? null,
      // Stealth tools redefine navigator.webdriver; the real one is a native getter on the prototype.
      webdriverTampered: Boolean(webdriverOwn) || (getter ? !/\[native code\]/.test(Function.prototype.toString.call(getter)) : false),
      ua: nav.userAgent,
      uaData: nav.userAgentData ? { brands: nav.userAgentData.brands, mobile: nav.userAgentData.mobile, platform: nav.userAgentData.platform } : null,
      uaHigh,
      platform: nav.platform,
      vendor: nav.vendor,
      languages: nav.languages,
      hardwareConcurrency: nav.hardwareConcurrency ?? null,
      deviceMemory: nav.deviceMemory ?? null,
      maxTouchPoints: nav.maxTouchPoints ?? null,
      pdfViewerEnabled: nav.pdfViewerEnabled ?? null,
      cookieEnabled: nav.cookieEnabled,
      plugins: nav.plugins?.length ?? null,
      connection: nav.connection
        ? { effectiveType: nav.connection.effectiveType, rtt: nav.connection.rtt, downlink: nav.connection.downlink, saveData: nav.connection.saveData }
        : null,
      screen: { w: screen.width, h: screen.height, availW: screen.availWidth, availH: screen.availHeight, colorDepth: screen.colorDepth },
      window: { innerW: innerWidth, innerH: innerHeight, outerW: outerWidth, outerH: outerHeight, dpr: devicePixelRatio, x: screenX, y: screenY },
      timezone: safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone),
      tzOffset: new Date().getTimezoneOffset(),
      webgl: webgl(),
      // Classic headless tell: notifications "denied" while the permission query says "prompt".
      notification: typeof Notification === 'undefined' ? null : Notification.permission,
      notificationQuery,
      chrome: typeof window.chrome === 'object' ? Object.keys(window.chrome).slice(0, 10) : null,
      automationGlobals: Object.getOwnPropertyNames(window).filter((k) => AUTOMATION.test(k)).slice(0, 20),
      extraGlobals: extraGlobals(),
      media: {
        pointerFine: matchMedia('(pointer: fine)').matches,
        hover: matchMedia('(hover: hover)').matches,
        dark: matchMedia('(prefers-color-scheme: dark)').matches,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      },
      focused: document.hasFocus(),
      visibility: document.visibilityState,
      historyLength: history.length,
      referrer: document.referrer || null,
      navigationType: safe(() => performance.getEntriesByType('navigation')[0]?.type) ?? null,
    }
  }

  /* ---------- Anything an extension adds to the page ---------- */

  const foreign = { nodes: [], attrs: [] }
  const seenNodes = new WeakSet()
  const seenAttrs = new Set()
  const ours = (el) => el === script || el.hasAttribute('data-site') || el.hasAttribute('data-probe') || !!el.closest('[data-probe]')
  const noteNode = (el, when) => {
    if (seenNodes.has(el) || foreign.nodes.length >= 40) return
    seenNodes.add(el)
    foreign.nodes.push({
      when,
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      cls: (el.getAttribute('class') || '').slice(0, 80) || null,
      attrs: el.getAttributeNames().slice(0, 12),
      src: (el.getAttribute('src') || el.getAttribute('href') || '').slice(0, 120) || null,
      shadow: !!el.shadowRoot,
      parent: describe(el.parentElement),
    })
  }
  const noteAttr = (el, name) => {
    const key = `${el.tagName.toLowerCase()}@${name}`
    if (seenAttrs.has(key) || foreign.attrs.length >= 30) return
    seenAttrs.add(key)
    foreign.attrs.push({ on: describe(el), name, value: (el.getAttribute(name) || '').slice(0, 60) })
  }
  const OWN_ATTRS = new Set(['lang', 'data-site', 'data-probe', 'class', 'open', 'style', 'value'])
  const scanForeign = (when) => {
    for (const root of [document.documentElement, document.head, document.body])
      for (const el of root.children) if (!ours(el)) noteNode(el, when)
    for (const el of [document.documentElement, document.body])
      for (const name of el.getAttributeNames()) if (!OWN_ATTRS.has(name)) noteAttr(el, name)
  }
  new MutationObserver((records) => {
    for (const m of records) {
      if (m.type === 'childList') {
        for (const n of m.addedNodes) if (n.nodeType === 1 && !ours(n)) noteNode(n, 'added')
      } else if (!OWN_ATTRS.has(m.attributeName) && !m.target.closest('[data-probe]')) {
        // Some agents label elements they plan to click; any attribute we didn't write is worth seeing.
        noteAttr(m.target, m.attributeName)
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true })

  /* ---------- Sending ---------- */

  let signals = null
  let lastSent = ''
  function send(kind) {
    const snapshot = JSON.stringify({ counters, inputTypes, fields: Object.keys(fields), foreign })
    if (kind === 'tick' && !events.length && snapshot === lastSent) return
    lastSent = snapshot
    const payload = {
      v: 1,
      kind,
      visitorId,
      pageId,
      run,
      page: location.pathname + location.search,
      t: now(),
      counters,
      inputTypes,
      fields: Object.fromEntries(Object.keys(fields).map((id) => [id, fieldSummary(id)])),
      foreign,
      events: events.splice(0),
    }
    if (kind === 'load') payload.signals = signals
    const body = JSON.stringify(payload)
    const url = collector + '/collect'
    if (!(navigator.sendBeacon && navigator.sendBeacon(url, body)))
      fetch(url, { method: 'POST', body, keepalive: true, credentials: 'omit' }).catch(() => {})
  }

  scanForeign('load')
  collectSignals().then((s) => {
    signals = s
    send('load')
  })
  setTimeout(() => {
    scanForeign('late')
    send('late')
  }, 3000)
  setInterval(() => send('tick'), 5000)
  addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') send('hide')
  })
  addEventListener('pagehide', () => send('hide'))
})()
