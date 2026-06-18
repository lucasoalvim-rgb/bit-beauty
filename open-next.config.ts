import { defineCloudflareConfig } from "@opennextjs/cloudflare"

// Configuração padrão do adapter Cloudflare. Para habilitar o cache incremental
// do Next.js com R2, adicione um bucket no wrangler.jsonc e configure o
// `incrementalCache` aqui (veja https://opennext.js.org/cloudflare/caching).
export default defineCloudflareConfig()
