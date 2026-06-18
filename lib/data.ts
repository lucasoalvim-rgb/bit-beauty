import type { CheckoutField, PayMethod } from "@/lib/types"

/* -- Imagens decorativas (hero, editorial) --------------------------------- */
export const IMAGES = {
  hero: "/beauty/hero-serum.png",
  lipstick: "/beauty/spot-lipstick.png",
  palette: "/beauty/spot-palette.png",
  serum: "/beauty/prod-serum.png",
  cream: "/beauty/prod-cream.png",
  blush: "/beauty/prod-blush.png",
  perfume: "/beauty/prod-perfume.png",
  mist: "/beauty/prod-mist.png",
}

export const SORTS = [
  { value: "relevance", label: "Relevância" },
  { value: "price-desc", label: "Maior preço" },
  { value: "price-asc", label: "Menor preço" },
  { value: "name", label: "Nome A–Z" },
]

/* -- Checkout ------------------------------------------------------------- */
export const CHECKOUT_STEPS: CheckoutField[] = [
  { key: "name", label: "Como podemos te chamar?", hint: "Seu nome completo", placeholder: "Maria Silva" },
  { key: "phone", label: "Seu WhatsApp", hint: "Pra avisar quando o pedido sair", placeholder: "(11) 99999-9999", type: "tel", inputMode: "tel" },
  { key: "cep", label: "Qual o seu CEP?", hint: "A gente preenche o resto", placeholder: "00000-000", inputMode: "numeric" },
  { key: "street", label: "Endereço de entrega", hint: "Rua e bairro", placeholder: "Av. das Flores, Jardim" },
  { key: "number", label: "Número e complemento", hint: "Apto, bloco, referência", placeholder: "123, apto 45", optional: false },
  { key: "payment", label: "Forma de pagamento", hint: "Você paga na entrega", placeholder: "" },
]

export const PAYMENTS: PayMethod[] = [
  { key: "pix", label: "Pix", kind: "flat", fee: 0 },
  { key: "credito", label: "Cartão de crédito", kind: "credit", fee: 0 },
  { key: "debito", label: "Cartão de débito", kind: "flat", fee: 2 },
  { key: "dinheiro", label: "Dinheiro", kind: "flat", fee: 0 },
]

export const MAX_INSTALLMENTS = 12
export const CREDIT_FEE_MIN = 5
export const CREDIT_FEE_MAX = 13
export const DELIVERY_FEE = 5
