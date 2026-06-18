import { createClient, hasSupabaseEnv } from "@/lib/supabase/server"
import type { Product, ProductRow } from "@/lib/types"

/** Categorias de alto nível usadas nos filtros da UI. */
export const CATEGORIES = ["Tudo", "Hidratantes", "Sabonetes", "Perfumes", "Cabelo", "Outros"]

/** Colunas do catálogo. As de promoção por quantidade só existem após rodar a migração. */
export const PRODUCT_COLUMNS =
  "id,name,brand,category,price,old_price,bulk_min_qty,bulk_unit_price,stock,badge,image,description,volume"
/** Conjunto legado (sem as colunas de promoção) — usado como fallback antes da migração. */
export const PRODUCT_COLUMNS_LEGACY =
  "id,name,brand,category,price,old_price,stock,badge,image,description,volume"

/** Detecta o erro de coluna inexistente (migração ainda não aplicada). */
export function isMissingBulkColumns(message?: string) {
  return !!message && /bulk_(min_qty|unit_price)/.test(message)
}

/** Deriva uma categoria de alto nível a partir da categoria granular do banco. */
function deriveCategory(raw: string | null): string {
  const c = (raw ?? "").toLowerCase()
  if (c.includes("hidrat") || c.includes("creme") || c.includes("loção") || c.includes("loco") || c.includes("óleo") || c.includes("oleo")) {
    return "Hidratantes"
  }
  if (c.includes("sabonete")) return "Sabonetes"
  if (c.includes("colônia") || c.includes("colonia") || c.includes("parfum") || c.includes("splash") || c.includes("perfume") || c.includes("malbec") || c.includes("floratta")) {
    return "Perfumes"
  }
  if (c.includes("shampoo") || c.includes("condicionador") || c.includes("match") || c.includes("capilar")) {
    return "Cabelo"
  }
  return "Outros"
}

/** Converte uma linha do banco no formato `Product` usado pela aplicação. */
export function mapRow(row: ProductRow): Product {
  const tags: string[] = []
  if (row.badge) tags.push(row.badge)
  if ((row.stock ?? 0) <= 0) tags.push("Esgotado")
  else if ((row.stock ?? 0) <= 2) tags.push("Últimas unidades")

  return {
    id: row.id,
    image: row.image ?? "/beauty/prod-cream.png",
    title: row.name,
    brand: row.brand ?? "GLOW",
    price: Number(row.price),
    oldPrice: row.old_price != null ? Number(row.old_price) : null,
    badge: row.badge ?? null,
    bulkMinQty: row.bulk_min_qty != null ? Number(row.bulk_min_qty) : null,
    bulkUnitPrice: row.bulk_unit_price != null ? Number(row.bulk_unit_price) : null,
    desc: row.description ?? `${row.name} — ${row.brand ?? ""}. ${row.volume ?? ""}`.trim(),
    cat: deriveCategory(row.category),
    volume: row.volume,
    stock: row.stock ?? 0,
    tags,
  }
}

/** Busca todos os produtos do catálogo, ordenados por estoque e nome. */
export async function getProducts(): Promise<Product[]> {
  if (!hasSupabaseEnv()) return []
  const supabase = await createClient()

  const run = (columns: string) =>
    supabase
      .from("products")
      .select(columns)
      .order("stock", { ascending: false })
      .order("name", { ascending: true })

  let { data, error } = await run(PRODUCT_COLUMNS)
  if (error && isMissingBulkColumns(error.message)) {
    // Migração de promoção por quantidade ainda não rodou → usa colunas legadas.
    ;({ data, error } = await run(PRODUCT_COLUMNS_LEGACY))
  }

  if (error) {
    console.log("[v0] getProducts error:", error.message)
    return []
  }
  return (data as unknown as ProductRow[]).map(mapRow)
}
