"use client"

import { useState } from "react"
import type { Product } from "@/lib/types"
import { SORTS } from "@/lib/data"
import { useCart } from "@/components/cart-context"
import { useProductSearch } from "@/lib/use-product-search"
import { ProductRow } from "@/components/product-row"
import { Dropdown } from "@/components/dropdown"
import { IconSliders, IconSearch, IconClose } from "@/components/icons"

export function ExploreView({
  products,
  onSelect,
}: {
  products: Product[]
  onSelect: (p: Product) => void
}) {
  const { addedMap, addToCart } = useCart()

  const brands = ["Todas", ...Array.from(new Set(products.map((p) => p.brand)))]
  const lines = ["Todas", ...Array.from(new Set(products.map((p) => p.cat)))]
  const allTags = Array.from(new Set(products.flatMap((p) => p.tags ?? [])))
  const minPrice = Math.min(...products.map((p) => p.price))
  const maxPrice = Math.max(...products.map((p) => p.price))

  const [query, setQuery] = useState("")
  const [brand, setBrand] = useState("Todas")
  const [line, setLine] = useState("Todas")
  const [sort, setSort] = useState("relevance")
  const [maxRange, setMaxRange] = useState(maxPrice)
  const [activeTags, setActiveTags] = useState<string[]>([])

  // Base = busca real no banco pelo termo digitado (fallback = catálogo do RSC).
  const { results: base, loading } = useProductSearch({ query }, products)

  function toggleTag(t: string) {
    setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }
  function reset() {
    setBrand("Todas")
    setLine("Todas")
    setSort("relevance")
    setMaxRange(maxPrice)
    setActiveTags([])
  }

  const filtered = base
    .filter((p) => (brand === "Todas" ? true : p.brand === brand))
    .filter((p) => (line === "Todas" ? true : p.cat === line))
    .filter((p) => p.price <= maxRange)
    .filter((p) => (activeTags.length ? activeTags.every((t) => p.tags?.includes(t)) : true))

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "price-desc") return b.price - a.price
    if (sort === "price-asc") return a.price - b.price
    if (sort === "name") return a.title.localeCompare(b.title)
    return 0
  })

  const activeCount =
    (brand !== "Todas" ? 1 : 0) + (line !== "Todas" ? 1 : 0) + (maxRange < maxPrice ? 1 : 0) + activeTags.length

  return (
    <div className="px-5 pt-5 lg:px-8 lg:pt-8">
      <div className="flex items-center justify-between">
        <h2 className="glow-serif text-3xl font-black text-[var(--ink)] lg:text-4xl">Explorar</h2>
        <span className="flex items-center gap-1.5 rounded-full border-2 border-[var(--ink)] bg-white px-3 py-1.5 text-xs font-black text-[var(--ink)]">
          <IconSliders className="h-4 w-4" />
          {activeCount > 0 ? `${activeCount} filtro${activeCount > 1 ? "s" : ""}` : "filtros"}
        </span>
      </div>

      <div className="lg:mt-6 lg:grid lg:grid-cols-[300px_1fr] lg:items-start lg:gap-8">
        {/* Coluna de filtros (vira barra lateral no desktop) */}
        <div className="lg:sticky lg:top-6">
      {/* Busca no banco */}
      <div className="mt-4 flex items-center gap-2 rounded-full border-2 border-[var(--ink)] bg-white px-4 py-3 lg:mt-0">
        <IconSearch className="h-5 w-5 flex-shrink-0 text-[var(--ink)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, marca…"
          className="w-full bg-transparent text-sm font-semibold text-[var(--ink)] placeholder:text-[var(--ink)]/40 focus:outline-none"
        />
        {loading && (
          <span className="glow-spin h-4 w-4 flex-shrink-0 rounded-full border-2 border-[var(--ink)]/30 border-t-[var(--pink)]" />
        )}
        {query && !loading && (
          <button aria-label="Limpar busca" onClick={() => setQuery("")} className="text-[var(--ink)]/50 active:scale-90">
            <IconClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <Dropdown label="Marca" value={brand} options={brands.map((b) => ({ value: b, label: b }))} onChange={setBrand} />
        <Dropdown label="Linha" value={line} options={lines.map((l) => ({ value: l, label: l }))} onChange={setLine} />
      </div>
      <div className="mt-2 flex gap-2">
        <Dropdown label="Ordenar por" value={sort} options={SORTS} onChange={setSort} />
      </div>

      {/* Range de preço */}
      <div className="mt-4 rounded-2xl border-2 border-[var(--ink)] bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--ink)]/45">Preço até</span>
          <span className="text-sm font-black text-[var(--ink)]">R${maxRange}</span>
        </div>
        <input
          type="range"
          min={minPrice}
          max={maxPrice}
          value={maxRange}
          onChange={(e) => setMaxRange(Number(e.target.value))}
          className="glow-range mt-2 w-full"
          aria-label="Preço máximo"
        />
        <div className="mt-1 flex justify-between text-[10px] font-bold text-[var(--ink)]/40">
          <span>R${minPrice}</span>
          <span>R${maxPrice}</span>
        </div>
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {allTags.map((t) => {
            const on = activeTags.includes(t)
            return (
              <button
                key={t}
                onClick={() => toggleTag(t)}
                className={`rounded-full border-2 border-[var(--ink)] px-3 py-1.5 text-xs font-bold transition-colors ${
                  on ? "bg-[var(--pink)] text-white" : "bg-white text-[var(--ink)]"
                }`}
              >
                {t}
              </button>
            )
          })}
        </div>
      )}

        </div>

        {/* Coluna de resultados */}
        <div>
      {/* Resultado */}
      <div className="mt-5 flex items-center justify-between lg:mt-0">
        <p className="text-xs font-black uppercase tracking-wide text-[var(--ink)]/55">
          {sorted.length} produto{sorted.length !== 1 ? "s" : ""}
        </p>
        {activeCount > 0 && (
          <button
            onClick={reset}
            className="text-xs font-black uppercase tracking-wide text-[var(--pink)] underline decoration-2 underline-offset-4"
          >
            limpar filtros
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
        {sorted.length === 0 ? (
          <div className="col-span-full flex flex-col items-center gap-2 rounded-[1.5rem] border-2 border-dashed border-[var(--ink)]/30 bg-white px-6 py-12 text-center">
            <p className="glow-serif text-xl font-black text-[var(--ink)]">Nada por aqui</p>
            <p className="text-sm font-medium text-[var(--ink)]/55">Tente ajustar os filtros.</p>
          </div>
        ) : (
          sorted.map((p) => <ProductRow key={p.id} p={p} added={!!addedMap[p.id]} onSelect={onSelect} onAdd={addToCart} />)
        )}
      </div>
        </div>
      </div>
    </div>
  )
}
