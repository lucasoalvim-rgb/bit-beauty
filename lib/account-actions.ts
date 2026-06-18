"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { emailFromPhone } from "@/lib/format"

export type OrderItem = {
  id: string
  productId: string
  productName: string
  unitPrice: number
  qty: number
}

export type Order = {
  id: string
  createdAt: string
  status: string
  customerName: string
  phone: string
  cep: string | null
  street: string | null
  number: string | null
  paymentMethod: string
  installments: number
  subtotal: number
  fee: number
  deliveryFee: number
  total: number
  items: OrderItem[]
}

/** Lista os pedidos do usuário autenticado (mais recentes primeiro). */
export async function getMyOrders(): Promise<Order[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id,created_at,status,customer_name,phone,cep,street,number,payment_method,installments,subtotal,fee,delivery_fee,total,order_items(id,product_id,product_name,unit_price,qty)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.log("[v0] getMyOrders error:", error.message)
    return []
  }

  return (data ?? []).map((o: any) => ({
    id: o.id,
    createdAt: o.created_at,
    status: o.status,
    customerName: o.customer_name,
    phone: o.phone,
    cep: o.cep,
    street: o.street,
    number: o.number,
    paymentMethod: o.payment_method,
    installments: o.installments,
    subtotal: Number(o.subtotal),
    fee: Number(o.fee),
    deliveryFee: Number(o.delivery_fee),
    total: Number(o.total),
    items: (o.order_items ?? []).map((it: any) => ({
      id: it.id,
      productId: it.product_id,
      productName: it.product_name,
      unitPrice: Number(it.unit_price),
      qty: it.qty,
    })),
  }))
}

export type AccountResult = { ok: true } | { ok: false; error: string }

/**
 * Cria uma conta a partir do telefone — e-mail teórico `{dígitos}@local.mail`,
 * já confirmado (sem validação de e-mail). Após o sucesso, o cliente faz o
 * login com a mesma senha. Não cria sessão aqui.
 */
export async function registerWithPhone(input: {
  name: string
  phone: string
  password: string
}): Promise<AccountResult> {
  const name = input.name.trim()
  const digits = input.phone.replace(/\D/g, "")
  if (name.length < 2) return { ok: false, error: "Informe seu nome." }
  if (digits.length < 10) return { ok: false, error: "Informe um telefone válido com DDD." }
  if (input.password.length < 6) return { ok: false, error: "A senha precisa ter ao menos 6 caracteres." }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email: emailFromPhone(digits),
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: name, phone: digits },
  })
  if (error) {
    if (/already|exists|registered/i.test(error.message)) {
      return { ok: false, error: "Já existe uma conta com este telefone." }
    }
    console.log("[v0] registerWithPhone error:", error.message)
    return { ok: false, error: "Não foi possível criar sua conta." }
  }

  // Cria o registro de perfil (ignora erro — não bloqueia o cadastro).
  if (data.user) {
    const { error: profErr } = await admin
      .from("profiles")
      .upsert({ id: data.user.id, full_name: name, phone: digits })
    if (profErr) console.log("[v0] registerWithPhone profile error:", profErr.message)
  }

  return { ok: true }
}

/** Atualiza o nome do usuário (perfil + metadados de auth). */
export async function updateProfileName(name: string): Promise<AccountResult> {
  const trimmed = name.trim()
  if (trimmed.length < 2) return { ok: false, error: "Informe seu nome." }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Você precisa estar logada." }

  const { error: profErr } = await supabase
    .from("profiles")
    .upsert({ id: user.id, full_name: trimmed })
  if (profErr) {
    console.log("[v0] updateProfileName profile error:", profErr.message)
    return { ok: false, error: "Não foi possível salvar o nome." }
  }

  const { error: authErr } = await supabase.auth.updateUser({
    data: { full_name: trimmed },
  })
  if (authErr) console.log("[v0] updateProfileName auth error:", authErr.message)

  return { ok: true }
}

export type AddressInput = {
  phone: string
  cep: string
  street: string
  number: string
}

/** Atualiza o endereço de entrega salvo no perfil. */
export async function updateAddress(input: AddressInput): Promise<AccountResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Você precisa estar logada." }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    phone: input.phone.replace(/\D/g, "") || null,
    cep: input.cep.trim() || null,
    street: input.street.trim() || null,
    number: input.number.trim() || null,
  })
  if (error) {
    console.log("[v0] updateAddress error:", error.message)
    return { ok: false, error: "Não foi possível salvar o endereço." }
  }
  return { ok: true }
}
