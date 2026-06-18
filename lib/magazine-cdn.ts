// Helpers puros do CDN das revistas. Sem dependências de servidor (next/headers),
// por isso podem ser importados tanto por Server Components quanto por Client Components.

/** Base do CDN onde ficam as pastas das revistas. */
export const CDN_BASE = "https://cdn.hatbit.online/revistas"

/** Extensão das páginas no CDN. */
export const PAGE_EXT = "jpg"

/** Transforma um texto em slug seguro para URL (sem acentos, espaços, etc). */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Monta a URL de uma página (índice 0-based) de uma revista no CDN. */
export function pageUrl(slug: string, index0: number): string {
  const n = String(index0 + 1).padStart(4, "0")
  return `${CDN_BASE}/${slug}/${n}.${PAGE_EXT}`
}
