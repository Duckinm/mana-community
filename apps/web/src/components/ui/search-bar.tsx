"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "@/components/icons";
import { forwardRef, type Ref } from "react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  inputRef?: Ref<HTMLInputElement>;
}

export const SearchBar = forwardRef<HTMLDivElement, SearchBarProps>(
  function SearchBar(
    {
      value,
      onChange,
      placeholder = "Search…",
      className,
      inputClassName,
      inputRef,
    },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={cn(
          "flex h-9 items-center gap-2 rounded-lg border border-border-subtle bg-card px-3",
          className,
        )}
      >
        <Search
          size={13}
          strokeWidth={1.5}
          className="shrink-0 text-muted-foreground"
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground",
            inputClassName,
          )}
        />
        <AnimatePresence>
          {value && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.12 }}
              onClick={() => onChange("")}
              className="shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
            >
              <X size={12} strokeWidth={1.5} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    );
  },
);
