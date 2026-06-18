"use client"

import { useEffect, useRef, useState } from "react"
import { IconChevron, IconCheck } from "@/components/icons"

/** Dropdown customizado (sem <select> nativo) */
export function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  const current = options.find((o) => o.value === value)

  return (
    <div ref={ref} className="relative flex-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-1 rounded-full border-2 border-[var(--ink)] bg-white px-4 py-2.5 text-left transition-colors active:bg-[var(--accent)]"
      >
        <span className="flex min-w-0 flex-col leading-none">
          <span className="text-[9px] font-black uppercase tracking-wider text-[var(--ink)]/45">{label}</span>
          <span className="mt-0.5 truncate text-sm font-extrabold text-[var(--ink)]">{current?.label}</span>
        </span>
        <IconChevron className={`h-4 w-4 flex-shrink-0 text-[var(--ink)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="glow-pop absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-2xl border-2 border-[var(--ink)] bg-white shadow-[4px_4px_0_var(--ink)]">
          {options.map((o) => {
            const on = o.value === value
            return (
              <button
                key={o.value}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-bold transition-colors ${
                  on ? "bg-[var(--ink)] text-white" : "bg-white text-[var(--ink)] active:bg-[var(--accent)]"
                }`}
              >
                {o.label}
                {on && <IconCheck className="h-4 w-4" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
