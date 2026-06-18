"use client"

import { useState } from "react"
import type { SessionUser, DeliveryProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/client"
import { registerWithPhone } from "@/lib/account-actions"
import { maskPhone, emailFromPhone } from "@/lib/format"
import { AccountPanel } from "@/components/account-panel"

export function AuthView({
  user,
  profile = null,
  onAuth,
  onLogout,
  onProfileChange,
  pendingCheckout = false,
}: {
  user: SessionUser | null
  profile?: DeliveryProfile | null
  onAuth: (u: SessionUser) => void
  onLogout: () => void
  onProfileChange?: (p: { name?: string; delivery?: DeliveryProfile }) => void
  pendingCheckout?: boolean
}) {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [pass, setPass] = useState("")
  const [passConfirm, setPassConfirm] = useState("")
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [loading, setLoading] = useState(false)

  const phoneDigits = phone.replace(/\D/g, "")
  const phoneOk = phoneDigits.length >= 10 && phoneDigits.length <= 11

  async function submit() {
    setError("")
    setInfo("")
    if (mode === "register" && name.trim().length < 2) return setError("Digite seu nome.")
    if (!phoneOk) return setError("Informe um telefone válido com DDD.")
    if (pass.length < 6) return setError("A senha precisa ter ao menos 6 dígitos.")
    if (mode === "register" && pass !== passConfirm) return setError("As senhas não conferem.")

    const supabase = createClient()
    const email = emailFromPhone(phoneDigits)
    setLoading(true)
    try {
      if (mode === "register") {
        // Cria a conta confirmada no servidor (e-mail teórico via telefone)…
        const res = await registerWithPhone({ name: name.trim(), phone: phoneDigits, password: pass })
        if (!res.ok) {
          setError(res.error)
          return
        }
        // …e em seguida autentica no cliente.
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password: pass })
        if (err || !data.user) {
          setInfo("Conta criada! Agora entre com seu telefone e senha.")
          setMode("login")
          return
        }
        onAuth({ id: data.user.id, name: name.trim(), email: data.user.email ?? email })
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password: pass })
        if (err) {
          setError("Telefone ou senha incorretos.")
          return
        }
        const u = data.user
        const fullName = (u.user_metadata?.full_name as string | undefined) ?? "Cliente"
        onAuth({ id: u.id, name: fullName, email: u.email ?? email })
      }
    } catch (e) {
      console.log("[v0] auth error:", e)
      setError("Algo deu errado. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    onLogout()
  }

  // já logado: mostra o perfil com as áreas funcionais (pedidos, endereços…)
  if (user) {
    return (
      <AccountPanel
        user={user}
        profile={profile}
        onProfileChange={(p) => onProfileChange?.(p)}
        onLogout={logout}
      />
    )
  }

  return (
    <div className="mx-auto max-w-lg px-5 pb-8 pt-6 lg:px-8 lg:pt-8">
      {pendingCheckout && (
        <div className="mb-4 rounded-[1.25rem] border-2 border-[var(--ink)] bg-[var(--accent)] px-5 py-4">
          <p className="text-sm font-black uppercase tracking-wide text-[var(--ink)]">Quase lá!</p>
          <p className="mt-0.5 text-sm font-semibold leading-relaxed text-[var(--ink)]/75">
            Entre ou crie sua conta para finalizar a compra. Sua sacola está salva.
          </p>
        </div>
      )}
      <div className="rounded-[1.75rem] border-2 border-[var(--ink)] bg-[var(--ink)] px-6 py-7 text-white">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">
          {mode === "login" ? "Entrar" : "Nova conta"}
        </p>
        <h2 className="glow-serif mt-2 text-[34px] font-black leading-[1.05] text-white text-balance">
          {mode === "login" ? "Bem-vinda de volta" : "Crie sua conta"}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-white/75">
          {mode === "login"
            ? "Entre com seu telefone para acompanhar pedidos e favoritos."
            : "É rápido e você ganha glow points no primeiro pedido."}
        </p>
      </div>

      <div className="mt-5 flex gap-1.5 rounded-full border-2 border-[var(--ink)] bg-white p-1.5">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m)
              setError("")
              setInfo("")
            }}
            className={`flex-1 rounded-full py-2.5 text-sm font-black uppercase tracking-wide transition-colors ${
              mode === m ? "bg-[var(--ink)] text-white" : "bg-transparent text-[var(--ink)]/70"
            }`}
          >
            {m === "login" ? "Entrar" : "Registrar"}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {mode === "register" && (
          <label className="flex flex-col gap-2">
            <span className="px-1 text-xs font-black uppercase tracking-wider text-[var(--ink)]">Nome</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Maria Silva"
              autoComplete="name"
              className="w-full rounded-2xl border-2 border-[var(--ink)] bg-white px-5 py-4 text-base font-bold text-[var(--ink)] placeholder:font-semibold placeholder:text-[var(--ink)]/40 focus:outline-none focus:ring-4 focus:ring-[var(--accent)]"
            />
          </label>
        )}
        <label className="flex flex-col gap-2">
          <span className="px-1 text-xs font-black uppercase tracking-wider text-[var(--ink)]">Telefone</span>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
            placeholder="(00) 00000-0000"
            autoComplete="tel"
            className="w-full rounded-2xl border-2 border-[var(--ink)] bg-white px-5 py-4 text-base font-bold text-[var(--ink)] placeholder:font-semibold placeholder:text-[var(--ink)]/40 focus:outline-none focus:ring-4 focus:ring-[var(--accent)]"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="px-1 text-xs font-black uppercase tracking-wider text-[var(--ink)]">Senha</span>
          <input
            // No login mantemos type=password (autofill de senha salva é
            // desejável). No registro, renderizamos como texto mascarado para o
            // navegador não sugerir/gerar uma senha automaticamente.
            type={mode === "login" ? "password" : "text"}
            style={mode === "register" ? ({ WebkitTextSecurity: "disc" } as React.CSSProperties) : undefined}
            autoComplete={mode === "login" ? "current-password" : "off"}
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && mode === "login") submit()
            }}
            placeholder="mínimo 6 dígitos"
            className="w-full rounded-2xl border-2 border-[var(--ink)] bg-white px-5 py-4 text-base font-bold text-[var(--ink)] placeholder:font-semibold placeholder:text-[var(--ink)]/40 focus:outline-none focus:ring-4 focus:ring-[var(--accent)]"
          />
        </label>
        {mode === "register" && (
          <label className="flex flex-col gap-2">
            <span className="px-1 text-xs font-black uppercase tracking-wider text-[var(--ink)]">Repita a senha</span>
            <input
              // Texto mascarado (não type=password) para evitar a sugestão de
              // senha do navegador no fluxo de cadastro.
              type="text"
              style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              value={passConfirm}
              onChange={(e) => setPassConfirm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit()
              }}
              placeholder="digite a senha novamente"
              className="w-full rounded-2xl border-2 border-[var(--ink)] bg-white px-5 py-4 text-base font-bold text-[var(--ink)] placeholder:font-semibold placeholder:text-[var(--ink)]/40 focus:outline-none focus:ring-4 focus:ring-[var(--accent)]"
            />
          </label>
        )}

        {error && (
          <p className="rounded-xl border-2 border-[var(--ink)] bg-[var(--ink)]/10 px-4 py-2.5 text-sm font-bold text-[var(--ink)]">
            {error}
          </p>
        )}
        {info && (
          <p className="rounded-xl border-2 border-[var(--ink)] bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-[var(--ink)]">
            {info}
          </p>
        )}

        <button
          onClick={submit}
          disabled={loading}
          className="mt-1 w-full rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] py-4 text-sm font-black uppercase tracking-wide text-white transition-transform active:scale-95 disabled:opacity-60"
        >
          {loading ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
        </button>
        <p className="text-center text-sm font-semibold text-[var(--ink)]/70">
          {mode === "login" ? "Ainda não tem conta? " : "Já tem conta? "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login")
              setError("")
              setInfo("")
            }}
            className="font-black text-[var(--ink)] underline decoration-2 underline-offset-2"
          >
            {mode === "login" ? "Registre-se" : "Entrar"}
          </button>
        </p>
      </div>
    </div>
  )
}
