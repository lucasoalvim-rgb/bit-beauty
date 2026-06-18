"use client"

import useSWR from "swr"
import { useEffect, useState } from "react"
import { searchProducts } from "@/lib/actions"
import type { Product } from "@/lib/types"

/** Debounce simples de um valor (não faz fetch, só atrasa a atualização). */
export function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/**
 * Busca produtos no banco via Server Action, com debounce e cache (SWR).
 * Quando não há termo nem categoria ativa, retorna o `fallback` (catálogo já
 * carregado pelo RSC), evitando uma ida desnecessária ao banco.
 */
export function useProductSearch(
  { query, category }: { query?: string; category?: string },
  fallback: Product[],
) {
  const term = useDebounced((query ?? "").trim(), 300)
  const cat = category ?? "Tudo"
  const active = term.length > 0 || cat !== "Tudo"

  const { data, isLoading } = useSWR(
    active ? ["product-search", term, cat] : null,
    () => searchProducts({ query: term, category: cat }),
    { keepPreviousData: true },
  )

  return {
    results: active ? (data ?? []) : fallback,
    loading: active && isLoading && !data,
    active,
  }
}
