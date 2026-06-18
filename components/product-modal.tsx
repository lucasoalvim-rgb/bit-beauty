"use client"

import type { Product } from "@/lib/types"
import { money } from "@/lib/format"
import { Sheet } from "@/components/sheet"
import { IconClose, IconPlus } from "@/components/icons"
import { ShareButton } from "@/components/share-button"
import { productShareUrl } from "@/lib/share"

export function ProductModal({
  product,
  onClose,
  onAdd,
}: {
  product: Product | null
  onClose: () => void
  onAdd: (p: Product) => void
}) {
  return (
    <Sheet open={product !== null} onClose={onClose} size="xl">
      {product && (
        <div className="relative flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:h-[78dvh] sm:max-h-[640px] sm:flex-none sm:overflow-hidden">
          {/* Botões flutuantes (compartilhar + fechar) */}
          <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
            <ShareButton
              title={product.title}
              text={`Olha esse achadinho: ${product.title} — ${product.brand}`}
              url={productShareUrl(product.id)}
              ariaLabel="Compartilhar produto"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--ink)] ring-2 ring-[var(--ink)] transition-transform active:scale-90"
            />
            <button
              aria-label="Fechar"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ink)] text-white ring-2 ring-[var(--ink)] transition-transform active:scale-90"
            >
              <IconClose className="h-5 w-5" />
            </button>
          </div>

          <div className="sm:flex sm:h-full sm:flex-row">
            {/* Coluna da imagem */}
            <div className="relative bg-white sm:flex sm:w-1/2 sm:items-center sm:justify-center sm:border-r-2 sm:border-[var(--ink)]">
              {product.badge ? (
                <span className="absolute left-4 top-4 z-10 -rotate-3 rounded-full bg-[var(--accent)] px-3 py-1 text-[11px] font-black uppercase text-[var(--ink)] ring-2 ring-[var(--ink)]">
                  {product.badge}
                </span>
              ) : null}
              <div className="flex justify-center px-6 pt-10 pb-6 sm:p-10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.image || "/placeholder.svg"}
                  alt={product.title}
                  className="h-52 w-52 object-contain sm:h-[22rem] sm:w-[22rem]"
                />
              </div>
            </div>

            {/* Coluna dos detalhes */}
            <div className="flex flex-col border-t-2 border-[var(--ink)] sm:w-1/2 sm:border-t-0 sm:overflow-y-auto sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden">
              <div className="px-6 pt-5 sm:pt-8">
                <p className="text-[11px] font-black uppercase tracking-wider text-[var(--pink)]">{product.brand}</p>
                <h3 className="glow-serif mt-1 text-3xl font-black leading-tight text-[var(--ink)] sm:text-4xl">
                  {product.title}
                </h3>
                <p className="mt-3 text-sm font-medium leading-relaxed text-[var(--ink)]/70">{product.desc}</p>
                {product.active === false ? (
                  <div className="mt-5 flex items-center gap-3 rounded-[1.25rem] border-2 border-[var(--ink)] bg-[var(--ink)]/5 px-4 py-3">
                    <span className="text-[11px] font-black uppercase tracking-wide text-[var(--ink)]/70">
                      disponibilidade
                    </span>
                    <span className="ml-auto text-lg font-black uppercase tracking-wide text-[var(--ink)]/55">
                      Produto indisponível
                    </span>
                  </div>
                ) : product.stock > 0 ? (
                  <>
                    <div className="mt-5 flex items-center gap-3 rounded-[1.25rem] border-2 border-[var(--ink)] bg-[var(--accent)] px-4 py-3">
                      <span className="text-[11px] font-black uppercase tracking-wide text-[var(--ink)]/70">preço</span>
                      <div className="ml-auto flex items-baseline gap-2">
                        {product.oldPrice ? (
                          <span className="text-sm font-bold text-[var(--ink)]/45 line-through">
                            R${money(product.oldPrice)}
                          </span>
                        ) : null}
                        <span className="text-3xl font-black text-[var(--ink)]">R${money(product.price)}</span>
                      </div>
                    </div>
                    <p className="mt-2 px-1 text-xs font-bold uppercase tracking-wide text-[var(--ink)]/55">
                      {product.stock <= 2 ? `Últimas ${product.stock} unidades` : "Em estoque"}
                    </p>
                  </>
                ) : (
                  <div className="mt-5 flex items-center gap-3 rounded-[1.25rem] border-2 border-[var(--ink)] bg-[var(--ink)]/5 px-4 py-3">
                    <span className="text-[11px] font-black uppercase tracking-wide text-[var(--ink)]/70">
                      disponibilidade
                    </span>
                    <span className="ml-auto text-lg font-black uppercase tracking-wide text-[var(--ink)]/55">
                      Fora de estoque
                    </span>
                  </div>
                )}
              </div>

              <button
                disabled={product.stock <= 0 || product.active === false}
                onClick={() => onAdd(product)}
                className="group mt-5 flex w-full items-center justify-between border-t-2 border-[var(--ink)] bg-[var(--ink)] px-6 py-5 text-left text-white transition-colors active:bg-[var(--pink)] disabled:cursor-not-allowed disabled:opacity-40 sm:mt-auto sm:hover:bg-[var(--pink)]"
              >
                <span className="text-base font-black uppercase tracking-wide">
                  {product.active === false
                    ? "Produto indisponível"
                    : product.stock > 0
                      ? "Adicionar à sacola"
                      : "Produto esgotado"}
                </span>
                <IconPlus className="h-6 w-6 transition-transform group-active:rotate-90" />
              </button>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  )
}
