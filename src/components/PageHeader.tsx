import type { ReactNode } from 'react'
import { DemoLabel } from './DemoLabel'

interface Props {
  eyebrow?: string
  title: string
  subtitle?: ReactNode
  /** Controls shown to the left of the demo label. */
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, subtitle, actions }: Props) {
  return (
    <header className="flex items-start gap-4">
      <div className="min-w-0 flex-1">
        {eyebrow && <div className="text-sm font-medium text-accent">{eyebrow}</div>}
        <h1 className="mt-0.5 text-[1.625rem] leading-tight font-semibold tracking-[-0.015em] text-ink">{title}</h1>
        {subtitle && <div className="mt-1 text-base text-muted">{subtitle}</div>}
      </div>
      {actions}
      <DemoLabel />
    </header>
  )
}
