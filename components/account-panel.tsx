"use client"

import { useEffect, useState } from "react"
import type { SessionUser, DeliveryProfile } from "@/lib/auth"
import { getMyOrders, updateProfileName, updateAddress, type Order } from "@/lib/account-actions"
import { money, maskPhone, maskCep, phoneFromEmail } from "@/lib/format"
import { IconChevron, IconBack, IconBag } from "@/components/icons"

type Panel = "menu" | "orders" | "address" | "settings"

const STATUS_LABELS: Record<string, string> = {
  pending: "Em processamento",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
  } catch {
    return iso
  }
}

export function AccountPanel({
  user,
  profile,
  onProfileChange,
  onLogout,
}: {
  user: SessionUser
  profile: DeliveryProfile | null
  onProfileChange: (p: { name?: string; delivery?: DeliveryProfile }) => void
  onLogout: () => void
}) {
  const [panel, setPanel] = useState<Panel>("menu")

  if (panel === "orders") return <OrdersPanel onBack={() => setPanel("menu")} />
  if (panel === "address")
    return <AddressPanel profile={profile} user={user} onSaved={(d) => onProfileChange({ delivery: d })} onBack={() => setPanel("menu")} />
  if (panel === "settings")
    return <SettingsPanel user={user} onSaved={(name) => onProfileChange({ name })} onBack={() => setPanel("menu")} />

  return (
    <div className="mx-auto max-w-2xl px-5 pb-8 pt-6 lg:px-8 lg:pt-8">
      <div className="rounded-[1.75rem] border-2 border-[var(--ink)] bg-[var(--ink)] p-6 text-white">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">Minha conta</p>
        <div className="mt-4 flex items-center gap-4">
          <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-[var(--accent)] text-2xl font-black text-[var(--ink)]">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="glow-serif truncate text-2xl font-black leading-tight text-white">{user.name}</p>
            <p className="truncate text-sm font-semibold text-white/70">{phoneFromEmail(user.email)}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        {(
          [
            { key: "orders", label: "Meus pedidos" },
            { key: "address", label: "Endereços" },
            { key: "settings", label: "Configurações" },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            onClick={() => setPanel(item.key)}
            className="flex items-center justify-between rounded-2xl border-2 border-[var(--ink)] bg-white px-5 py-4 text-left text-base font-extrabold text-[var(--ink)] transition-colors active:bg-[var(--accent)]"
          >
            {item.label}
            <IconChevron className="h-4 w-4 -rotate-90 text-[var(--ink)]" />
          </button>
        ))}
      </div>
      <button
        onClick={onLogout}
        className="mt-5 w-full rounded-full border-2 border-[var(--ink)] bg-white py-3.5 text-sm font-black uppercase tracking-wide text-[var(--ink)] transition-transform active:scale-95"
      >
        Sair da conta
      </button>
    </div>
  )
}

function PanelHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 px-5 pb-4 pt-6">
      <button
        onClick={onBack}
        aria-label="Voltar"
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-white text-[var(--ink)] transition-transform active:scale-90"
      >
        <IconBack className="h-5 w-5" />
      </button>
      <h2 className="glow-serif text-2xl font-black text-[var(--ink)]">{title}</h2>
    </div>
  )
}

function OrdersPanel({ onBack }: { onBack: () => void }) {
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    getMyOrders().then(setOrders)
  }, [])

  return (
    <div className="mx-auto max-w-2xl pb-8 lg:px-8 lg:pt-2">
      <PanelHeader title="Meus pedidos" onBack={onBack} />
      <div className="flex flex-col gap-3 px-5">
        {orders === null && (
          <p className="rounded-2xl border-2 border-[var(--ink)] bg-white px-5 py-6 text-center text-sm font-bold text-[var(--ink)]/60">
            Carregando…
          </p>
        )}
        {orders !== null && orders.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-[var(--ink)] bg-white px-5 py-10 text-center">
            <IconBag className="h-10 w-10 text-[var(--ink)]/40" />
            <p className="text-base font-extrabold text-[var(--ink)]">Nenhum pedido ainda</p>
            <p className="text-sm font-semibold text-[var(--ink)]/60">Quando você comprar, seus pedidos aparecem aqui.</p>
          </div>
        )}
        {orders?.map((o) => {
          const open = openId === o.id
          const count = o.items.reduce((s, it) => s + it.qty, 0)
          return (
            <div key={o.id} className="overflow-hidden rounded-2xl border-2 border-[var(--ink)] bg-white">
              <button
                onClick={() => setOpenId(open ? null : o.id)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[var(--pink)]">
                    {formatDate(o.createdAt)}
                  </p>
                  <p className="mt-0.5 text-base font-extrabold text-[var(--ink)]">
                    {count} {count === 1 ? "item" : "itens"} · R${money(o.total)}
                  </p>
                  <span className="mt-1 inline-block rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-black uppercase text-[var(--ink)]">
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </div>
                <IconChevron className={`h-4 w-4 flex-shrink-0 text-[var(--ink)] transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <div className="border-t-2 border-[var(--ink)] px-5 py-4">
                  <ul className="flex flex-col gap-2">
                    {o.items.map((it) => (
                      <li key={it.id} className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="min-w-0 flex-1 font-bold text-[var(--ink)] text-pretty">
                          {it.productName} <span className="text-[var(--ink)]/50">- {it.qty}x</span>
                        </span>
                        <span className="flex-shrink-0 font-black text-[var(--ink)]">R${money(it.unitPrice * it.qty)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-col gap-1 border-t-2 border-dashed border-[var(--ink)]/20 pt-3 text-sm">
                    <Row label="Subtotal" value={`R$${money(o.subtotal)}`} />
                    {o.deliveryFee > 0 && <Row label="Entrega" value={`R$${money(o.deliveryFee)}`} />}
                    {o.fee > 0 && <Row label="Taxa do cartão" value={`R$${money(o.fee)}`} />}
                    <div className="mt-1 flex items-center justify-between font-black text-[var(--ink)]">
                      <span>Total</span>
                      <span>R${money(o.total)}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-[var(--ink)]/60">
                    Pagamento: {o.paymentMethod}
                  </p>
                  {o.street && (
                    <p className="mt-1 text-xs font-semibold text-[var(--ink)]/60">
                      Entrega: {o.street}, {o.number} · {o.cep}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[var(--ink)]/70">
      <span className="font-semibold">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  inputMode?: "text" | "numeric" | "tel"
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="px-1 text-xs font-black uppercase tracking-wider text-[var(--ink)]">{label}</span>
      <input
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border-2 border-[var(--ink)] bg-white px-5 py-4 text-base font-bold text-[var(--ink)] placeholder:font-semibold placeholder:text-[var(--ink)]/40 focus:outline-none focus:ring-4 focus:ring-[var(--accent)]"
      />
    </label>
  )
}

function AddressPanel({
  profile,
  user,
  onSaved,
  onBack,
}: {
  profile: DeliveryProfile | null
  user: SessionUser
  onSaved: (d: DeliveryProfile) => void
  onBack: () => void
}) {
  const [phone, setPhone] = useState(maskPhone(profile?.phone ?? ""))
  const [cep, setCep] = useState(maskCep(profile?.cep ?? ""))
  const [street, setStreet] = useState(profile?.street ?? "")
  const [number, setNumber] = useState(profile?.number ?? "")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")
  const [err, setErr] = useState("")

  async function save() {
    setErr("")
    setMsg("")
    setSaving(true)
    const res = await updateAddress({ phone, cep, street, number })
    setSaving(false)
    if (!res.ok) {
      setErr(res.error)
      return
    }
    setMsg("Endereço salvo!")
    onSaved({ name: profile?.name ?? user.name, phone: phone.replace(/\D/g, ""), cep, street, number })
  }

  return (
    <div className="mx-auto max-w-2xl pb-8 lg:px-8 lg:pt-2">
      <PanelHeader title="Endereços" onBack={onBack} />
      <div className="flex flex-col gap-4 px-5">
        <Field label="WhatsApp" value={phone} onChange={(v) => setPhone(maskPhone(v))} placeholder="(00) 00000-0000" inputMode="tel" />
        <Field label="CEP" value={cep} onChange={(v) => setCep(maskCep(v))} placeholder="00000-000" inputMode="numeric" />
        <Field label="Rua" value={street} onChange={setStreet} placeholder="Rua, avenida…" />
        <Field label="Número" value={number} onChange={setNumber} placeholder="123" inputMode="numeric" />

        {err && (
          <p className="rounded-xl border-2 border-[var(--pink)] bg-[var(--pink)]/10 px-4 py-2.5 text-sm font-bold text-[var(--pink)]">{err}</p>
        )}
        {msg && (
          <p className="rounded-xl border-2 border-[var(--ink)] bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-[var(--ink)]">{msg}</p>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="mt-1 w-full rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] py-4 text-sm font-black uppercase tracking-wide text-white transition-transform active:scale-95 disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Salvar endereço"}
        </button>
      </div>
    </div>
  )
}

function SettingsPanel({
  user,
  onSaved,
  onBack,
}: {
  user: SessionUser
  onSaved: (name: string) => void
  onBack: () => void
}) {
  const [name, setName] = useState(user.name)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")
  const [err, setErr] = useState("")

  async function save() {
    setErr("")
    setMsg("")
    setSaving(true)
    const res = await updateProfileName(name)
    setSaving(false)
    if (!res.ok) {
      setErr(res.error)
      return
    }
    setMsg("Nome atualizado!")
    onSaved(name.trim())
  }

  return (
    <div className="mx-auto max-w-2xl pb-8 lg:px-8 lg:pt-2">
      <PanelHeader title="Configurações" onBack={onBack} />
      <div className="flex flex-col gap-4 px-5">
        <Field label="Nome" value={name} onChange={setName} placeholder="Seu nome" />
        <label className="flex flex-col gap-2">
          <span className="px-1 text-xs font-black uppercase tracking-wider text-[var(--ink)]">Telefone</span>
          <input
            value={phoneFromEmail(user.email)}
            disabled
            className="w-full cursor-not-allowed rounded-2xl border-2 border-[var(--ink)]/30 bg-[var(--ink)]/5 px-5 py-4 text-base font-bold text-[var(--ink)]/50"
          />
        </label>

        {err && (
          <p className="rounded-xl border-2 border-[var(--pink)] bg-[var(--pink)]/10 px-4 py-2.5 text-sm font-bold text-[var(--pink)]">{err}</p>
        )}
        {msg && (
          <p className="rounded-xl border-2 border-[var(--ink)] bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-[var(--ink)]">{msg}</p>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="mt-1 w-full rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] py-4 text-sm font-black uppercase tracking-wide text-white transition-transform active:scale-95 disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>
    </div>
  )
}
