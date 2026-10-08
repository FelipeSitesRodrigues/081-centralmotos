import { BotaoLink } from '@/components/ui'

export default function MotoNaoEncontrada() {
  return (
    <div className="flex flex-col items-start gap-4 rounded-cartao border border-linha bg-papel p-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Essa moto não existe mais</h1>
      <p className="text-tinta-2">Ela pode ter sido excluída em outro aparelho, ou o endereço está incompleto.</p>
      <BotaoLink href="/estoque" variante="escuro">
        Voltar pro estoque
      </BotaoLink>
    </div>
  )
}
