import { Bot, Building2, Globe, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { DemoLabel } from '../components/DemoLabel'
import { Logo } from '../components/Logo'
import { product } from '../data/config'
import { routes } from '../data/story'

const explore = [
  { to: routes.buyer, label: 'Buyer view' },
  { to: routes.seller, label: 'Seller view' },
  { to: routes.insights, label: 'Weekly report' },
  { to: routes.policies, label: 'Rules' },
  { to: routes.setup, label: 'Setup' },
]

export function Title() {
  const [lead, rest] = product.headline.split(': ')
  return (
    <div className="relative flex h-full flex-col overflow-y-auto bg-paper px-[6vw] py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo className="size-8" />
          <span className="text-lg font-semibold tracking-tight">{product.name}</span>
        </div>
        <DemoLabel />
      </div>

      <div className="my-auto max-w-[68rem] py-10">
        <h1 className="text-[clamp(2.75rem,5.4vw,5.25rem)] leading-[1.02] font-bold tracking-[-0.035em] text-ink">
          {lead}:
          <br />
          {rest}
        </h1>
        <p className="mt-6 max-w-[44rem] text-[1.375rem] leading-snug text-ink-2">{product.subtitle}</p>

        {/* The flow in one line: buyer's agent, the vendor's site with Doorbell, the sales team. */}
        <div className="mt-12 flex max-w-[60rem] items-center" aria-label="How it works">
          <FlowNode icon={<Bot className="size-5" />} label="Buyer's AI agent" />
          <FlowLine />
          <FlowNode icon={<Globe className="size-5" />} label="Your website" />
          <FlowLine />
          <FlowNode icon={<Logo className="size-5" />} label={product.name} strong />
          <FlowLine />
          <FlowNode icon={<Users className="size-5" />} label="Your sales team" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-base text-muted">
        <span>
          Press <kbd className="rounded border border-line-strong bg-surface px-1.5 py-0.5 font-mono text-sm text-ink">→</kbd> to start
        </span>
        <span className="flex flex-wrap items-center gap-x-1 gap-y-1">
          <span className="mr-1">Or open a screen:</span>
          {explore.map((e) => (
            <Link
              key={e.to}
              to={e.to}
              className="rounded-md px-2 py-1 font-medium text-accent-strong underline-offset-4 hover:bg-accent-soft hover:underline"
            >
              {e.label}
            </Link>
          ))}
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          <Building2 aria-hidden className="size-4" />
          Everyone in this demo is fictional.
        </span>
      </div>
    </div>
  )
}

function FlowNode({ icon, label, strong }: { icon: ReactNode; label: string; strong?: boolean }) {
  return (
    <div
      className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-base font-semibold ${
        strong ? 'border-accent bg-accent text-white' : 'border-line-strong bg-surface text-ink-2'
      }`}
    >
      <span aria-hidden className={strong ? '' : 'text-muted'}>
        {icon}
      </span>
      {label}
    </div>
  )
}

function FlowLine() {
  return (
    <div aria-hidden className="relative mx-2 h-px flex-1 bg-line-strong">
      <span className="absolute top-1/2 right-0 size-2 translate-x-1/2 -translate-y-1/2 rotate-45 border-t border-r border-line-strong" />
    </div>
  )
}
