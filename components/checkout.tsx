"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { CartLine, CheckoutField } from "@/lib/types"
import type { SessionUser, DeliveryProfile } from "@/lib/auth"
import { CHECKOUT_STEPS, PAYMENTS, MAX_INSTALLMENTS, CREDIT_FEE_MIN, CREDIT_FEE_MAX, DELIVERY_FEE } from "@/lib/data"
import { creditFee, money, maskPhone, maskCep, isValidCpf } from "@/lib/format"
import { submitOrder } from "@/lib/actions"
import { Sheet } from "@/components/sheet"
import { useCart } from "@/components/cart-context"
import { IconBack, IconCheck, IconArrow } from "@/components/icons"

/** Número da loja (WhatsApp) — apenas dígitos, com código do país. */
const STORE_WHATSAPP = "5544998332306"

/**
 * autoComplete por campo do checkout. Os campos de senha recebem "off" porque
 * são renderizados como texto mascarado (o navegador não deve oferecer gerar
 * senha). Os campos de endereço recebem tokens semânticos para autopreenchimento
 * útil (mas nunca como credencial).
 */
const AUTOCOMPLETE_BY_KEY: Record<string, string> = {
  name: "name",
  phone: "tel",
  cep: "postal-code",
  street: "address-line1",
  number: "address-line2",
  password: "off",
  passwordConfirm: "off",
}

/** Um passo está "preenchido" quando seu valor já é válido (vindo do perfil). */
function isFieldFilled(key: string, data: Record<string, string>): boolean {
  if (key === "phone") {
    const d = (data.phone ?? "").replace(/\D/g, "")
    return d.length >= 10 && d.length <= 11
  }
  if (key === "cep") {
    return (data.cep ?? "").replace(/\D/g, "").length === 8
  }
  // Pagamento e senhas nunca são pulados — exigem ação do usuário.
  if (key === "payment" || key === "password" || key === "passwordConfirm") return false
  return (data[key] ?? "").trim().length > 1
}

/** Primeiro passo ainda não preenchido — pula os dados que já vêm do cadastro. */
function firstUnfilledStep(steps: CheckoutField[], data: Record<string, string>): number {
  for (let i = 0; i < steps.length; i++) {
    if (!isFieldFilled(steps[i].key, data)) return i
  }
  return 0
}

/** Checkout: onboarding de compra em passos */
export function Checkout({
  open,
  total,
  lines,
  profile,
  isLoggedIn,
  onClose,
  onOrdered,
}: {
  open: boolean
  total: number
  lines: CartLine[]
  profile: DeliveryProfile | null
  /** Usuário já autenticado → não pede senha (nem no 1º passo nem ao editar). */
  isLoggedIn: boolean
  onClose: () => void
  onOrdered: (user: SessionUser, delivery: DeliveryProfile) => void
}) {
  const { clearCart } = useCart()

  // Passos do onboarding. Visitantes (não logados) criam conta: inserimos a
  // senha + confirmação logo após o WhatsApp. Quem já está logado não vê esses
  // passos — nem ao editar dados em compras futuras.
  const steps = useMemo(() => {
    const base = [...CHECKOUT_STEPS]
    if (!isLoggedIn) {
      const phoneIdx = base.findIndex((f) => f.key === "phone")
      base.splice(phoneIdx + 1, 0,
        {
          key: "password",
          label: "Crie uma senha",
          hint: "Mínimo 6 caracteres — você usará para entrar depois",
          placeholder: "••••••",
          type: "password",
        },
        {
          key: "passwordConfirm",
          label: "Repita a senha",
          hint: "Confirme para não errar",
          placeholder: "••••••",
          type: "password",
        },
      )
    }
    return base
  }, [isLoggedIn])

  const [step, setStep] = useState(0)
  const [data, setData] = useState<Record<string, string>>({})
  const [payKey, setPayKey] = useState("")
  const [installments, setInstallments] = useState(1)
  const [done, setDone] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [orderError, setOrderError] = useState("")
  const [waText, setWaText] = useState("")
  const [orderName, setOrderName] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(false)
  const usedExpress = useRef(false)

  // Perfil "completo" = todos os dados de entrega já salvos de uma compra
  // anterior (ou login prévio). Nesse caso mostramos uma confirmação rápida.
  const profileComplete = !!(
    profile?.name &&
    profile.phone &&
    profile.cep &&
    profile.street &&
    profile.number
  )
  const paymentIndex = steps.length - 1

  // Reseta o fluxo APENAS na transição fechado→aberto. Não pode depender de
  // `profile` porque ele é atualizado ao concluir o pedido (pós-login), o que
  // reabriria o passo 1 e apagaria a tela de sucesso.
  useEffect(() => {
    if (open && !wasOpen.current) {
      const initialData: Record<string, string> = profile
        ? {
            name: profile.name,
            phone: profile.phone ? maskPhone(profile.phone) : "",
            cep: profile.cep,
            street: profile.street,
            number: profile.number,
          }
        : {}
      setData(initialData)
      // Começa no primeiro passo ainda não preenchido — pula nome/telefone (etc.)
      // que já vieram do cadastro/perfil, em vez de pedir tudo de novo.
      setStep(firstUnfilledStep(steps, initialData))
      setPayKey("")
      setInstallments(1)
      setDone(false)
      setConfirming(profileComplete)
      usedExpress.current = false
      setSubmitting(false)
      setOrderError("")
      setWaText("")
      setOrderName("")
    }
    wasOpen.current = open
  }, [open, profile, profileComplete, steps])

  const field = steps[step]
  const isLast = step === steps.length - 1
  const value = data[field?.key] ?? ""
  const isPayStep = field?.key === "payment"
  const isPasswordField = field?.key === "password" || field?.key === "passwordConfirm"
  const phoneDigits = (data.phone ?? "").replace(/\D/g, "")
  const phoneValid = phoneDigits.length >= 10 && phoneDigits.length <= 11
  const cepDigits = (data.cep ?? "").replace(/\D/g, "")
  const cepValid = cepDigits.length === 8
  const cepLooksLikeCpf = cepDigits.length === 11 && isValidCpf(cepDigits)
  const passwordValid = (data.password ?? "").length >= 6
  const passwordsMatch = (data.passwordConfirm ?? "") === (data.password ?? "")
  const canAdvance = isPayStep
    ? !!payKey
    : field?.key === "phone"
      ? phoneValid
      : field?.key === "cep"
        ? cepValid
        : field?.key === "password"
          ? passwordValid
          : field?.key === "passwordConfirm"
            ? passwordValid && passwordsMatch
            : field?.optional
              ? true
              : value.trim().length > 1

  const method = PAYMENTS.find((p) => p.key === payKey)
  const feePct = method ? (method.kind === "credit" ? creditFee(installments) : method.fee) : 0
  const feeAmount = total * (feePct / 100)
  const subtotal = total + feeAmount
  const finalTotal = subtotal + DELIVERY_FEE

  function pickInstallments(n: number) {
    setInstallments(n)
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    })
  }

  useEffect(() => {
    if (isPayStep) scrollRef.current?.scrollTo({ top: 0 })
  }, [isPayStep, step])

  function setValue(v: string) {
    setData((d) => {
      let val = v
      if (field.key === "phone") val = maskPhone(v)
      else if (field.key === "cep") {
        // Permite digitar at�� 11 dígitos para detectar CPF; formata como CEP
        // (00000-000) enquanto estiver em 8 dígitos ou menos.
        const digits = v.replace(/\D/g, "").slice(0, 11)
        val = digits.length <= 8 ? maskCep(digits) : digits
      }
      return { ...d, [field.key]: val }
    })
  }

  /** Monta a mensagem pré-pronta do pedido para enviar no WhatsApp. */
  function buildWhatsappText(orderId: string) {
    const payLabel = `${method?.label ?? ""}${method?.kind === "credit" ? ` ${installments}x` : ""}`
    const itemLines = lines
      .map((l) => `• ${l.qty}x ${l.product.title} — R$${money(l.qty * l.product.price)}`)
      .join("\n")
    const address =
      data.street || data.number || data.cep
        ? `\n*Entrega*\nCEP: ${data.cep || "-"}\nEndereço: ${[data.street, data.number].filter(Boolean).join(", ") || "-"}`
        : ""

    return (
      `*Novo pedido — Vanira Batista*\n` +
      `Pedido #${orderId.slice(0, 8)}\n\n` +
      `*Cliente*\nNome: ${data.name}\nTelefone: ${data.phone}` +
      `${address}\n\n` +
      `*Itens*\n${itemLines}\n\n` +
      `*Pagamento*\nForma: ${payLabel}\n` +
      `Subtotal: R$${money(subtotal)}\n` +
      `Entrega: R$${money(DELIVERY_FEE)}\n` +
      `*Total: R$${money(finalTotal)}*`
    )
  }

  function openWhatsapp() {
    const url = `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(waText)}`
    // Em iframe (preview), abrir em nova aba; caso contrário, na própria aba.
    if (typeof window !== "undefined" && window.self !== window.top) {
      window.open(url, "_blank", "noopener,noreferrer")
    } else {
      window.open(url, "_blank")
    }
  }

  async function next() {
    if (isLast) {
      if (submitting) return
      setOrderError("")
      setSubmitting(true)
      const result = await submitOrder({
        customerName: data.name?.trim() || "Cliente",
        phone: data.phone ?? "",
        password: data.password,
        cep: data.cep,
        street: data.street,
        number: data.number,
        paymentMethod: `${method?.label ?? payKey}${method?.kind === "credit" ? ` ${installments}x` : ""}`,
        installments: method?.kind === "credit" ? installments : 1,
        deliveryFee: DELIVERY_FEE,
        fee: feeAmount,
        items: lines.map((l) => ({ product_id: l.product.id, qty: l.qty })),
      })
      setSubmitting(false)
      if (!result.ok) {
        setOrderError(result.error)
        return
      }
      // Mensagem do WhatsApp montada ANTES de limpar a sacola.
      setWaText(buildWhatsappText(result.orderId))
      setOrderName(data.name ?? "")
      onOrdered(result.user, {
        name: data.name ?? "",
        phone: phoneDigits,
        cep: data.cep ?? "",
        street: data.street ?? "",
        number: data.number ?? "",
      })
      clearCart()
      setDone(true)
      return
    }
    setStep((s) => s + 1)
  }

  // "Usar estes dados": pula direto para o pagamento.
  function useSavedData() {
    usedExpress.current = true
    setConfirming(false)
    setStep(paymentIndex)
  }

  // "Editar dados": segue o fluxo passo a passo desde o início.
  function editData() {
    usedExpress.current = false
    setConfirming(false)
    setStep(0)
  }

  function back() {
    // Veio pela confirmação rápida → volta para ela em vez dos passos.
    if (usedExpress.current && step === paymentIndex) {
      setConfirming(true)
      return
    }
    if (step === 0) {
      onClose()
      return
    }
    setStep((s) => s - 1)
  }

  return (
    <Sheet open={open} onClose={onClose} size="lg">
      {done ? (
        <div className="flex flex-col items-center justify-center gap-4 px-8 py-14 text-center">
          <div className="glow-pop flex h-20 w-20 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--accent)] text-[var(--ink)]">
            <IconCheck className="h-10 w-10" />
          </div>
          <h3 className="glow-serif text-3xl font-black text-[var(--ink)]">Pedido confirmado!</h3>
          <p className="text-sm font-medium leading-relaxed text-[var(--ink)]/60">
            Obrigada, {orderName?.split(" ")[0] || "linda"}! Para concluir, envie o resumo do seu pedido para a loja no
            WhatsApp.
          </p>
          <button
            onClick={openWhatsapp}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-4 text-base font-black uppercase tracking-wide text-[var(--ink)] ring-2 ring-[var(--ink)] transition-transform active:scale-95"
          >
            Enviar pedido via WhatsApp
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-full border-2 border-[var(--ink)] bg-white px-6 py-3.5 text-sm font-black uppercase tracking-wide text-[var(--ink)] transition-transform active:scale-95"
          >
            Voltar à loja
          </button>
        </div>
      ) : confirming ? (
        <div className="flex flex-col px-6 pb-6 pt-4">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--pink)]">Confirme seus dados</p>
          <h3 className="glow-serif mt-1 text-[28px] font-black leading-tight text-[var(--ink)]">
            Olá de novo, {profile?.name?.split(" ")[0] || "linda"}!
          </h3>
          <p className="mt-1 text-sm font-medium text-[var(--ink)]/50">
            Estes são os dados da sua última compra. Estão certos?
          </p>

          <dl className="mt-6 flex flex-col gap-3 rounded-[1.25rem] border-2 border-[var(--ink)] bg-white px-5 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[11px] font-black uppercase tracking-wide text-[var(--ink)]/45">Nome</dt>
              <dd className="text-right text-sm font-bold text-[var(--ink)]">{profile?.name}</dd>
            </div>
            <div className="h-px bg-[var(--ink)]/10" />
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[11px] font-black uppercase tracking-wide text-[var(--ink)]/45">WhatsApp</dt>
              <dd className="text-right text-sm font-bold text-[var(--ink)]">
                {profile?.phone ? maskPhone(profile.phone) : ""}
              </dd>
            </div>
            <div className="h-px bg-[var(--ink)]/10" />
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[11px] font-black uppercase tracking-wide text-[var(--ink)]/45">Entrega</dt>
              <dd className="text-right text-sm font-bold text-[var(--ink)]">
                {[profile?.street, profile?.number].filter(Boolean).join(", ")}
                {profile?.cep ? <span className="block font-medium text-[var(--ink)]/50">CEP {profile.cep}</span> : null}
              </dd>
            </div>
          </dl>

          <button
            onClick={useSavedData}
            className="group mt-6 flex w-full items-center justify-between rounded-full bg-[var(--ink)] px-6 py-4 text-left text-white transition-transform active:scale-95"
          >
            <span className="text-base font-black uppercase tracking-wide">Usar estes dados</span>
            <IconArrow className="h-6 w-6 transition-transform group-active:translate-x-1" />
          </button>
          <button
            onClick={editData}
            className="mt-3 w-full rounded-full border-2 border-[var(--ink)] bg-white px-6 py-3.5 text-sm font-black uppercase tracking-wide text-[var(--ink)] transition-transform active:scale-95"
          >
            Editar dados
          </button>
        </div>
      ) : (
        <>
          {/* Topo: voltar + barra de progresso */}
          <div className="flex items-center gap-3 px-5 pb-4 pt-1">
            <button
              aria-label="Voltar"
              onClick={back}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-white text-[var(--ink)] transition-transform active:scale-90"
            >
              <IconBack className="h-5 w-5" />
            </button>
            <div className="flex flex-1 gap-1.5">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-colors ${i <= step ? "bg-[var(--ink)]" : "bg-[var(--ink)]/15"}`}
                />
              ))}
            </div>
          </div>

          {/* Conteúdo do passo */}
          <div
            ref={scrollRef}
            className="flex flex-1 flex-col overflow-y-auto px-6 pb-4 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--pink)]">
              passo {step + 1} de {steps.length}
            </p>
            <h3 className="glow-serif mt-1 text-[28px] font-black leading-tight text-[var(--ink)]">{field.label}</h3>
            <p className="mt-1 text-sm font-medium text-[var(--ink)]/50">{field.hint}</p>

            <div className="mt-6">
              {isPayStep ? (
                <div className="flex flex-col gap-2.5">
                  {PAYMENTS.map((p) => {
                    const on = payKey === p.key
                    return (
                      <div key={p.key}>
                        <button
                          onClick={() => {
                            setPayKey(p.key)
                            setInstallments(1)
                          }}
                          className={`flex w-full items-center justify-between rounded-2xl border-2 border-[var(--ink)] px-5 py-4 text-left text-base font-bold transition-colors ${
                            on ? "bg-[var(--ink)] text-white" : "bg-white text-[var(--ink)]"
                          }`}
                        >
                          <span className="flex flex-col">
                            {p.label}
                            {p.kind === "flat" && p.fee > 0 && (
                              <span className={`text-[11px] font-bold ${on ? "text-white/60" : "text-[var(--ink)]/50"}`}>
                                taxa {p.fee}% &bull; à vista
                              </span>
                            )}
                            {p.kind === "credit" && (
                              <span className={`text-[11px] font-bold ${on ? "text-white/60" : "text-[var(--ink)]/50"}`}>
                                em até {MAX_INSTALLMENTS}x &bull; {CREDIT_FEE_MIN}% a {CREDIT_FEE_MAX}%
                              </span>
                            )}
                          </span>
                          {on && <IconCheck className="h-5 w-5 flex-shrink-0" />}
                        </button>

                        {on && p.kind === "credit" && (
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            {Array.from({ length: MAX_INSTALLMENTS }, (_, i) => i + 1).map((n) => {
                              const perInstallment = (total * (1 + creditFee(n) / 100) + DELIVERY_FEE) / n
                              const sel = installments === n
                              return (
                                <button
                                  key={n}
                                  onClick={() => pickInstallments(n)}
                                  className={`flex flex-col items-center rounded-xl border-2 border-[var(--ink)] px-1 py-2 transition-colors ${
                                    sel ? "bg-[var(--accent)] text-[var(--ink)]" : "bg-white text-[var(--ink)]"
                                  }`}
                                >
                                  <span className="text-sm font-black">{n}x</span>
                                  <span className="text-[10px] font-bold leading-tight text-[var(--ink)]/50">
                                    de R${money(perInstallment)}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {payKey && (
                    <div className="mt-3 flex flex-col gap-1.5 rounded-2xl border-2 border-[var(--ink)] bg-white px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--pink)]">Resumo</p>
                      {lines.map((l) => (
                        <div key={l.product.id} className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="min-w-0 flex-1 font-bold text-[var(--ink)] text-pretty">
                            {l.product.title} <span className="text-[var(--ink)]/50">- {l.qty}x</span>
                          </span>
                          <span className="flex-shrink-0 font-black text-[var(--ink)]">
                            = R${money(l.qty * l.product.price)}
                          </span>
                        </div>
                      ))}
                      <div className="my-1 h-px bg-[var(--ink)]/10" />
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate font-bold text-[var(--ink)]">
                          Taxa {method?.label}
                          {method?.kind === "credit" ? (
                            <span className="text-[var(--ink)]/50"> {installments}x</span>
                          ) : null}
                        </span>
                        <span className="flex-shrink-0 font-black text-[var(--ink)]">
                          {feeAmount > 0 ? `+ R$${money(feeAmount)}` : "grátis"}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="font-bold text-[var(--ink)]">Taxa de entrega</span>
                        <span className="flex-shrink-0 font-black text-[var(--ink)]">+ R${money(DELIVERY_FEE)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <input
                    autoFocus
                    // Campos de senha são renderizados como "text" + mascaramento
                    // CSS para que o navegador NÃO os identifique como credencial
                    // e, assim, não ofereça gerar/sugerir senha (nem contamine os
                    // passos seguintes, como CEP). Demais campos mantêm o tipo real.
                    type={isPasswordField ? "text" : (field.type ?? "text")}
                    inputMode={field.inputMode}
                    // autoComplete explícito por campo: evita que o navegador
                    // trate CEP/rua/número como parte de um formulário de login.
                    autoComplete={AUTOCOMPLETE_BY_KEY[field.key] ?? "off"}
                    autoCorrect="off"
                    autoCapitalize={field.key === "name" ? "words" : "off"}
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    name={`bb-${field.key}`}
                    style={isPasswordField ? ({ WebkitTextSecurity: "disc" } as React.CSSProperties) : undefined}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canAdvance) next()
                    }}
                    placeholder={field.placeholder}
                    className="w-full rounded-2xl border-2 border-[var(--ink)] bg-white px-5 py-4 text-lg font-bold text-[var(--ink)] placeholder:text-[var(--ink)]/30 focus:outline-none focus:ring-4 focus:ring-[var(--accent)]"
                  />
                  {field.key === "phone" && phoneDigits.length > 0 && !phoneValid && (
                    <p className="mt-2 px-1 text-xs font-bold text-[var(--pink)]">
                      O número precisa ter 10 ou 11 dígitos (DDD + número).
                    </p>
                  )}
                  {field.key === "password" && (data.password ?? "").length > 0 && !passwordValid && (
                    <p className="mt-2 px-1 text-xs font-bold text-[var(--pink)]">
                      A senha precisa ter ao menos 6 caracteres.
                    </p>
                  )}
                  {field.key === "passwordConfirm" && (data.passwordConfirm ?? "").length > 0 && !passwordsMatch && (
                    <p className="mt-2 px-1 text-xs font-bold text-[var(--pink)]">
                      As senhas não conferem.
                    </p>
                  )}
                  {field.key === "cep" && cepLooksLikeCpf && (
                    <p className="mt-2 px-1 text-xs font-bold text-[var(--pink)]">
                      Isso parece um CPF, não um CEP. Confira e digite seu CEP (8 dígitos).
                    </p>
                  )}
                  {field.key === "cep" && !cepLooksLikeCpf && cepDigits.length > 8 && (
                    <p className="mt-2 px-1 text-xs font-bold text-[var(--pink)]">
                      O CEP precisa ter 8 dígitos.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Rodapé: valor final + avançar */}
          <div className="mt-1 px-6 pb-2">
            {orderError && (
              <p className="mb-2 rounded-xl border-2 border-[var(--pink)] bg-[var(--pink)]/10 px-4 py-2.5 text-sm font-bold text-[var(--pink)]">
                {orderError}
              </p>
            )}
            <div className="flex items-center gap-3 rounded-[1.25rem] border-2 border-[var(--ink)] bg-[var(--accent)] px-5 py-3">
              <span className="text-xs font-black uppercase tracking-wide text-[var(--ink)]/70">
                {isPayStep ? "Valor final" : "Total"}
              </span>
              <span className="ml-auto text-xl font-black text-[var(--ink)]">
                R${money(isPayStep ? finalTotal : total)}
              </span>
            </div>
          </div>
          <button
            disabled={!canAdvance || submitting}
            onClick={next}
            className="group flex w-full items-center justify-between bg-[var(--ink)] px-6 py-5 text-left text-white transition-all active:bg-[var(--pink)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <span className="text-base font-black uppercase tracking-wide">
              {submitting ? "Processando…" : isLast ? "Confirmar pedido" : "Continuar"}
            </span>
            <IconArrow className="h-6 w-6 transition-transform group-active:translate-x-1" />
          </button>
        </>
      )}
    </Sheet>
  )
}
