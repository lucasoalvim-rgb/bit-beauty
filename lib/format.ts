import { CREDIT_FEE_MIN, CREDIT_FEE_MAX, MAX_INSTALLMENTS } from "@/lib/data"

/** taxa (%) do crédito numa dada parcela — distribuída igualmente de 5% a 13% */
export function creditFee(n: number) {
  if (n <= 1) return CREDIT_FEE_MIN
  return CREDIT_FEE_MIN + ((n - 1) * (CREDIT_FEE_MAX - CREDIT_FEE_MIN)) / (MAX_INSTALLMENTS - 1)
}

/** formata valor com 2 casas em pt-BR */
export function money(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** máscara de telefone — mantém só dígitos e formata (xx) xxxxx-xxxx */
export function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ""
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Domínio do e-mail teórico usado no login por telefone. */
export const PHONE_EMAIL_DOMAIN = "local.mail"

/** Monta o e-mail teórico a partir de um telefone (só dígitos). */
export function emailFromPhone(phone: string) {
  return `${phone.replace(/\D/g, "")}@${PHONE_EMAIL_DOMAIN}`
}

/**
 * Extrai e formata o telefone de um e-mail teórico `{dígitos}@local.mail`.
 * Se não for um e-mail nesse formato, devolve o valor original.
 */
export function phoneFromEmail(email: string) {
  const m = email.match(/^(\d{10,11})@local\.mail$/i)
  return m ? maskPhone(m[1]) : email
}

/** máscara de CEP — 8 dígitos formatados como 00000-000 */
export function maskCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

/** CEP válido = exatamente 8 dígitos */
export function isValidCep(v: string) {
  return v.replace(/\D/g, "").length === 8
}

/**
 * Valida CPF pelo algoritmo dos dígitos verificadores.
 * Usado para avisar quando a pessoa digita um CPF no campo de CEP.
 */
export function isValidCpf(v: string) {
  const cpf = v.replace(/\D/g, "")
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false // todos os dígitos iguais
  const digits = cpf.split("").map(Number)
  let sum = 0
  for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i)
  let d1 = (sum * 10) % 11
  if (d1 === 10) d1 = 0
  if (d1 !== digits[9]) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += digits[i] * (11 - i)
  let d2 = (sum * 10) % 11
  if (d2 === 10) d2 = 0
  return d2 === digits[10]
}
