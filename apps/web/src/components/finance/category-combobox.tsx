import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Plus } from '@/components/icons'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CategoryComboboxProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  categories: string[]
  onCreateCategory?: (name: string) => void
  allowCreate?: boolean
  placeholder?: string
  emptyMessage?: string
  accentColor: string
  error?: string
  required?: boolean
}

export function CategoryCombobox({
  value,
  onChange,
  onBlur,
  categories,
  onCreateCategory,
  allowCreate = true,
  placeholder = 'Select or type to create...',
  emptyMessage,
  accentColor,
  error,
  required = false,
}: CategoryComboboxProps) {
  const [inputValue, setInputValue] = useState(value)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectingRef = useRef(false)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const filtered = categories.filter((c) =>
    c.toLowerCase().includes(inputValue.toLowerCase()),
  )
  const exactMatch = categories.some((c) => c.toLowerCase() === inputValue.toLowerCase())
  const showCreate = allowCreate && inputValue.trim() !== '' && !exactMatch

  function commitValue(next: string) {
    setInputValue(next)
    onChange(next)
  }

  function select(name: string) {
    selectingRef.current = true
    commitValue(name)
    setOpen(false)
  }

  function handleCreateMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    const name = inputValue.trim()
    if (!name) return
    selectingRef.current = true
    onCreateCategory?.(name)
    commitValue(name)
    setOpen(false)
  }

  function handleInputChange(next: string) {
    setInputValue(next)
    setOpen(true)
    if (!allowCreate) onChange(next)
  }

  function handleBlur() {
    if (selectingRef.current) {
      selectingRef.current = false
      return
    }

    if (allowCreate) {
      const trimmed = inputValue.trim()
      if (trimmed) {
        const match = categories.find((c) => c.toLowerCase() === trimmed.toLowerCase())
        commitValue(match ?? trimmed)
      } else {
        setInputValue(value)
      }
    } else {
      const match = categories.find((c) => c.toLowerCase() === inputValue.toLowerCase())
      if (match) {
        commitValue(match)
      } else {
        setInputValue(value)
      }
    }

    onBlur?.()
  }

  return (
    <div ref={containerRef} className="relative">
      <Label>
        Category{' '}
        {!required && (
          <span className="normal-case font-normal opacity-50">(optional)</span>
        )}
      </Label>
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={error ? 'border-destructive/60 focus:border-destructive' : ''}
        />
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      {!error && emptyMessage && categories.length === 0 && (
        <p className="mt-1 text-xs text-muted-foreground">{emptyMessage}</p>
      )}
      <AnimatePresence>
        {open && (filtered.length > 0 || showCreate) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute top-full left-0 right-0 mt-1 z-20 max-h-48 overflow-y-auto rounded-xl bg-surface-overlay border border-border-subtle shadow-popup"
          >
            {filtered.map((c) => (
              <button
                key={c}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  select(c)
                }}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors duration-fast hover:bg-accent text-foreground"
              >
                {value.toLowerCase() === c.toLowerCase() ? (
                  <Check size={12} color={accentColor} />
                ) : (
                  <span className="w-3" />
                )}
                {c}
              </button>
            ))}
            {showCreate && (
              <button
                type="button"
                onMouseDown={handleCreateMouseDown}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors duration-fast hover:bg-accent${filtered.length > 0 ? ' border-t border-border' : ''}`}
                style={{ color: accentColor }}
              >
                <Plus size={12} />
                Create &ldquo;{inputValue.trim()}&rdquo;
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
