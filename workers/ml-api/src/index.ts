import type { Env, EnrichResult, MLCandidate } from "./ml-types"
import { getMLAccessToken, MLTokenError } from "./ml-token"

const SITE = "MLB" // Mercado Livre Brasil
const API = "https://api.mercadolibre.com"
const MAX_CANDIDATOS = 8

// CORS liberado para acesso externo (e interno pelo app).
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  })
}

type MLAttribute = { id: string; value_name: string | null }
type MLSearchItem = { id: string; name: string | null; attributes?: MLAttribute[] }
type MLSearchResponse = { results?: MLSearchItem[] }
type MLPicture = { url: string | null; max_width?: number }
type MLProduct = {
  id: string
  name: string | null
  permalink: string | null
  pictures?: MLPicture[]
  attributes?: MLAttribute[]
}
type MLItem = { price: number | null }
type MLItemsResponse = { results?: MLItem[] }

function attr(attrs: MLAttribute[] | undefined, id: string): string | null {
  return attrs?.find((x) => x.id === id)?.value_name ?? null
}

function vazio(ean: string, status: EnrichResult["status"], mensagem: string): EnrichResult {
  return { ean, status, candidatos: [], mensagem }
}

async function mlGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  })
  if (!res.ok) throw new Error(`ML respondeu ${res.status} em ${path}`)
  return (await res.json()) as T
}

// Monta um candidato a partir do id de um produto de catálogo:
// busca detalhe (nome, marca, imagem) e calcula o preço médio dos anúncios.
async function buildCandidate(id: string, token: string, exato: boolean): Promise<MLCandidate | null> {
  try {
    const product = await mlGet<MLProduct>(`/products/${id}`, token)

    // Galeria completa: todas as fotos do anúncio, maiores primeiro, em https.
    const imagens = (product.pictures ?? [])
      .slice()
      .sort((a, b) => (b.max_width ?? 0) - (a.max_width ?? 0))
      .map((p) => p.url?.replace("http://", "https://"))
      .filter((u): u is string => !!u)

    let preco: number | null = null
    try {
      const itemsResp = await mlGet<MLItemsResponse>(`/products/${id}/items?limit=20`, token)
      const precos = (itemsResp.results ?? [])
        .map((i) => i.price)
        .filter((p): p is number => typeof p === "number" && p > 0)
      if (precos.length > 0) {
        const soma = precos.reduce((acc, p) => acc + p, 0)
        preco = Math.round((soma / precos.length) * 100) / 100
      }
    } catch {
      // segue sem preço
    }

    return {
      id,
      nome: product.name ?? null,
      marca: attr(product.attributes, "BRAND"),
      imagens,
      preco,
      permalink: product.permalink || `https://www.mercadolivre.com.br/p/${id}`,
      exato,
    }
  } catch {
    return null
  }
}

async function consultarEan(ean: string, env: Env): Promise<EnrichResult> {
  let token: string
  try {
    token = await getMLAccessToken(env)
  } catch (err) {
    const msg =
      err instanceof MLTokenError ? err.message : "Não foi possível obter o token do Mercado Livre."
    return vazio(ean, "erro", msg)
  }

  try {
    // 1) Match exato pelo código de barras (EAN/GTIN).
    const byEan = await mlGet<MLSearchResponse>(
      `/products/search?status=active&site_id=${SITE}&product_identifier=${encodeURIComponent(ean)}`,
      token,
    )
    const exactId = byEan.results?.[0]?.id ?? null
    const exactName = byEan.results?.[0]?.name ?? null

    // 2) Busca por nome (do match exato) para trazer anúncios similares.
    const ids: { id: string; exato: boolean }[] = []
    if (exactId) ids.push({ id: exactId, exato: true })

    if (exactName) {
      try {
        const byName = await mlGet<MLSearchResponse>(
          `/products/search?status=active&site_id=${SITE}&q=${encodeURIComponent(exactName)}`,
          token,
        )
        for (const r of byName.results ?? []) {
          if (r.id && !ids.some((x) => x.id === r.id)) {
            ids.push({ id: r.id, exato: false })
          }
        }
      } catch {
        // ignora falha na busca por nome; mantém ao menos o match exato
      }
    }

    if (ids.length === 0) {
      return vazio(
        ean,
        "nao_encontrado",
        "Nenhum produto encontrado no catálogo do Mercado Livre para este código de barras.",
      )
    }

    // 3) Monta os candidatos (detalhe + preço) em paralelo.
    const limited = ids.slice(0, MAX_CANDIDATOS)
    const settled = await Promise.all(limited.map((x) => buildCandidate(x.id, token, x.exato)))
    const candidatos = settled.filter((c): c is MLCandidate => c !== null)

    if (candidatos.length === 0) {
      return vazio(ean, "nao_encontrado", "Não foi possível carregar os anúncios.")
    }

    return { ean, status: "ok", candidatos, mensagem: null }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Falha desconhecida."
    return vazio(ean, "erro", `Erro ao consultar o Mercado Livre: ${msg}`)
  }
}

// Extrai o EAN do caminho. Aceita /ml/<ean>, /api/ml/<ean> ou /<ean>.
function extrairEan(pathname: string): string | null {
  const segs = pathname.split("/").filter(Boolean)
  if (segs.length === 0) return null
  const last = segs[segs.length - 1]
  return /^\d{8,14}$/.test(last) ? last : null
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS })
    }
    if (request.method !== "GET") {
      return json({ error: "Método não permitido. Use GET /ml/<ean>." }, 405)
    }

    const url = new URL(request.url)
    const ean = extrairEan(url.pathname)
    if (!ean) {
      return json(
        { error: "Informe um EAN válido (8 a 14 dígitos). Ex.: /ml/7891000100103" },
        400,
      )
    }

    const result = await consultarEan(ean, env)
    return json(result)
  },
}
