import { CircleCheck, Database, RefreshCw, X } from 'lucide-react'
import { crmRecord } from '../data/sellerEvents'

interface Props {
  activities: string[]
  onClose?: () => void
}

/** A generic CRM record preview. No vendor branding; the CRMs are named in text only. */
export function CrmCard({ activities, onClose }: Props) {
  return (
    <article
      aria-label="CRM record"
      className="flex h-full flex-col rounded-2xl border border-line-strong bg-surface p-4 shadow-[0_18px_50px_-14px_rgba(22,32,29,0.4)]"
    >
      <div className="flex items-center gap-2">
        <Database aria-hidden className="size-4.5 text-ink-2" />
        <h2 className="font-semibold text-ink">{crmRecord.heading}</h2>
        <span className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-accent">
          <RefreshCw aria-hidden className="size-3.5" />
          Just now
        </span>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close CRM record" className="-mr-1 rounded p-0.5 text-muted hover:bg-sunken hover:text-ink">
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>
      <p className="mt-0.5 text-sm text-muted">{crmRecord.worksWith}</p>

      <dl className="mt-3 divide-y divide-line rounded-xl border border-line">
        {crmRecord.fields.map((f) => (
          <div key={f.label} className="grid grid-cols-[6.5rem_1fr] gap-2 px-3 py-1.5">
            <dt className="text-sm text-muted">{f.label}</dt>
            <dd className="tnum text-[0.9375rem] font-medium text-ink">{f.value}</dd>
          </div>
        ))}
      </dl>

      <h3 className="mt-3 text-sm font-medium text-muted">Activity logged</h3>
      <ul className="mt-1 space-y-1">
        {activities.map((a) => (
          <li key={a} className="flex items-start gap-2 text-[0.9375rem] text-ink-2">
            <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
            {a}
          </li>
        ))}
      </ul>
    </article>
  )
}
