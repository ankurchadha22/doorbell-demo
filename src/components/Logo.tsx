/** Doorbell mark: a doorbell button with two sound waves. */
export function Logo({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" className="fill-accent" />
      <rect x="9.5" y="6.5" width="9.5" height="19" rx="4.75" fill="#fff" />
      <circle cx="14.25" cy="18.5" r="2.8" className="fill-accent" />
      <circle cx="14.25" cy="11" r="1.1" className="fill-accent" />
      <path d="M22 12.75a4.75 4.75 0 0 1 0 6.5" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M24.75 10a8.6 8.6 0 0 1 0 12" fill="none" stroke="#9fd8c6" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}
