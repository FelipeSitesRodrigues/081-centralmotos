import path from 'node:path'
import type { NextConfig } from 'next'

// Raiz do monorepo (npm workspaces): node_modules e o pacote compartilhado moram lá
const raiz = path.join(__dirname, '..')

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // O pacote compartilhado tem os tipos do banco em TypeScript
  transpilePackages: ['@central/vitrine'],
  turbopack: { root: raiz },
  outputFileTracingRoot: raiz,
  // Nada passa pelo otimizador de imagem da Vercel (a cota acabou na 057 e as fotos sumiram)
  images: { unoptimized: true },
  // Só os ícones usados entram no pacote
  experimental: { optimizePackageImports: ['@phosphor-icons/react'] },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ]
  },
}

export default config
