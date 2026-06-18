"use client"

import { useCart } from "@/components/cart-context"
import { money } from "@/lib/format"
import { IconCheck } from "@/components/icons"

export function CartToast({ onOpenBag }: { onOpenBag: () => void }) {
  const { toast, dismissToast } = useCart()
  if (!toast) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex justify-center px-5">
      <button
        onClick={() => {
          dismissToast()
          onOpenBag()
        }}
        className="glow-toast-in pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border-2 border-[var(--ink)] bg-white px-4 py-3 text-left shadow-[4px_4px_0_var(--ink)]"
      >
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--accent)] text-[var(--ink)]">
          <IconCheck className="h-5 w-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-sm font-extrabold text-[var(--ink)]">{toast.title}</span>
          <span className="text-[11px] font-bold text-[var(--ink)]/55">adicionado à sacola</span>
        </span>
        <span className="flex-shrink-0 rounded-full bg-[var(--ink)] px-3 py-1.5 text-sm font-black text-[var(--pink)]">
          R${money(toast.total)}
        </span>
      </button>
    </div>
  )
}
