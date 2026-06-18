import { createClient, hasSupabaseEnv } from "@/lib/supabase/server"
import type { Product, ProductRow } from "@/lib/types"

/** Categorias de alto nível usadas nos filtros da UI. */
export const CATEGORIES = ["Tudo", "Hidratantes", "Sabonetes", "Perfumes", "Cabelo", "Outros"]

/** Colunas sempre presentes na tabela `products`. */
const REQUIRED_COLUMNS = [
  "id",
  "name",
  "brand",
  "category",
  "price",
  "old_price",
  "stock",
  "badge",
  "image",
  "description",
  "volume",
]

/**
 * Colunas opcionais que só existem depois de rodar as migrações
 * correspondentes (promoção por quantidade e flag de ativo). Quando o schema
 * ainda não tem alguma delas, removemos a coluna do SELECT e repetimos.
 */
const OPTIONAL_COLUMNS = ["bulk_min_qty", "bulk_unit_price", "is_active"]

/** Conjunto completo (preferido). Mantido exportado por compatibilidade. */
export const PRODUCT_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS].join(",")
/** Conjunto legado (sem colunas opcionais). */
export const PRODUCT_COLUMNS_LEGACY = REQUIRED_COLUMNS.join(",")

/** Detecta o erro de coluna inexistente (migração ainda não aplicada). */
export function isMissingBulkColumns(message?: string) {
  return !!message && /bulk_(min_qty|unit_price)/.test(message)
}

/** Extrai o nome da coluna ausente da mensagem do PostgREST (código 42703). */
function parseMissingColumn(message?: string): string | null {
  const m = message?.match(/column\s+[\w".]*?(\w+)["]?\s+does not exist/i)
  return m ? m[1] : null
}

/**
 * Executa um SELECT em `products` removendo, uma a uma, as colunas opcionais
 * que o schema atual não possui. `build` recebe a string de colunas e devolve a
 * query pronta para await. Isso mantém o app funcionando antes/depois de cada
 * migração, sem quebrar o catálogo.
 */
export async function selectProducts(
  build: (columns: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<{ data: ProductRow[] | null; error: { message: string } | null }> {
  let columns = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]

  // No máximo, uma tentativa extra por coluna opcional ausente.
  for (let attempt = 0; attempt <= OPTIONAL_COLUMNS.length; attempt++) {
    const { data, error } = await build(columns.join(","))
    if (!error) return { data: data as ProductRow[] | null, error: null }

    const missing = parseMissingColumn(error.message)
    if (missing && OPTIONAL_COLUMNS.includes(missing) && columns.includes(missing)) {
      columns = columns.filter((c) => c !== missing)
      continue
    }
    return { data: null, error }
  }
  return { data: null, error: { message: "Falha ao consultar produtos." } }
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
  // Quando a coluna `is_active` ainda não existe, o produto é tratado como ativo.
  const active = row.is_active == null ? true : !!row.is_active

  const tags: string[] = []
  if (row.badge) tags.push(row.badge)
  if (!active) tags.push("Indisponível")
  else if ((row.stock ?? 0) <= 0) tags.push("Esgotado")
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
    active,
    tags,
  }
}

/**
 * Busca todos os produtos do catálogo, ordenados por estoque e nome.
 * Produtos inativos são omitidos da listagem (continuam acessíveis por id
 * para revalidação, ex.: deep-link, mas exibidos como indisponíveis).
 */
export async function getProducts(): Promise<Product[]> {
  if (!hasSupabaseEnv()) return []
  const supabase = await createClient()

  const { data, error } = await selectProducts((columns) =>
    supabase
      .from("products")
      .select(columns)
      .order("stock", { ascending: false })
      .order("name", { ascending: true }),
  )

  if (error) {
    console.log("[v0] getProducts error:", error.message)
    return []
  }
  return (data ?? []).map(mapRow).filter((p) => p.active)
}

/**
 * Busca UM produto fresco no banco pelo id. Usado para revalidar preço,
 * estoque e status (ativo) no momento em que o cliente abre o produto —
 * em vez de confiar no que foi carregado na renderização inicial.
 * Retorna `null` apenas quando o produto não existe mais.
 */
export async function getProductById(id: string): Promise<Product | null> {
  if (!hasSupabaseEnv()) return null
  const supabase = await createClient()

  const { data, error } = await selectProducts((columns) =>
    supabase.from("products").select(columns).eq("id", id).limit(1),
  )

  if (error) {
    console.log("[v0] getProductById error:", error.message)
    return null
  }
  const row = (data ?? [])[0]
  if (!row) return null
  return mapRow(row)
}
