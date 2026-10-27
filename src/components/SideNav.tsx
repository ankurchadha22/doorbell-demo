import { Bot, ChartColumn, LayoutDashboard, Presentation, Settings2, ShieldCheck, Flag } from 'lucide-react'
import { NavLink } from 'react-router'
import { product, vendor } from '../data/config'
import { routes } from '../data/story'
import { Logo } from './Logo'

const item = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.9375rem] font-medium transition-colors ${
    isActive ? 'bg-accent-soft text-accent-strong' : 'text-ink-2 hover:bg-sunken hover:text-ink'
  }`

const icon = 'size-[1.125rem] shrink-0'

export function SideNav() {
  return (
    <nav aria-label="Screens" className="flex h-full flex-col border-r border-line bg-surface px-3 py-4">
      <div className="flex items-center gap-2.5 px-1.5">
        <Logo />
        <div className="leading-tight">
          <div className="font-semibold tracking-tight">{product.name}</div>
          <div className="text-sm text-muted">{vendor.name}'s workspace</div>
        </div>
      </div>

      <div className="mt-7 px-2.5 text-sm font-medium text-muted">Buyer side</div>
      <ul className="mt-1.5 space-y-0.5">
        <li>
          <NavLink to={routes.buyer} className={item}>
            <Bot aria-hidden className={icon} />
            Buyer view
          </NavLink>
        </li>
      </ul>
      <p className="mt-1 px-2.5 text-sm leading-snug text-muted">The buyer's AI browser agent</p>

      <div className="mt-6 px-2.5 text-sm font-medium text-muted">Seller side</div>
      <ul className="mt-1.5 space-y-0.5">
        <li>
          <NavLink to={routes.seller} className={item}>
            <LayoutDashboard aria-hidden className={icon} />
            Seller view
          </NavLink>
        </li>
        <li>
          <NavLink to={routes.insights} className={item}>
            <ChartColumn aria-hidden className={icon} />
            Weekly report
          </NavLink>
        </li>
        <li>
          <NavLink to={routes.policies} className={item}>
            <ShieldCheck aria-hidden className={icon} />
            Rules
          </NavLink>
        </li>
        <li>
          <NavLink to={routes.setup} className={item}>
            <Settings2 aria-hidden className={icon} />
            Setup
          </NavLink>
        </li>
      </ul>

      <ul className="mt-auto space-y-0.5 border-t border-line pt-3">
        <li>
          <NavLink to={routes.title} end className={item}>
            <Presentation aria-hidden className={icon} />
            Title
          </NavLink>
        </li>
        <li>
          <NavLink to={routes.closing} className={item}>
            <Flag aria-hidden className={icon} />
            Closing
          </NavLink>
        </li>
      </ul>
    </nav>
  )
}
