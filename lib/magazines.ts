import { createClient, hasSupabaseEnv } from "@/lib/supabase/server"
import { slugify } from "@/lib/magazine-cdn"
import type { Magazine, MagazineRow } from "@/lib/types"

// Reexporta os helpers de CDN para quem já importava daqui.
export { CDN_BASE, PAGE_EXT, slugify, pageUrl } from "@/lib/magazine-cdn"

/** Colunas completas (após a migração 002). */
const MAGAZINE_COLUMNS = "id,name,brand,cycle,pdf_url,slug,pages,created_at"
/** Colunas legadas (antes da migração) — sem slug/pages. */
const MAGAZINE_COLUMNS_LEGACY = "id,name,brand,cycle,pdf_url,created_at"

/** Detecta erro de coluna inexistente (migração 002 ainda não aplicada). */
function isMissingMagazineColumns(message?: string) {
  return !!message && /(slug|pages)/.test(message)
}

/** Extrai "revista1" de "https://cdn.hatbit.online/revista/revista1.pdf". */
function slugFromPdf(pdfUrl: string | null): string | null {
  if (!pdfUrl) return null
  try {
    const file = pdfUrl.split("/").pop() ?? ""
    const base = file.replace(/\.[a-z0-9]+$/i, "").trim()
    return base || null
  } catch {
    return null
  }
}

/** Converte a linha do banco no formato usado pela aplicação. */
function mapRow(row: MagazineRow): Magazine {
  // Preferência de slug: coluna explícita > nome do arquivo PDF > slug do nome.
  const slug =
    (row.slug && row.slug.trim()) || slugFromPdf(row.pdf_url) || slugify(row.name)

  return {
    id: row.id,
    name: row.name,
    brand: row.brand ?? "GLOW",
    cycle: row.cycle ?? null,
    slug,
    pages: row.pages != null && Number(row.pages) > 0 ? Number(row.pages) : null,
    createdAt: row.created_at ?? null,
  }
}

/** Busca todas as revistas para a estante. */
export async function getMagazines(): Promise<Magazine[]> {
  if (!hasSupabaseEnv()) return []
  const supabase = await createClient()

  const run = (columns: string) =>
    supabase.from("magazines").select(columns).order("created_at", { ascending: false })

  let { data, error } = await run(MAGAZINE_COLUMNS)
  if (error && isMissingMagazineColumns(error.message)) {
    // Migração 002 (slug/pages) ainda não rodou → usa colunas legadas.
    ;({ data, error } = await run(MAGAZINE_COLUMNS_LEGACY))
  }

  if (error) {
    console.log("[v0] getMagazines error:", error.message)
    return []
  }
  return (data as unknown as MagazineRow[]).map(mapRow)
}
