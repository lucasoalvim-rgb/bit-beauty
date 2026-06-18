"use client"

import type { Product } from "@/lib/types"
import { money } from "@/lib/format"
import { getPromo } from "@/lib/promo"
import { IconPlus, IconCheck } from "@/components/icons"

/** Linha de produto reaproveitável (lista vertical) */
export function ProductRow({
  p,
  added,
  onSelect,
  onAdd,
}: {
  p: Product
  added: boolean
  onSelect: (p: Product) => void
  onAdd: (p: Product) => void
}) {
  const promo = getPromo(p)
  const outOfStock = p.stock <= 0
  return (
    <article
      onClick={() => onSelect(p)}
      className="flex cursor-pointer items-stretch gap-3 overflow-hidden rounded-[1.5rem] border-2 border-[var(--ink)] bg-white p-3 transition-transform active:scale-[0.99]"
    >
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-[var(--ink)] bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image || "/placeholder.svg"} alt={p.title} className="h-full w-full object-contain p-1.5" />
        {promo?.type === "discount" && (
          <span className="absolute left-1 top-1 rounded-full bg-[var(--pink)] px-1.5 py-0.5 text-[9px] font-black leading-none text-white ring-2 ring-[var(--ink)]">
            -{promo.percent}%
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-[10px] font-black uppercase tracking-wider text-[var(--pink)]">{p.brand}</p>
        {/* Título com quebra de linha livre (aparece por completo). */}
        <p className="mt-0.5 text-base font-extrabold leading-tight text-[var(--ink)] text-pretty">{p.title}</p>
        {/* Promo "leve mais, pague menos" */}
        {promo?.type === "bulk" && (
          <span className="mt-1 inline-block w-fit rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-black uppercase leading-tight text-[var(--ink)] ring-2 ring-[var(--ink)]">
            Leve {promo.minQty}, pague R${money(promo.unitPrice)}/un
          </span>
        )}
        {/* Preço na parte de baixo, ao lado do botão de adicionar. */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          {outOfStock ? (
            <span className="rounded-full bg-[var(--ink)]/10 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-[var(--ink)]/55">
              Fora de estoque
            </span>
          ) : (
            <span className="flex items-baseline gap-1.5">
              <span className="text-xl font-black leading-tight text-[var(--ink)]">R${money(p.price)}</span>
              {promo?.type === "discount" && (
                <span className="text-xs font-bold leading-tight text-[var(--ink)]/45 line-through">
                  R${money(promo.oldPrice)}
                </span>
              )}
            </span>
          )}
          <button
            aria-label={outOfStock ? `${p.title} esgotado` : `Adicionar ${p.title} à sacola`}
            disabled={outOfStock}
            onClick={(e) => {
              e.stopPropagation()
              onAdd(p)
            }}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 ${
              added ? "bg-[var(--accent)] text-[var(--ink)]" : "bg-[var(--ink)] text-[var(--pink)]"
            }`}
          >
            {added ? <IconCheck className="glow-pop h-5 w-5" /> : <IconPlus className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </article>
  )
}
