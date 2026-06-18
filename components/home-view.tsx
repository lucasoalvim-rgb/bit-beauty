"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Product } from "@/lib/types"
import { IMAGES } from "@/lib/data"
import { useCart } from "@/components/cart-context"
import { useProductSearch } from "@/lib/use-product-search"
import { ProductRow } from "@/components/product-row"
import { IconSearch, IconArrow } from "@/components/icons"

const TILTS = ["-2.5deg", "2deg", "-1.5deg"]

export function HomeView({
  products,
  categories,
  onOpenSearch,
  onSelect,
  onSeeAll,
}: {
  products: Product[]
  categories: string[]
  onOpenSearch: () => void
  onSelect: (p: Product) => void
  onSeeAll: () => void
}) {
  const { addedMap, addToCart } = useCart()
  const [active, setActive] = useState("Tudo")

  // Filtro por categoria → busca real no banco (fallback = catálogo do RSC).
  const { results: amados, loading: amadosLoading } = useProductSearch({ category: active }, products)

  // "Em alta": três primeiros produtos com estoque disponível.
  const spotlights = useMemo(
    () => products.filter((p) => p.stock > 0).slice(0, 3),
    [products],
  )

  // Indicação do hero: produto aleatório com estoque. Para evitar mismatch de
  // hidratação (server x client), o 1º render usa um item estável (primeiro com
  // estoque) e o aleatório é sorteado só após montar no cliente.
  const pool = useMemo(() => products.filter((p) => p.stock > 0), [products])
  const [featuredIdx, setFeaturedIdx] = useState(0)
  useEffect(() => {
    if (pool.length > 1) setFeaturedIdx(Math.floor(Math.random() * pool.length))
  }, [pool])
  const featured = pool[featuredIdx] ?? pool[0] ?? null

  // Navega até a seção "Mais amados" já filtrada pela categoria escolhida.
  const amadosRef = useRef<HTMLElement>(null)
  const goToCategory = useCallback((cat: string) => {
    setActive(cat)
    amadosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  // Itens do marquee gerados a partir do catálogo (banco): promoções por
  // quantidade, menor preço por categoria e o achadinho mais barato. Cada item
  // dinâmico é clicável e leva ao produto ou à categoria correspondente.
  const marqueeItems = useMemo(() => {
    type Item = { text: string; onClick?: () => void }
    const inStock = products.filter((p) => p.stock > 0)
    const dynamic: Item[] = []

    // "Leve X, pague menos" — promoção por quantidade.
    for (const p of inStock) {
      if (p.bulkMinQty && p.bulkMinQty >= 2 && p.bulkUnitPrice && p.bulkUnitPrice > 0) {
        dynamic.push({
          text: `LEVE ${p.bulkMinQty} ${p.brand.toUpperCase()} POR R$${Math.round(p.bulkUnitPrice * p.bulkMinQty)}`,
          onClick: () => onSelect(p),
        })
      }
    }

    // "A partir de R$X" — menor preço de cada categoria.
    const minByCat = new Map<string, number>()
    for (const p of inStock) {
      const cur = minByCat.get(p.cat)
      if (cur == null || p.price < cur) minByCat.set(p.cat, p.price)
    }
    for (const [cat, min] of minByCat) {
      if (cat === "Outros") continue
      dynamic.push({
        text: `${cat.toUpperCase()} A PARTIR DE R$${Math.round(min)}`,
        onClick: () => goToCategory(cat),
      })
    }

    // Achadinho: o produto mais barato com estoque.
    const cheapest = inStock.reduce<Product | null>(
      (min, p) => (!min || p.price < min.price ? p : min),
      null,
    )
    if (cheapest) {
      dynamic.push({
        text: `ACHADINHO · ${cheapest.title.toUpperCase()} R$${Math.round(cheapest.price)}`,
        onClick: () => onSelect(cheapest),
      })
    }

    return dynamic
  }, [products, onSelect, goToCategory])

  return (
    <>
      {/* Marquee — ofertas vindas do catálogo, clicáveis */}
      {marqueeItems.length > 0 && (
      <div className="overflow-hidden border-y-2 border-[var(--ink)] bg-[var(--accent)] py-2">
        <div className="glow-marquee flex w-max whitespace-nowrap">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i} className="flex items-center">
              {item.onClick ? (
                <button
                  onClick={item.onClick}
                  className="mx-4 text-xs font-black uppercase tracking-wider text-[var(--ink)] underline decoration-2 underline-offset-2 transition-opacity active:opacity-60"
                >
                  {item.text}
                </button>
              ) : (
                <span className="mx-4 text-xs font-black uppercase tracking-wider text-[var(--ink)]">
                  {item.text}
                </span>
              )}
              <span aria-hidden className="text-[var(--ink)]">
                &bull;
              </span>
            </span>
          ))}
        </div>
      </div>
      )}

      {/* Busca */}
      <div className="px-5 pt-5 lg:px-8 lg:pt-8">
        <button
          onClick={onOpenSearch}
          className="flex w-full items-center gap-2 rounded-full border-2 border-[var(--ink)] bg-white px-4 py-3 text-left transition-transform active:scale-[0.98] lg:max-w-2xl"
        >
          <IconSearch className="h-5 w-5 text-[var(--ink)]" />
          <span className="text-sm font-semibold text-[var(--ink)]/40">batom, sérum, perfume…</span>
        </button>
      </div>

      {/* Hero */}
      <section className="relative px-5 pt-5 lg:px-8">
        <div className="relative overflow-hidden rounded-[2.5rem] border-2 border-[var(--ink)] bg-white">
          <div className="lg:flex lg:items-center">
            <div className="relative z-10 px-6 pt-7 lg:flex-1 lg:px-10 lg:py-12">
              <span className="inline-block -rotate-3 rounded-full bg-[var(--accent)] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[var(--ink)] ring-2 ring-[var(--ink)]">
                indicação
              </span>
              <h2 className="glow-serif mt-3 text-[40px] font-black leading-[0.92] tracking-tight text-[var(--ink)] text-balance lg:text-6xl">
                Experimente
                <br />
                <span className="text-[var(--pink)]">esse !</span>
              </h2>
            </div>
            <div className="relative -mt-6 flex justify-center lg:mt-0 lg:flex-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={featured?.image || IMAGES.hero || "/placeholder.svg"}
                alt={featured?.title ?? "Indicação GLOW"}
                className="h-56 w-56 object-contain lg:h-72 lg:w-72"
              />
              {featured && (
                <div className="absolute right-6 top-4 rotate-6 rounded-2xl bg-[var(--pink)] px-3 py-2 text-center text-white ring-2 ring-[var(--ink)] lg:right-10 lg:top-10">
                  <p className="text-[9px] font-bold uppercase leading-none">apenas</p>
                  <p className="text-lg font-black leading-none">R${Math.round(featured.price)}</p>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => featured && onSelect(featured)}
            className="group flex w-full items-center justify-between border-t-2 border-[var(--ink)] bg-[var(--ink)] px-6 py-4 text-left text-white transition-colors active:bg-[var(--pink)] lg:px-10 lg:py-5 lg:hover:bg-[var(--pink)]"
          >
            <span className="text-base font-black uppercase tracking-wide lg:text-lg">Comprar agora</span>
            <IconArrow className="h-6 w-6 transition-transform group-active:translate-x-1 lg:group-hover:translate-x-1" />
          </button>
        </div>
      </section>

      {/* Em alta */}
      <section className="pt-8">
        <div className="flex items-end justify-between px-5 pb-4 lg:px-8">
          <h3 className="glow-serif text-2xl font-black text-[var(--ink)]">Em alta agora</h3>
          <button
            onClick={onSeeAll}
            className="text-xs font-black uppercase tracking-wide text-[var(--ink)] underline decoration-2 underline-offset-4 transition-opacity active:opacity-60"
          >
            ver tudo
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto px-5 pb-5 pt-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-8">
          {spotlights.map((s, i) => (
            <article
              key={s.id}
              style={{ rotate: TILTS[i % TILTS.length] }}
              onClick={() => onSelect(s)}
              className="relative w-44 flex-shrink-0 cursor-pointer rounded-[1.75rem] border-2 border-[var(--ink)] bg-white p-3 transition-transform active:rotate-0 lg:w-auto lg:hover:rotate-0"
            >
              <div className="overflow-hidden rounded-2xl bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.image || "/placeholder.svg"} alt={s.title} className="h-36 w-full object-contain" />
              </div>
              {s.tags?.[0] && (
                <span className="absolute -left-2 -top-2 -rotate-6 rounded-full bg-[var(--accent)] px-2.5 py-1 text-[10px] font-black uppercase text-[var(--ink)] ring-2 ring-[var(--ink)]">
                  {s.tags[0]}
                </span>
              )}
              <div className="mt-3 flex items-end justify-between">
                <p className="line-clamp-2 pr-1 text-sm font-extrabold leading-tight text-[var(--ink)]">{s.title}</p>
                <span className="flex-shrink-0 rounded-full bg-[var(--ink)] px-2.5 py-1 text-xs font-black text-[var(--pink)]">
                  R${Math.round(s.price)}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Divisória ondulada */}
      <div className="px-5 py-4 lg:px-8" aria-hidden>
        <svg viewBox="0 0 320 12" className="w-full text-[var(--ink)]" fill="none">
          <path
            d="M0 6 Q 20 0 40 6 T 80 6 T 120 6 T 160 6 T 200 6 T 240 6 T 280 6 T 320 6"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Mais amados */}
      <section ref={amadosRef} className="scroll-mt-4 px-5 lg:px-8">
        <h3 className="glow-serif mb-4 text-2xl font-black text-[var(--ink)]">Mais amados</h3>

        <div className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:flex-wrap lg:px-0">
          {categories.map((c) => {
            const on = active === c
            return (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={`flex-shrink-0 rounded-full border-2 px-4 py-2 text-sm font-bold transition-all active:scale-95 ${
                  on
                    ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                    : "border-[var(--ink)] bg-white text-[var(--ink)]"
                }`}
              >
                {c}
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {amadosLoading ? (
            <div className="col-span-full flex items-center justify-center gap-2 py-10 text-sm font-bold text-[var(--ink)]/55">
              <span className="glow-spin h-4 w-4 rounded-full border-2 border-[var(--ink)]/30 border-t-[var(--pink)]" />
              carregando…
            </div>
          ) : amados.length === 0 ? (
            <div className="col-span-full flex flex-col items-center gap-2 rounded-[1.5rem] border-2 border-dashed border-[var(--ink)]/30 bg-white px-6 py-12 text-center">
              <p className="glow-serif text-xl font-black text-[var(--ink)]">Nada nesta categoria</p>
              <p className="text-sm font-medium text-[var(--ink)]/55">Escolha outra acima.</p>
            </div>
          ) : (
            amados.map((p) => (
              <ProductRow key={p.id} p={p} added={!!addedMap[p.id]} onSelect={onSelect} onAdd={addToCart} />
            ))
          )}
        </div>
      </section>
    </>
  )
}
