export type EnrichStatus = "pendente" | "ok" | "nao_encontrado" | "erro"

// Um anúncio/produto candidato retornado pelo Mercado Livre.
export type MLCandidate = {
  id: string
  nome: string | null
  marca: string | null
  imagens: string[] // galeria completa do anúncio (todas as fotos)
  preco: number | null // preço médio dos anúncios desse produto
  permalink: string | null
  exato: boolean // true se veio do match exato por código de barras (EAN)
}

// Resultado da consulta de um EAN: uma lista de candidatos para escolher.
export type EnrichResult = {
  ean: string
  status: EnrichStatus
  candidatos: MLCandidate[]
  mensagem?: string | null
}

// Bindings de ambiente do Worker (definidos via `wrangler secret put`).
export type Env = {
  ML_CLIENT_ID: string
  ML_CLIENT_SECRET: string
  ML_REFRESH_TOKEN: string
}
