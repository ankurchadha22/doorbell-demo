import type { CSSProperties, ElementType, ReactNode } from 'react'

interface Props {
  /** Play the entrance now (with `delay`). When false the element is simply shown. */
  animate: boolean
  delay?: number
  as?: ElementType
  className?: string
  children: ReactNode
  variant?: 'enter' | 'pop'
}

/** Entrance wrapper driven by the step clock. Removing the animation shows the final state at once,
 *  which is how pressing → skips ahead. */
export function Enter({ animate, delay = 0, as: Tag = 'div', className = '', children, variant = 'enter' }: Props) {
  const style: CSSProperties | undefined = animate ? { animationDelay: `${delay}ms` } : undefined
  const anim = animate ? (variant === 'pop' ? 'animate-pop' : 'animate-enter') : ''
  return (
    <Tag className={`${anim} ${className}`} style={style}>
      {children}
    </Tag>
  )
}
