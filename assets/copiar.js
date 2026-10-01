(function () {
  var b = document.getElementById('copiar'), c = document.getElementById('cita');
  if (!b || !c) return;
  function seleccionar() { var r = document.createRange(); r.selectNodeContents(c); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
  b.addEventListener('click', function () {
    var t = b.getAttribute('data-copy');
    try {
      navigator.clipboard.writeText(t).then(function () { b.textContent = 'Cita copiada'; }, function () { seleccionar(); b.textContent = 'Cita seleccionada'; });
    } catch (e) { seleccionar(); b.textContent = 'Cita seleccionada'; }
  });
})();
