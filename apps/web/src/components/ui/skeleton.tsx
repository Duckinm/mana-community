import { cn } from '@/lib/utils'

/**
 * Base skeleton block — uses `@keyframes shimmer` from `src/styles/animations.css`.
 * Adapts to both dark and light themes via CSS vars.
 */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
 return (
 <div
 className={cn('rounded-lg', className)}
 style={{
 background:
 'linear-gradient(90deg, var(--surface-raised) 25%, var(--border-strong) 50%, var(--surface-raised) 75%)',
 backgroundSize: '200% 100%',
 animation: 'shimmer 1.8s ease-in-out infinite',
 ...style,
 }}
 />
 )
}
