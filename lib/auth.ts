import { createClient, hasSupabaseEnv } from "@/lib/supabase/server"

export type SessionUser = {
  id: string
  name: string
  email: string
}

/** Lê o usuário autenticado no servidor (ou null). */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!hasSupabaseEnv()) return null
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Cliente"

  return { id: user.id, name, email: user.email ?? "" }
}

export type DeliveryProfile = {
  name: string
  phone: string
  cep: string
  street: string
  number: string
}

/** Dados de entrega salvos no perfil, para pré-preencher o checkout. */
export async function getDeliveryProfile(): Promise<DeliveryProfile | null> {
  if (!hasSupabaseEnv()) return null
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("profiles")
    .select("full_name, phone, cep, street, number")
    .eq("id", user.id)
    .single()

  if (!data) return null
  return {
    name: data.full_name ?? "",
    phone: data.phone ?? "",
    cep: data.cep ?? "",
    street: data.street ?? "",
    number: data.number ?? "",
  }
}
