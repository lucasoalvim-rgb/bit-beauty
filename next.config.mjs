/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig

// Integra o servidor de desenvolvimento do Next.js (`next dev`) com o adapter
// do Cloudflare, permitindo acessar bindings localmente. É seguro e aditivo:
// não altera o comportamento padrão do dev server.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"
initOpenNextCloudflareForDev()
