/** Esqueleto no formato da página, sem rodinha genérica. */
export default function Carregando() {
  return (
    <div aria-busy="true" aria-label="Carregando" className="flex animate-pulse flex-col gap-5">
      <div className="h-9 w-48 rounded-botao bg-linha" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-cartao bg-linha/70" />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 rounded-cartao bg-linha/60" />
      ))}
    </div>
  )
}
