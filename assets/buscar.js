(function () {
  'use strict';
  var D = window.ARTICULOS || [], TEMAS = window.TEMAS || [];
  var $ = function (id) { return document.getElementById(id); };
  var q = $('q'), form = $('busca'), res = $('res'), estado = $('estado'), mas = $('mas');
  var fT = $('f-tema'), fA = $('f-autor'), fD = $('f-dec'), fO = $('f-orden');
  if (!q || !res) return;

  // Normalización que conserva la longitud: sin tildes ni mayúsculas (la ñ se mantiene).
  var MAP = { 'á':'a','à':'a','ä':'a','â':'a','é':'e','è':'e','ë':'e','ê':'e','í':'i','ì':'i','ï':'i','î':'i',
              'ó':'o','ò':'o','ö':'o','ô':'o','ú':'u','ù':'u','ü':'u','û':'u','ç':'c' };
  function norm(s) { return s.toLowerCase().replace(/[áàäâéèëêíìïîóòöôúùüûç]/g, function (c) { return MAP[c]; }); }
  var STOP = { de:1, la:1, el:1, los:1, las:1, y:1, en:1, a:1, del:1, al:1, un:1, una:1, que:1, por:1, con:1, se:1, o:1 };

  D.forEach(function (d, i) { d.i = i; d.nt = norm(d.t); d.na = norm(d.a); d.nx = norm(d.x); });

  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }
  function count(hay, needle) { var n = 0, p = 0; while ((p = hay.indexOf(needle, p)) !== -1) { n++; p += needle.length; if (n > 50) break; } return n; }

  function parse(raw) {
    var out = [], m, re = /"([^"]+)"|(\S+)/g, s = norm(raw.trim());
    while ((m = re.exec(s))) {
      var t = (m[1] || m[2] || '').replace(/^[^\wñ]+|[^\wñ]+$/g, '');
      if (t) out.push(t);
    }
    var sig = out.filter(function (t) { return !STOP[t] && t.length > 1; });
    return { terms: sig.length ? sig : out, phrase: out.length > 1 ? s.replace(/"/g, '') : '' };
  }

  function snippet(d, terms, phrase) {
    var pos = phrase ? d.nx.indexOf(phrase) : -1;
    if (pos < 0) for (var k = 0; k < terms.length && pos < 0; k++) pos = d.nx.indexOf(terms[k]);
    if (pos < 0) return '';
    var a = Math.max(0, pos - 90), b = Math.min(d.x.length, pos + 170);
    while (a > 0 && /\S/.test(d.x[a - 1])) a--;
    while (b < d.x.length && /\S/.test(d.x[b])) b++;
    var orig = d.x.slice(a, b).replace(/\s+/g, ' '), low = norm(orig);
    var marks = [];
    (phrase ? [phrase].concat(terms) : terms).forEach(function (t) {
      var p = 0; while ((p = low.indexOf(t, p)) !== -1) { marks.push([p, p + t.length]); p += t.length; }
    });
    marks.sort(function (x, y) { return x[0] - y[0]; });
    var html = '', last = 0;
    marks.forEach(function (m) { if (m[0] < last) return; html += esc(orig.slice(last, m[0])) + '<mark>' + esc(orig.slice(m[0], m[1])) + '</mark>'; last = m[1]; });
    html += esc(orig.slice(last));
    return (a > 0 ? '… ' : '') + html + (b < d.x.length ? ' …' : '');
  }

  var shown = 0, current = [], PAGE = 40, lastQuery = null;

  function run() {
    var raw = q.value, p = parse(raw), tema = fT.value, autor = fA.value, dec = fD.value, orden = fO.value;
    var list = [];
    D.forEach(function (d) {
      if (tema && String(d.m) !== tema) return;
      if (autor && d.k.indexOf(autor) === -1) return;
      if (dec && d.y.slice(0, 3) !== dec.slice(0, 3)) return;
      var score = 0;
      if (p.terms.length) {
        for (var k = 0; k < p.terms.length; k++) {
          var t = p.terms[k], inT = d.nt.indexOf(t) !== -1, inA = d.na.indexOf(t) !== -1, c = count(d.nx, t);
          if (!inT && !inA && !c) return;
          score += (inT ? 30 : 0) + (inA ? 15 : 0) + Math.min(c, 25);
        }
        if (p.phrase) { if (d.nt.indexOf(p.phrase) !== -1) score += 60; var pc = count(d.nx, p.phrase); score += pc * 8; }
      }
      list.push({ d: d, s: score });
    });
    var byYear = function (x, y) { return (y.d.y - x.d.y) || (y.d.i - x.d.i); };
    if (orden === 'old') list.sort(function (x, y) { return -byYear(x, y); });
    else if (orden === 'new' || !p.terms.length) list.sort(byYear);
    else list.sort(function (x, y) { return (y.s - x.s) || byYear(x, y); });
    current = list.map(function (r) { return r.d; }); lastQuery = p; shown = 0;
    res.innerHTML = ''; more();
    var n = current.length, filtros = [];
    if (tema) filtros.push('tema «' + TEMAS[+tema - 1] + '»');
    if (autor) filtros.push(fA.options[fA.selectedIndex].text);
    if (dec) filtros.push(fD.options[fD.selectedIndex].text.toLowerCase());
    var txt;
    if (!n) txt = 'Ningún artículo coincide' + (raw.trim() ? ' con «' + raw.trim() + '»' : '') + '. Prueba con otra palabra o quita algún filtro.';
    else txt = n + (n === 1 ? ' artículo' : ' artículos') + (raw.trim() ? ' con «' + raw.trim() + '»' : '') + (filtros.length ? ' · ' + filtros.join(' · ') : '') +
      (!p.terms.length && orden !== 'old' ? ' · del más reciente al más antiguo' : '');
    estado.textContent = txt;
    try { var u = new URL(location.href); if (raw.trim()) u.searchParams.set('q', raw.trim()); else u.searchParams.delete('q'); history.replaceState(null, '', u); } catch (e) {}
  }

  function more() {
    var frag = document.createDocumentFragment(), p = lastQuery;
    current.slice(shown, shown + PAGE).forEach(function (d) {
      var li = document.createElement('li'); li.className = 'li-art';
      var sn = p && p.terms.length ? snippet(d, p.terms, p.phrase) : '';
      li.innerHTML = '<span class="li-anio">' + d.y + '</span><span class="li-cuerpo"><a href="' + d.u + '">' + esc(d.t) + '</a>' +
        '<span class="li-meta">' + esc(d.a) + ' · ' + esc(TEMAS[d.m - 1] || '') + '</span>' + (sn ? '<p class="snip">' + sn + '</p>' : '') + '</span>';
      frag.appendChild(li);
    });
    res.appendChild(frag); shown += PAGE; mas.hidden = shown >= current.length;
  }

  var timer;
  q.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 220); });
  form.addEventListener('submit', function (e) { e.preventDefault(); clearTimeout(timer); run(); res.scrollIntoView({ block: 'start' }); });
  [fT, fA, fD, fO].forEach(function (s) { s.addEventListener('change', run); });
  mas.addEventListener('click', more);
  Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (b) {
    b.addEventListener('click', function () { q.value = b.getAttribute('data-q'); run(); });
  });
  try { var init = new URLSearchParams(location.search).get('q'); if (init) { q.value = init; run(); } } catch (e) {}
})();
