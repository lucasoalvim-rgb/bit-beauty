import { StoreShell } from "@/components/store-shell"
import { getProducts, CATEGORIES } from "@/lib/products"
import { getMagazines } from "@/lib/magazines"
import { getSessionUser, getDeliveryProfile } from "@/lib/auth"

export default async function Page() {
  const [products, magazines, user, profile] = await Promise.all([
    getProducts(),
    getMagazines(),
    getSessionUser(),
    getDeliveryProfile(),
  ])

  return (
    <StoreShell
      products={products}
      categories={CATEGORIES}
      magazines={magazines}
      initialUser={user}
      initialProfile={profile}
    />
  )
}
