"use client"

import { useCart } from "@/components/cart-context"
import { IconHome, IconBook, IconBag, IconCompass, IconUser } from "@/components/icons"

export function BottomNav({
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
    { key: "revistas", label: "Revistas", icon: IconBook },
    { key: "sacola", label: "Sacola", icon: IconBag },
    { key: "explorar", label: "Explorar", icon: IconCompass },
    { key: "login", label: isLoggedIn ? "Conta" : "Login", icon: IconUser },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-[var(--ink)] bg-white lg:hidden">
      <div className="mx-auto flex w-full max-w-md items-center justify-around px-2 py-2">
        {items.map((item) => {
          const on = tab === item.key
          const Icon = item.icon
          const isBag = item.key === "sacola"
          return (
            <button
              key={item.key}
              onClick={() => {
                if (isBag) {
                  onOpenBag()
                } else {
                  onChangeTab(item.key)
                  window.scrollTo({ top: 0 })
                }
              }}
              aria-label={item.label}
              aria-current={on ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 text-[10px] font-black uppercase tracking-wide transition-colors ${
                on ? "text-[var(--pink)]" : "text-[var(--ink)]/55"
              }`}
            >
              <span className="relative">
                <Icon className="h-6 w-6" />
                {isBag && count > 0 && (
                  <span className="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--pink)] px-1 text-[9px] font-black text-white ring-2 ring-white">
                    {count}
                  </span>
                )}
              </span>
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
