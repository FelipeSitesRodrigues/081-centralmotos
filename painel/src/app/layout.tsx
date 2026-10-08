import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { connection } from 'next/server'
import './globals.css'

// Mesma Manrope da vitrine, cortada nos caracteres do português (scripts/baixar-fontes.mjs).
// Arquivo local: o build não depende do Google Fonts responder.
const manrope = localFont({
  src: './fontes/manrope-var.woff2',
  weight: '400 800',
  variable: '--fonte-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'Painel Central Motos', template: '%s · Painel Central Motos' },
  description: 'Painel da loja: estoque, fotos e publicação do site.',
  robots: { index: false, follow: false, nocache: true },
  icons: { icon: '/icone.svg' },
  formatDetection: { telephone: false, email: false, address: false, date: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b0b0d',
}

export default async function RaizDoPainel({ children }: { children: React.ReactNode }) {
  // O nonce da CSP muda a cada request: nenhuma página do painel pode ser estática
  await connection()

  return (
    <html lang="pt-BR" className={manrope.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
