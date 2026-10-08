/**
 * Lighthouse local no Chrome da máquina, celular e computador, com o resumo no terminal
 * (base do 080). O servidor local (scripts/servir.mjs) comprime como a Vercel, então o
 * peso medido é o que o celular baixa. Relatórios em revisao/lighthouse/<modo>-<nome>.json.
 *
 *   node scripts/lighthouse.mjs [celular|computador|ambos] [rota]
 *   node scripts/lighthouse.mjs ambos /estoque
 *   METODO=devtools node scripts/lighthouse.mjs celular /   (limitação real, não simulada)
 *
 * benchmarkIndex: a velocidade da CPU medida antes do teste. Abaixo de 1.500 a máquina
 * está ocupada e a nota de celular não vale (memória do 076 e do 080).
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'

const modo = process.argv[2] || 'ambos'
const semGit = (s) => {
  const t = s.replace(/\\/g, '/')
  return /^[A-Za-z]:\//.test(t) ? t.replace(/^.*?\/Git(\/|$)/i, '/') : s
}
const rota = semGit(process.argv[3] || '/')
const BASE = (process.env.BASE_URL ?? 'http://localhost:4081').replace(/\/$/, '')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const nome = rota === '/' ? 'home' : rota.replace(/^\/|\/$/g, '').replace(/[^a-z0-9]+/gi, '-').slice(0, 60)
mkdirSync('revisao/lighthouse', { recursive: true })

for (const m of modo === 'ambos' ? ['celular', 'computador'] : [modo]) {
  const saida = `revisao/lighthouse/${m}-${nome}.json`
  const args = ['node_modules/lighthouse/cli/index.js', BASE + rota, '--quiet', '--output=json', `--output-path=${saida}`, '--chrome-flags=--headless=new --no-first-run', '--only-categories=performance,accessibility,best-practices,seo']
  if (m === 'computador') args.push('--preset=desktop')
  if (process.env.METODO) args.push(`--throttling-method=${process.env.METODO}`)
  try {
    execFileSync(process.execPath, args, { env: { ...process.env, CHROME_PATH: CHROME }, stdio: 'ignore' })
  } catch {
    // No Windows o Lighthouse às vezes falha ao apagar a pasta temporária do Chrome depois de gravar: o relatório fica
  }
  const r = JSON.parse(readFileSync(saida, 'utf8'))
  const a = r.audits
  const bench = Math.round(r.environment?.benchmarkIndex || 0)
  const aviso = bench && bench < 1500 ? '  (MÁQUINA OCUPADA: nota não confiável)' : ''
  console.log(`\n${m.toUpperCase()} ${rota}  ` + Object.values(r.categories).map((c) => `${c.id} ${Math.round(c.score * 100)}`).join(' · ') + `  · CPU ${bench}${aviso}`)
  console.log('  ' + ['first-contentful-paint', 'largest-contentful-paint', 'speed-index', 'total-blocking-time', 'cumulative-layout-shift'].map((k) => `${k.split('-').map((p) => p[0]).join('').toUpperCase()} ${a[k].displayValue}`).join(' · '))
  // A pintura de verdade, sem a simulação: se ela cai em ~2,3 s com a rede já terminada, é a máquina, não a página
  const obs = a.metrics?.details?.items?.[0] ?? {}
  console.log(`  observada (sem simular): 1ª pintura ${Math.round(obs.observedFirstContentfulPaint ?? 0)} ms · LCP ${Math.round(obs.observedLargestContentfulPaint ?? 0)} ms · load ${Math.round(obs.observedLoad ?? 0)} ms`)
  const ruins = Object.entries(a).filter(([, x]) => x.score !== null && x.score < 0.9 && !['informative', 'notApplicable', 'manual'].includes(x.scoreDisplayMode))
  for (const [id, x] of ruins) console.log(`  x ${id} (${x.score}) ${x.displayValue || ''}`)
}
