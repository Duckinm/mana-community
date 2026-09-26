import type { SVGProps } from 'react'
import { cn } from '@/lib/utils'

type ManaSparkleProps = SVGProps<SVGSVGElement> & {
  size?: number
}

export function ManaSparkle({ size = 24, className, ...props }: ManaSparkleProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden
      {...props}
    >
      <path
        d="M11.15 2.6c.5 3.63 1.5 6.1 3 7.6s3.97 2.5 7.6 3c-3.63.5-6.1 1.5-7.6 3s-2.5 3.97-3 7.6c-.5-3.63-1.5-6.1-3-7.6s-3.97-2.5-7.6-3c3.63-.5 6.1-1.5 7.6-3s2.5-3.97 3-7.6Z"
        fill="currentColor"
      />
      <path
        d="M19.3 1.7v2.6M18 3h2.6"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <path
        d="M4.3 18.4v2.2M3.2 19.5h2.2"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </svg>
  )
}
