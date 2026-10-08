'use client'

import { DotsThree, X } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { Botao } from '@/components/ui'
import type { Status } from '@/lib/rotulos'

type Acao = { para: Status | 'excluir'; rotulo: string; confirmar?: string; perigo?: boolean }

/** O que dá pra fazer em cada situação (as mesmas transições que o banco aceita). */
function acoesDe(status: Status, jaFoiPublicada: boolean): Acao[] {
  const arquivar: Acao = {
    para: 'arquivado',
    rotulo: 'Arquivar',
    confirmar: 'Ela sai do site e da lista principal, e fica guardada em Arquivadas. Dá pra restaurar depois.',
  }
  const tirarDoAr: Acao = {
    para: 'rascunho',
    rotulo: 'Tirar do ar',
    confirmar: 'Ela sai do site e volta pra Rascunhos. O endereço da página continua o mesmo quando publicar de novo.',
  }
  const vender: Acao = {
    para: 'vendido',
    rotulo: 'Marcar como vendida',
    confirmar: 'Ela sai das listas do site na hora. A página dela fica 30 dias no ar com o aviso “já foi vendida”.',
  }
  const excluir: Acao = {
    para: 'excluir',
    rotulo: 'Excluir de vez',
    perigo: true,
    confirmar: 'A moto e todas as fotos somem de vez. Não dá pra desfazer.',
  }

  switch (status) {
    case 'rascunho':
      return jaFoiPublicada ? [arquivar] : [arquivar, excluir]
    case 'publicado':
      return [{ para: 'reservado', rotulo: 'Reservar' }, vender, tirarDoAr, arquivar]
    case 'reservado':
      return [vender, { para: 'publicado', rotulo: 'Liberar a reserva' }, tirarDoAr, arquivar]
    case 'vendido':
      return [{ para: 'publicado', rotulo: 'Desfazer a venda', confirmar: 'Ela volta pro site como moto à venda.' }, arquivar]
    case 'arquivado':
      return [{ para: 'rascunho', rotulo: 'Restaurar como rascunho' }, excluir]
  }
}

export function BarraAcoes({
  status,
  jaFoiPublicada,
  sujo,
  ocupado,
  aoSalvar,
  aoPublicar,
  aoMudar,
}: {
  status: Status
  jaFoiPublicada: boolean
  sujo: boolean
  ocupado: boolean
  aoSalvar: () => void
  aoPublicar: () => void
  aoMudar: (para: Status | 'excluir') => void
}) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const [confirmando, setConfirmando] = useState<Acao | null>(null)
  const acoes = acoesDe(status, jaFoiPublicada)

  const fechar = () => {
    dialogo.current?.close()
    setConfirmando(null)
  }

  function escolher(acao: Acao) {
    if (acao.confirmar) return setConfirmando(acao)
    fechar()
    aoMudar(acao.para)
  }

  return (
    <>
      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 mt-2 border-t border-linha bg-papel/95 px-4 py-3 backdrop-blur md:bottom-0 md:mx-0 md:rounded-cartao md:border">
        <div className="flex items-center gap-2">
          <Botao
            variante="secundario"
            onClick={() => dialogo.current?.showModal()}
            disabled={ocupado}
            aria-haspopup="dialog"
            className="px-3"
            aria-label="Mais ações"
          >
            <DotsThree size={26} weight="bold" aria-hidden />
          </Botao>
          <div className="ml-auto flex flex-1 justify-end gap-2">
            {status === 'rascunho' ? (
              <>
                <Botao variante="secundario" onClick={aoSalvar} disabled={ocupado || !sujo} className="flex-1 sm:flex-none">
                  {sujo ? 'Salvar rascunho' : 'Salvo'}
                </Botao>
                <Botao variante="principal" onClick={aoPublicar} disabled={ocupado} className="flex-1 sm:flex-none">
                  Publicar
                </Botao>
              </>
            ) : (
              <Botao variante="principal" onClick={aoSalvar} disabled={ocupado || !sujo} className="flex-1 sm:flex-none">
                {sujo ? 'Salvar alterações' : 'Tudo salvo'}
              </Botao>
            )}
          </div>
        </div>
      </div>

      <dialog
        ref={dialogo}
        onClose={() => setConfirmando(null)}
        aria-labelledby="titulo-acoes"
        className="m-0 mt-auto w-full max-w-none rounded-t-cartao bg-papel p-0 text-tinta backdrop:bg-preto/55 sm:m-auto sm:max-w-md sm:rounded-cartao"
      >
        <div className="flex items-center justify-between border-b border-linha px-4 py-3">
          <h2 id="titulo-acoes" className="text-lg font-extrabold">
            {confirmando ? confirmando.rotulo : 'Mais ações'}
          </h2>
          <button type="button" onClick={fechar} className="flex size-11 items-center justify-center rounded-botao hover:bg-tinta/5" aria-label="Fechar">
            <X size={22} weight="bold" aria-hidden />
          </button>
        </div>

        {confirmando ? (
          <div className="flex flex-col gap-4 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <p className="text-tinta-2">{confirmando.confirmar}</p>
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Botao
                variante={confirmando.perigo ? 'perigo' : 'escuro'}
                onClick={() => {
                  const para = confirmando.para
                  fechar()
                  aoMudar(para)
                }}
                className="flex-1"
              >
                {confirmando.rotulo}
              </Botao>
              <Botao variante="fantasma" onClick={() => setConfirmando(null)} className="flex-1">
                Voltar
              </Botao>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
            {acoes.map((acao) => (
              <li key={acao.para}>
                <button
                  type="button"
                  onClick={() => escolher(acao)}
                  className={`flex min-h-12 w-full items-center rounded-botao px-3 text-left font-bold hover:bg-tinta/5 ${acao.perigo ? 'text-erro' : ''}`}
                >
                  {acao.rotulo}
                </button>
              </li>
            ))}
          </ul>
        )}
      </dialog>
    </>
  )
}
