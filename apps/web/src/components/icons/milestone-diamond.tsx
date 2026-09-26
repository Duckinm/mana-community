import type { SVGProps } from 'react'
import { cn } from '@/lib/utils'

type MilestoneDiamondProps = SVGProps<SVGSVGElement> & {
  size?: number
  strokeWidth?: number
}

export function MilestoneDiamond({
  size = 24,
  className,
  strokeWidth = 2,
  ...props
}: MilestoneDiamondProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
      aria-hidden
      {...props}
    >
      <path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z" />
    </svg>
  )
}
