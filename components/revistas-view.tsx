"use client"

import { useEffect, useMemo, useState } from "react"
import { BookOpen } from "lucide-react"
import { pageUrl } from "@/lib/magazine-cdn"
import { MagazineReader } from "@/components/magazine-reader"
import type { Magazine } from "@/lib/types"

/** RevistasView: estante de revistas. Cada capa (página 0001 no CDN) abre o leitor. */
export function RevistasView({
  magazines,
  openSlug,
  openPage,
  onOpenedDeepLink,
  onReadingChange,
}: {
  magazines: Magazine[]
  openSlug?: string
  openPage?: number
  onOpenedDeepLink?: () => void
  onReadingChange?: (magazine: Magazine | null) => void
}) {
  const [reading, setReading] = useState<Magazine | null>(null)
  const [initialPage, setInitialPage] = useState(1)

  // Filtros da estante: marca, ciclo e ordenação por data.
  const [brand, setBrand] = useState("all")
  const [cycle, setCycle] = useState("all")
  const [sort, setSort] = useState<"recent" | "old">("recent")

  // Opções distintas extraídas do conjunto vindo do banco.
  const brands = useMemo(
    () => Array.from(new Set(magazines.map((m) => m.brand).filter(Boolean))).sort(),
    [magazines],
  )
  const cycles = useMemo(
    () => Array.from(new Set(magazines.map((m) => m.cycle).filter((c): c is string => !!c))).sort(),
    [magazines],
  )

  const filtered = useMemo(() => {
    const list = magazines.filter(
      (m) => (brand === "all" || m.brand === brand) && (cycle === "all" || m.cycle === cycle),
    )
    return list.sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0
      return sort === "recent" ? tb - ta : ta - tb
    })
  }, [magazines, brand, cycle, sort])

  const hasActiveFilter = brand !== "all" || cycle !== "all"

  // Deep-link: abre o leitor na revista (e página) indicada pela URL.
  useEffect(() => {
    if (!openSlug) return
    const found = magazines.find((m) => m.slug === openSlug)
    if (found) {
      setInitialPage(openPage ?? 1)
      setReading(found)
    }
    onOpenedDeepLink?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSlug, openPage])

  // Informa ao shell qual revista está aberta (para o título da aba) e limpa
  // ao sair desta tela.
  useEffect(() => {
    onReadingChange?.(reading)
    return () => onReadingChange?.(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reading])

  return (
    <section className="px-4 pb-8 pt-4 lg:px-8 lg:pt-8">
      <header className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--pink)]">Revista GLOW</p>
        <h1 className="glow-serif mt-1 text-3xl font-black leading-none text-[var(--ink)] text-balance lg:text-4xl">
          Estante de revistas
        </h1>
        <p className="mt-2 text-sm text-[var(--ink)]/60">Toque em uma capa para folhear.</p>
      </header>

      {/* Filtros: marca, ciclo e ordenação por data */}
      {magazines.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            aria-label="Filtrar por marca"
            className="rounded-full border-2 border-[var(--ink)] bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--pink)]"
          >
            <option value="all">Todas as marcas</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {cycles.length > 0 && (
            <select
              value={cycle}
              onChange={(e) => setCycle(e.target.value)}
              aria-label="Filtrar por ciclo"
              className="rounded-full border-2 border-[var(--ink)] bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--pink)]"
            >
              <option value="all">Todos os ciclos</option>
              {cycles.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "recent" | "old")}
            aria-label="Ordenar por data"
            className="rounded-full border-2 border-[var(--ink)] bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--pink)]"
          >
            <option value="recent">Mais recentes</option>
            <option value="old">Mais antigas</option>
          </select>

          {hasActiveFilter && (
            <button
              onClick={() => {
                setBrand("all")
                setCycle("all")
              }}
              className="rounded-full px-3 py-2 text-xs font-black uppercase tracking-wide text-[var(--pink)] underline decoration-2 underline-offset-2"
            >
              Limpar
            </button>
          )}
        </div>
      )}

      {magazines.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-[var(--ink)]/30 bg-white/40 p-8 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-[var(--ink)]/40" />
          <p className="mt-3 text-sm font-semibold text-[var(--ink)]">Nenhuma revista por aqui ainda</p>
          <p className="mt-1 text-xs text-[var(--ink)]/50">As edições aparecerão assim que forem publicadas.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-[var(--ink)]/30 bg-white/40 p-8 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-[var(--ink)]/40" />
          <p className="mt-3 text-sm font-semibold text-[var(--ink)]">Nenhuma revista com esses filtros</p>
          <p className="mt-1 text-xs text-[var(--ink)]/50">Tente ajustar a marca ou o ciclo.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => {
                  setInitialPage(1)
                  setReading(m)
                }}
                className="group block w-full overflow-hidden rounded-2xl border-2 border-[var(--ink)] bg-white text-left transition active:scale-[0.98]"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--ink)]/5">
                  {/* Capa = primeira página da revista no CDN. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pageUrl(m.slug, 0) || "/placeholder.svg"}
                    alt={`Capa — ${m.name}`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--pink)]">{m.brand}</p>
                  <h2 className="mt-0.5 text-sm font-black leading-tight text-[var(--ink)] text-pretty">{m.name}</h2>
                  {m.cycle && <p className="mt-1 text-xs text-[var(--ink)]/55">{m.cycle}</p>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {reading && (
        <MagazineReader magazine={reading} initialPage={initialPage} onClose={() => setReading(null)} />
      )}
    </section>
  )
}
