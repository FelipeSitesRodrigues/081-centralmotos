/*
 * Filtro, busca, ordem e paginação do /estoque (seção 8.4 do plano).
 * - O HTML já tem as 24 primeiras motos; este script só entra quando há filtro.
 * - O estoque.json baixa depois do carregamento (ou no primeiro toque num filtro),
 *   fora da janela do LCP.
 * - O estado fica na URL (?condicao=0km&marca=honda&pagina=2): voltar e compartilhar
 *   funcionam.
 * O cartão é o mesmo de compartilhado/vitrine/card-moto.mjs, montado aqui com todo
 * texto escapado.
 */
;(function () {
  var form = document.querySelector('[data-filtros-form]')
  var lista = document.querySelector('[data-lista]')
  if (!form || !lista) return
  var detalhes = document.querySelector('[data-filtros]')
  var contagem = document.querySelector('[data-contagem]')
  var nada = document.querySelector('[data-nada]')
  var erro = document.querySelector('[data-erro]')
  var paginacao = document.querySelector('[data-paginacao]')
  var quantos = document.querySelector('[data-quantos-filtros]')
  var largo = matchMedia('(min-width: 900px)')
  var suave = !matchMedia('(prefers-reduced-motion: reduce)').matches
  var CAMPOS = ['busca', 'condicao', 'marca', 'tipo', 'cilindrada', 'parcela', 'ano']
  // Só estes mudam a lista. Os outros (fbclid e utm dos anúncios, gclid) não podem
  // redesenhar o estoque na chegada: a lista do HTML já está certa e a foto do LCP vem nela
  var CHAVES = CAMPOS.concat(['ordem', 'pagina'])
  var TAMANHO_CARD =
    '(min-width: 1240px) 290px, (min-width: 1180px) calc(25vw - 40px), (min-width: 900px) calc(33vw - 40px), (min-width: 600px) calc(50vw - 44px), calc(100vw - 32px)'

  if (largo.matches && detalhes) detalhes.open = true

  // ---- dados
  var indice = null
  var carregando = null
  function carregar() {
    if (indice) return Promise.resolve(indice)
    if (!carregando) {
      carregando = fetch('/estoque.json', { cache: 'no-cache' })
        .then(function (r) {
          if (!r.ok) throw new Error('estoque.json ' + r.status)
          return r.json()
        })
        .then(function (j) {
          indice = j
          if (erro) erro.hidden = true
          return j
        })
        .catch(function (e) {
          carregando = null
          if (erro) erro.hidden = false
          throw e
        })
    }
    return carregando
  }
  var depois = function () {
    setTimeout(function () {
      carregar().catch(function () {})
    }, 400)
  }
  if (document.readyState === 'complete') depois()
  else addEventListener('load', depois, { once: true })

  // ---- utilidades
  var esc = function (t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  var semAcento = function (t) {
    return String(t || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim()
  }
  var milhar = new Intl.NumberFormat('pt-BR')
  var CORES = { preta: 'preta', branca: 'branca', vermelha: 'vermelha', azul: 'azul', prata: 'prata', cinza: 'cinza', amarela: 'amarela', verde: 'verde', laranja: 'laranja', marrom: 'marrom', roxa: 'roxa' }
  var FAIXAS_CIL = { 'ate-125': [0, 125], '150-190': [126, 199], '200-300': [200, 300], 'acima-300': [301, 99999] }
  var FAIXAS_PARC = { 'ate-600': [0, 600], 'ate-900': [0, 900], 'ate-1200': [0, 1200], 'acima-1200': [1201, 1e9] }
  var porData = function (a, b) {
    return String(b.t || '').localeCompare(String(a.t || ''))
  }
  var ORDENS = {
    'menor-parcela': function (a, b) {
      return (a.p || 1e9) - (b.p || 1e9)
    },
    'maior-parcela': function (a, b) {
      return (b.p || 0) - (a.p || 0)
    },
    'mais-novas': function (a, b) {
      return b.a - a.a || a.k - b.k
    },
    'menor-km': function (a, b) {
      return a.k - b.k
    },
    recentes: porData,
  }
  var padrao = function (a, b) {
    return b.d - a.d || a.o - b.o || porData(a, b)
  }
  var nome = function (m) {
    return [m.ma, m.mo, m.v, m.a].filter(Boolean).join(' ')
  }
  var nomeCurto = function (m) {
    return [m.ma, m.mo, m.v].filter(Boolean).join(' ')
  }

  function filtrar(motos, p) {
    var termos = semAcento(p.get('busca')).split(/\s+/).filter(Boolean)
    var cond = p.get('condicao')
    var marca = p.get('marca')
    var tipo = p.get('tipo')
    var cil = FAIXAS_CIL[p.get('cilindrada')]
    var parc = FAIXAS_PARC[p.get('parcela')]
    var ano = Number(p.get('ano')) || 0
    return motos.filter(function (m) {
      var texto = (m.b || '') + ' ' + semAcento(nome(m))
      return (
        (!cond || m.co === cond) &&
        (!marca || m.ms === marca) &&
        (!tipo || m.ca === tipo) &&
        (!cil || (m.ci && m.ci >= cil[0] && m.ci <= cil[1])) &&
        (!parc || (m.p && m.p >= parc[0] && m.p <= parc[1])) &&
        (!ano || m.a >= ano) &&
        termos.every(function (t) {
          return texto.indexOf(t) > -1
        })
      )
    })
  }

  function urlFoto(base, m, largura) {
    var f = m.f
    var larguras = f.l.slice().sort(function (a, b) {
      return a - b
    })
    var escolhida = larguras[0]
    larguras.forEach(function (l) {
      if (l <= largura) escolhida = l
    })
    return base + '/veiculos/' + m.id + '/' + f.id + '-' + escolhida + '.' + (f.fo === 'jpeg' ? 'jpg' : 'webp')
  }
  function srcset(base, m) {
    var f = m.f
    return f.l
      .slice()
      .sort(function (a, b) {
        return a - b
      })
      .filter(function (l) {
        return l <= 960
      })
      .map(function (l) {
        return base + '/veiculos/' + m.id + '/' + f.id + '-' + l + '.' + (f.fo === 'jpeg' ? 'jpg' : 'webp') + ' ' + l + 'w'
      })
      .join(', ')
  }
  var icone = function (id) {
    return '<svg class="i" aria-hidden="true" focusable="false"><use href="#i-' + id + '"/></svg>'
  }

  // primeira: a 1ª foto da lista é a maior da tela quando a pessoa chega com filtro no endereço
  function card(m, base, prazo, primeira) {
    var n = nome(m)
    var href = '/estoque/' + encodeURIComponent(m.s)
    var maior = Math.max.apply(null, m.f.l)
    var altura = m.f.w && m.f.h ? Math.round((maior * m.f.h) / m.f.w) : Math.round(maior * 0.75)
    var selo = m.st === 'reservado' ? ['reservada', 'Reservada'] : ['condicao', m.co === '0km' ? '0 km' : 'Seminova']
    var alt = n + (m.cor && CORES[m.cor] ? ', ' + CORES[m.cor] : '')
    var parcela = m.p ? 'R$ ' + milhar.format(m.p) : 'Consulte'
    return (
      '<article class="card"><a class="card__foto" href="' + href + '" tabindex="-1" aria-hidden="true" style="background-color:' + esc(m.f.cm || '#2a2a30') + '">' +
      // loading antes do src (lição do 058: com o src primeiro, a foto pode começar a baixar antes do lazy valer)
      '<img ' + (primeira ? 'fetchpriority="high"' : 'loading="lazy"') + ' src="' + esc(urlFoto(base, m, 480)) + '" srcset="' + esc(srcset(base, m)) + '" sizes="' + TAMANHO_CARD + '" width="' + maior + '" height="' + altura + '" alt="' + esc(alt) + '" decoding="async" style="object-position:' + Number(m.f.x) + '% ' + Number(m.f.y) + '%">' +
      '<span class="selo selo--' + selo[0] + '">' + selo[1] + '</span></a>' +
      '<div class="card__corpo"><h2 class="card__nome"><a href="' + href + '">' + esc(nomeCurto(m)) + '</a></h2>' +
      '<p class="card__ficha">' + esc(m.a) + ' · ' + milhar.format(m.k) + ' km</p>' +
      '<p class="card__parcela"><span>' + esc(prazo) + 'x de</span> <strong>' + parcela + '</strong></p>' +
      '<div class="card__botoes"><a class="botao botao--vermelho card__detalhes" href="' + href + '">Ver detalhes' + icone('caret-right-bold') + '</a>' +
      '<a class="botao botao--whats botao--icone" href="/api/w?o=card&amp;m=' + Number(m.c) + '" target="_blank" rel="noopener nofollow" aria-label="Chamar no WhatsApp sobre a ' + esc(n) + '">' + icone('whatsapp-logo-fill') + '</a></div></div></article>'
    )
  }

  // ---- estado na URL
  var params = function () {
    return new URLSearchParams(location.search)
  }
  function preencher() {
    var p = params()
    Array.prototype.forEach.call(form.elements, function (el) {
      if (el.name) el.value = p.get(el.name) || ''
    })
  }
  function lerForm() {
    var p = new URLSearchParams()
    Array.prototype.forEach.call(form.elements, function (el) {
      if (el.name && el.value) p.set(el.name, el.value.trim())
    })
    return p
  }

  function renderPaginacao(pagina, paginas, p) {
    if (!paginacao) return
    paginacao.hidden = paginas <= 1
    if (paginas <= 1) return
    var link = function (n, texto, desligado) {
      var q = new URLSearchParams(p)
      if (n > 1) q.set('pagina', String(n))
      else q.delete('pagina')
      return '<a class="botao botao--contorno-vermelho" href="/estoque' + (q.toString() ? '?' + esc(q.toString()) : '') + '" data-pagina="' + n + '"' + (desligado ? ' aria-disabled="true" tabindex="-1"' : '') + '>' + texto + '</a>'
    }
    paginacao.innerHTML =
      link(pagina - 1, icone('caret-left-bold') + 'Anterior', pagina === 1) +
      '<span class="paginacao__info">Página ' + pagina + ' de ' + paginas + '</span>' +
      link(pagina + 1, 'Próxima' + icone('caret-right-bold'), pagina === paginas)
  }

  function render() {
    if (!indice) return
    var p = params()
    var filtradas = filtrar(indice.motos, p).sort(ORDENS[p.get('ordem')] || padrao)
    var porPagina = indice.porPagina || 24
    var paginas = Math.max(1, Math.ceil(filtradas.length / porPagina))
    var pagina = Math.min(Math.max(1, Number(p.get('pagina')) || 1), paginas)
    lista.innerHTML = filtradas
      .slice((pagina - 1) * porPagina, pagina * porPagina)
      .map(function (m, i) {
        return '<li>' + card(m, indice.arquivos, indice.prazo, i === 0) + '</li>'
      })
      .join('')
    var ativos = CAMPOS.filter(function (k) {
      return p.get(k)
    }).length
    var n = filtradas.length
    contagem.textContent = ativos ? (n === 1 ? '1 moto encontrada' : n + ' motos encontradas') : n === 1 ? '1 moto disponível' : n + ' motos disponíveis'
    nada.hidden = n > 0
    lista.hidden = n === 0
    renderPaginacao(pagina, paginas, p)
    if (quantos) {
      quantos.hidden = !ativos
      quantos.textContent = String(ativos)
    }
  }

  function irPara(p, rolar) {
    history.pushState(null, '', p.toString() ? '/estoque?' + p.toString() : '/estoque')
    carregar()
      .then(render)
      .then(function () {
        if (rolar) contagem.scrollIntoView({ block: 'start', behavior: suave ? 'smooth' : 'auto' })
      })
      .catch(function () {})
  }

  // ---- eventos
  form.addEventListener('focusin', function () {
    carregar().catch(function () {})
  })
  form.addEventListener('submit', function (e) {
    e.preventDefault()
    irPara(lerForm(), !largo.matches)
    if (!largo.matches && detalhes) detalhes.open = false
  })
  form.addEventListener('change', function (e) {
    // No computador, o filtro vale na hora; no celular, no botão "Ver motos"
    if (largo.matches && e.target.tagName === 'SELECT') irPara(lerForm(), false)
  })
  var espera = 0
  form.addEventListener('input', function (e) {
    if (!largo.matches || e.target.name !== 'busca') return
    clearTimeout(espera)
    espera = setTimeout(function () {
      irPara(lerForm(), false)
    }, 350)
  })
  document.addEventListener('click', function (e) {
    var limpar = e.target.closest('[data-limpar]')
    if (limpar) {
      e.preventDefault()
      form.reset()
      irPara(new URLSearchParams(), false)
      return
    }
    var pag = e.target.closest('[data-pagina]')
    if (pag && paginacao && paginacao.contains(pag)) {
      e.preventDefault()
      var p = params()
      var n = Number(pag.getAttribute('data-pagina'))
      if (n > 1) p.set('pagina', String(n))
      else p.delete('pagina')
      irPara(p, true)
    }
    var tentar = e.target.closest('[data-tentar]')
    if (tentar) carregar().then(render).catch(function () {})
  })
  addEventListener('popstate', function () {
    preencher()
    carregar().then(render).catch(function () {})
  })

  // Chegou com filtro na URL (link compartilhado, voltar): aplica já
  preencher()
  var chegada = params()
  var comFiltro = CHAVES.some(function (k) {
    return chegada.get(k)
  })
  if (comFiltro) carregar().then(render).catch(function () {})
})()
