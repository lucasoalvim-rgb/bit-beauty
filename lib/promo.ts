import type { Product } from "@/lib/types"

export type Promo =
  | { type: "bulk"; minQty: number; unitPrice: number }
  | { type: "discount"; oldPrice: number; percent: number }
  | null

/**
 * Determina a promoção exibida no card do produto.
 * - "bulk": leve N, pague R$X a unidade (tem prioridade sobre desconto simples).
 * - "discount": preço antigo riscado quando old_price > price.
 */
export function getPromo(p: Product): Promo {
  if (p.bulkMinQty && p.bulkMinQty > 1 && p.bulkUnitPrice && p.bulkUnitPrice < p.price) {
    return { type: "bulk", minQty: p.bulkMinQty, unitPrice: p.bulkUnitPrice }
  }
  if (p.oldPrice && p.oldPrice > p.price) {
    const percent = Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100)
    return { type: "discount", oldPrice: p.oldPrice, percent }
  }
  return null
}
