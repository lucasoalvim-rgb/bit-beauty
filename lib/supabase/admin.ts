import { createClient } from "@supabase/supabase-js"

/**
 * Cliente Supabase com service role — USO EXCLUSIVO no servidor.
 * Permite criar contas já confirmadas (sem validação de e-mail).
 * Nunca importe este arquivo em código client-side.
 */
export function createAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error("Supabase service role não configurado.")
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
