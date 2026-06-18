import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Poppins } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})
const poppins = Poppins({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['700', '800', '900'],
})

export const metadata: Metadata = {
  title: 'Vanira Batista | Produtos de beleza',
  description:
    'Skincare, maquiagem e perfumes selecionados. Descubra seu glow com a curadoria de Vanira Batista.',
  generator: 'v0.app',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f7e9e4',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} bg-background`}
    >
      <body className="font-sans antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body>
    </html>
  )
}
