/* Setas do carrossel de entregas (o trilho rola sozinho com o dedo; as setas são pro computador). */
;(function () {
  var suave = !matchMedia('(prefers-reduced-motion: reduce)').matches
  document.querySelectorAll('.clientes').forEach(function (bloco) {
    var trilho = bloco.querySelector('.clientes__trilho')
    var anterior = bloco.querySelector('[data-anterior]')
    var proxima = bloco.querySelector('[data-proxima]')
    if (!trilho || !anterior || !proxima) return
    var passo = function () {
      var item = trilho.querySelector('li')
      return item ? item.getBoundingClientRect().width + 16 : 300
    }
    var atualizar = function () {
      anterior.disabled = trilho.scrollLeft <= 2
      proxima.disabled = trilho.scrollLeft + trilho.clientWidth >= trilho.scrollWidth - 2
    }
    anterior.addEventListener('click', function () {
      trilho.scrollBy({ left: -passo(), behavior: suave ? 'smooth' : 'auto' })
    })
    proxima.addEventListener('click', function () {
      trilho.scrollBy({ left: passo(), behavior: suave ? 'smooth' : 'auto' })
    })
    trilho.addEventListener('scroll', atualizar, { passive: true })
    atualizar()
  })
})()
