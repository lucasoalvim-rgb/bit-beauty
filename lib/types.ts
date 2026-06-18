export type Product = {
  id: string
  image: string
  title: string
  brand: string
  price: number
  oldPrice?: number | null
  /** Promoção por quantidade: quantidade mínima para o preço promocional. */
  bulkMinQty?: number | null
  /** Promoção por quantidade: preço por unidade ao atingir bulkMinQty. */
  bulkUnitPrice?: number | null
  /** Selo livre vindo da coluna `badge` do banco (ex.: "glow pick"). */
  badge?: string | null
  desc: string
  cat: string
  volume?: string | null
  stock: number
  /** Produto ativo no catálogo. `false` => removido/indisponível para compra. */
  active: boolean
  tags?: string[]
}

/** Linha crua da tabela `products` no Supabase. */
export type ProductRow = {
  id: string
  name: string
  brand: string | null
  category: string | null
  price: string | number
  old_price: string | number | null
  bulk_min_qty: number | null
  bulk_unit_price: string | number | null
  stock: number | null
  badge: string | null
  image: string | null
  description: string | null
  volume: string | null
  is_active?: boolean | null
}

/** Revista exibida no leitor. As páginas vivem no CDN em /revistas/{slug}/NNNN.jpg */
export type Magazine = {
  id: string
  name: string
  brand: string
  cycle: string | null
  /** Nome da pasta no CDN (ex.: "revista1"). */
  slug: string
  /** Nº de páginas declarado no banco. `null` => descobrir por sondagem. */
  pages: number | null
  /** Data de publicação (ISO) vinda de `created_at`. */
  createdAt: string | null
}

/** Linha crua da tabela `magazines` no Supabase. */
export type MagazineRow = {
  id: string
  name: string
  brand: string | null
  cycle: string | null
  pdf_url: string | null
  slug?: string | null
  pages?: number | null
  created_at?: string | null
}

export type CartLine = { product: Product; qty: number }

export type CheckoutField = {
  key: string
  label: string
  hint: string
  placeholder: string
  type?: string
  inputMode?: "text" | "tel" | "numeric"
  optional?: boolean
}

export type PayMethod = { key: string; label: string; kind: "flat" | "credit"; fee: number }
