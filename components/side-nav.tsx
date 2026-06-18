"use client"

import { useCart } from "@/components/cart-context"
import { IconHome, IconBook, IconBag, IconCompass, IconUser } from "@/components/icons"

/** Sidebar de navegação — exibida apenas no desktop (lg+). */
export function SideNav({
  tab,
  isLoggedIn,
  onChangeTab,
  onOpenBag,
}: {
  tab: string
  isLoggedIn: boolean
  onChangeTab: (key: string) => void
  onOpenBag: () => void
}) {
  const { count } = useCart()

  const items = [
    { key: "home", label: "Home", icon: IconHome },
    { key: "explorar", label: "Explorar", icon: IconCompass },
    { key: "revistas", label: "Revistas", icon: IconBook },
    { key: "login", label: isLoggedIn ? "Conta" : "Login", icon: IconUser },
  ]

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r-2 border-[var(--ink)] bg-white lg:flex">
      <div className="px-6 pt-8 pb-6 leading-none">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--ink)]/60">produtos de beleza</p>
        <h1 className="glow-serif mt-1 text-[26px] font-black tracking-tight text-[var(--ink)]">Vanira Batista</h1>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 px-4">
        {items.map((item) => {
          const on = tab === item.key
          const Icon = item.icon
          return (
            <button
              key={item.key}
              onClick={() => {
                onChangeTab(item.key)
                window.scrollTo({ top: 0 })
              }}
              aria-current={on ? "page" : undefined}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-wide transition-colors ${
                on ? "bg-[var(--ink)] text-white" : "text-[var(--ink)]/70 hover:bg-[var(--accent)]/40"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="px-4 pb-6">
        <button
          onClick={onOpenBag}
          aria-label="Abrir sacola"
          className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-[var(--ink)] bg-[var(--ink)] px-4 py-3 text-sm font-black uppercase tracking-wide text-[var(--pink)] transition-transform active:scale-95"
        >
          <span className="flex items-center gap-3">
            <IconBag className="h-5 w-5" />
            Sacola
          </span>
          {count > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-xs font-black text-[var(--ink)]">
              {count}
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}
