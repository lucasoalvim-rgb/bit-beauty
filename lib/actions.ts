"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { mapRow, PRODUCT_COLUMNS, PRODUCT_COLUMNS_LEGACY, isMissingBulkColumns } from "@/lib/products"
import type { SessionUser } from "@/lib/auth"
import type { Product, ProductRow } from "@/lib/types"

/**
 * Busca produtos diretamente no banco (não filtra resultados já carregados).
 * Aceita um termo de texto (nome/marca/categoria/descrição) e/ou uma categoria
 * de alto nível. A categoria é aplicada sobre o valor derivado em `mapRow`.
 */
export async function searchProducts(opts: {
  query?: string
  category?: string
}): Promise<Product[]> {
  const supabase = await createClient()
  const term = (opts.query ?? "").trim().replace(/[,()%]/g, " ").trim()

  const run = (columns: string) => {
    let q = supabase
      .from("products")
      .select(columns)
      .order("stock", { ascending: false })
      .order("name", { ascending: true })
    if (term) {
      const like = `%${term}%`
      q = q.or(`name.ilike.${like},brand.ilike.${like},category.ilike.${like},description.ilike.${like}`)
    }
    return q
  }

  let { data, error } = await run(PRODUCT_COLUMNS)
  if (error && isMissingBulkColumns(error.message)) {
    // Migração de promoção por quantidade ainda não rodou → usa colunas legadas.
    ;({ data, error } = await run(PRODUCT_COLUMNS_LEGACY))
  }

  if (error) {
    console.log("[v0] searchProducts error:", error.message)
    return []
  }

  let products = (data as unknown as ProductRow[]).map(mapRow)
  if (opts.category && opts.category !== "Tudo") {
    products = products.filter((p) => p.cat === opts.category)
  }
  return products
}

export type SubmitOrderInput = {
  customerName: string
  phone: string
  /** Senha escolhida no onboarding — obrigatória apenas para visitantes (1º registro). */
  password?: string
  cep?: string
  street?: string
  number?: string
  paymentMethod: string
  installments: number
  deliveryFee: number
  fee: number
  items: { product_id: string; qty: number }[]
}

export type SubmitOrderResult =
  | { ok: true; orderId: string; user: SessionUser }
  | { ok: false; error: string }

/** Apenas dígitos do telefone (base do e-mail/senha teóricos). */
function onlyDigits(s: string) {
  return s.replace(/\D/g, "")
}

/**
 * Cria (ou reaproveita) uma conta baseada no telefone — e-mail teórico
 * `{telefone}@local.mail`, já confirmado, sem validação de e-mail —, salva os
 * dados de entrega no perfil e finaliza o pedido dando baixa no estoque.
 */
export async function submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult> {
  if (!input.items.length) return { ok: false, error: "Sua sacola está vazia." }

  const name = input.customerName.trim()
  const digits = onlyDigits(input.phone)
  if (name.length < 2) return { ok: false, error: "Informe seu nome." }
  if (digits.length < 10) return { ok: false, error: "Informe um telefone válido com DDD." }

  const email = `${digits}@local.mail`
  const supabase = await createClient()

  // 1) Resolve a identidade do cliente.
  //    a) Já logado (sessão ativa) → usa a sessão, sem pedir senha (mesmo ao
  //       editar dados em compras futuras).
  //    b) Visitante → exige a senha escolhida no onboarding (1º registro):
  //       cria a conta se for nova, ou faz login se já existir.
  let userId: string
  const { data: sessionData } = await supabase.auth.getUser()

  if (sessionData.user) {
    userId = sessionData.user.id
  } else {
    const password = input.password ?? ""
    if (password.length < 6) {
      return { ok: false, error: "Crie uma senha com ao menos 6 caracteres." }
    }

    let signIn = await supabase.auth.signInWithPassword({ email, password })
    if (signIn.error) {
      // Conta não existe → cria já confirmada via service role.
      const admin = createAdminClient()
      const { error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name, phone: digits },
      })
      if (createErr) {
        if (/already|exists|registered/i.test(createErr.message)) {
          // Conta já existe e a senha digitada não confere.
          return { ok: false, error: "Já existe uma conta com este WhatsApp. Senha incorreta." }
        }
        console.log("[v0] createUser error:", createErr.message)
        return { ok: false, error: "Não foi possível criar sua conta." }
      }
      signIn = await supabase.auth.signInWithPassword({ email, password })
    }

    if (signIn.error || !signIn.data.user) {
      console.log("[v0] signIn error:", signIn.error?.message)
      return { ok: false, error: "Não foi possível autenticar sua conta." }
    }
    userId = signIn.data.user.id
  }

  // 2) Salva/atualiza os dados de entrega no perfil (para próximas compras).
  const { error: profileErr } = await supabase.from("profiles").upsert({
    id: userId,
    full_name: name,
    phone: digits,
    cep: input.cep ?? null,
    street: input.street ?? null,
    number: input.number ?? null,
  })
  if (profileErr) console.log("[v0] profile upsert error:", profileErr.message)

  // 3) Finaliza o pedido (autenticado → user_id = auth.uid()).
  const { data, error } = await supabase.rpc("place_order", {
    p_customer_name: name,
    p_phone: digits,
    p_cep: input.cep ?? null,
    p_street: input.street ?? null,
    p_number: input.number ?? null,
    p_payment_method: input.paymentMethod,
    p_installments: input.installments,
    p_delivery_fee: input.deliveryFee,
    p_fee: input.fee,
    p_items: input.items,
  })

  if (error) {
    console.log("[v0] submitOrder rpc error:", error.message)
    return { ok: false, error: error.message }
  }

  // Obs.: não chamamos revalidatePath("/") aqui de propósito — isso dispararia
  // um refresh do RSC e fecharia o bottom-sheet antes da tela de sucesso
  // (WhatsApp). O estoque é re-buscado no próximo carregamento da home.
  return {
    ok: true,
    orderId: data as string,
    user: { id: userId, name, email },
  }
}
