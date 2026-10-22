import { Check, Mail } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { buyer, vendor } from '../data/config'

interface Props {
  open: boolean
  /** Shows the Share button as pressed, just before the dialog closes. */
  confirmed: boolean
  onShare: () => void
  onNotNow: () => void
}

/** The identity moment: the buyer approves sharing a work email with one vendor.
 *  Shown inline at the end of the chat, the way agent apps ask for permission. */
export function ConsentDialog({ open, confirmed, onShare, onNotNow }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-labelledby="consent-title"
          aria-describedby="consent-body"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10, transition: { duration: 0.18 } }}
          transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
          className="ml-11 rounded-2xl border-2 border-accent/40 bg-surface p-4 shadow-[0_14px_40px_-16px_rgba(22,32,29,0.35)]"
        >
          <div className="flex items-start gap-3">
            <div aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-strong">
              <Mail className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="consent-title" className="text-lg font-semibold text-ink">
                Share your work email?
              </h2>
              <p id="consent-body" className="mt-0.5 text-md text-ink-2">
                Share <span className="font-semibold text-ink">{buyer.email}</span> with {vendor.name} to receive a quote?
              </p>
              <p className="mt-1 text-sm text-muted">
                Only {vendor.name} receives it. Your agent uses it to fill in {vendor.name}'s quote form.
              </p>
            </div>
          </div>
          <div className="mt-3.5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onNotNow}
              disabled={confirmed}
              className="h-10 rounded-lg border border-line-strong px-4 font-medium text-ink-2 hover:bg-sunken disabled:opacity-50"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={onShare}
              disabled={confirmed}
              className={`inline-flex h-10 items-center gap-1.5 rounded-lg px-5 font-semibold text-white transition-colors ${
                confirmed ? 'bg-accent-strong' : 'bg-accent hover:bg-accent-strong'
              }`}
            >
              {confirmed && <Check aria-hidden className="size-4.5" strokeWidth={2.75} />}
              {confirmed ? 'Shared' : 'Share'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
