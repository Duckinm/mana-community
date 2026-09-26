import { motion } from 'framer-motion'

export function ContactStepDots({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <div className="mt-1.5 flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, index) => (
        <motion.div
          key={index}
          animate={{
            width: index === current ? 18 : 6,
            backgroundColor: index < current
              ? 'var(--success)'
              : index === current
                ? 'var(--primary)'
                : 'var(--border-strong)',
          }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="h-1.5 rounded-full"
        />
      ))}
      <span className="ml-2 text-xs font-medium text-caption">{label}</span>
    </div>
  )
}
