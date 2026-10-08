/** Nome da loja como no logo: "Central" branco (ou preto no claro) e "Motos" vermelho. */
export function Marca({ claro = false, pequeno = false }: { claro?: boolean; pequeno?: boolean }) {
  return (
    <span className={`inline-flex items-baseline gap-1.5 font-extrabold uppercase tracking-tight ${pequeno ? 'text-lg' : 'text-2xl'}`}>
      <span className={claro ? 'text-tinta' : 'text-papel'}>Central</span>
      <span className="text-vermelho">Motos</span>
      <span className={`ml-1 rounded-selo px-1.5 py-0.5 text-[11px] font-bold tracking-wide ${claro ? 'bg-preto text-papel' : 'bg-papel/12 text-papel'}`}>
        PAINEL
      </span>
    </span>
  )
}
