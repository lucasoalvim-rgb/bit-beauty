"use client"

import { useEffect, useRef, useState } from "react"
import type { Product } from "@/lib/types"
import { useCart } from "@/components/cart-context"
import { useProductSearch } from "@/lib/use-product-search"
import { ProductRow } from "@/components/product-row"
import { IconSearch, IconBack, IconClose } from "@/components/icons"

export function SearchOverlay({
  open,
  products,
  onClose,
  onSelect,
}: {
  open: boolean
  products: Product[]
  onClose: () => void
  onSelect: (p: Product) => void
}) {
  const { addedMap, addToCart } = useCart()
  const [q, setQ] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Mantém o onClose mais recente sem recriar o efeito de history (evita que
  // um re-render do pai dispare history.back() e feche o overlay).
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Busca real no banco (debounce + SWR). Sem termo → sugestões (catálogo).
  const { results, loading } = useProductSearch({ query: q }, products)

  useEffect(() => {
    if (!open) return
    setQ("")
    const t = setTimeout(() => inputRef.current?.focus(), 280)
    window.history.pushState({ glowSearch: true }, "")
    const onPop = () => onCloseRef.current()
    window.addEventListener("popstate", onPop)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      clearTimeout(t)
      window.removeEventListener("popstate", onPop)
      document.body.style.overflow = prev
      if (window.history.state?.glowSearch) window.history.back()
    }
  }, [open])

  if (!open) return null

  const term = q.trim()

  return (
    <div className="glow-search-in fixed inset-x-0 top-0 z-[60] flex h-[100dvh] flex-col bg-[var(--pink)]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-hidden lg:max-w-3xl">
        <div className="flex items-center gap-2 px-5 pt-7 pb-4 lg:px-8">
          <button
            aria-label="Fechar busca"
            onClick={onClose}
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--ink)] bg-white text-[var(--ink)] transition-transform active:scale-90"
          >
            <IconBack className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center gap-2 rounded-full border-2 border-[var(--ink)] bg-white px-4 py-3">
            <IconSearch className="h-5 w-5 text-[var(--ink)]" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="batom, sérum, perfume…"
              className="w-full bg-transparent text-sm font-semibold text-[var(--ink)] placeholder:text-[var(--ink)]/40 focus:outline-none"
            />
            {q && (
              <button aria-label="Limpar" onClick={() => setQ("")} className="text-[var(--ink)]/50 active:scale-90">
                <IconClose className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto rounded-t-[2.5rem] border-t-2 border-[var(--ink)] bg-white px-5 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:px-8">
          <p className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[var(--ink)]/55">
            {term
              ? `${results.length} resultado${results.length !== 1 ? "s" : ""} para “${q}”`
              : "Sugestões pra você"}
            {loading && <span className="glow-spin h-3 w-3 rounded-full border-2 border-[var(--ink)]/30 border-t-[var(--pink)]" />}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {results.length === 0 && !loading ? (
              <div className="col-span-full flex flex-col items-center gap-2 px-6 py-12 text-center">
                <p className="glow-serif text-xl font-black text-[var(--ink)]">Nada encontrado</p>
                <p className="text-sm font-medium text-[var(--ink)]/55">Tente outra palavra.</p>
              </div>
            ) : (
              results.map((p) => (
                <ProductRow key={p.id} p={p} added={!!addedMap[p.id]} onSelect={onSelect} onAdd={addToCart} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
