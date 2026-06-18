"use client"

import { useCart } from "@/components/cart-context"
import { money } from "@/lib/format"
import { Sheet } from "@/components/sheet"
import { IconClose, IconBag, IconMinus, IconPlus, IconArrow } from "@/components/icons"

export function BagSheet({
  open,
  onClose,
  onCheckout,
}: {
  open: boolean
  onClose: () => void
  onCheckout: () => void
}) {
  const { cart, total, changeQty } = useCart()

  return (
    <Sheet
      open={open}
      onClose={onClose}
      handleClassName="bg-[var(--accent)]"
      handleBarClassName="bg-[var(--ink)]/30"
    >
      <>
        <div className="flex items-center justify-between border-b-2 border-[var(--ink)] bg-[var(--accent)] px-6 pb-4 pt-2">
          <h3 className="glow-serif text-2xl font-black text-[var(--ink)]">Sua sacola</h3>
          <button
            aria-label="Fechar"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ink)] text-white ring-2 ring-[var(--ink)] transition-transform active:scale-90"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--pink)] text-white">
              <IconBag className="h-7 w-7" />
            </div>
            <p className="glow-serif text-xl font-black text-[var(--ink)]">Sacola vazia</p>
            <p className="text-sm font-medium text-[var(--ink)]/60">Toque no + dos produtos para começar.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="flex flex-col gap-3">
                {cart.map((l) => (
                  <div
                    key={l.product.id}
                    className="flex items-center gap-3 rounded-[1.25rem] border-2 border-[var(--ink)] bg-white p-2.5"
                  >
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 border-[var(--ink)] bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={l.product.image || "/placeholder.svg"} alt={l.product.title} className="h-full w-full object-contain p-1" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold leading-tight text-[var(--ink)]">{l.product.title}</p>
                      <p className="text-sm font-black text-[var(--pink)]">R${money(l.product.price * l.qty)}</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border-2 border-[var(--ink)] px-1.5 py-1">
                      <button
                        aria-label="Diminuir"
                        onClick={() => changeQty(l.product.id, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--pink)] transition-transform active:scale-90"
                      >
                        <IconMinus className="h-4 w-4" />
                      </button>
                      <span className="w-5 text-center text-sm font-black text-[var(--ink)]">{l.qty}</span>
                      <button
                        aria-label="Aumentar"
                        onClick={() => changeQty(l.product.id, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--pink)] transition-transform active:scale-90"
                      >
                        <IconPlus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t-2 border-[var(--ink)] p-5">
              <div className="flex items-center gap-3 rounded-[1.25rem] border-2 border-[var(--ink)] bg-[var(--accent)] px-5 py-3">
                <span className="text-sm font-black uppercase tracking-wide text-[var(--ink)]/70">Total</span>
                <span className="ml-auto text-2xl font-black text-[var(--ink)]">R${money(total)}</span>
              </div>
            </div>
            <button
              onClick={onCheckout}
              className="group flex w-full items-center justify-between bg-[var(--ink)] px-6 py-5 text-left text-white transition-colors active:bg-[var(--pink)]"
            >
              <span className="text-base font-black uppercase tracking-wide">Finalizar compra</span>
              <IconArrow className="h-6 w-6 transition-transform group-active:translate-x-1" />
            </button>
          </>
        )}
      </>
    </Sheet>
  )
}
