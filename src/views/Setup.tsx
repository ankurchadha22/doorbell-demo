import { Check, Copy, Radar } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { product, roadmap } from '../data/config'
import { setupFlow } from '../data/setup'
import { acts } from '../data/story'

export function Setup() {
  const [copied, setCopied] = useState(false)
  const tag = setupFlow.steps[0].code ?? ''
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tag)
      setCopied(true)
    } catch {
      // Clipboard can be unavailable (permissions, insecure context). The code stays visible to copy by hand.
    }
  }

  return (
    <div className="scroll-quiet h-full overflow-y-auto px-6 pt-5 pb-6">
      <PageHeader eyebrow={acts[3]} title={setupFlow.heading} subtitle="One line of code, then approve what agents may be told." />

      <div className="mt-6 grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6">
        <ol>
          {setupFlow.steps.map((s, i) => (
            <li key={s.id} className="relative grid grid-cols-[2.25rem_1fr] gap-4 pb-4">
              {i < setupFlow.steps.length - 1 && (
                <span aria-hidden className="absolute top-9 bottom-0 left-[1.125rem] w-px -translate-x-1/2 bg-accent/35" />
              )}
              <span className="grid size-9 place-items-center rounded-full bg-accent text-white">
                <Check aria-hidden className="size-4.5" strokeWidth={3} />
                <span className="sr-only">Done:</span>
              </span>
              <div className="rounded-2xl border border-line bg-surface p-4">
                <h2 className="font-semibold text-ink">
                  {i + 1}. {s.title}
                </h2>
                <p className="text-[0.9375rem] text-muted">{s.detail}</p>
                {s.code && (
                  <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-[#1d2623] p-2.5">
                    <code className="min-w-0 flex-1 font-mono text-[0.8125rem] leading-relaxed break-all text-[#c9d4d0]">{s.code}</code>
                    <button
                      type="button"
                      onClick={copy}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/20 px-2 py-1 text-sm font-medium text-white/90 hover:bg-white/10"
                    >
                      {copied ? <Check aria-hidden className="size-3.5" /> : <Copy aria-hidden className="size-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}
                {s.items && (
                  <ul className="mt-2.5 flex flex-wrap gap-2">
                    {s.items.map((f) => (
                      <li key={f} className="inline-flex items-center gap-1.5 rounded-lg bg-accent-soft px-2.5 py-1 text-[0.9375rem] font-medium text-accent-strong">
                        <Check aria-hidden className="size-4" />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
                {s.value && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-accent-soft px-2.5 py-1 text-[0.9375rem] font-medium text-accent-strong">
                    <Check aria-hidden className="size-4" />
                    {s.value}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-ink p-5 text-white">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Radar aria-hidden className="size-5 text-accent-soft" />
              {product.name} is live on
            </div>
            <code className="mt-2 inline-block rounded-lg bg-white/10 px-3 py-1.5 font-mono text-lg text-accent-soft">{setupFlow.liveOn}</code>
            <p className="mt-2 text-[0.9375rem] text-white/70">
              The facts panel and ask box appear on your pages, and every AI agent visit shows up in your dashboard.
            </p>
          </div>

          <section aria-label="Roadmap" className="rounded-2xl border border-line bg-surface p-4">
            <h2 className="font-semibold text-ink">Where it goes next</h2>
            <ol className="mt-3 space-y-3">
              {roadmap.map((r, i) => (
                <li key={r.id} className="grid grid-cols-[4rem_1fr] gap-3">
                  <span
                    className={`h-fit rounded-md px-2 py-0.5 text-center text-sm font-semibold ${
                      i === 0 ? 'bg-accent text-white' : 'bg-sunken text-ink-2'
                    }`}
                  >
                    {r.when}
                  </span>
                  <div>
                    <div className="font-semibold text-ink">{r.name}</div>
                    <p className="text-[0.9375rem] leading-snug text-ink-2">{r.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-sm text-muted">Your approved facts and rules carry over to both, so you don't start over.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
