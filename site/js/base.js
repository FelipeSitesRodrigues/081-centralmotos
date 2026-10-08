/* JS de todas as páginas: a abertura da home e o menu do celular. */

/*
 * Abertura. O <html> nasce com a classe "abrindo" e, até a primeira pintura, o CSS da
 * página (home-abrindo.css e estoque.css, só em tela pequena) segura as caixas de foto de
 * baixo da dobra: as fotos lazy delas não começam a baixar junto com a do LCP (lição do
 * 079). A classe vem no HTML porque às vezes o Chrome faz o primeiro layout antes de rodar
 * um script com defer, e aí as fotos já tinham saído.
 *
 * A classe sai quando a primeira pintura é registrada, e não no primeiro quadro: no
 * Lighthouse (e no PageSpeed) o Chrome às vezes desenha um quadro por segundo antes de
 * mostrar a página, e mexer no layout nesses quadros virou um salto de nota 1.
 */
;(function () {
  var raiz = document.documentElement
  var abrir = function () {
    raiz.classList.remove('abrindo')
  }
  var Observador = window.PerformanceObserver
  var temPintura = Boolean(Observador && Observador.supportedEntryTypes && Observador.supportedEntryTypes.indexOf('paint') > -1)
  // Chegou numa âncora (/#lojas) ou a página já pintou (script atrasado): solta agora
  if (location.hash || (temPintura && performance.getEntriesByType('paint').length)) return abrir()
  if (temPintura) {
    new Observador(function (_lista, observador) {
      observador.disconnect()
      abrir()
    }).observe({ type: 'paint', buffered: true })
  } else {
    // Sem Paint Timing: o rAF cai no primeiro quadro e o setTimeout logo depois dele
    requestAnimationFrame(function () {
      setTimeout(abrir, 0)
    })
  }
})()

/* Menu do celular (<details>): fecha ao tocar num link, apertar Esc ou tocar fora. Sem JS, abre e fecha do mesmo jeito. */
;(function () {
  var menu = document.querySelector('[data-menu]')
  if (!menu) return
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) menu.open = false
  })
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.open) {
      menu.open = false
      menu.querySelector('summary').focus()
    }
  })
  document.addEventListener('click', function (e) {
    if (menu.open && !menu.contains(e.target)) menu.open = false
  })
})()
