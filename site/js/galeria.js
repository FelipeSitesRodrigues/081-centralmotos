/*
 * Galeria da moto: o trilho rola com o dedo (scroll-snap, sem JS); aqui só o contador,
 * as miniaturas do computador e as setas do teclado.
 */
;(function () {
  var galeria = document.querySelector('[data-galeria]')
  if (!galeria) return
  var trilho = galeria.querySelector('.galeria__trilho')
  var atual = galeria.querySelector('[data-galeria-atual]')
  var miniaturas = Array.prototype.slice.call(galeria.querySelectorAll('.galeria__miniatura'))
  var suave = !matchMedia('(prefers-reduced-motion: reduce)').matches
  var total = trilho.children.length
  var indice = function () {
    return Math.min(total - 1, Math.max(0, Math.round(trilho.scrollLeft / Math.max(trilho.clientWidth, 1))))
  }
  var ir = function (i) {
    trilho.scrollTo({ left: Math.min(total - 1, Math.max(0, i)) * trilho.clientWidth, behavior: suave ? 'smooth' : 'auto' })
  }
  var quadro = 0
  trilho.addEventListener(
    'scroll',
    function () {
      cancelAnimationFrame(quadro)
      quadro = requestAnimationFrame(function () {
        var i = indice()
        if (atual) atual.textContent = String(i + 1)
        miniaturas.forEach(function (m, k) {
          if (k === i) m.setAttribute('aria-current', 'true')
          else m.removeAttribute('aria-current')
        })
      })
    },
    { passive: true },
  )
  miniaturas.forEach(function (m, k) {
    m.addEventListener('click', function (e) {
      e.preventDefault()
      ir(k)
    })
  })
  trilho.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      ir(indice() + (e.key === 'ArrowRight' ? 1 : -1))
    }
  })
})()
