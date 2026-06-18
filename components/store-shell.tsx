"use client"

import { useEffect, useMemo, useState } from "react"
import { CartProvider, useCart } from "@/components/cart-context"
import { SiteHeader } from "@/components/site-header"
import { HomeView } from "@/components/home-view"
import { ExploreView } from "@/components/explore-view"
import { RevistasView } from "@/components/revistas-view"
import { AuthView } from "@/components/auth-view"
import { SearchOverlay } from "@/components/search-overlay"
import { ProductModal } from "@/components/product-modal"
import { BagSheet } from "@/components/bag-sheet"
import { Checkout } from "@/components/checkout"
import { CartToast } from "@/components/cart-toast"
import { BottomNav } from "@/components/bottom-nav"
import { SideNav } from "@/components/side-nav"
import type { Product, Magazine } from "@/lib/types"
import type { SessionUser, DeliveryProfile } from "@/lib/auth"

/** Shell: liga todas as telas, overlays e o estado de navegação. */
function Shell({
  products,
  categories,
  magazines,
  initialUser,
  initialProfile,
}: {
  products: Product[]
  categories: string[]
  magazines: Magazine[]
  initialUser: SessionUser | null
  initialProfile: DeliveryProfile | null
}) {
  const { cart, total, addToCart } = useCart()

  const [tab, setTab] = useState("home")
  const [user, setUser] = useState<SessionUser | null>(initialUser)
  const [profile, setProfile] = useState<DeliveryProfile | null>(initialProfile)
  const [searchOpen, setSearchOpen] = useState(false)
  const [bagOpen, setBagOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)
  // Deep-link de revista: slug/página vindos da URL para abrir o leitor direto.
  const [deepMagazine, setDeepMagazine] = useState<{ slug: string; page: number } | null>(null)
  // Revista atualmente aberta no leitor (para refletir no título da aba).
  const [readingMagazine, setReadingMagazine] = useState<Magazine | null>(null)

  const inStock = useMemo(() => products.filter((p) => p.stock > 0), [products])

  // Título da aba do navegador: sempre "Vanira Batista | <contexto>".
  useEffect(() => {
    const base = "Vanira Batista"
    let context: string
    if (selected) context = selected.title
    else if (readingMagazine) context = `Revista ${readingMagazine.name}`
    else if (tab === "explorar") context = "Explorar produtos"
    else if (tab === "revistas") context = "Revistas"
    else if (tab === "login") context = user ? "Minha conta" : "Entrar"
    else context = "Produtos de beleza"
    document.title = `${base} | ${context}`
  }, [tab, selected, readingMagazine, user])

  // Deep-links: ?produto=<id> abre o modal do produto; ?revista=<slug>[&pagina=<n>]
  // abre a aba de revistas já no leitor. Roda uma vez na montagem e limpa a URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const produtoId = params.get("produto")
    const revistaSlug = params.get("revista")

    if (produtoId) {
      const p = products.find((x) => x.id === produtoId)
      if (p) setSelected(p)
    } else if (revistaSlug) {
      const page = Math.max(1, Number.parseInt(params.get("pagina") ?? "1", 10) || 1)
      setDeepMagazine({ slug: revistaSlug, page })
      setTab("revistas")
    }

    if (produtoId || revistaSlug) {
      // Remove os params para não reabrir ao navegar/atualizar.
      window.history.replaceState({}, "", window.location.pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSelect(p: Product) {
    setSelected(p)
  }

  function handleAdd(p: Product) {
    addToCart(p)
    setSelected(null)
  }

  // O onboarding do checkout já cria a conta a partir do nome + telefone,
  // então a finalização abre direto para todos.
  // Fecha a sacola primeiro e abre o checkout em seguida — os bottom-sheets
  // compartilham o history (pushState/back), então a transição precisa ser
  // sequencial para o back() da sacola não fechar o checkout recém-aberto.
  function startCheckout() {
    setBagOpen(false)
    setTimeout(() => setCheckoutOpen(true), 360)
  }

  function handleAuth(u: SessionUser) {
    setUser(u)
  }

  // Pós-pedido: a conta foi criada/autenticada e os dados de entrega salvos.
  function handleOrdered(u: SessionUser, delivery: DeliveryProfile) {
    setUser(u)
    setProfile(delivery)
  }

  function handleTab(key: string) {
    if (key === "sacola") {
      setBagOpen(true)
      return
    }
    setTab(key)
  }

  return (
    <div className="flex min-h-dvh w-full bg-[var(--pink)] text-[var(--ink)]">
      <SideNav tab={tab} isLoggedIn={!!user} onChangeTab={setTab} onOpenBag={() => setBagOpen(true)} />

      <div className="flex min-h-dvh w-full min-w-0 flex-col">
        <div className="lg:hidden">
          <SiteHeader onOpenBag={() => setBagOpen(true)} />
        </div>

        <main className="flex-1 pb-24 lg:pb-10">
          <div className="mx-auto w-full max-w-6xl">
            {tab === "home" && (
              <HomeView products={products} categories={categories} onOpenSearch={() => setSearchOpen(true)} onSelect={handleSelect} onSeeAll={() => setTab("explorar")} />
            )}
            {tab === "explorar" && <ExploreView products={products} onSelect={handleSelect} />}
            {tab === "revistas" && (
              <RevistasView
                magazines={magazines}
                openSlug={deepMagazine?.slug}
                openPage={deepMagazine?.page}
                onOpenedDeepLink={() => setDeepMagazine(null)}
                onReadingChange={setReadingMagazine}
              />
            )}
            {tab === "login" && (
              <AuthView
                user={user}
                profile={profile}
                onAuth={handleAuth}
                onLogout={() => {
                  setUser(null)
                  setProfile(null)
                }}
                onProfileChange={({ name, delivery }) => {
                  if (name && user) setUser({ ...user, name })
                  if (delivery) setProfile(delivery)
                }}
              />
            )}
          </div>
        </main>
      </div>

      <BottomNav tab={tab} isLoggedIn={!!user} onChangeTab={handleTab} onOpenBag={() => setBagOpen(true)} />

      <SearchOverlay
        open={searchOpen}
        products={inStock}
        onClose={() => setSearchOpen(false)}
        onSelect={(p) => {
          // Fecha a busca e abre o modal em seguida — os dois overlays
          // compartilham o history (pushState/back); abrir o modal no mesmo
          // tick faria o back() da busca fechá-lo. Serializa a transição.
          setSearchOpen(false)
          setTimeout(() => handleSelect(p), 360)
        }}
      />

      <ProductModal product={selected} onClose={() => setSelected(null)} onAdd={handleAdd} />

      <BagSheet open={bagOpen} onClose={() => setBagOpen(false)} onCheckout={startCheckout} />

      <Checkout
        open={checkoutOpen}
        total={total}
        lines={cart}
        profile={profile}
        isLoggedIn={!!user}
        onClose={() => setCheckoutOpen(false)}
        onOrdered={handleOrdered}
      />

      <CartToast onOpenBag={() => setBagOpen(true)} />
    </div>
  )
}

export function StoreShell({
  products,
  categories,
  magazines,
  initialUser,
  initialProfile,
}: {
  products: Product[]
  categories: string[]
  magazines: Magazine[]
  initialUser: SessionUser | null
  initialProfile: DeliveryProfile | null
}) {
  return (
    <CartProvider>
      <Shell
        products={products}
        categories={categories}
        magazines={magazines}
        initialUser={initialUser}
        initialProfile={initialProfile}
      />
    </CartProvider>
  )
}
