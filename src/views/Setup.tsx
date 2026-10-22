import { Check, Copy, FileText, Plug } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { setupFlow } from '../data/setup'
import { acts } from '../data/story'

export function Setup() {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(setupFlow.liveAt)
      setCopied(true)
    } catch {
      // Clipboard can be unavailable (permissions, insecure context). The address stays visible to copy by hand.
    }
  }

  return (
    <div className="scroll-quiet h-full overflow-y-auto px-6 pt-5 pb-6">
      <PageHeader eyebrow={acts[3]} title={setupFlow.heading} subtitle="Four steps from your existing content to a live desk." />

      <ol className="mt-6 max-w-[54rem]">
        {setupFlow.steps.map((s, i) => (
          <li key={s.id} className="relative grid grid-cols-[2.25rem_1fr] gap-4 pb-5">
            {i < setupFlow.steps.length && (
              <span aria-hidden className="absolute top-9 bottom-0 left-[1.125rem] w-px -translate-x-1/2 bg-accent/35" />
            )}
            <span className="grid size-9 place-items-center rounded-full bg-accent text-white">
              <Check aria-hidden className="size-4.5" strokeWidth={3} />
              <span className="sr-only">Done:</span>
            </span>
            <div className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h2 className="font-semibold text-ink">
                  {i + 1}. {s.title}
                </h2>
                <span className="text-[0.9375rem] text-muted">{s.detail}</span>
              </div>
              {s.id === 'url' && (
                <div className="mt-2.5 flex max-w-md items-center rounded-lg border border-line-strong bg-sunken px-3 py-1.5 font-mono text-[0.9375rem] text-ink">
                  {s.value}
                </div>
              )}
              {s.files && (
                <ul className="mt-2.5 flex flex-wrap gap-2">
                  {s.files.map((f) => (
                    <li key={f} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-sunken px-2.5 py-1 text-[0.9375rem] text-ink-2">
                      <FileText aria-hidden className="size-4 text-muted" />
                      {f}
                    </li>
                  ))}
                </ul>
              )}
              {(s.id === 'crm' || s.id === 'policies') && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-accent-soft px-2.5 py-1 text-[0.9375rem] font-medium text-accent-strong">
                  <Check aria-hidden className="size-4" />
                  {s.value}
                </div>
              )}
            </div>
          </li>
        ))}

        <li className="grid grid-cols-[2.25rem_1fr] gap-4">
          <span className="grid size-9 place-items-center rounded-full bg-ink text-white">
            <Plug aria-hidden className="size-4.5" />
          </span>
          <div className="rounded-2xl bg-ink p-5 text-white">
            <div className="text-lg font-semibold">Your AI desk is live at</div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <code className="rounded-lg bg-white/10 px-3 py-1.5 font-mono text-lg text-accent-soft">{setupFlow.liveAt}</code>
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 px-3 py-1.5 text-[0.9375rem] font-medium hover:bg-white/10"
              >
                {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
                {copied ? 'Copied' : 'Copy address'}
              </button>
            </div>
            <p className="mt-2 text-[0.9375rem] text-white/70">
              Your AI-readable pages and quote form go live on your own site at the same time.
            </p>
          </div>
        </li>
      </ol>
    </div>
  )
}
