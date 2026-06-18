import type { Env } from "./ml-types"

// Gera e mantém em cache um access_token do Mercado Livre a partir do
// refresh_token. O access_token expira em ~6h; aqui renovamos automaticamente.
// O cache vive no escopo do módulo, persistindo entre requisições no mesmo
// isolate do Worker (comportamento equivalente ao da versão Next).

const API = "https://api.mercadolibre.com"

type TokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
}

// Cache em memória do isolate.
let cache: { token: string; expiraEm: number } | null = null
// O refresh token "rotaciona" a cada uso; guardamos o mais recente em memória.
let refreshTokenAtual: string | null = null

export class MLTokenError extends Error {}

export async function getMLAccessToken(env: Env): Promise<string> {
  // Reaproveita o token enquanto válido (com margem de 5 min).
  if (cache && Date.now() < cache.expiraEm - 5 * 60 * 1000) {
    return cache.token
  }

  const clientId = env.ML_CLIENT_ID
  const clientSecret = env.ML_CLIENT_SECRET
  const refreshToken = refreshTokenAtual || env.ML_REFRESH_TOKEN || ""

  if (!clientId || !clientSecret || !refreshToken) {
    throw new MLTokenError(
      "Credenciais do Mercado Livre ausentes. Configure ML_CLIENT_ID, ML_CLIENT_SECRET e ML_REFRESH_TOKEN.",
    )
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  })

  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new MLTokenError(
      `Falha ao renovar o token do Mercado Livre (${res.status}). Verifique as credenciais/refresh token. Detalhe: ${txt.slice(0, 200)}`,
    )
  }

  const data = (await res.json()) as TokenResponse
  cache = {
    token: data.access_token,
    expiraEm: Date.now() + data.expires_in * 1000,
  }
  // ML rotaciona o refresh token a cada uso — guarda o novo para a próxima.
  if (data.refresh_token) refreshTokenAtual = data.refresh_token

  return data.access_token
}
