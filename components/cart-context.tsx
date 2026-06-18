"use client"

import { createContext, useContext, useRef, useState, type ReactNode } from "react"
import type { Product, CartLine } from "@/lib/types"

type Toast = { title: string; total: number }

type CartContextValue = {
  cart: CartLine[]
  count: number
  total: number
  addedMap: Record<string, boolean>
  toast: Toast | null
  addToCart: (product: Product, qty?: number) => void
  changeQty: (id: string, delta: number) => void
  clearCart: () => void
  dismissToast: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([])
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const addedTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const count = cart.reduce((n, l) => n + l.qty, 0)
  const total = cart.reduce((n, l) => n + l.qty * l.product.price, 0)

  function addToCart(product: Product, qty = 1) {
    // total determinístico: adicionar N unidades sempre soma price*qty ao total atual,
    // independente de o item já existir ou não na sacola.
    const newTotal = total + product.price * qty

    setCart((prev) => {
      const found = prev.find((l) => l.product.id === product.id)
      return found
        ? prev.map((l) => (l.product.id === product.id ? { ...l, qty: l.qty + qty } : l))
        : [...prev, { product, qty }]
    })

    // feedback "check" no botão do produto
    setAddedMap((m) => ({ ...m, [product.id]: true }))
    clearTimeout(addedTimers.current[product.id])
    addedTimers.current[product.id] = setTimeout(() => {
      setAddedMap((m) => ({ ...m, [product.id]: false }))
    }, 1300)

    // toast: título limitado a 20 caracteres + total
    const short = product.title.length > 20 ? product.title.slice(0, 20).trimEnd() + "…" : product.title
    setToast({ title: short, total: newTotal })
    clearTimeout(toastTimer.current ?? undefined)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }

  function changeQty(id: string, delta: number) {
    setCart((prev) =>
      prev.map((l) => (l.product.id === id ? { ...l, qty: l.qty + delta } : l)).filter((l) => l.qty > 0),
    )
  }

  function clearCart() {
    setCart([])
  }

  function dismissToast() {
    setToast(null)
  }

  return (
    <CartContext.Provider value={{ cart, count, total, addedMap, toast, addToCart, changeQty, clearCart, dismissToast }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart deve ser usado dentro de <CartProvider>")
  return ctx
}
