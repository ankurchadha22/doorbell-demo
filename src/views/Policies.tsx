import { FileLock2, ListChecks, Tag, UserRoundCog } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { PageHeader } from '../components/PageHeader'
import { alwaysEscalate, answerRules, gatedDocs, priceBands } from '../data/policies'
import { acts } from '../data/story'

export function Policies() {
  return (
    <div className="scroll-quiet h-full overflow-y-auto px-6 pt-5 pb-6">
      <PageHeader
        eyebrow={acts[3]}
        title="What the desk may do on its own"
        subtitle="Anything outside these rules goes to a person on your team."
      />

      <div className="mt-5 grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-4">
        <Section icon={<Tag className="size-4.5" />} title="Price bands per plan">
          <table className="w-full text-left">
            <thead className="text-sm text-muted">
              <tr className="border-b border-line">
                <th scope="col" className="py-1.5 pr-3 font-medium">Plan</th>
                <th scope="col" className="py-1.5 pr-3 font-medium">List price</th>
                <th scope="col" className="py-1.5 pr-3 font-medium">May quote</th>
                <th scope="col" className="py-1.5 font-medium">Auto-approve</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {priceBands.map((b) => (
                <tr key={b.plan}>
                  <th scope="row" className="py-2 pr-3 align-top font-semibold text-ink">{b.plan}</th>
                  <td className="tnum py-2 pr-3 align-top text-[0.9375rem] text-ink">{b.list}</td>
                  <td className="py-2 pr-3 align-top text-[0.9375rem] text-ink-2">{b.mayQuote}</td>
                  <td className="py-2 align-top text-[0.9375rem] text-ink-2">{b.autoApprove}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section icon={<FileLock2 className="size-4.5" />} title="Gated documents">
          <ul className="divide-y divide-line">
            {gatedDocs.map((d) => (
              <li key={d.doc} className="flex items-baseline gap-3 py-2 first:pt-0">
                <span className="min-w-0 flex-1 font-medium text-ink">{d.doc}</span>
                <span className={`text-[0.9375rem] ${d.open ? 'text-muted' : 'font-medium text-ink-2'}`}>{d.requirement}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={<UserRoundCog className="size-4.5" />} title="Always escalate to a human">
          <ul className="space-y-2">
            {alwaysEscalate.map((r) => (
              <li key={r} className="flex items-start gap-2.5 text-ink">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-esc" />
                {r}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">
            The desk tells the agent it can't approve the request, names the rep, and says when they'll reply.
          </p>
        </Section>

        <Section icon={<ListChecks className="size-4.5" />} title="Answer rules">
          <ul className="space-y-2">
            {answerRules.map((r) => (
              <RuleSwitch key={r} label={r} />
            ))}
          </ul>
        </Section>
      </div>
    </div>
  )
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink">
        <span aria-hidden className="text-muted">
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function RuleSwitch({ label }: { label: string }) {
  const [on, setOn] = useState(true)
  return (
    <li className="flex items-center gap-3">
      <span className="min-w-0 flex-1 text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => setOn((v) => !v)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-line-strong'}`}
      >
        <span
          aria-hidden
          className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`}
        />
      </button>
    </li>
  )
}
