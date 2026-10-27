import { Bell, X } from 'lucide-react'
import { repAlert } from '../data/sellerEvents'
import { Logo } from './Logo'

/** A generic team-chat notification. Deliberately unbranded. */
export function AlertCard({ onClose }: { onClose?: () => void }) {
  return (
    <article
      aria-label="Rep alert in team chat"
      className="w-full rounded-2xl border border-line-strong bg-surface p-4 shadow-[0_18px_50px_-14px_rgba(22,32,29,0.4)]"
    >
      <div className="flex items-center gap-2 text-sm text-muted">
        <Bell aria-hidden className="size-4" />
        <span className="whitespace-nowrap">{repAlert.worksWith}</span>
        <span aria-hidden>/</span>
        <span className="font-medium whitespace-nowrap text-ink-2"># {repAlert.channel}</span>
        <span className="ml-auto tnum">{repAlert.time}</span>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close alert" className="-mr-1 rounded p-0.5 text-muted hover:bg-sunken hover:text-ink">
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>
      <div className="mt-2.5 flex gap-3">
        <Logo className="size-8 shrink-0" />
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-ink">{repAlert.from}</span>
            <span className="text-sm text-muted">to {repAlert.to}</span>
          </div>
          <p className="mt-1 text-md leading-relaxed text-ink">{repAlert.text}</p>
          <span className="mt-2 inline-block rounded-lg border border-line-strong px-3 py-1 text-[0.9375rem] font-semibold text-accent-strong">
            {repAlert.cta}
          </span>
        </div>
      </div>
    </article>
  )
}
