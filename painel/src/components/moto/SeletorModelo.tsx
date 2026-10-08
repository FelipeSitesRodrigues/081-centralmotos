'use client'

import { useState, useTransition } from 'react'
import { cadastrarMarca, cadastrarModelo } from '@/lib/acoes/motos'
import { lerInteiro } from '@/lib/numeros'
import { CATEGORIAS } from '@/lib/rotulos'
import { Aviso, Botao } from '@/components/ui'
import { CampoSelect, CampoTexto, opcoesDe } from './campos'

export type MarcaCatalogo = { id: number; nome: string; ativa: boolean }
export type ModeloCatalogo = { id: number; marca_id: number; nome: string; categoria: string; cilindrada: number | null; ativa: boolean }

/**
 * Marca e modelo, com "não achei, cadastrar" na hora: o modelo novo entra no
 * catálogo e já fica escolhido.
 */
export function SeletorModelo({
  marcas,
  modelos,
  marcaId,
  modeloId,
  aoEscolherMarca,
  aoEscolherModelo,
  aoCriarMarca,
  aoCriarModelo,
  erro,
}: {
  marcas: MarcaCatalogo[]
  modelos: ModeloCatalogo[]
  marcaId: string
  modeloId: string
  aoEscolherMarca: (id: string) => void
  aoEscolherModelo: (modelo: ModeloCatalogo | null) => void
  aoCriarMarca: (marca: MarcaCatalogo) => void
  aoCriarModelo: (modelo: ModeloCatalogo) => void
  erro?: string
}) {
  const [criando, setCriando] = useState<'nada' | 'marca' | 'modelo'>('nada')
  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('')
  const [cilindrada, setCilindrada] = useState('')
  const [erroCadastro, setErroCadastro] = useState<{ geral?: string; campos?: Record<string, string> }>({})
  const [salvando, iniciar] = useTransition()

  const opcoesMarca = marcas.filter((m) => m.ativa || String(m.id) === marcaId).map((m) => ({ valor: String(m.id), rotulo: m.nome }))
  const doMarca = modelos
    .filter((m) => String(m.marca_id) === marcaId && (m.ativa || String(m.id) === modeloId))
    .map((m) => ({ valor: String(m.id), rotulo: m.nome }))

  function abrir(qual: 'marca' | 'modelo') {
    setCriando(qual)
    setNome('')
    setCategoria('')
    setCilindrada('')
    setErroCadastro({})
  }

  function cadastrar() {
    setErroCadastro({})
    iniciar(async () => {
      if (criando === 'marca') {
        const r = await cadastrarMarca({ nome })
        if (!r.ok) return setErroCadastro({ geral: r.erro, campos: r.campos })
        aoCriarMarca(r.marca)
        // Marca nova não tem modelo: já abre o cadastro do modelo
        abrir('modelo')
        return
      }
      const r = await cadastrarModelo({ marca_id: Number(marcaId), nome, categoria: categoria || null, cilindrada: lerInteiro(cilindrada) })
      if (!r.ok) return setErroCadastro({ geral: r.erro, campos: r.campos })
      aoCriarModelo(r.modelo)
      setCriando('nada')
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoSelect
          id="marca"
          rotulo="Marca"
          valor={marcaId}
          opcoes={opcoesMarca}
          aoMudar={(v) => {
            aoEscolherMarca(v)
            if (criando === 'modelo') setCriando('nada')
          }}
        />
        <CampoSelect
          id="modelo"
          rotulo="Modelo"
          valor={modeloId}
          opcoes={doMarca}
          vazio={marcaId ? 'Escolha o modelo' : 'Escolha a marca antes'}
          desligado={!marcaId}
          erro={erro}
          aoMudar={(v) => aoEscolherModelo(modelos.find((m) => String(m.id) === v) ?? null)}
        />
      </div>

      {criando === 'nada' && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {marcaId && (
            <button type="button" onClick={() => abrir('modelo')} className="min-h-11 font-bold text-tinta underline underline-offset-4">
              Não achei o modelo
            </button>
          )}
          <button type="button" onClick={() => abrir('marca')} className="min-h-11 font-bold text-tinta underline underline-offset-4">
            Não achei a marca
          </button>
        </div>
      )}

      {criando !== 'nada' && (
        <div className="flex flex-col gap-4 rounded-cartao border border-linha-forte bg-gelo p-4">
          <p className="font-extrabold">
            {criando === 'marca' ? 'Cadastrar marca' : `Cadastrar modelo ${marcas.find((m) => String(m.id) === marcaId)?.nome ?? ''}`}
          </p>
          {erroCadastro.geral && <Aviso>{erroCadastro.geral}</Aviso>}
          <CampoTexto
            id="catalogo-nome"
            rotulo={criando === 'marca' ? 'Nome da marca' : 'Nome do modelo'}
            valor={nome}
            aoMudar={setNome}
            erro={erroCadastro.campos?.nome}
            placeholder={criando === 'marca' ? 'Ex.: Mottu' : 'Ex.: CG 160 Titan'}
            maxLength={criando === 'marca' ? 40 : 60}
            autoComplete="off"
          />
          {criando === 'modelo' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoSelect
                id="catalogo-categoria"
                rotulo="Tipo"
                valor={categoria}
                opcoes={opcoesDe(CATEGORIAS)}
                aoMudar={setCategoria}
                erro={erroCadastro.campos?.categoria}
              />
              <CampoTexto
                id="catalogo-cilindrada"
                rotulo="Cilindrada"
                valor={cilindrada}
                aoMudar={(v) => setCilindrada(v.replace(/\D/g, '').slice(0, 4))}
                erro={erroCadastro.campos?.cilindrada}
                inputMode="numeric"
                sufixo="cc"
                opcional
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Botao variante="escuro" onClick={cadastrar} disabled={salvando}>
              {salvando ? 'Cadastrando...' : 'Cadastrar'}
            </Botao>
            <Botao variante="fantasma" onClick={() => setCriando('nada')} disabled={salvando}>
              Cancelar
            </Botao>
          </div>
        </div>
      )}
    </div>
  )
}
