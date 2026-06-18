"use client"

import { useCart } from "@/components/cart-context"
import { IconBag } from "@/components/icons"

export function SiteHeader({ onOpenBag }: { onOpenBag: () => void }) {
  const { count } = useCart()

  return (
    <header className="flex items-center justify-between px-5 pt-7 pb-4">
      <div className="leading-none">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--ink)]/60">produtos de beleza</p>
        <h1 className="glow-serif text-[26px] font-black tracking-tight">Vanira Batista</h1>
      </div>
      <button
        aria-label="Abrir sacola"
        onClick={onOpenBag}
        className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--ink)] text-[var(--pink)] transition-transform active:scale-95"
      >
        <IconBag className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-black text-[var(--ink)] ring-4 ring-[var(--pink)]">
            {count}
          </span>
        )}
      </button>
    </header>
  )
}
