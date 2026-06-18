/**
 * Helpers de compartilhamento: monta um link com query params apontando para um
 * produto (`?produto=<id>`) ou uma revista (`?revista=<slug>[&pagina=<n>]`) e
 * dispara a Web Share API nativa, com fallback para copiar o link.
 */

/** Monta a URL absoluta para um produto. */
export function productShareUrl(id: string): string {
  const url = new URL(window.location.origin)
  url.searchParams.set("produto", id)
  return url.toString()
}

/** Monta a URL absoluta para uma revista (opcionalmente numa página). */
export function magazineShareUrl(slug: string, page?: number): string {
  const url = new URL(window.location.origin)
  url.searchParams.set("revista", slug)
  if (page && page > 1) url.searchParams.set("pagina", String(page))
  return url.toString()
}

export type ShareResult = "shared" | "copied" | "error"

/**
 * Compartilha via Web Share API quando disponível; caso contrário copia o link
 * para a área de transferência. Retorna o que aconteceu para feedback de UI.
 */
export async function shareLink(data: { title: string; text?: string; url: string }): Promise<ShareResult> {
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share(data)
      return "shared"
    }
  } catch (err) {
    // AbortError = usuário cancelou o diálogo nativo; não é um erro real.
    if (err instanceof DOMException && err.name === "AbortError") return "error"
    // Qualquer outra falha cai no fallback de copiar abaixo.
  }

  try {
    await navigator.clipboard.writeText(data.url)
    return "copied"
  } catch {
    return "error"
  }
}
